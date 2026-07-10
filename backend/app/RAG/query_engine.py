import chromadb
from backend.app.config import settings
from backend.app.RAG.prompts import GENERAL_KNOWLEDGE_PROMPT
from backend.app.services.llm_service import LLMService

class RAGQueryEngine:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        self.collection = self.chroma_client.get_or_create_collection(name="pel_knowledge_base")
        self.llm = LLMService()

    def query(self, query_text: str, role: str = None, product_id: str = None, image_base64: str = None) -> dict:
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
        
        prompt = GENERAL_KNOWLEDGE_PROMPT.format(context=context_text, query=query_text)
            
        llm_response = self.llm.query_gemini_multimodal(prompt, image_base64)

        metadatas = results["metadatas"][0] if (results and "metadatas" in results and results["metadatas"]) else []

        return {
            "response": llm_response,
            "escalate": False,
            "context": context_chunks,
            "metadata": metadatas
        }
