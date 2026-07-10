from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.app.database import get_db_session

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db_session)):
    try:
        # Run a simple async query to verify the database connection is active
        await db.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        database_status = "disconnected"

    return {
        "status": "ok",
        "database": database_status
    }
