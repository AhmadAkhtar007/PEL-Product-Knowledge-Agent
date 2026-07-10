from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.app.database import get_db_session
from backend.app.models.service_history import ServiceHistory

router = APIRouter()

class ServiceHistoryCreate(BaseModel):
    appliance_id: str
    technician_name: str
    description: str
    ticket_id: Optional[int] = None
    photos_json: Optional[list] = None

@router.post("/service-history")
async def create_service_record(
    record_in: ServiceHistoryCreate,
    db: AsyncSession = Depends(get_db_session)
):
    db_record = ServiceHistory(
        appliance_id=record_in.appliance_id,
        technician_name=record_in.technician_name,
        description=record_in.description,
        ticket_id=record_in.ticket_id,
        photos_json=record_in.photos_json
    )

    db.add(db_record)
    await db.commit()
    await db.refresh(db_record)

    return {
        "id": db_record.id,
        "appliance_id": db_record.appliance_id,
        "ticket_id": db_record.ticket_id,
        "technician_name": db_record.technician_name,
        "description": db_record.description,
        "photos_json": db_record.photos_json,
        "completed_at": db_record.completed_at
    }

@router.get("/service-history")
async def list_service_history(
    appliance_id: Optional[str] = Query(None),
    technician_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(ServiceHistory)
    if appliance_id is not None:
        query = query.where(ServiceHistory.appliance_id == appliance_id)
    if technician_name is not None:
        query = query.where(ServiceHistory.technician_name == technician_name)
    
    # Order by completed_at descending (newest first), fallback to id descending
    query = query.order_by(ServiceHistory.completed_at.desc(), ServiceHistory.id.desc())

    result = await db.execute(query)
    records = result.scalars().all()

    response = []
    for r in records:
        response.append({
            "id": r.id,
            "appliance_id": r.appliance_id,
            "ticket_id": r.ticket_id,
            "technician_name": r.technician_name,
            "description": r.description,
            "photos_json": r.photos_json,
            "completed_at": r.completed_at
        })
    return response
