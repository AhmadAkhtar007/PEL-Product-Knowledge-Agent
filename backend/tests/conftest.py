"""
Shared pytest fixtures for the PEL Appliance Chatbot test suite.

These fixtures target the NEW modular backend structure that doesn't exist yet.
All tests importing from this conftest should FAIL (Red) until implementation
is complete.
"""
import os
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import AsyncMock, MagicMock, patch

# Import from the NEW modular structure (doesn't exist yet = Red)
from backend.app.main import create_app
from backend.app.database import Base, get_db_session
import backend.app.models

# Use SQLite async for tests (no Docker needed for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_pel.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


import uuid
@pytest.fixture
async def db_engine():
    """Create a test database engine and tables, tear down after test."""
    db_file = f"./test_pel_{uuid.uuid4().hex}.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    try:
        if os.path.exists(db_file):
            os.remove(db_file)
    except PermissionError:
        pass


@pytest.fixture
async def db_session(db_engine):
    """Provide an async database session for direct DB operations in tests."""
    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest.fixture
async def client(db_engine):
    """Async test client wired to the test database via dependency override."""
    app = create_app()

    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def async_client(client):
    """Alias for client fixture to support test suites expecting async_client."""
    yield client



@pytest.fixture
def mock_llm_service():
    """Mock the LLM service for deterministic test results."""
    with patch("backend.app.modules.rag.service.LLMService") as MockLLM:
        mock_instance = MockLLM.return_value
        mock_instance.query_gemini_multimodal = AsyncMock(
            return_value="This is a test response from the PEL AI assistant."
        )
        mock_instance.stream_gemini = AsyncMock()
        yield mock_instance
