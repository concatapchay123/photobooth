import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Check,
  Printer,
  Camera,
  Copy,
  Download,
  FlipHorizontal,
  FlipVertical,
  Hand,
  Heart,
  ImagePlus,
  Images,
  Info,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  MousePointer2,
  Plus,
  QrCode,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  SquareDashed,
  Sun,
  Trash2,
  Upload,
  User,
  VideoOff,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import BeautyFilterCamera from './BeautyFilterCamera.jsx';
import {
  BEAUTY_FILTER_PRESETS,
  DEFAULT_BEAUTY_FILTER_SETTINGS,
} from './beautyFilterSettings.js';
import {
  analyzeImageLocal,
  extractJsonObject,
  mergeGuestProfiles,
  recommendFrames,
  validateProfile,
} from './recommendation.js';
import { ConfirmPrintPopup } from '../popup-drafts/ConfirmAdjustPopup.jsx';
import { ConfirmCapturePopup } from '../popup-drafts/ConfirmCapturePopup.jsx';
import { ConfirmFramePopup } from '../popup-drafts/ConfirmFramePopup.jsx';
import { ConfirmSelectPopup } from '../popup-drafts/ConfirmSelectPopup.jsx';
import { TimeWarningAdjustPopup } from '../popup-drafts/TimeWarningAdjustPopup.jsx';
import TimeWarningFramePopup from '../popup-drafts/TimeWarningFramePopup.jsx';
import TimeWarningSelectPopup from '../popup-drafts/TimeWarningSelectPopup.jsx';
import frameRegistry from '../frames/registry.json';
import heroStrip1 from './assets/hero-strip-1.jpg';
import heroStrip2 from './assets/hero-strip-2.jpg';
import svovLogo from '../logo/efb37aca-ff56-493f-9c1d-f11db397f5f1.png';

const standardFrameAssetModules = import.meta.glob([
  '../frames/{preview,overlay}/*.{jpg,jpeg,png,JPG,JPEG,PNG}',
  '../frames/source/*.{jpg,jpeg,png,JPG,JPEG,PNG}',
  '../frames/upscaled/{preview,overlay}/*.{jpg,jpeg,png,JPG,JPEG,PNG}',
], {
  eager: true,
  query: '?url',
  import: 'default',
});

const fallbackFrameAssetModules = import.meta.glob('../frames/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const frameAssetModules = { ...standardFrameAssetModules, ...fallbackFrameAssetModules };

const formatGuestTimerTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor((Number(seconds) || 0) + 0.001));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

function GuestTimerBadge({ active, secondsLeft, label = 'Còn lại' }) {
  if (!active) return null;
  return (
    <div className="pink-timer-badge" aria-live="polite">
      <span className="pink-timer-spark" aria-hidden="true">✦</span>
      <span className="pink-timer-copy">
        <span>{label}</span>
        <strong>{formatGuestTimerTime(secondsLeft)}</strong>
      </span>
    </div>
  );
}

const ADMIN_PIN_STORAGE_KEY = 'photobooth-admin-pin:v1';
const DEFAULT_ADMIN_PIN = String(import.meta.env.VITE_PHOTOBOOTH_ADMIN_PIN || '2468').trim();
const KIOSK_CONTROL_ORIGIN = String(import.meta.env.VITE_KIOSK_CONTROL_ORIGIN || '').trim().replace(/\/+$/, '');
const ADMIN_UNLOCK_CLICK_COUNT = 5;
const ADMIN_UNLOCK_CLICK_WINDOW_MS = 2500;

const getStoredAdminPin = () => {
  try {
    return localStorage.getItem(ADMIN_PIN_STORAGE_KEY) || DEFAULT_ADMIN_PIN;
  } catch {
    return DEFAULT_ADMIN_PIN;
  }
};

const saveStoredAdminPin = (pin) => {
  try {
    localStorage.setItem(ADMIN_PIN_STORAGE_KEY, pin);
  } catch {
    // The env/default PIN still works if storage is unavailable.
  }
};

const callKioskControl = async (path) => {
  if (!KIOSK_CONTROL_ORIGIN) return false;
  try {
    const response = await fetch(`${KIOSK_CONTROL_ORIGIN}${path}`, { method: 'POST' });
    return response.ok;
  } catch {
    return false;
  }
};

function KioskAdminModal({
  mode,
  pinEntry,
  pinError,
  newPinEntry,
  newPinConfirm,
  isFullscreenActive,
  onPinEntryChange,
  onNewPinEntryChange,
  onNewPinConfirmChange,
  onUnlock,
  onClose,
  onRequestFullscreen,
  onExitFullscreen,
  onExitKiosk,
  onRestartSession,
  onReload,
  onOpenEditor,
  onShowChangePin,
  onSavePin,
  onBackToPanel,
}) {
  if (!mode) return null;

  return (
    <div className="kiosk-admin-backdrop" role="presentation" onPointerDown={(event) => event.stopPropagation()}>
      <div className="kiosk-admin-card" role="dialog" aria-modal="true" aria-labelledby="kiosk-admin-title">
        {mode === 'unlock' && (
          <form onSubmit={onUnlock}>
            <p className="kiosk-admin-eyebrow">Admin</p>
            <h2 id="kiosk-admin-title">Mở khóa vận hành</h2>
            <p className="kiosk-admin-copy">Nhập PIN để tạm mở bảng điều khiển booth.</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pinEntry}
              onChange={(event) => onPinEntryChange(event.target.value)}
              className="kiosk-admin-input"
              aria-label="Admin PIN"
            />
            {pinError && <p className="kiosk-admin-error">{pinError}</p>}
            <div className="kiosk-admin-actions">
              <button type="submit" className="kiosk-admin-primary">Mở khóa</button>
              <button type="button" className="kiosk-admin-secondary" onClick={onClose}>Đóng</button>
            </div>
          </form>
        )}

        {mode === 'panel' && (
          <>
            <p className="kiosk-admin-eyebrow">Admin</p>
            <h2 id="kiosk-admin-title">Bảng điều khiển booth</h2>
            <div className="kiosk-admin-grid">
              <button type="button" onClick={isFullscreenActive ? onExitFullscreen : onRequestFullscreen}>
                {isFullscreenActive ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span>{isFullscreenActive ? 'Thoát fullscreen' : 'Vào fullscreen'}</span>
              </button>
              <button type="button" onClick={onExitKiosk}>
                <Minimize2 size={18} />
                <span>Tắt kiosk</span>
              </button>
              <button type="button" onClick={onRestartSession}>
                <RotateCcw size={18} />
                <span>Lượt mới</span>
              </button>
              <button type="button" onClick={onReload}>
                <RefreshCcw size={18} />
                <span>Tải lại app</span>
              </button>
              <button type="button" onClick={onOpenEditor}>
                <SquareDashed size={18} />
                <span>Mở editor</span>
              </button>
              <button type="button" onClick={onShowChangePin}>
                <Info size={18} />
                <span>Đổi PIN</span>
              </button>
            </div>
            <button type="button" className="kiosk-admin-secondary kiosk-admin-wide" onClick={onClose}>Đóng bảng admin</button>
          </>
        )}

        {mode === 'pin' && (
          <form onSubmit={onSavePin}>
            <p className="kiosk-admin-eyebrow">Admin</p>
            <h2 id="kiosk-admin-title">Đổi PIN mở khóa</h2>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={newPinEntry}
              onChange={(event) => onNewPinEntryChange(event.target.value)}
              className="kiosk-admin-input"
              placeholder="PIN mới"
              aria-label="New admin PIN"
            />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={newPinConfirm}
              onChange={(event) => onNewPinConfirmChange(event.target.value)}
              className="kiosk-admin-input"
              placeholder="Nhập lại PIN mới"
              aria-label="Confirm new admin PIN"
            />
            {pinError && <p className="kiosk-admin-error">{pinError}</p>}
            <div className="kiosk-admin-actions">
              <button type="submit" className="kiosk-admin-primary">Lưu PIN</button>
              <button type="button" className="kiosk-admin-secondary" onClick={onBackToPanel}>Quay lại</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const getFrameAssetUrl = (assetPath, { preferUpscaled = true } = {}) => {
  const normalizedPath = String(assetPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const upscaledPath = `upscaled/${normalizedPath}`;
  const standardUrl = frameAssetModules[`../frames/${normalizedPath}`] || '';
  const upscaledUrl = frameAssetModules[`../frames/${upscaledPath}`] || '';
  return preferUpscaled ? upscaledUrl || standardUrl : standardUrl || upscaledUrl;
};

const getRegistryFrameLibrary = () => {
  if (!Array.isArray(frameRegistry?.frames) || frameRegistry.frames.length === 0) return [];
  return frameRegistry.frames
    .flatMap((frame) => {
      const previewUrl = getFrameAssetUrl(frame.preview);
      const overlayUrl = getFrameAssetUrl(frame.overlay);
      const previewRenderUrl = getFrameAssetUrl(frame.preview, { preferUpscaled: false });
      const overlayRenderUrl = getFrameAssetUrl(frame.overlay, { preferUpscaled: false });
      if (!previewUrl || !overlayUrl) return [];
      return [{
        id: frame.id || frame.name,
        name: frame.name,
        url: previewUrl,
        previewUrl,
        overlayUrl,
        previewRenderUrl,
        overlayRenderUrl,
        sourcePath: frame.source,
        type: 'png',
        source: 'standard',
        width: frame.width,
        height: frame.height,
        slotCount: frame.slotCount || 0,
      }];
    });
};

const getFrameTypeFromName = (name = '') => (name.toLowerCase().endsWith('.png') ? 'png' : 'jpg');

const getFallbackFrameLibrary = () => {
  const pairedAssetsByName = new Map();
  const sourceFrames = [];
  const topLevelFrames = [];
  const sourceFileNames = new Set();

  Object.entries(frameAssetModules).forEach(([path, url]) => {
    const pairedMatch = path.match(/^\.\.\/frames\/(?:(upscaled)\/)?(preview|overlay)\/([^/]+)$/);
    if (pairedMatch) {
      const [, upscaledMarker, kind, fileName] = pairedMatch;
      const entry = pairedAssetsByName.get(fileName) || {
        id: fileName,
        name: fileName,
        type: getFrameTypeFromName(fileName),
        source: 'asset-folder',
      };
      const quality = upscaledMarker ? 'upscaled' : 'standard';
      entry[`${quality}${kind === 'preview' ? 'PreviewUrl' : 'OverlayUrl'}`] = url;
      pairedAssetsByName.set(fileName, entry);
      return;
    }

    const sourceMatch = path.match(/^\.\.\/frames\/source\/([^/]+)$/);
    if (sourceMatch) {
      const [, fileName] = sourceMatch;
      sourceFileNames.add(fileName.toLowerCase());
      sourceFrames.push({
        id: fileName,
        name: fileName,
        url,
        previewUrl: url,
        overlayUrl: url,
        previewRenderUrl: url,
        overlayRenderUrl: url,
        sourcePath: `source/${fileName}`,
        type: getFrameTypeFromName(fileName),
        source: 'source-folder',
      });
      return;
    }

    if (/^\.\.\/frames\/[^/]+\.(jpg|jpeg|png)$/i.test(path)) {
      const fileName = path.split('/').pop();
      topLevelFrames.push({
        id: fileName,
        name: fileName,
        url,
        type: getFrameTypeFromName(fileName),
        source: 'asset-folder',
      });
    }
  });

  const pairedFrames = Array.from(pairedAssetsByName.values()).flatMap((entry) => {
    if (sourceFileNames.size > 0 && !sourceFileNames.has(entry.name.toLowerCase())) return [];

    const previewUrl = entry.upscaledPreviewUrl || entry.standardPreviewUrl || entry.upscaledOverlayUrl || entry.standardOverlayUrl;
    const overlayUrl = entry.upscaledOverlayUrl || entry.standardOverlayUrl || previewUrl;
    const previewRenderUrl = entry.standardPreviewUrl || entry.upscaledPreviewUrl || previewUrl;
    const overlayRenderUrl = entry.standardOverlayUrl || entry.upscaledOverlayUrl || overlayUrl;
    return [{
      id: entry.id,
      name: entry.name,
      url: previewUrl,
      previewUrl,
      overlayUrl,
      previewRenderUrl,
      overlayRenderUrl,
      type: entry.type,
      source: entry.source,
    }];
  });

  return [...pairedFrames, ...sourceFrames, ...topLevelFrames].filter((frame) => frame.url);
};

const REGISTRY_FRAME_LIBRARY = getRegistryFrameLibrary();
const getFrameDedupeKey = (frame) =>
  String(frame?.sourcePath || frame?.name || frame?.id || '').toLowerCase();
const FRAME_LIBRARY = [...REGISTRY_FRAME_LIBRARY, ...getFallbackFrameLibrary()]
  .filter((frame, index, library) => (
    library.findIndex((item) => getFrameDedupeKey(item) === getFrameDedupeKey(frame)) === index
  ))
  .toSorted((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const TRANSPARENT_SLOT_ALPHA_LIMIT = 24;
const SLOT_PHOTO_BLEED_PIXELS = 0;
const CACHE_PREFIX = 'photobooth-frame-slots:v3-transparent';
const SLOT_MAP_SCHEMA = 'photobooth-slot-map:v1';
const FRAME_PACKAGE_SCHEMA = 'photobooth-frame-package:v1';
const GUEST_OUTPUT_SCHEMA = 'photobooth-guest-output:v1';
const GUEST_STEP_ORDER = ['capture', 'frame', 'select', 'adjust', 'result'];
const GUEST_CAPTURE_TARGET = 6;
const GUEST_CAPTURE_MIN_TO_CONTINUE = 6;
const GUEST_TOTAL_TIMER_SECONDS = 300;
const GUEST_CAPTURE_TOTAL_SECONDS = 60;
const GUEST_CAPTURE_INTERVAL_SECONDS = 5;
const GUEST_FRAME_SELECTION_TARGET = 2;
const GUEST_FRAME_PAGE_SIZE = 10;
const GUEST_FRAME_PREFETCH_AHEAD_PAGES = 2;
const GUEST_FRAME_PREVIEW_PHOTO_TARGET = 4;
const GUEST_AUTO_NEW_SESSION_SECONDS = 60;
const PRINT_OUTPUT_SCALE = 2;
const PRINT_PIXELS_PER_CM = 100 * PRINT_OUTPUT_SCALE;
const STANDARD_PRINT_FRAME = { width: 620 * PRINT_OUTPUT_SCALE, height: 870 * PRINT_OUTPUT_SCALE };
const PRINT_SHEET = { width: 1300 * PRINT_OUTPUT_SCALE, height: 1800 * PRINT_OUTPUT_SCALE };
const PRINT_CUT_GAP = 12 * PRINT_OUTPUT_SCALE;
const PRINT_EDGE_PADDING = 20 * PRINT_OUTPUT_SCALE;
const SELECTED_CAMERA_STORAGE_KEY = 'selectedCameraId';
const PREFERRED_CAMERA_STORAGE_KEY = 'preferredCameraId';
const STAGE_PERCENTAGES = {
  capture: 0.2197,
  frame: 0.2833,
  select: 0.20,
  adjust: 0.30,
};
const GUEST_TOTAL_TIMER_STEPS = ['capture', 'frame', 'select', 'adjust'];
const GUEST_TIMED_WARNING_SECONDS = 30;
const GUEST_STAGE_WEIGHT_TOTAL = GUEST_TOTAL_TIMER_STEPS.reduce(
  (total, stepId) => total + (STAGE_PERCENTAGES[stepId] || 0),
  0,
);
const createGuestStepBudgets = (totalSeconds = GUEST_TOTAL_TIMER_SECONDS) =>
  GUEST_TOTAL_TIMER_STEPS.reduce((budgets, stepId) => ({
    ...budgets,
    [stepId]: GUEST_STAGE_WEIGHT_TOTAL > 0
      ? totalSeconds * ((STAGE_PERCENTAGES[stepId] || 0) / GUEST_STAGE_WEIGHT_TOTAL)
      : 0,
  }), {});
const GUEST_TIMED_STEPS = {
  frame: { warningSeconds: GUEST_TIMED_WARNING_SECONDS },
  select: { warningSeconds: GUEST_TIMED_WARNING_SECONDS },
  adjust: { warningSeconds: GUEST_TIMED_WARNING_SECONDS },
};
const GUEST_WARNING_POPUP_MS = 7000;
const HIGH_QUALITY_CAMERA_CONSTRAINTS = {
  width: { ideal: 1920 },
  height: { ideal: 1440 },
};

const getFriendlyTimeText = (secondsLeft) => {
  const roundedSeconds = Math.ceil(secondsLeft);
  return roundedSeconds > 0 ? `còn khoảng ${roundedSeconds} giây` : 'đã tới mốc thời gian';
};

const getGuestTimedWarning = ({ stepId, secondsLeft, selectedCount = 0, requiredCount = 0 }) => {
  const timeText = getFriendlyTimeText(secondsLeft);
  if (stepId === 'frame') {
    return `Nhắc nhẹ nè, mình ${timeText} để chọn 2 khung. Bạn bấm vào hai khung ưng nhất rồi chốt để tụi mình lên tờ in 13x18 nha.`;
  }
  if (stepId === 'select') {
    return `Nhắc yêu một chút, mình ${timeText} để chọn ảnh. Bạn đã chọn ${selectedCount}/${requiredCount || 0} tấm; chọn ít hơn slot vẫn được, slot thiếu mình bù bằng ảnh gần nhất nha.`;
  }
  if (stepId === 'adjust') {
    return `Sắp xong rồi nè, mình ${timeText} để căn ảnh. Kéo nhẹ ảnh trong slot, hoặc bấm "Tự căn theo mặt", rồi nhấn "Hoàn tất chỉnh sửa" khi đã ưng ý nha.`;
  }
  return '';
};

const createFrameCacheKey = (frameName, width, height) =>
  frameName ? `${CACHE_PREFIX}:${frameName}:${width}x${height}` : null;

const readFrameCache = (key) => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.zones)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeFrameCache = (key, value) => {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify({ ...value, updatedAt: Date.now() }));
  } catch {
    // localStorage can be unavailable in private browser modes; the app still works without cache.
  }
};

const clearFrameCache = (key) => {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

const rectToPoints = (zone) =>
  zone.points || [
    { x: zone.x, y: zone.y },
    { x: zone.x + zone.width, y: zone.y },
    { x: zone.x + zone.width, y: zone.y + zone.height },
    { x: zone.x, y: zone.y + zone.height },
  ];

const getZoneBoundsFromPoints = (points) => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const getPolygonCss = (zone) => {
  const points = rectToPoints(zone);
  return points
    .map((point) => `${((point.x - zone.x) / zone.width) * 100}% ${((point.y - zone.y) / zone.height) * 100}%`)
    .join(', ');
};

const getFrameClipPath = (zone, frameDimensions, outset = 0) => {
  if (!zone || !frameDimensions.width || !frameDimensions.height) return 'none';
  const points = rectToPoints(zone);
  return `polygon(${points
    .map((point) => `${(point.x / frameDimensions.width) * 100}% ${(point.y / frameDimensions.height) * 100}%`)
    .join(', ')})`;
};

const getPhotoZone = (photo, zones) =>
  zones.find((zone) => zone.slotIndex === photo.slotIndex) || zones[photo.slotIndex] || null;

const clipCanvasToZone = (ctx, zone, outset = SLOT_PHOTO_BLEED_PIXELS) => {
  const points = rectToPoints(zone);
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.clip();
};

const getSvgPoints = (zone) =>
  rectToPoints(zone)
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

const getZoneAngle = (zone) => {
  const points = rectToPoints(zone);
  if (points.length < 2) return 0;
  return (Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * 180) / Math.PI;
};

const normalizeZone = (zone, index = 0) => {
  const points = rectToPoints(zone);
  const bounds = getZoneBoundsFromPoints(points);
  const angle = getZoneAngle({ ...zone, points });

  return {
    ...zone,
    x: bounds.x,
    y: bounds.y,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
    points,
    angle,
    center: {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
    aspectRatio: bounds.width / Math.max(1, bounds.height),
    slotIndex: index,
    shape: zone.shape || 'polygon',
  };
};

const scaleZonesToDimensions = (zones, sourceDimensions, targetDimensions) => {
  if (!Array.isArray(zones) || zones.length === 0) return [];
  const sourceWidth = Number(sourceDimensions?.width) || 0;
  const sourceHeight = Number(sourceDimensions?.height) || 0;
  const targetWidth = Number(targetDimensions?.width) || 0;
  const targetHeight = Number(targetDimensions?.height) || 0;
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) return zones;

  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;
  if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) return zones;

  return zones.map((zone) => ({
    ...zone,
    points: rectToPoints(zone).map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  }));
};

const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));

const clampZoom = (value) => clampValue(Math.round(value * 100) / 100, 0.75, 3);

const sortZonesNatural = (zones) =>
  zones
    .toSorted((a, b) => {
      const rowTolerance = Math.max(24, Math.min(a.height || 0, b.height || 0) * 0.35);
      return Math.abs(a.y - b.y) < rowTolerance ? a.x - b.x : a.y - b.y;
    })
    .map((zone, index) => normalizeZone(zone, index));

const roundSlotCoord = (value) => Math.round(value * 100) / 100;

const sanitizeFramePackageFileName = (frameName) => {
  const baseName = (frameName || 'khung')
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .trim();
  return `${baseName || 'khung'}-photobooth-package.json`;
};

const getFrameMimeType = (frameType) => (frameType === 'png' ? 'image/png' : 'image/jpeg');

const createSlotMapPayload = ({ selectedFrame, frameDimensions, zones, detectionMode }) => {
  const normalizedZones = sortZonesNatural(zones);
  return {
    schema: SLOT_MAP_SCHEMA,
    frameName: selectedFrame?.name || 'uploaded-frame',
    frameWidth: frameDimensions.width,
    frameHeight: frameDimensions.height,
    frameType: selectedFrame?.type || 'jpg',
    slotCount: normalizedZones.length,
    detectionMode,
    zones: normalizedZones.map((zone) => ({
      slotIndex: zone.slotIndex,
      shape: zone.shape || 'polygon',
      detectionMode: zone.detectionMode || detectionMode,
      points: rectToPoints(zone).map((point) => ({
        x: roundSlotCoord(point.x),
        y: roundSlotCoord(point.y),
      })),
    })),
    exportedAt: new Date().toISOString(),
  };
};

const getFrameDataUrl = (imgObj, frameType) => {
  const canvas = document.createElement('canvas');
  canvas.width = imgObj.naturalWidth;
  canvas.height = imgObj.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgObj, 0, 0);
  return canvas.toDataURL(getFrameMimeType(frameType), frameType === 'png' ? undefined : 0.94);
};

const createFramePackagePayload = ({ selectedFrame, frameDimensions, zones, detectionMode, frameImage }) => {
  const slotMap = createSlotMapPayload({
    selectedFrame,
    frameDimensions,
    zones,
    detectionMode,
  });
  const frameType = selectedFrame?.type || slotMap.frameType || 'jpg';

  return {
    schema: FRAME_PACKAGE_SCHEMA,
    app: 'my-photobooth',
    packageVersion: 1,
    frame: {
      name: selectedFrame?.name || slotMap.frameName,
      type: frameType,
      mimeType: getFrameMimeType(frameType),
      width: frameDimensions.width,
      height: frameDimensions.height,
      dataUrl: getFrameDataUrl(frameImage, frameType),
    },
    slotMap,
    exportedAt: new Date().toISOString(),
  };
};

const downloadJsonPayload = (payload, fileName) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

const validateSlotMapPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { error: 'File không phải JSON object.' };
  }
  if (payload.schema !== SLOT_MAP_SCHEMA) {
    return { error: 'Sai schema dữ liệu slot.' };
  }
  if (typeof payload.frameName !== 'string' || payload.frameName.trim().length === 0) {
    return { error: 'Thiếu tên khung.' };
  }
  if (!Number.isFinite(payload.frameWidth) || payload.frameWidth <= 0) {
    return { error: 'Kích thước ngang của khung không hợp lệ.' };
  }
  if (!Number.isFinite(payload.frameHeight) || payload.frameHeight <= 0) {
    return { error: 'Kích thước dọc của khung không hợp lệ.' };
  }
  if (!Array.isArray(payload.zones) || payload.zones.length === 0) {
    return { error: 'File chưa có danh sách slot.' };
  }

  const frameWidth = Math.round(payload.frameWidth);
  const frameHeight = Math.round(payload.frameHeight);
  const zonesWithOrder = payload.zones.map((zone, index) => ({ zone, index }));
  zonesWithOrder.sort((a, b) => {
    const aSlot = Number.isInteger(a.zone?.slotIndex) ? a.zone.slotIndex : a.index;
    const bSlot = Number.isInteger(b.zone?.slotIndex) ? b.zone.slotIndex : b.index;
    return aSlot - bSlot || a.index - b.index;
  });

  const importedZones = [];
  for (const { zone, index } of zonesWithOrder) {
    const points = zone?.points;
    if (!Array.isArray(points) || points.length < 4) {
      return { error: `Slot ${index + 1} cần ít nhất 4 điểm.` };
    }

    const cleanedPoints = [];
    for (const point of points) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return { error: `Slot ${index + 1} có tọa độ không hợp lệ.` };
      }
      if (point.x < 0 || point.x > frameWidth || point.y < 0 || point.y > frameHeight) {
        return { error: `Slot ${index + 1} có điểm nằm ngoài kích thước khung.` };
      }
      cleanedPoints.push({ x: point.x, y: point.y });
    }

    importedZones.push(
      normalizeZone(
        {
          id: `import-${Date.now()}-${index}`,
          points: cleanedPoints,
          detectionMode: zone.detectionMode || payload.detectionMode || 'target',
          shape: zone.shape || 'polygon',
        },
        importedZones.length,
      ),
    );
  }

  const zones = sortZonesNatural(importedZones);
  return {
    slotMap: {
      frameName: payload.frameName.trim(),
      frameWidth,
      frameHeight,
      frameType: payload.frameType || (payload.frameName.toLowerCase().endsWith('.png') ? 'png' : 'jpg'),
      zones,
      detectionMode: payload.detectionMode || zones[0]?.detectionMode || 'target',
    },
  };
};

const validateFramePackagePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { error: 'File không phải JSON object.' };
  }
  if (payload.schema !== FRAME_PACKAGE_SCHEMA) {
    return { error: 'Sai schema gói khung.' };
  }
  const frame = payload.frame;
  if (!frame || typeof frame !== 'object') {
    return { error: 'Gói khung thiếu dữ liệu ảnh khung.' };
  }
  if (typeof frame.dataUrl !== 'string' || !frame.dataUrl.startsWith('data:image/')) {
    return { error: 'Gói khung không có ảnh khung dạng data URL hợp lệ.' };
  }
  if (typeof frame.name !== 'string' || frame.name.trim().length === 0) {
    return { error: 'Gói khung thiếu tên ảnh khung.' };
  }

  const { slotMap, error } = validateSlotMapPayload(payload.slotMap);
  if (error) return { error };

  if (Number.isFinite(frame.width) && Math.round(frame.width) !== slotMap.frameWidth) {
    return { error: 'Chiều ngang ảnh khung không khớp dữ liệu slot.' };
  }
  if (Number.isFinite(frame.height) && Math.round(frame.height) !== slotMap.frameHeight) {
    return { error: 'Chiều dọc ảnh khung không khớp dữ liệu slot.' };
  }

  return {
    framePackage: {
      frame: {
        name: frame.name.trim(),
        type: frame.type || slotMap.frameType || (frame.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'),
        dataUrl: frame.dataUrl,
      },
      slotMap,
    },
  };
};

const createSlotFitSubject = (img, method = 'slot-cover') => ({
  box: { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
  faceBox: null,
  faceCount: 0,
  method,
});

const fitPhotoToSlot = (img, zone) => {
  const normalizedZone = normalizeZone(zone, zone.slotIndex || 0);
  const scale = getSlotCoverScale(img.naturalWidth, img.naturalHeight, normalizedZone, 0);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;

  return {
    x: normalizedZone.x + (normalizedZone.width - drawW) / 2,
    y: normalizedZone.y + (normalizedZone.height - drawH) / 2,
    scale,
    rotation: 0,
    slotIndex: normalizedZone.slotIndex,
    fitMode: 'cover',
    subject: createSlotFitSubject(img, 'slot-cover'),
  };
};

const getSlotContainScale = (naturalWidth, naturalHeight, zone, rotation = 0) => {
  const bounds = getZoneBoundsFromPoints(rectToPoints(zone));
  const radians = (Math.abs(rotation) % 180) * Math.PI / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedW = Math.max(1, naturalWidth * cos + naturalHeight * sin);
  const rotatedH = Math.max(1, naturalWidth * sin + naturalHeight * cos);
  return Math.min(bounds.width / rotatedW, bounds.height / rotatedH);
};

const fitPhotoInsideSlot = (img, zone) => {
  const normalizedZone = normalizeZone(zone, zone.slotIndex || 0);
  const bounds = getZoneBoundsFromPoints(rectToPoints(normalizedZone));
  const scale = getSlotContainScale(img.naturalWidth, img.naturalHeight, normalizedZone, 0);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  return {
    x: bounds.x + (bounds.width - drawW) / 2,
    y: bounds.y + (bounds.height - drawH) / 2,
    scale,
    rotation: 0,
    slotIndex: normalizedZone.slotIndex,
    fitMode: 'contain',
    subject: {
      box: { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
      faceBox: null,
      faceCount: 0,
      method: 'slot-contain',
    },
  };
};

const getSlotCoverScale = (naturalWidth, naturalHeight, zone, rotation = 0) => {
  const bounds = getZoneBoundsFromPoints(rectToPoints(zone));
  const radians = (Math.abs(rotation) % 180) * Math.PI / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedW = Math.max(1, naturalWidth * cos + naturalHeight * sin);
  const rotatedH = Math.max(1, naturalWidth * sin + naturalHeight * cos);
  return Math.max(bounds.width / rotatedW, bounds.height / rotatedH);
};

const normalizeSlotEditTransform = (edit, zone, updates = {}) => {
  const next = { ...edit, ...updates };
  const shouldContain = next.fitMode === 'contain';
  const minScale = shouldContain
    ? getSlotContainScale(next.naturalWidth, next.naturalHeight, zone, next.rotation || 0)
    : getSlotCoverScale(next.naturalWidth, next.naturalHeight, zone, next.rotation || 0);
  const maxScale = Math.max(minScale, next.baseScale * 6);
  const requestedScale = Number.isFinite(next.scale) ? next.scale : next.baseScale;
  const scale = clampValue(requestedScale, minScale, maxScale);
  const drawW = next.naturalWidth * scale;
  const drawH = next.naturalHeight * scale;
  const bounds = getZoneBoundsFromPoints(rectToPoints(zone));
  const centerX = Number.isFinite(next.x) ? next.x + drawW / 2 : bounds.x + bounds.width / 2;
  const centerY = Number.isFinite(next.y) ? next.y + drawH / 2 : bounds.y + bounds.height / 2;
  const minCenterX = bounds.x + Math.min(bounds.width, drawW) * 0.18;
  const maxCenterX = bounds.x + bounds.width - Math.min(bounds.width, drawW) * 0.18;
  const minCenterY = bounds.y + Math.min(bounds.height, drawH) * 0.18;
  const maxCenterY = bounds.y + bounds.height - Math.min(bounds.height, drawH) * 0.18;
  return {
    ...next,
    scale,
    minScale,
    maxScale,
    x: clampValue(centerX, Math.min(minCenterX, maxCenterX), Math.max(minCenterX, maxCenterX)) - drawW / 2,
    y: clampValue(centerY, Math.min(minCenterY, maxCenterY), Math.max(minCenterY, maxCenterY)) - drawH / 2,
    warning: !shouldContain && requestedScale < minScale ? 'Ảnh cần phủ kín slot để không bị hở nền.' : '',
  };
};

const slotEditToPhoto = (edit) => ({
  id: edit.photoId,
  name: edit.name,
  url: edit.url,
  x: edit.x,
  y: edit.y,
  scale: edit.scale,
  rotation: edit.rotation,
  flipX: edit.flipX,
  flipY: edit.flipY,
  naturalWidth: edit.naturalWidth,
  naturalHeight: edit.naturalHeight,
  slotIndex: edit.slotIndex,
  subject: edit.subject,
});

const extractTransformFromPlacement = (placement, img, zone) => {
  const base = {
    x: placement.x,
    y: placement.y,
    scale: placement.scale,
    rotation: placement.rotation || 0,
    flipX: false,
    flipY: false,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    baseScale: placement.scale,
    fitMode: placement.fitMode,
  };
  return normalizeSlotEditTransform(base, zone);
};

const extractBaseTransform = (edit) => ({
  x: edit.baseX,
  y: edit.baseY,
  scale: edit.baseScale,
  rotation: edit.baseRotation || 0,
  flipX: false,
  flipY: false,
});

const extractSlotStyle = (zone, frameDimensions) => ({
  left: `${(zone.x / frameDimensions.width) * 100}%`,
  top: `${(zone.y / frameDimensions.height) * 100}%`,
  width: `${(zone.width / frameDimensions.width) * 100}%`,
  height: `${(zone.height / frameDimensions.height) * 100}%`,
  clipPath: `polygon(${getPolygonCss(zone)})`,
});

const extractPhotoStyle = (edit, zone) => ({
  left: `${((edit.x - zone.x) / zone.width) * 100}%`,
  top: `${((edit.y - zone.y) / zone.height) * 100}%`,
  width: `${(edit.naturalWidth * edit.scale / zone.width) * 100}%`,
  height: `${(edit.naturalHeight * edit.scale / zone.height) * 100}%`,
  transform: `rotate(${edit.rotation || 0}deg) scale(${edit.flipX ? -1 : 1}, ${edit.flipY ? -1 : 1})`,
});

const extractZoomValue = (edit) => Math.round((edit.scale / Math.max(0.0001, edit.baseScale)) * 100);

const extractZoomScale = (edit, zoomValue) => edit.baseScale * (Number(zoomValue) / 100);

const extractRotationValue = (edit) => Math.round((((edit.rotation || 0) + 180) % 360) - 180);

const getAxisOverlap = (aMin, aMax, bMin, bMax) => Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin) + 1);

const getAxisGap = (aMin, aMax, bMin, bMax) => {
  if (aMax < bMin) return bMin - aMax - 1;
  if (bMax < aMin) return aMin - bMax - 1;
  return 0;
};

const mergeNearbyTransparentSlotParts = (components, frameWidth, frameHeight) => {
  if (components.length <= 1) return components;

  const bridgeGap = Math.max(6, Math.round(Math.min(frameWidth, frameHeight) * 0.018));
  const parents = components.map((_, index) => index);

  const findParent = (index) => {
    let root = index;
    while (parents[root] !== root) root = parents[root];
    while (parents[index] !== index) {
      const next = parents[index];
      parents[index] = root;
      index = next;
    }
    return root;
  };

  const join = (aIndex, bIndex) => {
    const aRoot = findParent(aIndex);
    const bRoot = findParent(bIndex);
    if (aRoot !== bRoot) parents[bRoot] = aRoot;
  };

  const shouldMerge = (a, b) => {
    const yOverlap = getAxisOverlap(a.minY, a.maxY, b.minY, b.maxY);
    const xGap = getAxisGap(a.minX, a.maxX, b.minX, b.maxX);
    const minHeight = Math.min(a.height, b.height);
    const combinedMinX = Math.min(a.minX, b.minX);
    const combinedMaxX = Math.max(a.maxX, b.maxX);
    const combinedWidth = combinedMaxX - combinedMinX + 1;
    const keepsFrameMargins = combinedMinX > frameWidth * 0.025 && combinedMaxX < frameWidth * 0.975;
    const sharedVerticalBand = yOverlap >= Math.max(6, minHeight * 0.14);

    return keepsFrameMargins && combinedWidth <= frameWidth * 0.92 && sharedVerticalBand && xGap <= bridgeGap;
  };

  for (let i = 0; i < components.length; i += 1) {
    for (let j = i + 1; j < components.length; j += 1) {
      if (shouldMerge(components[i], components[j])) join(i, j);
    }
  }

  const groups = new Map();
  components.forEach((component, index) => {
    const root = findParent(index);
    const current = groups.get(root);
    if (!current) {
      groups.set(root, { ...component, componentCount: 1 });
      return;
    }

    current.minX = Math.min(current.minX, component.minX);
    current.minY = Math.min(current.minY, component.minY);
    current.maxX = Math.max(current.maxX, component.maxX);
    current.maxY = Math.max(current.maxY, component.maxY);
    current.area += component.area;
    current.componentCount += 1;
  });

  return Array.from(groups.values()).map((component) => ({
    ...component,
    width: component.maxX - component.minX + 1,
    height: component.maxY - component.minY + 1,
  }));
};

const detectFrameSlots = (imgObj) => {
  const width = imgObj.naturalWidth || imgObj.width;
  const height = imgObj.naturalHeight || imgObj.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imgObj, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const totalPixels = width * height;
  const transparent = new Uint8Array(totalPixels);

  for (let i = 0, p = 0; i < imageData.data.length; i += 4, p += 1) {
    transparent[p] = imageData.data[i + 3] <= TRANSPARENT_SLOT_ALPHA_LIMIT ? 1 : 0;
  }

  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  const minArea = Math.max(12000, Math.floor(totalPixels * 0.012));
  const minWidth = Math.floor(width * 0.28);
  const minHeight = Math.floor(height * 0.06);
  const componentMinArea = Math.max(1200, Math.floor(totalPixels * 0.001));
  const componentMinWidth = Math.max(24, Math.floor(width * 0.04));
  const componentMinHeight = Math.max(24, Math.floor(height * 0.018));
  const components = [];

  for (let start = 0; start < totalPixels; start += 1) {
    if (!transparent[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      area += 1;

      const x = index % width;
      const y = Math.floor(index / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const left = index - 1;
      const right = index + 1;
      const up = index - width;
      const down = index + width;

      if (x > 0 && transparent[left] && !visited[left]) {
        visited[left] = 1;
        queue[tail] = left;
        tail += 1;
      }
      if (x < width - 1 && transparent[right] && !visited[right]) {
        visited[right] = 1;
        queue[tail] = right;
        tail += 1;
      }
      if (y > 0 && transparent[up] && !visited[up]) {
        visited[up] = 1;
        queue[tail] = up;
        tail += 1;
      }
      if (y < height - 1 && transparent[down] && !visited[down]) {
        visited[down] = 1;
        queue[tail] = down;
        tail += 1;
      }
    }

    const slotWidth = maxX - minX + 1;
    const slotHeight = maxY - minY + 1;
    if (area >= componentMinArea && slotWidth >= componentMinWidth && slotHeight >= componentMinHeight) {
      components.push({
        minX,
        minY,
        maxX,
        maxY,
        width: slotWidth,
        height: slotHeight,
        area,
      });
    }
  }

  const slots = mergeNearbyTransparentSlotParts(components, width, height)
    .filter((component) => component.area >= minArea && component.width >= minWidth && component.height >= minHeight)
    .map((component) => {
      const slotWidth = component.width;
      const slotHeight = component.height;
      const minX = component.minX;
      const minY = component.minY;

      return {
        id: `alpha-${minX}-${minY}-${component.area}`,
        x: minX,
        y: minY,
        width: slotWidth,
        height: slotHeight,
        points: [
          { x: minX, y: minY },
          { x: minX + slotWidth, y: minY },
          { x: minX + slotWidth, y: minY + slotHeight },
          { x: minX, y: minY + slotHeight },
        ],
        detectionMode: component.componentCount > 1 ? 'alpha-merged' : 'alpha',
        shape: 'rect',
        area: component.area,
      };
    });

  const zones = sortZonesNatural(slots.sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 8));
  return {
    zones,
    detectionMode: zones.length > 0 ? 'alpha' : 'none',
  };
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const getFrameLibraryKey = (frame) =>
  `${frame?.source || 'library'}-${frame?.name || frame?.id || 'frame'}-${frame?.width || ''}-${frame?.height || ''}`;

const areSameFrameChoice = (a, b) => getFrameLibraryKey(a) === getFrameLibraryKey(b);

const getFirstCaptureIndices = (photoCount, targetCount = 4) =>
  Array.from({ length: Math.min(targetCount, photoCount) }, (_, index) => index);

const createFrameOverlayCanvasFromImage = (frameImage, dimensions) => {
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const drawImageIntoTransparentSlot = (targetCtx, img, placement, slot) => {
  if (!slot) return;
  const drawW = img.naturalWidth * placement.scale;
  const drawH = img.naturalHeight * placement.scale;

  targetCtx.save();
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';
  targetCtx.beginPath();
  targetCtx.rect(slot.x, slot.y, slot.width, slot.height);
  targetCtx.clip();
  targetCtx.translate(placement.x + drawW / 2, placement.y + drawH / 2);
  targetCtx.rotate(((placement.rotation || 0) * Math.PI) / 180);
  targetCtx.scale(placement.flipX ? -1 : 1, placement.flipY ? -1 : 1);
  targetCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  targetCtx.restore();
};

const canvasToPreviewDataUrl = (sourceCanvas, maxLongSide = 920) => {
  const longSide = Math.max(sourceCanvas.width, sourceCanvas.height);
  const scale = Math.min(1, maxLongSide / Math.max(1, longSide));
  if (scale >= 1) return sourceCanvas.toDataURL('image/jpeg', 0.86);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
};

const getCanvasContentBounds = (sourceCanvas) => {
  const width = sourceCanvas?.width || 0;
  const height = sourceCanvas?.height || 0;
  if (!width || !height) return { x: 0, y: 0, width: 1, height: 1 };

  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { x: 0, y: 0, width, height };

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return { x: 0, y: 0, width, height };
  }

  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const index = row + x * 4;
      const alpha = data[index + 3];
      if (alpha < 12) continue;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const isBlankPaper = red >= 250 && green >= 250 && blue >= 250;
      if (isBlankPaper) continue;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return { x: 0, y: 0, width, height };

  const padding = 4;
  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const right = Math.min(width, maxX + padding + 1);
  const bottom = Math.min(height, maxY + padding + 1);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
};

const createGuestPrintSheetCanvas = (frameCanvases) => {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_SHEET.width;
  canvas.height = PRINT_SHEET.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gap = PRINT_CUT_GAP;
  const items = frameCanvases
    .slice(0, GUEST_FRAME_SELECTION_TARGET)
    .flatMap((frameCanvas) => (frameCanvas ? [{
      frameCanvas,
      bounds: getCanvasContentBounds(frameCanvas),
    }] : []));

  if (!items.length) return canvas;

  const availableWidth = canvas.width - PRINT_EDGE_PADDING * 2 - gap * Math.max(0, items.length - 1);
  const availableHeight = canvas.height - PRINT_EDGE_PADDING * 2;
  const sourceWidth = items.reduce((total, item) => total + item.bounds.width, 0);
  const sourceHeight = Math.max(...items.map((item) => item.bounds.height));
  const scale = Math.min(
    availableWidth / Math.max(1, sourceWidth),
    availableHeight / Math.max(1, sourceHeight),
  );
  const drawItems = items.map((item) => ({
    ...item,
    width: Math.max(1, Math.round(item.bounds.width * scale)),
    height: Math.max(1, Math.round(item.bounds.height * scale)),
  }));
  const totalWidth = drawItems.reduce((total, item) => total + item.width, 0) + gap * Math.max(0, drawItems.length - 1);
  let x = Math.round((canvas.width - totalWidth) / 2);

  drawItems.forEach((item, index) => {
    const y = Math.round((canvas.height - item.height) / 2);
    ctx.drawImage(
      item.frameCanvas,
      item.bounds.x,
      item.bounds.y,
      item.bounds.width,
      item.bounds.height,
      x,
      y,
      item.width,
      item.height,
    );
    x += item.width + (index < drawItems.length - 1 ? gap : 0);
  });

  return canvas;
};

const QR_VERSION_CONFIGS = [
  { version: 1, ecCodewords: 10, blockDataCodewords: [16] },
  { version: 2, ecCodewords: 16, blockDataCodewords: [28] },
  { version: 3, ecCodewords: 26, blockDataCodewords: [44] },
  { version: 4, ecCodewords: 18, blockDataCodewords: [32, 32] },
  { version: 5, ecCodewords: 24, blockDataCodewords: [43, 43] },
  { version: 6, ecCodewords: 16, blockDataCodewords: [27, 27, 27, 27] },
].map((config) => ({
  ...config,
  dataCodewords: config.blockDataCodewords.reduce((total, value) => total + value, 0),
}));

const QR_ALIGNMENT_PATTERN_POSITIONS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

const createQrDataCodewords = (bytes, totalDataCodewords) => {
  const bits = [];
  const capacity = totalDataCodewords * 8;
  const pushBits = (value, length) => {
    for (let shift = length - 1; shift >= 0; shift -= 1) {
      bits.push((value >>> shift) & 1);
    }
  };

  if (bytes.length > 255) return null;
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  bytes.forEach((byte) => pushBits(byte, 8));
  if (bits.length > capacity) return null;

  const terminatorLength = Math.min(4, capacity - bits.length);
  for (let index = 0; index < terminatorLength; index += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords = [];
  for (let index = 0; index < bits.length; index += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[index + bit];
    dataCodewords.push(value);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (dataCodewords.length < totalDataCodewords) {
    dataCodewords.push(padBytes[padIndex % padBytes.length]);
    padIndex += 1;
  }
  return dataCodewords;
};

const createQrGfTables = () => {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    exp[index] = value;
    log[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < exp.length; index += 1) exp[index] = exp[index - 255];
  return { exp, log };
};

const QR_GF = createQrGfTables();
const QR_RS_GENERATOR_CACHE = new Map();

const qrGfMultiply = (a, b) => {
  if (!a || !b) return 0;
  return QR_GF.exp[QR_GF.log[a] + QR_GF.log[b]];
};

const getQrRsGenerator = (degree) => {
  if (QR_RS_GENERATOR_CACHE.has(degree)) return QR_RS_GENERATOR_CACHE.get(degree);
  let generator = [1];
  for (let degreeIndex = 0; degreeIndex < degree; degreeIndex += 1) {
    const next = new Array(generator.length + 1).fill(0);
    generator.forEach((coefficient, index) => {
      next[index] ^= coefficient;
      next[index + 1] ^= qrGfMultiply(coefficient, QR_GF.exp[degreeIndex]);
    });
    generator = next;
  }
  QR_RS_GENERATOR_CACHE.set(degree, generator);
  return generator;
};

const computeQrErrorCorrection = (dataCodewords, degree) => {
  const generator = getQrRsGenerator(degree);
  const result = [...dataCodewords, ...new Array(degree).fill(0)];
  for (let index = 0; index < dataCodewords.length; index += 1) {
    const factor = result[index];
    if (!factor) continue;
    for (let generatorIndex = 1; generatorIndex < generator.length; generatorIndex += 1) {
      result[index + generatorIndex] ^= qrGfMultiply(generator[generatorIndex], factor);
    }
  }
  return result.slice(dataCodewords.length);
};

const addQrErrorCorrection = (dataCodewords, config) => {
  const blocks = [];
  let offset = 0;
  config.blockDataCodewords.forEach((blockLength) => {
    const data = dataCodewords.slice(offset, offset + blockLength);
    blocks.push({ data, errorCorrection: computeQrErrorCorrection(data, config.ecCodewords) });
    offset += blockLength;
  });

  const codewords = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
  for (let index = 0; index < maxDataLength; index += 1) {
    blocks.forEach((block) => {
      if (index < block.data.length) codewords.push(block.data[index]);
    });
  }
  for (let index = 0; index < config.ecCodewords; index += 1) {
    blocks.forEach((block) => codewords.push(block.errorCorrection[index]));
  }
  return codewords;
};

const createQrState = (size) => ({
  modules: Array.from({ length: size }, () => new Array(size).fill(false)),
  reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
});

const cloneQrState = (state) => ({
  modules: state.modules.map((row) => [...row]),
  reserved: state.reserved.map((row) => [...row]),
});

const setQrFunctionModule = (state, x, y, isDark) => {
  const size = state.modules.length;
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  state.modules[y][x] = Boolean(isDark);
  state.reserved[y][x] = true;
};

const drawQrFinderPattern = (state, x, y) => {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const isInPattern = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const isDark = isInPattern && (
        dx === 0 ||
        dx === 6 ||
        dy === 0 ||
        dy === 6 ||
        (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
      );
      setQrFunctionModule(state, x + dx, y + dy, isDark);
    }
  }
};

const drawQrAlignmentPattern = (state, centerX, centerY) => {
  if (state.reserved[centerY]?.[centerX]) return;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setQrFunctionModule(state, centerX + dx, centerY + dy, distance !== 1);
    }
  }
};

const getQrFormatBits = (mask) => {
  const data = mask & 0b111;
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((remainder >>> bit) & 1) !== 0) remainder ^= 0x537 << (bit - 10);
  }
  return (((data << 10) | remainder) ^ 0x5412) & 0x7fff;
};

const setQrFormatInfo = (state, mask) => {
  const size = state.modules.length;
  const bits = getQrFormatBits(mask);
  const getBit = (index) => ((bits >>> index) & 1) !== 0;

  for (let index = 0; index <= 5; index += 1) setQrFunctionModule(state, 8, index, getBit(index));
  setQrFunctionModule(state, 8, 7, getBit(6));
  setQrFunctionModule(state, 8, 8, getBit(7));
  setQrFunctionModule(state, 7, 8, getBit(8));
  for (let index = 9; index < 15; index += 1) setQrFunctionModule(state, 14 - index, 8, getBit(index));

  for (let index = 0; index < 8; index += 1) setQrFunctionModule(state, size - 1 - index, 8, getBit(index));
  for (let index = 8; index < 15; index += 1) setQrFunctionModule(state, 8, size - 15 + index, getBit(index));
  setQrFunctionModule(state, 8, size - 8, true);
};

const createQrBaseState = (version) => {
  const size = version * 4 + 17;
  const state = createQrState(size);
  drawQrFinderPattern(state, 0, 0);
  drawQrFinderPattern(state, size - 7, 0);
  drawQrFinderPattern(state, 0, size - 7);

  for (let index = 8; index < size - 8; index += 1) {
    const isDark = index % 2 === 0;
    setQrFunctionModule(state, index, 6, isDark);
    setQrFunctionModule(state, 6, index, isDark);
  }

  const alignmentPositions = QR_ALIGNMENT_PATTERN_POSITIONS[version] || [];
  alignmentPositions.forEach((x) => {
    alignmentPositions.forEach((y) => drawQrAlignmentPattern(state, x, y));
  });

  setQrFormatInfo(state, 0);
  return state;
};

const getQrMaskValue = (mask, x, y) => {
  if (mask === 0) return (x + y) % 2 === 0;
  if (mask === 1) return y % 2 === 0;
  if (mask === 2) return x % 3 === 0;
  if (mask === 3) return (x + y) % 3 === 0;
  if (mask === 4) return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
  if (mask === 5) return ((x * y) % 2) + ((x * y) % 3) === 0;
  if (mask === 6) return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
  return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
};

const placeQrDataBits = (state, codewords, mask) => {
  const bits = [];
  codewords.forEach((codeword) => {
    for (let bit = 7; bit >= 0; bit -= 1) bits.push((codeword >>> bit) & 1);
  });

  const size = state.modules.length;
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (state.reserved[y][x]) continue;
        let isDark = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        if (getQrMaskValue(mask, x, y)) isDark = !isDark;
        state.modules[y][x] = isDark;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
};

const getQrRunPenalty = (line) => {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;
  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === runColor) {
      runLength += 1;
      continue;
    }
    if (runLength >= 5) penalty += 3 + runLength - 5;
    runColor = line[index];
    runLength = 1;
  }
  if (runLength >= 5) penalty += 3 + runLength - 5;
  return penalty;
};

const hasQrFinderLikePattern = (line, index) => {
  const pattern = [true, false, true, true, true, false, true];
  if (!pattern.every((value, patternIndex) => line[index + patternIndex] === value)) return false;
  const hasLightBefore = index >= 4 && line.slice(index - 4, index).every((value) => !value);
  const hasLightAfter = index + 11 <= line.length && line.slice(index + 7, index + 11).every((value) => !value);
  return hasLightBefore || hasLightAfter;
};

const scoreQrModules = (modules) => {
  const size = modules.length;
  let penalty = 0;
  let darkCount = 0;

  for (let y = 0; y < size; y += 1) {
    const row = modules[y];
    penalty += getQrRunPenalty(row);
    for (let x = 0; x < size; x += 1) {
      if (row[x]) darkCount += 1;
      if (x + 1 < size && y + 1 < size) {
        const color = row[x];
        if (row[x + 1] === color && modules[y + 1][x] === color && modules[y + 1][x + 1] === color) {
          penalty += 3;
        }
      }
      if (x + 7 <= size && hasQrFinderLikePattern(row, x)) penalty += 40;
    }
  }

  for (let x = 0; x < size; x += 1) {
    const column = modules.map((row) => row[x]);
    penalty += getQrRunPenalty(column);
    for (let y = 0; y + 7 <= size; y += 1) {
      if (hasQrFinderLikePattern(column, y)) penalty += 40;
    }
  }

  const total = size * size;
  const balancePenalty = Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1;
  if (balancePenalty > 0) penalty += balancePenalty * 10;
  return penalty;
};

const buildQrModules = (codewords, version) => {
  const baseState = createQrBaseState(version);
  let bestModules = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const state = cloneQrState(baseState);
    placeQrDataBits(state, codewords, mask);
    setQrFormatInfo(state, mask);
    const score = scoreQrModules(state.modules);
    if (score < bestScore) {
      bestScore = score;
      bestModules = state.modules;
    }
  }

  return bestModules;
};

const qrModulesToPngDataUrl = (modules) => {
  const quietZone = 4;
  const moduleSize = 8;
  const size = (modules.length + quietZone * 2) * moduleSize;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#111111';
  modules.forEach((row, y) => {
    row.forEach((isDark, x) => {
      if (isDark) {
        ctx.fillRect(
          (x + quietZone) * moduleSize,
          (y + quietZone) * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    });
  });
  return canvas.toDataURL('image/png');
};

const createQrCodeDataUrl = (text) => {
  if (!text) return '';
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  for (const config of QR_VERSION_CONFIGS) {
    const dataCodewords = createQrDataCodewords(bytes, config.dataCodewords);
    if (!dataCodewords) continue;
    const codewords = addQrErrorCorrection(dataCodewords, config);
    return qrModulesToPngDataUrl(buildQrModules(codewords, config.version));
  }
  return '';
};

const createDownloadSlug = (value, fallback = 'photobooth') =>
  String(value || fallback)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;

const getConfiguredShareOrigin = () =>
  String(import.meta.env.VITE_PUBLIC_SHARE_ORIGIN || '')
    .trim()
    .replace(/\/+$/, '');

const buildShareUrlFromOrigin = (origin, sharePath) => {
  const cleanOrigin = String(origin || '').trim().replace(/\/+$/, '');
  return cleanOrigin && sharePath ? `${cleanOrigin}${sharePath}` : '';
};

const getUrlHostname = (origin) => {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isLoopbackShareOrigin = (origin) => {
  const hostname = getUrlHostname(origin);
  return !hostname || hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1' || hostname.startsWith('127.');
};

const isTryCloudflareShareOrigin = (origin) => getUrlHostname(origin).endsWith('.trycloudflare.com');

const isHttpsShareUrl = (url) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const resolveGuestShareUrl = (shareData) => {
  const sharePath = shareData?.sharePath || (shareData?.id ? `/guest/${shareData.id}` : '');
  const sameOriginUrl = buildShareUrlFromOrigin(window.location.origin, sharePath);
  const isCurrentPublicOrigin = window.location.protocol === 'https:' && !isLoopbackShareOrigin(window.location.origin);
  if (isCurrentPublicOrigin && sameOriginUrl) return sameOriginUrl;

  if (isHttpsShareUrl(shareData?.shareUrl)) return shareData.shareUrl;

  const configuredUrl = buildShareUrlFromOrigin(getConfiguredShareOrigin(), sharePath);
  if (isHttpsShareUrl(configuredUrl) && !isTryCloudflareShareOrigin(configuredUrl)) return configuredUrl;

  if (shareData?.shareUrl && !isTryCloudflareShareOrigin(shareData.shareUrl)) return shareData.shareUrl;

  const lanShareUrl = Array.isArray(shareData?.lanShareUrls) ? shareData.lanShareUrls.find(Boolean) : '';
  if (lanShareUrl) return lanShareUrl;

  if (isHttpsShareUrl(configuredUrl)) {
    return configuredUrl;
  }

  return sameOriginUrl || configuredUrl || shareData?.shareUrl || '';
};

const createGuestOutputPayload = ({ printDataUrl, frameCanvases, draftsForPrint, capturedPhotosForSave = [], outputMeta }) => {
  const frameNames = Array.isArray(outputMeta?.frameNames) && outputMeta.frameNames.length > 0
    ? outputMeta.frameNames
    : draftsForPrint.flatMap((draft) => (draft.frame?.name ? [draft.frame.name] : []));
  const slug = createDownloadSlug(frameNames.join('-'), 'photobooth');
  return {
    schema: GUEST_OUTPUT_SCHEMA,
    title: 'Ảnh photobooth của bạn',
    createdAt: outputMeta?.createdAt || new Date().toISOString(),
    print: {
      dataUrl: printDataUrl,
      fileName: `${slug}-ban-in-13x18.png`,
      width: PRINT_SHEET.width,
      height: PRINT_SHEET.height,
      sizeCm: { width: 13, height: 18 },
    },
    frames: frameCanvases.map((canvas, index) => ({
      dataUrl: canvas.toDataURL('image/png'),
      label: `Khung ${index + 1}`,
      frameName: draftsForPrint[index]?.frame?.name || '',
      fileName: `${slug}-khung-${index + 1}.png`,
      width: canvas.width,
      height: canvas.height,
    })),
    captures: capturedPhotosForSave.slice(0, GUEST_CAPTURE_TARGET).map((photo, index) => ({
      dataUrl: photo.url,
      label: `Ảnh chụp ${index + 1}`,
      fileName: `${slug}-anh-chup-${index + 1}.png`,
      capturedAt: photo.capturedAt || '',
      sourceId: photo.id || '',
    })),
    meta: outputMeta,
  };
};

const getCanvasFrameStats = (canvas, sampleSize = 24) => {
  const width = canvas?.width || 0;
  const height = canvas?.height || 0;
  if (width <= 1 || height <= 1) return { ok: false, mean: 0, variance: 0, range: 0 };

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { ok: false, mean: 0, variance: 0, range: 0 };

  ctx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  let sum = 0;
  let sumSquares = 0;
  let min = 255;
  let max = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 16) continue;
    const luminance = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    sum += luminance;
    sumSquares += luminance * luminance;
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
    count += 1;
  }

  if (!count) return { ok: false, mean: 0, variance: 0, range: 0 };
  const mean = sum / count;
  const variance = sumSquares / count - mean * mean;
  return {
    ok: true,
    mean,
    variance,
    range: max - min,
  };
};

const isProbablyBlankCanvas = (canvas) => {
  const stats = getCanvasFrameStats(canvas);
  if (!stats.ok) return true;
  const nearlyFlat = stats.variance < 6 && stats.range < 18;
  const nearBlack = stats.mean < 10 && stats.range < 28;
  const nearWhite = stats.mean > 246 && stats.range < 18;
  return nearlyFlat || nearBlack || nearWhite;
};

const getGuestPrintLoadingHtml = () => `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Đang chuẩn bị bản in</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; color: #a20f5d; background: #fff7fb; font-weight: 800; }
  </style>
</head>
<body>Đang chuẩn bị bản in 13x18…</body>
</html>`;

const getGuestPrintHtml = (imageUrl) => `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Bản in photobooth 13x18</title>
  <style>
    @page { size: 13cm 18cm; margin: 0; }
    html, body { margin: 0; width: 13cm; min-height: 18cm; background: #fff; }
    body { display: grid; place-items: center; }
    img { display: block; width: 13cm; height: 18cm; object-fit: contain; }
    .no-print { position: fixed; left: 12px; right: 12px; bottom: 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.94); color: #a20f5d; box-shadow: 0 8px 24px rgba(0,0,0,.14); padding: 10px 14px; font: 800 13px Arial, sans-serif; text-align: center; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="Bản in photobooth 13x18">
  <div class="no-print">Nếu hộp thoại in chưa hiện, nhấn Ctrl+P trong cửa sổ này.</div>
  <script>
    const runPrint = () => window.setTimeout(() => {
      window.focus();
      window.print();
    }, 280);
    const image = document.querySelector('img');
    if (image.complete) runPrint();
    else image.addEventListener('load', runPrint, { once: true });
  </script>
</body>
</html>`;

const openGuestPrintWindow = () => {
  const printWindow = window.open('', 'photobooth-print', 'width=900,height=1100');
  if (!printWindow) return null;
  try {
    printWindow.document.open();
    printWindow.document.write(getGuestPrintLoadingHtml());
    printWindow.document.close();
  } catch {
    return null;
  }
  return printWindow;
};

const printGuestImageUrl = (imageUrl, existingPrintWindow = null) => {
  if (!imageUrl) return false;
  const printWindow = existingPrintWindow && !existingPrintWindow.closed
    ? existingPrintWindow
    : openGuestPrintWindow();
  if (!printWindow) return false;
  try {
    printWindow.document.open();
    printWindow.document.write(getGuestPrintHtml(imageUrl));
    printWindow.document.close();
    printWindow.focus();
    return true;
  } catch {
    return false;
  }
};

const fetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

const readFramePackageFromServer = async (frameName, width, height) => {
  const params = new URLSearchParams({
    frameName: frameName || '',
    width: String(width || 0),
    height: String(height || 0),
  });
  const data = await fetchJson(`/api/frame-store/find?${params.toString()}`);
  if (!data?.package) return null;
  if (data.package.schema === SLOT_MAP_SCHEMA) {
    const { slotMap, error } = validateSlotMapPayload(data.package);
    return error ? null : { slotMap };
  }
  const { framePackage, error } = validateFramePackagePayload(data.package);
  return error ? null : framePackage;
};

const saveFramePackageToServer = async (payload) => {
  const data = await fetchJson('/api/frame-store/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data?.package || null;
};

const saveSlotMapToServer = async (payload) => {
  const data = await fetchJson('/api/frame-store/save-slot-map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data?.package || null;
};

const loadFrameProfilesFromServer = async () => {
  const data = await fetchJson('/api/frame-store/profiles');
  return data?.profiles && typeof data.profiles === 'object' ? data.profiles : {};
};

const saveFrameProfileToServer = async (frameName, profile) => {
  const data = await fetchJson('/api/frame-store/profiles/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frameName, profile }),
  });
  return data?.profiles && typeof data.profiles === 'object' ? data.profiles : null;
};

const cleanupFrameProfilesOnServer = async () => {
  const data = await fetchJson('/api/frame-store/profiles/cleanup', { method: 'POST' });
  return data || null;
};

const saveGuestOutputToServer = async (payload) => {
  const data = await fetchJson('/api/guest-output/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data?.ok ? data : null;
};

const getAiConfig = () => ({
  endpoint: import.meta.env.VITE_9ROUTER_ENDPOINT || import.meta.env.VITE_AI_ENDPOINT || '',
  apiKey: import.meta.env.VITE_9ROUTER_API_KEY || import.meta.env.VITE_AI_API_KEY || '',
  model: import.meta.env.VITE_9ROUTER_MODEL || import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini',
});

const callVisionProfileAi = async ({ images, prompt }) => {
  const { endpoint, apiKey, model } = getAiConfig();
  if (!endpoint || !apiKey) return null;
  const messages = [{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      ...images.map((imageUrl) => ({ type: 'image_url', image_url: { url: imageUrl } })),
    ],
  }];
  const apiBase = endpoint.replace(/\/$/, '');
  const chatUrl = apiBase.endsWith('/v1') ? `${apiBase}/chat/completions` : `${apiBase}/v1/chat/completions`;
  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, response_format: { type: 'json_object' } }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return extractJsonObject(data?.choices?.[0]?.message?.content || '');
};

const playShutterSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    let ctx = window.__shutterAudioCtx;
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
      window.__shutterAudioCtx = ctx;
    }
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Helper to play a noise burst with high-pass/band-pass filtering
    const playNoiseBurst = (freq, q, volume, duration, delay) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      filter.Q.setValueAtTime(q, ctx.currentTime + delay);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration - 0.002);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(ctx.currentTime + delay);
      source.stop(ctx.currentTime + delay + duration);
    };

    // Helper to play a quick tone sweep
    const playToneSweep = (fStart, fEnd, type, volume, duration, delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(fStart, ctx.currentTime + delay);
      if (fEnd !== fStart) {
        osc.frequency.exponentialRampToValueAtTime(fEnd, ctx.currentTime + delay + duration);
      }

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration - 0.002);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    // 1. Mirror Flip Up (0ms delay): High pitch metallic burst
    playNoiseBurst(6000, 4, 0.35, 0.03, 0);
    playToneSweep(2000, 1000, 'triangle', 0.15, 0.02, 0);

    // 2. Shutter Blades Open/Close (35ms delay): Strong mechanical "click-clack"
    playNoiseBurst(2200, 1.8, 0.5, 0.06, 0.035);
    playToneSweep(800, 200, 'triangle', 0.3, 0.06, 0.035);

    // 3. Mirror Return & Mechanical Thump (100ms delay): Low frequency dampener
    playNoiseBurst(800, 1, 0.2, 0.08, 0.1);
    playToneSweep(180, 60, 'sine', 0.25, 0.09, 0.1);

  } catch (error) {
    console.warn('Failed to play shutter sound:', error);
  }
};

export default function App() {
  const isPartnerMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return ['partner', 'editor', 'collab'].includes(params.get('mode'));
  }, []);
  const isKioskGuardEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (isPartnerMode || params.get('kiosk') === '0') return false;
    return params.get('kiosk') === '1' || import.meta.env.VITE_KIOSK_MODE === '1';
  }, [isPartnerMode]);
  const [originalFrame, setOriginalFrame] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [selectedGuestFrames, setSelectedGuestFrames] = useState([]);
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });
  const [interactionMode, setInteractionMode] = useState('library');
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isCommittingGuestFrames, setIsCommittingGuestFrames] = useState(false);
  const [canvasBg, setCanvasBg] = useState('checkerboard');
  const [zones, setZones] = useState([]);
  const [importedFrameLibrary, setImportedFrameLibrary] = useState([]);
  const [drawingZone, setDrawingZone] = useState(null);
  const [detectionMode, setDetectionMode] = useState('none');
  const [cacheStatus, setCacheStatus] = useState('Chưa chọn khung');
  const [photoAnalysisStatus, setPhotoAnalysisStatus] = useState('Chưa có ảnh khách');
  const [slotAssignments, setSlotAssignments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editingPoint, setEditingPoint] = useState(null);
  const [draggingZone, setDraggingZone] = useState(null);
  const [requestedSelectedZoneId, setSelectedZoneId] = useState(null);
  const [slotEditTool, setSlotEditTool] = useState('select');
  const [editorZoom, setEditorZoom] = useState(1);
  const [guestStep, setGuestStep] = useState('hero');
  const [visibleGuestStep, setVisibleGuestStep] = useState('hero');
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [selectedCaptureIndices, setSelectedCaptureIndices] = useState([]);
  const [guestAutoCaptureIndices, setGuestAutoCaptureIndices] = useState([]);
  const [guestFramePreviews, setGuestFramePreviews] = useState([]);
  const [guestFramePageIndex, setGuestFramePageIndex] = useState(0);
  const [isBuildingFramePreviews, setIsBuildingFramePreviews] = useState(false);
  const [framePreviewStatus, setFramePreviewStatus] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(() => localStorage.getItem(SELECTED_CAMERA_STORAGE_KEY) || '');
  const [isCameraReconnecting, setIsCameraReconnecting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [showDslrGuide, setShowDslrGuide] = useState(false);

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const reconnectIntervalIdRef = useRef(null);
  const isUsingFallbackCameraRef = useRef(false);
  const preferredCameraIdRef = useRef(localStorage.getItem(PREFERRED_CAMERA_STORAGE_KEY) || '');
  const [isCapturingGuestPhoto, setIsCapturingGuestPhoto] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(null);
  const [captureSessionSecondsLeft, setCaptureSessionSecondsLeft] = useState(GUEST_CAPTURE_TOTAL_SECONDS);
  const [nextCaptureSecondsLeft, setNextCaptureSecondsLeft] = useState(GUEST_CAPTURE_INTERVAL_SECONDS);
  const [isLockedCaptureRunning, setIsLockedCaptureRunning] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [guestNotice, setGuestNotice] = useState('');
  const [guestStepStartedAt, setGuestStepStartedAt] = useState(null);
  const [guestStepTimerStepId, setGuestStepTimerStepId] = useState(null);
  const [guestTimerNow, setGuestTimerNow] = useState(() => Date.now());
  const [isGuestTimerPaused, setIsGuestTimerPaused] = useState(false);
  const [guestStepBudgets, setGuestStepBudgets] = useState(() => createGuestStepBudgets());

  const latestGuestStepRef = useRef(guestStep);
  latestGuestStepRef.current = guestStep;

  const latestIsLockedCaptureRunningRef = useRef(isLockedCaptureRunning);
  latestIsLockedCaptureRunningRef.current = isLockedCaptureRunning;

  const latestCaptureSessionSecondsLeftRef = useRef(captureSessionSecondsLeft);
  latestCaptureSessionSecondsLeftRef.current = captureSessionSecondsLeft;

  const latestGuestTimedStepSecondsLeftRef = useRef(0);

  const latestGuestStepBudgetsRef = useRef(guestStepBudgets);
  latestGuestStepBudgetsRef.current = guestStepBudgets;

  const [guestCommittedStepIndex, setGuestCommittedStepIndex] = useState(-1);
  const [guestTransitionPrompt, setGuestTransitionPrompt] = useState(null);
  const [guestTransitionBusy, setGuestTransitionBusy] = useState(false);
  const [guestTimedWarningPopup, setGuestTimedWarningPopup] = useState(null);
  const [guestPreviewUrl, setGuestPreviewUrl] = useState('');
  
  // End of restored and updated block
  
  const [guestOutputMeta, setGuestOutputMeta] = useState(null);
  const [guestShare, setGuestShare] = useState(null);
  const [guestQrUrl, setGuestQrUrl] = useState('');
  const [, setGuestShareStatus] = useState('');
  const [, setGuestPrintStatus] = useState('');
  const [isGuestPrinting, setIsGuestPrinting] = useState(false);
  const [guestPrintFallbackAvailable, setGuestPrintFallbackAvailable] = useState(false);
  const [isCopiedShareLink, setIsCopiedShareLink] = useState(false);
  const [slotEdits, setSlotEdits] = useState([]);
  const [guestFrameDrafts, setGuestFrameDrafts] = useState([]);
  const [selectedAdjustFrameIndex, setSelectedAdjustFrameIndex] = useState(0);
  const [selectedAdjustSlotIndex, setSelectedAdjustSlotIndex] = useState(0);
  const [adjustWarning, setAdjustWarning] = useState('');
  const [adjustDrag, setAdjustDrag] = useState(null);
  const [isGeneratingGuestResult, setIsGeneratingGuestResult] = useState(false);
  const [frameProfiles, setFrameProfiles] = useState({});
  const [guestPhotoProfiles, setGuestPhotoProfiles] = useState([]);
  const [guestSessionProfile, setGuestSessionProfile] = useState(null);
  const [frameProfileStatus, setFrameProfileStatus] = useState('');
  const [analyzingFrameName, setAnalyzingFrameName] = useState('');
  const guestAiAnalysisStartedRef = useRef(false);
  const [beautyFilterSettings, setBeautyFilterSettings] = useState(DEFAULT_BEAUTY_FILTER_SETTINGS);
  const [activeBeautyPresetId, setActiveBeautyPresetId] = useState(DEFAULT_BEAUTY_FILTER_SETTINGS.id);
  const [hoveredStrip, setHoveredStrip] = useState(null);
  const [adminModalMode, setAdminModalMode] = useState(null);
  const [adminPin, setAdminPin] = useState(getStoredAdminPin);
  const [adminPinEntry, setAdminPinEntry] = useState('');
  const [adminNewPinEntry, setAdminNewPinEntry] = useState('');
  const [adminNewPinConfirm, setAdminNewPinConfirm] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [isKioskFullscreenActive, setIsKioskFullscreenActive] = useState(() => (
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  ));
  const [kioskNeedsResume, setKioskNeedsResume] = useState(false);

  const originalImgRef = useRef(null);
  const frameCanvasRef = useRef(null);
  const editorRef = useRef(null);
  const beautyCameraRef = useRef(null);
  const fileInputRef = useRef(null);
  const frameInputRef = useRef(null);
  const slotDataInputRef = useRef(null);
  const lastLoadedFrameKeyRef = useRef(null);
  const skipNextCacheWriteRef = useRef(false);
  const cacheSaveTimerRef = useRef(null);
  const serverSaveTimerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const capturedPhotosCountRef = useRef(0);
  const captureBusyRef = useRef(false);
  const capturePausedRef = useRef(false);
  const guestTimerPausedTotalMsRef = useRef(0);
  const guestTimerPauseStartedAtRef = useRef(null);
  const guestTimedWarningShownKeysRef = useRef(new Set());
  const guestTimedAutoAdvanceKeysRef = useRef(new Set());
  const guestFramePreviewRequestRef = useRef(0);
  const guestFramePreviewsRef = useRef([]);
  const guestPreviewPhotoCacheRef = useRef(new Map());
  const guestPreviewFrameCacheRef = useRef(new Map());
  const guestAdjustAutoFinishRef = useRef(false);
  const guestNewSessionTimerRef = useRef(null);
  const guestSessionIdRef = useRef(0);
  const adminModalModeRef = useRef(adminModalMode);
  const adminPinRef = useRef(adminPin);
  const adminTapCountRef = useRef(0);
  const adminLastTapAtRef = useRef(0);

  adminModalModeRef.current = adminModalMode;
  adminPinRef.current = adminPin;

  const cacheKey = useMemo(
    () => createFrameCacheKey(selectedFrame?.name, frameDimensions.width, frameDimensions.height),
    [selectedFrame, frameDimensions],
  );

  const visibleFrameLibrary = useMemo(() => {
    const seen = new Set();
    return [...FRAME_LIBRARY, ...importedFrameLibrary].filter((frame) => {
      const key = `${frame.name}:${frame.width || ''}:${frame.height || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [importedFrameLibrary]);

  const recommendedFrames = useMemo(
    () => recommendFrames(visibleFrameLibrary, frameProfiles, guestSessionProfile, 5).map((item) => item.frame),
    [visibleFrameLibrary, frameProfiles, guestSessionProfile],
  );

  const recommendedFrameKeys = useMemo(
    () => new Set(recommendedFrames.map((frame) => getFrameLibraryKey(frame))),
    [recommendedFrames],
  );

  const guestFrameDisplayLibrary = useMemo(() => {
    const visibleFramesByKey = new Map(visibleFrameLibrary.map((frame) => [getFrameLibraryKey(frame), frame]));
    const pickedKeys = new Set();
    const orderedFrames = [];

    recommendedFrames.forEach((frame) => {
      const key = getFrameLibraryKey(frame);
      const visibleFrame = visibleFramesByKey.get(key);
      if (!visibleFrame || pickedKeys.has(key)) return;
      pickedKeys.add(key);
      orderedFrames.push(visibleFrame);
    });

    visibleFrameLibrary.forEach((frame) => {
      const key = getFrameLibraryKey(frame);
      if (pickedKeys.has(key)) return;
      pickedKeys.add(key);
      orderedFrames.push(frame);
    });

    return orderedFrames;
  }, [recommendedFrames, visibleFrameLibrary]);

  useEffect(() => {
    guestFramePreviewsRef.current = guestFramePreviews;
  }, [guestFramePreviews]);

  useEffect(() => () => {
    if (guestNewSessionTimerRef.current) {
      window.clearTimeout(guestNewSessionTimerRef.current);
      guestNewSessionTimerRef.current = null;
    }
  }, []);

  const clearGuestNewSessionTimer = () => {
    if (guestNewSessionTimerRef.current) {
      window.clearTimeout(guestNewSessionTimerRef.current);
      guestNewSessionTimerRef.current = null;
    }
  };

  const startGuestNewSessionCountdown = () => {
    clearGuestNewSessionTimer();
    guestNewSessionTimerRef.current = window.setTimeout(() => {
      guestNewSessionTimerRef.current = null;
      startGuestJourney();
    }, GUEST_AUTO_NEW_SESSION_SECONDS * 1000);
  };

  const startGuestNextSessionNow = () => {
    clearGuestNewSessionTimer();
    startGuestJourney();
  };

  const requestKioskFullscreen = useCallback(async () => {
    if (!isKioskGuardEnabled || typeof document === 'undefined') return false;
    if (document.fullscreenElement) {
      setIsKioskFullscreenActive(true);
      setKioskNeedsResume(false);
      return true;
    }

    const target = document.documentElement;
    if (!target?.requestFullscreen) return false;

    try {
      await target.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      try {
        await target.requestFullscreen();
      } catch {
        setKioskNeedsResume(true);
        return false;
      }
    }

    setIsKioskFullscreenActive(true);
    setKioskNeedsResume(false);
    return true;
  }, [isKioskGuardEnabled]);

  const exitKioskFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // Browser-level fullscreen can fail to exit in kiosk shells; the admin panel stays usable.
      }
    }
    setKioskNeedsResume(false);
  }, []);

  const openAdminUnlock = useCallback(() => {
    setAdminModalMode('unlock');
    setAdminPinEntry('');
    setAdminNewPinEntry('');
    setAdminNewPinConfirm('');
    setAdminPinError('');
    setKioskNeedsResume(false);
  }, []);

  const closeAdminModal = useCallback(() => {
    setAdminModalMode(null);
    setAdminPinEntry('');
    setAdminNewPinEntry('');
    setAdminNewPinConfirm('');
    setAdminPinError('');
  }, []);

  const handleAdminUnlock = useCallback((event) => {
    event.preventDefault();
    if (adminPinEntry.trim() !== adminPinRef.current) {
      setAdminPinError('PIN chưa đúng. Thử lại nha.');
      setAdminPinEntry('');
      return;
    }
    setAdminModalMode('panel');
    setAdminPinEntry('');
    setAdminPinError('');
  }, [adminPinEntry]);

  const handleShowChangePin = useCallback(() => {
    setAdminModalMode('pin');
    setAdminNewPinEntry('');
    setAdminNewPinConfirm('');
    setAdminPinError('');
  }, []);

  const handleSaveAdminPin = useCallback((event) => {
    event.preventDefault();
    const nextPin = adminNewPinEntry.trim();
    if (nextPin.length < 4) {
      setAdminPinError('PIN nên có ít nhất 4 ký tự.');
      return;
    }
    if (nextPin !== adminNewPinConfirm.trim()) {
      setAdminPinError('Hai lần nhập PIN chưa khớp.');
      return;
    }

    saveStoredAdminPin(nextPin);
    setAdminPin(nextPin);
    setAdminModalMode('panel');
    setAdminNewPinEntry('');
    setAdminNewPinConfirm('');
    setAdminPinError('');
  }, [adminNewPinConfirm, adminNewPinEntry]);

  const handleAdminRestartSession = useCallback(() => {
    closeAdminModal();
    startGuestNextSessionNow();
    requestKioskFullscreen();
  }, [closeAdminModal, requestKioskFullscreen, startGuestNextSessionNow]);

  const handleAdminReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleAdminExitKiosk = useCallback(async () => {
    const didExit = await callKioskControl('/exit');
    if (!didExit) {
      await exitKioskFullscreen();
      closeAdminModal();
    }
  }, [closeAdminModal, exitKioskFullscreen]);

  const handleAdminOpenEditor = useCallback(async () => {
    const didOpen = await callKioskControl('/open-editor');
    if (didOpen) return;
    window.location.assign(`${window.location.origin}${window.location.pathname}?mode=partner`);
  }, []);

  const handleAdminHotspotPointerDown = useCallback((event) => {
    if (!isKioskGuardEnabled) return;
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - adminLastTapAtRef.current > ADMIN_UNLOCK_CLICK_WINDOW_MS) {
      adminTapCountRef.current = 0;
    }
    adminLastTapAtRef.current = now;
    adminTapCountRef.current += 1;

    if (adminTapCountRef.current >= ADMIN_UNLOCK_CLICK_COUNT) {
      adminTapCountRef.current = 0;
      openAdminUnlock();
    }
  }, [isKioskGuardEnabled, openAdminUnlock]);

  useEffect(() => {
    if (!isKioskGuardEnabled) return undefined;

    const syncFullscreenState = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsKioskFullscreenActive(fullscreenActive);
      if (!fullscreenActive && !adminModalModeRef.current && latestGuestStepRef.current !== 'hero') {
        setKioskNeedsResume(true);
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, [isKioskGuardEnabled]);

  useEffect(() => {
    if (!isKioskGuardEnabled) return undefined;

    const stopEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    const handleKeyDown = (event) => {
      const isAdminCombo = event.ctrlKey && event.altKey && event.shiftKey && (event.key === 'F12' || event.code === 'F12');
      if (isAdminCombo) {
        stopEvent(event);
        openAdminUnlock();
        return;
      }

      if (adminModalModeRef.current) return;
      stopEvent(event);
    };

    const handleProtectedPointerEvent = (event) => {
      if (adminModalModeRef.current) return;
      stopEvent(event);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !adminModalModeRef.current) {
        window.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleProtectedPointerEvent, true);
    window.addEventListener('dragstart', handleProtectedPointerEvent, true);
    document.addEventListener('selectstart', handleProtectedPointerEvent, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleProtectedPointerEvent, true);
      window.removeEventListener('dragstart', handleProtectedPointerEvent, true);
      document.removeEventListener('selectstart', handleProtectedPointerEvent, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isKioskGuardEnabled, openAdminUnlock]);

  const framePreviewCards = useMemo(() => {
    const previewCardsByKey = new Map(guestFramePreviews.map((card) => [card.key, card]));
    return guestFrameDisplayLibrary.map((frame) => {
      const key = getFrameLibraryKey(frame);
      return previewCardsByKey.get(key) || {
        key,
        frame,
        previewUrl: frame.previewRenderUrl || frame.previewUrl || frame.url,
        isComposed: false,
        status: 'Đang chờ ghép thử',
      };
    });
  }, [guestFrameDisplayLibrary, guestFramePreviews]);

  const guestFramePageCount = Math.max(1, Math.ceil(framePreviewCards.length / GUEST_FRAME_PAGE_SIZE));
  const safeGuestFramePageIndex = Math.min(Math.max(guestFramePageIndex, 0), guestFramePageCount - 1);
  const guestFramePageStart = safeGuestFramePageIndex * GUEST_FRAME_PAGE_SIZE;
  const guestFramePageEnd = Math.min(framePreviewCards.length, guestFramePageStart + GUEST_FRAME_PAGE_SIZE);
  const pagedFramePreviewCards = useMemo(
    () => framePreviewCards.slice(guestFramePageStart, guestFramePageEnd),
    [framePreviewCards, guestFramePageEnd, guestFramePageStart],
  );

  useEffect(() => {
    if (guestFramePageIndex !== safeGuestFramePageIndex) {
      setGuestFramePageIndex(safeGuestFramePageIndex);
    }
  }, [guestFramePageIndex, safeGuestFramePageIndex]);

  const goToGuestFramePage = useCallback((nextPageIndex) => {
    setGuestFramePageIndex(Math.min(Math.max(nextPageIndex, 0), guestFramePageCount - 1));
  }, [guestFramePageCount]);

  const recommendedFrameCards = useMemo(() => {
    const cardsByKey = new Map(framePreviewCards.map((card) => [getFrameLibraryKey(card.frame), card]));
    const pickedKeys = new Set();
    const pickedCards = recommendedFrames.reduce((cards, frame) => {
      const card = cardsByKey.get(getFrameLibraryKey(frame));
      if (card) {
        if (pickedKeys.has(card.key)) return cards;
        pickedKeys.add(card.key);
        cards.push(card);
      }
      return cards;
    }, []);

    if (pickedCards.length >= 5) return pickedCards.slice(0, 5);

    const fallbackCards = framePreviewCards.filter((card) => !pickedKeys.has(card.key));
    return [...pickedCards, ...fallbackCards].slice(0, 5);
  }, [framePreviewCards, recommendedFrames]);

  const guestAutoPhotos = useMemo(
    () => guestAutoCaptureIndices
      .flatMap((captureIndex) => {
        const photo = capturedPhotos[captureIndex];
        return photo ? [{ captureIndex, photo }] : [];
      }),
    [guestAutoCaptureIndices, capturedPhotos],
  );
  const guestAutoCapturePhotoKey = useMemo(
    () => guestAutoCaptureIndices
      .map((captureIndex) => capturedPhotos[captureIndex]?.id || '')
      .filter(Boolean)
      .join('|'),
    [guestAutoCaptureIndices, capturedPhotos],
  );

  const maxGuestPhotos = GUEST_CAPTURE_TARGET;
  const minGuestPhotosToContinue = GUEST_CAPTURE_MIN_TO_CONTINUE;
  const getGuestStepIndex = (stepId) => GUEST_STEP_ORDER.indexOf(stepId);
  const commitGuestStep = (stepId) => {
    const stepIndex = getGuestStepIndex(stepId);
    if (stepIndex < 0) return;
    setGuestCommittedStepIndex((current) => Math.max(current, stepIndex));
  };
  const isGuestStepLocked = (stepId) => {
    const stepIndex = getGuestStepIndex(stepId);
    return stepIndex >= 0 && stepIndex <= guestCommittedStepIndex;
  };
  const openGuestTransitionPrompt = (stepId, payload = {}) => {
    setGuestNotice('');
    setGuestTimedWarningPopup(null);
    setGuestTransitionPrompt({ stepId, ...payload });
  };

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    capturePausedRef.current = guestTransitionPrompt?.stepId === 'capture';
  }, [guestTransitionPrompt]);

  useEffect(() => {
    capturedPhotosCountRef.current = capturedPhotos.length;
  }, [capturedPhotos.length]);

  useEffect(() => () => {
    stopReconnectionPolling();
    stopStreamTracks(cameraStreamRef.current);
    cameraStreamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadServerLibrary = async () => {
      const profiles = await loadFrameProfilesFromServer();
      if (!cancelled) setFrameProfiles(profiles);
      const data = await fetchJson('/api/frame-store/list');
      if (cancelled || !Array.isArray(data?.packages)) return;
      setImportedFrameLibrary((prev) => {
        const byKey = new Map(prev.map((frame) => [`${frame.name}:${frame.width || ''}:${frame.height || ''}`, frame]));
        data.packages.forEach((item) => {
          byKey.set(`${item.name}:${item.width || ''}:${item.height || ''}`, {
            id: `server-${item.id}`,
            name: item.name,
            url: `/api/frame-store/image/${item.id}`,
            type: item.type,
            source: 'server',
            width: item.width,
            height: item.height,
            slotCount: item.slotCount,
          });
        });
        return Array.from(byKey.values()).toSorted((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      });
      if (data.packages.length > 0) {
        setCacheStatus(`Đã nạp ${data.packages.length} khung chuẩn từ ổ đĩa`);
      }
    };
    loadServerLibrary();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedZoneId = useMemo(() => {
    if (!requestedSelectedZoneId) return null;
    return zones.some((zone) => zone.id === requestedSelectedZoneId)
      ? requestedSelectedZoneId
      : zones[0]?.id || null;
  }, [requestedSelectedZoneId, zones]);
  const selectedPhoto = selectedPhotoId ? photos.find((photo) => photo.id === selectedPhotoId) : null;
  const selectedZone = selectedZoneId ? zones.find((zone) => zone.id === selectedZoneId) : null;
  const requiredPhotoCount = zones.length;
  const isAnalyzingPhotos = photoAnalysisStatus.startsWith('Đang');
  const canUploadPhotos = originalFrame && requiredPhotoCount > 0 && !isAutoDetecting && !isAnalyzingPhotos;
  const canExport = !isPartnerMode && originalFrame && requiredPhotoCount > 0 && photos.length === requiredPhotoCount;

  const applyFrameToCanvas = useCallback(() => {
    const canvas = frameCanvasRef.current;
    if (!canvas || !originalImgRef.current || canvas.width === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImgRef.current, 0, 0);
  }, []);

  useEffect(() => {
    if (editingPoint || draggingZone || drawingZone) return undefined;
    const renderTimer = window.setTimeout(() => {
      applyFrameToCanvas();
    }, 120);
    return () => window.clearTimeout(renderTimer);
  }, [applyFrameToCanvas, originalFrame, frameDimensions, editingPoint, draggingZone, drawingZone]);

  useEffect(() => {
    if (cacheSaveTimerRef.current) window.clearTimeout(cacheSaveTimerRef.current);
    if (serverSaveTimerRef.current) window.clearTimeout(serverSaveTimerRef.current);
    if (editingPoint || draggingZone || drawingZone) return undefined;
      if (!cacheKey || skipNextCacheWriteRef.current) {
        skipNextCacheWriteRef.current = false;
        return undefined;
      }
    if (!originalFrame || frameDimensions.width === 0) return undefined;
    writeFrameCache(cacheKey, {
      zones: sortZonesNatural(zones),
      detectionMode,
    });
    if (zones.length > 0) setCacheStatus('Đã lưu cache slot');

    if (!selectedFrame || !originalImgRef.current || zones.length === 0) return undefined;

    serverSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = createSlotMapPayload({
          selectedFrame,
          frameDimensions,
          zones,
          detectionMode,
        });
        const saved = await saveSlotMapToServer(payload);
        if (!saved) return;
        if (selectedFrame.source !== 'server') {
          setCacheStatus(`Đã lưu ổ đĩa: ${saved.slotCount} slot`);
          return;
        }
        setImportedFrameLibrary((prev) => {
          const key = `${saved.name}:${saved.width || ''}:${saved.height || ''}`;
          const byKey = new Map(prev.map((frame) => [`${frame.name}:${frame.width || ''}:${frame.height || ''}`, frame]));
          byKey.set(key, {
            id: `server-${saved.id}`,
            name: saved.name,
            url: `/api/frame-store/image/${saved.id}`,
            type: saved.type,
            source: 'server',
            width: saved.width,
            height: saved.height,
            slotCount: saved.slotCount,
          });
          return Array.from(byKey.values()).toSorted((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        });
        setCacheStatus(`Đã lưu ổ đĩa: ${saved.slotCount} slot`);
      } catch (error) {
        console.warn('Không thể lưu cấu hình khung xuống ổ đĩa:', error);
      }
    }, 2200);
    return undefined;
  }, [zones, detectionMode, cacheKey, originalFrame, frameDimensions, selectedFrame, editingPoint, draggingZone, drawingZone]);

  const runAutoDetect = useCallback((imgObj, nextCacheKey = cacheKey) => {
    setIsAutoDetecting(true);
    window.setTimeout(() => {
      try {
        const result = detectFrameSlots(imgObj);
        skipNextCacheWriteRef.current = false;
        const normalizedZones = sortZonesNatural(result.zones);
        setZones(normalizedZones);
        setSelectedZoneId(normalizedZones[0]?.id || null);
        setSlotEditTool('select');
        setDetectionMode(result.detectionMode);
        setPhotos([]);
        setSelectedPhotoId(null);
        setSlotAssignments([]);
        setUploadError('');
        setInteractionMode(isPartnerMode ? 'cut' : normalizedZones.length > 0 ? 'move' : 'cut');
        setCacheStatus(normalizedZones.length > 0 ? `Đã nhận ${normalizedZones.length} slot trong suốt` : 'Chưa thấy slot trong suốt, hãy dùng PNG có lỗ alpha hoặc vẽ thủ công');
        setPhotoAnalysisStatus(normalizedZones.length > 0 ? `Khung này có ${normalizedZones.length} slot, vui lòng tải đúng ${normalizedZones.length} ảnh` : 'Cần vẽ slot trước khi tải ảnh');
        if (nextCacheKey) {
          writeFrameCache(nextCacheKey, { ...result, zones: normalizedZones });
        }
      } catch (error) {
        console.error('Lỗi khi quét slot trong suốt:', error);
        setInteractionMode('cut');
        setCacheStatus('Có lỗi khi quét, hãy vẽ slot thủ công');
      } finally {
        setIsAutoDetecting(false);
      }
    }, 80);
  }, [cacheKey, isPartnerMode]);

  const loadFrame = useCallback(async ({
    url,
    previewUrl,
    overlayUrl,
    sourceUrl,
    name,
    type,
    source = 'library',
    slotCount,
  }) => {
    setIsAutoDetecting(true);
    setCacheStatus('Đang tải khung…');
    try {
      const displayUrl = previewUrl || url;
      const renderUrl = overlayUrl || url;
      const img = await loadImage(renderUrl);
      const loadedDimensions = { width: img.naturalWidth, height: img.naturalHeight };
      const nextFrame = {
        url: displayUrl,
        previewUrl: displayUrl,
        overlayUrl: renderUrl,
        sourceUrl,
        name,
        type,
        source,
        width: img.naturalWidth,
        height: img.naturalHeight,
        slotCount,
      };
      const nextCacheKey = createFrameCacheKey(name, img.naturalWidth, img.naturalHeight);

      originalImgRef.current = img;
      lastLoadedFrameKeyRef.current = nextCacheKey;
      skipNextCacheWriteRef.current = false;
      setSelectedFrame(nextFrame);
      setOriginalFrame(renderUrl);
      setFrameDimensions(loadedDimensions);
      setZones([]);
      setSelectedZoneId(null);
      setSlotEditTool('select');
      setDetectionMode('none');
      setPhotos([]);
      setSelectedPhotoId(null);
      setSlotAssignments([]);
      setUploadError('');
      setEditorZoom(1);
      setPhotoAnalysisStatus('Đang chuẩn bị slot…');

      if (frameCanvasRef.current) {
        frameCanvasRef.current.width = img.naturalWidth;
        frameCanvasRef.current.height = img.naturalHeight;
      }

      runAutoDetect(img, nextCacheKey);
      return {
        frame: nextFrame,
        originalImage: img,
        originalFrame: renderUrl,
        frameDimensions: loadedDimensions,
        zones: [],
        detectionMode: 'none',
      };
    } catch (error) {
      console.error('Không tải được khung:', error);
      setIsAutoDetecting(false);
      setCacheStatus('Không tải được khung ảnh');
      alert('File khung không hợp lệ hoặc bị lỗi.');
      return null;
    }
  }, [runAutoDetect, isPartnerMode]);

  const handleFrameUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadFrame({
      url,
      name: file.name,
      type: file.type.includes('png') ? 'png' : 'jpg',
      source: 'upload',
    });
  };

  const handleClearCache = () => {
    clearFrameCache(cacheKey || lastLoadedFrameKeyRef.current);
    setCacheStatus('Đã xóa cache khung này');
  };

  const handleClearCacheAndRedetect = () => {
    handleClearCache();
    if (originalImgRef.current) {
      runAutoDetect(originalImgRef.current, cacheKey);
    }
  };

  const handleFramePackageExport = async () => {
    if (!selectedFrame || frameDimensions.width === 0 || zones.length === 0 || !originalImgRef.current) {
      alert('Vui lòng chọn khung và chỉnh ít nhất một slot trước khi xuất gói khung.');
      return;
    }

    try {
      const payload = createFramePackagePayload({
        selectedFrame,
        frameDimensions,
        zones,
        detectionMode,
        frameImage: originalImgRef.current,
      });
      downloadJsonPayload(payload, sanitizeFramePackageFileName(selectedFrame.name));
      const saved = await saveFramePackageToServer(payload);
      setCacheStatus(
        saved
          ? `Đã xuất và lưu gói JSON có ảnh khung (${payload.slotMap.slotCount} slot)`
          : `Đã xuất gói JSON có ảnh khung (${payload.slotMap.slotCount} slot)`,
      );
    } catch (error) {
      console.error('Không thể xuất gói khung:', error);
      alert('Không thể xuất gói khung. Hãy thử tải lại khung rồi xuất lại.');
    }
  };

  const loadFramePackage = async ({ frame, slotMap, fileName }) => {
    setIsAutoDetecting(true);
    setCacheStatus('Đang nhập gói khung…');
    try {
      const img = await loadImage(frame.dataUrl);
      if (img.naturalWidth !== slotMap.frameWidth || img.naturalHeight !== slotMap.frameHeight) {
        throw new Error('Kích thước ảnh khung không khớp dữ liệu slot.');
      }

      const normalizedZones = sortZonesNatural(slotMap.zones);
      const nextFrame = {
        url: frame.dataUrl,
        name: slotMap.frameName || frame.name,
        type: frame.type || slotMap.frameType || 'jpg',
        source: 'package',
      };
      const nextCacheKey = createFrameCacheKey(nextFrame.name, img.naturalWidth, img.naturalHeight);

      originalImgRef.current = img;
      lastLoadedFrameKeyRef.current = nextCacheKey;
      skipNextCacheWriteRef.current = false;
      setSelectedFrame(nextFrame);
      setOriginalFrame(frame.dataUrl);
      setFrameDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setZones(normalizedZones);
      setSelectedZoneId(normalizedZones[0]?.id || null);
      setSlotEditTool('select');
      setDetectionMode(slotMap.detectionMode);
      setPhotos([]);
      setSelectedPhotoId(null);
      setSlotAssignments([]);
      setUploadError('');
      setEditorZoom(1);
      setInteractionMode('cut');
      setPhotoAnalysisStatus(`Đã nhập ${normalizedZones.length} slot, vui lòng tải đúng ${normalizedZones.length} ảnh`);

      if (frameCanvasRef.current) {
        frameCanvasRef.current.width = img.naturalWidth;
        frameCanvasRef.current.height = img.naturalHeight;
      }

      writeFrameCache(nextCacheKey, {
        zones: normalizedZones,
        detectionMode: slotMap.detectionMode,
        importedFrom: fileName,
        schema: FRAME_PACKAGE_SCHEMA,
      });
      setCacheStatus(`Đã nhập gói khung ${fileName}: ${normalizedZones.length} slot`);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSlotDataImport = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    let importedCount = 0;
    let failedCount = 0;
    let activeSlotMap = null;
    let activeFramePackage = null;
    let legacySlotMapToOpen = null;
    const importedFrameItems = [];

    const importResults = await Promise.all(files.map(async (file) => {
      try {
        const payload = JSON.parse(await file.text());
        if (payload.schema === FRAME_PACKAGE_SCHEMA) {
          const { framePackage, error } = validateFramePackagePayload(payload);
          if (error) throw new Error(error);

          const { slotMap, frame } = framePackage;
          const nextCacheKey = createFrameCacheKey(
            slotMap.frameName,
            slotMap.frameWidth,
            slotMap.frameHeight,
          );
          writeFrameCache(nextCacheKey, {
            zones: slotMap.zones,
            detectionMode: slotMap.detectionMode,
            importedFrom: file.name,
            schema: FRAME_PACKAGE_SCHEMA,
          });
          await saveFramePackageToServer(payload);
          return {
            status: 'imported',
            kind: 'package',
            frameItem: {
              id: `package-${slotMap.frameName}-${file.lastModified || Date.now()}`,
              name: slotMap.frameName,
              url: frame.dataUrl,
              type: frame.type || slotMap.frameType || 'jpg',
              source: 'package',
              width: slotMap.frameWidth,
              height: slotMap.frameHeight,
            },
            framePackage: { ...framePackage, fileName: file.name },
          };
        }

        const { slotMap, error } = validateSlotMapPayload(payload);
        if (error) throw new Error(error);

        const nextCacheKey = createFrameCacheKey(slotMap.frameName, slotMap.frameWidth, slotMap.frameHeight);
        writeFrameCache(nextCacheKey, {
          zones: slotMap.zones,
          detectionMode: slotMap.detectionMode,
          importedFrom: file.name,
          schema: SLOT_MAP_SCHEMA,
        });
        await saveSlotMapToServer({
          schema: SLOT_MAP_SCHEMA,
          frameName: slotMap.frameName,
          frameWidth: slotMap.frameWidth,
          frameHeight: slotMap.frameHeight,
          frameType: slotMap.frameType,
          slotCount: slotMap.zones.length,
          detectionMode: slotMap.detectionMode,
          zones: slotMap.zones.map((zone) => ({
            slotIndex: zone.slotIndex,
            shape: zone.shape || 'polygon',
            detectionMode: zone.detectionMode || slotMap.detectionMode,
            points: rectToPoints(zone).map((point) => ({
              x: roundSlotCoord(point.x),
              y: roundSlotCoord(point.y),
            })),
          })),
          exportedAt: new Date().toISOString(),
        });
        return {
          status: 'imported',
          kind: 'slotMap',
          slotMap,
          isActiveSlotMap: Boolean(nextCacheKey && nextCacheKey === cacheKey),
        };
      } catch (error) {
        failedCount += 1;
        console.warn(`Không nhập được dữ liệu slot từ ${file.name}:`, error);
      }
    }));

    for (const result of importResults) {
      if (!result) continue;

      importedCount += 1;
      if (result.kind === 'package') {
        importedFrameItems.push(result.frameItem);
        activeFramePackage = result.framePackage;
      } else if (result.isActiveSlotMap) {
        activeSlotMap = result.slotMap;
      } else {
        legacySlotMapToOpen = result.slotMap;
      }
    }

    if (importedFrameItems.length > 0) {
      setImportedFrameLibrary((prev) => {
        const byKey = new Map(prev.map((frame) => [`${frame.name}:${frame.width || ''}:${frame.height || ''}`, frame]));
        importedFrameItems.forEach((frame) => {
          byKey.set(`${frame.name}:${frame.width || ''}:${frame.height || ''}`, frame);
        });
        return Array.from(byKey.values()).toSorted((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      });
    }

    if (activeFramePackage) {
      try {
        await loadFramePackage(activeFramePackage);
        const failedText = failedCount > 0 ? `, ${failedCount} file lỗi` : '';
        setCacheStatus(`Đã nhập ${importedCount} file JSON${failedText}. Đang mở ${activeFramePackage.fileName}.`);
      } catch (error) {
        failedCount += 1;
        console.warn(`Không mở được gói khung ${activeFramePackage.fileName}:`, error);
        setCacheStatus(`Đã nhập ${importedCount} file nhưng không mở được gói khung đang chọn.`);
        alert('Không mở được gói khung. File có thể bị hỏng hoặc ảnh khung bên trong không hợp lệ.');
      }
      return;
    }

    if (!activeSlotMap && legacySlotMapToOpen) {
      const matchingFrame = visibleFrameLibrary.find((frame) => {
        if (frame.name !== legacySlotMapToOpen.frameName) return false;
        const hasKnownSize = Number.isFinite(frame.width) && Number.isFinite(frame.height);
        return !hasKnownSize || (
          Math.round(frame.width) === legacySlotMapToOpen.frameWidth &&
          Math.round(frame.height) === legacySlotMapToOpen.frameHeight
        );
      });

      if (matchingFrame) {
        await loadFrame(matchingFrame);
        const failedText = failedCount > 0 ? `, ${failedCount} file lỗi` : '';
        setCacheStatus(`Đã nhập ${importedCount} file JSON${failedText}. Đã mở khung trùng với dữ liệu slot cũ.`);
        return;
      }
    }

    if (activeSlotMap) {
      skipNextCacheWriteRef.current = false;
      setZones(activeSlotMap.zones);
      setSelectedZoneId(activeSlotMap.zones[0]?.id || null);
      setSlotEditTool('select');
      setDetectionMode(activeSlotMap.detectionMode);
      setPhotos([]);
      setSelectedPhotoId(null);
      setSlotAssignments([]);
      setUploadError('');
      setInteractionMode('cut');
      setPhotoAnalysisStatus(`Đã nhập ${activeSlotMap.zones.length} slot, vui lòng tải lại đúng số ảnh`);
    }

    const activeText = activeSlotMap ? ` Khung đang mở đã cập nhật ${activeSlotMap.zones.length} slot.` : '';
    const legacyText = legacySlotMapToOpen && !activeSlotMap
      ? ' File slot cũ không kèm ảnh khung; hãy nhập gói JSON mới hoặc upload/chọn đúng ảnh khung rồi nhập lại.'
      : '';
    const failedText = failedCount > 0 ? `, ${failedCount} file lỗi` : '';
    setCacheStatus(`Đã nhập ${importedCount} file dữ liệu slot${failedText}.${activeText}${legacyText}`);
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setUploadError('');

    if (requiredPhotoCount === 0) {
      setUploadError('Khung này chưa có slot. Hãy quét lại hoặc vẽ slot trước.');
      return;
    }

    if (files.length !== requiredPhotoCount) {
      setUploadError(`Khung này có ${requiredPhotoCount} slot, bạn cần tải đúng ${requiredPhotoCount} ảnh. Hiện bạn chọn ${files.length} ảnh.`);
      return;
    }

    setPhotoAnalysisStatus('Đang ghép ảnh vào slot trong suốt…');
    setSlotAssignments([]);
    setSelectedPhotoId(null);

    try {
      const normalizedZones = sortZonesNatural(zones);
      const photoResults = await Promise.all(files.map(async (file, index) => {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        const newId = Math.random().toString(36).slice(2, 11);
        const assignedZone = normalizedZones[index];
        const placement = fitPhotoToSlot(img, assignedZone);
        const subject = placement.subject;

        return {
          photo: {
            id: newId,
            name: file.name,
            url,
            x: placement.x,
            y: placement.y,
            scale: placement.scale,
            rotation: placement.rotation,
            fitMode: placement.fitMode,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            slotIndex: index,
            subject: placement.subject,
          },
          assignment: {
            slotIndex: index,
            photoId: newId,
            method: subject.method,
            faceCount: subject.faceCount,
          },
        };
      }));
      const nextPhotos = photoResults.map((result) => result.photo);
      const nextAssignments = photoResults.map((result) => result.assignment);

      setZones(normalizedZones);
      setPhotos(nextPhotos);
      setSlotAssignments(nextAssignments);
      setSelectedPhotoId(nextPhotos[0]?.id || null);
      setInteractionMode('move');
      setPhotoAnalysisStatus('Đã căn ảnh phủ kín slot trong suốt');
    } catch (error) {
      console.error('Không thể phân tích ảnh khách:', error);
      setUploadError('Có ảnh không đọc được hoặc phân tích thất bại. Hãy thử chọn lại ảnh.');
      setPhotoAnalysisStatus('Phân tích ảnh thất bại');
    }
  };

  const getCanvasCoordinates = (event) => {
    const rect = editorRef.current.getBoundingClientRect();
    const scaleX = frameDimensions.width / rect.width;
    const scaleY = frameDimensions.height / rect.height;
    return {
      clickX: Math.max(0, Math.min(frameDimensions.width, Math.floor((event.clientX - rect.left) * scaleX))),
      clickY: Math.max(0, Math.min(frameDimensions.height, Math.floor((event.clientY - rect.top) * scaleY))),
    };
  };

  const clampCanvasPoint = (point) => ({
    x: clampValue(point.x, 0, frameDimensions.width),
    y: clampValue(point.y, 0, frameDimensions.height),
  });

  const moveZoneBy = (zoneId, dx, dy) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const points = rectToPoints(zone);
        const minX = Math.min(...points.map((point) => point.x));
        const maxX = Math.max(...points.map((point) => point.x));
        const minY = Math.min(...points.map((point) => point.y));
        const maxY = Math.max(...points.map((point) => point.y));
        const safeDx = clampValue(dx, -minX, frameDimensions.width - maxX);
        const safeDy = clampValue(dy, -minY, frameDimensions.height - maxY);
        const nextPoints = points.map((point) => ({ x: point.x + safeDx, y: point.y + safeDy }));
        return normalizeZone({ ...zone, points: nextPoints }, zone.slotIndex);
      }),
    );
  };

  const resizeZoneBy = (zoneId, delta) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const points = rectToPoints(zone);
        const center = points.reduce(
          (acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }),
          { x: 0, y: 0 },
        );
        const shortestSide = Math.max(1, Math.min(zone.width, zone.height));
        const factor = Math.max(0.55, 1 + delta / shortestSide);
        const nextPoints = points.map((point) =>
          clampCanvasPoint({
            x: center.x + (point.x - center.x) * factor,
            y: center.y + (point.y - center.y) * factor,
          }),
        );
        return normalizeZone({ ...zone, points: nextPoints }, zone.slotIndex);
      }),
    );
    setCacheStatus('Đã cập nhật vùng slot');
    setPhotoAnalysisStatus('Slot đã thay đổi, có thể chỉnh lại vị trí ảnh nếu cần');
  };

  const nudgeSelectedZone = (dx, dy) => {
    if (!selectedZoneId) return;
    moveZoneBy(selectedZoneId, dx, dy);
    setCacheStatus('Đã cập nhật vùng slot');
    setPhotoAnalysisStatus('Slot đã thay đổi, có thể chỉnh lại vị trí ảnh nếu cần');
  };

  const updateZonePoint = (zoneId, pointIndex, nextPoint) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const points = rectToPoints(zone).map((point, index) =>
          index === pointIndex ? clampCanvasPoint(nextPoint) : point,
        );
        return normalizeZone({ ...zone, points }, zone.slotIndex);
      }),
    );
  };

  const insertZonePoint = (zoneId, afterIndex, nextPoint) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const points = rectToPoints(zone);
        const insertIndex = afterIndex + 1;
        const nextPoints = [
          ...points.slice(0, insertIndex),
          nextPoint,
          ...points.slice(insertIndex),
        ];
        return normalizeZone({ ...zone, points: nextPoints }, zone.slotIndex);
      }),
    );
    setSelectedZoneId(zoneId);
    setEditingPoint({ zoneId, pointIndex: afterIndex + 1 });
  };

  const removeZonePoint = (zoneId, pointIndex) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const points = rectToPoints(zone);
        if (points.length <= 4) return zone;
        const nextPoints = points.filter((_, index) => index !== pointIndex);
        return normalizeZone({ ...zone, points: nextPoints }, zone.slotIndex);
      }),
    );
    setSelectedZoneId(zoneId);
    setCacheStatus('Đã cập nhật điểm slot');
  };

  const finishSlotPointEdit = () => {
    setEditingPoint(null);
    setDraggingZone(null);
    setCacheStatus('Đã cập nhật vùng slot');
    setPhotoAnalysisStatus('Slot đã thay đổi, có thể chỉnh lại vị trí ảnh nếu cần');
  };

  const handleZonePointPointerDown = (event, zoneId, pointIndex) => {
    if (interactionMode !== 'cut') return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedZoneId(zoneId);
    setSlotEditTool('select');
    setEditingPoint({ zoneId, pointIndex });
  };

  const handleEdgeHandlePointerDown = (event, zoneId, pointIndex) => {
    if (interactionMode !== 'cut') return;
    event.preventDefault();
    event.stopPropagation();
    const coords = getCanvasCoordinates(event);
    setSlotEditTool('select');
    insertZonePoint(zoneId, pointIndex, { x: coords.clickX, y: coords.clickY });
  };

  const handleZoneBodyPointerDown = (event, zoneId) => {
    if (interactionMode !== 'cut' || slotEditTool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    const coords = getCanvasCoordinates(event);
    const zone = zones.find((item) => item.id === zoneId);
    if (!zone) return;
    setSelectedZoneId(zoneId);
    setDraggingZone({
      zoneId,
      startX: coords.clickX,
      startY: coords.clickY,
      originalPoints: rectToPoints(zone),
    });
  };

  const handleEditorPointerDown = (event) => {
    if (!originalFrame || interactionMode !== 'cut') return;
    if (editingPoint || draggingZone) return;
    if (slotEditTool !== 'draw') {
      setSelectedZoneId(null);
      return;
    }
    const coords = getCanvasCoordinates(event);
    setDrawingZone({ startX: coords.clickX, startY: coords.clickY, currentX: coords.clickX, currentY: coords.clickY });
  };

  const handleEditorPointerMove = (event) => {
    if (!originalFrame || interactionMode !== 'cut') return;
    const coords = getCanvasCoordinates(event);
    if (editingPoint) {
      updateZonePoint(editingPoint.zoneId, editingPoint.pointIndex, { x: coords.clickX, y: coords.clickY });
      return;
    }
    if (draggingZone) {
      const dx = coords.clickX - draggingZone.startX;
      const dy = coords.clickY - draggingZone.startY;
      setZones((prev) =>
        prev.map((zone) => {
          if (zone.id !== draggingZone.zoneId) return zone;
          const minX = Math.min(...draggingZone.originalPoints.map((point) => point.x));
          const maxX = Math.max(...draggingZone.originalPoints.map((point) => point.x));
          const minY = Math.min(...draggingZone.originalPoints.map((point) => point.y));
          const maxY = Math.max(...draggingZone.originalPoints.map((point) => point.y));
          const safeDx = clampValue(dx, -minX, frameDimensions.width - maxX);
          const safeDy = clampValue(dy, -minY, frameDimensions.height - maxY);
          const nextPoints = draggingZone.originalPoints.map((point) => ({ x: point.x + safeDx, y: point.y + safeDy }));
          return normalizeZone({ ...zone, points: nextPoints }, zone.slotIndex);
        }),
      );
      return;
    }
    if (!drawingZone) return;
    setDrawingZone((prev) => ({ ...prev, currentX: coords.clickX, currentY: coords.clickY }));
  };

  const handleEditorPointerUp = () => {
    if (editingPoint || draggingZone) {
      finishSlotPointEdit();
      return;
    }
    if (interactionMode !== 'cut' || !drawingZone) return;
    const x = Math.min(drawingZone.startX, drawingZone.currentX);
    const y = Math.min(drawingZone.startY, drawingZone.currentY);
    const width = Math.abs(drawingZone.currentX - drawingZone.startX);
    const height = Math.abs(drawingZone.currentY - drawingZone.startY);
    if (width > 20 && height > 20) {
      const manualZone = normalizeZone({
        id: `manual-${Date.now()}`,
        x,
        y,
        width,
        height,
        points: [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ],
        detectionMode: 'target',
        shape: 'polygon',
      }, zones.length);
      setZones((prev) => [
        ...prev,
        manualZone,
      ]);
      setSelectedZoneId(manualZone.id);
      setSlotEditTool('select');
      setDetectionMode('target');
      setCacheStatus('Đã lưu slot thủ công');
      setPhotos([]);
      setSelectedPhotoId(null);
      setSlotAssignments([]);
      setPhotoAnalysisStatus('Slot đã thay đổi, vui lòng tải lại đúng số ảnh');
    }
    setDrawingZone(null);
  };

  const removeZone = (id) => {
    setZones((prev) => sortZonesNatural(prev.filter((zone) => zone.id !== id)));
    if (selectedZoneId === id) setSelectedZoneId(null);
    setCacheStatus('Đã cập nhật cache slot');
    setPhotos([]);
    setSelectedPhotoId(null);
    setSlotAssignments([]);
    setPhotoAnalysisStatus('Slot đã thay đổi, vui lòng tải lại đúng số ảnh');
  };

  const duplicatePhoto = (id) => {
    const photo = photos.find((item) => item.id === id);
    if (photo) {
      setPhotos((prev) => [...prev, { ...photo, id: Math.random().toString(36).slice(2, 11), y: photo.y + 80 }]);
    }
  };

  const removePhoto = (id) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    setSlotAssignments((prev) => prev.filter((assignment) => assignment.photoId !== id));
    if (selectedPhotoId === id) setSelectedPhotoId(null);
  };

  const updatePhoto = (id, updates) => {
    setPhotos((prev) => prev.map((photo) => (photo.id === id ? { ...photo, ...updates } : photo)));
  };

  const handlePhotoPointerDown = (event, id) => {
    if (interactionMode !== 'move') return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedPhotoId(id);
    setIsDraggingPhoto(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const handleAdjustPointerMove = (event) => {
      if (!adjustDrag) return;
      const deltaX = event.clientX - adjustDrag.startX;
      const deltaY = event.clientY - adjustDrag.startY;
      const zone = zones[adjustDrag.slotIndex];
      if (!zone) return;
      const selector = adjustDrag.source === 'zoom' ? '.pink-adjust-zoom-preview' : '.pink-adjust-frame-preview';
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      const ratio = rect ? (adjustDrag.source === 'zoom' ? zone.width / rect.width : frameDimensions.width / rect.width) : 1;
      const edit = slotEdits.find((item) => item.slotIndex === adjustDrag.slotIndex);
      if (!edit) return;
      updateSlotEdit(adjustDrag.slotIndex, { x: edit.x + deltaX * ratio, y: edit.y + deltaY * ratio });
      setAdjustDrag((prev) => prev ? { ...prev, startX: event.clientX, startY: event.clientY } : prev);
    };
    const handleAdjustPointerUp = () => setAdjustDrag(null);
    if (adjustDrag) {
      window.addEventListener('pointermove', handleAdjustPointerMove);
      window.addEventListener('pointerup', handleAdjustPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleAdjustPointerMove);
      window.removeEventListener('pointerup', handleAdjustPointerUp);
    };
  }, [adjustDrag, slotEdits, zones, frameDimensions.width]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!isDraggingPhoto || !selectedPhotoId || interactionMode !== 'move') return;
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      const rect = editorRef.current?.getBoundingClientRect();
      const ratio = rect ? frameDimensions.width / rect.width : 1;
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === selectedPhotoId
            ? { ...photo, x: photo.x + deltaX * ratio, y: photo.y + deltaY * ratio }
            : photo,
        ),
      );
      setDragStart({ x: event.clientX, y: event.clientY });
    };

    const handlePointerUp = () => setIsDraggingPhoto(false);
    if (isDraggingPhoto) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingPhoto, dragStart, selectedPhotoId, interactionMode, frameDimensions.width]);

  const handleExport = async () => {
    if (!canExport) {
      alert(`Vui lòng chọn khung và tải đúng ${requiredPhotoCount} ảnh trước khi xuất.`);
      return;
    }
    applyFrameToCanvas();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = frameDimensions.width;
    canvas.height = frameDimensions.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadedPhotos = await Promise.all(photos.map(async (photo) => ({
      photo,
      img: await loadImage(photo.url),
    })));
    const normalizedZones = sortZonesNatural(zones);

    for (const { photo, img } of loadedPhotos) {
      const assignedZone = getPhotoZone(photo, normalizedZones);
      drawImageIntoTransparentSlot(ctx, img, photo, assignedZone);
    }

    ctx.drawImage(frameCanvasRef.current, 0, 0);

    const link = document.createElement('a');
    link.download = `${selectedFrame?.name?.replace(/\.[^.]+$/, '') || 'my-photobooth'}-final.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const captureRawGuestVideoCanvas = (video) => {
    if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const captureRawGuestVideoFrame = (video) => {
    const canvas = captureRawGuestVideoCanvas(video);
    if (!canvas || isProbablyBlankCanvas(canvas)) return null;
    return canvas.toDataURL('image/png');
  };

  const waitForReadableGuestVideoFrame = async (video, timeoutMs = 2500) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const canvas = captureRawGuestVideoCanvas(video);
      if (canvas && !isProbablyBlankCanvas(canvas)) {
        return canvas;
      }
      await wait(120);
    }
    return null;
  };

  const renderFrameOverlayCanvas = (zonesForRender) => {
    if (!originalImgRef.current || frameDimensions.width === 0 || frameDimensions.height === 0) return null;
    return createFrameOverlayCanvasFromImage(originalImgRef.current, frameDimensions);
  };

  const getFramePreviewSlotMap = async (frame, dimensions, providedFrameImage = null) => {
    try {
      const frameImage = providedFrameImage || await loadImage(frame.overlayRenderUrl || frame.overlayUrl || frame.previewRenderUrl || frame.previewUrl || frame.url);
      const detectDimensions = {
        width: frameImage.naturalWidth || dimensions.width,
        height: frameImage.naturalHeight || dimensions.height,
      };
      const detected = detectFrameSlots(frameImage);
      const normalizedZones = sortZonesNatural(scaleZonesToDimensions(detected.zones, detectDimensions, dimensions));

      if (normalizedZones.length > 0) {
        const detectedSlotMap = {
          zones: normalizedZones,
          detectionMode: detected.detectionMode || 'alpha',
        };
        writeFrameCache(createFrameCacheKey(frame.name, dimensions.width, dimensions.height), detectedSlotMap);
        return {
          zones: normalizedZones,
          detectionMode: detectedSlotMap.detectionMode,
        };
      }
    } catch (error) {
      console.warn('Không thể tự dò slot cho khung:', frame.name, error);
    }

    return { zones: [] };
  };

  const getGuestPreviewPhotoItem = async (captureIndex) => {
    const photo = capturedPhotos[captureIndex];
    if (!photo) return null;

    const cached = guestPreviewPhotoCacheRef.current.get(photo.id);
    if (cached?.url === photo.url) {
      return { ...cached, captureIndex, photo };
    }

    const img = await loadImage(photo.url);
    const item = { captureIndex, photo, img, subject: createSlotFitSubject(img), url: photo.url };
    guestPreviewPhotoCacheRef.current.set(photo.id, item);

    if (guestPreviewPhotoCacheRef.current.size > GUEST_CAPTURE_TARGET) {
      const validIds = new Set(capturedPhotos.map((itemPhoto) => itemPhoto.id));
      for (const key of guestPreviewPhotoCacheRef.current.keys()) {
        if (!validIds.has(key)) guestPreviewPhotoCacheRef.current.delete(key);
      }
    }

    return item;
  };

  const getGuestPreviewFrameAssets = async (frame) => {
    const renderUrl = frame.overlayRenderUrl || frame.overlayUrl || frame.previewRenderUrl || frame.previewUrl || frame.url;
    const cacheKey = `${getFrameLibraryKey(frame)}:${renderUrl}`;
    const cached = guestPreviewFrameCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const frameImage = await loadImage(renderUrl);
    const dimensions = { width: frameImage.naturalWidth, height: frameImage.naturalHeight };
    const { zones: previewZones } = await getFramePreviewSlotMap(frame, dimensions, frameImage);
    if (!previewZones.length) throw new Error('Frame has no slots');

    const overlayCanvas = createFrameOverlayCanvasFromImage(frameImage, dimensions);
    const assets = { frameImage, dimensions, previewZones, overlayCanvas };
    guestPreviewFrameCacheRef.current.set(cacheKey, assets);

    if (guestPreviewFrameCacheRef.current.size > 72) {
      const oldestKey = guestPreviewFrameCacheRef.current.keys().next().value;
      if (oldestKey) guestPreviewFrameCacheRef.current.delete(oldestKey);
    }

    return assets;
  };

  const renderGuestFramePreview = async (frame, photoItems, { maxLongSide = 920 } = {}) => {
    const { dimensions, previewZones, overlayCanvas } = await getGuestPreviewFrameAssets(frame);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    previewZones.forEach((zone, index) => {
      const photoItem = photoItems[index];
      if (!photoItem) return;
      const placement = fitPhotoToSlot(photoItem.img, zone);
      drawImageIntoTransparentSlot(ctx, photoItem.img, placement, zone);
    });

    ctx.drawImage(overlayCanvas, 0, 0);

    return {
      key: getFrameLibraryKey(frame),
      frame,
      previewUrl: canvasToPreviewDataUrl(canvas, maxLongSide),
      isComposed: true,
      status: `${previewZones.length} slot`,
    };
  };

  const getGuestOutputBounds = (overlayCanvas, zonesForRender) => {
    const width = overlayCanvas.width;
    const height = overlayCanvas.height;
    const ctx = overlayCanvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    const includePoint = (x, y) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        if (a < 24) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const isNearWhite = r > 244 && g > 244 && b > 244;
        if (!isNearWhite) includePoint(x, y);
      }
    }

    zonesForRender.forEach((zone) => {
      rectToPoints(zone).forEach((point) => includePoint(point.x, point.y));
    });

    if (minX >= maxX || minY >= maxY) {
      return { x: 0, y: 0, width, height };
    }

    const padding = Math.max(16, Math.round(Math.min(width, height) * 0.035));
    const x = clampValue(Math.floor(minX - padding), 0, width - 1);
    const y = clampValue(Math.floor(minY - padding), 0, height - 1);
    const right = clampValue(Math.ceil(maxX + padding), 1, width);
    const bottom = clampValue(Math.ceil(maxY + padding), 1, height);

    return {
      x,
      y,
      width: Math.max(1, right - x),
      height: Math.max(1, bottom - y),
    };
  };

  const cropCanvasToBounds = (sourceCanvas, bounds) => {
    if (!bounds || bounds.width >= sourceCanvas.width * 0.985 && bounds.height >= sourceCanvas.height * 0.985) {
      return sourceCanvas;
    }
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      sourceCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    return canvas;
  };

  const scrollToGuestStep = (stepId) => {
    window.setTimeout(() => {
      document.getElementById(`guest-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const getStepRemainingSeconds = (stepId) => {
    if (stepId === 'capture') {
      return latestGuestStepRef.current === 'capture' || latestIsLockedCaptureRunningRef.current
        ? latestCaptureSessionSecondsLeftRef.current
        : latestGuestStepBudgetsRef.current.capture;
    }
    if (latestGuestStepRef.current === stepId) {
      return latestGuestTimedStepSecondsLeftRef.current;
    }
    return latestGuestStepBudgetsRef.current[stepId] || 0;
  };

  const handleCarryOverSurplus = (fromStep) => {
    if (!GUEST_TOTAL_TIMER_STEPS.includes(fromStep)) return;

    const surplus = getStepRemainingSeconds(fromStep);
    if (surplus <= 0) return;

    const fromIndex = GUEST_TOTAL_TIMER_STEPS.indexOf(fromStep);
    const subsequentSteps = GUEST_TOTAL_TIMER_STEPS.slice(fromIndex + 1);

    if (subsequentSteps.length === 0) return;

    const sumP = subsequentSteps.reduce((acc, step) => acc + STAGE_PERCENTAGES[step], 0);
    if (sumP <= 0) return;

    setGuestStepBudgets((prevBudgets) => {
      const fromStepBudget = prevBudgets[fromStep] || 0;
      if (fromStepBudget <= 0) return prevBudgets;

      const safeSurplus = Math.min(surplus, fromStepBudget);
      const nextBudgets = { ...prevBudgets };
      subsequentSteps.forEach((step) => {
        nextBudgets[step] = prevBudgets[step] + safeSurplus * (STAGE_PERCENTAGES[step] / sumP);
      });
      // Zero out the fromStep budget
      nextBudgets[fromStep] = 0;
      return nextBudgets;
    });
  };

  const goToGuestStep = (stepId, delay = 0, { force = false } = {}) => {
    if (!force && isGuestStepLocked(stepId) && stepId !== guestStep) {
      setGuestNotice('Bước này mình đã chốt xinh rồi, tụi mình đi tiếp nha.');
      return;
    }

    const run = () => {
      handleCarryOverSurplus(latestGuestStepRef.current);
      setGuestTimedWarningPopup(null);
      setGuestStep(stepId);
      setVisibleGuestStep(stepId);
      scrollToGuestStep(stepId);
    };
    if (delay > 0) {
      window.setTimeout(run, delay);
      return;
    }
    run();
  };

  const autoAdvanceGuestStep = (stepId, delay = 520) => {
    goToGuestStep(stepId, delay);
  };

  useEffect(() => {
    if (isPartnerMode) return undefined;

    const stepIds = ['hero', ...GUEST_STEP_ORDER];
    const updateVisibleGuestStep = () => {
      const anchorY = window.innerHeight * 0.42;
      let nearestStep = 'hero';
      let nearestDistance = Number.POSITIVE_INFINITY;

      stepIds.forEach((stepId) => {
        const section = document.getElementById(`guest-${stepId}`);
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top - anchorY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestStep = stepId;
        }
      });

      setVisibleGuestStep((current) => (current === nearestStep ? current : nearestStep));
    };

    updateVisibleGuestStep();
    window.addEventListener('scroll', updateVisibleGuestStep, { passive: true });
    window.addEventListener('resize', updateVisibleGuestStep);

    return () => {
      window.removeEventListener('scroll', updateVisibleGuestStep);
      window.removeEventListener('resize', updateVisibleGuestStep);
    };
  }, [isPartnerMode]);

  useEffect(() => {
    if (isPartnerMode) return undefined;

    const timerConfig = GUEST_TIMED_STEPS[guestStep];
    if (!timerConfig) {
      setGuestStepStartedAt(null);
      setGuestStepTimerStepId(null);
      setGuestTimerNow(Date.now());
      guestTimerPausedTotalMsRef.current = 0;
      guestTimerPauseStartedAtRef.current = null;
      setIsGuestTimerPaused(false);
      return undefined;
    }

    const startedAt = Date.now();
    setGuestStepStartedAt(startedAt);
    setGuestStepTimerStepId(guestStep);
    setGuestTimerNow(startedAt);
    guestTimerPausedTotalMsRef.current = 0;
    guestTimerPauseStartedAtRef.current = null;
    setIsGuestTimerPaused(false);

    const timerId = window.setInterval(() => {
      setGuestTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [guestStep, isPartnerMode]);

  useEffect(() => {
    const shouldPause = Boolean(guestTransitionPrompt || adminModalMode);
    setIsGuestTimerPaused(shouldPause);
  }, [adminModalMode, guestTransitionPrompt]);

  useEffect(() => {
    if (!GUEST_TIMED_STEPS[guestStep] || !guestStepStartedAt || guestStepTimerStepId !== guestStep) return;

    if (isGuestTimerPaused && !guestTimerPauseStartedAtRef.current) {
      guestTimerPauseStartedAtRef.current = Date.now();
      setGuestTimerNow(Date.now());
      return;
    }

    if (!isGuestTimerPaused && guestTimerPauseStartedAtRef.current) {
      guestTimerPausedTotalMsRef.current += Date.now() - guestTimerPauseStartedAtRef.current;
      guestTimerPauseStartedAtRef.current = null;
      setGuestTimerNow(Date.now());
    }
  }, [guestStep, guestStepStartedAt, guestStepTimerStepId, isGuestTimerPaused]);

  const applyBeautyPreset = (preset) => {
    setBeautyFilterSettings(preset);
    setActiveBeautyPresetId(preset.id);
  };

  const updateBeautyFilterSetting = (key, value) => {
    const nextValue = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
    setBeautyFilterSettings((current) => ({
      ...current,
      [key]: nextValue,
    }));
    setActiveBeautyPresetId('custom');
  };

  const DSLR_CAPTURE_REGEX = /eos|canon|nikon|sony|fuji|virtual|obs|sparko|capture|hdmi|cam\s?link|elgato|usb\s?video/i;
  const getStoredSelectedCameraId = () => localStorage.getItem(SELECTED_CAMERA_STORAGE_KEY) || '';
  const getStoredPreferredCameraId = () => (
    preferredCameraIdRef.current ||
    localStorage.getItem(PREFERRED_CAMERA_STORAGE_KEY) ||
    ''
  );
  const isPreferredCameraLabel = (label) => DSLR_CAPTURE_REGEX.test(String(label || ''));
  const isPreferredCameraDevice = (device) => isPreferredCameraLabel(device?.label);
  const getPreferredCameraDevice = (devices) => devices.find(isPreferredCameraDevice) || null;
  const hasReadableCameraLabels = (devices) => devices.some((device) => String(device.label || '').trim());

  const rememberSelectedCamera = (deviceId, { preferred = false } = {}) => {
    if (!deviceId) return;
    setSelectedCameraId(deviceId);
    localStorage.setItem(SELECTED_CAMERA_STORAGE_KEY, deviceId);
    if (preferred) {
      preferredCameraIdRef.current = deviceId;
      localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, deviceId);
    }
  };

  const stopStreamTracks = (stream) => {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
    } catch (error) {
      console.warn('Error stopping camera stream:', error);
    }
  };

  function stopReconnectionPolling() {
    if (reconnectIntervalIdRef.current) {
      window.clearInterval(reconnectIntervalIdRef.current);
      reconnectIntervalIdRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }

  const updateCameraDevices = async ({ allowDefaultSelection = false, preferPrimary = true } = {}) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoDevices);

      if (videoDevices.length === 0) return [];

      const labelsAreReadable = hasReadableCameraLabels(videoDevices);
      const preferredDevice = getPreferredCameraDevice(videoDevices);
      if (preferredDevice) {
        preferredCameraIdRef.current = preferredDevice.deviceId;
        localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, preferredDevice.deviceId);
      }

      const activeId = getStoredSelectedCameraId();
      const stillExists = videoDevices.some((d) => d.deviceId === activeId);

      if (preferredDevice && preferPrimary && (!activeId || !stillExists || isUsingFallbackCameraRef.current)) {
        rememberSelectedCamera(preferredDevice.deviceId, { preferred: true });
        return videoDevices;
      }

      if (activeId && stillExists) {
        setSelectedCameraId(activeId);
        return videoDevices;
      }

      if (allowDefaultSelection && labelsAreReadable) {
        const defaultDevice = preferredDevice || videoDevices[0];
        rememberSelectedCamera(defaultDevice.deviceId, { preferred: Boolean(preferredDevice) });
      }

      return videoDevices;
    } catch (error) {
      console.warn('Error enumerating camera devices:', error);
      return [];
    }
  };

  const handleCameraDisconnect = ({ allowFallback = true } = {}) => {
    if (capturePausedRef.current) return;

    setIsCameraReconnecting(true);

    if (reconnectIntervalIdRef.current) {
      window.clearInterval(reconnectIntervalIdRef.current);
      reconnectIntervalIdRef.current = null;
    }

    const selectedCameraIdAtStart = getStoredSelectedCameraId();
    let timeElapsed = 0;

    const attemptReconnect = async () => {
      timeElapsed += 2.5;
      console.log(`Polling to check camera reconnect (${timeElapsed}s passed)…`);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameraDevices(videoDevices);

        const preferredByLabel = getPreferredCameraDevice(videoDevices);
        if (preferredByLabel) {
          preferredCameraIdRef.current = preferredByLabel.deviceId;
          localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, preferredByLabel.deviceId);
        }

        const storedPreferredId = getStoredPreferredCameraId();
        const storedPreferredDevice = storedPreferredId
          ? videoDevices.find((device) => device.deviceId === storedPreferredId)
          : null;
        const selectedDevice = selectedCameraIdAtStart
          ? videoDevices.find((device) => device.deviceId === selectedCameraIdAtStart)
          : null;
        const targetDevice = preferredByLabel || storedPreferredDevice || selectedDevice;
        const targetIsPrimary = Boolean(preferredByLabel || storedPreferredDevice);

        if (targetDevice) {
          const activeTrack = cameraStreamRef.current?.getVideoTracks?.()[0];
          const activeDeviceId = activeTrack?.getSettings?.().deviceId || '';
          const isAlreadyUsingTarget = activeDeviceId && activeDeviceId === targetDevice.deviceId;
          const isAlreadyUsingPrimary = activeTrack && isPreferredCameraLabel(activeTrack.label);

          if (!isAlreadyUsingTarget || (targetIsPrimary && !isAlreadyUsingPrimary)) {
            console.log('Reconnecting to preferred camera:', targetDevice.deviceId);
            const stream = await initCameraStream(targetDevice.deviceId, { stopPolling: false });
            const restoredTrack = stream?.getVideoTracks?.()[0];
            const restoredDeviceId = restoredTrack?.getSettings?.().deviceId || '';
            const restoredIsTarget = restoredDeviceId && restoredDeviceId === targetDevice.deviceId;
            const restoredIsPrimary = restoredTrack && isPreferredCameraLabel(restoredTrack.label);

            if (stream && (restoredIsTarget || (targetIsPrimary && restoredIsPrimary))) {
              console.log('Camera restored successfully!');
              stopReconnectionPolling();
              rememberSelectedCamera(targetDevice.deviceId, { preferred: targetIsPrimary });
              isUsingFallbackCameraRef.current = false;
              setIsCameraReconnecting(false);
              return;
            }
          } else if (!targetIsPrimary) {
            stopReconnectionPolling();
            isUsingFallbackCameraRef.current = false;
            setIsCameraReconnecting(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Error during reconnect device enumeration:', e);
      }

      if (allowFallback && timeElapsed >= 5.0 && !cameraStreamRef.current && !isUsingFallbackCameraRef.current) {
        console.log('No active camera stream after 5s. Opening webcam fallback…');
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          const webcamDevice = videoDevices.find((d) => !isPreferredCameraDevice(d));
          const fallbackId = webcamDevice ? webcamDevice.deviceId : (videoDevices[0]?.deviceId || null);

          if (fallbackId) {
            const constraints = {
              video: { deviceId: { exact: fallbackId }, ...HIGH_QUALITY_CAMERA_CONSTRAINTS },
              audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            const hasPrimaryToRecover = Boolean(getStoredPreferredCameraId() || getPreferredCameraDevice(videoDevices));
            isUsingFallbackCameraRef.current = hasPrimaryToRecover;
            setIsCameraReconnecting(hasPrimaryToRecover);

            stream.getVideoTracks().forEach((track) => {
              track.onended = () => {
                console.warn('Temporary fallback camera track ended.');
                handleCameraDisconnect();
              };
            });
            console.log('Webcam fallback stream active.');
          }
        } catch (err) {
          console.warn('Could not open temporary webcam fallback:', err);
        }
      }
    };

    attemptReconnect();
    reconnectIntervalIdRef.current = window.setInterval(attemptReconnect, 2500);
  };

  const initCameraStreamLegacy = async (deviceId = null) => {
    stopReconnectionPolling();

    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error stopping old camera track:', e);
      }
      setCameraStream(null);
    }

    setCameraError('');
    let targetDeviceId = deviceId || localStorage.getItem('selectedCameraId') || '';

    if (!targetDeviceId) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        const dslr = videoDevices.find((d) => DSLR_CAPTURE_REGEX.test(d.label));
        if (dslr) {
          targetDeviceId = dslr.deviceId;
          setSelectedCameraId(dslr.deviceId);
          localStorage.setItem('selectedCameraId', dslr.deviceId);
        }
      } catch (e) {
        console.warn('Error finding initial DSLR:', e);
      }
    }

    const constraints = {
      video: targetDeviceId
        ? { deviceId: { exact: targetDeviceId }, ...HIGH_QUALITY_CAMERA_CONSTRAINTS }
        : { facingMode: 'user', ...HIGH_QUALITY_CAMERA_CONSTRAINTS },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const track = stream.getVideoTracks()[0];
      const isDslr = track && DSLR_CAPTURE_REGEX.test(track.label);

      setCameraStream(stream);
      reconnectAttemptsRef.current = 0;

      if (isDslr) {
        setIsCameraReconnecting(false);
        isUsingFallbackCameraRef.current = false;
        if (targetDeviceId) {
          preferredCameraIdRef.current = targetDeviceId;
        }
      } else {
        setIsCameraReconnecting(true);
        isUsingFallbackCameraRef.current = true;
        handleCameraDisconnect();
      }

      await updateCameraDevices();

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          console.warn('Active video track ended.');
          handleCameraDisconnect();
        };
      });

      return stream;
    } catch (error) {
      console.error('Failed to init camera with constraints:', error);
      
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        const webcam = videoDevices.find((d) => !DSLR_CAPTURE_REGEX.test(d.label)) || videoDevices[0];
        
        if (webcam) {
          console.log('Opening fallback webcam:', webcam.label);
          const fallbackConstraints = {
            video: { deviceId: { exact: webcam.deviceId }, ...HIGH_QUALITY_CAMERA_CONSTRAINTS },
            audio: false
          };
          
          const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          setCameraStream(fallbackStream);
          setIsCameraReconnecting(true);
          reconnectAttemptsRef.current = 0;
          isUsingFallbackCameraRef.current = true;
          
          await updateCameraDevices();

          fallbackStream.getVideoTracks().forEach((track) => {
            track.onended = () => {
              console.warn('Fallback video track ended.');
              handleCameraDisconnect();
            };
          });

          handleCameraDisconnect();

          return fallbackStream;
        }
      } catch (fallbackError) {
        console.error('Webcam fallback also failed:', fallbackError);
      }

      setCameraError('Không thể mở camera. Hãy kiểm tra kết nối camera hoặc quyền trình duyệt.');
      return null;
    }
  };

  const initCameraStream = async (deviceId = null, { stopPolling = true, userSelected = false } = {}) => {
    if (stopPolling) stopReconnectionPolling();

    if (cameraStreamRef.current) {
      stopStreamTracks(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
    }

    setCameraError('');
    let targetDeviceId = deviceId || getStoredPreferredCameraId() || getStoredSelectedCameraId();

    if (!targetDeviceId && !userSelected) {
      try {
        const videoDevices = await updateCameraDevices({ allowDefaultSelection: false, preferPrimary: true });
        const preferredDevice = getPreferredCameraDevice(videoDevices);
        if (preferredDevice) targetDeviceId = preferredDevice.deviceId;
      } catch (e) {
        console.warn('Error finding initial preferred camera:', e);
      }
    }

    const constraints = {
      video: targetDeviceId
        ? { deviceId: { exact: targetDeviceId }, ...HIGH_QUALITY_CAMERA_CONSTRAINTS }
        : { facingMode: 'user', ...HIGH_QUALITY_CAMERA_CONSTRAINTS },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      const openedDeviceId = track?.getSettings?.().deviceId || targetDeviceId || '';
      const videoDevices = await updateCameraDevices({ allowDefaultSelection: true, preferPrimary: !userSelected });
      const preferredDevice = getPreferredCameraDevice(videoDevices);

      if (
        !userSelected &&
        preferredDevice &&
        openedDeviceId &&
        openedDeviceId !== preferredDevice.deviceId &&
        !isPreferredCameraLabel(track?.label)
      ) {
        stopStreamTracks(stream);
        return initCameraStream(preferredDevice.deviceId, { stopPolling: false });
      }

      setCameraStream(stream);
      cameraStreamRef.current = stream;
      reconnectAttemptsRef.current = 0;

      const isPrimaryStream = Boolean(
        isPreferredCameraLabel(track?.label) ||
        (preferredDevice && openedDeviceId === preferredDevice.deviceId),
      );

      if (isPrimaryStream) {
        rememberSelectedCamera(openedDeviceId || preferredDevice?.deviceId || targetDeviceId, { preferred: true });
        setIsCameraReconnecting(false);
        isUsingFallbackCameraRef.current = false;
      } else {
        const hasPrimaryToRecover = Boolean(!userSelected && (getStoredPreferredCameraId() || preferredDevice));
        if (userSelected || !getStoredSelectedCameraId()) {
          rememberSelectedCamera(openedDeviceId || targetDeviceId);
        }
        isUsingFallbackCameraRef.current = hasPrimaryToRecover;
        setIsCameraReconnecting(hasPrimaryToRecover);
        if (hasPrimaryToRecover) {
          handleCameraDisconnect({ allowFallback: false });
        }
      }

      stream.getVideoTracks().forEach((videoTrack) => {
        videoTrack.onended = () => {
          console.warn('Active video track ended.');
          handleCameraDisconnect();
        };
      });

      return stream;
    } catch (error) {
      console.error('Failed to init camera with constraints:', error);

      try {
        const videoDevices = await updateCameraDevices({ allowDefaultSelection: true, preferPrimary: true });
        const preferredDevice = getPreferredCameraDevice(videoDevices);

        if (!userSelected && preferredDevice && preferredDevice.deviceId !== targetDeviceId) {
          return initCameraStream(preferredDevice.deviceId, { stopPolling: false });
        }

        const webcam = videoDevices.find((device) => !isPreferredCameraDevice(device)) || videoDevices[0];

        if (webcam) {
          console.log('Opening fallback webcam:', webcam.label);
          const fallbackConstraints = {
            video: { deviceId: { exact: webcam.deviceId }, ...HIGH_QUALITY_CAMERA_CONSTRAINTS },
            audio: false,
          };

          const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          const fallbackTrack = fallbackStream.getVideoTracks()[0];
          const fallbackDeviceId = fallbackTrack?.getSettings?.().deviceId || webcam.deviceId;
          const refreshedDevices = await updateCameraDevices({ allowDefaultSelection: true, preferPrimary: !userSelected });
          const refreshedPreferredDevice = getPreferredCameraDevice(refreshedDevices);

          if (
            !userSelected &&
            refreshedPreferredDevice &&
            fallbackDeviceId !== refreshedPreferredDevice.deviceId
          ) {
            stopStreamTracks(fallbackStream);
            return initCameraStream(refreshedPreferredDevice.deviceId, { stopPolling: false });
          }

          setCameraStream(fallbackStream);
          cameraStreamRef.current = fallbackStream;
          reconnectAttemptsRef.current = 0;

          const targetDeviceIsKnownPrimary = Boolean(
            targetDeviceId &&
            refreshedDevices.some((device) => device.deviceId === targetDeviceId && isPreferredCameraDevice(device)),
          );
          const hasPrimaryToRecover = Boolean(!userSelected && (getStoredPreferredCameraId() || refreshedPreferredDevice || targetDeviceIsKnownPrimary));
          if (userSelected || !hasPrimaryToRecover) {
            rememberSelectedCamera(fallbackDeviceId || webcam.deviceId);
          }
          isUsingFallbackCameraRef.current = hasPrimaryToRecover;
          setIsCameraReconnecting(hasPrimaryToRecover);

          fallbackStream.getVideoTracks().forEach((videoTrack) => {
            videoTrack.onended = () => {
              console.warn('Fallback video track ended.');
              handleCameraDisconnect();
            };
          });

          if (hasPrimaryToRecover) {
            handleCameraDisconnect({ allowFallback: false });
          }

          return fallbackStream;
        }
      } catch (fallbackError) {
        console.error('Webcam fallback also failed:', fallbackError);
      }

      setCameraError('Không thể mở camera. Hãy kiểm tra kết nối camera hoặc quyền trình duyệt.');
      return null;
    }
  };

  const handleCameraChange = async (deviceId) => {
    rememberSelectedCamera(deviceId);
    await initCameraStream(deviceId, { userSelected: true });
  };

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return undefined;

    const handleDeviceChange = async () => {
      console.log('System media devices changed.');
      await updateCameraDevices({ allowDefaultSelection: false, preferPrimary: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      
      const targetId = getStoredPreferredCameraId() || getStoredSelectedCameraId();
      const activeStream = cameraStreamRef.current;
      
      const dslrDevice = getPreferredCameraDevice(videoDevices);
      
      if (dslrDevice) {
        const activeTrack = activeStream?.getVideoTracks()[0];
        const isCurrentlyUsingDslr = activeTrack && isPreferredCameraLabel(activeTrack.label);
        
        if (!isCurrentlyUsingDslr) {
          console.log('DSLR or Capture Card detected! Auto-switching to:', dslrDevice.label);
          rememberSelectedCamera(dslrDevice.deviceId, { preferred: true });
          isUsingFallbackCameraRef.current = false;
          await initCameraStream(dslrDevice.deviceId);
          return;
        }
      }
      
      if (!activeStream && targetId) {
        console.log('Attempting auto-init on device change…');
        await initCameraStream(targetId);
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  useEffect(() => {
    updateCameraDevices();
  }, []);

  const startGuestJourney = async () => {
    await requestKioskFullscreen();
    guestSessionIdRef.current += 1;
    clearGuestNewSessionTimer();
    setGuestNotice('');
    setGuestCommittedStepIndex(-1);
    setGuestTransitionPrompt(null);
    setGuestTransitionBusy(false);
    setGuestTimedWarningPopup(null);
    setIsGuestTimerPaused(false);
    guestTimerPausedTotalMsRef.current = 0;
    guestTimerPauseStartedAtRef.current = null;
    guestTimedWarningShownKeysRef.current.clear();
    guestTimedAutoAdvanceKeysRef.current.clear();
    capturePausedRef.current = false;
    guestPreviewPhotoCacheRef.current.clear();
    setCapturedPhotos([]);
    setSelectedCaptureIndices([]);
    setGuestAutoCaptureIndices([]);
    setSelectedGuestFrames([]);
    setGuestFramePreviews([]);
    guestFramePreviewsRef.current = [];
    setGuestFramePageIndex(0);
    setIsBuildingFramePreviews(false);
    setIsCommittingGuestFrames(false);
    setFramePreviewStatus('');
    setGuestPreviewUrl('');
    setGuestOutputMeta(null);
    setGuestShare(null);
    setGuestQrUrl('');
    setGuestShareStatus('');
    setGuestPrintStatus('');
    setIsGuestPrinting(false);
    setGuestPrintFallbackAvailable(false);
    setGuestFrameDrafts([]);
    setSelectedAdjustFrameIndex(0);
    setSlotEdits([]);
    setSelectedAdjustSlotIndex(0);
    guestAdjustAutoFinishRef.current = false;
    const initialBudgets = createGuestStepBudgets();
    const initialCaptureSeconds = Math.ceil(initialBudgets.capture);
    setGuestStepBudgets(initialBudgets);
    setCaptureSessionSecondsLeft(initialCaptureSeconds);
    setNextCaptureSecondsLeft(GUEST_CAPTURE_INTERVAL_SECONDS);
    setCaptureCountdown(null);
    setIsLockedCaptureRunning(false);
    capturedPhotosCountRef.current = 0;
    setGuestStep('capture');
    setVisibleGuestStep('capture');
    scrollToGuestStep('capture');

    await initCameraStream(getStoredPreferredCameraId() || getStoredSelectedCameraId() || '');
  };

  const runGuestAiAnalysis = async (photosForAi) => {
    try {
      const prompt = `Analyze each guest photo and return one JSON object only. Schema: {"photos":[{"dominantColors":[{"hex":"#ffffff","tag":"white","weight":50}],"paletteTags":["bright"],"lighting":{"brightness":0,"contrast":0,"saturation":0,"warmth":0,"coolness":0},"vibes":["cute"],"concepts":["portrait"],"events":[],"scores":{"cute":0,"romantic":0,"vintage":0,"fantasy":0,"elegant":0,"minimal":0,"pastel":0,"energetic":0,"luxury":0,"fresh":0,"warm":0,"cool":0},"qualityWeight":0.8}]}. Use English tags only. Scores are integers 0-100. No markdown.`;
      const aiResult = await callVisionProfileAi({ images: photosForAi.map((photo) => photo.url), prompt });
      const aiProfiles = Array.isArray(aiResult?.photos)
        ? aiResult.photos.flatMap((item) => {
          const profile = validateProfile({ ...item, source: 'ai' });
          return profile ? [profile] : [];
        })
        : [];
      if (!aiProfiles.length) return;
      setGuestPhotoProfiles((prev) => {
        const nextProfiles = [...aiProfiles, ...prev.slice(aiProfiles.length)];
        setGuestSessionProfile(mergeGuestProfiles(nextProfiles.slice(0, 6)));
        return nextProfiles;
      });
    } catch {
      // AI recommendation is optional; local recommendation remains active.
    }
  };

  const analyzeGuestPhotoLocal = async (photo, nextPhotos) => {
    try {
      const profile = await analyzeImageLocal(photo.url, 'guest');
      setGuestPhotoProfiles((prev) => {
        const nextProfiles = [...prev, profile];
        const session = mergeGuestProfiles(nextProfiles.slice(0, 6));
        setGuestSessionProfile(session);
        return nextProfiles;
      });
      if (nextPhotos.length >= GUEST_CAPTURE_TARGET && !guestAiAnalysisStartedRef.current) {
        guestAiAnalysisStartedRef.current = true;
        runGuestAiAnalysis(nextPhotos.slice(0, GUEST_CAPTURE_TARGET));
      }
    } catch {
      if (nextPhotos.length >= GUEST_CAPTURE_TARGET && !guestAiAnalysisStartedRef.current) {
        guestAiAnalysisStartedRef.current = true;
        runGuestAiAnalysis(nextPhotos.slice(0, GUEST_CAPTURE_TARGET));
      }
    }
  };

  const captureGuestPhotoFrame = async () => {
    if (captureBusyRef.current || capturedPhotosCountRef.current >= maxGuestPhotos || !cameraStreamRef.current) return false;
    captureBusyRef.current = true;
    setIsCapturingGuestPhoto(true);
    setGuestNotice('');

    try {
      setCaptureCountdown('📸');
      playShutterSound();
      setFlashActive(true);
      await wait(120);

      const fallbackVideo = beautyCameraRef.current?.getVideoElement();
      const rawCanvas = await waitForReadableGuestVideoFrame(fallbackVideo);

      if (!rawCanvas) {
        setGuestNotice('Camera đang trả về khung hình trống. Hãy kiểm tra nắp che camera/quyền camera rồi bấm chụp lại.');
        return false;
      }

      const rawDataUrl = rawCanvas.toDataURL('image/png');
      const filteredDataUrl = !isKioskGuardEnabled && beautyCameraRef.current?.isReady()
        ? await beautyCameraRef.current.captureDataUrl('image/png')
        : null;
      const dataUrl = typeof filteredDataUrl === 'string' && filteredDataUrl.startsWith('data:')
        ? filteredDataUrl
        : rawDataUrl;

      const photoIndex = capturedPhotosCountRef.current;
      const photo = {
        id: `capture-${Date.now()}-${photoIndex}`,
        url: dataUrl,
        name: `Ảnh ${photoIndex + 1}`,
        capturedAt: new Date().toISOString(),
      };
      capturedPhotosCountRef.current = Math.min(maxGuestPhotos, photoIndex + 1);

      setCapturedPhotos((prev) => {
        if (prev.length >= maxGuestPhotos) return prev;
        const nextPhotos = [...prev, photo];
        capturedPhotosCountRef.current = nextPhotos.length;
        analyzeGuestPhotoLocal(photo, nextPhotos);
        return nextPhotos;
      });
      setGuestPreviewUrl('');
      return true;
    } finally {
      setFlashActive(false);
      setIsCapturingGuestPhoto(false);
      captureBusyRef.current = false;
    }
  };

  const startGuestCaptureSession = async () => {
    if (isLockedCaptureRunning || isCaptureLocked) return;
    if (!cameraStreamRef.current) {
      setGuestNotice('Camera đang kết nối nè, bạn đợi màn hình hiện rõ rồi bấm chụp nha.');
      await startGuestJourney();
      return;
    }
    if (capturedPhotosCountRef.current >= maxGuestPhotos) {
      finishCaptureEarly();
      return;
    }

    // Pre-initialize and unlock AudioContext on direct user gesture
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        window.__shutterAudioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('Failed to pre-init audio context:', e);
    }

    setGuestNotice('');
    setCaptureSessionSecondsLeft(Math.ceil(guestStepBudgets.capture));
    setNextCaptureSecondsLeft(GUEST_CAPTURE_INTERVAL_SECONDS);
    setCaptureCountdown(String(GUEST_CAPTURE_INTERVAL_SECONDS));
    setIsLockedCaptureRunning(true);
  };

  const requestFinishCaptureEarly = () => {
    if (capturedPhotos.length < minGuestPhotosToContinue) {
      setGuestNotice(`Mình cần ít nhất ${minGuestPhotosToContinue} tấm để ghép ảnh ổn áp nha.`);
      return;
    }
    finishCaptureEarly();
  };

  const finishCaptureEarly = () => {
    if (capturedPhotosCountRef.current < minGuestPhotosToContinue) {
      setGuestNotice(`Mình cần ít nhất ${minGuestPhotosToContinue} tấm để qua bước chọn khung nha.`);
      return;
    }
    setIsLockedCaptureRunning(false);
    setCaptureCountdown(null);
    setGuestTransitionPrompt(null);
    setGuestTimedWarningPopup(null);
    setGuestNotice('');
    commitGuestStep('capture');
    goToGuestStep('frame');
  };

  useEffect(() => {
    if (isPartnerMode || guestStep !== 'capture' || !cameraStream || !isLockedCaptureRunning) return undefined;
    if (capturedPhotosCountRef.current >= maxGuestPhotos) return undefined;

    let cancelled = false;

    const totalSeconds = Math.ceil(guestStepBudgets.capture);
    let totalSecondsLeft = totalSeconds;

    setCaptureSessionSecondsLeft(totalSeconds);
    setNextCaptureSecondsLeft(GUEST_CAPTURE_INTERVAL_SECONDS);
    setCaptureCountdown(String(GUEST_CAPTURE_INTERVAL_SECONDS));

    // Handle step session countdown timer separately
    const totalTimerInterval = window.setInterval(() => {
      if (cancelled) return;
      if (capturePausedRef.current) return;

      totalSecondsLeft = Math.max(0, totalSecondsLeft - 1);
      setCaptureSessionSecondsLeft(totalSecondsLeft);

      if (totalSecondsLeft <= 0 && capturedPhotosCountRef.current < maxGuestPhotos) {
        window.clearInterval(totalTimerInterval);
        setIsLockedCaptureRunning(false);
        setCaptureCountdown(null);
        setGuestNotice('Mình chưa chụp đủ 6 tấm vì camera chưa kịp sẵn sàng. Bạn bấm chụp lại từ đầu giúp mình nha.');
      }
    }, 1000);

    // Sequential countdown cycle for each photo, avoiding overlapping ticks/races
    const runCaptureCycle = async () => {
      if (cancelled) return;

      for (let secondsLeft = GUEST_CAPTURE_INTERVAL_SECONDS; secondsLeft > 0; secondsLeft--) {
        if (cancelled) return;

        setNextCaptureSecondsLeft(secondsLeft);
        setCaptureCountdown(String(secondsLeft));

        // Sleep 1 second respecting the pause state
        await new Promise((resolve) => {
          let elapsed = 0;
          const waitInterval = window.setInterval(() => {
            if (cancelled) {
              window.clearInterval(waitInterval);
              resolve();
              return;
            }
            if (capturePausedRef.current) return;

            elapsed += 1;
            if (elapsed >= 1) {
              window.clearInterval(waitInterval);
              resolve();
            }
          }, 1000);
        });
      }

      if (cancelled) return;

      // Start capture
      setCaptureCountdown('📸');

      const didCapture = await captureGuestPhotoFrame();
      if (cancelled) return;

      const savedCount = capturedPhotosCountRef.current;
      if (didCapture && savedCount >= maxGuestPhotos) {
        window.clearInterval(totalTimerInterval);
        setIsLockedCaptureRunning(false);
        setCaptureCountdown(null);
        commitGuestStep('capture');
        autoAdvanceGuestStep('frame', 650);
        return;
      }

      // Start next countdown cycle recursively if we haven't reached the limit
      if (!cancelled && savedCount < maxGuestPhotos) {
        runCaptureCycle();
      }
    };

    runCaptureCycle();

    return () => {
      cancelled = true;
      window.clearInterval(totalTimerInterval);
      setCaptureCountdown(null);
    };
  }, [guestStep, cameraStream, isPartnerMode, isLockedCaptureRunning]);

  useEffect(() => {
    if (
      isPartnerMode ||
      guestStep !== 'capture' ||
      isGuestStepLocked('capture') ||
      capturedPhotos.length < maxGuestPhotos
    ) {
      return;
    }

    setIsLockedCaptureRunning(false);
    setCaptureCountdown(null);
    setGuestTransitionPrompt(null);
    setGuestTimedWarningPopup(null);
    setGuestNotice('');
    commitGuestStep('capture');
    autoAdvanceGuestStep('frame', 520);
  }, [capturedPhotos.length, guestCommittedStepIndex, guestStep, isPartnerMode, maxGuestPhotos]);

  useEffect(() => {
    if (isPartnerMode || !['capture', 'frame'].includes(guestStep) || capturedPhotos.length === 0) return;
    const targetCount = Math.min(4, capturedPhotos.length);
    setGuestAutoCaptureIndices((current) => {
      const firstCaptureIndices = getFirstCaptureIndices(capturedPhotos.length, targetCount);
      const isCurrentValid =
        current.length === firstCaptureIndices.length &&
        current.every((captureIndex, index) => captureIndex === firstCaptureIndices[index]);
      return isCurrentValid ? current : firstCaptureIndices;
    });
  }, [capturedPhotos.length, guestStep, isPartnerMode]);

  useEffect(() => {
    setSelectedCaptureIndices(guestAutoCaptureIndices);
  }, [guestAutoCaptureIndices]);

  useEffect(() => {
    if (
      isPartnerMode ||
      !['capture', 'frame'].includes(guestStep) ||
      guestAutoCaptureIndices.length < GUEST_FRAME_PREVIEW_PHOTO_TARGET ||
      !guestAutoCapturePhotoKey ||
      guestFrameDisplayLibrary.length === 0
    ) {
      return undefined;
    }

    let cancelled = false;
    const requestId = guestFramePreviewRequestRef.current + 1;
    guestFramePreviewRequestRef.current = requestId;
    const totalPages = Math.max(1, Math.ceil(guestFrameDisplayLibrary.length / GUEST_FRAME_PAGE_SIZE));
    const normalizedPageIndex = Math.min(Math.max(guestFramePageIndex, 0), totalPages - 1);
    const pageIndicesToBuild = (() => {
      const pageSet = new Set([0]);
      if (guestStep === 'frame') {
        for (let offset = 0; offset <= GUEST_FRAME_PREFETCH_AHEAD_PAGES; offset += 1) {
          pageSet.add(normalizedPageIndex + offset);
        }
        if (normalizedPageIndex === 0) {
          pageSet.add(1);
          pageSet.add(2);
        }
      }
      return [...pageSet]
        .filter((pageIndex) => pageIndex >= 0 && pageIndex < totalPages)
        .sort((a, b) => a - b);
    })();

    const targetFrameKeys = new Set();
    const targetFrames = [];
    pageIndicesToBuild.forEach((pageIndex) => {
      guestFrameDisplayLibrary
        .slice(pageIndex * GUEST_FRAME_PAGE_SIZE, pageIndex * GUEST_FRAME_PAGE_SIZE + GUEST_FRAME_PAGE_SIZE)
        .forEach((frame) => {
          const key = getFrameLibraryKey(frame);
          if (targetFrameKeys.has(key)) return;
          targetFrameKeys.add(key);
          targetFrames.push(frame);
        });
    });

    const fallbackCards = guestFrameDisplayLibrary.map((frame) => ({
      key: getFrameLibraryKey(frame),
      frame,
      previewUrl: frame.previewRenderUrl || frame.previewUrl || frame.url,
      isComposed: false,
      status: 'Đang chờ ghép thử',
    }));
    const fallbackCardsByKey = new Map(fallbackCards.map((card) => [card.key, card]));
    const cardsByKey = new Map(fallbackCardsByKey);

    guestFramePreviewsRef.current.forEach((card) => {
      if (
        fallbackCardsByKey.has(card.key) &&
        card.previewPhotoKey === guestAutoCapturePhotoKey &&
        (card.isComposed || card.isPreviewAttempted)
      ) {
        cardsByKey.set(card.key, card);
      }
    });

    const publishCards = () => {
      const nextCards = guestFrameDisplayLibrary.map((frame) => {
        const key = getFrameLibraryKey(frame);
        return cardsByKey.get(key) || fallbackCardsByKey.get(key);
      });
      guestFramePreviewsRef.current = nextCards;
      setGuestFramePreviews(nextCards);
    };

    publishCards();

    const pendingFrames = targetFrames.filter((frame) => {
      const card = cardsByKey.get(getFrameLibraryKey(frame));
      return !(
        card?.previewPhotoKey === guestAutoCapturePhotoKey &&
        (card.isComposed || card.isPreviewAttempted)
      );
    });

    if (pendingFrames.length === 0) {
      setIsBuildingFramePreviews(false);
      setFramePreviewStatus('');
      return () => {
        cancelled = true;
      };
    }

    const firstPage = pageIndicesToBuild[0] + 1;
    const lastPage = pageIndicesToBuild[pageIndicesToBuild.length - 1] + 1;
    const pageText = firstPage === lastPage ? `trang ${firstPage}` : `trang ${firstPage}-${lastPage}`;
    const framePageByKey = new Map();
    guestFrameDisplayLibrary.forEach((frame, index) => {
      framePageByKey.set(getFrameLibraryKey(frame), Math.floor(index / GUEST_FRAME_PAGE_SIZE) + 1);
    });

    setIsBuildingFramePreviews(true);
    setFramePreviewStatus(`Đang ghép trước ${pageText} (${pendingFrames.length} khung)…`);

    const buildPreviews = async () => {
      try {
        const photoItems = (await Promise.all(guestAutoCaptureIndices.map(getGuestPreviewPhotoItem))).filter(Boolean);

        if (cancelled || guestFramePreviewRequestRef.current !== requestId) return;
        if (!photoItems.length) throw new Error('No photos for preview');

        let builtCount = 0;

        for (const frame of pendingFrames) {
          if (cancelled || guestFramePreviewRequestRef.current !== requestId) return;
          builtCount += 1;
          const frameKey = getFrameLibraryKey(frame);
          const pageNumber = framePageByKey.get(frameKey) || 1;
          setFramePreviewStatus(`Đang ghép thử trang ${pageNumber}/${totalPages} (${builtCount}/${pendingFrames.length})…`);

          try {
            cardsByKey.set(
              frameKey,
              {
                ...(await renderGuestFramePreview(frame, photoItems, { maxLongSide: 760 })),
                previewPhotoKey: guestAutoCapturePhotoKey,
                isPreviewAttempted: true,
              },
            );
          } catch (error) {
            console.warn('Không thể ghép thử khung:', frame.name, error);
            cardsByKey.set(frameKey, {
              key: frameKey,
              frame,
              previewUrl: frame.previewRenderUrl || frame.previewUrl || frame.url,
              isComposed: false,
              isPreviewAttempted: true,
              previewPhotoKey: guestAutoCapturePhotoKey,
              status: frame.slotCount ? 'Chưa ghép được preview' : 'Chưa có slot',
            });
          }

          publishCards();
          await wait(guestStep === 'capture' ? 32 : 12);
        }
        if (cancelled || guestFramePreviewRequestRef.current !== requestId) return;
        publishCards();

        const composedCount = guestFramePreviewsRef.current.filter((card) => card.isComposed).length;
        setFramePreviewStatus(composedCount > 0 ? '' : 'Chưa tạo được preview tự động, bạn vẫn có thể chọn từ thumbnail khung.');
      } catch (error) {
        console.warn('Không thể tạo preview khung tự động:', error);
        setFramePreviewStatus('Chưa tạo được preview tự động, bạn vẫn có thể chọn từ thumbnail khung.');
      } finally {
        if (!cancelled && guestFramePreviewRequestRef.current === requestId) {
          setIsBuildingFramePreviews(false);
        }
      }
    };

    const debounceMs = guestStep === 'capture' ? 140 : 0;
    const timerId = window.setTimeout(buildPreviews, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [guestAutoCaptureIndices, guestAutoCapturePhotoKey, guestFrameDisplayLibrary, guestFramePageIndex, guestStep, isPartnerMode]);

  const analyzeFrameProfile = async (frame, { force = false } = {}) => {
    if (!frame) return;
    if (frameProfiles[frame.name] && !force) {
      const confirmed = window.confirm(`Khung ${frame.name} đã có hồ sơ. Phúc có muốn phân tích lại và ghi đè không?`);
      if (!confirmed) return;
    }
    setAnalyzingFrameName(frame.name);
    setFrameProfileStatus(`Đang phân tích khung ${frame.name}…`);
    try {
      const prompt = `Analyze this photobooth frame and return one JSON object only. Do not include slot count. Schema: {"dominantColors":[{"hex":"#ffffff","tag":"white","weight":50}],"paletteTags":["pink"],"lighting":{"brightness":0,"contrast":0,"saturation":0,"warmth":0,"coolness":0},"vibes":["cute"],"concepts":["decorative"],"events":[],"scores":{"cute":0,"romantic":0,"vintage":0,"fantasy":0,"elegant":0,"minimal":0,"pastel":0,"energetic":0,"luxury":0,"fresh":0,"warm":0,"cool":0}}. Use English tags only. Scores are integers 0-100. No markdown.`;
      const aiResult = await callVisionProfileAi({ images: [frame.url], prompt });
      const localProfile = await analyzeImageLocal(frame.url, 'frame').catch(() => null);
      const profile = validateProfile(aiResult ? { ...aiResult, source: 'ai' } : localProfile, { source: aiResult ? 'ai' : 'local' });
      if (!profile) throw new Error('Invalid profile');
      const savedProfiles = await saveFrameProfileToServer(frame.name, profile);
      setFrameProfiles(savedProfiles || { ...frameProfiles, [frame.name]: profile });
      setFrameProfileStatus(`Đã phân tích khung ${frame.name}`);
    } catch {
      setFrameProfileStatus(`Không phân tích được khung ${frame.name}`);
    } finally {
      setAnalyzingFrameName('');
    }
  };

  const analyzeAllFrameProfiles = async () => {
    const overwrite = window.confirm('Phân tích toàn bộ khung. Khung đã có hồ sơ sẽ được hỏi/ghi đè theo lượt. Tiếp tục?');
    if (!overwrite) return;
    const results = await Promise.all(visibleFrameLibrary.map(async (frame) => {
      try {
        await analyzeFrameProfile(frame, { force: true });
        return true;
      } catch {
        return false;
      }
    }));
    const ok = results.filter(Boolean).length;
    const fail = results.length - ok;
    setFrameProfileStatus(`Phân tích toàn bộ xong: ${ok} thành công, ${fail} lỗi`);
  };

  const cleanupOrphanFrameProfiles = async () => {
    if (!window.confirm('Dọn hồ sơ khung không còn tồn tại?')) return;
    const data = await cleanupFrameProfilesOnServer();
    if (data?.profiles) setFrameProfiles(data.profiles);
    setFrameProfileStatus(`Đã dọn ${data?.removed?.length || 0} hồ sơ mồ côi`);
  };

  const selectGuestFrame = async (frame) => {
    if (isCommittingGuestFrames) return;

    if (guestStep !== 'frame' || isGuestStepLocked('frame')) {
      setGuestNotice('Khung đã được chốt rồi, mình giữ nguyên để ảnh ra thật mượt nha.');
      return;
    }

    const selectedFrameIndices = selectedGuestFrames.flatMap((item, index) => (areSameFrameChoice(item, frame) ? [index] : []));
    if (selectedFrameIndices.length > 0) {
      const removeIndex = selectedFrameIndices[selectedFrameIndices.length - 1];
      const nextFrames = selectedGuestFrames.filter((_, index) => index !== removeIndex);
      setSelectedGuestFrames(nextFrames);
      if (guestTransitionPrompt?.stepId === 'frame') setGuestTransitionPrompt(null);
      setGuestNotice(
        nextFrames.length > 0
          ? `Đã bỏ một lượt chọn khung này. Còn ${nextFrames.length}/${GUEST_FRAME_SELECTION_TARGET} khung, chọn thêm một khung nữa nha.`
          : `Đã bỏ chọn khung này. Chọn ${GUEST_FRAME_SELECTION_TARGET} khung xinh nhất nha.`,
      );
      return;
    }

    if (selectedGuestFrames.length >= GUEST_FRAME_SELECTION_TARGET) {
      const nextFrames = [...selectedGuestFrames.slice(0, GUEST_FRAME_SELECTION_TARGET - 1), frame];
      setSelectedGuestFrames(nextFrames);
      setGuestNotice('');
      window.setTimeout(() => {
        openGuestTransitionPrompt('frame', { frames: nextFrames });
      }, 120);
      return;
    }

    const nextFrames = [...selectedGuestFrames, frame];
    setSelectedGuestFrames(nextFrames);
    if (nextFrames.length >= GUEST_FRAME_SELECTION_TARGET) {
      setGuestNotice('');
      window.setTimeout(() => {
        openGuestTransitionPrompt('frame', { frames: nextFrames });
      }, 120);
    } else {
      setGuestNotice(`Đã chọn ${nextFrames.length}/${GUEST_FRAME_SELECTION_TARGET} khung. Chọn thêm một khung nữa nha.`);
    }
  };

  const duplicateSingleGuestFrameSelection = () => {
    if (isCommittingGuestFrames) return;
    if (guestStep !== 'frame' || isGuestStepLocked('frame')) {
      setGuestNotice('Khung đã được chốt rồi, mình giữ nguyên để ảnh ra thật mượt nha.');
      return;
    }
    const frame = selectedGuestFrames[0];
    if (!frame || selectedGuestFrames.length !== 1) return;

    const nextFrames = [frame, frame];
    setSelectedGuestFrames(nextFrames);
    setGuestNotice('');
    window.setTimeout(() => {
      openGuestTransitionPrompt('frame', { frames: nextFrames });
    }, 120);
  };

  const requestGuestFrameSelectionCommit = () => {
    if (isCommittingGuestFrames) return;
    if (selectedGuestFrames.length < GUEST_FRAME_SELECTION_TARGET) {
      setGuestNotice(`Chọn đủ ${GUEST_FRAME_SELECTION_TARGET} khung để in chung một tờ 13x18 nha.`);
      return;
    }
    openGuestTransitionPrompt('frame', { frames: selectedGuestFrames });
  };

  const pickGuestFramesForAutoCommit = () => {
    const pickedFrames = selectedGuestFrames.filter(Boolean).slice(0, GUEST_FRAME_SELECTION_TARGET);
    const addFrame = (frame) => {
      if (!frame || pickedFrames.length >= GUEST_FRAME_SELECTION_TARGET || pickedFrames.some((pickedFrame) => areSameFrameChoice(pickedFrame, frame))) return;
      pickedFrames.push(frame);
    };

    recommendedFrameCards.forEach((card) => addFrame(card.frame));
    framePreviewCards.forEach((card) => addFrame(card.frame));
    return pickedFrames.slice(0, GUEST_FRAME_SELECTION_TARGET);
  };

  const commitGuestFrameSelection = async (framesToCommit) => {
    const frames = (Array.isArray(framesToCommit) ? framesToCommit : [framesToCommit]).filter(Boolean).slice(0, GUEST_FRAME_SELECTION_TARGET);
    if (isCommittingGuestFrames) return;

    setGuestNotice('');
    setGuestTransitionPrompt(null);
    setGuestTimedWarningPopup(null);
    setGuestPreviewUrl('');
    if (frames.length < GUEST_FRAME_SELECTION_TARGET) {
      setGuestNotice(`Mình cần đủ ${GUEST_FRAME_SELECTION_TARGET} khung để lên một tờ in 13x18 nha.`);
      return;
    }

    setIsCommittingGuestFrames(true);
    try {
      setSelectedGuestFrames(frames);
      setGuestOutputMeta(null);
      setGuestShare(null);
      setGuestQrUrl('');
      setGuestShareStatus('');
      setGuestPrintStatus('');

      const autoCaptureIndices = guestAutoCaptureIndices.length > 0
        ? guestAutoCaptureIndices
        : getFirstCaptureIndices(capturedPhotos.length, Math.min(4, capturedPhotos.length));
      setSelectedCaptureIndices(autoCaptureIndices);

      const frameSlotChecks = await Promise.all(frames.map(async (frame) => {
        const renderUrl = frame.overlayRenderUrl || frame.overlayUrl || frame.previewRenderUrl || frame.previewUrl || frame.url;
        const displayUrl = frame.previewRenderUrl || frame.previewUrl || frame.url;
        const frameImage = await loadImage(renderUrl);
        const dimensions = { width: frameImage.naturalWidth, height: frameImage.naturalHeight };
        const slotMap = await getFramePreviewSlotMap(frame, dimensions, frameImage);
        const detectedZones = sortZonesNatural(slotMap.zones || []);
        return {
          frame,
          frameImage,
          dimensions,
          zones: detectedZones,
          detectionMode: slotMap.detectionMode || detectedZones[0]?.detectionMode || 'alpha',
          renderUrl,
          displayUrl,
          hasSlots: detectedZones.length > 0,
        };
      }));

      const missingSlotCheck = frameSlotChecks.find((item) => !item.hasSlots);
      if (missingSlotCheck) {
        setSelectedGuestFrames(frames.filter((frame) => !areSameFrameChoice(frame, missingSlotCheck.frame)).slice(0, GUEST_FRAME_SELECTION_TARGET - 1));
        setGuestNotice(`Khung "${missingSlotCheck.frame.name}" chưa có slot ảnh nên chưa thể ghép tự động. Bạn chọn bộ khung khác giúp mình nha.`);
        return;
      }

      const activeFrameAsset = frameSlotChecks[0];
      const activeFrame = {
        ...activeFrameAsset.frame,
        url: activeFrameAsset.displayUrl,
        previewUrl: activeFrameAsset.displayUrl,
        overlayUrl: activeFrameAsset.renderUrl,
        width: activeFrameAsset.dimensions.width,
        height: activeFrameAsset.dimensions.height,
        slotCount: activeFrameAsset.zones.length,
      };

      originalImgRef.current = activeFrameAsset.frameImage;
      lastLoadedFrameKeyRef.current = createFrameCacheKey(activeFrame.name, activeFrameAsset.dimensions.width, activeFrameAsset.dimensions.height);
      skipNextCacheWriteRef.current = false;
      setSelectedFrame(activeFrame);
      setOriginalFrame(activeFrameAsset.renderUrl);
      setFrameDimensions(activeFrameAsset.dimensions);
      setZones(activeFrameAsset.zones);
      setSelectedZoneId(activeFrameAsset.zones[0]?.id || null);
      setSlotEditTool('select');
      setDetectionMode(activeFrameAsset.detectionMode);
      setPhotos([]);
      setSelectedPhotoId(null);
      setSlotAssignments([]);
      setUploadError('');
      setEditorZoom(1);
      setInteractionMode('move');
      setCacheStatus(`Đã nhận ${activeFrameAsset.zones.length} slot trong suốt`);
      setPhotoAnalysisStatus(`Khung này có ${activeFrameAsset.zones.length} slot, vui lòng chọn ảnh`);

      commitGuestStep('frame');
      goToGuestStep('select');
    } catch (error) {
      console.warn('Không thể chốt khung đã chọn:', error);
      setGuestNotice('Có lỗi khi chuẩn bị khung. Bạn bấm chọn lại hoặc đổi khung khác giúp mình nha.');
    } finally {
      setIsCommittingGuestFrames(false);
    }
  };

  const toggleGuestPhotoSelection = (index) => {
    if (!selectedFrame) {
      setGuestNotice('Hãy chọn khung trước khi chọn ảnh.');
      return;
    }
    if (zones.length === 0) {
      setGuestNotice('Khung này chưa có slot ảnh. Hãy chọn khung khác hoặc dùng chế độ cộng sự để sửa slot.');
      return;
    }

    if (selectedCaptureIndices.includes(index)) {
      setSelectedCaptureIndices(selectedCaptureIndices.filter((item) => item !== index));
      return;
    }
    if (selectedCaptureIndices.length >= zones.length) {
      setGuestNotice(`Khung này có ${zones.length} slot, bạn chỉ chọn tối đa ${zones.length} ảnh.`);
      return;
    }

    setGuestNotice('');
    const nextSelection = [...selectedCaptureIndices, index];
    setSelectedCaptureIndices(nextSelection);
    if (nextSelection.length >= zones.length) {
      window.setTimeout(() => openGuestTransitionPrompt('select', { captureIndices: nextSelection }), 260);
    }
  };

  const requestCreateGuestResult = (captureIndicesOverride = null) => {
    const captureIndicesForResult = captureIndicesOverride || selectedCaptureIndices;
    if (!selectedFrame || !originalImgRef.current || frameDimensions.width === 0) {
      setGuestNotice('Hãy chọn khung trước khi rửa ảnh.');
      return;
    }
    if (zones.length === 0) {
      setGuestNotice('Khung này chưa có slot ảnh nên chưa thể ghép.');
      return;
    }
    if (captureIndicesForResult.length === 0) {
      setGuestNotice('Hãy chọn ít nhất 1 ảnh để ghép vào khung.');
      return;
    }
    if (isGuestStepLocked('select')) {
      setGuestNotice('Bộ ảnh đã chốt rồi, mình qua phần căn chỉnh tiếp nha.');
      return;
    }
    openGuestTransitionPrompt('select', { captureIndices: captureIndicesForResult });
  };

  const pickGuestCaptureIndicesForAutoCommit = () => {
    if (selectedCaptureIndices.length > 0) return selectedCaptureIndices;
    if (guestAutoCaptureIndices.length > 0) return guestAutoCaptureIndices;
    const targetCount = Math.min(
      capturedPhotos.length,
      Math.max(1, requiredGuestPhotoCount || Math.min(4, capturedPhotos.length)),
    );
    return getFirstCaptureIndices(capturedPhotos.length, targetCount);
  };

  const buildGuestFrameDraft = async (frame, captureIndicesForResult, draftIndex = 0) => {
    const renderUrl = frame.overlayUrl || frame.previewUrl || frame.url;
    const displayUrl = frame.previewUrl || frame.url;
    const frameImage = await loadImage(renderUrl);
    const dimensions = { width: frameImage.naturalWidth, height: frameImage.naturalHeight };
    const { zones: draftZones } = await getFramePreviewSlotMap(frame, dimensions, frameImage);
    const normalizedZones = sortZonesNatural(draftZones);
    if (!normalizedZones.length) throw new Error('Frame has no slots');
    const cleanOverlayUrl = createFrameOverlayCanvasFromImage(frameImage, dimensions).toDataURL('image/png');

    const draftResults = await Promise.all(normalizedZones.map(async (zone, index) => {
      const sourceSelectionIndex = index;
      const capturedPhoto = capturedPhotos[captureIndicesForResult[sourceSelectionIndex]];
      if (!capturedPhoto) return null;
      const img = await loadImage(capturedPhoto.url);
      const placement = fitPhotoToSlot(img, zone);
      const subject = placement.subject;
      const photoId = `guest-${Date.now()}-${draftIndex}-${index}`;

      return {
        photo: {
          id: photoId,
          name: capturedPhoto.name,
          url: capturedPhoto.url,
          x: placement.x,
          y: placement.y,
          scale: placement.scale,
          rotation: placement.rotation,
          fitMode: placement.fitMode,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          slotIndex: index,
          subject: placement.subject,
        },
        assignment: {
          slotIndex: index,
          photoId,
          method: subject.method,
          faceCount: subject.faceCount,
          sourceSelectionIndex,
          filledFromNearest: false,
        },
      };
    }));
    const validDraftResults = draftResults.filter(Boolean);
    const draftPhotos = validDraftResults.map((result) => result.photo);
    const draftAssignments = validDraftResults.map((result) => result.assignment);

    const draftSlotEdits = draftPhotos.map((photo) => {
      const assignedZone = normalizedZones[photo.slotIndex];
      const baseTransform = extractTransformFromPlacement(photo, { naturalWidth: photo.naturalWidth, naturalHeight: photo.naturalHeight }, assignedZone);
      return {
        ...photo,
        photoId: photo.id,
        baseX: baseTransform.x,
        baseY: baseTransform.y,
        baseScale: baseTransform.scale,
        baseRotation: baseTransform.rotation || 0,
        flipX: false,
        flipY: false,
        minScale: baseTransform.minScale,
        maxScale: baseTransform.maxScale,
        warning: '',
      };
    });

    return {
      id: `${getFrameLibraryKey(frame)}-${draftIndex}`,
      frame: {
        ...frame,
        url: displayUrl,
        previewUrl: displayUrl,
        overlayUrl: renderUrl,
        width: dimensions.width,
        height: dimensions.height,
      },
      originalFrameUrl: renderUrl,
      cleanOverlayUrl,
      originalImage: frameImage,
      frameDimensions: dimensions,
      zones: normalizedZones,
      slotEdits: draftSlotEdits,
      slotAssignments: draftAssignments,
    };
  };

  const activateGuestFrameDraft = (draftIndex) => {
    const draft = guestFrameDrafts[draftIndex];
    if (!draft) return;
    setGuestFrameDrafts((currentDrafts) => currentDrafts.map((item, index) => (
      index === selectedAdjustFrameIndex
        ? { ...item, slotEdits, slotAssignments }
        : item
    )));
    setSelectedAdjustFrameIndex(draftIndex);
    setSelectedFrame(draft.frame);
    setOriginalFrame(draft.cleanOverlayUrl || draft.originalFrameUrl);
    originalImgRef.current = draft.originalImage;
    setFrameDimensions(draft.frameDimensions);
    setZones(draft.zones);
    setSlotEdits(draft.slotEdits);
    setSlotAssignments(draft.slotAssignments || []);
    setPhotos(draft.slotEdits.map(slotEditToPhoto));
    setSelectedAdjustSlotIndex(draft.slotEdits[0]?.slotIndex || 0);
    setSelectedPhotoId(draft.slotEdits[0]?.photoId || null);
    setAdjustWarning('');
  };

  const createGuestResult = async (captureIndicesOverride = null, frameOverride = null) => {
    const captureIndicesForResult = captureIndicesOverride || selectedCaptureIndices;
    const frameForResult = frameOverride?.frame || selectedFrame;
    const originalImageForResult = frameOverride?.originalImage || originalImgRef.current;
    const dimensionsForResult = frameOverride?.frameDimensions || frameDimensions;
    const zonesForResult = frameOverride?.zones || zones;

    if (!frameForResult || !originalImageForResult || dimensionsForResult.width === 0) {
      setGuestNotice('Hãy chọn khung trước khi rửa ảnh.');
      return;
    }
    if (zonesForResult.length === 0) {
      setGuestNotice('Khung này chưa có slot ảnh nên chưa thể ghép.');
      return;
    }
    if (captureIndicesForResult.length === 0) {
      setGuestNotice('Hãy chọn ít nhất 1 ảnh để ghép vào khung.');
      return;
    }

    setIsGeneratingGuestResult(true);
    setGuestTransitionPrompt(null);
    setGuestTimedWarningPopup(null);
    setGuestPreviewUrl('');
    commitGuestStep('select');

    try {
      const framesForAdjust = (selectedGuestFrames.length > 0 ? selectedGuestFrames : [frameForResult]).filter(Boolean).slice(0, GUEST_FRAME_SELECTION_TARGET);
      const nextDrafts = await Promise.all(framesForAdjust.map((frame, index) =>
        buildGuestFrameDraft(frame, captureIndicesForResult, index),
      ));
      const activeDraft = nextDrafts[0];
      if (!activeDraft) throw new Error('No frame draft');
      const shouldSkipAdjust = false;

      setGuestFrameDrafts(nextDrafts);
      setSelectedAdjustFrameIndex(0);
      setSelectedFrame(activeDraft.frame);
      setOriginalFrame(activeDraft.cleanOverlayUrl || activeDraft.originalFrameUrl);
      originalImgRef.current = activeDraft.originalImage;
      setFrameDimensions(activeDraft.frameDimensions);
      setZones(activeDraft.zones);
      setPhotos(activeDraft.slotEdits.map(slotEditToPhoto));
      setSlotEdits(activeDraft.slotEdits);
      setSlotAssignments(activeDraft.slotAssignments);
      setSelectedPhotoId(activeDraft.slotEdits[0]?.photoId || null);
      setSelectedAdjustSlotIndex(0);
      setPhotoAnalysisStatus('Đã căn ảnh phủ kín slot trong suốt');
      setGuestPreviewUrl('');
      setGuestOutputMeta(null);
      setGuestShare(null);
      setGuestQrUrl('');
      setGuestShareStatus('');
      setGuestPrintStatus('');
      setGuestNotice('');
      guestAdjustAutoFinishRef.current = false;

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }

      if (shouldSkipAdjust) {
        setPhotoAnalysisStatus('Đã ghép ảnh vào các slot trong suốt');
        await finishGuestAdjustment({
          draftsOverride: nextDrafts,
          selectedDraftIndexOverride: 0,
          slotEditsOverride: activeDraft.slotEdits,
          slotAssignmentsOverride: activeDraft.slotAssignments,
          selectedFrameOverride: activeDraft.frame,
        });
        return;
      }

      goToGuestStep('adjust');
    } catch (error) {
      console.error('Không thể tạo ảnh photobooth:', error);
      setGuestNotice('Có lỗi khi rửa ảnh. Hãy thử chọn lại ảnh hoặc đổi khung khác.');
      setGuestCommittedStepIndex((current) => Math.min(current, getGuestStepIndex('frame')));
      goToGuestStep('select', 0, { force: true });
    } finally {
      setIsGeneratingGuestResult(false);
    }
  };

  const renderGuestComposition = async ({ crop = true } = {}) => {
    const normalizedZones = sortZonesNatural(zones);
    const overlayCanvas = renderFrameOverlayCanvas(normalizedZones);
    if (!overlayCanvas) throw new Error('Frame overlay unavailable');
    const canvas = document.createElement('canvas');
    canvas.width = frameDimensions.width;
    canvas.height = frameDimensions.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const compositionItems = await Promise.all(slotEdits.map(async (edit) => ({
      edit,
      img: await loadImage(edit.url),
    })));

    for (const { edit, img } of compositionItems) {
      const assignedZone = normalizedZones[edit.slotIndex];
      if (!assignedZone) continue;
      drawImageIntoTransparentSlot(ctx, img, edit, assignedZone);
    }

    ctx.drawImage(overlayCanvas, 0, 0);
    return crop ? cropCanvasToBounds(canvas, getGuestOutputBounds(overlayCanvas, normalizedZones)) : canvas;
  };

  const renderGuestFrameDraftComposition = async (draft) => {
    if (!draft?.originalImage || !draft?.frameDimensions || !Array.isArray(draft.zones)) {
      throw new Error('Frame draft unavailable');
    }
    const normalizedZones = sortZonesNatural(draft.zones);
    const overlayCanvas = createFrameOverlayCanvasFromImage(draft.originalImage, draft.frameDimensions);
    const canvas = document.createElement('canvas');
    canvas.width = draft.frameDimensions.width;
    canvas.height = draft.frameDimensions.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const draftCompositionItems = await Promise.all((draft.slotEdits || []).map(async (edit) => ({
      edit,
      img: await loadImage(edit.url),
    })));

    for (const { edit, img } of draftCompositionItems) {
      const assignedZone = normalizedZones[edit.slotIndex];
      if (!assignedZone) continue;
      drawImageIntoTransparentSlot(ctx, img, edit, assignedZone);
    }

    ctx.drawImage(overlayCanvas, 0, 0);
    return canvas;
  };

  const renderAutoGuestFrameComposition = async (frame, captureIndicesForResult) => {
    const frameImage = await loadImage(frame.overlayUrl || frame.previewUrl || frame.url);
    const dimensions = { width: frameImage.naturalWidth, height: frameImage.naturalHeight };
    const { zones: frameZones } = await getFramePreviewSlotMap(frame, dimensions, frameImage);
    const normalizedZones = sortZonesNatural(frameZones);
    if (!normalizedZones.length) throw new Error('Frame has no slots');

    const overlayCanvas = createFrameOverlayCanvasFromImage(frameImage, dimensions);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const autoCompositionItems = await Promise.all(normalizedZones.map(async (zone, index) => {
      const sourceSelectionIndex = index;
      const capturedPhoto = capturedPhotos[captureIndicesForResult[sourceSelectionIndex]];
      if (!capturedPhoto) return null;
      const img = await loadImage(capturedPhoto.url);
      const placement = fitPhotoToSlot(img, zone);
      return { zone, img, placement };
    }));

    for (const item of autoCompositionItems) {
      if (!item) continue;
      const { zone, img, placement } = item;
      drawImageIntoTransparentSlot(ctx, img, placement, zone);
    }

    ctx.drawImage(overlayCanvas, 0, 0);
    return canvas;
  };

  const updateSlotEdit = (slotIndex, updates) => {
    if (!canEditGuestAdjustment) return;
    const zone = zones[slotIndex];
    if (!zone) return;
    setSlotEdits((prev) => prev.map((edit) => {
      if (edit.slotIndex !== slotIndex) return edit;
      const next = normalizeSlotEditTransform(edit, zone, updates);
      setAdjustWarning(next.warning || '');
      return next;
    }));
  };

  const resetSlotEdit = (slotIndex) => {
    if (!canEditGuestAdjustment) return;
    const edit = slotEdits.find((item) => item.slotIndex === slotIndex);
    if (!edit) return;
    updateSlotEdit(slotIndex, extractBaseTransform(edit));
  };

  const autoFitSlotEdit = async (slotIndex) => {
    if (!canEditGuestAdjustment) return;
    const edit = slotEdits.find((item) => item.slotIndex === slotIndex);
    const zone = zones[slotIndex];
    if (!edit || !zone) return;
    const img = await loadImage(edit.url);
    const placement = edit.fitMode === 'contain'
      ? fitPhotoInsideSlot(img, zone)
      : fitPhotoToSlot(img, zone);
    const subject = placement.subject;
    updateSlotEdit(slotIndex, { x: placement.x, y: placement.y, scale: placement.scale, rotation: placement.rotation || 0, subject });
  };

  const refitSlotEditToZone = (edit, targetSlotIndex) => {
    const zone = zones[targetSlotIndex];
    if (!edit || !zone) return edit;
    const imgInfo = {
      naturalWidth: edit.naturalWidth,
      naturalHeight: edit.naturalHeight,
    };
    const subject = edit.subject || createSlotFitSubject(imgInfo, edit.fitMode === 'contain' ? 'slot-contain' : 'slot-cover');
    const placement = edit.fitMode === 'contain' ? fitPhotoInsideSlot(imgInfo, zone) : fitPhotoToSlot(imgInfo, zone);
    const baseTransform = extractTransformFromPlacement(placement, imgInfo, zone);

    return {
      ...edit,
      slotIndex: targetSlotIndex,
      x: baseTransform.x,
      y: baseTransform.y,
      scale: baseTransform.scale,
      rotation: baseTransform.rotation || 0,
      baseX: baseTransform.x,
      baseY: baseTransform.y,
      baseScale: baseTransform.scale,
      baseRotation: baseTransform.rotation || 0,
      fitMode: baseTransform.fitMode,
      flipX: false,
      flipY: false,
      minScale: baseTransform.minScale,
      maxScale: baseTransform.maxScale,
      warning: '',
      subject,
    };
  };

  const swapSlotEdits = (fromSlotIndex, toSlotIndex) => {
    if (!canEditGuestAdjustment) return;
    if (fromSlotIndex === toSlotIndex) return;
    setSlotEdits((prev) => {
      const fromEdit = prev.find((item) => item.slotIndex === fromSlotIndex);
      const toEdit = prev.find((item) => item.slotIndex === toSlotIndex);
      if (!fromEdit || !toEdit) return prev;

      return prev
        .map((edit) => {
          if (edit.slotIndex === fromSlotIndex) return refitSlotEditToZone(toEdit, fromSlotIndex);
          if (edit.slotIndex === toSlotIndex) return refitSlotEditToZone(fromEdit, toSlotIndex);
          return edit;
        })
        .toSorted((a, b) => a.slotIndex - b.slotIndex);
    });
    setSlotAssignments((prev) => prev.map((assignment) => {
      if (assignment.slotIndex === fromSlotIndex) {
        const target = slotEdits.find((item) => item.slotIndex === toSlotIndex);
        return target ? { ...assignment, photoId: target.photoId, swapped: true } : assignment;
      }
      if (assignment.slotIndex === toSlotIndex) {
        const source = slotEdits.find((item) => item.slotIndex === fromSlotIndex);
        return source ? { ...assignment, photoId: source.photoId, swapped: true } : assignment;
      }
      return assignment;
    }));
    setSelectedAdjustSlotIndex(toSlotIndex);
    setAdjustWarning('');
  };

  const startAdjustDrag = (event, slotIndex, source = 'full') => {
    if (!canEditGuestAdjustment) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedAdjustSlotIndex(slotIndex);
    setAdjustDrag({ slotIndex, source, startX: event.clientX, startY: event.clientY });
  };

  const requestFinishGuestAdjustment = () => {
    if (!slotEdits.length) {
      setGuestNotice('Chưa có ảnh để hoàn tất chỉnh sửa.');
      return;
    }
    if (isGuestStepLocked('adjust')) {
      setGuestNotice('Bản chỉnh đã chốt rồi, mình qua thành quả luôn nha.');
      return;
    }
    openGuestTransitionPrompt('adjust');
  };

  const sendGuestPrintJob = async (dataUrl, { sessionId = guestSessionIdRef.current, retry = false } = {}) => {
    if (!dataUrl || isGuestPrinting || sessionId !== guestSessionIdRef.current) return false;
    setIsGuestPrinting(true);
    setGuestPrintFallbackAvailable(false);
    setGuestPrintStatus(retry ? 'Đang thử gửi lệnh in lại…' : 'Đang gửi lệnh in tự động…');

    try {
      const printResponse = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const printResult = printResponse.ok ? await printResponse.json() : null;
      if (sessionId !== guestSessionIdRef.current) return false;
      if (printResult?.ok) {
        setGuestPrintStatus(`Đã in thành công. Phiên mới sẽ bắt đầu sau ${GUEST_AUTO_NEW_SESSION_SECONDS} giây.`);
        setGuestPrintFallbackAvailable(false);
        startGuestNewSessionCountdown();
        return true;
      }
      throw new Error(printResult?.error || 'In tự động thất bại.');
    } catch (printError) {
      if (sessionId !== guestSessionIdRef.current) return false;
      console.warn('Lỗi in tự động:', printError);
      setGuestPrintStatus('In tự động chưa thành công. Kiểm tra máy in rồi bấm thử in lại, hoặc dùng in thủ công nếu cần.');
      setGuestPrintFallbackAvailable(true);
      return false;
    } finally {
      if (sessionId === guestSessionIdRef.current) {
        setIsGuestPrinting(false);
      }
    }
  };

  const finishGuestAdjustment = async ({
    draftsOverride = null,
    selectedDraftIndexOverride = selectedAdjustFrameIndex,
    slotEditsOverride = slotEdits,
    slotAssignmentsOverride = slotAssignments,
    selectedFrameOverride = selectedFrame,
  } = {}) => {
    const sessionId = guestSessionIdRef.current;
    setIsGeneratingGuestResult(true);
    setGuestShareStatus('');
    setGuestPrintStatus('');
    setGuestPrintFallbackAvailable(false);
    try {
      const activeSlotEdits = slotEditsOverride || [];
      const activeSlotAssignments = slotAssignmentsOverride || [];
      const draftSource = Array.isArray(draftsOverride) && draftsOverride.length > 0 ? draftsOverride : guestFrameDrafts;
      const draftsForPrint = (draftSource.length > 0 ? draftSource : [{
        frame: selectedFrameOverride,
        originalImage: originalImgRef.current,
        originalFrameUrl: originalFrame,
        frameDimensions,
        zones,
        slotEdits: activeSlotEdits,
        slotAssignments: activeSlotAssignments,
      }]).map((draft, index) => (
        index === selectedDraftIndexOverride
          ? { ...draft, slotEdits: activeSlotEdits, slotAssignments: activeSlotAssignments }
          : draft
      )).slice(0, GUEST_FRAME_SELECTION_TARGET);
      const frameCanvases = await Promise.all(draftsForPrint.map((draft) => renderGuestFrameDraftComposition(draft)));
      const outputCanvas = createGuestPrintSheetCanvas(frameCanvases);
      const outputUrl = outputCanvas.toDataURL('image/png');
      const outputMeta = {
        frameName: selectedFrameOverride?.name || '',
        frameNames: draftsForPrint.flatMap((draft) => (draft.frame?.name ? [draft.frame.name] : [])),
        frameWidth: STANDARD_PRINT_FRAME.width,
        frameHeight: STANDARD_PRINT_FRAME.height,
        sheetWidth: PRINT_SHEET.width,
        sheetHeight: PRINT_SHEET.height,
        sheetSizeCm: { width: 13, height: 18 },
        sheetOrientation: 'portrait',
        frameSizeCm: { width: 6.2, height: 8.7 },
        cutGapCm: PRINT_CUT_GAP / PRINT_PIXELS_PER_CM,
        selectedCaptureIndices,
        frameDrafts: draftsForPrint.map((draft) => ({
          frameName: draft.frame?.name || '',
          slotEdits: (draft.slotEdits || []).map(({ url, ...edit }) => edit),
          slotAssignments: draft.slotAssignments || [],
        })),
        createdAt: new Date().toISOString(),
      };
      if (sessionId !== guestSessionIdRef.current) return;
      setPhotos(activeSlotEdits.map(slotEditToPhoto));
      setGuestPreviewUrl(outputUrl);
      setGuestOutputMeta(outputMeta);
      setGuestShare(null);
      setGuestQrUrl('');
      setGuestNotice('');
      commitGuestStep('adjust');
      goToGuestStep('result');
      setGuestTransitionPrompt(null);
      setIsGeneratingGuestResult(false);

      setGuestShareStatus('Đang tạo mã QR tải ảnh…');
      const sharePayload = createGuestOutputPayload({
        printDataUrl: outputUrl,
        frameCanvases,
        draftsForPrint,
        capturedPhotosForSave: capturedPhotos,
        outputMeta,
      });
      const shareData = await saveGuestOutputToServer(sharePayload);
      if (sessionId !== guestSessionIdRef.current) return;
      const shareUrl = resolveGuestShareUrl(shareData);
      if (shareUrl) {
        const isHttpsShare = isHttpsShareUrl(shareUrl);
        const isLoopbackShare = isLoopbackShareOrigin(shareUrl);
        const qrDataUrl = !isLoopbackShare ? createQrCodeDataUrl(shareUrl) : '';
        setGuestShare({
          id: shareData.id,
          shareUrl,
          sharePath: shareData.sharePath,
          lanShareUrls: shareData.lanShareUrls || [],
          expiresAt: shareData.expiresAt || '',
          ttlSeconds: shareData.ttlSeconds || 0,
          savedFiles: shareData.savedFiles || null,
        });
        setGuestQrUrl(qrDataUrl);
        if (!qrDataUrl && isLoopbackShare) {
          setGuestShareStatus('Link hiện tại chỉ mở trên laptop này. Hãy chạy kiosk/server ở chế độ LAN hoặc bật Cloudflare tunnel để tạo QR cho khách.');
        } else if (!isHttpsShare) {
          setGuestShareStatus('Mã QR LAN đã sẵn sàng. Điện thoại cần dùng cùng Wi-Fi với laptop để tải ảnh.');
        } else {
          setGuestShareStatus(
            qrDataUrl
              ? 'Mã QR tải ảnh đã sẵn sàng. Link có hiệu lực trong 2 giờ.'
              : 'Đã tạo link tải, nhưng link quá dài nên không tạo được mã QR.',
          );
        }
      } else {
        setGuestShare(null);
        setGuestQrUrl('');
        setGuestShareStatus('Chưa tạo được mã QR/link tải. Bản in vẫn sẽ được gửi tới máy in.');
      }

      await sendGuestPrintJob(outputUrl, { sessionId });
    } catch (error) {
      console.error('Không thể hoàn tất chỉnh sửa:', error);
      if (sessionId === guestSessionIdRef.current) {
        setGuestNotice('Có lỗi khi hoàn tất chỉnh sửa. Hãy thử lại.');
      }
    } finally {
      if (sessionId === guestSessionIdRef.current) {
        setIsGeneratingGuestResult(false);
      }
    }
  };

  const closeGuestTransitionPrompt = () => {
    if (guestTransitionBusy) return;
    setGuestTransitionPrompt(null);
  };

  const confirmGuestTransitionPrompt = async () => {
    if (!guestTransitionPrompt || guestTransitionBusy) return;
    const prompt = guestTransitionPrompt;
    setGuestTransitionBusy(true);
    try {
      if (prompt.stepId === 'frame') {
        await commitGuestFrameSelection(prompt.frames || prompt.frame);
      } else if (prompt.stepId === 'capture') {
        finishCaptureEarly();
      } else if (prompt.stepId === 'select') {
        await createGuestResult(prompt.captureIndices);
      } else {
        await finishGuestAdjustment();
      }
      setGuestTransitionPrompt(null);
    } finally {
      setGuestTransitionBusy(false);
    }
  };

  const downloadGuestPhoto = () => {
    if (!guestPreviewUrl) return;
    const link = document.createElement('a');
    link.download = `${selectedFrame?.name?.replace(/\.[^.]+$/, '') || 'pink-pop'}-13x18-${Date.now()}.png`;
    link.href = guestPreviewUrl;
    link.click();
  };

  const printGuestPhoto = async () => {
    if (!guestPreviewUrl) return;
    await sendGuestPrintJob(guestPreviewUrl, { retry: true });
  };

  const openGuestBrowserPrintFallback = () => {
    if (!guestPreviewUrl) return;
    const didOpenPrint = printGuestImageUrl(guestPreviewUrl);
    setGuestPrintStatus(
      didOpenPrint
        ? 'Đã mở hộp thoại in trình duyệt. Sau khi in thủ công xong, bấm Bắt đầu lại để vào phiên mới.'
        : 'Trình duyệt đang chặn popup. Hãy cho phép popup rồi thử lại.',
    );
  };

  const copyGuestShareLink = async () => {
    const shareUrl = guestShare?.shareUrl;
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setGuestShareStatus('Đã copy link tải ảnh.');
      setIsCopiedShareLink(true);
      setTimeout(() => setIsCopiedShareLink(false), 2000);
    } catch {
      setGuestShareStatus('Không copy tự động được. Bạn có thể mở link dưới mã QR.');
    }
  };

  const resetGuestFlow = () => {
    guestSessionIdRef.current += 1;
    clearGuestNewSessionTimer();
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setGuestStep('hero');
    setVisibleGuestStep('hero');
    setGuestCommittedStepIndex(-1);
    setGuestTransitionPrompt(null);
    setGuestTransitionBusy(false);
    setGuestTimedWarningPopup(null);
    setIsGuestTimerPaused(false);
    guestTimerPausedTotalMsRef.current = 0;
    guestTimerPauseStartedAtRef.current = null;
    guestTimedWarningShownKeysRef.current.clear();
    guestTimedAutoAdvanceKeysRef.current.clear();
    capturePausedRef.current = false;
    setCapturedPhotos([]);
    setSelectedCaptureIndices([]);
    setGuestAutoCaptureIndices([]);
    setSelectedGuestFrames([]);
    setGuestFramePreviews([]);
    guestFramePreviewsRef.current = [];
    setGuestFramePageIndex(0);
    setIsBuildingFramePreviews(false);
    setIsCommittingGuestFrames(false);
    setFramePreviewStatus('');
    capturedPhotosCountRef.current = 0;
    captureBusyRef.current = false;
    setCaptureCountdown(null);
    const initialBudgets = createGuestStepBudgets();
    setGuestStepBudgets(initialBudgets);
    setCaptureSessionSecondsLeft(Math.ceil(initialBudgets.capture));
    setNextCaptureSecondsLeft(GUEST_CAPTURE_INTERVAL_SECONDS);
    setIsLockedCaptureRunning(false);
    setGuestPreviewUrl('');
    setGuestOutputMeta(null);
    setGuestShare(null);
    setGuestQrUrl('');
    setGuestShareStatus('');
    setGuestPrintStatus('');
    setIsGuestPrinting(false);
    setGuestPrintFallbackAvailable(false);
    setGuestFrameDrafts([]);
    setSelectedAdjustFrameIndex(0);
    setSlotEdits([]);
    setSelectedAdjustSlotIndex(0);
    setAdjustWarning('');
    setGuestNotice('');
    guestAiAnalysisStartedRef.current = false;
    setGuestPhotoProfiles([]);
    setGuestSessionProfile(null);
    guestAiAnalysisStartedRef.current = false;
    setBeautyFilterSettings(DEFAULT_BEAUTY_FILTER_SETTINGS);
    setActiveBeautyPresetId(DEFAULT_BEAUTY_FILTER_SETTINGS.id);
    setPhotos([]);
    setSlotAssignments([]);
    setSelectedPhotoId(null);
    setSelectedFrame(null);
    setOriginalFrame(null);
    setFrameDimensions({ width: 0, height: 0 });
    setZones([]);
    guestAdjustAutoFinishRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCanvasBackgroundStyle = () => {
    if (canvasBg === 'dark') return { backgroundColor: '#1e293b' };
    if (canvasBg === 'light') return { backgroundColor: '#ffffff' };
    return {
      backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 25% 50%, #e5e7eb 50% 75%, #ffffff 75% 100%)',
      backgroundPosition: '0 0, 10px 10px',
      backgroundSize: '20px 20px',
    };
  };

  const frameRatio = frameDimensions.height > 0 ? (frameDimensions.width / frameDimensions.height).toFixed(4) : 1;
  const slotNudgeStep = Math.max(4, Math.round(Math.min(frameDimensions.width || 0, frameDimensions.height || 0) * 0.008));
  const slotResizeStep = Math.max(8, Math.round(Math.min(frameDimensions.width || 0, frameDimensions.height || 0) * 0.016));
  const editorZoomPercent = Math.round(editorZoom * 100);
  const editorMaxWidth = `min(${Math.round(920 * editorZoom)}px, calc(88vh * ${frameRatio} * ${editorZoom}))`;
  const handleEditorWheel = (event) => {
    if (!originalFrame || !event.ctrlKey) return;
    event.preventDefault();
    setEditorZoom((prev) => clampZoom(prev + (event.deltaY < 0 ? 0.15 : -0.15)));
  };

  const requiredGuestPhotoCount = zones.length;
  const hasEnoughGuestSetup = selectedFrame && requiredGuestPhotoCount > 0;
  const activeBeautyPreset = BEAUTY_FILTER_PRESETS.find((preset) => preset.id === activeBeautyPresetId);
  const selectedGuestFrameCount = selectedGuestFrames.length;
  const getSelectedGuestFrameIndices = (frame) =>
    selectedGuestFrames.flatMap((selectedFrame, index) => (areSameFrameChoice(selectedFrame, frame) ? [index] : []));
  const activeAdjustDraft = guestFrameDrafts[selectedAdjustFrameIndex] || null;
  const visibleGuestStepIndex = GUEST_STEP_ORDER.indexOf(visibleGuestStep);
  const guestProgress = visibleGuestStepIndex < 0 ? 0 : ((visibleGuestStepIndex + 1) / GUEST_STEP_ORDER.length) * 100;
  const isCaptureUnlocked = visibleGuestStepIndex >= GUEST_STEP_ORDER.indexOf('capture');
  const isCaptureLocked = isGuestStepLocked('capture');
  const hasFinishedGuestCapture = isGuestStepLocked('capture') && capturedPhotos.length >= minGuestPhotosToContinue;
  const canFinishCaptureEarly = guestStep === 'capture' && !isCaptureLocked && capturedPhotos.length >= minGuestPhotosToContinue;
  const isFrameUnlocked = visibleGuestStepIndex >= GUEST_STEP_ORDER.indexOf('frame') && hasFinishedGuestCapture;
  const isSelectUnlocked =
    visibleGuestStepIndex >= GUEST_STEP_ORDER.indexOf('select') &&
    hasFinishedGuestCapture &&
    Boolean(hasEnoughGuestSetup);
  const isAdjustUnlocked = visibleGuestStepIndex >= GUEST_STEP_ORDER.indexOf('adjust') && slotEdits.length > 0;
  const isResultUnlocked = visibleGuestStepIndex >= GUEST_STEP_ORDER.indexOf('result') && Boolean(guestPreviewUrl || isGeneratingGuestResult);
  const guestShareExpiryText = (() => {
    if (!guestShare?.shareUrl) return '';
    const expiresAtMs = Date.parse(guestShare.expiresAt || '');
    if (Number.isFinite(expiresAtMs)) {
      return `Link còn hiệu lực đến ${new Date(expiresAtMs).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })}`;
    }
    if (guestShare.ttlSeconds) {
      const hours = Math.max(1, Math.round(guestShare.ttlSeconds / 3600));
      return `Link còn hiệu lực ${hours} giờ`;
    }
    return 'Link còn hiệu lực trong 2 giờ';
  })();
  const isFrameLocked = isGuestStepLocked('frame');
  const isSelectLocked = isGuestStepLocked('select');
  const isAdjustLocked = isGuestStepLocked('adjust');
  const activeGuestTimerConfig = GUEST_TIMED_STEPS[guestStep];
  const guestTimedStepDuration = guestStepBudgets[guestStep] || 0;
  const hasActiveGuestStepTimer = Boolean(activeGuestTimerConfig && guestStepStartedAt && guestStepTimerStepId === guestStep);
  const activeGuestPauseMs =
    guestTimerPauseStartedAtRef.current
      ? Math.max(0, guestTimerNow - guestTimerPauseStartedAtRef.current)
      : 0;
  const guestTimedStepElapsedSeconds =
    hasActiveGuestStepTimer
      ? Math.min(
        guestTimedStepDuration,
        Math.max(
          0,
          Math.floor((guestTimerNow - guestStepStartedAt - guestTimerPausedTotalMsRef.current - activeGuestPauseMs) / 1000),
        ),
      )
      : 0;
  const guestTimedStepSecondsLeft = activeGuestTimerConfig
    ? Math.max(0, guestTimedStepDuration - guestTimedStepElapsedSeconds)
    : 0;

  // Keep latest ref up to date
  latestGuestTimedStepSecondsLeftRef.current = guestTimedStepSecondsLeft;

  const guestAggregateTimerActive = GUEST_TOTAL_TIMER_STEPS.includes(guestStep) && !guestPreviewUrl && !guestOutputMeta;
  const getGuestAggregateStepSecondsLeft = (stepId) => {
    if (stepId === 'capture') {
      if (guestStep !== 'capture') return 0;
      return captureSessionSecondsLeft;
    }
    if (guestStep === stepId) return guestTimedStepSecondsLeft;
    if (isGuestStepLocked(stepId)) return 0;
    return guestStepBudgets[stepId] || 0;
  };
  const guestAggregateSecondsLeft = guestAggregateTimerActive
    ? GUEST_TOTAL_TIMER_STEPS.reduce((total, stepId) => total + getGuestAggregateStepSecondsLeft(stepId), 0)
    : 0;
  const isAdjustTimeOver =
    guestStep === 'adjust' &&
    Boolean(activeGuestTimerConfig) &&
    guestTimedStepSecondsLeft <= 0 &&
    !guestPreviewUrl &&
    !guestOutputMeta;
  const canEditGuestAdjustment = guestStep === 'adjust' && !isAdjustLocked && !isGeneratingGuestResult && !isAdjustTimeOver;
  const isGuestTimedStepDone =
    guestStep === 'frame'
      ? selectedGuestFrameCount >= GUEST_FRAME_SELECTION_TARGET
      : guestStep === 'select'
        ? requiredGuestPhotoCount > 0 && selectedCaptureIndices.length > 0
        : guestStep === 'adjust'
          ? Boolean(guestPreviewUrl || guestOutputMeta)
          : false;
  const guestTimedWarning =
    activeGuestTimerConfig &&
    guestTimedStepSecondsLeft <= (activeGuestTimerConfig.warningSeconds || GUEST_TIMED_WARNING_SECONDS) &&
    guestTimedStepSecondsLeft > 0
      ? getGuestTimedWarning({
        stepId: guestStep,
        secondsLeft: guestTimedStepSecondsLeft,
        selectedCount: selectedCaptureIndices.length,
        requiredCount: requiredGuestPhotoCount,
      })
      : '';
  const shouldTriggerGuestTimedWarningPopup = Boolean(guestTimedWarning && !guestTransitionPrompt);
  const guestTimedWarningKey = activeGuestTimerConfig ? `${guestStep}:${guestStepStartedAt || 0}` : '';
  const guestSelectionWarning =
    hasEnoughGuestSetup && selectedCaptureIndices.length > 0 && selectedCaptureIndices.length < requiredGuestPhotoCount
      ? `Bạn đang chọn ${selectedCaptureIndices.length}/${requiredGuestPhotoCount} ảnh. Hệ thống sẽ ghép lần lượt từ slot 1 và bỏ trống slot chưa có ảnh.`
      : '';
  const selectedFramesUseDirectFit = false;
  const guestCanCreateResult = hasEnoughGuestSetup && selectedCaptureIndices.length > 0 && !isAutoDetecting;
  const closeGuestTimedWarningPopup = () => setGuestTimedWarningPopup(null);
  const activeGuestPopup = (() => {
    if (guestTransitionPrompt) {
      if (guestTransitionPrompt.stepId === 'capture') {
        return (
          <ConfirmCapturePopup
            capturedCount={guestTransitionPrompt.capturedCount || capturedPhotos.length}
            busy={guestTransitionBusy}
            onCancel={closeGuestTransitionPrompt}
            onConfirm={confirmGuestTransitionPrompt}
          />
        );
      }

      if (guestTransitionPrompt.stepId === 'frame') {
        const frameNames = (guestTransitionPrompt.frames || [])
          .map((frame, index) => `${index + 1}. ${frame?.name || 'khung xinh'}`)
          .join(' • ');
        return (
          <ConfirmFramePopup
            frameNames={frameNames}
            frameTarget={GUEST_FRAME_SELECTION_TARGET}
            busy={guestTransitionBusy}
            onCancel={closeGuestTransitionPrompt}
            onConfirm={confirmGuestTransitionPrompt}
          />
        );
      }

      if (guestTransitionPrompt.stepId === 'select') {
        const selectedCount = guestTransitionPrompt.captureIndices?.length || selectedCaptureIndices.length;
        const missingCount = Math.max(0, (requiredGuestPhotoCount || 0) - selectedCount);
        return (
          <ConfirmSelectPopup
            selectedCount={selectedCount}
            requiredCount={requiredGuestPhotoCount || 0}
            missingCount={missingCount}
            busy={guestTransitionBusy}
            onCancel={closeGuestTransitionPrompt}
            onConfirm={confirmGuestTransitionPrompt}
          />
        );
      }

      return (
        <ConfirmPrintPopup
          busy={guestTransitionBusy}
          onCancel={closeGuestTransitionPrompt}
          onConfirm={confirmGuestTransitionPrompt}
        />
      );
    }

    if (!guestTimedWarningPopup) return null;

    if (guestTimedWarningPopup.stepId === 'frame') {
      return (
        <TimeWarningFramePopup
          secondsLeft={guestTimedStepSecondsLeft}
          onClose={closeGuestTimedWarningPopup}
        />
      );
    }

    if (guestTimedWarningPopup.stepId === 'select') {
      return (
        <TimeWarningSelectPopup
          secondsLeft={guestTimedStepSecondsLeft}
          selectedCount={selectedCaptureIndices.length}
          requiredCount={requiredGuestPhotoCount || 0}
          onClose={closeGuestTimedWarningPopup}
        />
      );
    }

    if (guestTimedWarningPopup.stepId === 'adjust') {
      return (
        <TimeWarningAdjustPopup
          secondsLeft={guestTimedStepSecondsLeft}
          onClose={closeGuestTimedWarningPopup}
        />
      );
    }

    return null;
  })();

  useEffect(() => {
    if (guestStep !== 'adjust') {
      guestAdjustAutoFinishRef.current = false;
    }
  }, [guestStep]);

  useEffect(() => {
    if (guestStep !== 'adjust' || guestFrameDrafts.length === 0) return;
    setGuestFrameDrafts((currentDrafts) => {
      const activeDraftForSync = currentDrafts[selectedAdjustFrameIndex];
      if (!activeDraftForSync) return currentDrafts;
      if (activeDraftForSync.slotEdits === slotEdits && activeDraftForSync.slotAssignments === slotAssignments) {
        return currentDrafts;
      }
      return currentDrafts.map((draft, index) => (
        index === selectedAdjustFrameIndex
          ? { ...draft, slotEdits, slotAssignments }
          : draft
      ));
    });
  }, [guestStep, guestFrameDrafts.length, selectedAdjustFrameIndex, slotAssignments, slotEdits]);

  useEffect(() => {
    if (
      guestStep !== 'adjust' ||
      !isAdjustTimeOver ||
      isGeneratingGuestResult ||
      isGuestTimedStepDone ||
      guestTransitionPrompt ||
      guestAdjustAutoFinishRef.current
    ) {
      return;
    }

    guestAdjustAutoFinishRef.current = true;
    setGuestTimedWarningPopup(null);
    setGuestNotice('Hết giờ căn chỉnh rồi, mình tự chốt bản in cho bạn nha.');
    finishGuestAdjustment();
  }, [guestStep, isAdjustTimeOver, isGeneratingGuestResult, isGuestTimedStepDone, guestTransitionPrompt]);

  useEffect(() => {
    if (
      !activeGuestTimerConfig ||
      guestTimedStepSecondsLeft > 0 ||
      guestTransitionPrompt ||
      isGeneratingGuestResult ||
      !['frame', 'select'].includes(guestStep)
    ) {
      return;
    }

    const autoAdvanceKey = `${guestStep}:${guestStepStartedAt || 0}`;
    if (guestTimedAutoAdvanceKeysRef.current.has(autoAdvanceKey)) return;
    guestTimedAutoAdvanceKeysRef.current.add(autoAdvanceKey);
    setGuestTimedWarningPopup(null);

    if (guestStep === 'frame') {
      const framesToCommit = pickGuestFramesForAutoCommit();
      if (framesToCommit.length < GUEST_FRAME_SELECTION_TARGET) {
        setGuestNotice('Hết giờ chọn khung nhưng thư viện chưa đủ 2 khung hợp lệ để tự chốt. Bạn chọn thêm khung giúp mình nha.');
        return;
      }
      setGuestNotice('Hết giờ chọn khung, mình tự chốt 2 khung cho bạn nha.');
      void commitGuestFrameSelection(framesToCommit);
      return;
    }

    const captureIndicesToCommit = pickGuestCaptureIndicesForAutoCommit();
    if (captureIndicesToCommit.length === 0) {
      setGuestNotice('Hết giờ chọn ảnh nhưng chưa có ảnh hợp lệ để ghép. Bạn chọn ít nhất 1 ảnh giúp mình nha.');
      return;
    }

    setSelectedCaptureIndices(captureIndicesToCommit);
    setGuestNotice('Hết giờ chọn ảnh, mình dùng bộ ảnh hiện tại để qua phần căn chỉnh nha.');
    void createGuestResult(captureIndicesToCommit);
  }, [
    activeGuestTimerConfig,
    capturedPhotos.length,
    framePreviewCards,
    guestAutoCaptureIndices,
    guestStep,
    guestStepStartedAt,
    guestTimedStepSecondsLeft,
    guestTransitionPrompt,
    isGeneratingGuestResult,
    recommendedFrameCards,
    requiredGuestPhotoCount,
    selectedCaptureIndices,
    selectedGuestFrames,
  ]);

  useEffect(() => {
    if (
      !shouldTriggerGuestTimedWarningPopup ||
      !guestTimedWarningKey ||
      guestTimedWarningShownKeysRef.current.has(guestTimedWarningKey)
    ) {
      return undefined;
    }

    guestTimedWarningShownKeysRef.current.add(guestTimedWarningKey);

    setGuestTimedWarningPopup({
      key: guestTimedWarningKey,
      stepId: guestStep,
      message: guestTimedWarning,
    });

    const hideTimer = window.setTimeout(() => {
      setGuestTimedWarningPopup((current) => (current?.key === guestTimedWarningKey ? null : current));
    }, GUEST_WARNING_POPUP_MS);

    return () => window.clearTimeout(hideTimer);
  }, [guestTimedWarningKey, shouldTriggerGuestTimedWarningPopup]);

  useEffect(() => {
    if (!guestTimedWarningPopup) return;
    if (!activeGuestTimerConfig || guestTimedWarningPopup.stepId !== guestStep) {
      setGuestTimedWarningPopup(null);
    }
  }, [activeGuestTimerConfig, guestStep, guestTimedWarningPopup]);

  if (!isPartnerMode) {
    return (
      <div className="pink-pop-app min-h-screen overflow-x-clip" data-kiosk-locked={isKioskGuardEnabled ? 'true' : undefined}>
        <canvas ref={frameCanvasRef} width={frameDimensions.width} height={frameDimensions.height} className="hidden" />
        {isKioskGuardEnabled && (
          <button
            type="button"
            className="kiosk-admin-hotspot"
            aria-label="Admin unlock"
            tabIndex={-1}
            onPointerDown={handleAdminHotspotPointerDown}
          />
        )}
        {isKioskGuardEnabled && kioskNeedsResume && !adminModalMode && (
          <button type="button" className="kiosk-resume-overlay" onClick={requestKioskFullscreen}>
            <Maximize2 size={28} />
            <span>Chạm để tiếp tục toàn màn hình</span>
          </button>
        )}
        {isKioskGuardEnabled && (
          <KioskAdminModal
            mode={adminModalMode}
            pinEntry={adminPinEntry}
            pinError={adminPinError}
            newPinEntry={adminNewPinEntry}
            newPinConfirm={adminNewPinConfirm}
            isFullscreenActive={isKioskFullscreenActive}
            onPinEntryChange={setAdminPinEntry}
            onNewPinEntryChange={setAdminNewPinEntry}
            onNewPinConfirmChange={setAdminNewPinConfirm}
            onUnlock={handleAdminUnlock}
            onClose={closeAdminModal}
            onRequestFullscreen={requestKioskFullscreen}
            onExitFullscreen={exitKioskFullscreen}
            onExitKiosk={handleAdminExitKiosk}
            onRestartSession={handleAdminRestartSession}
            onReload={handleAdminReload}
            onOpenEditor={handleAdminOpenEditor}
            onShowChangePin={handleShowChangePin}
            onSavePin={handleSaveAdminPin}
            onBackToPanel={() => {
              setAdminModalMode('panel');
              setAdminPinError('');
            }}
          />
        )}
        {activeGuestPopup}

        <section id="guest-hero" className="pink-hero relative z-10 px-4 py-10 md:py-12">
          {/* Floating background decorations */}
          <div className="pink-hero-decor-heart heart-1">💖</div>
          <div className="pink-hero-decor-heart heart-2">💝</div>
          <div className="pink-hero-decor-heart heart-3">💕</div>
          <div className="pink-hero-decor-sparkle spark-1">✨</div>
          <div className="pink-hero-decor-sparkle spark-2">✨</div>
          <div className="pink-hero-decor-sparkle spark-3">✨</div>

          <div className="pink-hero-shell">
            <div className="pink-hero-main">
              <div className="pink-hero-copy">
                <div className="pink-hero-brand">
                  <img src={svovLogo} alt="SVOV - Seven Vibes One Vision" className="pink-hero-logo" />
                </div>
                <h1 className="pink-title pink-hero-title relative">
                  <span className="pink-title-line">SNAP <Heart className="pink-title-heart-one" aria-hidden="true" fill="currentColor" /></span>
                  <span className="pink-title-line">FOR <Heart className="pink-title-heart-two" aria-hidden="true" fill="currentColor" /></span>
                  <span>HOPE</span>
                </h1>
                <p className="pink-hero-lead">
                  Giữ lại những khoảnh khắc đáng yêu theo cách thật tự nhiên, thật vui và đậm chất riêng của bạn.
                </p>
                <div className="pink-hero-actions">
                  <button type="button" onClick={startGuestJourney} className="pink-btn pink-hero-btn text-xl">
                    <Camera className="size-6" /> Bắt đầu chụp
                  </button>
                  {guestNotice && guestStep === 'hero' && (
                    <p className="pink-alert">{guestNotice}</p>
                  )}
                </div>
              </div>

              <div className="pink-hero-stage">
                {/* Left Panel: Premium Floating Photo Strips */}
                <div className="pink-hero-visual">
                  <div className="photo-strip-wrapper">
                    {/* Strip 1: Warm Tone */}
                    <button
                      type="button"
                      className={`photo-strip-container strip-warm ${hoveredStrip === 'warm' ? 'is-hovered' : ''} ${hoveredStrip === 'cool' ? 'is-dimmed' : ''}`}
                      onClick={startGuestJourney}
                      onPointerEnter={() => setHoveredStrip('warm')}
                      onPointerLeave={() => setHoveredStrip(null)}
                      onFocus={() => setHoveredStrip('warm')}
                      onBlur={() => setHoveredStrip(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') startGuestJourney();
                      }}
                      tabIndex={0}
                      aria-label="Start photobooth strip"
                      title="Bấm để bắt đầu chụp ảnh"
                    >
                      <div className="photo-strip strip-warm-card">
                        <img
                          src={heroStrip1}
                          alt="Quán Chill Studio strip ấm"
                          className="w-full h-auto rounded-lg object-cover"
                        />
                      </div>
                    </button>

                    {/* Strip 2: Cool Tone */}
                    <button
                      type="button"
                      className={`photo-strip-container strip-cool ${hoveredStrip === 'cool' ? 'is-hovered' : ''} ${hoveredStrip === 'warm' ? 'is-dimmed' : ''}`}
                      onClick={startGuestJourney}
                      onPointerEnter={() => setHoveredStrip('cool')}
                      onPointerLeave={() => setHoveredStrip(null)}
                      onFocus={() => setHoveredStrip('cool')}
                      onBlur={() => setHoveredStrip(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') startGuestJourney();
                      }}
                      tabIndex={0}
                      aria-label="Start photobooth strip"
                      title="Bấm để bắt đầu chụp ảnh"
                    >
                      <div className="photo-strip strip-cool-card">
                        <img
                          src={heroStrip2}
                          alt="Quán Chill Studio strip mát"
                          className="w-full h-auto rounded-lg object-cover"
                        />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Right Panel: Minimalist Timeline Guide */}
                <div className="pink-hero-timeline-guide">
                  <h3 className="timeline-guide-title">
                    <Sparkles className="size-4 text-pink-500" />
                    Cách thức hoạt động
                  </h3>
                  
                  <div className="timeline-steps">
                    <div className="timeline-line" />
                    
                    <div className="timeline-step">
                      <div className="timeline-node" />
                      <div className="timeline-content">
                        <h4>01. CHỤP ẢNH TỰ ĐỘNG</h4>
                        <p>Bấm bắt đầu và nhìn vào camera. Máy tự động chụp nhanh 6 khoảnh khắc.</p>
                      </div>
                    </div>

                    <div className="timeline-step">
                      <div className="timeline-node" />
                      <div className="timeline-content">
                        <h4>02. CHỌN KHUNG & ẢNH</h4>
                        <p>Ghép thử ảnh vào thư viện khung hình, chọn 2 mẫu khung và 4 tấm ảnh xinh nhất.</p>
                      </div>
                    </div>

                    <div className="timeline-step">
                      <div className="timeline-node" />
                      <div className="timeline-content">
                        <h4>03. CĂN CHỈNH & IN</h4>
                        <p>Tự do phóng to, xoay góc ảnh phù hợp với khe cắt và nhận bản in lấy liền.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="guest-hero-draft"
          className="relative z-10 min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#fce7f3_0,#fbcfe8_18%,transparent_36%),radial-gradient(circle_at_80%_16%,#f9a8d4_0,transparent_26%),linear-gradient(135deg,#ffe4f1_0%,#fff1f6_42%,#f7d5ff_100%)] px-5 py-8 text-fuchsia-950 sm:px-8 lg:px-12"
          hidden
        >
          <div className="absolute -left-16 top-14 size-52 rounded-full bg-pink-300/45 blur-sm" />
          <div className="absolute -left-20 top-48 size-44 rounded-full border border-white/70 bg-white/20 shadow-[inset_0_0_45px_rgba(255,255,255,.8)]" />
          <div className="absolute left-4 top-8 h-24 w-20 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 opacity-70 blur-[1px]" />
          <div className="absolute right-8 top-10 size-24 rounded-full bg-pink-200/50 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-44 w-72 rounded-tl-full bg-pink-300/30 blur-2xl" />
          <Sparkles className="absolute left-[8%] top-[28%] size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]" />
          <Sparkles className="absolute left-[34%] top-[13%] size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]" />
          <Sparkles className="absolute right-[30%] top-[7%] size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]" />
          <Heart className="absolute right-[18%] top-[12%] size-12 rotate-12 fill-pink-200 text-pink-300 drop-shadow-xl" />
          <Heart className="absolute left-[12%] bottom-[10%] size-14 rotate-[9deg] fill-pink-200 text-pink-300 drop-shadow-xl" />



          <section className="relative z-10 mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="mx-auto max-w-xl lg:mx-0 lg:pl-24 xl:pl-32">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-pink-200 bg-white/70 px-5 py-3 font-extrabold text-pink-600 shadow-lg shadow-pink-200/50 backdrop-blur">
                <span className="flex size-10 items-center justify-center rounded-full bg-pink-500 text-white shadow-md shadow-pink-400/40">
                  <Camera className="size-5" />
                </span>
                Photobooth tự động
              </div>

              <h1 className="select-none text-[4.8rem] font-semibold leading-[0.82] tracking-[-0.08em] text-white drop-shadow-[0_10px_0_rgba(255,255,255,.6)] sm:text-[6.4rem] xl:text-[7.4rem]">
                <span className="block text-pink-500 [text-shadow:_0_6px_0_rgba(255,255,255,.8)]">
                  Quán
                </span>
                <span className="block text-pink-400 [text-shadow:_0_6px_0_rgba(255,255,255,.8)]">
                  Chill
                </span>
                <span className="block text-fuchsia-700 [text-shadow:_0_6px_0_rgba(255,255,255,.75)]">
                  Studio
                </span>
              </h1>

              <p className="mt-8 max-w-lg text-xl font-extrabold leading-relaxed text-fuchsia-950/80 sm:text-2xl">
                Giữ lại những khoảnh khắc đáng yêu theo cách thật tự nhiên, thật vui và đậm chất riêng của bạn.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={startGuestJourney}
                  className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-9 py-5 text-2xl font-black text-white shadow-[0_20px_55px_rgba(236,72,153,.4)] transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(236,72,153,.5)]"
                >
                  <Camera className="size-7 transition group-hover:rotate-[-8deg]" />
                  Bắt đầu chụp
                </button>
                {guestNotice && guestStep === 'hero' && (
                  <p className="pink-alert max-w-sm">{guestNotice}</p>
                )}
              </div>
            </div>

            <div className="relative min-h-[610px] pr-0 xl:pr-44">
              <div className="relative mx-auto w-full max-w-[520px] rounded-[2.4rem] border border-white/80 bg-white/45 p-5 shadow-[0_30px_100px_rgba(219,39,119,.22)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="size-3.5 rounded-full bg-pink-400" />
                    <span className="size-3.5 rounded-full bg-yellow-300" />
                    <span className="size-3.5 rounded-full bg-cyan-300" />
                  </div>
                  <Heart className="size-6 text-pink-300" />
                </div>

                <div className="relative flex min-h-[310px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-pink-100 via-pink-50 to-rose-200 shadow-inner">
                  <Sparkles className="absolute left-10 top-8 size-8 text-yellow-200" />
                  <Heart className="absolute right-10 top-14 size-8 text-pink-300" />
                  <Heart className="absolute bottom-8 right-12 size-6 text-pink-300" />
                  <div className="absolute size-72 rounded-full border-[18px] border-white/60" />
                  <div className="absolute size-52 rounded-full border-[22px] border-pink-400/90 shadow-[0_0_35px_rgba(236,72,153,.35)]" />
                  <div className="z-10 flex size-32 items-center justify-center rounded-full bg-white/90 shadow-[0_20px_50px_rgba(236,72,153,.25)]">
                    <Camera className="size-16 text-pink-500" />
                  </div>
                  <p className="absolute bottom-10 z-10 rounded-full bg-white/35 px-4 py-2 text-sm font-bold text-pink-400">
                    Nhìn vào camera nhé!
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <button
                      type="button"
                      key={`hero-step-${index + 1}`}
                      className="h-16 rounded-2xl border border-pink-200 bg-white/50 text-sm font-black text-pink-500 shadow-sm transition hover:-translate-y-1 hover:bg-white/80"
                    >
                      <Sparkles className="mx-auto size-4 text-pink-300" />
                      {String(index + 1).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="absolute -right-8 top-28 z-20 hidden w-72 rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_25px_80px_rgba(190,24,93,.24)] backdrop-blur-xl lg:block">
                <div className="mb-4 flex items-center gap-2 text-lg font-black text-pink-500">
                  <Sparkles className="size-5" />
                  Cách dùng nhanh
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
                      1
                    </div>
                    <span className="text-sm leading-snug text-fuchsia-950">
                      <strong className="block text-pink-600 font-extrabold mb-0.5">Chụp ảnh</strong>
                      Tự động chụp 6 khoảnh khắc
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
                      2
                    </div>
                    <span className="text-sm leading-snug text-fuchsia-950">
                      <strong className="block text-pink-600 font-extrabold mb-0.5">Chọn khung & ảnh</strong>
                      Chọn 2 khung và 4 tấm ảnh yêu thích
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
                      3
                    </div>
                    <span className="text-sm leading-snug text-fuchsia-950">
                      <strong className="block text-pink-600 font-extrabold mb-0.5">Căn chỉnh & In</strong>
                      Cân đối ảnh và nhận bản in lấy ngay
                    </span>
                  </div>
                </div>
              </div>


            </div>
          </section>
        </section>

        <div className="pink-timeline relative z-10">
          <div className="pink-total-timer-row">
            <GuestTimerBadge
              active={guestAggregateTimerActive}
              secondsLeft={guestAggregateSecondsLeft}
              label="Tổng thời gian còn lại"
            />
          </div>

          <div className="pink-timeline-line">
            <div className="pink-timeline-progress" style={{ height: `${guestProgress}%` }} />
            <div className="pink-timeline-pointer" style={{ top: `${guestProgress}%` }} />
          </div>

          <section id="guest-capture" className={`pink-step ${isCaptureUnlocked ? 'active' : ''} ${isCaptureLocked ? 'locked' : ''}`} data-disabled={!isCaptureUnlocked || isCaptureLocked}>
            <div className="pink-step-dot"><span /></div>
            <div className="pink-card pink-capture-card p-5 md:p-6">
              <div className="flex justify-between items-center gap-3 mb-4">
                <h2 className="pink-step-headline">1. Chụp ảnh</h2>
              </div>

              <div className="pink-camera pink-camera-large mb-4">
                <BeautyFilterCamera
                  ref={beautyCameraRef}
                  stream={cameraStream}
                  settings={beautyFilterSettings}
                  mirror
                  disableWebGl={isKioskGuardEnabled}
                />
                
                {/* Floating Top Control Bar */}
                <div className="pink-camera-top-bar">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Counter inline */}
                    <div className="pink-camera-counter" aria-live="polite">
                      <Images className="size-4" />
                      <strong>{capturedPhotos.length}/{maxGuestPhotos}</strong>
                      <span className="hidden sm:inline">ảnh đã chụp</span>
                    </div>

                    {/* Live Indicator */}
                    {cameraStream && !isCameraReconnecting && (
                      <div className="pink-camera-live-indicator">
                        <span className="live-dot" />
                        <span>LIVE</span>
                      </div>
                    )}
                  </div>
                  
                  {cameraDevices.length > 0 && (
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <div className="pink-camera-select-wrapper">
                        <Camera className="size-4 text-pink-600 shrink-0" />
                        <select
                          value={selectedCameraId}
                          onChange={(e) => handleCameraChange(e.target.value)}
                          className="pink-camera-select"
                          aria-label="Select camera"
                          title="Chọn Camera / Máy ảnh"
                          disabled={isLockedCaptureRunning || isCapturingGuestPhoto}
                        >
                          {cameraDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowDslrGuide(!showDslrGuide)}
                        className="flex items-center justify-center size-8 rounded-full bg-white/95 text-pink-600 border border-pink-200 shadow-sm hover:border-pink-500 hover:text-pink-700 transition-all font-bold text-xs shrink-0 cursor-pointer"
                        title="Hướng dẫn kết nối Canon M50 / DSLR"
                      >
                        ?
                      </button>
                    </div>
                  )}
                </div>

                {/* Reconnecting Overlay */}
                {isCameraReconnecting && !isUsingFallbackCameraRef.current && (
                  <div className="pink-reconnect-overlay">
                    <div className="pink-reconnect-spinner">
                      <Loader2 className="size-10 animate-spin text-pink-500" />
                    </div>
                    <h3>Mất kết nối camera</h3>
                    <p>Đang tự động kết nối lại máy ảnh/camera của bạn…</p>
                    <span className="text-xs opacity-60 mt-1">Vui lòng kiểm tra cổng USB/nguồn thiết bị</span>
                  </div>
                )}

                {/* Fallback Camera Banner */}
                {isCameraReconnecting && isUsingFallbackCameraRef.current && (
                  <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-amber-500/90 text-white text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-2 shadow-lg backdrop-blur z-20 animate-pulse border border-amber-300 pointer-events-none select-none">
                    <span className="size-2 rounded-full bg-white animate-ping" />
                    <span>⚠️ Đang chạy camera dự phòng. Cắm lại Canon M50 / Dây Capture để tự động nhận dạng lại…</span>
                  </div>
                )}

                {/* DSLR Guide Popover */}
                {showDslrGuide && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 p-5 rounded-2xl flex flex-col justify-between text-pink-900 overflow-y-auto animate-fade-in">
                    <div>
                      <div className="flex justify-between items-center border-b border-pink-100 pb-2 mb-3">
                        <h3 className="font-semibold text-sm text-pink-700 flex items-center gap-2">
                          📸 Hướng Dẫn Kết Nối Canon M50 & DSLR
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowDslrGuide(false)}
                          className="size-6 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="space-y-3 text-xs text-left leading-relaxed">
                        <div>
                          <p className="font-bold text-pink-800 text-[11px] mb-1">Cách 1: Kết nối bằng dây Capture Card (Khuyên dùng - Ổn định nhất)</p>
                          <ul className="list-disc list-inside space-y-0.5 pl-1 text-pink-700">
                            <li>Cắm cáp **Micro-HDMI** từ Canon M50 vào cổng HDMI của **Capture Card**.</li>
                            <li>Cắm đầu USB của Capture Card vào máy tính.</li>
                            <li>Ở danh sách camera phía trên, chọn thiết bị tên là **USB Video** hoặc **HDMI Video**.</li>
                          </ul>
                        </div>
                        
                        <div>
                          <p className="font-bold text-pink-800 text-[11px] mb-1">Cách 2: Cắm dây USB trực tiếp (Sử dụng EOS Webcam Utility)</p>
                          <ul className="list-disc list-inside space-y-0.5 pl-1 text-pink-700">
                            <li>Cắm cáp USB trực tiếp từ máy ảnh Canon M50 vào cổng USB máy tính.</li>
                            <li>Tải và cài đặt driver miễn phí **Canon EOS Webcam Utility** từ trang chủ Canon.</li>
                            <li>Chọn thiết bị camera là **EOS Webcam Utility** trong danh sách phía trên.</li>
                          </ul>
                        </div>
                        
                        <div className="bg-pink-50/70 p-2 rounded-xl border border-pink-100">
                          <p className="font-bold text-pink-800 mb-0.5">⚠️ Cài đặt quan trọng trên máy ảnh:</p>
                          <ol className="list-decimal list-inside space-y-0.5 pl-1 text-pink-700 font-medium">
                            <li>Xoay bánh răng chế độ trên máy ảnh sang **Movie Mode (Quay Phim)**.</li>
                            <li>Vào Menu &rarr; Cài đặt &rarr; **Tắt tự động tắt nguồn (Disable Auto Power Off)**.</li>
                            <li>Khuyên dùng pin giả (Dummy Battery) cắm nguồn trực tiếp để chạy cả ngày.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setShowDslrGuide(false)}
                      className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
                    >
                      Đã Hiểu, Đóng Hướng Dẫn
                    </button>
                  </div>
                )}


                {captureCountdown && <div key={captureCountdown} className="pink-countdown">{captureCountdown}</div>}
                {flashActive && <div className="pink-flash" />}
                {!cameraStream && !isCameraReconnecting && (
                  <div className="pink-camera-off">
                    <VideoOff className="size-10 text-pink-300 mb-2" />
                    <p className="font-bold text-pink-800 text-sm">
                      {cameraError || 'Chưa bật camera'}
                    </p>
                    <button type="button" onClick={startGuestJourney} className="pink-outline-btn mt-3">
                      Bật camera
                    </button>
                  </div>
                )}
                <div className="pink-shutter-overlay">
                  <button
                    type="button"
                    onClick={startGuestCaptureSession}
                    disabled={!cameraStream || isLockedCaptureRunning || isCapturingGuestPhoto || capturedPhotos.length >= maxGuestPhotos}
                    className={`pink-shutter ${isLockedCaptureRunning ? 'locked' : ''}`}
                    aria-label="Start automatic capture"
                    title="Bắt đầu chụp tự động"
                  >
                    <span />
                  </button>
                  <p className="pink-shutter-hint">
                    {!cameraStream
                      ? 'Camera đang kết nối, đợi màn hình hiện rõ rồi bấm chụp nha.'
                      : capturedPhotos.length >= maxGuestPhotos
                        ? 'Đã đủ 6 tấm rồi, qua chọn khung nha.'
                        : capturedPhotos.length >= minGuestPhotosToContinue
                          ? `Đã có ${capturedPhotos.length} tấm rồi, bạn có thể dừng tại đây hoặc chụp thêm.`
                          : isLockedCaptureRunning
                            ? `Máy tự chụp sau ${nextCaptureSecondsLeft}s. Bạn cứ tạo dáng thật thoải mái.`
                            : 'Bấm nút chụp để bắt đầu đếm giờ.'}
                  </p>
                </div>
              </div>

              {canFinishCaptureEarly && (
                <div className="pink-capture-actions mb-4">
                  <button type="button" onClick={requestFinishCaptureEarly} className="pink-btn">
                    <ArrowRight className="size-5" /> Dừng chụp tại đây
                  </button>
                  <p>Đã có {capturedPhotos.length} tấm rồi, muốn qua chọn khung luôn cũng được nha.</p>
                </div>
              )}

              {guestNotice && guestStep === 'capture' && (
                <p className="pink-alert mb-4">{guestNotice}</p>
              )}

              <div className="pink-filter-panel mb-4">
                <div className="pink-filter-header">
                  <span><Sparkles className="size-4" /> Bộ lọc realtime</span>
                  <strong>{activeBeautyPreset?.name || 'Tùy chỉnh'}</strong>
                </div>
                <div className="pink-filter-presets" aria-label="Chọn chế độ lọc ảnh">
                  {BEAUTY_FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`pink-filter-preset ${activeBeautyPresetId === preset.id ? 'active' : ''}`}
                      onClick={() => applyBeautyPreset(preset)}
                      disabled={isCapturingGuestPhoto}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="pink-filter-sliders">
                  {[
                    ['smooth', 'Mịn da'],
                    ['bright', 'Sáng da'],
                    ['rosy', 'Hồng hào'],
                    ['glow', 'Căng bóng'],
                    ['acne', 'Xóa mụn'],
                    ['slimming', 'Thon mặt'],
                    ['enlargeEyes', 'Mắt to'],
                  ].map(([key, label]) => (
                    <label key={key} className="pink-filter-slider">
                      <span>{label}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={beautyFilterSettings[key]}
                        onChange={(event) => updateBeautyFilterSetting(key, event.target.value)}
                        aria-label={label}
                        disabled={isCapturingGuestPhoto}
                      />
                      <em>{beautyFilterSettings[key]}%</em>
                    </label>
                  ))}
                </div>
              </div>

              {capturedPhotos.length > 0 && (
                <div className="pink-capture-strip" aria-label="Ảnh vừa chụp">
                  <div className="pink-capture-strip-header">
                    <div className="flex items-center gap-2">
                      <Camera className="size-5 text-[#ff2f93]" />
                      <div>
                        <strong>Ảnh vừa chụp</strong>
                        <p>{capturedPhotos.length} / {maxGuestPhotos} tấm đã lưu</p>
                      </div>
                    </div>
                  </div>
                  <div className="pink-capture-track">
                    {capturedPhotos.map((photo, index) => (
                      <div key={photo.id} className="pink-capture-thumb">
                        <img src={photo.url} alt={photo.name} />
                        <span>{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </section>

          <section id="guest-frame" className={`pink-step ${isFrameUnlocked ? 'active' : ''} ${isFrameLocked ? 'locked' : ''}`} data-disabled={!isFrameUnlocked || isFrameLocked}>
            <div className="pink-step-dot"><span /></div>
            <div className="pink-card p-5">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 className="pink-step-headline">2. Chọn khung</h2>
                  <p className="font-bold text-[#74194a] text-sm">
                    Ghé mắt xem trước các khung hình lung linh, rồi rước ngay 2 mẫu ưng ý nhất nha bạn yêu 💖
                  </p>
                </div>
              </div>

              {guestNotice && guestStep === 'frame' && <p className="pink-alert mb-4">{guestNotice}</p>}

              <div className="pink-frame-select-status mb-4">
                <div>
                  <CheckCircle2 className="size-5" />
                  <strong>{selectedGuestFrameCount}/{GUEST_FRAME_SELECTION_TARGET} khung đã chọn</strong>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedGuestFrameCount === 1 && (
                    <button
                      type="button"
                      onClick={duplicateSingleGuestFrameSelection}
                      disabled={isCommittingGuestFrames || isGeneratingGuestResult}
                      className="pink-outline-btn disabled:opacity-40"
                    >
                      <Copy className="size-4" /> Dùng khung này 2 lần
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={requestGuestFrameSelectionCommit}
                    disabled={selectedGuestFrameCount < GUEST_FRAME_SELECTION_TARGET || isCommittingGuestFrames || isGeneratingGuestResult}
                    className="pink-outline-btn disabled:opacity-40"
                  >
                    Chốt 2 khung
                  </button>
                </div>
              </div>

              {(isCommittingGuestFrames || isGeneratingGuestResult) && (
                <div className="pink-status mb-4">
                  {isCommittingGuestFrames
                    ? 'Đang chuẩn bị 2 khung đã chọn…'
                    : 'Đang chuẩn bị ảnh để qua phần căn chỉnh…'}
                </div>
              )}

              <div className="pink-frame-page-bar mb-4">
                <div>
                  <strong>Trang {safeGuestFramePageIndex + 1}/{guestFramePageCount}</strong>
                  <span>{framePreviewCards.length > 0 ? `${guestFramePageStart + 1}-${guestFramePageEnd} / ${framePreviewCards.length} khung` : 'Đang tải khung'}</span>
                </div>
                <div className="pink-frame-page-actions">
                  <button
                    type="button"
                    onClick={() => goToGuestFramePage(safeGuestFramePageIndex - 1)}
                    disabled={safeGuestFramePageIndex <= 0 || isCommittingGuestFrames || isGeneratingGuestResult}
                    aria-label="Trang trước"
                    title="Trang trước"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToGuestFramePage(safeGuestFramePageIndex + 1)}
                    disabled={safeGuestFramePageIndex >= guestFramePageCount - 1 || isCommittingGuestFrames || isGeneratingGuestResult}
                    aria-label="Trang sau"
                    title="Trang sau"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>

              <div className="pink-frame-grid pink-frame-library-grid pink-frame-preview-grid">
                {pagedFramePreviewCards.map((card) => {
                  const selectionIndices = getSelectedGuestFrameIndices(card.frame);
                  const selectionIndex = selectionIndices[0] ?? -1;
                  const selectionCount = selectionIndices.length;
                  const isSelected = selectionCount > 0;
                  const isRecommended = recommendedFrameKeys.has(card.key);
                  return (
                    <button type="button"
                      key={card.key}
                      onClick={() => selectGuestFrame(card.frame)}
                      disabled={isCommittingGuestFrames || isGeneratingGuestResult}
                      className={`pink-frame-choice auto-preview ${isRecommended ? 'recommended' : ''} ${card.isComposed ? 'composed' : ''} ${isSelected ? 'selected' : ''}`}
                      title={card.frame.name}
                    >
                      <div className="pink-frame-thumb">
                        <img src={card.previewUrl || card.frame.url} alt={card.frame.name} loading="lazy" />
                        {isRecommended && (
                          <div className="pink-recommended-badge">
                            <Sparkles className="size-3" /> Đề xuất
                          </div>
                        )}
                        {isSelected && (
                          <div className="pink-frame-selected-badge">
                            {selectionCount > 1 ? `x${selectionCount}` : selectionIndex + 1}
                          </div>
                        )}
                        {!card.isComposed && isBuildingFramePreviews && (
                          <div className="pink-frame-preview-loading">
                            <Loader2 className="size-5 animate-spin" />
                          </div>
                        )}
                      </div>
                      <span className="pink-frame-label">{isSelected ? selectionCount > 1 ? `Khung x${selectionCount}` : `Khung ${selectionIndex + 1}` : isRecommended ? 'Khung đề xuất' : card.isComposed ? card.frame.name : card.status}</span>
                      <span className="pink-frame-preview-name">{card.frame.slotCount ? `${card.frame.slotCount} slot` : 'Tự nhận diện'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="guest-select" className={`pink-step ${isSelectUnlocked ? 'active' : ''} ${isSelectLocked ? 'locked' : ''}`} data-disabled={!isSelectUnlocked || isSelectLocked}>
            <div className="pink-step-dot"><span /></div>
            <div className="pink-card p-5">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 className="pink-step-headline">3. Chọn ảnh yêu thích</h2>
                  <p className="font-bold text-[#74194a] text-sm">
                    {selectedFramesUseDirectFit
                      ? 'Máy sẽ đặt ảnh vào đúng các ô chữ nhật trong khung.'
                      : 'Bé đã chọn sẵn 4 tấm ảnh xinh xắn để bạn xem thử rồi nè. Bạn có thể giữ nguyên hoặc thay áo mới bằng những tấm ảnh khác trước khi tụi mình cùng căn chỉnh nha! ✨'}
                  </p>
                </div>
              </div>

              {guestSelectionWarning && <p className="pink-alert mb-4">{guestSelectionWarning}</p>}
              {guestNotice && guestStep === 'select' && <p className="pink-alert mb-4">{guestNotice}</p>}

              <div className="pink-selection-panel">
                <div className="pink-selection-panel-head">
                  <strong>{selectedCaptureIndices.length} ảnh đã chọn</strong>
                  <span>Chọn theo đúng thứ tự muốn lên khung</span>
                </div>
                <div className="pink-selection-grid">
                  {capturedPhotos.map((photo, index) => {
                    const selectionOrder = selectedCaptureIndices.indexOf(index);
                    const isSelected = selectionOrder >= 0;
                    return (
                      <button type="button"
                        key={photo.id}
                        onClick={() => toggleGuestPhotoSelection(index)}
                        className={`pink-select-item ${isSelected ? 'selected' : ''}`}
                      >
                        <img src={photo.url} alt={photo.name} />
                        <span>{isSelected ? selectionOrder + 1 : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <button type="button"
                  onClick={() => requestCreateGuestResult()}
                  disabled={!guestCanCreateResult || isGeneratingGuestResult}
                  className="pink-btn disabled:opacity-40"
                >
                  <Wand2 className="size-5" /> {selectedFramesUseDirectFit ? 'Ghép ảnh' : 'Qua căn chỉnh'}
                </button>
              </div>
            </div>
          </section>

          <section id="guest-adjust" className={`pink-step ${isAdjustUnlocked ? 'active' : ''} ${isAdjustLocked ? 'locked' : ''}`} data-disabled={!isAdjustUnlocked || isAdjustLocked}>
            <div className="pink-step-dot"><span /></div>
            <div className="pink-card p-5">
              <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="pink-step-headline">4. Căn 2 khung ảnh</h2>
                  <p className="font-bold text-[#74194a] text-sm">Mỗi khung có bản chỉnh riêng, hết giờ máy sẽ tự chốt bản in.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="pink-badge">Khung {Math.min(selectedAdjustFrameIndex + 1, guestFrameDrafts.length || 1)} / {guestFrameDrafts.length || 1}</div>
                  <div className="pink-badge">Slot {Math.min(selectedAdjustSlotIndex + 1, slotEdits.length || 1)} / {slotEdits.length || 0}</div>
                </div>
              </div>

              {(adjustWarning || (guestStep === 'adjust' && guestNotice)) && (
                <p className="pink-alert mb-4">{adjustWarning || guestNotice}</p>
              )}

              {guestFrameDrafts.length > 1 && (
                <div className="pink-adjust-frame-tabs mb-4" aria-label="Chọn khung để căn chỉnh">
                  {guestFrameDrafts.map((draft, index) => (
                    <button
                      key={draft.id}
                      type="button"
                      onClick={() => activateGuestFrameDraft(index)}
                      disabled={isGeneratingGuestResult}
                      className={selectedAdjustFrameIndex === index ? 'active' : ''}
                    >
                      <img src={draft.frame.previewUrl || draft.frame.url} alt={draft.frame.name} />
                      <span>Khung {index + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className={`pink-adjust-layout ${!canEditGuestAdjustment ? 'locked' : ''}`}>
                <div className="pink-adjust-stage">
                  <div className="pink-adjust-stage-head">
                    <div>
                      <strong>{activeAdjustDraft?.frame?.name || selectedFrame?.name || 'Khung đang chỉnh'}</strong>
                    </div>
                  </div>
                  <div
                    className="pink-adjust-frame-preview"
                    style={{
                      '--frame-ratio': frameRatio,
                      aspectRatio: frameRatio,
                    }}
                  >
                    {slotEdits.map((edit) => {
                      const zone = zones[edit.slotIndex];
                      if (!zone) return null;
                      return (
                        <button
                          key={edit.photoId}
                          type="button"
                          className={`pink-adjust-slot ${selectedAdjustSlotIndex === edit.slotIndex ? 'active' : ''}`}
                          style={extractSlotStyle(zone, frameDimensions)}
                          onPointerDown={(event) => startAdjustDrag(event, edit.slotIndex, 'full')}
                          onClick={() => setSelectedAdjustSlotIndex(edit.slotIndex)}
                          disabled={!canEditGuestAdjustment}
                        >
                          <img src={edit.url} alt={edit.name} draggable="false" style={extractPhotoStyle(edit, zone)} />
                        </button>
                      );
                    })}
                    {originalFrame && <img src={originalFrame} alt="Khung đã chọn" className="pink-adjust-frame-overlay" draggable="false" />}
                    {!canEditGuestAdjustment && (
                      <div className="pink-adjust-lock-layer">
                        {isGeneratingGuestResult ? 'Đang tạo bản in…' : isAdjustLocked ? 'Bản chỉnh đã chốt' : 'Hết giờ, máy đang chốt'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pink-adjust-panel">
                  {(() => {
                    const edit = slotEdits.find((item) => item.slotIndex === selectedAdjustSlotIndex) || slotEdits[0];
                    const zone = edit ? zones[edit.slotIndex] : null;
                    if (!edit || !zone) return <p className="font-black text-pink-500">Chưa có slot để chỉnh.</p>;
                    const zoomValue = extractZoomValue(edit);
                    return (
                      <>
                        <div className="pink-adjust-panel-title">
                          <SlidersHorizontal className="size-5" />
                          <div>
                            <h3>Slot {edit.slotIndex + 1}</h3>
                            <span>{edit.name}</span>
                          </div>
                        </div>

                        <div className="pink-adjust-slot-tabs" aria-label="Chọn slot">
                          {slotEdits.map((item) => (
                            <button
                              key={`slot-tab-${item.photoId}`}
                              type="button"
                              onClick={() => setSelectedAdjustSlotIndex(item.slotIndex)}
                              className={selectedAdjustSlotIndex === item.slotIndex ? 'active' : ''}
                            >
                              {item.slotIndex + 1}
                            </button>
                          ))}
                        </div>

                        <div
                          className="pink-adjust-zoom-preview"
                          style={{
                            '--slot-ratio': `${zone.width / Math.max(1, zone.height)}`,
                            aspectRatio: `${zone.width} / ${zone.height}`,
                          }}
                          onPointerDown={(event) => startAdjustDrag(event, edit.slotIndex, 'zoom')}
                        >
                          <img src={edit.url} alt={edit.name} draggable="false" style={extractPhotoStyle(edit, zone)} />
                        </div>

                        <label className="pink-adjust-control">
                          <span><b>Phóng to</b><em>{zoomValue}%</em></span>
                          <input disabled={!canEditGuestAdjustment} type="range" min="20" max="600" step="1" value={zoomValue} aria-label="Adjust slot zoom" onChange={(event) => updateSlotEdit(edit.slotIndex, { scale: extractZoomScale(edit, event.target.value) })} />
                        </label>
                        <label className="pink-adjust-control">
                          <span><b>Xoay</b><em>{extractRotationValue(edit)}°</em></span>
                          <input disabled={!canEditGuestAdjustment} type="range" min="-180" max="180" step="1" value={extractRotationValue(edit)} aria-label="Adjust slot rotation" onChange={(event) => updateSlotEdit(edit.slotIndex, { rotation: Number(event.target.value) })} />
                        </label>

                        <div className="pink-adjust-primary-actions">
                          <button type="button" disabled={!canEditGuestAdjustment} onClick={() => autoFitSlotEdit(edit.slotIndex)}>
                            <Wand2 className="size-4" /> Tự căn slot
                          </button>
                          <button type="button" disabled={!canEditGuestAdjustment} onClick={() => resetSlotEdit(edit.slotIndex)}>
                            <RefreshCcw className="size-4" /> Đặt lại
                          </button>
                        </div>

                        <div className="pink-adjust-icon-grid">
                          <button type="button" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { rotation: (edit.rotation || 0) - 90 })} title="Xoay trái 90 độ">
                            <RotateCcw className="size-4" /><span>Trái</span>
                          </button>
                          <button type="button" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { rotation: (edit.rotation || 0) + 90 })} title="Xoay phải 90 độ">
                            <RotateCw className="size-4" /><span>Phải</span>
                          </button>
                          <button type="button" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { flipX: !edit.flipX })} title="Lật ngang">
                            <FlipHorizontal className="size-4" /><span>Ngang</span>
                          </button>
                          <button type="button" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { flipY: !edit.flipY })} title="Lật dọc">
                            <FlipVertical className="size-4" /><span>Dọc</span>
                          </button>
                        </div>

                        {slotEdits.length > 1 && (
                          <div className="pink-swap-panel">
                            <p><ArrowLeftRight className="size-4" /> Đổi ảnh sang slot khác</p>
                            <div className="pink-swap-grid">
                              {slotEdits.flatMap((item) => (item.slotIndex === edit.slotIndex ? [] : [
                                (
                                  <button
                                    key={`swap-${edit.slotIndex}-${item.slotIndex}`}
                                    type="button"
                                    disabled={!canEditGuestAdjustment}
                                    onClick={() => swapSlotEdits(edit.slotIndex, item.slotIndex)}
                                  >
                                    Slot {item.slotIndex + 1}
                                  </button>
                                ),
                              ]))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <button type="button" onClick={requestFinishGuestAdjustment} disabled={!slotEdits.length || isGeneratingGuestResult || isAdjustTimeOver} className="pink-btn disabled:opacity-40">
                  <Wand2 className="size-5" /> Chốt bản in
                </button>
              </div>
            </div>
          </section>

          <section id="guest-result" className={`pink-step ${isResultUnlocked ? 'active' : ''}`} data-disabled={!isResultUnlocked}>
            <div className="pink-step-dot"><span /></div>
            <div className="pink-card p-6 md:p-8 text-center relative overflow-hidden pink-premium-result-card">
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-300/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-300/10 rounded-full blur-3xl pointer-events-none" />

              <div className="mb-8 flex justify-between items-center gap-4 border-b border-pink-100/60 pb-5">
                <div className="text-left">
                  <h2 className="pink-step-headline flex items-center gap-2">
                    <Sparkles className="size-6 text-[#f73591] animate-pulse shrink-0" />
                    <span>5. Bản in xinh đã sẵn sàng!</span>
                  </h2>
                  <p className="font-extrabold text-[#74194a]/80 text-sm mt-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f73591] animate-ping shrink-0" />
                    2 khung 6.2 x 8.7cm đặt cạnh nhau, có khe nhỏ để cắt.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={startGuestNextSessionNow} 
                  className="pink-icon-btn hover:rotate-180 transition-transform duration-500 bg-[#ffe3f0] hover:bg-[#f73591] hover:text-white p-3 rounded-full shadow-sm hover:shadow-pink-200" 
                  title="Bắt đầu phiên mới"
                >
                  <RotateCcw className="size-5" />
                </button>
              </div>

              <div className={`pink-result-download-layout mb-8 ${guestShare?.shareUrl ? 'with-qr' : ''}`}>
                
                {/* Left: Photobooth sheet preview */}
                <div className="flex flex-col items-center gap-5">
                  <div className="pink-result-box pink-result-paper-mockup p-6 rounded-[28px] bg-gradient-to-br from-[#fff7fb] to-[#fff]/40 border border-pink-100/60 shadow-inner flex items-center justify-center w-full">
                    {isGeneratingGuestResult && (
                      <div className="flex flex-col items-center gap-3 text-sm font-black text-[#f73591] py-12">
                        <Loader2 className="size-10 animate-spin" />
                        <span>Đang rửa ảnh, bạn đợi xíu nha…</span>
                      </div>
                    )}
                    {!isGeneratingGuestResult && guestPreviewUrl && (
                      <div className="relative group p-2 bg-white rounded-xl shadow-lg border border-slate-100/80 transform hover:scale-[1.01] transition-all duration-300">
                        <img src={guestPreviewUrl} alt="Tờ in photobooth 13x18 hoàn thành" className="pink-result-image max-w-full rounded-lg border border-slate-50 shadow-sm" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                      </div>
                    )}
                    {!isGeneratingGuestResult && !guestPreviewUrl && (
                      <div className="text-sm font-black text-pink-400 py-12">Chờ bạn ở bước rửa ảnh nha…</div>
                    )}
                  </div>


                </div>

                {/* Right: QR Code and URL Link Box */}
                {guestShare?.shareUrl && (
                  <div className="pink-premium-qr-card p-6 md:p-8 rounded-3xl border border-[#ffc6e2] bg-white flex flex-col justify-between items-center gap-5 shadow-lg w-full max-w-full relative overflow-hidden">
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-pink-100/30 rounded-full blur-xl pointer-events-none" />
                    
                    {/* Header */}
                    <div className="w-full text-center">
                      <h3 className="font-black text-[#74194a] text-base flex items-center justify-center gap-2">
                        <QrCode className="size-5 text-[#f73591]" />
                        <span>Tải ảnh về điện thoại</span>
                      </h3>
                      <p className="text-xs text-[#7a4962] font-bold mt-1.5 leading-relaxed">
                        Quét mã QR để tải bản in và từng khung ảnh chất lượng cao.
                      </p>
                      {guestShareExpiryText && (
                        <p className="pink-qr-expiry">
                          {guestShareExpiryText}
                        </p>
                      )}
                    </div>

                    {/* QR Code with decorative border and laser scanning animation */}
                    <div className="relative p-4 bg-white rounded-2xl border border-pink-100 shadow-md group overflow-hidden">
                      <div className="absolute inset-0 border-2 border-dashed border-[#ff91c6]/30 rounded-2xl group-hover:border-[#f73591]/50 transition-colors pointer-events-none" />
                      
                      {/* Laser scanning line effect */}
                      <div className="pink-scanner-line absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f73591] to-transparent z-10 pointer-events-none" />
                      
                      {guestQrUrl ? (
                        <img src={guestQrUrl} alt="Mã QR tải ảnh photobooth" className="w-[180px] h-[180px] object-contain rounded-lg shadow-sm" />
                      ) : (
                        <div className="w-[180px] h-[180px] flex items-center justify-center text-xs font-bold text-pink-400">
                          QR chưa sẵn sàng
                        </div>
                      )}
                    </div>

                    {/* Integrated copy link field */}
                    <div className="w-full mt-2">
                      <div className="pink-copy-input-group flex items-center border border-[#ffc6e2] rounded-full p-1 bg-[#fff7fb] hover:border-[#f73591] focus-within:border-[#f73591] transition-all shadow-inner">
                        <input
                          type="text"
                          readOnly
                          value={guestShare.shareUrl}
                          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#8f3d68] font-bold outline-none select-all overflow-hidden text-ellipsis whitespace-nowrap"
                        />
                        <button
                          type="button"
                          onClick={copyGuestShareLink}
                          className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                            isCopiedShareLink 
                              ? 'bg-emerald-500 text-white shadow-sm' 
                              : 'bg-[#ffe3f0] text-[#f73591] hover:bg-[#f73591] hover:text-white'
                          }`}
                        >
                          {isCopiedShareLink ? (
                            <>
                              <Check className="size-3.5" />
                              <span>Đã copy!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status or Alerts */}
              {guestNotice && (
                <div className="pink-alert mb-5 flex items-start gap-2.5 text-left bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-bold shadow-sm max-w-2xl mx-auto">
                  <Info className="size-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{guestNotice}</span>
                </div>
              )}

              {guestPrintFallbackAvailable && (
                <div className="pink-print-retry-panel max-w-2xl mx-auto mb-6">
                  <button
                    type="button"
                    onClick={printGuestPhoto}
                    disabled={isGuestPrinting || !guestPreviewUrl}
                    className="pink-outline-btn"
                  >
                    {isGuestPrinting ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                    Thử in lại
                  </button>
                  <button
                    type="button"
                    onClick={openGuestBrowserPrintFallback}
                    disabled={!guestPreviewUrl}
                    className="pink-outline-btn"
                  >
                    <Printer className="size-4" />
                    Mở in thủ công
                  </button>
                </div>
              )}

              {/* Main Call to Action: Start New Session */}
              <div className="flex justify-center border-t border-pink-100 pb-2 pt-6 mt-4">
                <button
                  type="button"
                  onClick={startGuestNextSessionNow}
                  className="pink-btn px-10 py-4.5 bg-gradient-to-r from-[#f73591] via-[#ff54a8] to-[#ff73be] hover:from-[#e3247d] hover:to-[#f05fa7] text-white font-black rounded-full shadow-lg hover:shadow-pink-200/60 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3.5 text-base cursor-pointer"
                >
                  <RotateCcw className="size-5" />
                  <span>Bắt đầu lượt mới ngay</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-800 mb-2">
            {isPartnerMode ? 'Công Cụ Chuẩn Hóa Khung Photobooth' : 'Trạm Ghép Ảnh Photobooth Pro'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isPartnerMode
              ? 'Upload khung, chỉnh vùng slot chuẩn rồi xuất gói JSON gửi lại'
              : 'Thư viện khung, nhận diện slot tự động và lưu cache chỉnh sửa'}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl mb-4">
                <button type="button"
                  onClick={() => setInteractionMode('library')}
                  className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg font-bold text-[13px] transition-all ${
                    interactionMode === 'library' ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid size={16} /> Chọn khung
                </button>
                <button type="button"
                  onClick={() => setInteractionMode('move')}
                  disabled={!originalFrame}
                  className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg font-bold text-[13px] transition-all disabled:opacity-40 ${
                    interactionMode === 'move' ? 'bg-white text-emerald-600 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Hand size={16} /> {isPartnerMode ? 'Test ảnh' : 'Chèn ảnh'}
                </button>
                <button type="button"
                  onClick={() => setInteractionMode('cut')}
                  disabled={!originalFrame}
                  className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg font-bold text-[13px] transition-all disabled:opacity-40 ${
                    interactionMode === 'cut' ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <SquareDashed size={16} /> Sửa slot
                </button>
              </div>

              <input
                type="file"
                accept="application/json,.json"
                multiple
                className="hidden"
                ref={slotDataInputRef}
                aria-label="Import slot JSON files"
                onChange={handleSlotDataImport}
              />

              {interactionMode === 'library' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-indigo-600 flex items-center gap-2">
                      <ImagePlus size={18} /> Thư viện khung ({visibleFrameLibrary.length})
                    </h3>
                    <input type="file" accept="image/*" className="hidden" ref={frameInputRef} aria-label="Upload frame image" onChange={handleFrameUpload} />
                    <button type="button"
                      onClick={() => frameInputRef.current.click()}
                      className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Upload size={14} /> Upload
                    </button>
                  </div>

                  {!isPartnerMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button type="button"
                        onClick={analyzeAllFrameProfiles}
                        disabled={Boolean(analyzingFrameName)}
                        className="px-3 py-2.5 text-[13px] font-bold rounded-lg border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Sparkles size={15} /> Phân tích toàn bộ khung
                      </button>
                      <button type="button"
                        onClick={cleanupOrphanFrameProfiles}
                        className="px-3 py-2.5 text-[13px] font-bold rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center gap-2"
                      >
                        <Trash2 size={15} /> Dọn hồ sơ khung không còn tồn tại
                      </button>
                    </div>
                  )}

                  {!isPartnerMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button"
                      onClick={() => slotDataInputRef.current?.click()}
                      className="px-3 py-2.5 text-[13px] font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-2"
                    >
                      <Upload size={15} /> Nhập nhiều JSON
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (!isPartnerMode) {
                          const url = `${window.location.origin}${window.location.pathname}?mode=partner`;
                          navigator.clipboard?.writeText(url);
                          setCacheStatus(`Link cộng tác viên: ${url}`);
                        } else {
                          setCacheStatus('Bạn đang ở chế độ cộng tác viên.');
                        }
                      }}
                      className="px-3 py-2.5 text-[13px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-2"
                    >
                      <User size={15} /> Link cộng tác viên
                    </button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                    {visibleFrameLibrary.map((frame) => (
                      <div key={`${frame.source || 'library'}-${frame.name}-${frame.width || ''}-${frame.height || ''}`} className="space-y-1">
                        <button type="button"
                          onClick={() => loadFrame(frame)}
                          className={`aspect-[3/4] w-full rounded-lg border overflow-hidden bg-slate-100 hover:ring-2 hover:ring-indigo-300 transition ${
                            selectedFrame?.name === frame.name ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-slate-200'
                          }`}
                          title={frame.name}
                        >
                          <img src={frame.url} alt={frame.name} className="size-full object-cover" loading="lazy" />
                        </button>
                        {!isPartnerMode && (
                          <button type="button"
                            onClick={() => analyzeFrameProfile(frame)}
                            disabled={analyzingFrameName === frame.name}
                            className="w-full rounded-lg border border-pink-200 bg-pink-50 px-2 py-1 text-[10px] font-black text-pink-700 hover:bg-pink-100 disabled:opacity-50"
                          >
                            {frameProfiles[frame.name] ? 'Phân tích lại' : 'Phân tích khung'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    {frameProfileStatus || cacheStatus}
                  </div>
                </div>
              )}

              {interactionMode === 'move' && originalFrame && (
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg text-[13px] font-medium border flex items-start gap-2 ${zones.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p>
                      {zones.length > 0
                        ? isPartnerMode
                          ? <>Khung này có <b>{zones.length} slot ảnh</b>. Tải đúng <b>{zones.length} ảnh test</b> để kiểm tra vùng slot trước khi xuất gói JSON.</>
                          : <>Khung này có <b>{zones.length} slot ảnh</b>. Hãy tải đúng <b>{zones.length} ảnh</b> để hệ thống tự căn photobooth.</>
                        : 'Chưa có slot nào. Hãy chuyển sang tab Sửa slot để vẽ thủ công.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] uppercase font-bold text-slate-500">Ảnh đã tải</p>
                      <p className="text-lg font-black text-slate-800">{photos.length}/{requiredPhotoCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] uppercase font-bold text-slate-500">Phân tích</p>
                      <p className="text-xs font-bold text-slate-700">{photoAnalysisStatus}</p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-[13px] font-medium">
                      {uploadError}
                    </div>
                  )}

                  <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} aria-label="Upload guest photos" onChange={handlePhotoUpload} />
                  <button type="button"
                    onClick={() => fileInputRef.current.click()}
                    disabled={!canUploadPhotos}
                    className="w-full bg-emerald-500 text-white py-3.5 rounded-xl hover:bg-emerald-600 transition font-bold shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzingPhotos ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {isAnalyzingPhotos
                      ? 'Đang ghép ảnh…'
                      : isPartnerMode
                        ? `Tải ${requiredPhotoCount || 0} ảnh test`
                        : `Tải đúng ${requiredPhotoCount || 0} ảnh`}
                  </button>

                  {slotAssignments.length > 0 && (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      {slotAssignments.map((assignment) => (
                        <div key={assignment.photoId} className="flex items-center justify-between px-3 py-2 text-xs border-b last:border-b-0 border-slate-100">
                          <span className="font-bold text-slate-600">Slot {assignment.slotIndex + 1}</span>
                          <span className="text-slate-500">
                            {assignment.method === 'slot-contain' ? 'Vừa khung' : 'Phủ kín'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`p-4 rounded-xl border transition-colors ${selectedPhoto ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700 text-sm">
                      <ZoomIn size={16} /> Tùy chỉnh ảnh đang chọn
                    </h4>
                    <label className="text-sm text-slate-600 flex justify-between mb-1">
                      <span>Kích thước</span>
                      <span className="font-bold">{selectedPhoto ? Math.round(selectedPhoto.scale * 100) : 100}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.05"
                      value={selectedPhoto?.scale || 1}
                      onChange={(event) => selectedPhotoId && updatePhoto(selectedPhotoId, { scale: parseFloat(event.target.value) })}
                      aria-label="Photo scale"
                      className="w-full accent-emerald-500 mb-4"
                      disabled={!selectedPhoto}
                    />
                    <label className="text-sm text-slate-600 flex justify-between mb-1">
                      <span>Góc xoay</span>
                      <span className="font-bold">{Math.round(selectedPhoto?.rotation || 0)}°</span>
                    </label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedPhoto?.rotation || 0}
                      onChange={(event) => selectedPhotoId && updatePhoto(selectedPhotoId, { rotation: parseInt(event.target.value, 10) })}
                      aria-label="Photo rotation"
                      className="w-full accent-emerald-500 mb-4"
                      disabled={!selectedPhoto}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => selectedPhotoId && duplicatePhoto(selectedPhotoId)} disabled={!selectedPhoto} className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-300 py-2 rounded-lg text-sm hover:bg-slate-50 transition font-medium disabled:opacity-50">
                        <Copy size={16} /> Copy
                      </button>
                      <button type="button" onClick={() => selectedPhotoId && removePhoto(selectedPhotoId)} disabled={!selectedPhoto} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm hover:bg-red-100 transition font-medium disabled:opacity-50">
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {interactionMode === 'cut' && originalFrame && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                    <button type="button"
                      onClick={() => setSlotEditTool('select')}
                      className={`py-2 flex items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition ${
                        slotEditTool === 'select' ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <MousePointer2 size={15} /> Chỉnh slot
                    </button>
                    <button type="button"
                      onClick={() => {
                        setSlotEditTool('draw');
                        setSelectedZoneId(null);
                      }}
                      className={`py-2 flex items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition ${
                        slotEditTool === 'draw' ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Plus size={15} /> Thêm slot
                    </button>
                  </div>

                  <div className="flex items-start gap-2 text-indigo-800 text-[12px] leading-tight bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <Info size={16} className="shrink-0 text-indigo-500" />
                    <p>
                      {slotEditTool === 'draw'
                        ? 'Kéo trên khung để tạo vùng slot mới. Tạo xong app sẽ tự chuyển về chế độ chỉnh.'
                        : 'Bấm một slot để chọn, kéo cả vùng để di chuyển, kéo chấm tím để sửa góc, bấm chấm xanh giữa cạnh để thêm điểm.'}
                    </p>
                  </div>

                  {zones.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase text-slate-500">Danh sách slot</p>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{zones.length} slot</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {zones.map((zone) => (
                          <button type="button"
                            key={zone.id}
                            onClick={() => {
                              setSelectedZoneId(zone.id);
                              setSlotEditTool('select');
                            }}
                            className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                              selectedZoneId === zone.id
                                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block font-black">Slot {zone.slotIndex + 1}</span>
                            <span>{Math.round(zone.width)} x {Math.round(zone.height)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`p-3 rounded-lg border ${selectedZone ? 'border-indigo-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{selectedZone ? `Đang chọn Slot ${selectedZone.slotIndex + 1}` : 'Chưa chọn slot'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Dịch {slotNudgeStep}px mỗi lần, nới/thu {slotResizeStep}px.</p>
                      </div>
                      <button type="button"
                        onClick={() => selectedZone && removeZone(selectedZone.id)}
                        disabled={!selectedZone}
                        className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 disabled:opacity-40"
                        title="Xóa slot đang chọn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_112px] gap-3">
                      <div>
                        <p className="text-[11px] uppercase font-black text-slate-400 mb-2">Di chuyển</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <span />
                          <button type="button" onClick={() => nudgeSelectedZone(0, -slotNudgeStep)} disabled={!selectedZone} className="h-10 rounded-lg border bg-white hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40" title="Dịch lên">
                            <ArrowUp size={17} className="mx-auto" />
                          </button>
                          <span />
                          <button type="button" onClick={() => nudgeSelectedZone(-slotNudgeStep, 0)} disabled={!selectedZone} className="h-10 rounded-lg border bg-white hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40" title="Dịch trái">
                            <ArrowLeft size={17} className="mx-auto" />
                          </button>
                          <div className="h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400">
                            Slot
                          </div>
                          <button type="button" onClick={() => nudgeSelectedZone(slotNudgeStep, 0)} disabled={!selectedZone} className="h-10 rounded-lg border bg-white hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40" title="Dịch phải">
                            <ArrowRight size={17} className="mx-auto" />
                          </button>
                          <span />
                          <button type="button" onClick={() => nudgeSelectedZone(0, slotNudgeStep)} disabled={!selectedZone} className="h-10 rounded-lg border bg-white hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40" title="Dịch xuống">
                            <ArrowDown size={17} className="mx-auto" />
                          </button>
                          <span />
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase font-black text-slate-400 mb-2">Kích thước</p>
                        <div className="grid grid-rows-2 gap-1.5">
                          <button type="button" onClick={() => selectedZone && resizeZoneBy(selectedZone.id, slotResizeStep)} disabled={!selectedZone} className="h-[62px] rounded-lg border bg-white hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 flex flex-col items-center justify-center gap-1" title="Nới vùng">
                            <Maximize2 size={17} />
                            <span className="text-[11px] font-bold">Nới</span>
                          </button>
                          <button type="button" onClick={() => selectedZone && resizeZoneBy(selectedZone.id, -slotResizeStep)} disabled={!selectedZone} className="h-[62px] rounded-lg border bg-white hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40 flex flex-col items-center justify-center gap-1" title="Thu vùng">
                            <Minimize2 size={17} />
                            <span className="text-[11px] font-bold">Thu</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                      <Download size={14} /> Dữ liệu slot
                    </p>
                    <div className={`grid ${isPartnerMode ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                      <button type="button"
                        onClick={handleFramePackageExport}
                        disabled={zones.length === 0}
                        className="py-2 border rounded-lg text-[13px] font-bold bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <Download size={15} /> Xuất gói JSON
                      </button>
                      {!isPartnerMode && (
                        <button type="button"
                          onClick={() => slotDataInputRef.current?.click()}
                          className="py-2 border rounded-lg text-[13px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-1"
                        >
                          <Upload size={15} /> Nhập JSON
                        </button>
                      )}
                    </div>
                  </div>

                  <button type="button" onClick={() => originalImgRef.current && runAutoDetect(originalImgRef.current, cacheKey)} className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 py-2 rounded-lg text-sm hover:bg-slate-50 transition font-medium">
                    <Sparkles size={16} /> Quét lại slot
                  </button>
                  <button type="button" onClick={handleClearCache} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm hover:bg-red-100 transition font-medium">
                    <RefreshCcw size={16} /> Xóa cache khung này
                  </button>
                  <button type="button" onClick={handleClearCacheAndRedetect} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white border border-indigo-700 py-2 rounded-lg text-sm hover:bg-indigo-700 transition font-medium">
                    <Sparkles size={16} /> Xóa cache và quét lại
                  </button>
                </div>
              )}
            </div>

            {!isPartnerMode && (
              <button type="button"
                onClick={handleExport}
                disabled={!canExport}
                className="mt-auto w-full bg-slate-900 text-white py-4 rounded-2xl hover:bg-slate-800 transition shadow-lg font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={canExport ? 'Xuất ảnh' : `Cần tải đúng ${requiredPhotoCount || 0} ảnh`}
              >
                <Download size={22} /> Xuất ảnh hoàn thành
              </button>
            )}
          </div>

          <div className="lg:col-span-7 xl:col-span-8 bg-slate-200/60 rounded-3xl border-2 border-dashed border-slate-300 p-2 md:p-6 flex items-center justify-center min-h-[500px] md:min-h-[760px] relative overflow-auto" style={getCanvasBackgroundStyle()}>
            {originalFrame && (
              <div className="absolute top-4 left-4 z-40 flex items-center bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 overflow-hidden">
                <button type="button"
                  onClick={() => setEditorZoom((prev) => clampZoom(prev - 0.25))}
                  className="p-2 transition text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                  disabled={editorZoom <= 0.75}
                  title="Thu nhỏ khung"
                >
                  <ZoomOut size={18} />
                </button>
                <button type="button"
                  onClick={() => setEditorZoom(1)}
                  className="min-w-14 p-2 text-xs font-black text-slate-600 border-x border-slate-200 hover:bg-slate-100"
                  title="Đặt zoom về 100%"
                >
                  {editorZoomPercent}%
                </button>
                <button type="button"
                  onClick={() => setEditorZoom((prev) => clampZoom(prev + 0.25))}
                  className="p-2 transition text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                  disabled={editorZoom >= 3}
                  title="Phóng to khung"
                >
                  <ZoomIn size={18} />
                </button>
              </div>
            )}

            {originalFrame && (
              <div className="absolute top-4 right-4 z-40 flex bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 overflow-hidden">
                <button type="button" onClick={() => setCanvasBg('checkerboard')} className={`p-2 transition ${canvasBg === 'checkerboard' ? 'bg-slate-200 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Nền caro">
                  <LayoutGrid size={18} />
                </button>
                <button type="button" onClick={() => setCanvasBg('dark')} className={`p-2 transition ${canvasBg === 'dark' ? 'bg-slate-200 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Nền đen">
                  <Moon size={18} />
                </button>
                <button type="button" onClick={() => setCanvasBg('light')} className={`p-2 transition ${canvasBg === 'light' ? 'bg-slate-200 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Nền trắng">
                  <Sun size={18} />
                </button>
              </div>
            )}

            {!originalFrame ? (
              <div className="text-center text-slate-400 bg-white/90 p-8 rounded-3xl shadow-sm backdrop-blur-sm border border-slate-100">
                <ImagePlus size={54} className="mx-auto mb-4 text-indigo-400 opacity-60" />
                <p className="font-bold text-xl text-slate-600 mb-1">Khu vực thiết kế</p>
                <p className="text-sm">Chọn một khung trong thư viện để bắt đầu.</p>
              </div>
            ) : (
              <div
                ref={editorRef}
                onPointerDown={handleEditorPointerDown}
                onPointerMove={handleEditorPointerMove}
                onPointerUp={handleEditorPointerUp}
                onPointerLeave={() => (drawingZone || editingPoint || draggingZone) && handleEditorPointerUp()}
                onWheel={handleEditorWheel}
                className="editor-frame-surface relative shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden rounded-md bg-transparent select-none transition-opacity duration-300"
                style={{
                  '--editor-width': `${editorZoom * 100}%`,
                  '--editor-max-width': editorMaxWidth,
                  '--editor-min-width': editorZoom > 1 ? `${Math.round(360 * editorZoom)}px` : undefined,
                  '--editor-aspect-ratio': frameDimensions.height > 0 ? `${frameDimensions.width} / ${frameDimensions.height}` : 'auto',
                  '--editor-cursor': interactionMode === 'cut' && slotEditTool === 'draw' ? 'crosshair' : 'default',
                  '--editor-opacity': isAutoDetecting ? 0.5 : 1,
                }}
              >
                <div className="absolute inset-0 z-0 pointer-events-none">
                  {photos.map((photo) => {
                    const assignedZone = getPhotoZone(photo, zones);
                    return (
                      <div
                        key={photo.id}
                        className="absolute inset-0"
                        style={{
                          clipPath: getFrameClipPath(assignedZone, frameDimensions, SLOT_PHOTO_BLEED_PIXELS),
                          zIndex: selectedPhotoId === photo.id ? 5 : 1,
                        }}
                      >
                        <div
                          className="editor-photo-layer absolute touch-none"
                          style={{
                            '--photo-left': `${(photo.x / frameDimensions.width) * 100}%`,
                            '--photo-top': `${(photo.y / frameDimensions.height) * 100}%`,
                            '--photo-width': `${((photo.naturalWidth * photo.scale) / frameDimensions.width) * 100}%`,
                            '--photo-height': `${((photo.naturalHeight * photo.scale) / frameDimensions.height) * 100}%`,
                            '--photo-rotation': `${photo.rotation || 0}deg`,
                            '--photo-pointer-events': interactionMode === 'move' ? 'auto' : 'none',
                            '--photo-cursor': interactionMode === 'move' ? 'move' : 'default',
                          }}
                          onPointerDown={(event) => handlePhotoPointerDown(event, photo.id)}
                        >
                          <img src={photo.url} alt="Ảnh khách" className="size-full object-cover pointer-events-none" />
                          {selectedPhotoId === photo.id && interactionMode === 'move' && (
                            <div className="absolute inset-0 ring-[3px] ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute inset-0 pointer-events-none z-10">
                  <canvas ref={frameCanvasRef} width={frameDimensions.width} height={frameDimensions.height} className="size-full drop-shadow-sm" />
                </div>

                {interactionMode === 'cut' && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <svg
                      className="absolute inset-0 size-full"
                      viewBox={`0 0 ${frameDimensions.width} ${frameDimensions.height}`}
                      preserveAspectRatio="none"
                    >
                      {zones.map((zone) => {
                        const points = rectToPoints(zone);
                        const isSelected = selectedZoneId === zone.id;
                        const handleRadius = Math.max(9, frameDimensions.width * 0.01);
                        const edgeRadius = Math.max(6, frameDimensions.width * 0.007);
                        const hitRadius = Math.max(18, frameDimensions.width * 0.018);
                        return (
                          <g key={zone.id}>
                            <polygon
                              points={getSvgPoints(zone)}
                              fill={isSelected ? 'rgba(16,185,129,0.16)' : 'rgba(99,102,241,0.10)'}
                              stroke={isSelected ? '#10b981' : '#6366f1'}
                              strokeWidth={isSelected ? Math.max(3, frameDimensions.width * 0.004) : Math.max(2, frameDimensions.width * 0.003)}
                              vectorEffect="non-scaling-stroke"
                              className="pointer-events-auto cursor-move"
                              onPointerDown={(event) => handleZoneBodyPointerDown(event, zone.id)}
                            />
                            <text
                              x={zone.center.x}
                              y={zone.center.y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={isSelected ? '#047857' : '#4f46e5'}
                              fontSize={Math.max(18, frameDimensions.width * 0.03)}
                              fontWeight="900"
                              paintOrder="stroke"
                              stroke="rgba(255,255,255,0.92)"
                              strokeWidth={Math.max(3, frameDimensions.width * 0.006)}
                              className="pointer-events-none select-none"
                            >
                              {zone.slotIndex + 1}
                            </text>
                            {isSelected && points.map((point, index) => {
                              const nextPoint = points[(index + 1) % points.length];
                              const midX = (point.x + nextPoint.x) / 2;
                              const midY = (point.y + nextPoint.y) / 2;
                              return (
                                <g key={`${zone.id}-edge-${index}`}>
                                  <circle
                                    cx={midX}
                                    cy={midY}
                                    r={hitRadius}
                                    fill="transparent"
                                    className="pointer-events-auto cursor-copy"
                                    onPointerDown={(event) => handleEdgeHandlePointerDown(event, zone.id, index)}
                                  />
                                  <circle
                                    cx={midX}
                                    cy={midY}
                                    r={edgeRadius}
                                    fill="#ffffff"
                                    stroke="#10b981"
                                    strokeWidth={Math.max(2, frameDimensions.width * 0.0025)}
                                    vectorEffect="non-scaling-stroke"
                                    className="pointer-events-none"
                                  />
                                </g>
                              );
                            })}
                            {isSelected && points.map((point, index) => (
                              <g key={`${zone.id}-point-${index}`}>
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={hitRadius}
                                  fill="transparent"
                                  className="pointer-events-auto cursor-move"
                                  onPointerDown={(event) => handleZonePointPointerDown(event, zone.id, index)}
                                  onDoubleClick={(event) => {
                                    event.stopPropagation();
                                    removeZonePoint(zone.id, index);
                                  }}
                                />
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={handleRadius}
                                  fill={editingPoint?.zoneId === zone.id && editingPoint?.pointIndex === index ? '#10b981' : '#6366f1'}
                                  stroke="#ffffff"
                                  strokeWidth={Math.max(2, frameDimensions.width * 0.003)}
                                  vectorEffect="non-scaling-stroke"
                                  className="pointer-events-none"
                                />
                              </g>
                            ))}
                          </g>
                        );
                      })}
                    </svg>
                    {zones.flatMap((zone) => (selectedZoneId === zone.id ? [
                      (
                      <button type="button"
                        key={`${zone.id}-remove`}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          removeZone(zone.id);
                        }}
                        className="absolute bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 pointer-events-auto"
                        style={{
                          left: `${((zone.x + zone.width) / frameDimensions.width) * 100}%`,
                          top: `${(zone.y / frameDimensions.height) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title="Xóa slot"
                      >
                          <Trash2 size={14} />
                      </button>
                      ),
                    ] : []))}
                    {drawingZone && (
                      <div
                        className="absolute border-2 border-dashed border-indigo-400 bg-indigo-400/20"
                        style={{
                          left: `${(Math.min(drawingZone.startX, drawingZone.currentX) / frameDimensions.width) * 100}%`,
                          top: `${(Math.min(drawingZone.startY, drawingZone.currentY) / frameDimensions.height) * 100}%`,
                          width: `${(Math.abs(drawingZone.currentX - drawingZone.startX) / frameDimensions.width) * 100}%`,
                          height: `${(Math.abs(drawingZone.currentY - drawingZone.startY) / frameDimensions.height) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                )}

                {isAutoDetecting && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                    <Loader2 size={40} className="text-indigo-600 animate-spin mb-2" />
                    <p className="font-bold text-indigo-700">Đang quét slot trong suốt…</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
