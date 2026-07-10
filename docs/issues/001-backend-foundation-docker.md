# Issue #1: Backend Foundation + Docker Compose

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Set up the foundational backend infrastructure that all other slices depend on. This is a prefactoring slice — no user-facing features, but everything else builds on top of it.

**End-to-end behavior**: Running `docker-compose up` starts a FastAPI application connected to a PostgreSQL database. The API responds to a health check endpoint. The database has all tables created via Alembic migrations with seed data (3 PEL experts). The FastAPI app is restructured from a single `main.py` into a modular monolith with separate routers and modules.

Specific deliverables:

1. **Docker Compose** configuration with two services:
   - `api`: FastAPI + Uvicorn (Python 3.11+), mounting the backend code
   - `db`: PostgreSQL 16, with a persistent volume for data

2. **Modular FastAPI restructure**: Split the current flat `main.py` into:
   - `backend/app/main.py` — app factory, CORS, lifespan events
   - `backend/app/modules/rag/` — router, schemas, service (placeholder)
   - `backend/app/modules/tickets/` — router, schemas, service
   - `backend/app/modules/experts/` — router, schemas, service
   - `backend/app/modules/appliances/` — router, schemas, service (placeholder)
   - `backend/app/modules/conversations/` — router, schemas, service (placeholder)
   - `backend/app/modules/parts/` — router, schemas, service (placeholder)
   - `backend/app/modules/service_history/` — router, schemas, service (placeholder)

3. **SQLAlchemy (async) + Alembic**:
   - Replace raw SQLite with async SQLAlchemy models for PostgreSQL
   - Configure Alembic for migration management
   - Initial migration creating all tables: `appliances`, `tickets`, `experts`, `conversations`, `messages`, `service_history`, `parts`
   - Seed migration for 3 default PEL experts (Refrigerator, AC, Washing Machine division heads)

4. **Database schema** (key tables):
   - `experts`: id, name, role_title, department, phone, email
   - `tickets`: id, customer_name, phone, appliance_model, issue_description, status (enum: new/assigned/in_progress/resolved/closed), assigned_technician_id, notes, resolved_at, closed_at, created_at
   - `appliances`: id, user_id (placeholder), product_category, model, serial_number, purchase_date, registered_at, qr_data
   - `conversations`: id, user_id (placeholder), title, role, created_at, updated_at
   - `messages`: id, conversation_id (FK), role (user/assistant), content, image_url, created_at
   - `service_history`: id, appliance_id (FK), ticket_id (FK), technician_name, description, photos_json, completed_at
   - `parts`: id, name, category, appliance_type, part_number, description, quantity_in_stock, unit_price

5. **Health check endpoint**: `GET /health` returns `{ "status": "ok", "database": "connected" }`

6. **Updated `requirements.txt`**: Add sqlalchemy[asyncio], asyncpg, alembic, remove sqlite-specific deps

7. **Configuration**: Update `backend/app/config.py` to use `DATABASE_URL` (PostgreSQL connection string from environment/docker-compose)

### Design decisions

- **Color palette** (for reference by downstream issues): Dark mode base `#0A0A0A`, PEL Lochmara Blue `#007DC5`, Mercury Gray `#E4E4E4`, Black `#000000`
- **No authentication** — CORS remains `allow_origins=["*"]`
- **Async SQLAlchemy** — use `create_async_engine` and `AsyncSession`
- **Alembic** — configure with async engine, migrations in `backend/alembic/versions/`

## Acceptance criteria

- [ ] `docker-compose up` starts both FastAPI and PostgreSQL containers successfully
- [ ] `GET /health` returns 200 with `{ "status": "ok", "database": "connected" }`
- [ ] Alembic migrations create all 7 tables in PostgreSQL
- [ ] Seed data: 3 experts exist in the `experts` table after migration
- [ ] FastAPI app is structured with separate modules (not all in one file)
- [ ] `GET /experts` returns the 3 seeded experts (existing functionality preserved)
- [ ] All existing tests pass (adapted to PostgreSQL)
- [ ] `docker-compose down` cleanly stops everything; `docker-compose up` restarts without data loss (persistent volume)

## Blocked by

None — can start immediately
