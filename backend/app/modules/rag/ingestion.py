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

DOCUMENTS_DIR = "backend/documents"
COLLECTION_NAME = "pel_knowledge_base"


def load_kb_files(documents_dir: str) -> list[str]:
    import glob
    pattern = os.path.join(documents_dir, "*_kb.json")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"No *_kb.json files found in {documents_dir}.")
    return files


def build_vector_entries(kb_file: str) -> list[dict]:
    """Turn one category JSON file into a flat list of {id, text, metadata}
    entries ready for embedding — one entry per disclosure tier per chunk."""
    with open(kb_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    product_category = data.get("product_category", "Unknown")
    source_document = data.get("source_document", os.path.basename(kb_file))
    brand = data.get("brand", "PEL")
    catalog_year = data.get("catalog_year")

    entries = []
    for chunk in data.get("chunks", []):
        chunk_id = chunk["id"]
        base_metadata = {
            "parent_id": chunk_id,
            "chunk_type": chunk.get("chunk_type", "spec"),
            "hazard_level": chunk.get("hazard_level", "none"),
            "series": chunk.get("series", ""),
            "model": chunk.get("model", ""),
            "title": chunk.get("title", ""),
            "product_category": product_category,
            "source_document": source_document,
            "brand": brand,
            "catalog_year": catalog_year if catalog_year is not None else "",
            "has_detailed": bool(chunk.get("content_detailed")),
        }

        brief_text = chunk.get("content_brief", "")
        if brief_text:
            entries.append({
                "id": f"{chunk_id}::brief",
                "text": brief_text,
                "metadata": {**base_metadata, "disclosure": "brief"},
            })

        detailed_text = chunk.get("content_detailed")
        if detailed_text:
            entries.append({
                "id": f"{chunk_id}::detailed",
                "text": detailed_text,
                "metadata": {**base_metadata, "disclosure": "detailed"},
            })

    return entries


def ingest_knowledge_base(documents_dir: str = DOCUMENTS_DIR, reset: bool = True) -> None:
    client = chromadb.PersistentClient(path=settings.CHROMA_PATH)

    if reset:
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"Deleted existing collection '{COLLECTION_NAME}' to reset dimensions.")
        except Exception:
            pass  # collection didn't exist yet — fine on first run

    collection = client.get_or_create_collection(COLLECTION_NAME)

    files = load_kb_files(documents_dir)
    total = 0

    for kb_file in files:
        entries = build_vector_entries(kb_file)
        if not entries:
            print(f"WARNING: no chunks found in {os.path.basename(kb_file)}")
            continue

        ids = [e["id"] for e in entries]
        docs = [e["text"] for e in entries]
        metadatas = [e["metadata"] for e in entries]

        # Process in batches of 50 to avoid hitting API limits
        batch_size = 50
        print(f"Ingesting {len(entries)} vector entries from {os.path.basename(kb_file)}...")
        for i in range(0, len(entries), batch_size):
            batch_ids = ids[i:i+batch_size]
            batch_docs = docs[i:i+batch_size]
            batch_metadatas = metadatas[i:i+batch_size]
            
            embeddings = get_embeddings(batch_docs)

            collection.upsert(
                ids=batch_ids, documents=batch_docs, metadatas=batch_metadatas, embeddings=embeddings
            )
        total += len(entries)

    print(f"\nDone. {total} total vector entries in collection '{COLLECTION_NAME}'.")


def ensure_knowledge_base_ingested():
    """Populate ChromaDB only when the knowledge base collection is empty."""
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    if collection.count() > 0:
        print(f"Knowledge base already contains {collection.count()} chunks.")
        return

    print("Knowledge base is empty. Ingesting source documents...")
    ingest_knowledge_base(reset=False)


if __name__ == "__main__":
    ensure_knowledge_base_ingested()
