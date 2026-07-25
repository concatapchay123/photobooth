import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace strings to avoid matching brackets inside them
code = re.sub(r"'(?:\\.|[^'\\])*'", "''", code)
code = re.sub(r'"(?:\\.|[^"\\])*"', '""', code)
code = re.sub(r"`(?:\\.|[^`\\])*`", "``", code)

# Replace block comments
code = re.sub(r"/\*[\s\S]*?\*/", "", code)
# Replace line comments
code = re.sub(r"//.*", "", code)

# Replace the known regex lines manually or with a simple pattern
code = code.replace(r"/[<>:\"/\\|?*\x00-\x1F]/g", "''")
code = re.sub(r"/[^/\n\s]+/[gimy]*", "''", code)

stack = []
lines = code.split('\n')
for line_idx, line in enumerate(lines):
    line_num = line_idx + 1
    for char_idx, char in enumerate(line):
        if char in ('{', '(', '['):
            stack.append((char, line_num, char_idx + 1, line))
        elif char in ('}', ')', ']'):
            if not stack:
                print(f"Extra closing '{char}' at line {line_num}, col {char_idx + 1}: {line.strip()}")
            else:
                top_char, top_line, top_col, top_content = stack[-1]
                match = False
                if char == '}' and top_char == '{': match = True
                elif char == ')' and top_char == '(': match = True
                elif char == ']' and top_char == '[': match = True
                
                if match:
                    stack.pop()
                else:
                    print(f"Mismatch: '{char}' at line {line_num}, col {char_idx + 1} ('{line.strip()}') does not match '{top_char}' from line {top_line}, col {top_col} ('{top_content.strip()}')")
                    # Pop the mismatched opening element to keep going
                    stack.pop()

print(f"Total open elements left: {len(stack)}")
if stack:
    print("Unclosed elements list (top 15):")
    for item in stack[-15:]:
        print(f"  '{item[0]}' opened at line {item[1]}, col {item[2]}: {item[3].strip()}")
