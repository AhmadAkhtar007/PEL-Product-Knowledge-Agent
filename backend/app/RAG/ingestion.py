import os
import json
import chromadb
from backend.app.config import settings

def ingest_documents():
    print(f"Connecting to ChromaDB at {settings.CHROMA_PATH}...")
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    
    # Delete the old collection to ensure a clean slate and purge old TXT/PDF noise
    try:
        chroma_client.delete_collection("pel_knowledge_base")
        print("Deleted old pel_knowledge_base collection to ensure a clean slate.")
    except Exception:
        pass
        
    collection = chroma_client.get_or_create_collection(name="pel_knowledge_base")
    
    doc_dir = "backend/documents"
    if not os.path.exists(doc_dir):
        print(f"Error: {doc_dir} directory does not exist.")
        return

    id_counter = 1
    total_files = 0
    
    for root, dirs, files in os.walk(doc_dir):
        for file in files:
            if not file.endswith(".json"):
                continue
                
            total_files += 1
            file_path = os.path.join(root, file)
            print(f"Processing JSON file: {file_path}")
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # The JSON files usually have a single root key holding the data
                for root_key, root_data in data.items():
                    if not isinstance(root_data, dict):
                        continue
                        
                    # Extract global metadata from the root if it exists
                    global_product_category = root_data.get("product_category", "Unknown")
                    global_brand = root_data.get("brand", "PEL")
                    global_year = str(root_data.get("catalog_year", ""))
                    
                    chunks = root_data.get("chunks", [])
                    
                    for chunk in chunks:
                        content = chunk.get("content", "").strip()
                        if not content:
                            continue
                            
                        title = chunk.get("title", "")
                        
                        # Create a highly semantic document string
                        doc_string = f"Title: {title}\n\nContent: {content}"
                        
                        # Build rich metadata
                        metadata = {
                            "product_category": global_product_category,
                            "brand": global_brand,
                            "catalog_year": global_year,
                            "source_file": file,
                            "audience": chunk.get("audience", "general"),
                            "series": chunk.get("series", "all"),
                            "model": chunk.get("model", "all")
                        }
                        
                        # Ensure doc_id is unique
                        doc_id = chunk.get("id", f"doc_{id_counter}")
                        # If the id is duplicated in the JSON for some reason, append a counter
                        doc_id = f"{doc_id}_{id_counter}"
                        
                        collection.add(
                            documents=[doc_string],
                            metadatas=[metadata],
                            ids=[doc_id]
                        )
                        id_counter += 1
            except Exception as e:
                print(f"Failed to process {file_path}: {e}")

    print(f"Successfully ingested {id_counter - 1} semantic chunks from {total_files} JSON files into ChromaDB.")

if __name__ == "__main__":
    ingest_documents()
