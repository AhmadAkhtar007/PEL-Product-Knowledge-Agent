# Issue #2: Structured RAG Pipeline + Knowledge Base

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Rebuild the RAG pipeline to use structured JSON knowledge bases with metadata-rich filtered retrieval and Gemini's text-embedding-004 model. Convert all existing product manuals to the unified JSON format.

**End-to-end behavior**: A developer runs an ingestion script that reads structured JSON knowledge base files, embeds each chunk using Gemini text-embedding-004, and stores them in ChromaDB with full metadata. When a customer or technician sends a query via `POST /rag/query`, the system filters ChromaDB by role (audience) and optionally by model/series, retrieves the top 3-4 semantically similar chunks, builds a role-appropriate prompt, and gets a response from Gemini 1.5 Flash. The response is role-appropriate: customers get safe, simplified advice; technicians get fault codes, resistance values, and component specs.

Specific deliverables:

1. **Knowledge base JSON conversion**:
   - Use `pel_water_dispensers_kb.json` as the gold-standard format (schema: `{ id, audience, series, model, title, content }`)
   - Convert `refrigerators/PR-1950_manual.txt` to `refrigerators/pel_refrigerators_kb.json`
   - Convert `air_conditioners/apex-12k_manual.txt` to `air_conditioners/pel_air_conditioners_kb.json`
   - Each JSON file wraps chunks in: `{ source_document, product_category, brand, catalog_year, chunks: [...] }`

2. **Rebuilt ingestion pipeline** (`backend/app/modules/rag/ingestion.py`):
   - Scan `backend/documents/` for `*_kb.json` files
   - Parse each chunk, extract metadata: `audience`, `series`, `model`, `product_category`, `title`
   - Embed the `content` field using Gemini `text-embedding-004` via the google-genai SDK
   - Upsert into ChromaDB with full metadata attached to each vector
   - Runnable as a CLI script: `python -m backend.app.modules.rag.ingestion`

3. **Rebuilt query engine** (`backend/app/modules/rag/query_engine.py`):
   - Accept: query text, role, optional product_id/model/series, optional image_base64
   - Filter ChromaDB by `audience` matching role (customer → audience=customer chunks; technician → all chunks)
   - Optionally filter by `model` or `series` if provided
   - Retrieve top 3-4 results by semantic similarity
   - Build prompt using role-specific template with retrieved context
   - Send to Gemini 1.5 Flash (with image if provided) for generation
   - Parse for escalation tokens (`ESCALATE_complaint`, `ESCALATE_expert`), strip from response

4. **Updated prompt templates** (`backend/app/modules/rag/prompts.py`):
   - Customer prompt: safety-focused, simplified language, no high-voltage/wiring details, auto-detect and respond in user's language (English/Urdu/Roman Urdu)
   - Technician prompt: detailed diagnostics, fault codes, resistance values, component testing steps, wiring specs, auto-detect language
   - Both templates include escalation instructions

5. **RAG query endpoint** (`POST /rag/query`):
   - Request: `{ query, role, product_id?, model?, series?, image_base64? }`
   - Response: `{ response, escalate, expert_contacts? }`
   - Wired through the modular router at `backend/app/modules/rag/router.py`

6. **LLM service** remains as a wrapper around google-genai with mock fallback for testing

## Acceptance criteria

- [ ] All 3 product categories have structured JSON knowledge base files in the unified schema
- [ ] Ingestion script successfully embeds all chunks using Gemini text-embedding-004 and stores them in ChromaDB with metadata
- [ ] `POST /rag/query` with `role=customer` returns only customer-appropriate advice (no fault codes or wiring details)
- [ ] `POST /rag/query` with `role=technician` returns detailed technical diagnostics including fault codes and spec values
- [ ] Filtering by `model` (e.g., `PWD-425`) returns only chunks relevant to that model
- [ ] Escalation tokens are correctly detected and stripped from responses
- [ ] Multilingual: querying in Roman Urdu returns a response in Roman Urdu
- [ ] Tests cover: retrieval filtering by role, retrieval filtering by model, escalation detection, prompt template selection

## Blocked by

- [Issue #1: Backend Foundation + Docker Compose](./001-backend-foundation-docker.md)
