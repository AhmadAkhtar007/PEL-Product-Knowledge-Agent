import json
import os

brain_dir = r"C:\Users\Ahmad Akhtar\.gemini\antigravity\brain"
log_files = []
for root, _, files in os.walk(brain_dir):
    for f in files:
        if f == "transcript.jsonl":
            log_files.append(os.path.join(root, f))

files_to_recover = {}

for log_file in log_files:
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
            except:
                continue
            
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    if tc.get("name") in ["write_to_file", "replace_file_content"]:
                        args = tc.get("args", {})
                        
                        target_raw = args.get("TargetFile", "")
                        try:
                            target = json.loads(target_raw) if target_raw else ""
                        except:
                            target = target_raw
                            
                        if "agent-app" in target and "node_modules" not in target:
                            content_raw = args.get("CodeContent") or args.get("ReplacementContent", "")
                            try:
                                content = json.loads(content_raw) if content_raw else ""
                            except:
                                content = content_raw
                                
                            if content:
                                files_to_recover[target] = content

for path, content in files_to_recover.items():
    print(f"Recovering {path}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Done")
