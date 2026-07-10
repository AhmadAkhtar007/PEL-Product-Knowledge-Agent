"""
Test suite for Issue #2: Structured RAG Pipeline + Knowledge Base.

Tests the RAG query endpoint, escalation detection, and multilingual support.
All tests target the NEW modular structure — they FAIL (Red) until implementation.

Imports reference:
  - backend.app.modules.rag.service.RAGQueryEngine
  - backend.app.modules.rag.ingestion.ingest_knowledge_base
"""
import pytest
from unittest.mock import AsyncMock, patch

# Imports from the NEW modular structure (doesn't exist yet = Red)
from backend.app.modules.rag.service import RAGQueryEngine
from backend.app.modules.rag.ingestion import ingest_knowledge_base


# ---------------------------------------------------------------------------
# RAG Query Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rag_query_requires_query_field(client, mock_llm_service):
    """POST /rag/query without 'query' field returns 422 Unprocessable Entity."""
    response = await client.post("/rag/query", json={"role": "customer"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_rag_query_requires_valid_role(client, mock_llm_service):
    """POST /rag/query with an invalid role returns 400 Bad Request."""
    response = await client.post(
        "/rag/query",
        json={"query": "My fridge is not cooling", "role": "invalid"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_rag_query_customer_returns_response(client, mock_llm_service):
    """POST /rag/query with role=customer returns a JSON body containing 'response'."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Clean the condenser coils and check the thermostat."
    )

    response = await client.post(
        "/rag/query",
        json={"query": "My fridge is not cooling", "role": "customer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0


@pytest.mark.asyncio
async def test_rag_query_technician_returns_response(client, mock_llm_service):
    """POST /rag/query with role=technician returns a JSON body containing 'response'."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Check compressor relay — expected resistance 4.7 ohms."
    )

    response = await client.post(
        "/rag/query",
        json={"query": "Compressor not starting on PR-1950", "role": "technician"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0


@pytest.mark.asyncio
async def test_rag_query_response_includes_escalate_field(client, mock_llm_service):
    """Every /rag/query response must contain a boolean 'escalate' field."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Try resetting the thermostat."
    )

    response = await client.post(
        "/rag/query",
        json={"query": "Temperature is too high", "role": "customer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "escalate" in data
    assert isinstance(data["escalate"], bool)


@pytest.mark.asyncio
async def test_rag_query_accepts_optional_model_filter(client, mock_llm_service):
    """POST /rag/query with model='PWD-425' does not error."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="The PWD-425 washing machine drain pump is located at the bottom."
    )

    response = await client.post(
        "/rag/query",
        json={
            "query": "Where is the drain pump?",
            "role": "technician",
            "model": "PWD-425",
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_rag_query_accepts_optional_series_filter(client, mock_llm_service):
    """POST /rag/query with series='Desire Glass Door Series' does not error."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="The Desire Glass Door Series uses R-600a refrigerant."
    )

    response = await client.post(
        "/rag/query",
        json={
            "query": "What refrigerant does this fridge use?",
            "role": "technician",
            "series": "Desire Glass Door Series",
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_rag_query_accepts_optional_image(client, mock_llm_service):
    """POST /rag/query with an image_base64 field does not error."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="The display shows error code E5 — faulty temperature sensor."
    )

    # Minimal valid base64-encoded 1×1 white JPEG
    tiny_jpeg_b64 = (
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS"
        "Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ"
        "CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy"
        "MjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEA"
        "AAAAAAAAAAECAwQFBgcICQoL/8QAFRABAQAAAAAAAAAAAAAAAAAAAAn/xAAUAQEAAAAA"
        "AAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q=="
    )

    response = await client.post(
        "/rag/query",
        json={
            "query": "What does this error code mean?",
            "role": "technician",
            "image_base64": tiny_jpeg_b64,
        },
    )
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Escalation Detection
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_escalation_detected_when_llm_includes_escalate_complaint(
    client, mock_llm_service
):
    """When the LLM response contains 'ESCALATE_complaint', escalate must be True."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="I cannot resolve this issue. ESCALATE_complaint"
    )

    response = await client.post(
        "/rag/query",
        json={"query": "My fridge caught fire!", "role": "customer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["escalate"] is True


@pytest.mark.asyncio
async def test_escalation_detected_when_llm_includes_escalate_expert(
    client, mock_llm_service
):
    """When the LLM response contains 'ESCALATE_expert', escalate must be True."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="This requires factory calibration. ESCALATE_expert"
    )

    response = await client.post(
        "/rag/query",
        json={
            "query": "Inverter board failure on PR-2550",
            "role": "technician",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["escalate"] is True


@pytest.mark.asyncio
async def test_escalation_token_stripped_from_response(client, mock_llm_service):
    """The ESCALATE_ tokens must NOT appear in the returned response text."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Issue needs factory attention. ESCALATE_expert"
    )

    response = await client.post(
        "/rag/query",
        json={"query": "Board-level repair needed", "role": "technician"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "ESCALATE_expert" not in data["response"]
    assert "ESCALATE_complaint" not in data["response"]


@pytest.mark.asyncio
async def test_no_escalation_for_normal_response(client, mock_llm_service):
    """A normal LLM response without ESCALATE_ tokens → escalate=False."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Set the thermostat to 3 and wait 24 hours."
    )

    response = await client.post(
        "/rag/query",
        json={"query": "Fridge not cold enough", "role": "customer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["escalate"] is False


@pytest.mark.asyncio
async def test_technician_escalation_includes_expert_contacts(
    client, db_session, mock_llm_service
):
    """When role=technician and escalate=True, response must include expert_contacts array."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Cannot diagnose remotely. ESCALATE_expert"
    )

    response = await client.post(
        "/rag/query",
        json={
            "query": "Sealed system leak on PRGD-2200",
            "role": "technician",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["escalate"] is True
    assert "expert_contacts" in data
    assert isinstance(data["expert_contacts"], list)


# ---------------------------------------------------------------------------
# Multilingual
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rag_query_accepts_roman_urdu(client, mock_llm_service):
    """A query in Roman Urdu returns 200 — the API accepts any language."""
    mock_llm_service.query_gemini_multimodal = AsyncMock(
        return_value="Thermostat ko 3 pe set karein aur 24 ghante wait karein."
    )

    response = await client.post(
        "/rag/query",
        json={
            "query": "mera fridge thanda nahi ho raha",
            "role": "customer",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0
