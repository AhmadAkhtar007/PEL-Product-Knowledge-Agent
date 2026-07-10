# PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild

---

## Problem Statement

PEL (Pak Elektron Limited) has a working prototype of an AI-powered appliance support system — a FastAPI backend with Gemini-powered RAG, and two React Native mobile apps for customers and technicians. However, the current system has significant gaps that prevent it from being production-ready or presentable to company stakeholders:

1. **The frontend apps are prototype-quality** — functional but not premium. The customer app (773 lines in a single `App.js`) and technician app (336 lines in a single `App.js`) lack the polish, animation quality, and information architecture expected of a professional product.
2. **No way to showcase the system to leadership** — senior stakeholders can't receive APK files, so there is no mechanism to demonstrate the product to decision-makers.
3. **The backend is a flat monolith** — all endpoints in a single `main.py`, raw SQLite with no ORM, no migrations, and no structured module boundaries.
4. **The RAG pipeline is rudimentary** — paragraph-based chunking, default ChromaDB embeddings, no metadata filtering despite the knowledge base having rich structured metadata.
5. **Missing critical features** — no chat history persistence, no ticket lifecycle management, no voice input/output, no appliance registration, no service history tracking.
6. **No containerization** — the system requires manual setup of Python, ChromaDB, and dependencies with no reproducible deployment story.

## Solution

A comprehensive rebuild of the entire PEL Appliance Suite — backend, RAG pipeline, mobile apps, and a new web showcase — that transforms the prototype into a production-grade, premium-feeling product suitable for stakeholder presentations and real-world deployment.

The rebuilt system will:
- Present a **polished, PEL-branded dark-mode UI** across all platforms with micro-animations at Telegram/WhatsApp level quality
- Provide a **web landing page with embedded live demos** inside phone mockup frames, enabling stakeholders to experience the product via any browser
- Run on a **PostgreSQL database** with proper ORM (SQLAlchemy) and migration management (Alembic)
- Leverage **structured JSON knowledge bases** with metadata-rich filtered retrieval using Gemini's `text-embedding-004`
- Support **full multimodal interaction** — text, voice input (STT), voice output (TTS), and image upload
- Stream AI responses with a **thinking indicator** for a modern chat experience
- Be **fully containerized** with Docker Compose for one-command startup

---

## User Stories

### Customer User Stories

1. As a **PEL customer**, I want to see all my registered appliances on a home screen with visual cards showing status indicators, so that I can quickly identify which appliance needs attention.
2. As a **PEL customer**, I want to register a new appliance by scanning a QR code on the device, so that the system automatically knows my exact model and can provide tailored support.
3. As a **PEL customer**, I want to manually register an appliance by selecting its category and model when QR scanning isn't available, so that I'm not blocked from using the system.
4. As a **PEL customer**, I want to tap a floating chat input field at the bottom of the screen to open an AI chat overlay, so that I can quickly ask a troubleshooting question without leaving my appliance view.
5. As a **PEL customer**, I want to see my previous chat conversations listed via a Chat History button in the top left, so that I can continue a previous troubleshooting session.
6. As a **PEL customer**, I want to access my profile and settings via a button in the top right, so that I can manage my preferences and language settings.
7. As a **PEL customer**, I want to upload a photo of my appliance issue (frost buildup, blinking lights, error codes) alongside my text query, so that the AI can diagnose visual problems.
8. As a **PEL customer**, I want to use voice input to describe my appliance problem, so that I can get help without typing — especially useful for older users or those more comfortable speaking.
9. As a **PEL customer**, I want the AI to read its response aloud using text-to-speech, so that I can hear the troubleshooting steps while working on my appliance.
10. As a **PEL customer**, I want the AI to automatically detect whether I'm writing in English, Urdu script, or Roman Urdu and respond in the same language, so that I can communicate naturally.
11. As a **PEL customer**, I want to see the AI's response stream in word-by-word with a thinking indicator, so that the chat feels responsive and modern.
12. As a **PEL customer**, I want the AI to suggest creating a complaint ticket when it cannot resolve my issue, so that I get connected to human support seamlessly.
13. As a **PEL customer**, I want a visible "Talk to a human" button available in the chat at all times, so that I can escalate manually whenever I choose.
14. As a **PEL customer**, I want to submit a complaint/service ticket with my details (name, phone, appliance model, issue description), so that a technician can be dispatched.
15. As a **PEL customer**, I want to view my ticket history and see current status (New → Assigned → In Progress → Resolved → Closed), so that I know the progress of my service request.
16. As a **PEL customer**, I want the chat context to be aware of which appliance I'm asking about (from my registered appliances), so that the AI gives model-specific answers without me repeating details.

### Technician User Stories

17. As a **PEL technician**, I want a dashboard home screen showing key stats (pending tickets, completed today, escalated), so that I can see my workload at a glance.
18. As a **PEL technician**, I want to see a list of recent activity and pending tickets on my dashboard, so that I can prioritize my work.
19. As a **PEL technician**, I want to drill into a diagnostic AI chat that provides fault codes, resistance values, component testing steps, and wiring specs, so that I can diagnose complex issues in the field.
20. As a **PEL technician**, I want to upload photos of circuit boards, compressor labels, or error displays alongside my diagnostic query, so that the AI can analyze visual symptoms.
21. As a **PEL technician**, I want to use voice input for hands-free querying while working on an appliance, so that I can get diagnostic help without putting down my tools.
22. As a **PEL technician**, I want the AI to show expert escalation contacts inline when it can't resolve a diagnostic issue, so that I can immediately call the relevant department head.
23. As a **PEL technician**, I want to view and manage pending repair tickets assigned to me, so that I can plan my service visits.
24. As a **PEL technician**, I want to update a ticket's status (New → Assigned → In Progress → Resolved → Closed) as I work on it, so that customers and the system can track repair progress.
25. As a **PEL technician**, I want an expert directory with one-tap calling, so that I can quickly reach division heads for advice on complex repairs.
26. As a **PEL technician**, I want to view model-specific diagnostic guides with step-by-step procedures, so that I can follow standardized repair workflows.
27. As a **PEL technician**, I want to see the service history of appliances I've worked on, so that I can reference past repairs and identify recurring issues.
28. As a **PEL technician**, I want to take and attach before/after photos during repairs, so that I can document my work for quality assurance.
29. As a **PEL technician**, I want to browse a parts inventory and place orders, so that I can ensure I have the right replacement components.

### Stakeholder / Web User Stories

30. As a **PEL senior manager**, I want to open a web URL and see a polished landing page showcasing the AI support system, so that I can evaluate the product without installing anything.
31. As a **PEL senior manager**, I want to click "Try Customer Demo" and experience the full customer app in a realistic phone mockup frame within my browser, so that I can see exactly what customers would experience.
32. As a **PEL senior manager**, I want to click "Try Technician Demo" and experience the full technician app in a phone mockup frame, so that I can see the diagnostic capabilities.
33. As a **PEL senior manager**, I want the landing page to highlight key features, technology stack, and capabilities with premium visual design, so that the product makes a strong first impression.

### System / Cross-Cutting User Stories

34. As a **developer**, I want to run `docker-compose up` and have the entire backend (FastAPI + PostgreSQL) start automatically, so that setup is reproducible and instant.
35. As a **developer**, I want the knowledge base to be in a unified structured JSON format across all product categories, so that ingestion is consistent and metadata-rich.
36. As a **developer**, I want database migrations managed by Alembic, so that schema changes are versioned and reversible.
37. As a **developer**, I want the backend organized as a modular monolith with clear module boundaries (rag, tickets, users, appliances, experts), so that the codebase is maintainable and navigable.

---

## Implementation Decisions

### Design System & Branding

- **Color palette**: Dark mode base (`#0A0A0A` / `#111111`) with PEL Lochmara Blue (`#007DC5`) as primary accent, Mercury Gray (`#E4E4E4`) for secondary elements, and Black (`#000000`) for deep backgrounds.
- **Customer app personality**: Warmer, friendlier feel — softer corners, approachable language, gentle animations.
- **Technician app personality**: Technical, data-dense feel — tighter spacing, monospace for values, status-indicator-heavy.
- **Animation level**: Micro-animations throughout — screen transitions, chat bubble entrances, button press feedback, loading skeletons, subtle hover/press effects. Target: Telegram/WhatsApp level polish.
- **Product images**: Placeholder silhouettes and colored rectangles for the demo, to be replaced with real product photography later.

### Frontend Architecture

- **Mobile apps**: React Native with Expo (~54.0.0) — two separate apps (`customer-app`, `technician-app`).
- **Web showcase**: Next.js — a polished landing page with feature highlights and two embedded full-screen-takeover live demos rendered inside realistic phone mockup frames.
- **Customer app layout**: Standard AI chatbot pattern — "My Appliances" as the default view with visual appliance cards showing status indicators (active tickets, last serviced). Floating chat input at bottom opens a chat overlay. Chat History button top-left. Profile/Settings button top-right.
- **Technician app layout**: Dashboard-style home screen with stats cards (pending tickets, completed today, escalated count), recent activity feed, then drill-down navigation into: diagnostic chat, ticket management, expert directory, service history, parts inventory.

### Backend Architecture

- **Framework**: FastAPI (Python), rebuilt as a modular monolith.
- **Module structure**: Separate modules for `rag`, `tickets`, `users`, `appliances`, `experts`, `chat_history`, `parts`, each with their own routers, schemas, and service logic.
- **Database**: PostgreSQL, accessed via SQLAlchemy (async) with Alembic for migrations.
- **No authentication**: CORS remains open. No auth middleware. Focus is on features and presentation quality.
- **Streaming**: Server-Sent Events (SSE) for streaming LLM responses token-by-token to the client, with a thinking-indicator phase before tokens start flowing.
- **Containerization**: Docker Compose with two services — `api` (FastAPI + Uvicorn) and `db` (PostgreSQL). Single `docker-compose up` starts everything.

### RAG Pipeline

- **Knowledge base format**: All product data in unified structured JSON with the schema: `{ id, audience, series, model, title, content }`. The existing `.txt` mock manuals for refrigerators and ACs will be converted to this format.
- **Embedding model**: Gemini `text-embedding-004` (replacing ChromaDB's default embeddings).
- **Ingestion**: Parse JSON files, extract each chunk with its full metadata, embed the `content` field, and store in ChromaDB with metadata (`audience`, `series`, `model`, `product_category`).
- **Retrieval**: Metadata-filtered semantic search — filter by `audience` (customer vs technician role), optionally by `model` or `series`, then semantic similarity on the filtered set. Top 3-4 results.
- **Vector database**: ChromaDB with persistent client, collection: `pel_knowledge_base`.
- **LLM**: Gemini 1.5 Flash via `google-genai` SDK. Role-specific prompt templates. Multimodal support (text + base64 images).
- **Escalation detection**: Parse LLM output for `ESCALATE_complaint` / `ESCALATE_expert` tokens, strip them from the displayed response, and trigger escalation UI flows.

### Voice Integration

- **Voice input (STT)**: Use Expo's speech recognition capabilities on the mobile client to transcribe spoken queries into text before sending to the backend.
- **Voice output (TTS)**: Use the device's native TTS engine via `expo-speech` — free, works offline, sufficient for demo. Each AI response message will have a play button to read it aloud.
- **Language support**: TTS engine will be configured to match the detected language of the AI response (English, Urdu).

### Chat History

- **Persistence**: All conversations stored in PostgreSQL with a `conversations` table (id, user_id placeholder, title, created_at, updated_at) and a `messages` table (id, conversation_id, role, content, image_url, created_at).
- **Context window**: The last N messages from the current conversation are sent as context with each new query to the LLM.
- **UI**: Chat History sidebar/drawer showing conversation list with titles and timestamps, matching the ChatGPT/Gemini/Claude pattern.

### Ticket Lifecycle

- **Status workflow**: `New` → `Assigned` → `In Progress` → `Resolved` → `Closed`.
- **Schema change**: Add `status` enum field, `assigned_technician_id`, `resolved_at`, `closed_at`, and `notes` to the tickets table.
- **Technician actions**: Technicians can view assigned tickets, update status, and add resolution notes.
- **Customer view**: Customers see their ticket list with current status and a visual progress indicator.

### Appliance Registration

- **QR scan flow**: Simulated for the demo — the UI shows a camera view with a scan animation and a confirmation screen, but uses mock data (predefined PEL models) since real QR codes aren't available.
- **Manual registration**: Fallback form — pick product category, select model from a list, optionally enter serial number and purchase date.
- **Appliance schema**: `appliances` table with fields: id, user_id (placeholder), product_category, model, serial_number, purchase_date, registered_at, qr_data.

### Database Schema (PostgreSQL)

Key tables in the rebuilt schema:

- `appliances` — registered user appliances (model, serial, category, purchase date)
- `tickets` — service tickets with lifecycle status and assignment
- `experts` — division head contact directory
- `conversations` — chat conversation metadata
- `messages` — individual chat messages within conversations
- `service_history` — records of past repairs linked to appliances
- `parts` — parts inventory catalog

### Incremental Rebuild Strategy

The rebuild will happen in-place in the existing workspace (`c:\Dev\New folder`), modifying existing files and adding new ones. The build order is:

1. **Phase 1 — Backend + RAG**: Restructure FastAPI into modules, migrate to PostgreSQL + SQLAlchemy/Alembic, rebuild RAG pipeline with structured JSON ingestion and Gemini embeddings, add streaming, Docker Compose.
2. **Phase 2 — Mobile Apps**: Rebuild customer app and technician app with premium UI, new navigation patterns, all new features (voice, QR, chat history, ticket lifecycle).
3. **Phase 3 — Web Landing Page**: Next.js showcase site with embedded live demos in phone mockup frames.

---

## Testing Decisions

### Testing Philosophy — Test-Driven Development (Red/Green/Refactor)

All features will be developed using strict TDD:
1. **Red**: Write a failing test that describes the expected behavior.
2. **Green**: Write the minimum code to make the test pass.
3. **Refactor**: Clean up the implementation while keeping tests green.

Tests should verify **external behavior through the API boundary**, not internal implementation details. A good test answers: "If I send this request, do I get this response?" — not "Did this internal function get called?"

### Testing Seam

The primary testing seam is the **FastAPI HTTP API boundary**. All tests interact with the system through HTTP requests and assert on HTTP responses. This is the single highest seam that covers the full stack (routing → service logic → database → RAG → LLM).

The LLM (Gemini) will be mocked at the `LLMService` layer for deterministic test results — the existing mock fallback pattern will be formalized into a proper test fixture.

### Modules Under Test

- **RAG query endpoint** (`POST /rag/query`): Verify correct retrieval filtering by role/model, escalation detection, streaming response format, and multimodal handling.
- **Ticket CRUD** (`POST /tickets`, `GET /tickets`, `PATCH /tickets/{id}`): Verify creation, listing, status transitions (New → Assigned → In Progress → Resolved → Closed), and validation.
- **Appliance registration** (`POST /appliances`, `GET /appliances`): Verify registration, listing, and model validation.
- **Chat history** (`POST /conversations`, `GET /conversations`, `GET /conversations/{id}/messages`): Verify persistence, retrieval, and conversation context.
- **Expert directory** (`GET /experts`): Verify listing and filtering by department.
- **Ingestion** (invoked via script or endpoint): Verify that structured JSON is correctly parsed, embedded, and stored in ChromaDB with metadata.

### Prior Art

The existing test files provide patterns to follow:
- `backend/tests/test_api.py` — ticket endpoint integration tests using `TestClient`
- `backend/tests/test_database.py` — database initialization and schema verification

These will be expanded significantly but the `TestClient` pattern (FastAPI's built-in test client wrapping httpx) will remain the primary testing mechanism.

---

## Out of Scope

The following are explicitly **not** part of this rebuild:

- **User authentication and authorization** — No login, registration, JWT tokens, or role-based access control. The system remains open.
- **Push notifications** — No Expo Push Notifications or Firebase Cloud Messaging infrastructure. Ticket status is checked manually in-app.
- **Real QR code integration** — QR scanning is simulated with mock data. No real PEL QR code format is defined or parsed.
- **Real product photography** — Placeholder images are used. Real PEL product photos to be integrated later.
- **Cloud deployment** — The system runs locally via Docker Compose. No CI/CD pipeline, no cloud hosting, no domain configuration.
- **Payment/billing for parts ordering** — Parts inventory is browse-only. No e-commerce or payment integration.
- **Admin dashboard** — No separate admin interface for managing users, tickets, or system configuration.
- **Analytics and reporting** — No usage tracking, conversation analytics, or management reports.
- **Offline support** — The apps require network connectivity to function.
- **Automated testing of mobile apps** — TDD applies to the backend only. Mobile apps are verified manually.

---

## Further Notes

### PEL Brand Identity

- **Full name**: Pak Elektron Limited
- **Headquarters**: Near Ferozepur Road, Lahore, Pakistan
- **Primary color**: Lochmara Blue — `#007DC5` / RGB(0, 125, 197)
- **Secondary color**: Mercury Gray — `#E4E4E4` / RGB(228, 228, 228)
- **Tertiary**: Black — `#000000`
- **Product lines covered**: Water Dispensers (Desire Glass Door, Sleek Design, Table Top), Refrigerators, Air Conditioners, Washing Machines
- **Marketing tagline (Water Dispensers)**: "Thanda Ya Garam, Bas Aik Button" (Cold or Hot, Just One Button)

### Knowledge Base Data Quality

The water dispenser knowledge base (`pel_water_dispensers_kb.json`) serves as the gold-standard format. It contains 11 pre-chunked entries with rich metadata covering:
- Product overviews (customer-facing)
- Color variant details per model
- Full specification tables (technician-facing)
- Image asset indices for frontend mapping

The refrigerator (`PR-1950_manual.txt`) and AC (`apex-12k_manual.txt`) data are currently mock text files and must be converted to the same JSON schema.

### Existing Codebase State

The rebuild is incremental — existing code will be refactored in-place. Key files that will be significantly modified or replaced:
- `backend/app/main.py` — split into modular routers
- `backend/app/database.py` — replaced with SQLAlchemy models + Alembic
- `backend/app/RAG/query_engine.py` — rebuilt with metadata filtering and Gemini embeddings
- `backend/app/RAG/ingestion.py` — rebuilt for structured JSON ingestion
- `customer-app/App.js` — complete UI rebuild with new navigation architecture
- `technician-app/App.js` — complete UI rebuild with dashboard pattern

### Technology Versions (Target)

| Component | Version |
|-----------|---------|
| Python | 3.11+ |
| FastAPI | ≥0.111.0 |
| SQLAlchemy | ≥2.0 (async) |
| Alembic | latest |
| PostgreSQL | 16 |
| ChromaDB | ≥0.5.0 |
| google-genai | ≥0.1.0 |
| React Native | 0.81.x |
| Expo | ~54.0.0 |
| React | 19.x |
| Next.js | 15.x |
| Docker Compose | v2 |
