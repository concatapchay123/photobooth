with open("d:/my-photobooth/scratch/diff_app.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
out = []
for idx, line in enumerate(lines[900:1500], 900):
    out.append(f"{idx}: {line.strip()}")

with open("d:/my-photobooth/scratch/diff_app_part4.txt", "w", encoding="utf-8") as f_out:
    f_out.write("\n".join(out))
print("Done.")
