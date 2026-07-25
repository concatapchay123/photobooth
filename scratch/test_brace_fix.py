import re
import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Insert }; at index 4826 (which is line 4827, 0-indexed is 4826)
# Let's inspect the line around that first to make sure we insert in the correct place.
target_line = lines[4825] # 4826th line (0-indexed 4825)
print(f"Target line before insert: {repr(target_line)}")

# Let's insert the closing brace and semicolon
lines.insert(4826, "  };\n")

new_code = "".join(lines)

# Now run the brace check algorithm on new_code
# Replace strings
new_code = re.sub(r"'(?:\\.|[^'\\])*'", "''", new_code)
new_code = re.sub(r'"(?:\\.|[^"\\])*"', '""', new_code)
new_code = re.sub(r"`(?:\\.|[^`\\])*`", "``", new_code)

# Replace block comments
new_code = re.sub(r"/\*[\s\S]*?\*/", "", new_code)
# Replace line comments
new_code = re.sub(r"//.*", "", new_code)

# Replace known regexes
new_code = new_code.replace(r"/[<>:\"/\\|?*\x00-\x1F]/g", "''")
# Replace any other regex literal
new_code = re.sub(r"/[^/\n\s]+/[gimy]*", "''", new_code)

stack = []
mismatches = 0
for idx, line in enumerate(new_code.split('\n')):
    line_num = idx + 1
    for char_idx, char in enumerate(line):
        if char in ('{', '(', '['):
            stack.append((char, line_num, char_idx + 1))
        elif char in ('}', ')', ']'):
            if not stack:
                print(f"Extra closing '{char}' at line {line_num}, col {char_idx + 1}")
                mismatches += 1
            else:
                top_char, top_line, top_col = stack[-1]
                match = False
                if char == '}' and top_char == '{': match = True
                elif char == ')' and top_char == '(': match = True
                elif char == ']' and top_char == '[': match = True
                
                if match:
                    stack.pop()
                else:
                    print(f"Mismatch: '{char}' at line {line_num}, col {char_idx + 1} does not match '{top_char}' from line {top_line}")
                    mismatches += 1
                    stack.pop()

print(f"Brace check finished. Mismatches: {mismatches}, Open elements remaining: {len(stack)}")
if stack:
    for char, line, col in stack[-10:]:
        print(f"  Unclosed '{char}' at line {line}")
