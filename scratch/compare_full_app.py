import difflib

def generate_diff(f1, f2, out_path):
    with open(f1, 'r', encoding='utf-8') as file1, open(f2, 'r', encoding='utf-8') as file2:
        diff = difflib.unified_diff(
            file1.readlines(),
            file2.readlines(),
            fromfile=f1,
            tofile=f2,
            n=2
        )
    # We only write diff lines that aren't too long to inspect
    with open(out_path, 'w', encoding='utf-8') as out:
        for line in diff:
            out.write(line)

generate_diff(
    "d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx",
    "d:/my-photobooth/src/App.jsx",
    "d:/my-photobooth/scratch/diff_app.txt"
)
print("Done full diff.")
