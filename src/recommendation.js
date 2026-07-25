export const PROFILE_SCHEMA_VERSION = 'photobooth-frame-profile:v1';

export const SCORE_KEYS = [
  'cute',
  'romantic',
  'vintage',
  'fantasy',
  'elegant',
  'minimal',
  'pastel',
  'energetic',
  'luxury',
  'fresh',
  'warm',
  'cool',
];

export const EMPTY_SCORES = Object.fromEntries(SCORE_KEYS.map((key) => [key, 0]));

const COLOR_TAGS = [
  { name: 'pink', r: 255, g: 105, b: 180 },
  { name: 'red', r: 220, g: 50, b: 65 },
  { name: 'orange', r: 245, g: 140, b: 35 },
  { name: 'yellow', r: 245, g: 210, b: 70 },
  { name: 'green', r: 75, g: 170, b: 105 },
  { name: 'cyan', r: 70, g: 190, b: 210 },
  { name: 'blue', r: 70, g: 120, b: 230 },
  { name: 'purple', r: 145, g: 95, b: 210 },
  { name: 'white', r: 245, g: 245, b: 245 },
  { name: 'black', r: 35, g: 35, b: 35 },
  { name: 'brown', r: 145, g: 95, b: 55 },
  { name: 'beige', r: 220, g: 190, b: 150 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const clampScore = (value) => clamp(Math.round(Number(value) || 0), 0, 100);

export const normalizeTag = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const uniqueTags = (items, limit = 12) => {
  const seen = new Set();
  const output = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const tag = normalizeTag(item);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      output.push(tag);
    }
  });
  return output.slice(0, limit);
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map((part) => clamp(Math.round(part), 0, 255).toString(16).padStart(2, '0')).join('')}`;

const colorDistance = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

const nearestColorTag = (rgb) =>
  COLOR_TAGS.reduce((best, color) => {
    const distance = colorDistance(rgb, color);
    return distance < best.distance ? { name: color.name, distance } : best;
  }, { name: 'neutral', distance: Infinity }).name;

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });

export const analyzeImageLocal = async (src, type = 'guest') => {
  const img = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  const size = 64;
  const ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight, 1);
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let total = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let lumSum = 0;
  let lumSq = 0;
  let satSum = 0;
  let warmSum = 0;
  const buckets = new Map();

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 18) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    rSum += r;
    gSum += g;
    bSum += b;
    lumSum += lum;
    lumSq += lum * lum;
    satSum += sat;
    warmSum += r - b;
    total += 1;
    const bucket = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }

  if (!total) throw new Error('No visible pixels');

  const avg = { r: rSum / total, g: gSum / total, b: bSum / total };
  const brightness = clampScore((lumSum / total / 255) * 100);
  const contrast = clampScore((Math.sqrt(Math.max(0, lumSq / total - (lumSum / total) ** 2)) / 80) * 100);
  const saturation = clampScore((satSum / total / 255) * 100);
  const warmth = clampScore(50 + (warmSum / total / 2.55));
  const coolness = clampScore(100 - warmth);

  const dominantColors = Array.from(buckets.entries())
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([bucket, count]) => {
      const [r, g, b] = bucket.split(',').map(Number);
      return { hex: rgbToHex({ r, g, b }), tag: nearestColorTag({ r, g, b }), weight: clampScore((count / total) * 100) };
    });

  const tags = [nearestColorTag(avg), brightness > 68 ? 'bright' : brightness < 34 ? 'dark' : 'balanced-light'];
  if (warmth > 58) tags.push('warm');
  if (coolness > 58) tags.push('cool');
  if (saturation < 28) tags.push('neutral');
  if (saturation < 42 && brightness > 58) tags.push('pastel');
  if (brightness > 72 && saturation < 38) tags.push('minimal');
  if (type === 'frame') tags.push('decorative-frame');
  if (type === 'guest') tags.push('portrait');

  const scores = {
    ...EMPTY_SCORES,
    cute: clampScore(45 + (brightness - 50) * 0.4 + saturation * 0.25),
    romantic: clampScore(35 + warmth * 0.35 + (dominantColors.some((c) => ['pink', 'red', 'purple'].includes(c.tag)) ? 22 : 0)),
    vintage: clampScore(55 - saturation * 0.25 + warmth * 0.18),
    fantasy: clampScore(30 + saturation * 0.35 + (dominantColors.some((c) => ['purple', 'cyan', 'pink'].includes(c.tag)) ? 22 : 0)),
    elegant: clampScore(42 + (saturation < 45 ? 20 : 0) + contrast * 0.2),
    minimal: clampScore(35 + (saturation < 35 ? 30 : 0) + (brightness > 62 ? 14 : 0)),
    pastel: clampScore(35 + (saturation < 55 && brightness > 55 ? 35 : 0)),
    energetic: clampScore(30 + saturation * 0.55 + contrast * 0.25),
    luxury: clampScore(32 + contrast * 0.32 + (brightness < 48 ? 18 : 0)),
    fresh: clampScore(38 + brightness * 0.35 + (coolness > 55 ? 18 : 0)),
    warm: warmth,
    cool: coolness,
  };

  return {
    schema: PROFILE_SCHEMA_VERSION,
    source: 'local',
    dominantColors,
    paletteTags: uniqueTags(tags, 10),
    lighting: {
      brightness,
      contrast,
      saturation,
      warmth,
      coolness,
    },
    vibes: uniqueTags(tags.filter((tag) => !['bright', 'dark', 'balanced-light'].includes(tag)), 10),
    concepts: uniqueTags(type === 'guest' ? ['portrait', ...tags] : ['decorative', ...tags], 10),
    events: [],
    scores,
    qualityWeight: clamp((0.45 + brightness / 220 + contrast / 260), 0.25, 1),
  };
};

export const validateProfile = (input, fallback = {}) => {
  if (!input || typeof input !== 'object') return null;
  const scores = { ...EMPTY_SCORES };
  Object.entries(input.scores || {}).forEach(([key, value]) => {
    if (key in scores) scores[key] = clampScore(value);
  });
  const lighting = input.lighting || {};
  return {
    schema: PROFILE_SCHEMA_VERSION,
    source: normalizeTag(input.source) || fallback.source || 'ai',
    dominantColors: (Array.isArray(input.dominantColors) ? input.dominantColors : [])
      .slice(0, 6)
      .map((color) => ({
        hex: /^#[0-9a-f]{6}$/i.test(color?.hex || '') ? color.hex.toLowerCase() : '#ffffff',
        tag: normalizeTag(color?.tag || 'neutral') || 'neutral',
        weight: clampScore(color?.weight ?? 20),
      })),
    paletteTags: uniqueTags(input.paletteTags, 12),
    lighting: {
      brightness: clampScore(lighting.brightness ?? 50),
      contrast: clampScore(lighting.contrast ?? 50),
      saturation: clampScore(lighting.saturation ?? 50),
      warmth: clampScore(lighting.warmth ?? scores.warm ?? 50),
      coolness: clampScore(lighting.coolness ?? scores.cool ?? 50),
    },
    vibes: uniqueTags(input.vibes, 12),
    concepts: uniqueTags(input.concepts, 12),
    events: uniqueTags(input.events, 12),
    scores,
    qualityWeight: clamp(Number(input.qualityWeight ?? fallback.qualityWeight ?? 0.75), 0.1, 1),
  };
};

export const mergeGuestProfiles = (profiles) => {
  const valid = profiles.flatMap((profile) => {
    const validProfile = validateProfile(profile);
    return validProfile ? [validProfile] : [];
  }).slice(0, 6);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((sum, item) => sum + item.qualityWeight, 0) || 1;
  const scores = { ...EMPTY_SCORES };
  const lighting = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, coolness: 0 };
  const tagCounts = new Map();
  const colors = [];
  valid.forEach((profile) => {
    const weight = profile.qualityWeight / totalWeight;
    SCORE_KEYS.forEach((key) => { scores[key] += profile.scores[key] * weight; });
    Object.keys(lighting).forEach((key) => { lighting[key] += profile.lighting[key] * weight; });
    [...profile.paletteTags, ...profile.vibes, ...profile.concepts, ...profile.events].forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + profile.qualityWeight);
    });
    colors.push(...profile.dominantColors);
  });
  Object.keys(scores).forEach((key) => { scores[key] = clampScore(scores[key]); });
  Object.keys(lighting).forEach((key) => { lighting[key] = clampScore(lighting[key]); });
  const sortedTags = Array.from(tagCounts.entries()).toSorted((a, b) => b[1] - a[1]).map(([tag]) => tag);
  return {
    schema: PROFILE_SCHEMA_VERSION,
    source: valid.some((item) => item.source === 'ai') ? 'ai' : 'local',
    dominantColors: colors.slice(0, 8),
    paletteTags: sortedTags.slice(0, 12),
    lighting,
    vibes: sortedTags.slice(0, 10),
    concepts: sortedTags.slice(0, 10),
    events: sortedTags.filter((tag) => ['birthday', 'christmas', 'wedding', 'party', 'school', 'family'].includes(tag)).slice(0, 8),
    scores,
    qualityWeight: clamp(totalWeight / valid.length, 0.1, 1),
  };
};

const overlapScore = (a = [], b = []) => {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((item) => setB.has(item)).length;
  return clampScore((hits / Math.max(1, Math.min(a.length, b.length))) * 100);
};

const scoreVectorSimilarity = (a = EMPTY_SCORES, b = EMPTY_SCORES) => {
  let diff = 0;
  SCORE_KEYS.forEach((key) => { diff += Math.abs((a[key] || 0) - (b[key] || 0)); });
  return clampScore(100 - diff / SCORE_KEYS.length);
};

const lightingSimilarity = (a, b) => {
  if (!a || !b) return 50;
  const diff = Math.abs(a.brightness - b.brightness) * 0.35
    + Math.abs(a.warmth - b.warmth) * 0.3
    + Math.abs(a.saturation - b.saturation) * 0.2
    + Math.abs(a.contrast - b.contrast) * 0.15;
  return clampScore(100 - diff);
};

const colorSimilarity = (a = [], b = []) => {
  const tagsA = a.flatMap((item) => (item.tag ? [item.tag] : []));
  const tagsB = b.flatMap((item) => (item.tag ? [item.tag] : []));
  return overlapScore(tagsA, tagsB) || 50;
};

export const recommendFrames = (frames, profilesByName, guestSessionProfile, limit = 5) => {
  if (!Array.isArray(frames) || !frames.length) return [];
  const guest = validateProfile(guestSessionProfile);
  if (!guest) return frames.slice(0, limit).map((frame, index) => ({ frame, score: 100 - index, reason: 'fallback' }));
  const scored = frames.map((frame, index) => {
    const frameProfile = validateProfile(profilesByName?.[frame.name] || profilesByName?.[frame.id]);
    if (!frameProfile) return { frame, score: Math.max(1, 20 - index * 0.1), reason: 'missing-profile' };
    const color = colorSimilarity(guest.dominantColors, frameProfile.dominantColors);
    const lighting = lightingSimilarity(guest.lighting, frameProfile.lighting);
    const vibe = scoreVectorSimilarity(guest.scores, frameProfile.scores);
    const concept = Math.max(overlapScore(guest.concepts, frameProfile.concepts), overlapScore(guest.vibes, frameProfile.vibes));
    const event = overlapScore(guest.events, frameProfile.events);
    const freshness = Math.max(0, 100 - index * 0.5);
    const score = clampScore(color * 0.35 + lighting * 0.2 + vibe * 0.2 + concept * 0.15 + event * 0.05 + freshness * 0.05);
    return { frame, score, reason: 'profile' };
  }).toSorted((a, b) => b.score - a.score);
  return scored.slice(0, limit);
};

export const extractJsonObject = (text) => {
  const raw = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};
