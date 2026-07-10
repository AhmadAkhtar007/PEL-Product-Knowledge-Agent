import os
import pytest
from fastapi.testclient import TestClient
from backend.app.config import settings

settings.DB_PATH = "test_pel_app.db"

from backend.app.database import init_db
from backend.app.main import app

@pytest.fixture(autouse=True)
def setup_db():
    if os.path.exists(settings.DB_PATH):
        os.remove(settings.DB_PATH)
    init_db()
    yield
    if os.path.exists(settings.DB_PATH):
        os.remove(settings.DB_PATH)

def test_ticket_endpoints():
    with TestClient(app) as client:
        # Create ticket
        res = client.post("/tickets", json={
            "customer_name": "Test User",
            "phone": "0300-1234567",
            "appliance_model": "PR-1950",
            "issue_description": "Water leaking from cooling coils"
        })
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        
        # List tickets
        res_list = client.get("/tickets")
        assert res_list.status_code == 200
        assert len(res_list.json()) > 0
        assert res_list.json()[0]["customer_name"] == "Test User"
