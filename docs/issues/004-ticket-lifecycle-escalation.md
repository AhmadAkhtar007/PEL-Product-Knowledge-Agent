# Issue #4: Ticket Lifecycle + Escalation

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Rebuild the ticket system with a full status lifecycle, wire it to the escalation detection from the RAG pipeline, and enhance the expert directory API.

**End-to-end behavior**: When the AI detects it cannot resolve an issue, it outputs an escalation token. The API response includes `escalate: true`. For customers, the client can then auto-create a ticket via `POST /tickets`. For technicians, the response includes expert contacts. Technicians view their assigned tickets, update status through the lifecycle (New → Assigned → In Progress → Resolved → Closed), and add resolution notes. Customers can view their ticket history with a visual status progression.

Specific deliverables:

1. **Ticket CRUD with lifecycle** (`backend/app/modules/tickets/router.py`):
   - `POST /tickets` — create ticket: `{ customer_name, phone, appliance_model, issue_description, appliance_id? }`, auto-sets status to `new`
   - `GET /tickets` — list tickets with optional filters: `?status=new&role=customer` or `?status=assigned&role=technician`
   - `GET /tickets/{id}` — get single ticket with full details
   - `PATCH /tickets/{id}` — update ticket: `{ status?, assigned_technician_id?, notes? }`
     - Validates status transitions: new → assigned → in_progress → resolved → closed (no skipping or going backwards)
     - Auto-sets `resolved_at` when status changes to `resolved`
     - Auto-sets `closed_at` when status changes to `closed`
   - `DELETE /tickets/{id}` — soft delete or cancel a ticket

2. **Status transition validation**: The ticket status follows a strict state machine:
   ```
   new → assigned → in_progress → resolved → closed
   ```
   Invalid transitions (e.g., `new → resolved`) return a 400 error with a clear message.

3. **Expert directory** (`backend/app/modules/experts/router.py`):
   - `GET /experts` — list all experts
   - `GET /experts?department=Refrigerator` — filter by department
   - Expert data: name, role_title, department, phone, email

4. **Escalation integration**: The RAG query response already includes `escalate: boolean`. When `escalate=true` and `role=technician`, the response includes `expert_contacts` filtered by relevant department (matched from the product category in the query).

5. **Seed data**: 3 experts pre-seeded via Alembic migration:
   - Refrigerator Division Head
   - AC Division Head
   - Washing Machine Division Head

## Acceptance criteria

- [ ] `POST /tickets` creates a ticket with status `new` and returns the ticket ID
- [ ] `GET /tickets` lists tickets, filterable by status
- [ ] `PATCH /tickets/{id}` updates status following the valid state machine transitions
- [ ] Invalid status transitions return 400 with an error message
- [ ] `resolved_at` is auto-set when status changes to `resolved`
- [ ] `closed_at` is auto-set when status changes to `closed`
- [ ] `GET /experts` returns the seeded experts, filterable by department
- [ ] When `POST /rag/query` returns `escalate: true` for a technician, `expert_contacts` are included in the response
- [ ] Tests cover: ticket creation, all valid status transitions, invalid transition rejection, expert filtering, escalation-triggered expert inclusion

## Blocked by

- [Issue #1: Backend Foundation + Docker Compose](./001-backend-foundation-docker.md)
