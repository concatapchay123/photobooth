import os
import sys
import json
import re
import cv2
import numpy as np
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

def get_capture_index(edit):
    photo_id = edit.get('capturedPhotoId') or edit.get('photoId') or ''
    match = re.search(r'-(\d+)$', photo_id)
    if match:
        return int(match.group(1))
    return edit.get('slotIndex', 0)

def find_frame(registry_frames, name):
    for f in registry_frames:
        if f.get('name') == name:
            return f
    name_no_ext = os.path.splitext(name)[0]
    for f in registry_frames:
        f_name_no_ext = os.path.splitext(f.get('name', ''))[0]
        if f_name_no_ext == name_no_ext:
            return f
        if name_no_ext in f_name_no_ext or f_name_no_ext in name_no_ext:
            return f
    return None

def transform_and_overlay(canvas, img, placement, slot):
    src_h, src_w = img.shape[:2]
    
    # 1. Flip (no pre-copy if not flipping)
    flipX = placement.get('flipX', False)
    flipY = placement.get('flipY', False)
    if flipX and flipY:
        flipped = cv2.flip(img, -1)
    elif flipX:
        flipped = cv2.flip(img, 1)
    elif flipY:
        flipped = cv2.flip(img, 0)
    else:
        flipped = img
        
    # 2. Resize
    scale = placement.get('scale', 1.0)
    draw_w = int(round(src_w * scale))
    draw_h = int(round(src_h * scale))
    if draw_w <= 0 or draw_h <= 0:
        return
    
    resized = cv2.resize(flipped, (draw_w, draw_h), interpolation=cv2.INTER_LANCZOS4 if scale > 1.0 else cv2.INTER_CUBIC)
    
    # 3. Create warp matrix for rotation and translation
    src_cx = draw_w / 2.0
    src_cy = draw_h / 2.0
    target_cx = placement.get('x', 0) + draw_w / 2.0
    target_cy = placement.get('y', 0) + draw_h / 2.0
    
    angle = placement.get('rotation', 0)
    M = cv2.getRotationMatrix2D((src_cx, src_cy), -angle, 1.0)
    
    R = M[:, :2]
    src_pt = np.array([src_cx, src_cy], dtype=np.float32)
    target_pt = np.array([target_cx, target_cy], dtype=np.float32)
    T = target_pt - R.dot(src_pt)
    M[:, 2] = T
    
    canvas_h, canvas_w = canvas.shape[:2]
    
    # 4. Clip to slot bounds and perform warpAffine only inside the slot bounding box (Crop-and-Warp)
    sx, sy, sw, sh = slot['x'], slot['y'], slot['width'], slot['height']
    x1 = max(0, sx)
    y1 = max(0, sy)
    x2 = min(canvas_w, sx + sw)
    y2 = min(canvas_h, sy + sh)
    
    if x2 > x1 and y2 > y1:
        M_cropped = M.copy()
        M_cropped[0, 2] -= x1
        M_cropped[1, 2] -= y1
        temp_cropped = cv2.warpAffine(resized, M_cropped, (x2 - x1, y2 - y1),
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        canvas[y1:y2, x1:x2] = temp_cropped

def apply_overlay(canvas, overlay_rgb_alpha, one_minus_alpha):
    # Vectorized alpha blending using precomputed alpha matrices
    canvas[:, :] = (canvas.astype(np.float32) * one_minus_alpha + overlay_rgb_alpha).astype(np.uint8)

def main():
    if len(sys.argv) < 3:
        print("Usage: python compose_video.py <session_dir> <guest_output_id>")
        sys.exit(1)
        
    session_dir = os.path.abspath(sys.argv[1])
    guest_output_id = sys.argv[2]
    
    print(f"Starting video composition for session in {session_dir} (ID: {guest_output_id})")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    print(f"Dynamic project root resolved to: {project_root}")
    
    metadata_path = os.path.join(session_dir, 'metadata.json')
    if not os.path.exists(metadata_path):
        print(f"Error: metadata.json not found in {session_dir}")
        sys.exit(1)
        
    with open(metadata_path, 'r', encoding='utf-8-sig') as f:
        metadata = json.load(f)
        
    registry_path = os.path.join(project_root, 'frames', 'registry.json')
    if not os.path.exists(registry_path):
        print(f"Error: Registry file not found: {registry_path}")
        sys.exit(1)
        
    with open(registry_path, 'r', encoding='utf-8-sig') as f:
        registry = json.load(f)
        
    # Find local FFmpeg path
    ffmpeg_bin = None
    base_dir = os.path.join(project_root, 'node_modules', 'ffmpeg-static')
    if os.path.exists(base_dir):
        for root, dirs, files in os.walk(base_dir):
            for f_name in files:
                if f_name.endswith(".exe") and "ffmpeg" in f_name.lower():
                    ffmpeg_bin = os.path.join(root, f_name)
                    break
            if ffmpeg_bin:
                break
    if not ffmpeg_bin:
        ffmpeg_bin = "ffmpeg"
    print("Using FFmpeg binary:", ffmpeg_bin)
    
    drafts = metadata.get('meta', {}).get('frameDrafts', [])
    captures = metadata.get('files', {}).get('captures', [])
    
    print(f"Found {len(drafts)} drafts and {len(captures)} captures.")
    
    for draft_index, draft in enumerate(drafts):
        frame_name = draft.get('frameName')
        print(f"Processing draft {draft_index + 1}/{len(drafts)}: {frame_name}")
        
        target_frame = find_frame(registry.get('frames', []), frame_name)
        if not target_frame:
            print(f"Error: Frame '{frame_name}' not found in registry.json")
            continue
            
        overlay_rel_path = target_frame.get('overlay')
        overlay_path = os.path.join(project_root, 'frames', overlay_rel_path)
        if not os.path.exists(overlay_path):
            print(f"Error: Overlay file does not exist: {overlay_path}")
            continue
            
        print("Loading frame overlay from:", overlay_path)
        overlay = cv2.imread(overlay_path, cv2.IMREAD_UNCHANGED)
        if overlay is None:
            print("Error: Failed to load overlay image.")
            continue
            
        H, W = overlay.shape[:2]
        print(f"Resolution of overlay: {W}x{H}")
        
        # Prepare inputs for each slot
        slot_items = []
        for edit in draft.get('slotEdits', []):
            slot_idx = edit.get('slotIndex', 0)
            
            # Find the slot zone in registry
            zone = None
            for s in target_frame.get('slots', []):
                if s.get('slotIndex') == slot_idx:
                    zone = s
                    break
                    
            if not zone:
                print(f"Warning: Slot zone not found for index {slot_idx}")
                continue
                
            cap_idx = get_capture_index(edit)
            capture_record = captures[cap_idx] if cap_idx < len(captures) else None
            
            video_path = None
            photo_path = None
            if capture_record:
                if 'video' in capture_record and capture_record['video']:
                    v_name = capture_record['video'].get('fileName')
                    if v_name:
                        video_path = os.path.join(session_dir, v_name)
                p_name = capture_record.get('fileName')
                if p_name:
                    photo_path = os.path.join(session_dir, p_name)
            
            cached_frames = []
            input_fps = 30.0
            if video_path and os.path.exists(video_path):
                print(f"Slot {slot_idx}: caching video {video_path} in memory...")
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened():
                    cached_timestamps = []
                    while len(cached_frames) < 1000:
                        t_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
                        ret, frame = cap.read()
                        if not ret:
                            break
                        cached_frames.append(frame)
                        cached_timestamps.append(t_ms)
                    cap.release()
                    
                    # Estimate true input FPS from the actual recorded duration
                    if len(cached_frames) > 1 and cached_timestamps[-1] > 0:
                        duration_sec = cached_timestamps[-1] / 1000.0
                        if duration_sec > 0:
                            input_fps = len(cached_frames) / duration_sec
                            print(f"Slot {slot_idx}: calculated true FPS = {input_fps:.2f} based on duration {duration_sec:.2f}s")
                    else:
                        fps_val = cap.get(cv2.CAP_PROP_FPS)
                        if fps_val and 5.0 <= fps_val <= 65.0:
                            input_fps = fps_val
                    print(f"Slot {slot_idx}: cached {len(cached_frames)} frames at {input_fps} FPS.")
                else:
                    print(f"Warning: Could not open video {video_path}")
                    
            photo_img = None
            if photo_path and os.path.exists(photo_path):
                print(f"Slot {slot_idx}: loading photo fallback {photo_path}")
                photo_img = cv2.imread(photo_path)
                
            slot_items.append({
                'slot': zone,
                'edit': edit,
                'cached_frames': cached_frames,
                'photo_img': photo_img,
                'input_fps': input_fps
            })
            
        # Precompute overlay alpha and rgb values for fast blending
        overlay_alpha = overlay[:, :, 3:4].astype(np.float32) / 255.0
        overlay_rgb_alpha = overlay[:, :, :3].astype(np.float32) * overlay_alpha
        one_minus_alpha = 1.0 - overlay_alpha
        
        # Pre-allocate background canvas
        canvas_bg = np.ones((H, W, 3), dtype=np.uint8) * 255
        
        # Initialize VideoWriter
        temp_video_name = f"temp-compose-{draft_index + 1}.mp4"
        temp_video_path = os.path.join(session_dir, temp_video_name)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        # 45 FPS as requested by the user
        fps = 45.0
        # Duration: 10 seconds -> 450 frames
        total_frames = 450
        
        out = cv2.VideoWriter(temp_video_path, fourcc, fps, (W, H))
        if not out.isOpened():
            print("Error: Could not open output video for writing.")
            continue
            
        print(f"Composing {total_frames} frames at 45 FPS...")
        for frame_idx in range(total_frames):
            # Re-use white background canvas (much faster than allocating new arrays)
            canvas = canvas_bg.copy()
            
            for item in slot_items:
                slot = item['slot']
                edit = item['edit']
                cached_frames = item['cached_frames']
                photo_img = item['photo_img']
                input_fps = item.get('input_fps', 30.0)
                
                slot_frame = None
                if cached_frames:
                    # Calculate input frame index based on time pacing to prevent speed-up/stutter
                    mapped_idx = int(frame_idx * (input_fps / fps))
                    slot_frame = cached_frames[mapped_idx % len(cached_frames)]
                else:
                    slot_frame = photo_img
                    
                if slot_frame is not None:
                    transform_and_overlay(canvas, slot_frame, edit, slot)
                    
            apply_overlay(canvas, overlay_rgb_alpha, one_minus_alpha)
            out.write(canvas)
            
        out.release()
        print(f"Draft {draft_index + 1} composition temp file generated: {temp_video_path}")
        
        # FFmpeg final encode to h264 yuv420p at 45 FPS with faststart for streaming
        final_video_name = f"video-frame-{draft_index + 1:02d}.mp4"
        final_video_path = os.path.join(session_dir, final_video_name)
        
        gpu_success = False
        if sys.platform == 'win32':
            try:
                gpu_cmd = [
                    ffmpeg_bin, '-y',
                    '-i', temp_video_path,
                    '-r', '45',
                    '-c:v', 'h264_mf',
                    '-b:v', '8M',
                    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    final_video_path
                ]
                print("Attempting GPU hardware-accelerated encoding (h264_mf)...")
                res = subprocess.run(gpu_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=20)
                if res.returncode == 0 and os.path.exists(final_video_path) and os.path.getsize(final_video_path) > 1000:
                    print("GPU hardware encoding succeeded!")
                    gpu_success = True
                else:
                    print("GPU encoding returned error or empty file. Code:", res.returncode)
            except Exception as e:
                print("GPU encoding exception:", e)
                
        if not gpu_success:
            print("Encoding with libx264 (CPU)...")
            cpu_cmd = [
                ffmpeg_bin, '-y',
                '-i', temp_video_path,
                '-r', '45',
                '-c:v', 'libx264',
                '-crf', '17',
                '-preset', 'fast',
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                final_video_path
            ]
            res = subprocess.run(cpu_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
            if res.returncode == 0:
                print("CPU encoding succeeded!")
            else:
                print("CPU encoding failed. Code:", res.returncode)
                print("Error logs:", res.stderr)
                
        if os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except Exception as e:
                print(f"Could not remove temp file {temp_video_path}: {e}")
                
        # Update metadata.json frame record
        if os.path.exists(final_video_path):
            print("Successfully compiled final video at:", final_video_path)
            
            # Update metadata files entry
            if 'files' in metadata and 'frames' in metadata['files'] and draft_index < len(metadata['files']['frames']):
                metadata['files']['frames'][draft_index]['video'] = {
                    "fileName": final_video_name,
                    "path": f"data/saved-sessions/{os.path.basename(session_dir)}/{final_video_name}",
                    "mimeType": "video/mp4"
                }
                
    # Update metadata.json file on disk
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print("Updated metadata.json inside session folder.")
    
    # Update guest-outputs JSON file (adding both frame video and savedFiles frame video path)
    guest_output_path = os.path.join(project_root, 'data', 'guest-outputs', f"{guest_output_id}.json")
    if os.path.exists(guest_output_path):
        try:
            with open(guest_output_path, 'r', encoding='utf-8-sig') as f:
                payload = json.load(f)
                
            payload['hasPendingVideos'] = False
            
            # Map frames from metadata
            for index, frame_rec in enumerate(metadata['files']['frames']):
                if 'video' in frame_rec:
                    if index < len(payload['frames']):
                        payload['frames'][index]['video'] = {
                            "fileName": frame_rec['video']['fileName'],
                            "mimeType": "video/mp4",
                            "label": f"Khung {index + 1} kèm video"
                        }
                    if 'savedFiles' in payload and 'frames' in payload['savedFiles'] and index < len(payload['savedFiles']['frames']):
                        payload['savedFiles']['frames'][index]['video'] = {
                            "fileName": frame_rec['video']['fileName'],
                            "path": frame_rec['video']['path'],
                            "mimeType": "video/mp4"
                        }
                    
            with open(guest_output_path, 'w', encoding='utf-8') as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            print("Successfully updated guest output registry JSON.")
        except Exception as e:
            print("Error updating guest output registry JSON:", e)
    else:
        print(f"Warning: Guest output registry file not found: {guest_output_path}")
        
    print("Video composition process completed successfully!")

if __name__ == "__main__":
    main()
