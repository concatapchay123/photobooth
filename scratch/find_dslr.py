def find_dslr(filepath):
    lines = []
    lines.append(f"=== {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if 'dslr' in line.lower() or 'useDslr' in line:
                lines.append(f"{idx}: {line.strip()}")
    return "\n".join(lines)

out_lines = []
out_lines.append(find_dslr("d:/my-photobooth/src/App.jsx"))
out_lines.append("\n\n" + "="*40 + "\n\n")
out_lines.append(find_dslr("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx"))

with open("d:/my-photobooth/scratch/dslr_occurrences.txt", "w", encoding="utf-8") as f_out:
    f_out.write("\n".join(out_lines))
print("DSL occurrences file written.")
