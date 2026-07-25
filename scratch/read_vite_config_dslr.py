def extract_dslr_from_vite(filepath):
    print(f"=== {filepath} ===")
    lines = []
    found = False
    brace_count = 0
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if '/api/dslr' in line:
                found = True
            if found:
                lines.append(f"{idx}: {line.rstrip()}")
                # Let's collect 50 lines after the first match
                if len(lines) > 60:
                    break
    return "\n".join(lines)

with open("d:/my-photobooth/scratch/vite_config_dslr.txt", "w", encoding="utf-8") as f_out:
    f_out.write(extract_dslr_from_vite("d:/my-photobooth/vite.config.js"))

print("Done.")
