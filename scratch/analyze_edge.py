import os

def analyze_profile(path):
    print(f"=== Profile {path} ===")
    if not os.path.exists(path):
        print("Not found")
        return
    for item in os.listdir(path):
        item_path = os.path.join(path, item)
        if os.path.isdir(item_path):
            size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(item_path) for f in fs)
            if size > 1 * 1024 * 1024: # > 1MB
                print(f"  {item}: {size/1024/1024:.2f} MB")

analyze_profile(".kiosk-edge-profile")
analyze_profile(".kiosk-edge-dashboard-profile")
