from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional, Union
from pydantic import BaseModel
from datetime import date, datetime
import json

from backend.app.database import get_db_session
from backend.app.models.appliance import Appliance
from backend.app.models.ticket import Ticket
from backend.app.models.service_history import ServiceHistory

router = APIRouter()

class ApplianceCreate(BaseModel):
    product_category: str
    model: str
    serial_number: Optional[str] = None
    purchase_date: Optional[Union[str, date]] = None
    qr_data: Optional[dict] = None

@router.post("/appliances")
async def create_appliance(
    appliance_in: ApplianceCreate,
    db: AsyncSession = Depends(get_db_session)
):
    product_category = appliance_in.product_category
    model = appliance_in.model
    serial_number = appliance_in.serial_number
    purchase_date = appliance_in.purchase_date

    # Extract/override from qr_data if available
    if appliance_in.qr_data:
        qr = appliance_in.qr_data
        if "model" in qr:
            model = qr["model"]
        if "category" in qr:
            product_category = qr["category"]
        elif "product_category" in qr:
            product_category = qr["product_category"]
        if "serial" in qr:
            serial_number = qr["serial"]
        elif "serial_number" in qr:
            serial_number = qr["serial_number"]

    if not product_category or not model:
        raise HTTPException(status_code=422, detail="product_category and model are required")

    # Parse purchase_date if it is passed as a string
    if isinstance(purchase_date, str):
        try:
            purchase_date = date.fromisoformat(purchase_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid purchase_date format, must be YYYY-MM-DD")

    db_appliance = Appliance(
        product_category=product_category,
        model=model,
        serial_number=serial_number,
        purchase_date=purchase_date,
        qr_data=json.dumps(appliance_in.qr_data) if appliance_in.qr_data is not None else None
    )

    db.add(db_appliance)
    await db.commit()
    await db.refresh(db_appliance)

    qr_dict = appliance_in.qr_data
    return {
        "id": db_appliance.id,
        "product_category": db_appliance.product_category,
        "model": db_appliance.model,
        "serial_number": db_appliance.serial_number,
        "purchase_date": db_appliance.purchase_date.isoformat() if db_appliance.purchase_date else None,
        "registered_at": db_appliance.registered_at,
        "qr_data": qr_dict
    }

@router.get("/appliances")
async def list_appliances(db: AsyncSession = Depends(get_db_session)):
    query = select(Appliance).options(
        selectinload(Appliance.tickets),
        selectinload(Appliance.service_history)
    )
    result = await db.execute(query)
    appliances = result.scalars().all()

    response = []
    for app in appliances:
        # Count tickets that are not resolved or closed
        active_tickets = [t for t in app.tickets if t.status not in ["resolved", "closed"]]
        
        # Get latest service history completed_at date
        completed_dates = [sh.completed_at for sh in app.service_history if sh.completed_at]
        last_serviced = max(completed_dates) if completed_dates else None

        qr_dict = None
        if app.qr_data:
            try:
                qr_dict = json.loads(app.qr_data)
            except Exception:
                qr_dict = app.qr_data

        response.append({
            "id": app.id,
            "product_category": app.product_category,
            "model": app.model,
            "serial_number": app.serial_number,
            "purchase_date": app.purchase_date.isoformat() if app.purchase_date else None,
            "registered_at": app.registered_at,
            "qr_data": qr_dict,
            "active_ticket_count": len(active_tickets),
            "last_serviced": last_serviced
        })
    
    return response

@router.get("/appliances/{appliance_id}")
async def get_appliance(
    appliance_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    query = select(Appliance).where(Appliance.id == appliance_id).options(
        selectinload(Appliance.tickets),
        selectinload(Appliance.service_history)
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Appliance not found")

    tickets_list = []
    for t in app.tickets:
        tickets_list.append({
            "id": t.id,
            "ticket_id": t.id,
            "customer_name": t.customer_name,
            "phone": t.phone,
            "appliance_model": t.appliance_model,
            "issue_description": t.issue_description,
            "status": t.status,
            "assigned_technician_id": t.assigned_technician_id,
            "notes": t.notes,
            "appliance_id": t.appliance_id,
            "resolved_at": t.resolved_at,
            "closed_at": t.closed_at,
            "created_at": t.created_at
        })

    history_list = []
    for sh in app.service_history:
        history_list.append({
            "id": sh.id,
            "appliance_id": sh.appliance_id,
            "ticket_id": sh.ticket_id,
            "technician_name": sh.technician_name,
            "description": sh.description,
            "photos_json": sh.photos_json,
            "completed_at": sh.completed_at
        })

    qr_dict = None
    if app.qr_data:
        try:
            qr_dict = json.loads(app.qr_data)
        except Exception:
            qr_dict = app.qr_data

    return {
        "id": app.id,
        "product_category": app.product_category,
        "model": app.model,
        "serial_number": app.serial_number,
        "purchase_date": app.purchase_date.isoformat() if app.purchase_date else None,
        "registered_at": app.registered_at,
        "qr_data": qr_dict,
        "tickets": tickets_list,
        "service_history": history_list
    }

@router.delete("/appliances/{appliance_id}")
async def delete_appliance(
    appliance_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    query = select(Appliance).where(Appliance.id == appliance_id)
    result = await db.execute(query)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Appliance not found")
    
    await db.delete(app)
    await db.commit()
    return {"status": "success", "message": "Appliance deleted"}
