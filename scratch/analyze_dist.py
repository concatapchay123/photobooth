import os

def analyze_dist():
    print("=== Analyzing dist/assets ===")
    path = "dist/assets"
    if not os.path.exists(path):
        print("Not found")
        return
    for f in os.listdir(path):
        fpath = os.path.join(path, f)
        if os.path.isfile(fpath):
            print(f"  {f}: {os.path.getsize(fpath)/1024/1024:.2f} MB")

analyze_dist()
