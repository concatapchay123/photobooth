import os
import re

def search_files(directory, query, extension_filter=None):
    results = []
    regex = re.compile(query, re.IGNORECASE)
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.git' in root or '.codegraph' in root:
            continue
        for file in files:
            if extension_filter and not file.endswith(extension_filter):
                continue
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_num, line in enumerate(f, 1):
                        if regex.search(line):
                            results.append((path, line_num, line.strip()))
            except Exception as e:
                pass
    return results

if __name__ == '__main__':
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "MediaRecorder"
    ext = sys.argv[2] if len(sys.argv) > 2 else None
    results = search_files('E:\\my-photobooth', query, ext)
    print(f"Found {len(results)} matches for '{query}':")
    for r in results[:100]:
        print(f"{r[0]}:{r[1]}: {r[2]}")
