import chromadb
import re
from typing import Optional, List
from backend.app.config import settings
from backend.app.modules.rag.prompts import GENERAL_PROMPT_TEMPLATE
from backend.app.modules.rag.ingestion import get_embeddings
from backend.app.modules.rag.retrieval import retrieve, RetrievedChunk

class RAGQueryEngine:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        self.collection = self.chroma_client.get_or_create_collection(name="pel_knowledge_base")
        from backend.app.modules.rag.service import LLMService
        self.llm = LLMService()

    def retrieve_context(
        self,
        query_text: str,
        product_id: Optional[str] = None,
        model: Optional[str] = None,
        series: Optional[str] = None,
        **kwargs
    ) -> tuple[list[str], list[dict]]:
        """Retrieve matching chunks and metadata using the new brief/detailed logic with BM25 fallback."""
        
        # 1. Build where filter for ChromaDB
        conditions = []
        
        target_model = model or product_id
        if target_model:
            conditions.append({
                "$or": [
                    {"model": target_model},
                    {"model": "all"}
                ]
            })
            
        if series:
            conditions.append({
                "$or": [
                    {"series": series},
                    {"series": "all"}
                ]
            })
            
        where_clause = None
        if len(conditions) > 1:
            where_clause = {"$and": conditions}
        elif len(conditions) == 1:
            where_clause = conditions[0]
            
        # Try semantic search using the new retrieval helper
        try:
            query_embeddings = get_embeddings([query_text])
            query_vector = query_embeddings[0]
            results: list[RetrievedChunk] = retrieve(query_vector, top_k=4, where_clause=where_clause)
            
            final_docs = [r.brief_text for r in results]
            final_metas = [{
                "parent_id": r.parent_id,
                "title": r.title,
                "product_category": r.product_category,
                "chunk_type": r.chunk_type,
                "hazard_level": r.hazard_level,
                "has_detailed": r.has_detailed
            } for r in results]
            
            return final_docs, final_metas
            
        except Exception as exc:
            print(f"Vector retrieval failed; falling back to BM25-only retrieval: {exc}")
            
        # Fallback to BM25-only retrieval (for tests and offline mode)
        try:
            all_results = self.collection.get(where=where_clause)
        except Exception:
            return [], []
            
        docs = all_results.get("documents", [])
        metas = all_results.get("metadatas", [])
        
        if not docs:
            return [], []
            
        try:
            import re
            from rank_bm25 import BM25Okapi
            
            def tokenize(text):
                return re.sub(r'[^\w\s]', ' ', text.lower()).split()
                
            tokenized_docs = [tokenize(doc) for doc in docs]
            bm25 = BM25Okapi(tokenized_docs)
            tokenized_query = tokenize(query_text)
            bm25_scores = bm25.get_scores(tokenized_query)
            
            # Sort by BM25 score
            bm25_sorted_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
            top_indices = bm25_sorted_indices[:4]
            
            # Deduplicate by parent_id and fetch brief version if we hit a detailed one
            seen_parent_ids = set()
            final_docs = []
            final_metas = []
            
            for idx in top_indices:
                meta = metas[idx]
                parent_id = meta.get("parent_id")
                
                # If chunk is from old schema, it might not have parent_id
                if not parent_id:
                    final_docs.append(docs[idx])
                    final_metas.append(meta)
                    continue
                    
                if parent_id in seen_parent_ids:
                    continue
                seen_parent_ids.add(parent_id)
                
                if meta.get("disclosure") == "brief":
                    brief_text = docs[idx]
                else:
                    # Fetch brief
                    brief_result = self.collection.get(ids=[f"{parent_id}::brief"])
                    brief_text = brief_result["documents"][0] if brief_result["documents"] else docs[idx]
                
                final_docs.append(brief_text)
                final_metas.append({
                    "parent_id": parent_id,
                    "title": meta.get("title", ""),
                    "product_category": meta.get("product_category", ""),
                    "chunk_type": meta.get("chunk_type", ""),
                    "hazard_level": meta.get("hazard_level", "none"),
                    "has_detailed": bool(meta.get("has_detailed", False))
                })
                
            return final_docs, final_metas
            
        except ImportError:
            return [], []

    async def query(
        self,
        query_text: str,
        product_id: Optional[str] = None,
        model: Optional[str] = None,
        series: Optional[str] = None,
        image_base64: Optional[str] = None,
        history: str = "",
        **kwargs
    ) -> dict:
        """Query ChromaDB using Hybrid Search, construct role-appropriate prompt, and call Gemini 1.5 Flash."""
        # 1. Retrieve context
        context_chunks, metadatas = self.retrieve_context(
            query_text=query_text,
            product_id=product_id,
            model=model,
            series=series,
            **kwargs
        )
        
        # 2. Format context
        context_text = "\n---\n".join(context_chunks) if context_chunks else "No manual context found."
        
        # 3. Format prompt templates
        prompt = GENERAL_PROMPT_TEMPLATE.format(context=context_text, query=query_text, history=history)
            
        # 4. Query Gemini 1.5 Flash
        llm_response = await self.llm.query_gemini_multimodal(prompt, image_base64)
            
        # 5. Check for escalation signals
        escalate = False
        if re.search(r'\[ESCALATE:.*?\]', llm_response):
            escalate = True
            # Remove the trigger phrase from the final response
            llm_response = re.sub(r'\[ESCALATE:.*?\][^\w]*', '', llm_response).strip()
            if not llm_response:
                llm_response = "I recommend having a technician look at this. Let me escalate this for you."
                
        return {
            "response": llm_response,
            "escalate": escalate,
            "context": context_chunks,
            "metadata": metadatas
        }
