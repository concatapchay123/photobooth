import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import ffmpeg from 'ffmpeg-static';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { copyFile, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';


const STORE_SCHEMA = 'photobooth-frame-package:v1';
const SLOT_SCHEMA = 'photobooth-slot-map:v1';
const GUEST_OUTPUT_SCHEMA = 'photobooth-guest-output:v1';
const STORE_DIR = path.resolve(process.cwd(), 'data/frame-packages');
const GUEST_OUTPUT_DIR = path.resolve(process.cwd(), 'data/guest-outputs');
const SAVED_SESSION_DIR = path.resolve(process.cwd(), 'data/saved-sessions');
const PUBLIC_SHARE_ORIGIN_PATH = path.resolve(process.cwd(), 'data/public-share-origin.json');
const PUBLIC_SHARE_ORIGIN_MAX_AGE_MS = 2 * 60 * 1000;
const GUEST_OUTPUT_TTL_MS = 2 * 60 * 60 * 1000;
const GUEST_OUTPUT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const FRAME_PROFILE_SCHEMA = 'photobooth-frame-profiles:v1';
const FRAME_PROFILES_PATH = path.resolve(process.cwd(), 'frames/frame-profiles.json');
const RENTAL_KIOSKS_PATH = path.resolve(process.cwd(), 'data/rental/kiosks.json');
const RENTAL_KIOSK_SCHEMA = 'photobooth-rental-kiosks:v1';
let lastGuestOutputCleanupAt = 0;

// In-memory kiosk state relay. Keys keep one renter's kiosk isolated from another.
const kioskRelayStates = new Map();
const kioskPendingCommands = new Map();
const kioskSessionCompleteEvents = new Map();
const activePythonProcesses = new Map();

const ensureStoreDir = () => {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
};

const ensureGuestOutputDir = () => {
  if (!existsSync(GUEST_OUTPUT_DIR)) mkdirSync(GUEST_OUTPUT_DIR, { recursive: true });
};

const ensureSavedSessionDir = () => {
  if (!existsSync(SAVED_SESSION_DIR)) mkdirSync(SAVED_SESSION_DIR, { recursive: true });
};

const ensureFrameProfilesDir = () => {
  const dir = path.dirname(FRAME_PROFILES_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const isRentalProtectionEnabled = (env = {}) => String(
  env.PHOTOBOOTH_RENTAL_MODE || process.env.PHOTOBOOTH_RENTAL_MODE || '',
).trim().toLowerCase() === 'true';

const hashAccessToken = (token) => createHash('sha256').update(String(token || '')).digest('hex');

const tokensMatch = (actualToken, expectedHash) => {
  const actualHash = Buffer.from(hashAccessToken(actualToken), 'utf8');
  const expected = Buffer.from(String(expectedHash || ''), 'utf8');
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
};

const readRentalKiosks = async () => {
  try {
    const payload = JSON.parse(await readFile(RENTAL_KIOSKS_PATH, 'utf8'));
    return payload?.schema === RENTAL_KIOSK_SCHEMA && Array.isArray(payload.kiosks) ? payload.kiosks : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const getRentalAccess = async (req, env = {}) => {
  if (!isRentalProtectionEnabled(env)) return { role: 'local', kioskId: 'local', tenantId: null };

  const token = String(req.headers['x-photobooth-access-token'] || '');
  const adminToken = String(env.PHOTOBOOTH_RENTAL_ADMIN_TOKEN || process.env.PHOTOBOOTH_RENTAL_ADMIN_TOKEN || '');
  if (adminToken && tokensMatch(token, hashAccessToken(adminToken))) {
    return { role: 'admin', kioskId: 'admin', tenantId: null };
  }

  const kioskId = String(req.headers['x-photobooth-kiosk-id'] || '').toLowerCase();
  const requestedRole = String(req.headers['x-photobooth-access-role'] || '').toLowerCase();
  const kiosk = (await readRentalKiosks()).find((item) => item.id === kioskId);
  if (!kiosk || kiosk.status !== 'active') return { role: 'anonymous', kioskId: null, tenantId: null };
  if (kiosk.expiresAt && Date.parse(kiosk.expiresAt) <= Date.now()) return { role: 'anonymous', kioskId: null, tenantId: null };

  const expectedHash = requestedRole === 'dashboard' ? kiosk.dashboardTokenHash : kiosk.kioskTokenHash;
  if (!expectedHash || !tokensMatch(token, expectedHash)) return { role: 'anonymous', kioskId: null, tenantId: null };
  return { role: requestedRole === 'dashboard' ? 'dashboard' : 'kiosk', kioskId: kiosk.id, tenantId: kiosk.tenantId || kiosk.id };
};

const getKioskRelayKey = (access) => access?.kioskId || 'local';

const canAccessRentalRoute = (req, url, access) => {
  if (access.role === 'local' || access.role === 'admin') return true;

  // Guest download links intentionally remain public. Their IDs are random and expire.
  if (req.method === 'GET' && (url.pathname.startsWith('/guest/') || url.pathname.startsWith('/api/guest-output/'))) return true;

  if (url.pathname === '/api/guest-output/save') return access.role === 'kiosk';
  if (url.pathname.startsWith('/api/frame-store/')) return req.method === 'GET' && ['kiosk', 'dashboard'].includes(access.role);
  if (url.pathname === '/api/print' || url.pathname.startsWith('/api/dslr/')) return access.role === 'kiosk';

  if (url.pathname === '/api/admin/kiosk-state') {
    return (req.method === 'POST' && access.role === 'kiosk') || (req.method === 'GET' && access.role === 'dashboard');
  }
  if (url.pathname === '/api/admin/kiosk-command') return req.method === 'POST' && access.role === 'dashboard';
  if (url.pathname === '/api/admin/sessions' || url.pathname === '/api/admin/session-image') return req.method === 'GET' && access.role === 'dashboard';

  return false;
};

const emptyFrameProfiles = () => ({ schema: FRAME_PROFILE_SCHEMA, updatedAt: null, profiles: {} });

const readFrameProfiles = async () => {
  ensureFrameProfilesDir();
  try {
    const raw = await readFile(FRAME_PROFILES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed?.schema === FRAME_PROFILE_SCHEMA && parsed?.profiles && typeof parsed.profiles === 'object') return parsed;
    return { ...emptyFrameProfiles(), profiles: parsed?.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {} };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      const backupPath = `${FRAME_PROFILES_PATH}.broken-${Date.now()}.bak`;
      try { await copyFile(FRAME_PROFILES_PATH, backupPath); } catch {}
    }
    const empty = emptyFrameProfiles();
    await writeFrameProfiles(empty);
    return empty;
  }
};

const writeFrameProfiles = async (payload) => {
  ensureFrameProfilesDir();
  const nextPayload = { ...payload, schema: FRAME_PROFILE_SCHEMA, updatedAt: new Date().toISOString(), profiles: payload?.profiles || {} };
  const tempPath = `${FRAME_PROFILES_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(nextPayload, null, 2), 'utf8');
  renameSync(tempPath, FRAME_PROFILES_PATH);
  return nextPayload;
};

const getExistingFrameNames = async () => {
  const names = new Set();
  for (const item of await listStoredPackages()) names.add(item.name);
  return names;
};

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 180 * 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const getPackageKey = (payload) => {
  const frameName = payload?.slotMap?.frameName || payload?.frameName || payload?.frame?.name || 'frame';
  const width = payload?.slotMap?.frameWidth || payload?.frameWidth || payload?.frame?.width || 0;
  const height = payload?.slotMap?.frameHeight || payload?.frameHeight || payload?.frame?.height || 0;
  return `${frameName}:${width}x${height}`;
};

const getPackageId = (payload) => createHash('sha1').update(getPackageKey(payload)).digest('hex').slice(0, 16);

const getPackagePath = (id) => path.join(STORE_DIR, `${id}.json`);

const sanitizeOutputId = (id) => String(id || '').replace(/[^a-f0-9]/gi, '').slice(0, 32);

const sanitizeClientRequestId = (id) => String(id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);

const getGuestOutputPath = (id) => path.join(GUEST_OUTPUT_DIR, `${id}.json`);

const createGuestOutputId = () => randomBytes(8).toString('hex');

const getGuestOutputExpiresAtMs = (payload) => {
  const explicitExpiry = Date.parse(payload?.expiresAt || '');
  if (Number.isFinite(explicitExpiry)) return explicitExpiry;

  const savedAt = Date.parse(payload?.savedAt || payload?.createdAt || '');
  if (Number.isFinite(savedAt)) return savedAt + GUEST_OUTPUT_TTL_MS;

  return 0;
};

const getGuestOutputExpiresAt = (payload) => {
  const expiresAt = getGuestOutputExpiresAtMs(payload);
  return expiresAt > 0 ? new Date(expiresAt).toISOString() : '';
};

const isGuestOutputExpired = (payload) => {
  const expiresAt = getGuestOutputExpiresAtMs(payload);
  return !expiresAt || Date.now() >= expiresAt;
};

const cleanupExpiredGuestOutputs = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && now - lastGuestOutputCleanupAt < GUEST_OUTPUT_CLEANUP_INTERVAL_MS) return;
  lastGuestOutputCleanupAt = now;
  ensureGuestOutputDir();

  const files = await readdir(GUEST_OUTPUT_DIR);
  await Promise.all(files
    .filter((file) => file.endsWith('.json'))
    .map(async (file) => {
      const filePath = path.join(GUEST_OUTPUT_DIR, file);
      try {
        const payload = JSON.parse(await readFile(filePath, 'utf8'));
        if (isGuestOutputExpired(payload)) {
          await unlink(filePath);
        }
      } catch {
        // Broken files are left untouched so they can be inspected manually.
      }
    }));
};

const readStoredPackage = async (id) => {
  const safeId = String(id || '').replace(/[^a-f0-9]/gi, '').slice(0, 40);
  if (!safeId) return null;
  try {
    const raw = await readFile(getPackagePath(safeId), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readGuestOutput = async (id) => {
  const safeId = sanitizeOutputId(id);
  if (!safeId) return null;
  try {
    const raw = await readFile(getGuestOutputPath(safeId), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const findGuestOutputByClientRequestId = async (clientRequestId, tenantId = null) => {
  const safeRequestId = sanitizeClientRequestId(clientRequestId);
  if (!safeRequestId) return null;
  ensureGuestOutputDir();
  const files = await readdir(GUEST_OUTPUT_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const payload = JSON.parse(await readFile(path.join(GUEST_OUTPUT_DIR, file), 'utf8'));
      if (payload?.clientRequestId !== safeRequestId) continue;
      if (tenantId && payload?.tenantId !== tenantId) continue;
      return payload;
    } catch {
      // Ignore a malformed legacy record and keep looking.
    }
  }
  return null;
};

const getMetadata = (id, payload) => ({
  id,
  name: payload?.slotMap?.frameName || payload?.frameName || payload?.frame?.name || 'khung',
  type: payload?.slotMap?.frameType || payload?.frameType || payload?.frame?.type || 'jpg',
  width: payload?.slotMap?.frameWidth || payload?.frameWidth || payload?.frame?.width || 0,
  height: payload?.slotMap?.frameHeight || payload?.frameHeight || payload?.frame?.height || 0,
  slotCount: payload?.slotMap?.slotCount || payload?.slotCount || payload?.slotMap?.zones?.length || payload?.zones?.length || 0,
  updatedAt: payload?.savedAt || payload?.exportedAt || null,
});

const listStoredPackages = async ({ includeSlotMaps = false } = {}) => {
  ensureStoreDir();
  const files = await readdir(STORE_DIR);
  const packages = [];
  for (const file of files.filter((name) => name.endsWith('.json'))) {
    const id = file.replace(/\.json$/, '');
    const payload = await readStoredPackage(id);
    if (payload?.schema === STORE_SCHEMA || (includeSlotMaps && payload?.schema === SLOT_SCHEMA)) {
      packages.push(getMetadata(id, payload));
    }
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
};

const rawGet = (urlStr) => new Promise((resolve, reject) => {
  // Spawn curl.exe with 5-second timeout, silent mode, and including headers
  const child = spawn('curl.exe', ['--max-time', '5', '-s', '-i', urlStr], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const chunks = [];
  const errChunks = [];

  child.stdout.on('data', (chunk) => {
    chunks.push(chunk);
  });

  child.stderr.on('data', (chunk) => {
    errChunks.push(chunk);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      const errMsg = Buffer.concat(errChunks).toString('utf8');
      reject(new Error(`curl failed with code ${code}: ${errMsg}`));
      return;
    }

    const rawData = Buffer.concat(chunks);
    let delimiterIndex = rawData.indexOf(Buffer.from('\r\n\r\n'));
    let delimiterLength = 4;
    if (delimiterIndex === -1) {
      delimiterIndex = rawData.indexOf(Buffer.from('\n\n'));
      delimiterLength = 2;
    }

    if (delimiterIndex === -1) {
      reject(new Error('Invalid HTTP response from curl'));
      return;
    }

    const headersStr = rawData.subarray(0, delimiterIndex).toString('utf8');
    const body = rawData.subarray(delimiterIndex + delimiterLength);

    const statusLine = headersStr.split(/\r?\n/)[0];
    const parts = statusLine.split(' ');
    const statusCode = parts.length > 1 ? parseInt(parts[1], 10) : 200;

    resolve({ statusCode, headers: headersStr, body });
  });

  child.on('error', (err) => {
    reject(err);
  });
});

const sendDataUrlImage = (res, dataUrl) => {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    sendJson(res, 404, { error: 'Image not found' });
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', match[1]);
  res.end(Buffer.from(match[2], 'base64'));
};

const parseDataUrlVideo = (dataUrl) => {
  const str = String(dataUrl || '');
  if (!str.startsWith('data:video/')) return null;
  const marker = ';base64,';
  const idx = str.indexOf(marker);
  if (idx === -1) return null;
  const fullMime = str.substring(5, idx); // after 'data:'
  const baseMime = fullMime.split(';')[0]; // strip codec params
  const base64 = str.substring(idx + marker.length);
  if (!base64) return null;
  return { mimeType: baseMime, buffer: Buffer.from(base64, 'base64') };
};

const sendDataUrlVideo = (res, dataUrl) => {
  const parsed = parseDataUrlVideo(dataUrl);
  if (!parsed) {
    sendJson(res, 404, { error: 'Video not found' });
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', parsed.mimeType);
  res.end(parsed.buffer);
};

const parseDataUrlImage = (dataUrl) => {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], 'base64'),
  };
};

const getImageExtension = (mimeType, fallback = 'png') => {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return fallback;
};

const convertWebmToMp4Helper = async (webmBuffer) => {
  if (!ffmpeg) {
    throw new Error('ffmpeg-static path not found');
  }

  const tempDir = path.resolve(process.cwd(), 'data/temp');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  const tempInputPath = path.join(tempDir, `temp-${Date.now()}-${randomBytes(4).toString('hex')}.webm`);
  const tempOutputPath = tempInputPath.replace(/\.webm$/, '.mp4');

  try {
    await writeFile(tempInputPath, webmBuffer);

    // Primary GPU-accelerated encoder on Windows: h264_mf (extremely fast, uses GPU NVENC/QuickSync/AMF)
    const runFfmpeg = (encoder) => {
      return new Promise((resolve, reject) => {
        let processKilled = false;
        
        // Base arguments
        const args = [
          '-y',                     // Overwrite output file
          '-i', tempInputPath,      // Input file
          '-vf', 'setpts=PTS-STARTPTS,scale=trunc(iw/2)*2:trunc(ih/2)*2', // Reset timestamps to 0 and scale (Ensures smooth start without black screen/lag)
          '-r', '45',               // Force output frame rate to 45 fps
          '-vsync', 'cfr',          // Constant frame rate to eliminate lag/stutter
        ];

        if (encoder === 'libx264') {
          args.push('-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-profile:v', 'high', '-level:v', '4.0');
        } else {
          args.push('-c:v', encoder, '-b:v', '8M');
        }

        args.push(
          '-pix_fmt', 'yuv420p',    // YUV 4:2:0 pixel format (CRITICAL for iOS Safari)
          tempOutputPath            // Output file
        );

        const child = spawn(ffmpeg, args);

        const timeoutId = setTimeout(() => {
          processKilled = true;
          try {
            child.kill('SIGKILL');
          } catch (e) {}
          reject(new Error(`ffmpeg conversion with ${encoder} timed out`));
        }, 15000);

        try {
          if (child.stdin) child.stdin.end();
        } catch (e) {}

        let stderr = '';
        if (child.stderr) {
          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        }

        child.on('close', (code) => {
          clearTimeout(timeoutId);
          if (processKilled) return;

          if (code !== 0) {
            reject(new Error(`ffmpeg conversion with ${encoder} failed with code ${code}: ${stderr}`));
          } else {
            resolve();
          }
        });

        child.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });
    };

    // On Windows, use GPU hardware encoder h264_mf with a fallback to CPU libx264
    if (process.platform === 'win32') {
      try {
        console.log('Attempting GPU hardware-accelerated conversion (h264_mf)...');
        await runFfmpeg('h264_mf');
        console.log('GPU hardware-accelerated conversion succeeded!');
      } catch (error) {
        console.warn('GPU hardware-accelerated conversion failed, falling back to CPU (libx264)...', error.message);
        await runFfmpeg('libx264');
      }
    } else {
      await runFfmpeg('libx264');
    }

    if (existsSync(tempOutputPath)) {
      const mp4Buffer = await readFile(tempOutputPath);
      return mp4Buffer;
    } else {
      throw new Error('Converted MP4 file not found after conversion');
    }
  } finally {
    try {
      if (existsSync(tempInputPath)) await unlink(tempInputPath);
    } catch (e) {}
    try {
      if (existsSync(tempOutputPath)) await unlink(tempOutputPath);
    } catch (e) {}
  }
};

const saveGuestSessionImageSet = async (id, payload, existingDir = null, existingPayload = null) => {
  ensureSavedSessionDir();
  
  let sessionDir;
  if (existingDir) {
    sessionDir = path.resolve(process.cwd(), existingDir);
  } else {
    const date = payload?.savedAt || payload?.createdAt ? new Date(payload.savedAt || payload.createdAt) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    
    const printFileName = payload?.print?.fileName || '';
    const slug = printFileName ? printFileName.replace(/-ban-in-10x15\.(jpg|png|jpeg)$/i, '') : 'session';
    const cleanSlug = slug.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    const folderName = `${timestamp}_${cleanSlug}_${id.slice(0, 5)}`;
    sessionDir = path.join(SAVED_SESSION_DIR, folderName);
  }
  mkdirSync(sessionDir, { recursive: true });

  const savedFiles = {
    directory: path.relative(process.cwd(), sessionDir).replace(/\\/g, '/'),
    captures: [],
    frames: [],
    print: null,
  };

  if (existingPayload?.savedFiles) {
    savedFiles.print = existingPayload.savedFiles.print;
    savedFiles.captures = [...(existingPayload.savedFiles.captures || [])];
    savedFiles.frames = [...(existingPayload.savedFiles.frames || [])];
    savedFiles.video = existingPayload.savedFiles.video;
  }

  const writeImage = async (item, fileBaseName, collection) => {
    const parsed = parseDataUrlImage(item?.pngDataUrl || item?.dataUrl);
    if (!parsed) return null;
    const extension = getImageExtension(parsed.mimeType);
    const fileName = `${fileBaseName}.${extension}`;
    const filePath = path.join(sessionDir, fileName);
    await writeFile(filePath, parsed.buffer);
    const record = {
      fileName,
      path: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      mimeType: parsed.mimeType,
    };
    if (item?.label) record.label = item.label;
    if (item?.frameName) record.frameName = item.frameName;
    if (collection) savedFiles[collection].push(record);
    return record;
  };

  const captures = Array.isArray(payload?.captures) ? payload.captures.slice(0, 6) : [];
  for (let index = 0; index < captures.length; index += 1) {
    const captureItem = captures[index];
    let captureRecord = savedFiles.captures[index];
    const oldFileName = captureRecord?.fileName;

    const newRecord = await writeImage(captureItem, `capture-${String(index + 1).padStart(2, '0')}`, null);
    if (newRecord) {
      captureRecord = newRecord;
      savedFiles.captures[index] = captureRecord;

      if (oldFileName && oldFileName !== newRecord.fileName) {
        try {
          const oldPath = path.resolve(sessionDir, oldFileName);
          if (existsSync(oldPath)) {
            await unlink(oldPath);
          }
        } catch (e) {}
      }
    }

    if (captureItem?.video?.dataUrl && captureRecord) {
      const parsedVideo = parseDataUrlVideo(captureItem.video.dataUrl);
      if (parsedVideo) {
        const ext = parsedVideo.mimeType === 'video/mp4' ? 'mp4' : 'webm';
        const videoFileName = `video-capture-${String(index + 1).padStart(2, '0')}.${ext}`;
        const videoFilePath = path.join(sessionDir, videoFileName);
        await writeFile(videoFilePath, parsedVideo.buffer);
        captureRecord.video = {
          fileName: videoFileName,
          path: path.relative(process.cwd(), videoFilePath).replace(/\\/g, '/'),
          mimeType: parsedVideo.mimeType,
        };
      }
    }
  }

  const frames = Array.isArray(payload?.frames) ? payload.frames.slice(0, 2) : [];
  for (let index = 0; index < frames.length; index += 1) {
    const frameItem = frames[index];
    let frameRecord = savedFiles.frames[index];
    const oldFileName = frameRecord?.fileName;

    const newRecord = await writeImage(frameItem, `frame-${String(index + 1).padStart(2, '0')}`, null);
    if (newRecord) {
      frameRecord = newRecord;
      savedFiles.frames[index] = frameRecord;

      if (oldFileName && oldFileName !== newRecord.fileName) {
        try {
          const oldPath = path.resolve(sessionDir, oldFileName);
          if (existsSync(oldPath)) {
            await unlink(oldPath);
          }
        } catch (e) {}
      }
    }

    if (frameItem?.video?.dataUrl && frameRecord) {
      const parsedVideo = parseDataUrlVideo(frameItem.video.dataUrl);
      if (parsedVideo) {
        const ext = parsedVideo.mimeType === 'video/mp4' ? 'mp4' : 'webm';
        const videoFileName = `video-frame-${String(index + 1).padStart(2, '0')}.${ext}`;
        const videoFilePath = path.join(sessionDir, videoFileName);
        await writeFile(videoFilePath, parsedVideo.buffer);
        frameRecord.video = {
          fileName: videoFileName,
          path: path.relative(process.cwd(), videoFilePath).replace(/\\/g, '/'),
          mimeType: parsedVideo.mimeType,
        };
      }
    }
  }

  const oldPrintFileName = savedFiles.print?.fileName;
  const printRecord = await writeImage(payload?.print, 'print-10x15', null);
  if (printRecord) {
    savedFiles.print = printRecord;
    if (oldPrintFileName && oldPrintFileName !== printRecord.fileName) {
      try {
        const oldPath = path.resolve(sessionDir, oldPrintFileName);
        if (existsSync(oldPath)) {
          await unlink(oldPath);
        }
      } catch (e) {}
    }
  }

  if (payload?.video?.dataUrl) {
    const parsedTopVideo = parseDataUrlVideo(payload.video.dataUrl);
    if (parsedTopVideo) {
      const ext = parsedTopVideo.mimeType === 'video/mp4' ? 'mp4' : 'webm';
      const fileName = `video.${ext}`;
      const filePath = path.join(sessionDir, fileName);
      await writeFile(filePath, parsedTopVideo.buffer);
      savedFiles.video = {
        fileName,
        path: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
        mimeType: parsedTopVideo.mimeType,
      };
    }
  }

  await writeFile(path.join(sessionDir, 'metadata.json'), JSON.stringify({
    id,
    tenantId: payload?.tenantId || null,
    savedAt: payload?.savedAt || new Date().toISOString(),
    expiresAt: payload?.expiresAt || null,
    title: payload?.title || '',
    captureCount: savedFiles.captures.length,
    frameCount: savedFiles.frames.length,
    files: savedFiles,
    meta: payload?.meta || {},
  }, null, 2), 'utf8');

  return savedFiles;
};

const canReadSavedSessionFile = async (imagePath, tenantId) => {
  const sessionsRoot = path.resolve(SAVED_SESSION_DIR);
  const fullPath = path.resolve(process.cwd(), imagePath || '');
  const relativePath = path.relative(sessionsRoot, fullPath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false;
  try {
    const metadata = JSON.parse(await readFile(path.join(sessionsRoot, relativePath.split(path.sep)[0], 'metadata.json'), 'utf8'));
    return metadata.tenantId === tenantId;
  } catch {
    return false;
  }
};

const sendImage = (res, payload) => {
  sendDataUrlImage(res, payload?.frame?.dataUrl || '');
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getRequestOrigin = (req) => {
  const host = req.headers.host || '127.0.0.1:5173';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || (req.socket?.encrypted ? 'https' : 'http');
  return `${protocol}://${host}`;
};

const getLanOrigins = (req) => {
  const host = req.headers.host || '';
  const port = host.includes(':') ? host.split(':').pop() : '';
  const suffix = port ? `:${port}` : '';
  const origins = [];
  Object.values(networkInterfaces()).flat().forEach((item) => {
    if (!item || item.family !== 'IPv4' || item.internal) return;
    origins.push(`http://${item.address}${suffix}`);
  });
  return origins;
};

const getShareUrls = (req, id, configuredShareOrigin = '') => {
  const sharePath = `/guest/${id}`;
  const publicOrigin = String(configuredShareOrigin || '').trim().replace(/\/+$/, '');
  const origin = getRequestOrigin(req);
  const hostName = (req.headers.host || '').split(':')[0].toLowerCase();
  const lanShareUrls = getLanOrigins(req).map((lanOrigin) => `${lanOrigin}${sharePath}`);
  const isLoopback = !hostName || hostName === 'localhost' || hostName === '0.0.0.0' || hostName.startsWith('127.');
  return {
    sharePath,
    shareUrl: publicOrigin
      ? `${publicOrigin}${sharePath}`
      : isLoopback && lanShareUrls.length > 0
        ? lanShareUrls[0]
        : `${origin}${sharePath}`,
    lanShareUrls,
  };
};

const getOriginHostname = (origin) => {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isTryCloudflareOrigin = (origin) => getOriginHostname(origin).endsWith('.trycloudflare.com');

const readRuntimePublicShareOrigin = async () => {
  try {
    const raw = await readFile(PUBLIC_SHARE_ORIGIN_PATH, 'utf8');
    const payload = JSON.parse(raw);
    const origin = String(payload?.origin || '').trim().replace(/\/+$/, '');
    const updatedAt = Date.parse(payload?.updatedAt || '');
    if (!origin || !Number.isFinite(updatedAt)) return '';
    if (Date.now() - updatedAt > PUBLIC_SHARE_ORIGIN_MAX_AGE_MS) return '';
    return new URL(origin).protocol === 'https:' ? origin : '';
  } catch {
    return '';
  }
};

const sendExpiredGuestOutputPage = (res) => {
  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Link photobooth đã hết hạn</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Arial, sans-serif;
      color: #401229;
      background: linear-gradient(180deg, #fff7fb, #ffe3f0);
    }
    main {
      width: min(100%, 440px);
      border: 1px solid #ffc6e2;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.92);
      padding: 28px;
      text-align: center;
      box-shadow: 0 24px 60px rgba(64, 18, 41, 0.14);
    }
    h1 { margin: 0; color: #a20f5d; font-size: 26px; }
    p { margin: 12px 0 0; color: #7a4962; font-size: 15px; line-height: 1.55; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>Link tải ảnh đã hết hạn</h1>
    <p>Mã QR photobooth chỉ có hiệu lực trong 2 giờ sau khi chụp để bảo vệ ảnh của khách.</p>
  </main>
</body>
</html>`;
  res.statusCode = 410;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
};

const sendExpiredGuestOutputJson = (res) => {
  sendJson(res, 410, { error: 'Guest output expired', expired: true });
};

const sendGuestOutputPage = (req, res, id, payload) => {
  const isIdPhoto = Boolean(payload?.meta?.isIdPhoto || payload?.outputMeta?.isIdPhoto);
  const title = escapeHtml(payload?.title || (isIdPhoto ? 'Ảnh thẻ 3x4 của bạn' : 'Ảnh photobooth của bạn'));
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  
  const frameCards = [];
  const videoCards = [];

  frames.forEach((frame, index) => {
    const imageUrl = `/api/guest-output/${id}/frame/${index + 1}.jpg`;
    const label = escapeHtml(frame.label || (isIdPhoto ? 'Ảnh thẻ 3x4' : `Khung ${index + 1}`));
    const fileName = escapeHtml(frame.fileName || (isIdPhoto ? 'anh-the-3x4.jpg' : `photobooth-khung-${index + 1}.jpg`));
    
    frameCards.push(`
      <article class="frame-card">
        <div class="frame-img-container">
          <img src="${imageUrl}" alt="${label}" loading="lazy">
        </div>
        <div class="helper-note">💡 Chạm giữ 2 giây để lưu ảnh nhanh về máy</div>
        <div class="frame-card-footer">
          <h2>${label}</h2>
          <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" download="${fileName}" class="btn btn-primary">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Tải ảnh
          </a>
        </div>
      </article>`);

    if (frame.video) {
      const ext = frame.video.mimeType === 'video/mp4' ? 'mp4' : 'webm';
      const videoUrl = `/api/guest-output/${id}/frame/${index + 1}/video.${ext}`;
      const videoLabel = escapeHtml(frame.video.label || `Khung ${index + 1} kèm video`);
      const videoFileName = escapeHtml(frame.video.fileName || `photobooth-video-${index + 1}.${ext}`);
      videoCards.push(`
        <article class="frame-card">
          <div class="frame-img-container">
            <video src="${videoUrl}" controls autoplay loop muted playsinline></video>
          </div>
          <div class="helper-note">💡 Chạm giữ để tải hoặc bấm nút dưới để lưu video</div>
          <div class="frame-card-footer">
            <h2>${videoLabel}</h2>
            <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" download="${videoFileName}" class="btn btn-primary">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Tải video
            </a>
          </div>
        </article>`);
    } else if (payload.hasPendingVideos) {
      const label = escapeHtml(frame.label || `Khung ${index + 1}`);
      videoCards.push(`
        <article class="frame-card video-placeholder" id="video-card-placeholder-${index + 1}">
          <div class="frame-img-container processing-container" style="background: rgba(247, 53, 145, 0.05); aspect-ratio: ${frame.width || 620}/${frame.height || 870}; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-radius: 12px; overflow: hidden; border: 1px dashed rgba(247, 53, 145, 0.25);">
            <div class="spinner-ring" style="width: 48px; height: 48px; border: 4px solid var(--pink-light); border-top-color: var(--pink-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 16px; color: var(--pink-muted); font-size: 14px; font-weight: 700;">Đang tạo video ngắn... 🔄</p>
          </div>
          <div class="frame-card-footer">
            <h2>${label} kèm video</h2>
            <button class="btn btn-primary" disabled style="opacity: 0.6; cursor: not-allowed; display: inline-flex; align-items: center; gap: 8px;">
              Đang xử lý...
            </button>
          </div>
        </article>`);
    }
  });

  const frameCardsHtml = frameCards.join('');
  const videoCardsHtml = videoCards.join('');
  const hasVideos = videoCards.length > 0;

  const printUrl = `/api/guest-output/${id}/print.jpg`;
  const printFileName = escapeHtml(payload?.print?.fileName || 'photobooth-ban-in-10x15.jpg');
  const updatedAt = escapeHtml(payload?.createdAt || payload?.savedAt || payload?.meta?.createdAt || '');
  const layoutStyle = isIdPhoto ? 'grid-template-columns: 1fr; max-width: 500px; margin: 0 auto;' : 'grid-template-columns: 1fr; max-width: 900px; margin: 0 auto;';
  const printColumnHtml = '';
  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Cherry+Bomb+One&family=Nunito:wght@500;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --pink-primary: #f73591;
      --pink-hover: #e02279;
      --pink-soft: #ff91c6;
      --pink-light: #ffe3f0;
      --pink-bg: #fff7fb;
      --pink-text: #401229;
      --pink-ink: #2b1020;
      --pink-muted: #7a4962;
      --pink-line: rgba(247, 53, 145, 0.15);
      --glass-bg: rgba(255, 255, 255, 0.75);
      --glass-border: rgba(255, 255, 255, 0.6);
      --card-shadow: 0 20px 40px -15px rgba(247, 53, 145, 0.1);
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Nunito', sans-serif;
      color: var(--pink-text);
      background: linear-gradient(180deg, #fff7fb 0%, #ffe7f3 100%);
      position: relative;
      overflow-x: hidden;
    }
    
    /* Glowing background blobs */
    .bg-blob {
      position: fixed;
      border-radius: 50%;
      filter: blur(100px);
      z-index: -1;
      opacity: 0.6;
      pointer-events: none;
    }
    
    @keyframes float-blob-1 {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(4vw, 3vh) scale(1.05); }
      100% { transform: translate(0, 0) scale(1); }
    }
    @keyframes float-blob-2 {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-3vw, -4vh) scale(1.1); }
      100% { transform: translate(0, 0) scale(1); }
    }
    
    .blob-1 {
      top: -10%;
      left: -10%;
      width: 45vw;
      height: 45vw;
      background: radial-gradient(circle, rgba(247, 53, 145, 0.3) 0%, rgba(255, 143, 197, 0.05) 70%);
      animation: float-blob-1 12s ease-in-out infinite;
    }
    .blob-2 {
      bottom: -15%;
      right: -10%;
      width: 50vw;
      height: 50vw;
      background: radial-gradient(circle, rgba(139, 211, 221, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
      animation: float-blob-2 16s ease-in-out infinite;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 60px;
      position: relative;
      z-index: 1;
    }

    header {
      margin-bottom: 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background: #ffffff;
      border-radius: 22px;
      margin-bottom: 16px;
      box-shadow: 0 10px 24px rgba(255, 47, 147, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.8);
      color: var(--pink-primary);
      transition: transform 0.3s ease;
    }
    .logo-badge:hover {
      transform: rotate(15deg) scale(1.05);
    }
    .logo-badge svg {
      width: 32px;
      height: 32px;
    }

    h1 {
      margin: 0;
      background: linear-gradient(135deg, var(--pink-primary) 0%, #db1b73 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-family: 'Baloo 2', sans-serif;
      font-size: clamp(32px, 6vw, 44px);
      line-height: 1.2;
      font-weight: 800;
      filter: drop-shadow(0 2px 8px rgba(247, 53, 145, 0.08));
    }
    
    .subtitle {
      margin: 8px 0 0 0;
      font-size: clamp(14px, 3.5vw, 16px);
      color: var(--pink-muted);
      max-width: 580px;
      line-height: 1.45;
      font-weight: 700;
    }

    .date-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      border: 1px solid rgba(247, 53, 145, 0.15);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.75);
      color: #9a1758;
      padding: 6px 18px;
      font-size: 14px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(64, 18, 41, 0.04);
      backdrop-filter: blur(8px);
    }
    .date-badge svg {
      width: 16px;
      height: 16px;
      opacity: 0.85;
    }

    .content-layout {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 32px;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @media (max-width: 992px) {
      .content-layout {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }

    .section-title {
      font-family: 'Baloo 2', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: var(--pink-ink);
      margin: 0 0 18px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 2px dashed rgba(247, 53, 145, 0.15);
      padding-bottom: 12px;
    }
    .section-title svg {
      width: 22px;
      height: 22px;
      color: var(--pink-primary);
    }

    .frames-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
    }

    .frames-container {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .frames-section {
      background: rgba(255, 255, 255, 0.45);
      border-radius: 28px;
      padding: 24px;
      border: 1px solid rgba(247, 53, 145, 0.1);
      margin-bottom: 24px;
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      box-shadow: 0 10px 30px rgba(247, 53, 145, 0.02);
    }

    .videos-section .frames-grid {
      grid-template-columns: repeat(auto-fit, minmax(240px, 320px));
      justify-content: center;
    }
    
    @media (max-width: 480px) {
      .videos-section .frames-grid {
        grid-template-columns: 1fr;
      }
    }

    .frame-card,
    .print-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 24px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease;
    }
    
    .frame-card:hover,
    .print-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 28px 48px -8px rgba(247, 53, 145, 0.15);
      border-color: rgba(247, 53, 145, 0.2);
    }

    .frame-img-container,
    .print-img-container {
      padding: 20px;
      background: #ffffff;
      background-image: radial-gradient(rgba(247, 53, 145, 0.04) 1px, transparent 1px);
      background-size: 16px 16px;
      border-bottom: 1px solid rgba(247, 53, 145, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .frame-card img,
    .frame-card video,
    .print-card img {
      display: block;
      max-width: 100%;
      max-height: 550px;
      width: auto;
      height: auto;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 8px 24px rgba(64, 18, 41, 0.06);
      object-fit: contain;
      transition: transform 0.3s ease;
    }
    
    .frame-card:hover img,
    .frame-card:hover video,
    .print-card:hover img {
      transform: scale(1.02);
    }

    .frame-card-footer,
    .print-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px;
      background: rgba(255, 255, 255, 0.45);
    }

    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--pink-ink);
      font-family: 'Baloo 2', sans-serif;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 20px;
      border-radius: 999px;
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.25s ease;
      cursor: pointer;
      border: none;
      outline: none;
      white-space: nowrap;
    }
    
    .btn-primary {
      color: #ffffff;
      background: linear-gradient(135deg, #f73591, #ff69b4);
      box-shadow: 0 4px 12px rgba(247, 53, 145, 0.25);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(247, 53, 145, 0.35);
    }
    .btn-primary:active {
      transform: translateY(0);
    }

    .btn .icon {
      width: 16px;
      height: 16px;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.2s ease;
    }
    
    .btn:hover .icon {
      transform: translateY(2px);
    }

    .print-card-footer .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 999px;
      background: #ffe3f0;
      color: var(--pink-primary);
      font-size: 12px;
      font-weight: 800;
    }

    .helper-note {
      text-align: center;
      font-size: 12px;
      color: var(--pink-muted);
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.45);
      border-bottom: 1px solid rgba(247, 53, 145, 0.05);
      font-weight: 700;
    }

    /* Security Footer style */
    .info-footer {
      margin-top: 48px;
      display: flex;
      justify-content: center;
      width: 100%;
      animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .info-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(247, 53, 145, 0.15);
      border-radius: 20px;
      padding: 20px 24px;
      max-width: 650px;
      width: 100%;
      box-shadow: var(--card-shadow);
      text-align: left;
    }

    .info-icon {
      width: 24px;
      height: 24px;
      color: var(--pink-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-content h3 {
      margin: 0 0 6px 0;
      font-family: 'Baloo 2', sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: var(--pink-ink);
    }

    .info-content p {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.55;
      color: var(--pink-muted);
    }
  </style>
</head>
<body>
  <!-- Floating background decorations -->
  <div class="bg-blob blob-1"></div>
  <div class="bg-blob blob-2"></div>

  <main>
    <header>
      <div class="logo-badge">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
          <path d="M12 9v1m0 6v1m3-3h1m-6 0H7" stroke-width="1.5" stroke-dasharray="2 2" />
        </svg>
      </div>
      <h1>${title}</h1>
      <p class="subtitle">Cảm ơn bạn đã lựa chọn chụp ảnh tại SVOV Photobooth. Hãy lưu lại những khoảnh khắc tuyệt vời này nhé!</p>
      <div class="date-badge">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span id="date-text">${updatedAt}</span>
      </div>
    </header>

    <div class="content-layout" style="${layoutStyle}">
      <!-- Left column: Individual strips -->
      <div class="frames-container">
        
        <!-- Section 1: Photos & Videos -->
        <section class="frames-section photos-section">
          <h2 class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            ${isIdPhoto ? 'Ảnh thẻ 3x4 của bạn' : (hasVideos ? 'Ảnh & Video Live của bạn' : 'Ảnh Tĩnh (Photos)')}
          </h2>
          <div class="frames-grid" style="${isIdPhoto ? 'grid-template-columns: 1fr;' : 'grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));'}">
            ${frameCardsHtml}
            ${hasVideos ? videoCardsHtml : ''}
          </div>
        </section>

      </div>

      ${printColumnHtml}
    </div>

    <!-- Security & Privacy Note -->
    <footer class="info-footer">
      <div class="info-card">
        <svg class="info-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div class="info-content">
          <h3>Thông tin bảo mật ảnh</h3>
          <p>Vì lý do bảo mật, đường liên kết tải ảnh này chỉ tồn tại trong vòng <strong>2 giờ</strong> kể từ lúc chụp. Ảnh của bạn sẽ bị xóa tự động khỏi hệ thống sau thời gian này để bảo vệ quyền riêng tư.</p>
        </div>
      </div>
    </footer>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const dateEl = document.getElementById('date-text');
      if (dateEl) {
        const rawDateStr = dateEl.textContent.trim();
        if (rawDateStr) {
          try {
            const date = new Date(rawDateStr);
            if (!isNaN(date.getTime())) {
              const pad = (n) => String(n).padStart(2, '0');
              const hours = pad(date.getHours());
              const minutes = pad(date.getMinutes());
              const day = pad(date.getDate());
              const month = pad(date.getMonth() + 1);
              const year = date.getFullYear();
              dateEl.textContent = hours + ':' + minutes + ' - Ngày ' + day + '/' + month + '/' + year;
            }
          } catch (e) {
            console.error('Lỗi định dạng ngày:', e);
          }
        }
      }
    });

    // Polling script for background videos
    const hasPendingVideos = ${payload.hasPendingVideos ? 'true' : 'false'};
    if (hasPendingVideos) {
      const id = '${id}';
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/guest-output/' + id);
          if (response.ok) {
            const data = await response.json();
            let allDone = true;
            if (Array.isArray(data.frames)) {
              data.frames.forEach((frame, idx) => {
                if (frame.video && frame.video.fileName) {
                  const placeholder = document.getElementById('video-card-placeholder-' + (idx + 1));
                  if (placeholder) {
                    const ext = frame.video.mimeType === 'video/mp4' ? 'mp4' : 'webm';
                    const videoUrl = '/api/guest-output/' + id + '/frame/' + (idx + 1) + '/video.' + ext;
                    const videoFileName = frame.video.fileName || ('photobooth-video-' + (idx + 1) + '.' + ext);
                    
                    placeholder.className = 'frame-card';
                    placeholder.id = '';
                    placeholder.innerHTML = \`
                      <div class="frame-img-container">
                        <video src="\${videoUrl}" controls autoplay loop muted playsinline></video>
                      </div>
                      <div class="helper-note">💡 Chạm giữ để tải hoặc bấm nút dưới để lưu video</div>
                      <div class="frame-card-footer">
                        <h2>Khung \${idx + 1} kèm video</h2>
                        <a href="\${videoUrl}" target="_blank" rel="noopener noreferrer" download="\${videoFileName}" class="btn btn-primary">
                          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Tải video
                        </a>
                      </div>
                    \`;
                  }
                } else {
                  allDone = false;
                }
              });
            }
            if (allDone) {
              clearInterval(pollInterval);
            }
          }
        } catch (e) {
          console.error('Error polling for videos:', e);
        }
      }, 3000);
    }
  </script>
</body>
</html>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
};

const printImage = (imagePath, printerName = '') => {
  return new Promise((resolve, reject) => {
    const psScript = path.resolve(process.cwd(), 'scripts/print-image.ps1');
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      psScript,
      '-ImagePath',
      imagePath,
    ];
    if (printerName) {
      args.push('-PrinterName', printerName);
    }

    const child = spawn('powershell.exe', args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('Print failed with code', code, ':', stderr);
        reject(new Error(stderr || `PowerShell exited with code ${code}`));
      } else {
        console.log('Print succeeded:', stdout);
        resolve(stdout);
      }
    });
  });
};

const frameStorePlugin = (env = {}) => {
  const getConfiguredShareOrigin = async () => {
    const runtimeOrigin = await readRuntimePublicShareOrigin();
    if (runtimeOrigin) return runtimeOrigin;

    const staticOrigin = String(
      env.VITE_PUBLIC_SHARE_ORIGIN ||
      env.PUBLIC_SHARE_ORIGIN ||
      process.env.VITE_PUBLIC_SHARE_ORIGIN ||
      process.env.PUBLIC_SHARE_ORIGIN ||
      '',
    ).trim().replace(/\/+$/, '');
    return isTryCloudflareOrigin(staticOrigin) ? '' : staticOrigin;
  };

  const handler = async (req, res, next) => {
    if (
      !req.url?.startsWith('/api/frame-store') &&
      !req.url?.startsWith('/api/guest-output') &&
      !req.url?.startsWith('/guest/') &&
      !req.url?.startsWith('/api/print') &&
      !req.url?.startsWith('/api/admin') &&
      !req.url?.startsWith('/api/dslr')
    ) {
      next();
      return;
    }

    try {
      ensureStoreDir();
      ensureGuestOutputDir();
      const url = new URL(req.url, 'http://local');
      const rentalAccess = await getRentalAccess(req, env);
      if (!canAccessRentalRoute(req, url, rentalAccess)) {
        sendJson(res, rentalAccess.role === 'anonymous' ? 401 : 403, {
          error: rentalAccess.role === 'anonymous' ? 'Kiosk or dashboard access token is required' : 'This rental credential cannot access this route',
        });
        return;
      }
      const relayKey = getKioskRelayKey(rentalAccess);

      // ---- Kiosk ↔ Dashboard relay endpoints ----

      if (req.method === 'POST' && url.pathname === '/api/admin/kiosk-state') {
        const payload = JSON.parse(await readBody(req));
        const relayState = kioskRelayStates.get(relayKey) || { state: null, updatedAt: 0, cameraSnapshot: '' };
        if (payload.state) {
          relayState.state = payload.state;
          relayState.updatedAt = Date.now();
        }
        if (payload.cameraSnapshot !== undefined) {
          relayState.cameraSnapshot = payload.cameraSnapshot;
        }
        if (payload.sessionComplete) {
          kioskSessionCompleteEvents.set(relayKey, payload.sessionComplete);
        }
        kioskRelayStates.set(relayKey, relayState);
        // Return pending commands and clear queue
        const commands = kioskPendingCommands.get(relayKey) || [];
        kioskPendingCommands.set(relayKey, []);
        sendJson(res, 200, { ok: true, commands });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/kiosk-state') {
        const relayState = kioskRelayStates.get(relayKey) || { state: null, updatedAt: 0, cameraSnapshot: '' };
        const connected = relayState.state && (Date.now() - relayState.updatedAt < 5000);
        const sessionComplete = kioskSessionCompleteEvents.get(relayKey) || null;
        kioskSessionCompleteEvents.delete(relayKey); // consume once for this kiosk only
        sendJson(res, 200, {
          state: relayState.state,
          updatedAt: relayState.updatedAt,
          cameraSnapshot: relayState.cameraSnapshot,
          connected: !!connected,
          sessionComplete,
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/kiosk-command') {
        const payload = JSON.parse(await readBody(req));
        const commands = kioskPendingCommands.get(relayKey) || [];
        commands.push({
          action: payload.action,
          payload: payload.payload || null,
          timestamp: Date.now(),
        });
        kioskPendingCommands.set(relayKey, commands);
        sendJson(res, 200, { ok: true });
        return;
      }

      // ---- End relay endpoints ----

      if (req.method === 'GET' && url.pathname === '/api/admin/sessions') {
        ensureSavedSessionDir();
        try {
          const folders = await readdir(SAVED_SESSION_DIR);
          const sessions = [];
          for (const folder of folders) {
            const sessionDir = path.join(SAVED_SESSION_DIR, folder);
            const metadataPath = path.join(sessionDir, 'metadata.json');
            try {
              if (existsSync(metadataPath)) {
                const rawMeta = await readFile(metadataPath, 'utf8');
                const meta = JSON.parse(rawMeta);
                if (rentalAccess.role !== 'dashboard' || meta.tenantId === rentalAccess.tenantId) sessions.push(meta);
              }
            } catch (e) {
              // Ignore broken session folders
            }
          }
          // Sort by savedAt descending
          sessions.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
          const shareOrigin = await readRuntimePublicShareOrigin() || getRequestOrigin(req);
          sendJson(res, 200, { ok: true, sessions, shareOrigin });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Failed to list sessions' });
        }
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/session-image') {
        const imagePath = url.searchParams.get('path');
        if (!imagePath || !imagePath.startsWith('data/saved-sessions/')) {
          sendJson(res, 400, { error: 'Invalid path' });
          return;
        }
        if (rentalAccess.role === 'dashboard' && !await canReadSavedSessionFile(imagePath, rentalAccess.tenantId)) {
          sendJson(res, 404, { error: 'Image not found' });
          return;
        }
        const fullPath = path.resolve(process.cwd(), imagePath);
        try {
          const buffer = await readFile(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          let mimeType = 'image/png';
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          res.statusCode = 200;
          res.setHeader('Content-Type', mimeType);
          res.end(buffer);
        } catch {
          sendJson(res, 404, { error: 'Image not found' });
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/print-session') {
        const payload = JSON.parse(await readBody(req));
        const imagePath = payload?.path;
        if (!imagePath || !imagePath.startsWith('data/saved-sessions/')) {
          sendJson(res, 400, { error: 'Invalid path' });
          return;
        }
        const fullPath = path.resolve(process.cwd(), imagePath);
        try {
          const printerName = env.VITE_PRINTER_NAME || env.PRINTER_NAME || '';
          await printImage(fullPath, printerName);
          sendJson(res, 200, { ok: true, message: 'Printed successfully' });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Printing failed' });
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/print') {
        const payload = JSON.parse(await readBody(req));
        if (!payload?.dataUrl) {
          sendJson(res, 400, { error: 'Invalid print payload' });
          return;
        }

        const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(payload.dataUrl);
        if (!match) {
          sendJson(res, 400, { error: 'Invalid data URL' });
          return;
        }

        const tempDir = path.resolve(process.cwd(), 'data/temp');
        if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

        const mimeType = match[1];
        const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const tempPath = path.join(tempDir, `print-${Date.now()}.${ext}`);
        await writeFile(tempPath, Buffer.from(match[2], 'base64'));

        try {
          const printerName = env.VITE_PRINTER_NAME || env.PRINTER_NAME || '';
          await printImage(tempPath, printerName);
          sendJson(res, 200, { ok: true, message: 'Printed successfully' });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Printing failed' });
        } finally {
          try {
            if (existsSync(tempPath)) await unlink(tempPath);
          } catch (e) {
            console.error('Failed to delete temp print file:', e);
          }
        }
        return;
      }

      // ---- DSLR digiCamControl Integration endpoints ----

      if (req.method === 'GET' && url.pathname === '/api/dslr/capture') {
        rawGet('http://127.0.0.1:5513/?CMD=Capture')
          .then((result) => {
            sendJson(res, 200, { ok: true, response: result.body.toString('utf8').trim() });
          })
          .catch((err) => {
            sendJson(res, 500, { ok: false, error: err.message || err.toString() });
          });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/dslr/last-captured') {
        rawGet('http://127.0.0.1:5513/?slc=get&param1=lastcaptured')
          .then((result) => {
            sendJson(res, 200, { ok: true, filename: result.body.toString('utf8').trim() });
          })
          .catch((err) => {
            sendJson(res, 500, { ok: false, error: err.message || err.toString() });
          });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/dslr/image') {
        const file = url.searchParams.get('file');
        if (!file) {
          sendJson(res, 400, { error: 'Missing file parameter' });
          return;
        }
        rawGet(`http://127.0.0.1:5513/image/${file}`)
          .then((result) => {
            if (result.statusCode !== 200) {
              sendJson(res, result.statusCode, { error: 'Failed to fetch image from digiCamControl' });
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'image/jpeg');
            res.end(result.body);
          })
          .catch((err) => {
            sendJson(res, 500, { error: err.message || err.toString() });
          });
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/guest/')) {
        const id = sanitizeOutputId(url.pathname.split('/').pop());
        const payload = await readGuestOutput(id);
        if (!payload) {
          sendJson(res, 404, { error: 'Guest output not found' });
          return;
        }
        if (isGuestOutputExpired(payload)) {
          sendExpiredGuestOutputPage(res);
          return;
        }
        sendGuestOutputPage(req, res, id, payload);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/guest-output/save') {
        const payload = JSON.parse(await readBody(req));
        if (payload?.schema !== GUEST_OUTPUT_SCHEMA) {
          sendJson(res, 400, { error: 'Invalid guest output' });
          return;
        }

        const clientRequestId = sanitizeClientRequestId(payload.clientRequestId);
        if (clientRequestId) payload.clientRequestId = clientRequestId;

        const isUpdate = Boolean(payload.id);
        let id = payload.id;
        let existingPayload = null;

        // A kiosk can lose the HTTP response after the server has already saved a
        // session. Replaying its same clientRequestId must return the original
        // output instead of making a duplicate QR/gallery entry.
        if (!isUpdate && clientRequestId) {
          const priorPayload = await findGuestOutputByClientRequestId(clientRequestId, rentalAccess.tenantId);
          if (priorPayload && !isGuestOutputExpired(priorPayload)) {
            sendJson(res, 200, {
              ok: true,
              id: priorPayload.id,
              expiresAt: getGuestOutputExpiresAt(priorPayload),
              ttlSeconds: Math.round(GUEST_OUTPUT_TTL_MS / 1000),
              savedFiles: priorPayload.savedFiles || null,
              ...getShareUrls(req, priorPayload.id, await getConfiguredShareOrigin()),
            });
            return;
          }
        }

        if (isUpdate) {
          id = sanitizeOutputId(id);
          existingPayload = await readGuestOutput(id);
          if (!existingPayload) {
            sendJson(res, 404, { error: 'Guest output not found' });
            return;
          }
          if (rentalAccess.role === 'kiosk' && existingPayload.tenantId && existingPayload.tenantId !== rentalAccess.tenantId) {
            sendJson(res, 404, { error: 'Guest output not found' });
            return;
          }
        } else {
          id = createGuestOutputId();
        }

        // Validation for new sessions
        if (!isUpdate) {
          if (!payload?.print?.dataUrl || !Array.isArray(payload?.frames) || payload.frames.length === 0) {
            sendJson(res, 400, { error: 'Invalid guest output for new session' });
            return;
          }
        }

        // Merge updates into existing payload
        if (isUpdate) {
          if (typeof payload.hasPendingVideos === 'boolean') {
            existingPayload.hasPendingVideos = payload.hasPendingVideos;
            if (payload.hasPendingVideos === false && activePythonProcesses.has(id)) {
              const py = activePythonProcesses.get(id);
              console.log(`[Backend] Terminating background Python composition for session: ${id} since browser finished first.`);
              try {
                py.kill('SIGKILL');
              } catch (e) {}
              activePythonProcesses.delete(id);
            }
          }

          if (payload.print) {
            if (!existingPayload.print) {
              existingPayload.print = {};
            }
            if (payload.print.pngDataUrl) {
              existingPayload.print.pngDataUrl = payload.print.pngDataUrl;
            }
          }

          if (Array.isArray(payload.frames)) {
            if (!Array.isArray(existingPayload.frames)) {
              existingPayload.frames = [];
            }
            payload.frames.forEach((frameUpdate, index) => {
              if (frameUpdate) {
                if (!existingPayload.frames[index]) {
                  existingPayload.frames[index] = {};
                }
                if (frameUpdate.pngDataUrl) {
                  existingPayload.frames[index].pngDataUrl = frameUpdate.pngDataUrl;
                }
                if (frameUpdate.video) {
                  existingPayload.frames[index].video = frameUpdate.video;
                }
              }
            });
          }

          // Backwards compatibility with legacy frameVideos payload
          if (Array.isArray(payload.frameVideos)) {
            if (!Array.isArray(existingPayload.frames)) {
              existingPayload.frames = [];
            }
            payload.frameVideos.forEach((fVideo, index) => {
              if (fVideo) {
                if (!existingPayload.frames[index]) {
                  existingPayload.frames[index] = {};
                }
                existingPayload.frames[index].video = {
                  dataUrl: fVideo.dataUrl,
                  fileName: fVideo.fileName || `video-frame-${index + 1}.${fVideo.ext}`,
                  mimeType: fVideo.mimeType,
                  label: `Khung ${index + 1} kèm video`,
                };
              }
            });
          }

          if (Array.isArray(payload.captures)) {
            if (!Array.isArray(existingPayload.captures)) {
              existingPayload.captures = [];
            }
            payload.captures.forEach((captureUpdate, index) => {
              if (captureUpdate && existingPayload.captures[index]) {
                if (captureUpdate.video) {
                  existingPayload.captures[index].video = captureUpdate.video;
                }
              }
            });
          }
        }

        const targetPayload = isUpdate ? existingPayload : payload;
        if (rentalAccess.tenantId) targetPayload.tenantId = existingPayload?.tenantId || rentalAccess.tenantId;

        // Convert frames video WebM to MP4 if present (concurrently in parallel)
        if (Array.isArray(targetPayload.frames)) {
          await Promise.all(targetPayload.frames.map(async (frame, index) => {
            if (frame?.video?.dataUrl) {
              const parsedVideo = parseDataUrlVideo(frame.video.dataUrl);
              if (parsedVideo && parsedVideo.mimeType.includes('webm')) {
                try {
                  console.log(`Converting WebM video to MP4 for frame ${index + 1} (concurrent)...`);
                  const mp4Buffer = await convertWebmToMp4Helper(parsedVideo.buffer);
                  if (mp4Buffer) {
                    const mp4Base64 = mp4Buffer.toString('base64');
                    frame.video.dataUrl = `data:video/mp4;base64,${mp4Base64}`;
                    frame.video.mimeType = 'video/mp4';
                    frame.video.fileName = frame.video.fileName.replace(/\.webm$/, '.mp4');
                    if (frame.video.ext) {
                      frame.video.ext = 'mp4';
                    }
                    console.log(`Successfully converted frame ${index + 1} video to MP4!`);
                  }
                } catch (error) {
                  console.error(`Error converting WebM to MP4 for frame ${index + 1}:`, error);
                }
              }
            }
          }));
        }

        // Convert captures video WebM to MP4 if present (concurrently in parallel)
        if (Array.isArray(targetPayload.captures)) {
          await Promise.all(targetPayload.captures.map(async (capture, index) => {
            if (capture?.video?.dataUrl) {
              const parsedVideo = parseDataUrlVideo(capture.video.dataUrl);
              if (parsedVideo && parsedVideo.mimeType.includes('webm')) {
                try {
                  console.log(`Converting WebM video to MP4 for capture ${index + 1} (concurrent)...`);
                  const mp4Buffer = await convertWebmToMp4Helper(parsedVideo.buffer);
                  if (mp4Buffer) {
                    const mp4Base64 = mp4Buffer.toString('base64');
                    capture.video.dataUrl = `data:video/mp4;base64,${mp4Base64}`;
                    capture.video.mimeType = 'video/mp4';
                    capture.video.fileName = capture.video.fileName.replace(/\.webm$/, '.mp4');
                    if (capture.video.ext) {
                      capture.video.ext = 'mp4';
                    }
                    console.log(`Successfully converted capture ${index + 1} video to MP4!`);
                  }
                } catch (error) {
                  console.error(`Error converting WebM to MP4 for capture ${index + 1}:`, error);
                }
              }
            }
          }));
        }

        const hasCaptureVideos = Array.isArray(targetPayload.captures) && targetPayload.captures.some(c => c?.video?.fileName || c?.video?.dataUrl);
        const hasComposedVideos = Array.isArray(targetPayload.frames) && targetPayload.frames.length > 0 && targetPayload.frames.every(f => f?.video?.fileName || f?.video?.dataUrl);
        const hasPendingVideos = (typeof targetPayload.hasPendingVideos === 'boolean') 
          ? targetPayload.hasPendingVideos 
          : (hasCaptureVideos && !hasComposedVideos);

        const savedAt = isUpdate ? new Date(existingPayload.savedAt) : new Date();
        const expiresAt = isUpdate ? existingPayload.expiresAt : new Date(savedAt.getTime() + GUEST_OUTPUT_TTL_MS).toISOString();
        const nextPayload = { ...targetPayload, id, savedAt: savedAt.toISOString(), expiresAt, hasPendingVideos };
        
        const existingDir = isUpdate ? existingPayload.savedFiles?.directory : null;
        const savedFiles = await saveGuestSessionImageSet(id, nextPayload, existingDir, isUpdate ? existingPayload : null);
        const storedPayload = { ...nextPayload, savedFiles };
        
        // Strip out large base64 data URLs to save disk space
        if (storedPayload.print) {
          delete storedPayload.print.dataUrl;
          delete storedPayload.print.pngDataUrl;
        }
        if (Array.isArray(storedPayload.frames)) {
          storedPayload.frames.forEach((frame) => {
            delete frame.dataUrl;
            delete frame.pngDataUrl;
            if (frame.video) {
              delete frame.video.dataUrl;
            }
          });
        }
        if (Array.isArray(storedPayload.captures)) {
          storedPayload.captures.forEach((capture) => {
            delete capture.dataUrl;
            if (capture.video) {
              delete capture.video.dataUrl;
            }
          });
        }
        if (storedPayload.video) {
          delete storedPayload.video.dataUrl;
        }
        
        await writeFile(getGuestOutputPath(id), JSON.stringify(storedPayload, null, 2), 'utf8');
        
        // Spawn background Node.js script to generate composite frame videos if pending
        if (storedPayload.hasPendingVideos) {
          const sessionDir = path.resolve(process.cwd(), savedFiles.directory);
          console.log(`[Backend] Spawning background Node video composition for session: ${id} in ${sessionDir}`);
          
          const py = spawn('node', ['scripts/compose_video.js', sessionDir, id]);
          activePythonProcesses.set(id, py);
          py.stdout.on('data', (data) => console.log(`[NodeStdout ${id}]:`, data.toString().trim()));
          py.stderr.on('data', (data) => console.error(`[NodeStderr ${id}]:`, data.toString().trim()));
          py.on('error', (err) => {
            console.error(`[Backend] Failed to start Node composition script: ${err.message}.`);
            activePythonProcesses.delete(id);
          });
          py.on('close', (code) => {
            console.log(`[NodeClose ${id}]: Background video composition script exited with code ${code}`);
            activePythonProcesses.delete(id);
          });
        }

        cleanupExpiredGuestOutputs().catch(() => {});
        sendJson(res, 200, {
          ok: true,
          id,
          expiresAt,
          ttlSeconds: Math.round(GUEST_OUTPUT_TTL_MS / 1000),
          savedFiles,
          ...getShareUrls(req, id, await getConfiguredShareOrigin()),
        });
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/guest-output/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        const id = sanitizeOutputId(parts[2]);
        const payload = await readGuestOutput(id);
        if (!payload) {
          sendJson(res, 404, { error: 'Guest output not found' });
          return;
        }
        if (isGuestOutputExpired(payload)) {
          sendExpiredGuestOutputJson(res);
          return;
        }

        if (parts.length === 3) {
          const { print, frames, captures, video, ...meta } = payload;
          sendJson(res, 200, {
            ...meta,
            expiresAt: getGuestOutputExpiresAt(payload),
            ttlSeconds: Math.round(GUEST_OUTPUT_TTL_MS / 1000),
            print: print ? { ...print, dataUrl: undefined } : null,
            frames: Array.isArray(frames) ? frames.map(({ dataUrl, video: fVideo, ...frame }) => {
              const resultFrame = { ...frame };
              if (fVideo) {
                resultFrame.video = { ...fVideo, dataUrl: undefined };
              }
              return resultFrame;
            }) : [],
            captures: Array.isArray(captures) ? captures.map(({ dataUrl, ...capture }) => capture) : [],
            video: video ? { ...video, dataUrl: undefined } : null,
            ...getShareUrls(req, id, await getConfiguredShareOrigin()),
          });
          return;
        }

        if (parts[3] === 'print.png' || parts[3] === 'print.jpg' || parts[3] === 'print.jpeg') {
          if (payload.savedFiles?.print?.path) {
            try {
              const fullPath = path.resolve(process.cwd(), payload.savedFiles.print.path);
              if (existsSync(fullPath)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', payload.savedFiles.print.mimeType || 'image/jpeg');
                res.end(await readFile(fullPath));
                return;
              }
            } catch (err) {
              console.error('Error serving print from disk:', err);
            }
          }
          sendDataUrlImage(res, payload.print?.dataUrl || '');
          return;
        }

        if (parts[3] === 'video.webm' || parts[3] === 'video.mp4') {
          if (payload.savedFiles?.video?.path) {
            try {
              const fullPath = path.resolve(process.cwd(), payload.savedFiles.video.path);
              if (existsSync(fullPath)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', payload.savedFiles.video.mimeType || 'video/mp4');
                res.end(await readFile(fullPath));
                return;
              }
            } catch (err) {
              console.error('Error serving video from disk:', err);
            }
          }
          sendDataUrlVideo(res, payload.video?.dataUrl || '');
          return;
        }

        if (parts[3] === 'frame') {
          const frameIndex = Math.max(0, Number(String(parts[4] || '').replace(/\.(png|jpg|jpeg|webm|mp4)$/i, '')) - 1);
          const frameItem = payload.frames?.[frameIndex];
          const savedFrameItem = payload.savedFiles?.frames?.[frameIndex];

          if (parts[5] === 'video.webm' || parts[5] === 'video.mp4') {
            if (savedFrameItem?.video?.path) {
              try {
                const fullPath = path.resolve(process.cwd(), savedFrameItem.video.path);
                if (existsSync(fullPath)) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', savedFrameItem.video.mimeType || 'video/mp4');
                  res.end(await readFile(fullPath));
                  return;
                }
              } catch (err) {
                console.error('Error serving frame video from disk:', err);
              }
            }
            sendDataUrlVideo(res, frameItem?.video?.dataUrl || '');
            return;
          }

          if (savedFrameItem?.path) {
            try {
              const fullPath = path.resolve(process.cwd(), savedFrameItem.path);
              if (existsSync(fullPath)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', savedFrameItem.mimeType || 'image/jpeg');
                res.end(await readFile(fullPath));
                return;
              }
            } catch (err) {
              console.error('Error serving frame from disk:', err);
            }
          }
          sendDataUrlImage(res, frameItem?.dataUrl || '');
          return;
        }
      }

      if (req.method === 'GET' && url.pathname === '/api/frame-store/list') {
        sendJson(res, 200, { packages: await listStoredPackages() });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/frame-store/profiles') {
        sendJson(res, 200, await readFrameProfiles());
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/frame-store/profiles/save') {
        const payload = JSON.parse(await readBody(req));
        if (!payload?.frameName || !payload?.profile || typeof payload.profile !== 'object') {
          sendJson(res, 400, { error: 'Invalid frame profile' });
          return;
        }
        const store = await readFrameProfiles();
        store.profiles[payload.frameName] = {
          ...payload.profile,
          frameName: payload.frameName,
          updatedAt: new Date().toISOString(),
        };
        sendJson(res, 200, await writeFrameProfiles(store));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/frame-store/profiles/cleanup') {
        const store = await readFrameProfiles();
        const existingNames = await getExistingFrameNames();
        const removed = [];
        Object.keys(store.profiles).forEach((frameName) => {
          if (!existingNames.has(frameName)) {
            removed.push(frameName);
            delete store.profiles[frameName];
          }
        });
        const nextStore = await writeFrameProfiles(store);
        sendJson(res, 200, { ...nextStore, removed });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/frame-store/find') {
        const frameName = url.searchParams.get('frameName') || '';
        const width = Number(url.searchParams.get('width'));
        const height = Number(url.searchParams.get('height'));
        const packages = await listStoredPackages({ includeSlotMaps: true });
        const match = packages.find((item) => item.name === frameName && item.width === width && item.height === height);
        if (!match) {
          sendJson(res, 404, { error: 'Package not found' });
          return;
        }
        sendJson(res, 200, { package: await readStoredPackage(match.id) });
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/frame-store/package/')) {
        const id = url.pathname.split('/').pop();
        const payload = await readStoredPackage(id);
        if (!payload) {
          sendJson(res, 404, { error: 'Package not found' });
          return;
        }
        sendJson(res, 200, { package: payload });
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/frame-store/image/')) {
        const id = url.pathname.split('/').pop();
        const payload = await readStoredPackage(id);
        if (!payload) {
          sendJson(res, 404, { error: 'Package not found' });
          return;
        }
        sendImage(res, payload);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/frame-store/save') {
        const payload = JSON.parse(await readBody(req));
        if (payload?.schema !== STORE_SCHEMA || !payload?.frame?.dataUrl || !payload?.slotMap?.zones?.length) {
          sendJson(res, 400, { error: 'Invalid frame package' });
          return;
        }
        const id = getPackageId(payload);
        const nextPayload = { ...payload, savedAt: new Date().toISOString() };
        await writeFile(getPackagePath(id), JSON.stringify(nextPayload, null, 2), 'utf8');
        sendJson(res, 200, { ok: true, package: getMetadata(id, nextPayload) });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/frame-store/save-slot-map') {
        const payload = JSON.parse(await readBody(req));
        if (payload?.schema !== SLOT_SCHEMA || !payload?.zones?.length) {
          sendJson(res, 400, { error: 'Invalid slot map' });
          return;
        }
        const id = getPackageId(payload);
        const savedAt = new Date().toISOString();
        const existingPayload = await readStoredPackage(id);
        const nextPayload = existingPayload?.schema === STORE_SCHEMA && existingPayload?.frame?.dataUrl
          ? { ...existingPayload, slotMap: payload, savedAt }
          : { ...payload, savedAt };
        await writeFile(getPackagePath(id), JSON.stringify(nextPayload, null, 2), 'utf8');
        sendJson(res, 200, { ok: true, package: getMetadata(id, nextPayload) });
        return;
      }

      sendJson(res, 404, { error: 'Route not found' });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Frame store failed' });
    }
  };

  return {
    name: 'photobooth-frame-store',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDslrMode = String(env.VITE_DSLR_MODE || '').trim() === 'true';
  console.log('\n\x1b[35m====================================================\x1b[0m');
  console.log('\x1b[35m   MY PHOTOBOOTH - CONFIGURATION STATUS   \x1b[0m');
  if (isDslrMode) {
    console.log('\x1b[32m   [MODE] DSLR / Capture Card Active (Production Kiosk) \x1b[0m');
    console.log('   - DSLR Integration: Enabled (digiCamControl port 5513)');
    console.log('   - Auto recovery & Reconnect: Enabled');
  } else {
    console.log('\x1b[36m   [MODE] Local Webcam Only (Development Mode) \x1b[0m');
    console.log('   - DSLR Integration: Disabled');
    console.log('   - Reconnect Polling: Disabled (Webcam stays stable)');
  }
  console.log('\x1b[35m====================================================\x1b[0m\n');
  return {
    plugins: [frameStorePlugin(env), react(), tailwindcss()],
    server: {
      allowedHosts: ['.trycloudflare.com'],
      watch: {
        ignored: ['**/data/**', '**/frames/frame-profiles.json'],
      },
    },
  };
});
