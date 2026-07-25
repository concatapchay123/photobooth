with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

stack = []
in_string = None  # ' or " or `
in_comment_single = False
in_comment_multi = False
escaped = False

i = 0
n = len(content)
line_num = 1
col_num = 1

print("Parsing braces...")
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
        
    if char == '{':
        stack.append(line_num)
    elif char == '}':
        if len(stack) > 0:
            stack.pop()
        else:
            print(f"Extra '}}' found at line {line_num}")
            
    i += 1
    col_num += 1

print(f"Parsing done. Open braces remaining in stack: {len(stack)}")
if stack:
    # Print the last few open braces
    print("Last 10 open braces on stack:")
    for l in stack[-10:]:
        print(f"  Line {l}")
