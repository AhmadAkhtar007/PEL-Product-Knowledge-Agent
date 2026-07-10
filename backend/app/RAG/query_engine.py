import chromadb
from backend.app.config import settings
from backend.app.RAG.prompts import CUSTOMER_PROMPT_TEMPLATE, TECHNICIAN_PROMPT_TEMPLATE
from backend.app.services.llm_service import LLMService

class RAGQueryEngine:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        self.collection = self.chroma_client.get_or_create_collection(name="pel_knowledge_base")
        self.llm = LLMService()

    def query(self, query_text: str, role: str, product_id: str = None, image_base64: str = None) -> dict:
        # ChromaDB retrieve
        filter_meta = {}
        if product_id:
            filter_meta["product_id"] = product_id
            
        results = self.collection.query(
            query_texts=[query_text],
            n_results=3,
            where=filter_meta if filter_meta else None
        )
        
        context_chunks = results["documents"][0] if (results and "documents" in results and results["documents"]) else []
        context_text = "\n---\n".join(context_chunks) if context_chunks else "No manual context found."
        
        # Choose prompt template
        if role == "technician":
            prompt = TECHNICIAN_PROMPT_TEMPLATE.format(context=context_text, query=query_text)
        else:
            prompt = CUSTOMER_PROMPT_TEMPLATE.format(context=context_text, query=query_text)
            
        llm_response = self.llm.query_gemini_multimodal(prompt, image_base64)
        
        escalate = False
        if "ESCALATE_complaint" in llm_response or "ESCALATE_expert" in llm_response:
            escalate = True
            # Clean prompt escalation token from response
            llm_response = llm_response.replace("ESCALATE_complaint", "").replace("ESCALATE_expert", "").strip()
            if not llm_response:
                llm_response = "I cannot resolve this issue using the manuals. Let's get this escalated."

        metadatas = results["metadatas"][0] if (results and "metadatas" in results and results["metadatas"]) else []

        return {
            "response": llm_response,
            "escalate": escalate,
            "context": context_chunks,
            "metadata": metadatas
        }
