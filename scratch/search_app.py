import os

def search_in_file(filepath, word):
    print(f"=== Searching in {filepath} for '{word}' ===")
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f, 1):
                if word in line:
                    print(f"  Line {i}: {line.strip()}")
    except Exception as e:
        print(f"Error: {e}")

search_in_file("src/App.jsx", "guest-output")
search_in_file("src/App.jsx", "guest/")
search_in_file("src/App.jsx", "/guest")
