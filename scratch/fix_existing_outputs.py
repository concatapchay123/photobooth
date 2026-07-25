import os
import json

def main():
    guest_outputs_dir = r"D:\my-photobooth\data\guest-outputs"
    base_dir = r"D:\my-photobooth"
    
    if not os.path.exists(guest_outputs_dir):
        print(f"Directory not found: {guest_outputs_dir}")
        return

    print("Scanning guest output files for missing video paths in savedFiles...")
    fixed_count = 0
    
    for filename in os.listdir(guest_outputs_dir):
        if not filename.endswith(".json"):
            continue
            
        file_path = os.path.join(guest_outputs_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                payload = json.load(f)
                
            updated = False
            saved_files = payload.get("savedFiles")
            if not saved_files:
                continue
                
            session_rel_dir = saved_files.get("directory")
            if not session_rel_dir:
                continue
                
            session_abs_dir = os.path.join(base_dir, session_rel_dir)
            frames = payload.get("frames", [])
            saved_frames = saved_files.get("frames", [])
            
            for index, frame in enumerate(saved_frames):
                # Target video file path
                video_name = f"video-frame-{index + 1:02d}.mp4"
                video_rel_path = f"{session_rel_dir}/{video_name}".replace("\\", "/")
                video_abs_path = os.path.join(base_dir, session_rel_dir, video_name)
                
                if os.path.exists(video_abs_path):
                    # Check if savedFiles frame has video key
                    if "video" not in frame:
                        frame["video"] = {
                            "fileName": video_name,
                            "path": video_rel_path,
                            "mimeType": "video/mp4"
                        }
                        updated = True
                        print(f"[{filename}] Added savedFiles.frames[{index}].video -> {video_rel_path}")
                        
                    # Also check if payload.frames has video key
                    if index < len(frames) and "video" not in frames[index]:
                        frames[index]["video"] = {
                            "fileName": video_name,
                            "mimeType": "video/mp4",
                            "label": f"Khung {index + 1} kèm video"
                        }
                        updated = True
                        print(f"[{filename}] Added frames[{index}].video")
            
            if updated:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                fixed_count += 1
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            
    print(f"\nDone! Fixed {fixed_count} guest output files.")

if __name__ == "__main__":
    main()
