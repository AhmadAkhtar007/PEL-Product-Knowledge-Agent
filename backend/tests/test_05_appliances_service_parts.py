"""
Issue #5 — Appliance Registration + Service History + Parts Catalog

Red-phase tests for the NEW modular backend.
All imports reference modules that don't exist yet — tests MUST fail.
"""
import pytest
import pytest_asyncio
from datetime import date, datetime, timedelta
from httpx import AsyncClient


# ============================================================================
# Module-level fixtures (specific to appliance / service-history / parts)
# ============================================================================

@pytest_asyncio.fixture
async def register_appliance(client: AsyncClient):
    """Helper that registers a single appliance and returns its JSON."""
    payload = {
        "product_category": "Refrigerator",
        "model": "PRL-2550",
    }
    res = await client.post("/appliances", json=payload)
    assert res.status_code == 200, f"Fixture setup failed: {res.text}"
    data = res.json()
    assert "id" in data
    return data


@pytest_asyncio.fixture
async def create_ticket_for_appliance(client: AsyncClient, register_appliance):
    """Creates a support ticket linked to an appliance and returns its JSON."""
    appliance = register_appliance
    payload = {
        "customer_name": "Test Customer",
        "phone": "0300-1234567",
        "appliance_model": appliance["model"],
        "issue_description": "Unit not cooling properly",
        "appliance_id": appliance["id"],
    }
    res = await client.post("/tickets", json=payload)
    assert res.status_code == 200, f"Fixture setup failed: {res.text}"
    data = res.json()
    data["appliance"] = appliance
    return data


@pytest_asyncio.fixture
async def create_service_record(client: AsyncClient, register_appliance):
    """Creates a service history record for a registered appliance."""
    appliance = register_appliance
    payload = {
        "appliance_id": appliance["id"],
        "technician_name": "Engr. Ahmad",
        "description": "Replaced compressor, tested cooling cycle",
    }
    res = await client.post("/service-history", json=payload)
    assert res.status_code == 200, f"Fixture setup failed: {res.text}"
    data = res.json()
    data["appliance"] = appliance
    return data


# ============================================================================
# Appliance Registration
# ============================================================================


class TestApplianceRegistration:
    """POST /appliances — register appliances."""

    @pytest.mark.asyncio
    async def test_register_appliance(self, client: AsyncClient):
        """POST /appliances with required fields returns 200 with an id."""
        res = await client.post("/appliances", json={
            "product_category": "Refrigerator",
            "model": "PRL-2550",
        })
        assert res.status_code == 200
        body = res.json()
        assert "id" in body
        assert body["product_category"] == "Refrigerator"
        assert body["model"] == "PRL-2550"

    @pytest.mark.asyncio
    async def test_register_appliance_requires_product_category(
        self, client: AsyncClient,
    ):
        """Missing product_category returns 422 Unprocessable Entity."""
        res = await client.post("/appliances", json={
            "model": "PRL-2550",
        })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_register_appliance_requires_model(
        self, client: AsyncClient,
    ):
        """Missing model returns 422 Unprocessable Entity."""
        res = await client.post("/appliances", json={
            "product_category": "Refrigerator",
        })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_register_appliance_accepts_optional_fields(
        self, client: AsyncClient,
    ):
        """serial_number, purchase_date, qr_data are optional and accepted."""
        res = await client.post("/appliances", json={
            "product_category": "Washing Machine",
            "model": "PAWM-1100i",
            "serial_number": "PEL-WM-2024-042",
            "purchase_date": "2024-06-15",
        })
        assert res.status_code == 200
        body = res.json()
        assert body["serial_number"] == "PEL-WM-2024-042"
        assert body["purchase_date"] == "2024-06-15"

    @pytest.mark.asyncio
    async def test_register_appliance_with_qr_data(self, client: AsyncClient):
        """POST with qr_data dictionary auto-populates fields from QR scan."""
        qr_payload = {
            "model": "PWD-425",
            "serial": "PEL-WD-2024-001",
            "category": "Water Dispenser",
        }
        res = await client.post("/appliances", json={
            "product_category": "Water Dispenser",
            "model": "PWD-425",
            "qr_data": qr_payload,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["model"] == "PWD-425"
        assert body["qr_data"] is not None


class TestApplianceListing:
    """GET /appliances — list & query appliances."""

    @pytest.mark.asyncio
    async def test_list_appliances_empty(self, client: AsyncClient):
        """GET /appliances when none exist returns an empty list."""
        res = await client.get("/appliances")
        assert res.status_code == 200
        assert res.json() == []

    @pytest.mark.asyncio
    async def test_list_appliances_returns_registered(
        self, client: AsyncClient,
    ):
        """After registering 2 appliances, GET returns exactly 2."""
        await client.post("/appliances", json={
            "product_category": "Refrigerator",
            "model": "PRL-2550",
        })
        await client.post("/appliances", json={
            "product_category": "AC",
            "model": "PAC-12T",
        })
        res = await client.get("/appliances")
        assert res.status_code == 200
        assert len(res.json()) == 2

    @pytest.mark.asyncio
    async def test_list_appliances_includes_active_ticket_count(
        self, client: AsyncClient,
    ):
        """Appliance with 2 open tickets shows active_ticket_count=2."""
        # Register appliance
        reg = await client.post("/appliances", json={
            "product_category": "Refrigerator",
            "model": "PRL-2550",
        })
        appliance_id = reg.json()["id"]

        # Create 2 open tickets linked to the appliance
        for i in range(2):
            await client.post("/tickets", json={
                "customer_name": f"Customer {i}",
                "phone": "0300-0000000",
                "appliance_model": "PRL-2550",
                "issue_description": f"Issue #{i}",
                "appliance_id": appliance_id,
            })

        res = await client.get("/appliances")
        assert res.status_code == 200
        appliances = res.json()
        target = next(a for a in appliances if a["id"] == appliance_id)
        assert target["active_ticket_count"] == 2

    @pytest.mark.asyncio
    async def test_list_appliances_includes_last_serviced_date(
        self, client: AsyncClient,
    ):
        """Appliance with service history shows last_serviced date."""
        # Register appliance
        reg = await client.post("/appliances", json={
            "product_category": "Refrigerator",
            "model": "PRL-2550",
        })
        appliance_id = reg.json()["id"]

        # Create a service record
        await client.post("/service-history", json={
            "appliance_id": appliance_id,
            "technician_name": "Engr. Ahmad",
            "description": "Routine maintenance check",
        })

        res = await client.get("/appliances")
        assert res.status_code == 200
        appliances = res.json()
        target = next(a for a in appliances if a["id"] == appliance_id)
        assert target["last_serviced"] is not None


class TestApplianceDetail:
    """GET /appliances/{id} — single-appliance detail view."""

    @pytest.mark.asyncio
    async def test_get_appliance_by_id(
        self, client: AsyncClient, register_appliance,
    ):
        """GET /appliances/{id} returns full details for the appliance."""
        appliance_id = register_appliance["id"]
        res = await client.get(f"/appliances/{appliance_id}")
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == appliance_id
        assert body["product_category"] == "Refrigerator"
        assert body["model"] == "PRL-2550"

    @pytest.mark.asyncio
    async def test_get_appliance_includes_service_history(
        self, client: AsyncClient, create_service_record,
    ):
        """GET /appliances/{id} response includes linked service_history array."""
        appliance_id = create_service_record["appliance"]["id"]
        res = await client.get(f"/appliances/{appliance_id}")
        assert res.status_code == 200
        body = res.json()
        assert "service_history" in body
        assert isinstance(body["service_history"], list)
        assert len(body["service_history"]) >= 1

    @pytest.mark.asyncio
    async def test_get_appliance_includes_tickets(
        self, client: AsyncClient, create_ticket_for_appliance,
    ):
        """GET /appliances/{id} response includes linked tickets array."""
        appliance_id = create_ticket_for_appliance["appliance"]["id"]
        res = await client.get(f"/appliances/{appliance_id}")
        assert res.status_code == 200
        body = res.json()
        assert "tickets" in body
        assert isinstance(body["tickets"], list)
        assert len(body["tickets"]) >= 1


class TestApplianceDeletion:
    """DELETE /appliances/{id} — remove appliances."""

    @pytest.mark.asyncio
    async def test_delete_appliance(
        self, client: AsyncClient, register_appliance,
    ):
        """DELETE /appliances/{id} returns 200."""
        appliance_id = register_appliance["id"]
        res = await client.delete(f"/appliances/{appliance_id}")
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_get_deleted_appliance_returns_404(
        self, client: AsyncClient, register_appliance,
    ):
        """After deletion, GET /appliances/{id} returns 404."""
        appliance_id = register_appliance["id"]
        del_res = await client.delete(f"/appliances/{appliance_id}")
        assert del_res.status_code == 200

        get_res = await client.get(f"/appliances/{appliance_id}")
        assert get_res.status_code == 404


# ============================================================================
# Service History
# ============================================================================


class TestServiceHistoryCreation:
    """POST /service-history — create service records."""

    @pytest.mark.asyncio
    async def test_create_service_record(
        self, client: AsyncClient, register_appliance,
    ):
        """POST /service-history with required fields returns 200."""
        res = await client.post("/service-history", json={
            "appliance_id": register_appliance["id"],
            "technician_name": "Engr. Ahmad",
            "description": "Replaced compressor, tested cooling cycle",
        })
        assert res.status_code == 200
        body = res.json()
        assert "id" in body
        assert body["technician_name"] == "Engr. Ahmad"

    @pytest.mark.asyncio
    async def test_create_service_record_requires_appliance_id(
        self, client: AsyncClient,
    ):
        """Missing appliance_id returns 422."""
        res = await client.post("/service-history", json={
            "technician_name": "Engr. Ahmad",
            "description": "Some work",
        })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_service_record_requires_technician_name(
        self, client: AsyncClient, register_appliance,
    ):
        """Missing technician_name returns 422."""
        res = await client.post("/service-history", json={
            "appliance_id": register_appliance["id"],
            "description": "Some work",
        })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_service_record_requires_description(
        self, client: AsyncClient, register_appliance,
    ):
        """Missing description returns 422."""
        res = await client.post("/service-history", json={
            "appliance_id": register_appliance["id"],
            "technician_name": "Engr. Ahmad",
        })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_service_record_with_ticket_link(
        self, client: AsyncClient, create_ticket_for_appliance,
    ):
        """POST /service-history with ticket_id links the record to a ticket."""
        ticket_data = create_ticket_for_appliance
        appliance = ticket_data["appliance"]
        ticket_id = ticket_data.get("ticket_id") or ticket_data.get("id")

        res = await client.post("/service-history", json={
            "appliance_id": appliance["id"],
            "technician_name": "Engr. Yasir",
            "description": "Resolved cooling issue linked to ticket",
            "ticket_id": ticket_id,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["ticket_id"] == ticket_id

    @pytest.mark.asyncio
    async def test_create_service_record_with_photos(
        self, client: AsyncClient, register_appliance,
    ):
        """POST /service-history with photos_json stores the photo references."""
        res = await client.post("/service-history", json={
            "appliance_id": register_appliance["id"],
            "technician_name": "Engr. Ahmad",
            "description": "Replaced fan motor — see photos",
            "photos_json": ["photo1.jpg", "photo2.jpg"],
        })
        assert res.status_code == 200
        body = res.json()
        assert body["photos_json"] == ["photo1.jpg", "photo2.jpg"]


class TestServiceHistoryQuery:
    """GET /service-history — filter and order service records."""

    @pytest.mark.asyncio
    async def test_list_service_history_by_appliance(
        self, client: AsyncClient, register_appliance,
    ):
        """GET /service-history?appliance_id={id} returns only that appliance's records."""
        appliance_id = register_appliance["id"]

        # Create a record for our appliance
        await client.post("/service-history", json={
            "appliance_id": appliance_id,
            "technician_name": "Engr. Ahmad",
            "description": "Routine maintenance",
        })

        # Create another appliance with its own record (noise)
        other = await client.post("/appliances", json={
            "product_category": "AC",
            "model": "PAC-12T",
        })
        other_id = other.json()["id"]
        await client.post("/service-history", json={
            "appliance_id": other_id,
            "technician_name": "Engr. Yasir",
            "description": "Gas refill",
        })

        res = await client.get(f"/service-history?appliance_id={appliance_id}")
        assert res.status_code == 200
        records = res.json()
        assert len(records) == 1
        assert all(r["appliance_id"] == appliance_id for r in records)

    @pytest.mark.asyncio
    async def test_list_service_history_by_technician(
        self, client: AsyncClient, register_appliance,
    ):
        """GET /service-history?technician_name=Ahmad returns only Ahmad's records."""
        appliance_id = register_appliance["id"]

        await client.post("/service-history", json={
            "appliance_id": appliance_id,
            "technician_name": "Ahmad",
            "description": "Work by Ahmad",
        })
        await client.post("/service-history", json={
            "appliance_id": appliance_id,
            "technician_name": "Yasir",
            "description": "Work by Yasir",
        })

        res = await client.get("/service-history?technician_name=Ahmad")
        assert res.status_code == 200
        records = res.json()
        assert len(records) == 1
        assert records[0]["technician_name"] == "Ahmad"

    @pytest.mark.asyncio
    async def test_service_history_ordered_by_newest(
        self, client: AsyncClient, register_appliance,
    ):
        """Most recent service record appears first in the listing."""
        appliance_id = register_appliance["id"]

        await client.post("/service-history", json={
            "appliance_id": appliance_id,
            "technician_name": "First Tech",
            "description": "First service",
        })
        await client.post("/service-history", json={
            "appliance_id": appliance_id,
            "technician_name": "Second Tech",
            "description": "Second service",
        })

        res = await client.get(
            f"/service-history?appliance_id={appliance_id}"
        )
        assert res.status_code == 200
        records = res.json()
        assert len(records) == 2
        # Most recent should be first
        assert records[0]["description"] == "Second service"
        assert records[1]["description"] == "First service"


# ============================================================================
# Parts Catalog
# ============================================================================


class TestPartsCatalog:
    """GET /parts — browse and filter the parts catalog."""

    @pytest.mark.asyncio
    async def test_list_parts(self, client: AsyncClient):
        """GET /parts returns seeded parts (at least 10)."""
        res = await client.get("/parts")
        assert res.status_code == 200
        parts = res.json()
        assert isinstance(parts, list)
        assert len(parts) >= 10

    @pytest.mark.asyncio
    async def test_list_parts_filter_by_category(self, client: AsyncClient):
        """GET /parts?category=compressor returns only compressor parts."""
        res = await client.get("/parts?category=compressor")
        assert res.status_code == 200
        parts = res.json()
        assert len(parts) >= 1
        assert all(
            p["category"].lower() == "compressor" for p in parts
        )

    @pytest.mark.asyncio
    async def test_list_parts_filter_by_appliance_type(
        self, client: AsyncClient,
    ):
        """GET /parts?appliance_type=Refrigerator returns only fridge parts."""
        res = await client.get("/parts?appliance_type=Refrigerator")
        assert res.status_code == 200
        parts = res.json()
        assert len(parts) >= 1
        assert all(
            p["appliance_type"] == "Refrigerator" for p in parts
        )

    @pytest.mark.asyncio
    async def test_list_parts_combined_filter(self, client: AsyncClient):
        """GET /parts?category=thermostat&appliance_type=AC returns intersection."""
        res = await client.get(
            "/parts?category=thermostat&appliance_type=AC"
        )
        assert res.status_code == 200
        parts = res.json()
        for p in parts:
            assert p["category"].lower() == "thermostat"
            assert p["appliance_type"] == "AC"

    @pytest.mark.asyncio
    async def test_get_part_by_id(self, client: AsyncClient):
        """GET /parts/{id} returns part with name, part_number, description, quantity_in_stock, unit_price."""
        # First get the list to find a valid ID
        list_res = await client.get("/parts")
        assert list_res.status_code == 200
        parts = list_res.json()
        assert len(parts) > 0

        part_id = parts[0]["id"]
        res = await client.get(f"/parts/{part_id}")
        assert res.status_code == 200
        body = res.json()

        # Verify all required fields are present
        assert "name" in body
        assert "part_number" in body
        assert "description" in body
        assert "quantity_in_stock" in body
        assert "unit_price" in body
        assert body["id"] == part_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_part_returns_404(
        self, client: AsyncClient,
    ):
        """GET /parts/999999 returns 404 Not Found."""
        res = await client.get("/parts/999999")
        assert res.status_code == 404
