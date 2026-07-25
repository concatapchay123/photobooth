import os
import shutil
import json
from datetime import datetime, timezone

def get_dir_size(path):
    total = 0
    if not os.path.exists(path):
        return 0
    for r, _, fs in os.walk(path):
        for f in fs:
            fp = os.path.join(r, f)
            try:
                total += os.path.getsize(fp)
            except:
                pass
    return total

def clean_temp_folder():
    temp_dir = "data/temp"
    if not os.path.exists(temp_dir):
        return
    print("Cleaning data/temp folder...")
    for f in os.listdir(temp_dir):
        fp = os.path.join(temp_dir, f)
        if os.path.isfile(fp):
            try:
                os.remove(fp)
                print(f"  Deleted temp file: {f}")
            except Exception as e:
                print(f"  Failed to delete temp file {f}: {e}")

def clean_guest_outputs():
    guest_dir = "data/guest-outputs"
    if not os.path.exists(guest_dir):
        return
    print("Cleaning and optimizing data/guest-outputs...")
    now = datetime.now(timezone.utc)
    
    for f in os.listdir(guest_dir):
        if not f.endswith(".json"):
            continue
        fp = os.path.join(guest_dir, f)
        try:
            with open(fp, "r", encoding="utf-8") as file:
                payload = json.load(file)
                
            expires_at_str = payload.get("expiresAt")
            expired = False
            if expires_at_str:
                try:
                    # Parse ISO string
                    expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                    if now >= expires_at:
                        expired = True
                except Exception as ex:
                    print(f"  Could not parse expiry date for {f}: {ex}")
            
            if expired:
                os.remove(fp)
                print(f"  Deleted expired guest output: {f}")
            else:
                # If not expired, optimize it by stripping base64 data URLs if savedFiles is present
                if "savedFiles" in payload:
                    modified = False
                    if "print" in payload and payload["print"] and "dataUrl" in payload["print"]:
                        payload["print"].pop("dataUrl", None)
                        payload["print"].pop("pngDataUrl", None)
                        modified = True
                    if "frames" in payload and isinstance(payload["frames"], list):
                        for frame in payload["frames"]:
                            if "dataUrl" in frame:
                                frame.pop("dataUrl", None)
                                frame.pop("pngDataUrl", None)
                                if "video" in frame and frame["video"]:
                                    frame["video"].pop("dataUrl", None)
                                modified = True
                    if "captures" in payload and isinstance(payload["captures"], list):
                        for capture in payload["captures"]:
                            if "dataUrl" in capture:
                                capture.pop("dataUrl", None)
                                if "video" in capture and capture["video"]:
                                    capture["video"].pop("dataUrl", None)
                                modified = True
                    if "video" in payload and payload["video"] and "dataUrl" in payload["video"]:
                        payload["video"].pop("dataUrl", None)
                        modified = True
                        
                    if modified:
                        with open(fp, "w", encoding="utf-8") as file:
                            json.dump(payload, file, indent=2, ensure_ascii=False)
                        print(f"  Optimized unexpired guest output (stripped base64): {f}")
        except Exception as e:
            print(f"  Error processing {f}: {e}")

def delete_all_saved_sessions():
    saved_sessions_dir = "data/saved-sessions"
    if not os.path.exists(saved_sessions_dir):
        return
    print("Deleting all files in data/saved-sessions/ as requested by user...")
    for item in os.listdir(saved_sessions_dir):
        item_path = os.path.join(saved_sessions_dir, item)
        try:
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
                print(f"  Deleted directory: {item}")
            else:
                os.remove(item_path)
                print(f"  Deleted file: {item}")
        except Exception as e:
            print(f"  Failed to delete {item}: {e}")

def main():
    initial_sizes = {
        "D:\\my-photobooth": get_dir_size("."),
        "data/temp": get_dir_size("data/temp"),
        "data/guest-outputs": get_dir_size("data/guest-outputs"),
        "data/saved-sessions": get_dir_size("data/saved-sessions"),
    }
    
    print(f"Initial workspace size: {initial_sizes['D:\\my-photobooth']/1024/1024:.2f} MB")
    print("----------------------------------------")
    
    clean_temp_folder()
    clean_guest_outputs()
    delete_all_saved_sessions()
    
    print("----------------------------------------")
    final_sizes = {
        "D:\\my-photobooth": get_dir_size("."),
        "data/temp": get_dir_size("data/temp"),
        "data/guest-outputs": get_dir_size("data/guest-outputs"),
        "data/saved-sessions": get_dir_size("data/saved-sessions"),
    }
    
    print("Optimization summary:")
    print(f"  data/temp: {initial_sizes['data/temp']/1024/1024:.2f} MB -> {final_sizes['data/temp']/1024/1024:.2f} MB")
    print(f"  data/guest-outputs: {initial_sizes['data/guest-outputs']/1024/1024:.2f} MB -> {final_sizes['data/guest-outputs']/1024/1024:.2f} MB")
    print(f"  data/saved-sessions: {initial_sizes['data/saved-sessions']/1024/1024:.2f} MB -> {final_sizes['data/saved-sessions']/1024/1024:.2f} MB")
    
    total_saved = (initial_sizes["D:\\my-photobooth"] - final_sizes["D:\\my-photobooth"]) / 1024 / 1024
    print(f"Total size: {initial_sizes['D:\\my-photobooth']/1024/1024:.2f} MB -> {final_sizes['D:\\my-photobooth']/1024/1024:.2f} MB")
    print(f"Total space saved: {total_saved:.2f} MB")

if __name__ == "__main__":
    main()
