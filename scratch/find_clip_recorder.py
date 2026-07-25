def find_pattern(filepath, pattern):
    lines = []
    lines.append(f"=== {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if pattern in line:
                lines.append(f"{idx}: {line.strip()}")
    return "\n".join(lines)

out_lines = []
out_lines.append(find_pattern("d:/my-photobooth/src/App.jsx", "clipRecorder"))
out_lines.append("\n\n" + "="*40 + "\n\n")
out_lines.append(find_pattern("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx", "clipRecorder"))

with open("d:/my-photobooth/scratch/clip_recorder_occurrences.txt", "w", encoding="utf-8") as f_out:
    f_out.write("\n".join(out_lines))
print("Done.")
