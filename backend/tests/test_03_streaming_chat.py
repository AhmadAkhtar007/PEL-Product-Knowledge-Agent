"""
Issue #3 — Streaming Chat with History Persistence (RED tests)

These tests define the expected behavior for:
  - Conversation CRUD (create, list, get messages, delete)
  - Streaming query via SSE (Server-Sent Events)
  - Message persistence after queries
  - Legacy /rag/query endpoint backward-compatibility

All imports reference the NEW modular structure that doesn't exist yet.
All tests are async and use shared fixtures from conftest.py.
"""
import json
from unittest.mock import AsyncMock, patch

import pytest
import httpx

# ---------------------------------------------------------------------------
# These imports target the NEW modular layout (doesn't exist yet → Red).
# The implementation subagent will create these modules to make tests Green.
# ---------------------------------------------------------------------------
from backend.app.main import app  # FastAPI app (will be restructured)


# ==========================================================================
# Helpers
# ==========================================================================

def parse_sse_events(raw_bytes: bytes) -> list[dict]:
    """Parse raw SSE byte-stream into a list of {'event': ..., 'data': ...} dicts."""
    text = raw_bytes.decode("utf-8")
    events = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        event = {}
        for line in block.split("\n"):
            if line.startswith("event:"):
                event["event"] = line[len("event:"):].strip()
            elif line.startswith("data:"):
                raw_data = line[len("data:"):].strip()
                try:
                    event["data"] = json.loads(raw_data)
                except (json.JSONDecodeError, ValueError):
                    event["data"] = raw_data
        if event:
            events.append(event)
    return events


async def collect_sse_events(response: httpx.Response) -> list[dict]:
    """Read an httpx streaming response and collect all SSE events."""
    chunks = b""
    async for chunk in response.aiter_bytes():
        chunks += chunk
    return parse_sse_events(chunks)


async def create_conversation(client: httpx.AsyncClient, **kwargs) -> dict:
    """Helper: create a conversation and return the JSON body."""
    payload = {"role": "customer", **kwargs}
    resp = await client.post("/conversations", json=payload)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    return resp.json()


async def send_query(
    client: httpx.AsyncClient,
    conversation_id: int,
    query: str = "My fridge is not cooling",
) -> list[dict]:
    """Helper: POST a query to a conversation and return parsed SSE events."""
    async with client.stream(
        "POST",
        f"/conversations/{conversation_id}/query",
        json={"query": query},
    ) as resp:
        assert resp.status_code == 200
        events = await collect_sse_events(resp)
    return events


# ==========================================================================
# CONVERSATION CRUD
# ==========================================================================


@pytest.mark.asyncio
async def test_create_conversation(async_client: httpx.AsyncClient):
    """POST /conversations with {role: 'customer'} returns 201 with id and created_at."""
    resp = await async_client.post("/conversations", json={"role": "customer"})
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_create_conversation_with_title(async_client: httpx.AsyncClient):
    """POST /conversations with a title returns that title in the response."""
    resp = await async_client.post(
        "/conversations",
        json={"role": "customer", "title": "Fridge Issue"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Fridge Issue"


@pytest.mark.asyncio
async def test_create_conversation_requires_role(async_client: httpx.AsyncClient):
    """POST /conversations without role returns 422 (validation error)."""
    resp = await async_client.post("/conversations", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_conversations_empty(async_client: httpx.AsyncClient):
    """GET /conversations when none exist returns an empty list."""
    resp = await async_client.get("/conversations")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_conversations_returns_all(async_client: httpx.AsyncClient):
    """Creating 3 conversations, GET /conversations returns all 3."""
    for _ in range(3):
        await create_conversation(async_client)
    resp = await async_client.get("/conversations")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


@pytest.mark.asyncio
async def test_list_conversations_ordered_by_updated(async_client: httpx.AsyncClient):
    """Most recently updated conversation appears first in the list."""
    conv_a = await create_conversation(async_client, title="First")
    conv_b = await create_conversation(async_client, title="Second")
    conv_c = await create_conversation(async_client, title="Third")

    # Query conv_a to update its updated_at timestamp (making it the most recent)
    await send_query(async_client, conv_a["id"], query="update me")

    resp = await async_client.get("/conversations")
    conversations = resp.json()
    # conv_a was updated last, so it should come first
    assert conversations[0]["id"] == conv_a["id"]


@pytest.mark.asyncio
async def test_get_conversation_messages_empty(async_client: httpx.AsyncClient):
    """GET /conversations/{id}/messages for a new conversation returns empty list."""
    conv = await create_conversation(async_client)
    resp = await async_client.get(f"/conversations/{conv['id']}/messages")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_delete_conversation(async_client: httpx.AsyncClient):
    """DELETE /conversations/{id} returns 200, subsequent GET returns 404."""
    conv = await create_conversation(async_client)
    cid = conv["id"]

    del_resp = await async_client.delete(f"/conversations/{cid}")
    assert del_resp.status_code == 200

    get_resp = await async_client.get(f"/conversations/{cid}/messages")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_conversation_returns_404(
    async_client: httpx.AsyncClient,
):
    """DELETE /conversations/999999 returns 404."""
    resp = await async_client.delete("/conversations/999999")
    assert resp.status_code == 404


# ==========================================================================
# STREAMING QUERY (SSE)
# ==========================================================================


@pytest.mark.asyncio
async def test_conversation_query_returns_event_stream(
    async_client: httpx.AsyncClient,
):
    """POST /conversations/{id}/query returns content-type text/event-stream."""
    conv = await create_conversation(async_client)
    async with async_client.stream(
        "POST",
        f"/conversations/{conv['id']}/query",
        json={"query": "My fridge is not cooling"},
    ) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        # Consume the body so the connection closes cleanly
        async for _ in resp.aiter_bytes():
            pass


@pytest.mark.asyncio
async def test_conversation_query_starts_with_thinking_event(
    async_client: httpx.AsyncClient,
):
    """First SSE event has event type 'thinking'."""
    conv = await create_conversation(async_client)
    events = await send_query(async_client, conv["id"])
    assert len(events) > 0, "Expected at least one SSE event"
    assert events[0]["event"] == "thinking"


@pytest.mark.asyncio
async def test_conversation_query_ends_with_done_event(
    async_client: httpx.AsyncClient,
):
    """Last SSE event has event type 'done'."""
    conv = await create_conversation(async_client)
    events = await send_query(async_client, conv["id"])
    assert len(events) > 0, "Expected at least one SSE event"
    assert events[-1]["event"] == "done"


@pytest.mark.asyncio
async def test_conversation_query_done_event_has_full_response(
    async_client: httpx.AsyncClient,
):
    """'done' event data includes the complete response text."""
    conv = await create_conversation(async_client)
    events = await send_query(async_client, conv["id"])
    done_event = events[-1]
    assert done_event["event"] == "done"
    data = done_event["data"]
    assert isinstance(data, dict), "done event data should be a JSON object"
    assert "response" in data
    assert len(data["response"]) > 0, "Response text should not be empty"


@pytest.mark.asyncio
async def test_conversation_query_done_event_has_escalate_field(
    async_client: httpx.AsyncClient,
):
    """'done' event data includes an escalate boolean."""
    conv = await create_conversation(async_client)
    events = await send_query(async_client, conv["id"])
    done_event = events[-1]
    assert done_event["event"] == "done"
    data = done_event["data"]
    assert "escalate" in data
    assert isinstance(data["escalate"], bool)


# ==========================================================================
# MESSAGE PERSISTENCE
# ==========================================================================


@pytest.mark.asyncio
async def test_query_persists_user_message(async_client: httpx.AsyncClient):
    """After querying, GET /conversations/{id}/messages includes the user message."""
    conv = await create_conversation(async_client)
    await send_query(async_client, conv["id"], query="My fridge is not cooling")

    resp = await async_client.get(f"/conversations/{conv['id']}/messages")
    messages = resp.json()
    user_messages = [m for m in messages if m["role"] == "user"]
    assert len(user_messages) >= 1
    assert user_messages[0]["content"] == "My fridge is not cooling"


@pytest.mark.asyncio
async def test_query_persists_assistant_response(async_client: httpx.AsyncClient):
    """After querying, GET /conversations/{id}/messages includes the assistant response."""
    conv = await create_conversation(async_client)
    await send_query(async_client, conv["id"], query="My fridge is not cooling")

    resp = await async_client.get(f"/conversations/{conv['id']}/messages")
    messages = resp.json()
    assistant_messages = [m for m in messages if m["role"] == "assistant"]
    assert len(assistant_messages) >= 1
    assert len(assistant_messages[0]["content"]) > 0


@pytest.mark.asyncio
async def test_messages_have_correct_roles(async_client: httpx.AsyncClient):
    """User message has role='user', assistant message has role='assistant'."""
    conv = await create_conversation(async_client)
    await send_query(async_client, conv["id"])

    resp = await async_client.get(f"/conversations/{conv['id']}/messages")
    messages = resp.json()
    assert len(messages) >= 2

    # First message should be the user's
    assert messages[0]["role"] == "user"
    # Second message should be the assistant's
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_messages_ordered_by_created_at(async_client: httpx.AsyncClient):
    """Messages come back in chronological order."""
    conv = await create_conversation(async_client)
    await send_query(async_client, conv["id"], query="First question")
    await send_query(async_client, conv["id"], query="Second question")

    resp = await async_client.get(f"/conversations/{conv['id']}/messages")
    messages = resp.json()
    timestamps = [m["created_at"] for m in messages]
    assert timestamps == sorted(timestamps), "Messages should be in chronological order"


@pytest.mark.asyncio
async def test_multiple_queries_build_conversation(async_client: httpx.AsyncClient):
    """Sending 3 queries results in 6 messages (3 user + 3 assistant)."""
    conv = await create_conversation(async_client)
    await send_query(async_client, conv["id"], query="Question one")
    await send_query(async_client, conv["id"], query="Question two")
    await send_query(async_client, conv["id"], query="Question three")

    resp = await async_client.get(f"/conversations/{conv['id']}/messages")
    messages = resp.json()
    assert len(messages) == 6

    user_msgs = [m for m in messages if m["role"] == "user"]
    assistant_msgs = [m for m in messages if m["role"] == "assistant"]
    assert len(user_msgs) == 3
    assert len(assistant_msgs) == 3


# ==========================================================================
# LEGACY ENDPOINT
# ==========================================================================


@pytest.mark.asyncio
async def test_legacy_rag_query_still_works(async_client: httpx.AsyncClient):
    """POST /rag/query (non-streaming) still returns a JSON response with expected fields."""
    resp = await async_client.post(
        "/rag/query",
        json={
            "query": "How do I defrost my refrigerator?",
            "role": "customer",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "response" in body
    assert "escalate" in body


@pytest.mark.asyncio
async def test_llm_service_error_fallback(async_client: httpx.AsyncClient):
    """When LLM service throws an exception, it yields a graceful error message, not a test message."""
    conv = await create_conversation(async_client)
    
    # We patch the actual client used in LLMService
    with patch("backend.app.services.llm_service.genai.Client") as mock_client:
        mock_instance = mock_client.return_value
        # Ensure client check passes
        # Make the async generator raise an exception
        async def mock_generate_stream(*args, **kwargs):
            raise Exception("API Error")
            yield "never"
        
        mock_instance.aio.models.generate_content_stream = mock_generate_stream
        
        with patch("backend.app.modules.rag.query_engine.get_embeddings", return_value=[[0.1]*3072]):
            events = await send_query(async_client, conv["id"])
            done_event = events[-1]
            assert done_event["event"] == "done"
            response_text = done_event["data"]["response"]
            
            assert "technical difficulties" in response_text.lower()
            assert "test response" not in response_text.lower()


@pytest.mark.asyncio
async def test_chat_history_is_structured_separately(async_client: httpx.AsyncClient):
    """Chat history should be outside of the retrieved_context and placed in <conversation_history>."""
    conv = await create_conversation(async_client)
    
    # Send first query to build history
    with patch("backend.app.modules.rag.query_engine.get_embeddings", return_value=[[0.1]*3072]):
        with patch("backend.app.services.llm_service.genai.Client") as mock_client:
            mock_instance = mock_client.return_value
            
            class MockResponse1:
                async def __aiter__(self):
                    yield type('obj', (object,), {'text': 'I am an AI'})()
                    
            async def mock_gen1(*args, **kwargs):
                return MockResponse1()
                
            mock_instance.aio.models.generate_content_stream = mock_gen1
            
            await send_query(async_client, conv["id"], query="First message")
            
            # Send second query to trigger history inclusion
            captured_prompt = None
            
            class MockResponse2:
                async def __aiter__(self):
                    yield type('obj', (object,), {'text': 'Second response'})()
                    
            async def mock_gen2(model, contents, **kwargs):
                nonlocal captured_prompt
                captured_prompt = contents[0]
                return MockResponse2()
                
            mock_instance.aio.models.generate_content_stream = mock_gen2
            
            await send_query(async_client, conv["id"], query="Second message")
            
            assert captured_prompt is not None
            assert "<conversation_history>" in captured_prompt
            assert "<retrieved_context>\nChat History:" not in captured_prompt


@pytest.mark.asyncio
async def test_escalation_preserves_conversational_text(async_client: httpx.AsyncClient):
    """When the LLM outputs conversational text before the escalation token, it should be preserved."""
    conv = await create_conversation(async_client)
    
    with patch("backend.app.modules.rag.query_engine.get_embeddings", return_value=[[0.1]*3072]):
        with patch("backend.app.services.llm_service.genai.Client") as mock_client:
            mock_instance = mock_client.return_value
            
            class MockResponse:
                async def __aiter__(self):
                    yield type('obj', (object,), {'text': 'I recommend having a technician look at this. ESCALATE_complaint'})()
                    
            async def mock_gen(*args, **kwargs):
                return MockResponse()
                
            mock_instance.aio.models.generate_content_stream = mock_gen
            
            events = await send_query(async_client, conv["id"])
            done_event = events[-1]
            assert done_event["event"] == "done"
            data = done_event["data"]
            
            assert data["escalate"] is True
            assert "I recommend having a technician look at this." in data["response"]
            assert "ESCALATE_complaint" not in data["response"]

