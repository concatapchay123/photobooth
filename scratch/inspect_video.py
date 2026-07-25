import subprocess
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

ffmpeg_bin = None
base_dir = r"D:\my-photobooth\node_modules\ffmpeg-static"
if os.path.exists(base_dir):
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".exe") and "ffmpeg" in f.lower():
                ffmpeg_bin = os.path.join(root, f)
                break
        if ffmpeg_bin:
            break

if not ffmpeg_bin:
    ffmpeg_bin = "ffmpeg"

session_dir = r"D:\my-photobooth\data\saved-sessions\20260602_114356_05-Ruy-Bang-Nho_97cb0"

def get_duration(path):
    if not os.path.exists(path):
        return "Does not exist"
    cmd = [ffmpeg_bin, "-i", path]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        # Search for duration in stderr
        for line in res.stderr.split('\n'):
            if "Duration:" in line:
                return line.strip()
    except Exception as e:
        return f"Error: {e}"
    return "Duration not found"

for i in range(1, 7):
    name = f"video-capture-{i:02d}.mp4"
    path = os.path.join(session_dir, name)
    print(f"{name}: {get_duration(path)}")
