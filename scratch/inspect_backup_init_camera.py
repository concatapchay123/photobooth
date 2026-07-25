def extract_section(filepath, start_line, end_line):
    lines = []
    lines.append(f"=== {filepath} (lines {start_line}-{end_line}) ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if start_line <= idx <= end_line:
                lines.append(f"{idx}: {line.rstrip()}")
    return "\n".join(lines)

with open("d:/my-photobooth/scratch/backup_init_camera.txt", "w", encoding="utf-8") as f_out:
    f_out.write(extract_section("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx", 4440, 4580))
print("Done.")
