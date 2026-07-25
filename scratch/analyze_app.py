import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)

# Find all useEffect calls
# We can search for 'useEffect(' and find its matching brackets and dependencies.
matches = re.finditer(r'useEffect\(\s*(\(\)\s*=>|async\s*\(\)\s*=>|function)', content)

for m in matches:
    start_pos = m.start()
    # Find matching brackets/parentheses to identify the end of useEffect
    bracket_count = 0
    paren_count = 0
    end_pos = -1
    for i in range(start_pos, len(content)):
        char = content[i]
        if char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1
        elif char == '{':
            bracket_count += 1
        elif char == '}':
            bracket_count -= 1
        
        if paren_count == 0 and bracket_count == 0 and i > start_pos + 10:
            end_pos = i + 1
            break
    
    if end_pos != -1:
        effect_str = content[start_pos:end_pos]
        # find the line number of start_pos
        start_line = content.count('\n', 0, start_pos) + 1
        end_line = content.count('\n', 0, end_pos) + 1
        
        # Look for dependencies in the last line or so
        dep_match = re.search(r'\}\s*,\s*\[(.*?)\]\s*\);?\s*$', effect_str.strip(), re.DOTALL)
        deps = dep_match.group(1).strip() if dep_match else "None"
        
        # Clean up deps to print on one line
        deps = re.sub(r'\s+', ' ', deps)
        
        # Check if deps contains capturedPhotos or guestAutoCaptureIndices or anything related
        if any(x in deps for x in ['capturedPhotos', 'guestAutoCaptureIndices', 'guestAutoCapturePhotoKey', 'nextCaptureSecondsLeft']):
            print(f"Lines {start_line}-{end_line}: deps = [{deps}]")
            # print first few lines of the hook
            effect_lines = effect_str.split('\n')
            for el in effect_lines[:10]:
                print("  " + el)
            print("  ...")
