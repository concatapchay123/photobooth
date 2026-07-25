import re

def search_file(filepath, pattern, output_path):
    print(f"Searching {filepath} for '{pattern}' -> {output_path}")
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    results.append(f"{idx}: {line.rstrip()}")
        with open(output_path, 'w', encoding='utf-8') as f_out:
            f_out.write("\n".join(results))
    except Exception as e:
        print(f"Error for {filepath}: {e}")

search_file("d:/my-photobooth/src/App.jsx", "camera|canon|dslr|digicam|capture|m50|trigger", "d:/my-photobooth/scratch/search_active.txt")
search_file("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx", "camera|canon|dslr|digicam|capture|m50|trigger", "d:/my-photobooth/scratch/search_backup.txt")
print("Done searching.")
