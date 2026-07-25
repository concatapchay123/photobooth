import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

stack = []
in_string = None
in_comment_single = False
in_comment_multi = False
escaped = False

i = 0
n = len(content)
line_num = 1
col_num = 1

print("Parsing all brackets...")
while i < n:
    char = content[i]
    if char == '\n':
        line_num += 1
        col_num = 1
        in_comment_single = False
        i += 1
        continue
    
    if in_comment_single:
        i += 1
        continue
        
    if in_comment_multi:
        if char == '*' and i < n - 1 and content[i+1] == '/':
            in_comment_multi = False
            i += 2
        else:
            i += 1
        continue
        
    if in_string:
        if escaped:
            escaped = False
        elif char == '\\':
            escaped = True
        elif char == in_string:
            in_string = None
        i += 1
        continue
        
    if char == '/' and i < n - 1 and content[i+1] == '/':
        in_comment_single = True
        i += 2
        continue
        
    if char == '/' and i < n - 1 and content[i+1] == '*':
        in_comment_multi = True
        i += 2
        continue
        
    if char in ("'", '"', '`'):
        in_string = char
        escaped = False
        i += 1
        continue
        
    if char in ('{', '(', '['):
        stack.append((char, line_num, col_num))
    elif char in ('}', ')', ']'):
        if not stack:
            print(f"Extra closing '{char}' at line {line_num}, col {col_num}")
        else:
            top_char, top_line, top_col = stack[-1]
            match = False
            if char == '}' and top_char == '{': match = True
            elif char == ')' and top_char == '(': match = True
            elif char == ']' and top_char == '[': match = True
            
            if match:
                stack.pop()
            else:
                print(f"Mismatch: '{char}' at line {line_num}, col {col_num} does not match '{top_char}' from line {top_line}, col {top_col}")
                # Try to pop to recover, or stop
                # Let's pop to see if we can continue
                stack.pop()
                
    i += 1
    col_num += 1

print(f"Parsing done. Open elements left on stack: {len(stack)}")
if stack:
    print("Unclosed elements:")
    for char, line, col in stack[-20:]:
        print(f"  '{char}' opened at line {line}, col {col}")
