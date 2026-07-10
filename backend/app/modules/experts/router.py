from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from backend.app.database import get_db_session
from backend.app.models.expert import Expert
from pydantic import BaseModel

router = APIRouter()

class ExpertResponse(BaseModel):
    id: int
    name: str
    role_title: str
    department: str
    phone: str
    email: str

    model_config = {
        "from_attributes": True
    }

@router.get("/experts", response_model=List[ExpertResponse])
async def get_experts(
    department: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(Expert)
    if department:
        query = query.where(Expert.department == department)
    
    result = await db.execute(query)
    experts = result.scalars().all()
    return experts
