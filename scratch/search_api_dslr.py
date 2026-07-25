import os

def search_files(directory, keyword):
    print(f"Searching for '{keyword}' in {directory}")
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        for file in files:
            if file.endswith(('.js', '.jsx', '.json', '.html', '.py', '.txt')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for idx, line in enumerate(f, 1):
                            if keyword in line:
                                print(f"{path}:{idx}: {line.strip()}")
                except Exception:
                    pass

search_files("d:/my-photobooth", "/api/dslr")
