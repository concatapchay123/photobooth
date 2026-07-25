import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

log_path = r"C:\Users\Legion\.gemini\antigravity\brain\c20f740c-4c65-4e6f-9e6c-bbd133ed405b\.system_generated\logs\transcript.jsonl"

edits = []
with open(log_path, 'r', encoding='utf-8') as f:
    for line_idx, line in enumerate(f):
        try:
            data = json.loads(line)
        except Exception as e:
            continue
        
        # Check for tool calls in model response or system updates
        # Check tool_calls
        tool_calls = data.get('tool_calls', [])
        if not tool_calls:
            # Maybe inside content of some type
            content = data.get('content', '')
            if 'replace_file_content' in content or 'multi_replace_file_content' in content:
                # We can try to extract tool calls or just record the step
                pass
        
        for tc in tool_calls:
            method = tc.get('name') or tc.get('method')
            args = tc.get('args') or tc.get('arguments') or {}
            if method in ('replace_file_content', 'multi_replace_file_content', 'default_api:replace_file_content', 'default_api:multi_replace_file_content'):
                target_file = args.get('TargetFile', '')
                if 'App.jsx' in target_file:
                    edits.append({
                        'step': data.get('step_index'),
                        'method': method,
                        'instruction': args.get('Instruction'),
                        'description': args.get('Description'),
                        'args': args
                    })

print(f"Found {len(edits)} edits to App.jsx in the transcript.")
for idx, edit in enumerate(edits[-5:]): # Show last 5 edits
    print(f"\n--- EDIT #{idx+1} (Step {edit['step']}, Method: {edit['method']}) ---")
    print(f"Instruction: {edit['instruction']}")
    print(f"Description: {edit['description']}")
    
    args = edit['args']
    if 'ReplacementContent' in args:
        print("--- Target Content ---")
        print(args.get('TargetContent'))
        print("--- Replacement Content ---")
        print(args.get('ReplacementContent'))
    elif 'ReplacementChunks' in args:
        chunks = args['ReplacementChunks']
        if isinstance(chunks, str):
            try:
                chunks = json.loads(chunks)
            except:
                pass
        if isinstance(chunks, list):
            for chunk_idx, chunk in enumerate(chunks):
                if isinstance(chunk, str):
                    try:
                        chunk = json.loads(chunk)
                    except:
                        pass
                if isinstance(chunk, dict):
                    print(f"--- Chunk #{chunk_idx+1} Target Content ---")
                    print(chunk.get('TargetContent'))
                    print(f"--- Chunk #{chunk_idx+1} Replacement Content ---")
                    print(chunk.get('ReplacementContent'))
                else:
                    print(f"--- Chunk #{chunk_idx+1} (Raw String) ---")
                    print(chunk)
        else:
            print("ReplacementChunks is not a list:", chunks)
