import chromadb
import re
from typing import Optional, List
from backend.app.config import settings
from backend.app.modules.rag.prompts import CUSTOMER_PROMPT_TEMPLATE, TECHNICIAN_PROMPT_TEMPLATE
from backend.app.modules.rag.ingestion import get_embeddings

class RAGQueryEngine:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        self.collection = self.chroma_client.get_or_create_collection(name="pel_knowledge_base")
        from backend.app.modules.rag.service import LLMService
        self.llm = LLMService()

    def retrieve_context(
        self,
        query_text: str,
        role: str,
        product_id: Optional[str] = None,
        model: Optional[str] = None,
        series: Optional[str] = None,
    ) -> tuple[list[str], list[dict]]:
        """Retrieve matching chunks and metadata from ChromaDB using Hybrid Search (Vector + BM25)."""
        # 1. Build where filter for ChromaDB
        conditions = []
        
        # Audience / Role filter
        if role == "customer":
            conditions.append({"audience": "customer"})
            
        # Model / Product ID filter
        target_model = model or product_id
        if target_model:
            conditions.append({
                "$or": [
                    {"model": target_model},
                    {"model": "all"}
                ]
            })
            
        # Series filter
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
            
        # 2. Retrieve ALL chunks matching metadata to perform RRF
        try:
            all_results = self.collection.get(where=where_clause)
        except Exception:
            all_results = {"documents": [], "metadatas": [], "ids": []}
            
        docs = all_results.get("documents", [])
        metas = all_results.get("metadatas", [])
        ids = all_results.get("ids", [])
        
        if not docs:
            return [], []
            
        # 3. Compute Vector Search (get top 20 to rank)
        query_embeddings = get_embeddings([query_text])
        query_vector = query_embeddings[0]
        
        vector_results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=min(20, len(docs)),
            where=where_clause
        )
        
        vector_ids = vector_results.get("ids", [[]])[0]
        
        # Create Vector Rank map
        vector_rank = {doc_id: rank + 1 for rank, doc_id in enumerate(vector_ids)}
        
        # 4. Compute BM25 Search
        try:
            import re
            from rank_bm25 import BM25Okapi
            
            def tokenize(text):
                return re.sub(r'[^\w\s]', ' ', text.lower()).split()
                
            tokenized_docs = [tokenize(doc) for doc in docs]
            bm25 = BM25Okapi(tokenized_docs)
            tokenized_query = tokenize(query_text)
            bm25_scores = bm25.get_scores(tokenized_query)
            
            # Sort IDs by BM25 score
            bm25_sorted_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
            bm25_rank = {ids[i]: rank + 1 for rank, i in enumerate(bm25_sorted_indices)}
        except ImportError:
            # Fallback if BM25 fails
            bm25_rank = {}

        # 5. Compute Reciprocal Rank Fusion (RRF)
        # RRF Score = 1 / (k + rank), typically k=60
        k = 60
        rrf_scores = {}
        for doc_id in ids:
            v_rank = vector_rank.get(doc_id, 1000) # Penalty if not in top vector results
            b_rank = bm25_rank.get(doc_id, 1000)
            rrf_scores[doc_id] = (1.0 / (k + v_rank)) + (1.0 / (k + b_rank))
            
        # Sort by RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        top_ids = sorted_ids[:4]
        
        # Build final context lists
        final_docs = []
        final_metas = []
        for top_id in top_ids:
            idx = ids.index(top_id)
            final_docs.append(docs[idx])
            final_metas.append(metas[idx])
            
        return final_docs, final_metas

    async def query(
        self,
        query_text: str,
        role: str,
        product_id: Optional[str] = None,
        model: Optional[str] = None,
        series: Optional[str] = None,
        image_base64: Optional[str] = None,
        history: str = ""
    ) -> dict:
        """Query ChromaDB using Hybrid Search, construct role-appropriate prompt, and call Gemini 1.5 Flash."""
        # 1. Retrieve context
        context_chunks, metadatas = self.retrieve_context(
            query_text=query_text,
            role=role,
            product_id=product_id,
            model=model,
            series=series
        )
        
        # 2. Format context
        context_text = "\n---\n".join(context_chunks) if context_chunks else "No manual context found."
        
        # 3. Format prompt templates
        if role == "technician":
            prompt = TECHNICIAN_PROMPT_TEMPLATE.format(context=context_text, query=query_text, history=history)
        else:
            prompt = CUSTOMER_PROMPT_TEMPLATE.format(context=context_text, query=query_text, history=history)
            
        # 4. Query Gemini 1.5 Flash
        llm_response = await self.llm.query_gemini_multimodal(prompt, image_base64)
            
        # 5. Check for escalation signals
        escalate = False
        if re.search(r'ESCALATE_(complaint|expert)', llm_response):
            escalate = True
            # Strip the tokens with optional trailing punctuation
            llm_response = re.sub(r'ESCALATE_(complaint|expert)[^\w]*', '', llm_response).strip()
            if not llm_response:
                llm_response = "I recommend having a technician look at this. Let me escalate this for you."
                
        return {
            "response": llm_response,
            "escalate": escalate,
            "context": context_chunks,
            "metadata": metadatas
        }
