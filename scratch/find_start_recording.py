def find_recording_start(filepath):
    lines = []
    lines.append(f"=== {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f, 1):
            if 'recording' in line.lower() or 'clip' in line.lower():
                if any(x in line for x in ['start', 'init', 'stop', 'play', 'pause']):
                    lines.append(f"{idx}: {line.strip()}")
    return "\n".join(lines)

out_lines = []
out_lines.append(find_recording_start("d:/my-photobooth/src/App.jsx"))
out_lines.append("\n\n" + "="*40 + "\n\n")
out_lines.append(find_recording_start("d:/my-photobooth/backup/my-photobooth/my-photobooth/src/App.jsx"))

with open("d:/my-photobooth/scratch/recording_start_occurrences.txt", "w", encoding="utf-8") as f_out:
    f_out.write("\n".join(out_lines))
print("Done.")
