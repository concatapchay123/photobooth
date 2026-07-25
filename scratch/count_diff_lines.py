with open("d:/my-photobooth/scratch/diff_app.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
out = [f"Total lines in diff: {len(lines)}"]
for idx, line in enumerate(lines[:300]):
    out.append(f"{idx}: {line.strip()}")

with open("d:/my-photobooth/scratch/diff_app_first_lines.txt", "w", encoding="utf-8") as f_out:
    f_out.write("\n".join(out))
print("Done.")
