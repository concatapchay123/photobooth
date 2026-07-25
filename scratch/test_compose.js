import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

const projectRoot = 'E:\\my-photobooth';
const sessionDir = path.join(projectRoot, 'data/saved-sessions/20260606_095138_03-Banh-Quy-Tim_55214');
const guestOutputId = '55214bdb243f6619';

async function testCompose() {
  const metadataPath = path.join(sessionDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('metadata.json not found');
    return;
  }
  const readJson = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return JSON.parse(content);
  };

  const metadata = readJson(metadataPath);
  const registry = readJson(path.join(projectRoot, 'frames/registry.json'));

  const drafts = metadata.meta.frameDrafts || [];
  const captures = metadata.files.captures || [];

  console.log(`Found ${drafts.length} drafts and ${captures.length} captures.`);

  for (let draftIndex = 0; draftIndex < drafts.length; draftIndex++) {
    const draft = drafts[draftIndex];
    const frameName = draft.frameName;
    console.log(`Processing draft ${draftIndex + 1}: ${frameName}`);

    // Find frame in registry
    const targetFrame = registry.frames.find(f => f.name === frameName || f.name.replace(/\s+/g, '') === frameName.replace(/\s+/g, ''));
    if (!targetFrame) {
      console.error(`Frame ${frameName} not found in registry`);
      continue;
    }

    const overlayRelPath = targetFrame.overlay;
    const overlayPath = path.join(projectRoot, 'frames', overlayRelPath);
    const H = targetFrame.height;
    const W = targetFrame.width;

    // We will build the FFmpeg command
    // Inputs:
    // We need:
    // - A white background video: color=c=white:s=Wxh:d=10
    // - For each slot, the video or image input
    // - The overlay image input
    const inputs = [];
    const filterParts = [];
    
    // Background input (input 0)
    // We can use lavfi color source directly inside filter_complex or as an input.
    // Let's use lavfi color source as input 0:
    inputs.push('-f', 'lavfi', '-i', `color=c=white:s=${W}x${H}:d=10:r=45`);
    let lastOverlayLabel = '[0:v]'; // start with the background

    let inputIndex = 1;
    for (let slotIndex = 0; slotIndex < draft.slotEdits.length; slotIndex++) {
      const edit = draft.slotEdits[slotIndex];
      const slotIdx = edit.slotIndex;
      const zone = targetFrame.slots.find(s => s.slotIndex === slotIdx);
      if (!zone) continue;

      // Get capture index
      let capIdx = edit.slotIndex;
      const photoId = edit.capturedPhotoId || edit.photoId || '';
      const match = photoId.match(/-(\d+)$/);
      if (match) {
        capIdx = parseInt(match[1]);
      }

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
        // Input is a video. We loop it if it's shorter than 10s.
        inputs.push('-stream_loop', '-1', '-i', videoPath);
      } else if (hasPhoto) {
        inputs.push('-loop', '1', '-i', photoPath);
      } else {
        // Fallback: white color
        inputs.push('-f', 'lavfi', '-i', `color=c=white:s=${zone.width}x${zone.height}:d=10:r=45`);
      }

      const inputLabel = `[${inputIndex}:v]`;
      const processedLabel = `[v_proc_${slotIndex}]`;

      // Calculate transformations
      const flipX = edit.flipX || false;
      const flipY = edit.flipY || false;
      const scale = edit.scale || 1.0;
      const rotation = edit.rotation || 0;

      // Resolution of source
      const srcW = edit.naturalWidth || 1920;
      const srcH = edit.naturalHeight || 1080;

      const drawW = Math.round(srcW * scale);
      const drawH = Math.round(srcH * scale);

      // Slot bounds
      const sx = zone.x;
      const sy = zone.y;
      const sw = zone.width;
      const sh = zone.height;

      // Crop X, Y relative to scaled video
      const cropX = Math.round(sx - edit.x);
      const cropY = Math.round(sy - edit.y);

      // Build filters for this input
      const filters = ['setpts=N/30/TB'];
      
      // 1. Flip
      if (flipX) filters.push('hflip');
      if (flipY) filters.push('vflip');
      
      // 2. Scale
      filters.push(`scale=${drawW}:${drawH}`);

      // 3. Rotate (if any)
      if (rotation !== 0) {
        filters.push(`rotate=${rotation}*PI/180:ow=${drawW}:oh=${drawH}:fillcolor=white`);
      }

      // 4. Crop to slot cutout bounds (prevent spillover)
      // Ensure crop bounds are within scaled dimensions
      const safeCropX = Math.max(0, cropX);
      const safeCropY = Math.max(0, cropY);
      // If crop starts outside, we pad or clamp
      filters.push(`crop=${sw}:${sh}:${safeCropX}:${safeCropY}`);

      // Apply filters to this input
      filterParts.push(`${inputLabel}${filters.join(',')}${processedLabel}`);

      // Overlay onto the running background canvas
      const nextOverlayLabel = `[bg_${slotIndex}]`;
      filterParts.push(`${lastOverlayLabel}${processedLabel}overlay=${sx}:${sy}:shortest=1${nextOverlayLabel}`);
      lastOverlayLabel = nextOverlayLabel;

      inputIndex++;
    }

    // Overlay the frame design PNG on top
    inputs.push('-loop', '1', '-i', overlayPath);
    const overlayImageLabel = `[${inputIndex}:v]`;
    const finalLabel = '[final]';
    filterParts.push(`${lastOverlayLabel}${overlayImageLabel}overlay=0:0:shortest=1${finalLabel}`);

    const outputPath = path.join(sessionDir, `test-compose-ffmpeg-${draftIndex + 1}.mp4`);
    const args = [
      '-y',
      ...inputs,
      '-filter_complex', filterParts.join(';'),
      '-map', finalLabel,
      '-r', '45',
      '-c:v', 'libx264',
      '-crf', '17',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-t', '10', // limit duration to 10 seconds
      outputPath
    ];

    console.log('Running FFmpeg with arguments:', args.join(' '));

    const child = spawn(ffmpeg, args);
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`Successfully generated composed video at ${outputPath}`);
          resolve();
        } else {
          console.error(`FFmpeg failed with code ${code}`);
          console.error(stderr);
          reject(new Error(stderr));
        }
      });
      child.on('error', reject);
    });
  }
}

testCompose().catch(console.error);
