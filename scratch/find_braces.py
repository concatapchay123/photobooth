with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

stack = []
line_num = 1
col_num = 1
in_string = None  # ' or " or `
in_comment_single = False
in_comment_multi = False
escaped = False

i = 0
n = len(content)
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
        
    # Check for comments
    if char == '/' and i < n - 1 and content[i+1] == '/':
        in_comment_single = True
        i += 2
        continue
    if char == '/' and i < n - 1 and content[i+1] == '*':
        in_comment_multi = True
        i += 2
        continue
        
    # Check for strings
    if char in ("'", '"', '`'):
        in_string = char
        escaped = False
        i += 1
        continue
        
    # Track braces
    if char == '{':
        stack.append((line_num, col_num))
    elif char == '}':
        if len(stack) == 0:
            print(f"Extra closing brace '}}' at line {line_num}, col {col_num}")
        else:
            stack.pop()
            
    col_num += 1
    i += 1

if stack:
    print(f"Total open braces: {len(stack)}")
    print("Unclosed braces opened at lines:")
    for line, col in stack:
        print(f"  Line {line}, col {col}")
else:
    print("All braces matched perfectly!")
