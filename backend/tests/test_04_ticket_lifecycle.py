"""
Issue #4: Ticket Lifecycle + Escalation — RED Tests

These tests define the expected behavior of the ticket management and
expert directory endpoints in the NEW modular backend structure.

All imports reference modules that DO NOT EXIST yet (app.modules.tickets,
app.modules.experts, etc.), so every test will fail at import time.
The implementation subagents' job is to create these modules and make
the tests pass (Green).

Endpoint Summary:
  POST   /tickets          — Create a ticket
  GET    /tickets           — List tickets (optional ?status= filter)
  GET    /tickets/{id}      — Get a single ticket by ID
  PATCH  /tickets/{id}      — Update ticket fields / transition status
  GET    /experts           — List experts (optional ?department= filter)

Status Lifecycle (valid transitions):
  new → assigned → in_progress → resolved → closed
"""

import pytest
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# The imports below target the NEW modular structure.  They WILL fail until
# the implementation subagents create the corresponding modules.
# ---------------------------------------------------------------------------
from httpx import AsyncClient, ASGITransport

# The new FastAPI app instance assembled from modular routers
from backend.app.main import app  # noqa: F401 — will be reworked


# ========================== FIXTURES ========================================

VALID_TICKET_PAYLOAD = {
    "customer_name": "Ali Khan",
    "phone": "0300-1234567",
    "appliance_model": "PR-2050",
    "issue_description": "Compressor making loud noise on startup",
}


from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.database import Base, get_db_session
import os

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_pel_ticket.db"

@pytest.fixture()
async def async_client():
    """Provide an httpx AsyncClient wired to the FastAPI app, using a test database."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
        
    app.dependency_overrides.clear()
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    if os.path.exists("./test_pel_ticket.db"):
        os.remove("./test_pel_ticket.db")


@pytest.fixture()
async def create_ticket(async_client: AsyncClient):
    """
    Factory fixture — call it with optional overrides to create a ticket
    and return the JSON response body.
    """

    async def _create(**overrides) -> dict:
        payload = {**VALID_TICKET_PAYLOAD, **overrides}
        resp = await async_client.post("/tickets", json=payload)
        assert resp.status_code == 200, f"Ticket creation failed: {resp.text}"
        return resp.json()

    return _create


# ========================== TICKET CREATION =================================


@pytest.mark.asyncio
async def test_create_ticket(async_client: AsyncClient):
    """POST /tickets with valid data returns 200 with a ticket_id."""
    resp = await async_client.post("/tickets", json=VALID_TICKET_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert "ticket_id" in body


@pytest.mark.asyncio
async def test_create_ticket_defaults_to_new_status(
    async_client: AsyncClient, create_ticket
):
    """A freshly created ticket has status='new'."""
    data = await create_ticket()
    ticket_id = data["ticket_id"]
    resp = await async_client.get(f"/tickets/{ticket_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "new"


@pytest.mark.asyncio
async def test_create_ticket_requires_customer_name(async_client: AsyncClient):
    """Missing customer_name returns 422 Unprocessable Entity."""
    payload = {**VALID_TICKET_PAYLOAD}
    del payload["customer_name"]
    resp = await async_client.post("/tickets", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_ticket_requires_phone(async_client: AsyncClient):
    """Missing phone returns 422 Unprocessable Entity."""
    payload = {**VALID_TICKET_PAYLOAD}
    del payload["phone"]
    resp = await async_client.post("/tickets", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_ticket_requires_appliance_model(async_client: AsyncClient):
    """Missing appliance_model returns 422 Unprocessable Entity."""
    payload = {**VALID_TICKET_PAYLOAD}
    del payload["appliance_model"]
    resp = await async_client.post("/tickets", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_ticket_requires_issue_description(async_client: AsyncClient):
    """Missing issue_description returns 422 Unprocessable Entity."""
    payload = {**VALID_TICKET_PAYLOAD}
    del payload["issue_description"]
    resp = await async_client.post("/tickets", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_ticket_accepts_optional_appliance_id(
    async_client: AsyncClient,
):
    """appliance_id is optional and accepted when provided."""
    payload = {**VALID_TICKET_PAYLOAD, "appliance_id": "PEL-REF-00742"}
    resp = await async_client.post("/tickets", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    ticket_id = body["ticket_id"]
    detail = await async_client.get(f"/tickets/{ticket_id}")
    assert detail.status_code == 200
    assert detail.json()["appliance_id"] == "PEL-REF-00742"


# ========================== TICKET LISTING ==================================


@pytest.mark.asyncio
async def test_list_tickets_empty(async_client: AsyncClient):
    """GET /tickets when none exist returns an empty list."""
    resp = await async_client.get("/tickets")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_tickets_returns_all(async_client: AsyncClient, create_ticket):
    """Creating 3 tickets then listing returns all 3."""
    for i in range(3):
        await create_ticket(customer_name=f"Customer {i}")
    resp = await async_client.get("/tickets")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


@pytest.mark.asyncio
async def test_list_tickets_filter_by_status(
    async_client: AsyncClient, create_ticket
):
    """GET /tickets?status=new returns only tickets with status 'new'."""
    t1 = await create_ticket(customer_name="New Ticket")
    t2 = await create_ticket(customer_name="Assigned Ticket")
    # Transition t2 → assigned
    await async_client.patch(
        f"/tickets/{t2['ticket_id']}", json={"status": "assigned"}
    )

    resp = await async_client.get("/tickets", params={"status": "new"})
    assert resp.status_code == 200
    tickets = resp.json()
    assert len(tickets) == 1
    assert tickets[0]["ticket_id"] == t1["ticket_id"]


@pytest.mark.asyncio
async def test_list_tickets_ordered_by_newest_first(
    async_client: AsyncClient, create_ticket
):
    """Most recently created ticket appears first in the list."""
    t1 = await create_ticket(customer_name="First")
    t2 = await create_ticket(customer_name="Second")
    t3 = await create_ticket(customer_name="Third")

    resp = await async_client.get("/tickets")
    assert resp.status_code == 200
    tickets = resp.json()
    assert tickets[0]["customer_name"] == "Third"
    assert tickets[-1]["customer_name"] == "First"


# ========================== TICKET DETAIL ===================================


@pytest.mark.asyncio
async def test_get_ticket_by_id(async_client: AsyncClient, create_ticket):
    """GET /tickets/{id} returns the requested ticket."""
    data = await create_ticket()
    ticket_id = data["ticket_id"]
    resp = await async_client.get(f"/tickets/{ticket_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ticket_id"] == ticket_id
    assert body["customer_name"] == VALID_TICKET_PAYLOAD["customer_name"]


@pytest.mark.asyncio
async def test_get_nonexistent_ticket_returns_404(async_client: AsyncClient):
    """GET /tickets/999999 returns 404 Not Found."""
    resp = await async_client.get("/tickets/999999")
    assert resp.status_code == 404


# =================== STATUS LIFECYCLE — VALID TRANSITIONS ===================


@pytest.mark.asyncio
async def test_transition_new_to_assigned(
    async_client: AsyncClient, create_ticket
):
    """PATCH /tickets/{id} with status='assigned' succeeds from 'new'."""
    data = await create_ticket()
    resp = await async_client.patch(
        f"/tickets/{data['ticket_id']}", json={"status": "assigned"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "assigned"


@pytest.mark.asyncio
async def test_transition_assigned_to_in_progress(
    async_client: AsyncClient, create_ticket
):
    """PATCH with status='in_progress' succeeds from 'assigned'."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    resp = await async_client.patch(
        f"/tickets/{tid}", json={"status": "in_progress"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_transition_in_progress_to_resolved(
    async_client: AsyncClient, create_ticket
):
    """PATCH with status='resolved' succeeds from 'in_progress'."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "in_progress"})
    resp = await async_client.patch(
        f"/tickets/{tid}", json={"status": "resolved"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"


@pytest.mark.asyncio
async def test_transition_resolved_to_closed(
    async_client: AsyncClient, create_ticket
):
    """PATCH with status='closed' succeeds from 'resolved'."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "in_progress"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "resolved"})
    resp = await async_client.patch(
        f"/tickets/{tid}", json={"status": "closed"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "closed"


@pytest.mark.asyncio
async def test_resolved_sets_resolved_at(
    async_client: AsyncClient, create_ticket
):
    """After resolving, ticket has a non-null resolved_at timestamp."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "in_progress"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "resolved"})

    resp = await async_client.get(f"/tickets/{tid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["resolved_at"] is not None
    # Should be parseable as ISO datetime
    datetime.fromisoformat(body["resolved_at"])


@pytest.mark.asyncio
async def test_closed_sets_closed_at(
    async_client: AsyncClient, create_ticket
):
    """After closing, ticket has a non-null closed_at timestamp."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "in_progress"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "resolved"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "closed"})

    resp = await async_client.get(f"/tickets/{tid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["closed_at"] is not None
    datetime.fromisoformat(body["closed_at"])


# ================== STATUS LIFECYCLE — INVALID TRANSITIONS ==================


@pytest.mark.asyncio
async def test_cannot_skip_new_to_in_progress(
    async_client: AsyncClient, create_ticket
):
    """PATCH from 'new' directly to 'in_progress' returns 400."""
    data = await create_ticket()
    resp = await async_client.patch(
        f"/tickets/{data['ticket_id']}", json={"status": "in_progress"}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cannot_skip_new_to_resolved(
    async_client: AsyncClient, create_ticket
):
    """PATCH from 'new' directly to 'resolved' returns 400."""
    data = await create_ticket()
    resp = await async_client.patch(
        f"/tickets/{data['ticket_id']}", json={"status": "resolved"}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cannot_go_backwards_resolved_to_assigned(
    async_client: AsyncClient, create_ticket
):
    """PATCH from 'resolved' back to 'assigned' returns 400."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "in_progress"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "resolved"})

    resp = await async_client.patch(
        f"/tickets/{tid}", json={"status": "assigned"}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cannot_go_backwards_closed_to_resolved(
    async_client: AsyncClient, create_ticket
):
    """PATCH from 'closed' back to 'resolved' returns 400."""
    data = await create_ticket()
    tid = data["ticket_id"]
    await async_client.patch(f"/tickets/{tid}", json={"status": "assigned"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "in_progress"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "resolved"})
    await async_client.patch(f"/tickets/{tid}", json={"status": "closed"})

    resp = await async_client.patch(
        f"/tickets/{tid}", json={"status": "resolved"}
    )
    assert resp.status_code == 400


# ========================== UPDATE FIELDS ===================================


@pytest.mark.asyncio
async def test_update_ticket_notes(async_client: AsyncClient, create_ticket):
    """PATCH /tickets/{id} with notes='Fixed compressor' updates the field."""
    data = await create_ticket()
    tid = data["ticket_id"]

    resp = await async_client.patch(
        f"/tickets/{tid}", json={"notes": "Fixed compressor"}
    )
    assert resp.status_code == 200

    detail = await async_client.get(f"/tickets/{tid}")
    assert detail.status_code == 200
    assert detail.json()["notes"] == "Fixed compressor"


@pytest.mark.asyncio
async def test_update_ticket_assigned_technician(
    async_client: AsyncClient, create_ticket
):
    """PATCH with assigned_technician_id sets the technician field."""
    data = await create_ticket()
    tid = data["ticket_id"]

    resp = await async_client.patch(
        f"/tickets/{tid}", json={"assigned_technician_id": "tech-42"}
    )
    assert resp.status_code == 200

    detail = await async_client.get(f"/tickets/{tid}")
    assert detail.status_code == 200
    assert detail.json()["assigned_technician_id"] == "tech-42"


# ========================== EXPERT DIRECTORY ================================


@pytest.mark.asyncio
async def test_list_experts(async_client: AsyncClient):
    """GET /experts returns the seeded experts (at least 3)."""
    resp = await async_client.get("/experts")
    assert resp.status_code == 200
    experts = resp.json()
    assert isinstance(experts, list)
    assert len(experts) >= 3


@pytest.mark.asyncio
async def test_filter_experts_by_department(async_client: AsyncClient):
    """GET /experts?department=refrigerators returns only refrigerator experts."""
    resp = await async_client.get(
        "/experts", params={"department": "refrigerators"}
    )
    assert resp.status_code == 200
    experts = resp.json()
    assert len(experts) >= 1
    for expert in experts:
        assert expert["department"] == "refrigerators"


@pytest.mark.asyncio
async def test_filter_experts_nonexistent_department_returns_empty(
    async_client: AsyncClient,
):
    """GET /experts?department=Microwave returns an empty list."""
    resp = await async_client.get(
        "/experts", params={"department": "Microwave"}
    )
    assert resp.status_code == 200
    assert resp.json() == []
