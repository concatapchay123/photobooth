import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper to read JSON with BOM support
function readJson(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return JSON.parse(content);
}

function getCaptureIndex(edit) {
  const photoId = edit.capturedPhotoId || edit.photoId || '';
  const match = photoId.match(/-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return edit.slotIndex || 0;
}

function findFrame(registryFrames, name) {
  for (const f of registryFrames) {
    if (f.name === name) return f;
  }
  const nameNoExt = name.split('.')[0];
  for (const f of registryFrames) {
    const fNameNoExt = (f.name || '').split('.')[0];
    if (fNameNoExt === nameNoExt) return f;
    if (nameNoExt.includes(fNameNoExt) || fNameNoExt.includes(nameNoExt)) return f;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node compose_video.js <session_dir> <guest_output_id>");
    process.exit(1);
  }

  const sessionDir = path.resolve(args[0]);
  const guestOutputId = args[1];

  console.log(`Starting video composition in ${sessionDir} (ID: ${guestOutputId})`);
  console.log(`Using FFmpeg binary: ${ffmpeg}`);

  const metadataPath = path.join(sessionDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error(`Error: metadata.json not found in ${sessionDir}`);
    process.exit(1);
  }

  const metadata = readJson(metadataPath);
  const registryPath = path.join(projectRoot, 'frames', 'registry.json');
  if (!fs.existsSync(registryPath)) {
    console.error(`Error: Registry file not found: ${registryPath}`);
    process.exit(1);
  }
  const registry = readJson(registryPath);

  const drafts = metadata.meta?.frameDrafts || [];
  const captures = metadata.files?.captures || [];

  console.log(`Found ${drafts.length} drafts and ${captures.length} captures.`);

  for (let draftIndex = 0; draftIndex < drafts.length; draftIndex++) {
    const draft = drafts[draftIndex];
    const frameName = draft.frameName;
    console.log(`Processing draft ${draftIndex + 1}/${drafts.length}: ${frameName}`);

    const targetFrame = findFrame(registry.frames || [], frameName);
    if (!targetFrame) {
      console.error(`Error: Frame '${frameName}' not found in registry.json`);
      continue;
    }

    const overlayRelPath = targetFrame.overlay;
    const overlayPath = path.join(projectRoot, 'frames', overlayRelPath);
    if (!fs.existsSync(overlayPath)) {
      console.error(`Error: Overlay file does not exist: ${overlayPath}`);
      continue;
    }

    const H = targetFrame.height;
    const W = targetFrame.width;
    console.log(`Resolution of overlay: ${W}x${H}`);

    const inputs = [];
    const filterParts = [];

    // Background input (input 0)
    // lavfi color generator generates a white background video of 10 seconds at 45 fps
    inputs.push('-f', 'lavfi', '-i', `color=c=white:s=${W}x${H}:d=10:r=45`);
    let lastOverlayLabel = '[0:v]';

    let inputIndex = 1;
    for (let slotIndex = 0; slotIndex < draft.slotEdits.length; slotIndex++) {
      const edit = draft.slotEdits[slotIndex];
      const slotIdx = edit.slotIndex;
      const zone = (targetFrame.slots || []).find(s => s.slotIndex === slotIdx);
      if (!zone) {
        console.warn(`Warning: Slot zone not found for index ${slotIdx}`);
        continue;
      }

      const capIdx = getCaptureIndex(edit);
      const captureRecord = captures[capIdx];
      let videoPath = null;
      let photoPath = null;

      if (captureRecord) {
        if (captureRecord.video?.fileName) {
          videoPath = path.join(sessionDir, captureRecord.video.fileName);
        }
        if (captureRecord.fileName) {
          photoPath = path.join(sessionDir, captureRecord.fileName);
        }
      }

      const hasVideo = videoPath && fs.existsSync(videoPath);
      const hasPhoto = photoPath && fs.existsSync(photoPath);

      if (hasVideo) {
        inputs.push('-stream_loop', '-1', '-i', videoPath);
      } else if (hasPhoto) {
        inputs.push('-loop', '1', '-i', photoPath);
      } else {
        inputs.push('-f', 'lavfi', '-i', `color=c=white:s=${zone.width}x${zone.height}:d=10:r=45`);
      }

      const inputLabel = `[${inputIndex}:v]`;
      const processedLabel = `[v_proc_${slotIndex}]`;

      const flipX = edit.flipX || false;
      const flipY = edit.flipY || false;
      const scale = edit.scale || 1.0;
      const rotation = edit.rotation || 0;

      const srcW = edit.naturalWidth || 1920;
      const srcH = edit.naturalHeight || 1080;

      const drawW = Math.round(srcW * scale);
      const drawH = Math.round(srcH * scale);

      const sx = zone.x;
      const sy = zone.y;
      const sw = zone.width;
      const sh = zone.height;

      const cropX = Math.round(sx - edit.x);
      const cropY = Math.round(sy - edit.y);

      const filters = ['fps=fps=30', 'setpts=PTS-STARTPTS'];
      if (flipX) filters.push('hflip');
      if (flipY) filters.push('vflip');
      filters.push(`scale=${drawW}:${drawH}`);

      if (rotation !== 0) {
        filters.push(`rotate=${rotation}*PI/180:ow=${drawW}:oh=${drawH}:fillcolor=white`);
      }

      const safeCropX = Math.max(0, cropX);
      const safeCropY = Math.max(0, cropY);
      filters.push(`crop=${sw}:${sh}:${safeCropX}:${safeCropY}`);

      filterParts.push(`${inputLabel}${filters.join(',')}${processedLabel}`);

      const nextOverlayLabel = `[bg_${slotIndex}]`;
      filterParts.push(`${lastOverlayLabel}${processedLabel}overlay=${sx}:${sy}:shortest=1${nextOverlayLabel}`);
      lastOverlayLabel = nextOverlayLabel;

      inputIndex++;
    }

    // Overlay template overlay image
    inputs.push('-loop', '1', '-i', overlayPath);
    const overlayImageLabel = `[${inputIndex}:v]`;
    const finalLabel = '[final]';
    filterParts.push(`${lastOverlayLabel}${overlayImageLabel}overlay=0:0:shortest=1${finalLabel}`);

    const finalVideoName = `video-frame-${String(draftIndex + 1).padStart(2, '0')}.mp4`;
    const finalVideoPath = path.join(sessionDir, finalVideoName);

    const ffmpegArgs = [
      '-y',
      ...inputs,
      '-filter_complex', filterParts.join(';'),
      '-map', finalLabel,
      '-r', '45',
      '-c:v', 'libx264',
      '-crf', '17',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-t', '10',
      finalVideoPath
    ];

    console.log(`Running FFmpeg for draft ${draftIndex + 1}...`);
    const child = spawn(ffmpeg, ffmpegArgs);
    
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`Draft ${draftIndex + 1} composition generated successfully: ${finalVideoPath}`);
          resolve();
        } else {
          console.error(`FFmpeg failed for draft ${draftIndex + 1} with code ${code}`);
          console.error(stderr);
          reject(new Error(stderr));
        }
      });
      child.on('error', reject);
    });

    // Update metadata files entry in memory
    if (fs.existsSync(finalVideoPath)) {
      if (!metadata.files) metadata.files = {};
      if (!metadata.files.frames) metadata.files.frames = [];
      if (!metadata.files.frames[draftIndex]) {
        metadata.files.frames[draftIndex] = {
          fileName: `frame-${String(draftIndex + 1).padStart(2, '0')}.png`,
          path: `data/saved-sessions/${path.basename(sessionDir)}/frame-${String(draftIndex + 1).padStart(2, '0')}.png`,
          mimeType: 'image/png'
        };
      }
      metadata.files.frames[draftIndex].video = {
        fileName: finalVideoName,
        path: `data/saved-sessions/${path.basename(sessionDir)}/${finalVideoName}`,
        mimeType: 'video/mp4'
      };
    }
  }

  // Write updated metadata back to disk
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log('Updated metadata.json inside session folder.');

  // Update guest-outputs JSON registry
  const guestOutputPath = path.join(projectRoot, 'data', 'guest-outputs', `${guestOutputId}.json`);
  if (fs.existsSync(guestOutputPath)) {
    try {
      const payload = readJson(guestOutputPath);
      payload.hasPendingVideos = false;

      for (let index = 0; index < metadata.files.frames.length; index++) {
        const frameRec = metadata.files.frames[index];
        if (frameRec && frameRec.video) {
          if (payload.frames && payload.frames[index]) {
            payload.frames[index].video = {
              fileName: frameRec.video.fileName,
              mimeType: 'video/mp4',
              label: `Khung ${index + 1} kèm video`
            };
          }
          if (payload.savedFiles && payload.savedFiles.frames && payload.savedFiles.frames[index]) {
            payload.savedFiles.frames[index].video = {
              fileName: frameRec.video.fileName,
              path: frameRec.video.path,
              mimeType: 'video/mp4'
            };
          }
        }
      }

      fs.writeFileSync(guestOutputPath, JSON.stringify(payload, null, 2), 'utf8');
      console.log('Successfully updated guest output registry JSON.');
    } catch (e) {
      console.error('Error updating guest output registry JSON:', e);
    }
  } else {
    console.log(`Warning: Guest output registry file not found: ${guestOutputPath}`);
  }

  console.log("Video composition process completed successfully!");
}

main().catch(console.error);
