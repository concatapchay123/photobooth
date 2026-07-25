import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { DEFAULT_BEAUTY_FILTER_SETTINGS } from './beautyFilterSettings.js';

const BEAUTY_FILTER_PRESETS = [
  { id: 'natural', name: 'Tự nhiên', smooth: 62, bright: 34, rosy: 30, glow: 26, acne: 46, slimming: 0, enlargeEyes: 0 },
  { id: 'baby', name: 'Hồng baby', smooth: 76, bright: 42, rosy: 58, glow: 34, acne: 58, slimming: 0, enlargeEyes: 0 },
  { id: 'glass', name: 'Da căng bóng', smooth: 68, bright: 46, rosy: 22, glow: 70, acne: 54, slimming: 0, enlargeEyes: 0 },
  { id: 'glam', name: 'Trang điểm nhẹ', smooth: 52, bright: 28, rosy: 44, glow: 38, acne: 38, slimming: 0, enlargeEyes: 0 },
  { id: 'original', name: 'Không lọc', smooth: 0, bright: 0, rosy: 0, glow: 0, acne: 0, slimming: 0, enlargeEyes: 0 },
];

const LEGACY_DEFAULT_BEAUTY_FILTER_SETTINGS = BEAUTY_FILTER_PRESETS[0];

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vTexCoord;

  void main() {
    vTexCoord = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vTexCoord;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uSmoothness;
  uniform float uBrightness;
  uniform float uRosiness;
  uniform float uGlow;
  uniform float uAcne;
  uniform float uSlimness;
  uniform float uEyeEnlargement;
  uniform bool uCompareMode;
  uniform bool uMirror;

  uniform int uFaceCount;
  uniform vec4 uFaces[8];
  uniform vec2 uLeftEyes[8];
  uniform vec2 uRightEyes[8];
  uniform vec2 uNoseTips[8];
  uniform vec2 uMouthCenters[8];

  vec2 clampUv(vec2 uv) {
    return clamp(uv, vec2(0.001), vec2(0.999));
  }

  vec3 sampleFrame(vec2 uv) {
    return texture2D(uTexture, clampUv(uv)).rgb;
  }

  float getFaceWeight(vec2 uv) {
    if (uFaceCount == 0) return 0.0;

    float totalWeight = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= uFaceCount) break;
      vec4 box = uFaces[i];
      float faceWidth = box.z - box.x;
      float faceHeight = box.w - box.y;
      if (faceWidth <= 0.01 || faceHeight <= 0.01) continue;

      float padW = faceWidth * 0.24;
      float padHTop = faceHeight * 0.18;
      float padHBottom = faceHeight * 0.34;
      float xMin = clamp(box.x - padW, 0.0, 1.0);
      float xMax = clamp(box.z + padW, 0.0, 1.0);
      float yMin = clamp(box.y - padHTop, 0.0, 1.0);
      float yMax = clamp(box.w + padHBottom, 0.0, 1.0);

      if (uv.x >= xMin && uv.x <= xMax && uv.y >= yMin && uv.y <= yMax) {
        float borderW = max((xMax - xMin) * 0.16, 0.001);
        float borderH = max((yMax - yMin) * 0.14, 0.001);
        float distEdgeX = min(uv.x - xMin, xMax - uv.x);
        float distEdgeY = min(uv.y - yMin, yMax - uv.y);
        float feather = smoothstep(0.0, borderW, distEdgeX) * smoothstep(0.0, borderH, distEdgeY);
        totalWeight = max(totalWeight, feather);
      }
    }
    return clamp(totalWeight, 0.0, 1.0);
  }

  float getSkinWeight(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    float maxChannel = max(max(r, g), b);
    float minChannel = min(min(r, g), b);
    float chroma = maxChannel - minChannel;

    float cb = 128.0 - 0.168736 * r * 255.0 - 0.331264 * g * 255.0 + 0.5 * b * 255.0;
    float cr = 128.0 + 0.5 * r * 255.0 - 0.418688 * g * 255.0 - 0.081312 * b * 255.0;
    float ycbcrSkin = smoothstep(120.0, 138.0, cr)
      * (1.0 - smoothstep(186.0, 202.0, cr))
      * smoothstep(66.0, 82.0, cb)
      * (1.0 - smoothstep(138.0, 156.0, cb));

    float plausibleLight = smoothstep(0.08, 0.18, luma) * (1.0 - smoothstep(0.96, 1.0, luma));
    float notGreen = 1.0 - smoothstep(0.06, 0.22, g - max(r, b));
    float warmNeutral = smoothstep(-0.16, 0.04, r - b)
      * (1.0 - smoothstep(0.58, 0.88, chroma))
      * plausibleLight
      * notGreen;

    float redBalance = smoothstep(-0.10, 0.06, r - g + 0.02)
      * smoothstep(-0.18, 0.05, r - b + 0.03)
      * plausibleLight
      * notGreen;

    return clamp(max(ycbcrSkin, max(warmNeutral, redBalance) * 0.82), 0.0, 1.0);
  }

  vec2 getWarpedCoords(vec2 uv) {
    if (uFaceCount == 0 || (uSlimness <= 0.01 && uEyeEnlargement <= 0.01)) return uv;

    vec2 warped = uv;
    for (int i = 0; i < 8; i++) {
      if (i >= uFaceCount) break;
      vec4 box = uFaces[i];
      float faceWidth = box.z - box.x;
      float faceHeight = box.w - box.y;
      if (faceWidth <= 0.01 || faceHeight <= 0.01) continue;

      float safeWidth = max(faceWidth, 0.01);
      float safeHeight = max(faceHeight, 0.01);

      if (uEyeEnlargement > 0.01) {
        vec2 leftEye = uLeftEyes[i];
        vec2 rightEye = uRightEyes[i];
        float eyeRadius = safeWidth * mix(0.11, 0.16, uEyeEnlargement);

        float dRight = distance(warped, rightEye);
        if (rightEye.x > 0.0 && rightEye.y > 0.0 && dRight < eyeRadius) {
          float w = smoothstep(0.0, eyeRadius, dRight);
          vec2 dir = (warped - rightEye) / (dRight + 0.0001);
          float newD = dRight * (1.0 - uEyeEnlargement * 0.10 * (1.0 - w));
          warped = rightEye + dir * newD;
        }

        float dLeft = distance(warped, leftEye);
        if (leftEye.x > 0.0 && leftEye.y > 0.0 && dLeft < eyeRadius) {
          float w = smoothstep(0.0, eyeRadius, dLeft);
          vec2 dir = (warped - leftEye) / (dLeft + 0.0001);
          float newD = dLeft * (1.0 - uEyeEnlargement * 0.10 * (1.0 - w));
          warped = leftEye + dir * newD;
        }
      }

      if (uSlimness > 0.01) {
        float faceCenterX = (box.x + box.z) * 0.5;
        float dx = warped.x - faceCenterX;
        float distToCenter = abs(dx) / (safeWidth * 0.5);
        float jawCenterY = box.y + faceHeight * 0.72;
        float dy = (warped.y - jawCenterY) / (safeHeight * 0.26);
        float yInfluence = exp(-dy * dy * 2.7);
        float xInfluence = exp(-distToCenter * distToCenter * 1.25);
        float squeeze = uSlimness * 0.06 * yInfluence * xInfluence;
        warped.x = faceCenterX + dx * (1.0 + squeeze);
      }

      warped = clampUv(warped);
    }
    return warped;
  }

  void main() {
    vec2 rawUV = vTexCoord;
    if (uMirror) {
      rawUV.x = 1.0 - rawUV.x;
    }

    vec2 warpedUV = getWarpedCoords(rawUV);
    vec4 rawColor = texture2D(uTexture, clampUv(warpedUV));
    float effectPower = max(max(max(uSmoothness, uBrightness), max(uRosiness, uGlow)), max(max(uAcne, uSlimness), uEyeEnlargement));

    if (uCompareMode || effectPower <= 0.001) {
      gl_FragColor = rawColor;
      return;
    }

    vec2 edgeOffset = 1.25 / uResolution;
    float lumaLeft = dot(sampleFrame(warpedUV + vec2(-edgeOffset.x, 0.0)), vec3(0.299, 0.587, 0.114));
    float lumaRight = dot(sampleFrame(warpedUV + vec2(edgeOffset.x, 0.0)), vec3(0.299, 0.587, 0.114));
    float lumaTop = dot(sampleFrame(warpedUV + vec2(0.0, -edgeOffset.y)), vec3(0.299, 0.587, 0.114));
    float lumaBot = dot(sampleFrame(warpedUV + vec2(0.0, edgeOffset.y)), vec3(0.299, 0.587, 0.114));
    float edgeH = lumaRight - lumaLeft;
    float edgeV = lumaBot - lumaTop;
    float edgeIntensity = sqrt(edgeH * edgeH + edgeV * edgeV);
    float detailMask = 1.0 - smoothstep(0.025, 0.15, edgeIntensity);

    float skinWeight = getSkinWeight(rawColor.rgb);
    float skinMask = smoothstep(0.10, 0.74, skinWeight);
    float smoothMask = clamp(0.14 + skinMask * 0.78, 0.0, 1.0);
    float colorMask = clamp(skinMask * 0.86, 0.0, 1.0);

    vec3 blurSum = rawColor.rgb * 0.42;
    float totalWeight = 0.42;
    float blurNeed = max(uSmoothness, uAcne);
    if (blurNeed > 0.001) {
      float radius = 1.5 + blurNeed * 26.0;
      vec2 pixel = 1.0 / uResolution;
      for (int i = 0; i < 24; i++) {
        float angle = float(i) * 2.39996323;
        float dist = sqrt(float(i) + 0.5) * (radius / 4.8);
        vec2 offset = vec2(cos(angle), sin(angle)) * dist * pixel;
        vec3 samp = sampleFrame(warpedUV + offset);
        float colorDiff = distance(samp, rawColor.rgb);
        float sigma = 0.036 + 0.11 * (1.0 - uSmoothness);
        float weightSpatial = exp(-(dist * dist) / max(2.0 * radius * radius, 0.001));
        float weightRange = exp(-(colorDiff * colorDiff) / max(sigma, 0.001));
        float w = weightSpatial * weightRange;
        blurSum += samp * w;
        totalWeight += w;
      }
    }

    vec3 smoothedColor = blurSum / max(totalWeight, 0.001);
    float rawLuma = dot(rawColor.rgb, vec3(0.299, 0.587, 0.114));
    float smoothLuma = dot(smoothedColor, vec3(0.299, 0.587, 0.114));
    float blemishDiff = max(0.0, smoothLuma - rawLuma);
    float blemishMask = smoothstep(0.012 - uAcne * 0.007, 0.105 - uAcne * 0.045, blemishDiff) * skinMask;
    float smoothAmount = clamp(
      uSmoothness * 0.72 * smoothMask * detailMask + blemishMask * uAcne * 0.48,
      0.0,
      0.82
    );

    vec3 finalColor = mix(rawColor.rgb, smoothedColor, smoothAmount);
    finalColor += vec3(0.052, 0.047, 0.041) * uBrightness;
    finalColor += vec3(0.090, 0.030, 0.050) * uRosiness * colorMask * (1.0 - rawLuma * 0.35);

    float glowLuma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    float highlight = smoothstep(0.42, 0.96, glowLuma);
    finalColor += vec3(0.082, 0.072, 0.105) * uGlow * highlight * (0.50 + 0.50 * skinMask);

    float finalLuma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    float saturation = 1.0 + uRosiness * 0.16 + uGlow * 0.08 - uSmoothness * 0.035;
    finalColor = mix(vec3(finalLuma), finalColor, saturation);
    float contrast = 1.0 + uBrightness * 0.06 + uGlow * 0.045 - uSmoothness * 0.025;
    finalColor = (finalColor - 0.5) * contrast + 0.5;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), rawColor.a);
  }
`;

const clampPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
};

const getFiniteNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

const normalizeAxisValue = (value, size) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const normalized = Math.abs(number) > 1.5 && size > 1 ? number / size : number;
  return Math.min(1, Math.max(0, normalized));
};

const getVideoSize = (video) => ({
  width: Math.max(1, Number(video?.videoWidth) || 1),
  height: Math.max(1, Number(video?.videoHeight) || 1),
});

const normalizeMediaPipeBox = (detection, video) => {
  const box = detection?.boundingBox
    || detection?.relativeBoundingBox
    || detection?.locationData?.relativeBoundingBox
    || detection?.locationData?.boundingBox;
  if (!box) return null;

  const { width: videoWidth, height: videoHeight } = getVideoSize(video);
  const rawWidth = getFiniteNumber(box.width, box.w);
  const rawHeight = getFiniteNumber(box.height, box.h);
  const rawCenterX = getFiniteNumber(box.xCenter, box.centerX, box.x_center);
  const rawCenterY = getFiniteNumber(box.yCenter, box.centerY, box.y_center);

  let rawXMin = getFiniteNumber(box.xMin, box.xmin, box.x, box.left);
  let rawYMin = getFiniteNumber(box.yMin, box.ymin, box.y, box.top);
  let rawXMax = getFiniteNumber(box.xMax, box.xmax, box.right);
  let rawYMax = getFiniteNumber(box.yMax, box.ymax, box.bottom);

  if (rawXMin === null && rawCenterX !== null && rawWidth !== null) rawXMin = rawCenterX - rawWidth / 2;
  if (rawYMin === null && rawCenterY !== null && rawHeight !== null) rawYMin = rawCenterY - rawHeight / 2;
  if (rawXMax === null && rawXMin !== null && rawWidth !== null) rawXMax = rawXMin + rawWidth;
  if (rawYMax === null && rawYMin !== null && rawHeight !== null) rawYMax = rawYMin + rawHeight;

  const xMin = normalizeAxisValue(rawXMin, videoWidth);
  const yMin = normalizeAxisValue(rawYMin, videoHeight);
  const xMax = normalizeAxisValue(rawXMax, videoWidth);
  const yMax = normalizeAxisValue(rawYMax, videoHeight);

  if ([xMin, yMin, xMax, yMax].some((value) => value === null)) return null;
  if (xMax - xMin < 0.01 || yMax - yMin < 0.01) return null;

  const width = xMax - xMin;
  const height = yMax - yMin;
  return {
    xMin,
    yMin,
    xMax,
    yMax,
    width,
    height,
    centerX: xMin + width * 0.5,
    centerY: yMin + height * 0.5,
  };
};

const normalizeMediaPipePoint = (point, video, fallback) => {
  const { width, height } = getVideoSize(video);
  const x = normalizeAxisValue(getFiniteNumber(point?.x, point?.xMin, point?.xCenter), width);
  const y = normalizeAxisValue(getFiniteNumber(point?.y, point?.yMin, point?.yCenter), height);
  if (x === null || y === null) return fallback;
  return [x, y];
};

const getDetectionLandmarks = (detection) => (
  detection?.landmarks
  || detection?.relativeKeypoints
  || detection?.locationData?.relativeKeypoints
  || detection?.locationData?.landmarks
  || []
);

const normalizeBeautySettings = (settings = DEFAULT_BEAUTY_FILTER_SETTINGS) => ({
  smooth: clampPercent(settings.smooth) / 100,
  bright: clampPercent(settings.bright) / 100,
  rosy: clampPercent(settings.rosy) / 100,
  glow: clampPercent(settings.glow) / 100,
  acne: clampPercent(settings.acne || 0) / 100,
});

const renderCanvas2dFallback = (canvas, video, settings, mirror) => {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return false;

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return false;

  // Enforce a minimum resolution of 960px to guarantee sharp recorded videos with low resource usage
  let width = videoWidth;
  let height = videoHeight;
  const minCanvasSize = 960;
  if (width < minCanvasSize || height < minCanvasSize) {
    const scale = Math.max(minCanvasSize / width, minCanvasSize / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const normalized = normalizeBeautySettings(settings);
  const brightness = 1 + normalized.bright * 0.34 + normalized.glow * 0.08;
  const contrast = 1 + normalized.bright * 0.08 + normalized.glow * 0.06 - normalized.smooth * 0.03;
  const saturation = 1 + normalized.rosy * 0.28 + normalized.glow * 0.08;
  const baseFilter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;

  const drawVideo = () => {
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
  };

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.filter = baseFilter;
  drawVideo();
  ctx.restore();

  const soften = Math.max(normalized.smooth, normalized.acne);
  if (soften > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.30, 0.10 + soften * 0.20);
    ctx.filter = `${baseFilter} blur(${Math.min(2.2, 0.4 + soften * 1.8)}px)`;
    drawVideo();
    ctx.restore();
  }

  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  return true;
};

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(error || 'Shader compile failed');
  }

  return shader;
};

const createWebGlState = (canvas) => {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(error || 'Shader link failed');
  }

  const vertices = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return {
    gl,
    program,
    buffer,
    texture,
    uniforms: {
      smoothness: gl.getUniformLocation(program, 'uSmoothness'),
      brightness: gl.getUniformLocation(program, 'uBrightness'),
      rosiness: gl.getUniformLocation(program, 'uRosiness'),
      glow: gl.getUniformLocation(program, 'uGlow'),
      acne: gl.getUniformLocation(program, 'uAcne'),
      slimming: gl.getUniformLocation(program, 'uSlimness'),
      enlargeEyes: gl.getUniformLocation(program, 'uEyeEnlargement'),
      compareMode: gl.getUniformLocation(program, 'uCompareMode'),
      resolution: gl.getUniformLocation(program, 'uResolution'),
      mirror: gl.getUniformLocation(program, 'uMirror'),
      faceCount: gl.getUniformLocation(program, 'uFaceCount'),
      faces: gl.getUniformLocation(program, 'uFaces'),
      leftEyes: gl.getUniformLocation(program, 'uLeftEyes'),
      rightEyes: gl.getUniformLocation(program, 'uRightEyes'),
      noseTips: gl.getUniformLocation(program, 'uNoseTips'),
      mouthCenters: gl.getUniformLocation(program, 'uMouthCenters'),
    },
  };
};

function BeautyFilterCamera({
  stream,
  settings = DEFAULT_BEAUTY_FILTER_SETTINGS,
  mirror = true,
  disableWebGl = false,
  className = '',
  onFrame,
  ref,
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const webglRef = useRef(null);
  const animationRef = useRef(null);
  const settingsRef = useRef(settings);
  const mirrorRef = useRef(mirror);
  const readyRef = useRef(false);
  const [renderMode, setRenderMode] = useState(disableWebGl ? 'canvas2d' : 'webgl');

  const faceDetectionRef = useRef(null);
  const detectedFacesRef = useRef([]);
  const detectedLandmarksRef = useRef([]);
  const lastDetectionTimeRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    mirrorRef.current = mirror;
  }, [mirror]);

  useEffect(() => {
    if (disableWebGl) {
      setRenderMode('canvas2d');
    }
  }, [disableWebGl]);

  // Load MediaPipe Face Detection dynamically
  useEffect(() => {
    let active = true;
    let loadedFaceDetection = null;
    const loadMediaPipe = async () => {
      try {
        if (!window.FaceDetection) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js';
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Face Detection script'));
            document.head.appendChild(script);
          });
        }
        
        if (!active) return;
        
        const faceDetection = new window.FaceDetection({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });
        
        faceDetection.setOptions({
          model: 'short',
          minDetectionConfidence: 0.55
        });
        
        faceDetection.onResults((results) => {
          if (!active) return;
          const faces = [];
          const landmarks = [];
          if (results.detections && results.detections.length > 0) {
            const count = Math.min(8, results.detections.length);
            for (let i = 0; i < count; i++) {
              const detection = results.detections[i];
              const bbox = normalizeMediaPipeBox(detection, videoRef.current);
              if (!bbox) continue;

              faces.push([
                bbox.xMin,
                bbox.yMin,
                bbox.xMax,
                bbox.yMax
              ]);

              const pts = getDetectionLandmarks(detection);
              const fallbackLandmarks = {
                rightEye: [bbox.centerX - bbox.width * 0.16, bbox.centerY - bbox.height * 0.12],
                leftEye: [bbox.centerX + bbox.width * 0.16, bbox.centerY - bbox.height * 0.12],
                noseTip: [bbox.centerX, bbox.centerY + bbox.height * 0.04],
                mouthCenter: [bbox.centerX, bbox.centerY + bbox.height * 0.22]
              };

              if (pts && pts.length >= 4) {
                landmarks.push({
                  rightEye: normalizeMediaPipePoint(pts[0], videoRef.current, fallbackLandmarks.rightEye),
                  leftEye: normalizeMediaPipePoint(pts[1], videoRef.current, fallbackLandmarks.leftEye),
                  noseTip: normalizeMediaPipePoint(pts[2], videoRef.current, fallbackLandmarks.noseTip),
                  mouthCenter: normalizeMediaPipePoint(pts[3], videoRef.current, fallbackLandmarks.mouthCenter)
                });
              } else {
                landmarks.push(fallbackLandmarks);
              }
            }
          }
          detectedFacesRef.current = faces;
          detectedLandmarksRef.current = landmarks;
        });
        
        loadedFaceDetection = faceDetection;
        faceDetectionRef.current = faceDetection;
        console.log('MediaPipe Face Detection library loaded successfully!');
      } catch (err) {
        console.warn('Failed to load MediaPipe Face Detection. Defaulting to skin-color & edge-preserving shader.', err);
      }
    };
    
    loadMediaPipe();
    return () => {
      active = false;
      const faceDetection = loadedFaceDetection;
      if (faceDetection) {
        try {
          faceDetection.close();
        } catch (e) {
          console.warn('Error closing FaceDetection:', e);
        }
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureDataUrl(type = 'image/jpeg', quality = 0.86, timeoutMs = 1500) {
      const canvas = canvasRef.current;
      if (!readyRef.current) return Promise.resolve(null);
      if (!canvas || canvas.width <= 1 || canvas.height <= 1) return Promise.resolve(null);

      return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timerId);
          resolve(value);
        };
        const timerId = window.setTimeout(() => {
          console.warn('Beauty filter canvas capture timed out.');
          finish(null);
        }, timeoutMs);

        try {
          if (typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
              if (!blob) {
                finish(null);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : null);
              reader.onerror = () => finish(null);
              reader.readAsDataURL(blob);
            }, type, quality);
            return;
          }

          finish(canvas.toDataURL(type, quality));
        } catch (error) {
          console.warn('Cannot capture beauty filter canvas:', error);
          finish(null);
        }
      });
    },
    getVideoElement() {
      return videoRef.current;
    },
    getCanvas() {
      return canvasRef.current;
    },
    isReady() {
      return readyRef.current;
    },
  }), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    video.srcObject = stream || null;
    readyRef.current = false;

    if (stream) {
      video.play().catch((error) => {
        console.warn('Cannot autoplay guest camera stream:', error);
      });
    }

    return () => {
      video.pause();
      video.srcObject = null;
      readyRef.current = false;
    };
  }, [stream]);

  useEffect(() => {
    if (renderMode === 'video') {
      readyRef.current = false;
      return undefined;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return undefined;

    const handleContextLost = (e) => {
      e.preventDefault();
      console.warn('WebGL context lost. Falling back to Canvas2D.');
      webglRef.current = null;
      setRenderMode('canvas2d');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    if (disableWebGl || renderMode === 'canvas2d') {
      webglRef.current = null;
      setRenderMode('canvas2d');
    } else {
      try {
        webglRef.current = createWebGlState(canvas);
        setRenderMode(webglRef.current ? 'webgl' : 'canvas2d');
      } catch (error) {
        console.warn('Beauty filter WebGL setup failed:', error);
        webglRef.current = null;
        setRenderMode('canvas2d');
      }
    }

    const scheduleNext = () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = window.requestAnimationFrame(render);
    };

    const render = () => {
      const webgl = webglRef.current;
      const hasFrame = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;

      if (!hasFrame) {
        readyRef.current = false;
        scheduleNext();
        return;
      }

      const activeSettings = settingsRef.current || DEFAULT_BEAUTY_FILTER_SETTINGS;

      if (!webgl) {
        const success = renderCanvas2dFallback(canvas, video, activeSettings, mirrorRef.current);
        readyRef.current = success;
        if (!success) {
          console.warn('Canvas2D fallback failed, falling back to raw video.');
          setRenderMode('video');
        } else {
          lastRenderTimeRef.current = performance.now();
          if (typeof onFrame === 'function') {
            onFrame(canvas);
          }
        }
        scheduleNext();
        return;
      }

      try {
        const { gl, program, texture, uniforms } = webgl;
        if (gl.isContextLost()) {
          throw new Error('WebGL context is lost');
        }

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Enforce a minimum resolution of 1080px to guarantee sharp recorded videos with low resource usage
        let width = videoWidth;
        let height = videoHeight;
        const minCanvasSize = 1080;
        if (width > 0 && height > 0 && (width < minCanvasSize || height < minCanvasSize)) {
          const scale = Math.max(minCanvasSize / width, minCanvasSize / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }

        // Run face detection on the video frame at ~12 fps (every 80ms)
        const now = performance.now();
        if (faceDetectionRef.current && now - lastDetectionTimeRef.current > 80) {
          lastDetectionTimeRef.current = now;
          faceDetectionRef.current.send({ image: video }).catch((err) => {
            console.warn('MediaPipe Face Detection processing error:', err);
          });
        }

        // Pack face bounding boxes into flat array for Uniform vec4 uFaces[8]
        const flatFaces = new Float32Array(32);
        const flatRightEyes = new Float32Array(16);
        const flatLeftEyes = new Float32Array(16);
        const flatNoseTips = new Float32Array(16);
        const flatMouthCenters = new Float32Array(16);

        const faces = detectedFacesRef.current || [];
        const landmarks = detectedLandmarksRef.current || [];
        const faceCount = faces.length;
        
        for (let i = 0; i < 8; i++) {
          if (i < faceCount) {
            flatFaces[i * 4] = faces[i][0];
            flatFaces[i * 4 + 1] = faces[i][1];
            flatFaces[i * 4 + 2] = faces[i][2];
            flatFaces[i * 4 + 3] = faces[i][3];
            
            const lm = landmarks[i];
            if (lm) {
              flatRightEyes[i * 2] = lm.rightEye[0];
              flatRightEyes[i * 2 + 1] = lm.rightEye[1];
              flatLeftEyes[i * 2] = lm.leftEye[0];
              flatLeftEyes[i * 2 + 1] = lm.leftEye[1];
              flatNoseTips[i * 2] = lm.noseTip[0];
              flatNoseTips[i * 2 + 1] = lm.noseTip[1];
              flatMouthCenters[i * 2] = lm.mouthCenter[0];
              flatMouthCenters[i * 2 + 1] = lm.mouthCenter[1];
            }
          } else {
            flatFaces[i * 4] = 0.0;
            flatFaces[i * 4 + 1] = 0.0;
            flatFaces[i * 4 + 2] = 0.0;
            flatFaces[i * 4 + 3] = 0.0;
            
            flatRightEyes[i * 2] = 0.0;
            flatRightEyes[i * 2 + 1] = 0.0;
            flatLeftEyes[i * 2] = 0.0;
            flatLeftEyes[i * 2 + 1] = 0.0;
            flatNoseTips[i * 2] = 0.0;
            flatNoseTips[i * 2 + 1] = 0.0;
            flatMouthCenters[i * 2] = 0.0;
            flatMouthCenters[i * 2 + 1] = 0.0;
          }
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.useProgram(program);
        gl.uniform1f(uniforms.smoothness, clampPercent(activeSettings.smooth) / 100);
        gl.uniform1f(uniforms.brightness, clampPercent(activeSettings.bright) / 100);
        gl.uniform1f(uniforms.rosiness, clampPercent(activeSettings.rosy) / 100);
        gl.uniform1f(uniforms.glow, clampPercent(activeSettings.glow) / 100);
        gl.uniform1f(uniforms.acne, clampPercent(activeSettings.acne || 0) / 100);
        gl.uniform1f(uniforms.slimming, clampPercent(activeSettings.slimming || 0) / 100);
        gl.uniform1f(uniforms.enlargeEyes, clampPercent(activeSettings.enlargeEyes || 0) / 100);
        gl.uniform1i(uniforms.compareMode, 0);
        gl.uniform1i(uniforms.mirror, mirrorRef.current ? 1 : 0);
        gl.uniform2f(uniforms.resolution, width, height);
        
        // Upload face tracking uniforms
        gl.uniform1i(uniforms.faceCount, faceCount);
        gl.uniform4fv(uniforms.faces, flatFaces);
        gl.uniform2fv(uniforms.rightEyes, flatRightEyes);
        gl.uniform2fv(uniforms.leftEyes, flatLeftEyes);
        gl.uniform2fv(uniforms.noseTips, flatNoseTips);
        gl.uniform2fv(uniforms.mouthCenters, flatMouthCenters);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        readyRef.current = true;
        lastRenderTimeRef.current = performance.now();
        if (typeof onFrame === 'function') {
          onFrame(canvas);
        }
      } catch (error) {
        console.error('WebGL render failed, falling back to Canvas2D:', error);
        webglRef.current = null;
        setRenderMode('canvas2d');
        const success = renderCanvas2dFallback(canvas, video, activeSettings, mirrorRef.current);
        readyRef.current = success;
        if (!success) {
          console.warn('Canvas2D fallback also failed, falling back to raw video.');
          setRenderMode('video');
        } else {
          lastRenderTimeRef.current = performance.now();
          if (typeof onFrame === 'function') {
            onFrame(canvas);
          }
        }
      }
      scheduleNext();
    };

    lastRenderTimeRef.current = performance.now();
    scheduleNext();

    // Fallback interval check to prevent occlusion/background tab throttling from freezing the preview/recording
    const fallbackIntervalId = setInterval(() => {
      const now = performance.now();
      if (now - lastRenderTimeRef.current > 100) { // If no frame has rendered in 100ms (~10fps limit)
        render();
      }
    }, 50);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      clearInterval(fallbackIntervalId);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }

      const webgl = webglRef.current;
      if (webgl) {
        try {
          webgl.gl.deleteTexture(webgl.texture);
          webgl.gl.deleteBuffer(webgl.buffer);
          webgl.gl.deleteProgram(webgl.program);
        } catch (e) {
          console.warn('Error cleaning up WebGL resources:', e);
        }
      }

      webglRef.current = null;
      readyRef.current = false;
    };
  }, [disableWebGl, renderMode]);

  return (
    <div className={`beauty-filter-camera ${className}`}>
      <video
        ref={videoRef}
        className={renderMode === 'video' ? 'beauty-filter-video-fallback' : 'beauty-filter-video-source'}
        aria-label="Camera source"
        autoPlay
        playsInline
        muted
      />
      <canvas
        key={renderMode}
        ref={canvasRef}
        className={renderMode === 'video' ? 'beauty-filter-canvas hidden' : 'beauty-filter-canvas'}
        aria-label="Realtime beauty filter preview"
      />
    </div>
  );
}

export default BeautyFilterCamera;
