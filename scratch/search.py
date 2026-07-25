import os

def search_files():
    search_dirs = ['src', 'scripts']
    keywords = ['ffmpeg', 'video', 'mp4', 'ffmpeg.wasm', 'duration', 'freeze', 'stop', 'limit', 'time', '2000', '2s', 'sec']
    for root, dirs, files in os.walk('.'):
        if any(x in root for x in ['node_modules', 'dist', '.git', '.codegraph']):
            continue
        for file in files:
            if not file.endswith(('.js', '.jsx', '.html', '.css', '.py', '.ps1', '.json', '.mjs')):
                continue
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for kw in keywords:
                        if kw in content.lower():
                            # Print matching file, keyword, and line numbers
                            lines = content.split('\n')
                            matches = []
                            for idx, line in enumerate(lines):
                                if kw in line.lower():
                                    matches.append((idx + 1, line.strip()))
                            print(f"File: {path} contains keyword '{kw}' ({len(matches)} matches)")
                            # print first 5 matches
                            for line_no, text in matches[:5]:
                                print(f"  Line {line_no}: {text}")
            except Exception as e:
                pass

search_files()
