def filter_funcs(filepath, out_filepath):
    results = []
    results.append(f"=== {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if any(k in line.lower() for k in ['capture', 'photo', 'video', 'dslr', 'cam']):
                results.append(line.strip())
    with open(out_filepath, 'w', encoding='utf-8') as f_out:
        f_out.write("\n".join(results))

filter_funcs("d:/my-photobooth/scratch/funcs_active.txt", "d:/my-photobooth/scratch/filter_active.txt")
filter_funcs("d:/my-photobooth/scratch/funcs_backup.txt", "d:/my-photobooth/scratch/filter_backup.txt")
print("Done.")
