from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from backend.app.database import get_db_session
from backend.app.models.part import Part

router = APIRouter()

class PartResponse(BaseModel):
    id: int
    name: str
    category: str
    appliance_type: str
    part_number: str
    description: Optional[str] = None
    quantity_in_stock: int
    unit_price: float

    model_config = {
        "from_attributes": True
    }

@router.get("/parts", response_model=List[PartResponse])
async def list_parts(
    category: Optional[str] = Query(None),
    appliance_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(Part)
    if category is not None:
        query = query.where(func.lower(Part.category) == category.lower())
    if appliance_type is not None:
        query = query.where(func.lower(Part.appliance_type) == appliance_type.lower())

    result = await db.execute(query)
    parts = result.scalars().all()
    return parts

@router.get("/parts/{part_id}", response_model=PartResponse)
async def get_part(
    part_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(select(Part).where(Part.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return part
