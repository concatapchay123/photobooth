import re

def list_functions(filepath, output_path):
    print(f"Finding functions in {filepath} -> {output_path}")
    func_pattern = re.compile(r'^\s*(?:const|function|let|var)\s+([a-zA-Z0-9_]+)\s*(?:=|:\s*function|\()')
    funcs = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f, 1):
                m = func_pattern.match(line)
                if m:
                    funcs.append(f"{idx}: {line.strip()}")
        with open(output_path, 'w', encoding='utf-8') as f_out:
            f_out.write("\n".join(funcs))
    except Exception as e:
        print(f"Error: {e}")

list_functions("d:/my-photobooth/src/App.jsx", "d:/my-photobooth/scratch/funcs_active.txt")
list_functions("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx", "d:/my-photobooth/scratch/funcs_backup.txt")
print("Done.")
