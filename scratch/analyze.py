import os
from collections import Counter

def analyze_dir(path):
    print(f"=== Analyzing {path} ===")
    if not os.path.exists(path):
        print("Directory does not exist")
        return
    
    files = []
    for r, _, fs in os.walk(path):
        for f in fs:
            files.append(os.path.join(r, f))
            
    print(f"Total files: {len(files)}")
    sizes = [os.path.getsize(f) for f in files]
    total_size = sum(sizes)
    print(f"Total size: {total_size/1024/1024:.2f} MB")
    
    exts = Counter(os.path.splitext(f)[1].lower() for f in files)
    print("File extensions:")
    for ext, count in exts.most_common(10):
        print(f"  {ext or '(no ext)'}: {count}")
        
    print("Top 10 largest files:")
    sorted_files = sorted(files, key=os.path.getsize, reverse=True)
    for f in sorted_files[:10]:
        print(f"  {f}: {os.path.getsize(f)/1024/1024:.2f} MB")

analyze_dir("data/saved-sessions")
analyze_dir("data/guest-outputs")
analyze_dir("data/temp")
