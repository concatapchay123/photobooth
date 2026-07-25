import difflib

def compare_files(f1, f2, out_path):
    with open(f1, 'r', encoding='utf-8') as file1, open(f2, 'r', encoding='utf-8') as file2:
        diff = difflib.unified_diff(
            file1.readlines(),
            file2.readlines(),
            fromfile=f1,
            tofile=f2,
            n=3
        )
    with open(out_path, 'w', encoding='utf-8') as out:
        out.writelines(diff)

compare_files(
    "d:/my-photobooth/backup/my-photobooth/my-photobooth/src/BeautyFilterCamera.jsx",
    "d:/my-photobooth/src/BeautyFilterCamera.jsx",
    "d:/my-photobooth/scratch/beauty_camera_diff.txt"
)
print("Done diff.")
