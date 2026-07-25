def extract_dslr_from_vite(filepath, start, end):
    lines = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if start <= idx <= end:
                lines.append(f"{idx}: {line.rstrip()}")
    return "\n".join(lines)

with open("d:/my-photobooth/scratch/vite_config_dslr_full.txt", "w", encoding="utf-8") as f_out:
    f_out.write(extract_dslr_from_vite("d:/my-photobooth/vite.config.js", 1500, 1650))

print("Done.")
