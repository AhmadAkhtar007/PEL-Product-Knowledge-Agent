# Issue #3: Streaming Chat with History Persistence

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Add streaming LLM responses via Server-Sent Events (SSE) with a thinking indicator phase, and persist all chat conversations and messages in PostgreSQL so users can continue previous sessions.

**End-to-end behavior**: A client creates a new conversation via `POST /conversations`. They send a message via `POST /conversations/{id}/query` and receive a streamed response — first a `thinking` event, then token-by-token `content` events, then a `done` event. Both the user's message and the AI's complete response are persisted in the `messages` table. The client can later retrieve all conversations via `GET /conversations` and load a specific conversation's messages via `GET /conversations/{id}/messages`. When continuing a conversation, the last N messages are included as context for the LLM.

Specific deliverables:

1. **Streaming RAG endpoint** (`POST /conversations/{id}/query`):
   - Accepts: `{ query, role, product_id?, model?, image_base64? }`
   - Returns: `text/event-stream` SSE response
   - Event sequence: `event: thinking` → `event: content` (repeated, one per token/chunk) → `event: done` (with full response + escalation info)
   - Persists user message and full AI response in `messages` table
   - Sends last N messages (configurable, default 10) from the conversation as context to the LLM

2. **Conversation CRUD API** (`backend/app/modules/conversations/router.py`):
   - `POST /conversations` — create a new conversation `{ role, title? }`, returns `{ id, title, created_at }`
   - `GET /conversations` — list all conversations, ordered by last updated, returns `[{ id, title, role, message_count, updated_at }]`
   - `GET /conversations/{id}/messages` — get all messages in a conversation, returns `[{ id, role, content, image_url, created_at }]`
   - `DELETE /conversations/{id}` — delete a conversation and its messages

3. **Auto-title generation**: After the first user message, auto-generate a conversation title from the query content (first 50 chars or a summary)

4. **LLM service streaming**: Extend the LLMService wrapper to support Gemini's streaming API (`generate_content` with `stream=True`), yielding tokens as they arrive

5. **Backwards compatibility**: Keep the existing non-streaming `POST /rag/query` endpoint working for clients that don't support SSE

## Acceptance criteria

- [ ] `POST /conversations` creates a new conversation and returns its ID
- [ ] `POST /conversations/{id}/query` returns an SSE stream with `thinking`, `content`, and `done` events
- [ ] User messages and AI responses are persisted in the `messages` table linked to the conversation
- [ ] `GET /conversations` lists conversations ordered by most recently updated
- [ ] `GET /conversations/{id}/messages` returns the full message history for a conversation
- [ ] Continuing a conversation includes previous messages as LLM context
- [ ] The legacy `POST /rag/query` endpoint still works (non-streaming)
- [ ] Tests cover: conversation creation, message persistence, conversation listing, SSE event format

## Blocked by

- [Issue #2: Structured RAG Pipeline + Knowledge Base](./002-structured-rag-pipeline.md)
