"""
Tests for Issue #1: Backend Foundation + Docker Compose

These tests define the acceptance criteria for the foundation layer:
- Health check endpoint with database status
- Experts endpoint returning seeded data
- CORS configuration
- Proper JSON responses and 404 handling

All tests target the NEW modular backend structure. They MUST fail (Red)
until the implementation subagents make them pass (Green).
"""
import pytest


@pytest.mark.asyncio
async def test_health_check_returns_ok(client):
    """GET /health returns 200 with status 'ok'."""
    response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_health_check_includes_database_status(client):
    """GET /health response contains both 'status' and 'database' keys."""
    response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_experts_endpoint_returns_seeded_data(client):
    """GET /experts returns the 3 seeded PEL division experts."""
    response = await client.get("/experts")

    assert response.status_code == 200
    experts = response.json()
    assert isinstance(experts, list)
    assert len(experts) == 3


@pytest.mark.asyncio
async def test_experts_have_required_fields(client):
    """Each expert record contains name, role_title, department, phone, email."""
    response = await client.get("/experts")

    assert response.status_code == 200
    experts = response.json()

    required_fields = {"name", "role_title", "department", "phone", "email"}
    for expert in experts:
        assert required_fields.issubset(
            expert.keys()
        ), f"Expert missing fields: {required_fields - set(expert.keys())}"


@pytest.mark.asyncio
async def test_seeded_experts_cover_all_departments(client):
    """Seeded experts span the three PEL appliance departments."""
    response = await client.get("/experts")

    assert response.status_code == 200
    experts = response.json()

    departments = {expert["department"] for expert in experts}
    assert "refrigerators" in departments
    assert "air_conditioners" in departments
    assert "washing_machines" in departments


@pytest.mark.asyncio
async def test_cors_allows_all_origins(client):
    """CORS middleware is configured to allow all origins (Access-Control-Allow-Origin: *)."""
    response = await client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "*"


@pytest.mark.asyncio
async def test_api_returns_json_content_type(client):
    """API endpoints return responses with application/json content type."""
    response = await client.get("/health")

    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]


@pytest.mark.asyncio
async def test_nonexistent_endpoint_returns_404(client):
    """GET /nonexistent returns a 404 Not Found."""
    response = await client.get("/nonexistent")

    assert response.status_code == 404
