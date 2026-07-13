from dataclasses import dataclass

import chromadb

from backend.app.config import settings

COLLECTION_NAME = "pel_knowledge_base"

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        _collection = _client.get_or_create_collection(COLLECTION_NAME)
    return _collection


@dataclass
class RetrievedChunk:
    parent_id: str
    title: str
    product_category: str
    chunk_type: str
    hazard_level: str
    brief_text: str
    has_detailed: bool


def retrieve(query_embedding: list[float], top_k: int = 6, where_clause: dict = None) -> list[RetrievedChunk]:
    """Run the semantic search, then always resolve each hit back to its
    BRIEF text — even if the hit itself was a `detailed` vector match."""
    collection = _get_collection()

    kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": top_k,
        "include": ["metadatas", "documents"],
    }
    if where_clause:
        kwargs["where"] = where_clause

    raw = collection.query(**kwargs)

    seen_parent_ids: set[str] = set()
    results: list[RetrievedChunk] = []
    
    if not raw["metadatas"] or not raw["metadatas"][0]:
        return results

    metadatas = raw["metadatas"][0]
    documents = raw["documents"][0]

    for metadata, document in zip(metadatas, documents):
        parent_id = metadata["parent_id"]
        if parent_id in seen_parent_ids:
            continue  # a chunk's brief AND detailed vectors both matching — only surface once
        seen_parent_ids.add(parent_id)

        if metadata.get("disclosure") == "brief":
            brief_text = document
        else:
            # The detailed vector matched, but generation should still start
            # with the brief layer — fetch it directly by id.
            brief_result = collection.get(ids=[f"{parent_id}::brief"])
            brief_text = brief_result["documents"][0] if brief_result["documents"] else document

        results.append(RetrievedChunk(
            parent_id=parent_id,
            title=metadata.get("title", ""),
            product_category=metadata.get("product_category", ""),
            chunk_type=metadata.get("chunk_type", ""),
            hazard_level=metadata.get("hazard_level", "none"),
            brief_text=brief_text,
            has_detailed=bool(metadata.get("has_detailed", False)),
        ))

    return results


def get_detailed(parent_id: str) -> str | None:
    """Direct id lookup for the 'tell me more' escalation — no embedding
    search involved, so this can only ever return the SAME chunk's deeper
    content, never a different one the semantic search happens to prefer."""
    collection = _get_collection()
    result = collection.get(ids=[f"{parent_id}::detailed"])
    if result["documents"]:
        return result["documents"][0]
    return None
