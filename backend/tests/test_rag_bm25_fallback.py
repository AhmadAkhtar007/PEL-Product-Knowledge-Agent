from backend.app.modules.rag import query_engine
from backend.app.modules.rag.query_engine import RAGQueryEngine


class FakeCollection:
    def get(self, where=None):
        return {
            "documents": [
                "If a refrigerator is not cooling, check that air vents are not blocked.",
                "Microwave oven buttons should be cleaned with a dry cloth.",
            ],
            "metadatas": [
                {"source": "refrigerators", "audience": "customer"},
                {"source": "microwave_ovens", "audience": "customer"},
            ],
            "ids": ["refrigerator-cooling", "microwave-buttons"],
        }

    def query(self, *args, **kwargs):
        raise AssertionError("Vector query should not run when embeddings fail")


def test_retrieve_context_falls_back_to_bm25_when_embeddings_fail(monkeypatch):
    engine = object.__new__(RAGQueryEngine)
    engine.collection = FakeCollection()

    def fail_embeddings(texts):
        raise RuntimeError("embedding service unavailable")

    monkeypatch.setattr(query_engine, "get_embeddings", fail_embeddings)

    docs, metadatas = engine.retrieve_context(
        query_text="refrigerator not cooling vents",
        role="customer",
    )

    assert docs[0] == "If a refrigerator is not cooling, check that air vents are not blocked."
    assert metadatas[0] == {"source": "refrigerators", "audience": "customer"}
