def extract_section(filepath, start_line, end_line):
    lines = []
    lines.append(f"=== {filepath} (lines {start_line}-{end_line}) ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if start_line <= idx <= end_line:
                lines.append(f"{idx}: {line.rstrip()}")
    return "\n".join(lines)

out_lines = []
out_lines.append(extract_section("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx", 4830, 4920))
out_lines.append("\n\n" + "="*40 + "\n\n")
out_lines.append(extract_section("d:/my-photobooth/src/App.jsx", 4900, 5025))

with open("d:/my-photobooth/scratch/capture_comparison.txt", "w", encoding="utf-8") as f_out:
    f_out.write("\n".join(out_lines))
print("Comparison file written.")
