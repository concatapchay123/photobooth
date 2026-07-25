import os
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = 'D:/my-photobooth/data/saved-sessions'
if os.path.exists(path):
    sessions = sorted(os.listdir(path))
    if sessions:
        latest = sessions[-1]
        sp = os.path.join(path, latest)
        print(f"Latest Session: {latest}")
        meta_path = os.path.join(sp, 'metadata.json')
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            # Pretty print metadata
            print(json.dumps(meta, indent=2, ensure_ascii=False))
        else:
            print("No metadata.json found")
else:
    print("Path not found")
