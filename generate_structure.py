import os
import ast

def get_docstring(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if filepath.endswith('.py'):
            module = ast.parse(content)
            docstring = ast.get_docstring(module)
            return docstring.strip() if docstring else "No docstring provided."
        elif filepath.endswith(('.js', '.ts', '.jsx', '.tsx')):
            lines = content.split('\n')
            if lines and lines[0].startswith('//'):
                return lines[0][2:].strip()
            elif lines and lines[0].startswith('/*'):
                doc = []
                for line in lines:
                    doc.append(line)
                    if '*/' in line:
                        break
                return '\n'.join(doc).strip()
            return "No docstring provided."
        else:
            return ""
    except Exception as e:
        return f"Could not read file: {e}"

def generate_tree(startpath):
    exclude_dirs = {'node_modules', '.git', '.venv', '__pycache__', '.pytest_cache', '.agents', 'chroma_db'}
    exclude_exts = {'.pyc', '.pyo', '.pyd', '.so', '.dll', '.exe', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.sqlite3'}
    
    tree_str = []
    
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        tree_str.append(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if any(f.endswith(ext) for ext in exclude_exts):
                continue
            filepath = os.path.join(root, f)
            docstring = get_docstring(filepath)
            doc_info = f" - {docstring.split(chr(10))[0]}" if docstring and not docstring.startswith("Could not read file") and docstring != "No docstring provided." else ""
            tree_str.append(f"{subindent}{f}{doc_info}")
            
    return '\n'.join(tree_str)

if __name__ == '__main__':
    start_path = r'c:\Dev\New folder'
    tree = generate_tree(start_path)
    with open(os.path.join(start_path, 'project_structure.txt'), 'w', encoding='utf-8') as f:
        f.write(tree)
    print("Project structure saved to project_structure.txt")
