import os
import chromadb
from backend.app.config import settings
from pypdf import PdfReader

def ingest_documents():
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(name="pel_knowledge_base")
    
    doc_dir = "backend/documents"
    if not os.path.exists(doc_dir):
        print(f"Error: {doc_dir} directory does not exist.")
        return

    id_counter = 1
    for root, dirs, files in os.walk(doc_dir):
        for file in files:
            file_path = os.path.join(root, file)
            category = os.path.basename(root)
            
            content = ""
            if file.endswith(".txt"):
                product_id = file.replace("_manual.txt", "")
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
            elif file.endswith(".pdf"):
                product_id = file.replace(".pdf", "").replace(" ", "_")
                try:
                    reader = PdfReader(file_path)
                    text_parts = []
                    for page_num, page in enumerate(reader.pages):
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                    content = "\n".join(text_parts)
                except Exception as e:
                    print(f"Error reading PDF {file}: {e}")
                    continue
            else:
                continue

            if not content.strip():
                continue

            # Simple chunking by paragraph/lines
            chunks = [chunk.strip() for chunk in content.split("\n") if len(chunk.strip()) > 10]
            
            for i, chunk in enumerate(chunks):
                metadata = {
                    "category": category,
                    "product_id": product_id,
                    "source": file
                }
                doc_id = f"doc_{category}_{product_id}_{id_counter}"
                
                collection.add(
                    documents=[chunk],
                    metadatas=[metadata],
                    ids=[doc_id]
                )
                id_counter += 1
    print(f"Ingested {id_counter - 1} document chunks into ChromaDB.")

if __name__ == "__main__":
    ingest_documents()
