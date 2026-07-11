from backend.app.config import settings
from backend.app.modules.rag import ingestion


def test_mock_llm_mode_uses_local_embeddings_when_api_key_is_configured(monkeypatch):
    monkeypatch.setattr(settings, "USE_MOCK_LLM", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "configured-api-key")

    def fail_if_external_client_is_used(*args, **kwargs):
        raise AssertionError("Mock mode must not create a Gemini client for embeddings")

    monkeypatch.setattr(ingestion.genai, "Client", fail_if_external_client_is_used)

    embeddings = ingestion.get_embeddings(["refrigerator not cooling"])

    assert len(embeddings) == 1
    assert len(embeddings[0]) == 768
