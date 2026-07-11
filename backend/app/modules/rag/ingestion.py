import os
import json
import chromadb
from google import genai
from backend.app.config import settings

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate vector embeddings for a list of texts using text-embedding-004 with fallback."""
    if settings.USE_MOCK_LLM or not settings.GEMINI_API_KEY:
        # Mock embeddings fallback (768 dimensions) for testing/CI without API key
        import hashlib
        embeddings = []
        for text in texts:
            h = hashlib.sha256(text.encode('utf-8')).digest()
            res = []
            for i in range(768):
                val = ((h[i % 32] + i) % 256) / 256.0
                res.append(val)
            embeddings.append(res)
        return embeddings

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # Try text-embedding-004 first
    try:
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=texts
        )
        if hasattr(response, "embeddings") and response.embeddings:
            return [emb.values for emb in response.embeddings]
    except Exception as e:
        print(f"text-embedding-004 failed, falling back to gemini-embedding-001: {e}")
        
    # Fallback to gemini-embedding-001
    try:
        response = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=texts
        )
        if hasattr(response, "embeddings") and response.embeddings:
            return [emb.values for emb in response.embeddings]
    except Exception as e:
        print(f"Fallback to gemini-embedding-001 failed: {e}")
        raise e

def ingest_knowledge_base():
    """Scan backend/documents/ for *_kb.json files, generate embeddings, and upsert to ChromaDB."""
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    
    try:
        chroma_client.delete_collection(name="pel_knowledge_base")
        print("Deleted existing collection 'pel_knowledge_base' to reset dimensions.")
    except Exception:
        pass

    collection = chroma_client.get_or_create_collection(name="pel_knowledge_base")

    doc_dir = "backend/documents"
    if not os.path.exists(doc_dir):
        print(f"Error: {doc_dir} directory does not exist.")
        return

    all_documents = []
    all_metadatas = []
    all_ids = []
    
    for root, dirs, files in os.walk(doc_dir):
        for file in files:
            if file.endswith("_kb.json"):
                file_path = os.path.join(root, file)
                print(f"Processing knowledge base file: {file_path}")
                with open(file_path, "r", encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                    except Exception as e:
                        print(f"Error parsing JSON in {file_path}: {e}")
                        continue
                
                source_doc = data.get("source_document", file)
                product_category = data.get("product_category", "Unknown")
                brand = data.get("brand", "PEL")
                catalog_year = data.get("catalog_year", 2024)
                chunks = data.get("chunks", [])
                
                for chunk in chunks:
                    chunk_id = chunk.get("id")
                    audience = chunk.get("audience", "customer")
                    series = chunk.get("series") or "all"
                    model_val = chunk.get("model")
                    title = chunk.get("title", "")
                    content = chunk.get("content", "")
                    
                    if not content.strip():
                        continue
                        
                    # Split models if multiple models are separated by slash
                    models = []
                    if model_val:
                        if "/" in str(model_val):
                            models = [m.strip() for m in str(model_val).split("/") if m.strip()]
                        else:
                            models = [str(model_val).strip()]
                    else:
                        models = ["all"]
                        
                    for idx, model in enumerate(models):
                        # Create unique ID for each split model chunk
                        unique_id = chunk_id
                        if len(models) > 1:
                            unique_id = f"{chunk_id}_{idx}"
                            
                        metadata = {
                            "source": source_doc,
                            "product_category": product_category,
                            "brand": brand,
                            "catalog_year": catalog_year,
                            "audience": audience,
                            "series": series,
                            "model": model,
                            "title": title
                        }
                        
                        all_documents.append(content)
                        all_metadatas.append(metadata)
                        all_ids.append(unique_id)

    if not all_documents:
        print("No documents found to ingest.")
        return

    print(f"Embedding {len(all_documents)} chunks...")
    batch_size = 50
    all_embeddings = []
    for i in range(0, len(all_documents), batch_size):
        batch_texts = all_documents[i:i+batch_size]
        batch_embs = get_embeddings(batch_texts)
        all_embeddings.extend(batch_embs)

    print(f"Upserting {len(all_documents)} vectors into ChromaDB...")
    for i in range(0, len(all_documents), batch_size):
        end_idx = min(i + batch_size, len(all_documents))
        collection.upsert(
            ids=all_ids[i:end_idx],
            documents=all_documents[i:end_idx],
            embeddings=all_embeddings[i:end_idx],
            metadatas=all_metadatas[i:end_idx]
        )

    print(f"Ingested {len(all_documents)} document chunks into ChromaDB.")

def ensure_knowledge_base_ingested():
    """Populate ChromaDB only when the knowledge base collection is empty."""
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(name="pel_knowledge_base")

    if collection.count() > 0:
        print(f"Knowledge base already contains {collection.count()} chunks.")
        return

    print("Knowledge base is empty. Ingesting source documents...")
    ingest_knowledge_base()

if __name__ == "__main__":
    ensure_knowledge_base_ingested()
