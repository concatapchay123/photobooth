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

while i < n:
    char = content[i]
    if char == '\n':
        if 9750 <= line_num <= 9800:
            # print line content and stack size
            line_start = content.rfind('\n', 0, i)
            if line_start == -1:
                line_start = 0
            else:
                line_start += 1
            line_str = content[line_start:i].rstrip()
            print(f"{line_num:4d} (level {len(stack):2d}): {line_str}")
        line_num += 1
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
            
    i += 1
