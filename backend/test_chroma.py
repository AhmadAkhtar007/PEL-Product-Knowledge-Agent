import sys
import os
sys.path.insert(0, os.path.abspath(".."))
from backend.app.config import settings
import chromadb

client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
try:
    collection = client.get_collection("pel_knowledge_base")
    data = collection.get()
    metadatas = data['metadatas']
    models = set()
    for m in metadatas:
        if m and 'model' in m:
            models.add(m['model'])
    print("Models in ChromaDB:", models)
except Exception as e:
    print("Error:", e)
