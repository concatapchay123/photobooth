import os
import json

def inspect_json(filepath):
    print(f"=== Inspecting {filepath} ===")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Schema: {data.get('schema')}")
            print(f"Id: {data.get('id')}")
            print(f"SavedAt: {data.get('savedAt')}")
            print(f"ExpiresAt: {data.get('expiresAt')}")
            print(f"Has savedFiles: {'savedFiles' in data}")
            print(f"Keys: {list(data.keys())}")
    except Exception as e:
        print(f"Error: {e}")

for name in os.listdir('data/guest-outputs'):
    if name.endswith('.json') and os.path.getsize(os.path.join('data/guest-outputs', name)) > 10 * 1024 * 1024:
        inspect_json(os.path.join('data/guest-outputs', name))
