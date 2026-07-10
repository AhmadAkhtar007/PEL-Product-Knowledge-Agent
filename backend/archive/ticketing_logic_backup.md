# Ticketing System Logic Backup\n\nThis file contains the core logic for the deprecated dual-app (Uber-for-technicians) architecture.\nIt includes the SQLAlchemy models and FastAPI routing endpoints for Tickets, Experts, Appliances, Parts, and Service History.\n\n## backend/app/models/ticket.py\n\n`python\nfrom sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base
import enum

class TicketStatus(str, enum.Enum):
    new = "new"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    appliance_model = Column(String, nullable=False)
    issue_description = Column(String, nullable=False)
    status = Column(Enum(TicketStatus, name="ticket_status_enum", inherit_schema=True), nullable=False, default=TicketStatus.new)
    assigned_technician_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    appliance_id = Column(String, ForeignKey("appliances.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    appliance = relationship("Appliance", back_populates="tickets")
    service_history = relationship("ServiceHistory", back_populates="ticket")

    @property
    def ticket_id(self) -> int:
        return self.id
\n`\n\n## backend/app/models/expert.py\n\n`python\nfrom sqlalchemy import Column, Integer, String, event
from backend.app.database import Base

class Expert(Base):
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role_title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)

# Auto-seed default experts on table creation (for tests and initial db creation)
@event.listens_for(Expert.__table__, "after_create")
def insert_default_experts(target, connection, **kw):
    connection.execute(
        target.insert(),
        [
            {
                "name": "Engr. Muhammad Asif",
                "role_title": "Refrigerator Division Head",
                "department": "refrigerators",
                "phone": "+92-300-1112223",
                "email": "asif.refrigerator@pel.com.pk"
            },
            {
                "name": "Engr. Yasir Mahmood",
                "role_title": "AC Division Head",
                "department": "air_conditioners",
                "phone": "+92-300-4445556",
                "email": "yasir.ac@pel.com.pk"
            },
            {
                "name": "Engr. Fatima Shah",
                "role_title": "Washing Machine Division Head",
                "department": "washing_machines",
                "phone": "+92-300-7778889",
                "email": "fatima.wm@pel.com.pk"
            }
        ]
    )

\n`\n\n## backend/app/models/appliance.py\n\n`python\nimport uuid
from sqlalchemy import Column, String, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class Appliance(Base):
    __tablename__ = "appliances"

    id = Column(String, primary_key=True, default=lambda: f"PEL-APP-{uuid.uuid4().hex[:8].upper()}", index=True)
    user_id = Column(String, nullable=True)
    product_category = Column(String, nullable=False)
    model = Column(String, nullable=False)
    serial_number = Column(String, nullable=True)
    purchase_date = Column(Date, nullable=True)
    registered_at = Column(DateTime, server_default=func.now(), nullable=False)
    qr_data = Column(String, nullable=True) # Stored as a string (serialized json if needed)

    tickets = relationship("Ticket", back_populates="appliance")
    service_history = relationship("ServiceHistory", back_populates="appliance")
\n`\n\n## backend/app/models/part.py\n\n`python\nfrom sqlalchemy import Column, Integer, String, Float, event
from backend.app.database import Base

class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    appliance_type = Column(String, nullable=False)
    part_number = Column(String, nullable=False)
    description = Column(String, nullable=True)
    quantity_in_stock = Column(Integer, default=0, nullable=False)
    unit_price = Column(Float, nullable=False)


# Seed initial parts catalog using event listener
@event.listens_for(Part.__table__, "after_create")
def seed_parts(target, connection, **kw):
    connection.execute(
        target.insert(),
        [
            {
                "name": "Refrigerator Compressor",
                "category": "compressor",
                "appliance_type": "Refrigerator",
                "part_number": "PEL-REF-COMP-01",
                "description": "Inverter compressor for PEL refrigerators",
                "quantity_in_stock": 50,
                "unit_price": 15000.00
            },
            {
                "name": "Refrigerator Thermostat",
                "category": "thermostat",
                "appliance_type": "Refrigerator",
                "part_number": "PEL-REF-THERM-02",
                "description": "Temperature control thermostat for refrigerators",
                "quantity_in_stock": 120,
                "unit_price": 1800.00
            },
            {
                "name": "Refrigerator Condenser Fan",
                "category": "fan",
                "appliance_type": "Refrigerator",
                "part_number": "PEL-REF-FAN-03",
                "description": "12V DC condenser cooling fan",
                "quantity_in_stock": 80,
                "unit_price": 2500.00
            },
            {
                "name": "AC Compressor",
                "category": "compressor",
                "appliance_type": "AC",
                "part_number": "PEL-AC-COMP-04",
                "description": "1.5 Ton Rotary Compressor for ACs",
                "quantity_in_stock": 30,
                "unit_price": 22000.00
            },
            {
                "name": "AC Thermostat",
                "category": "thermostat",
                "appliance_type": "AC",
                "part_number": "PEL-AC-THERM-05",
                "description": "Digital thermostat sensor for PEL AC units",
                "quantity_in_stock": 150,
                "unit_price": 1200.00
            },
            {
                "name": "AC Remote Control",
                "category": "remote",
                "appliance_type": "AC",
                "part_number": "PEL-AC-REM-06",
                "description": "Universal remote control for PEL split ACs",
                "quantity_in_stock": 200,
                "unit_price": 1500.00
            },
            {
                "name": "Washing Machine Motor",
                "category": "motor",
                "appliance_type": "Washing Machine",
                "part_number": "PEL-WM-MOT-07",
                "description": "Direct drive inverter motor for washing machines",
                "quantity_in_stock": 25,
                "unit_price": 9500.00
            },
            {
                "name": "Washing Machine Drain Pump",
                "category": "pump",
                "appliance_type": "Washing Machine",
                "part_number": "PEL-WM-PUMP-08",
                "description": "Water discharge pump assembly",
                "quantity_in_stock": 90,
                "unit_price": 3200.00
            },
            {
                "name": "Washing Machine Inlet Valve",
                "category": "valve",
                "appliance_type": "Washing Machine",
                "part_number": "PEL-WM-VALVE-09",
                "description": "Dual solenoid water inlet valve",
                "quantity_in_stock": 110,
                "unit_price": 1600.00
            },
            {
                "name": "Water Dispenser Cooling Fan",
                "category": "fan",
                "appliance_type": "Water Dispenser",
                "part_number": "PEL-WD-FAN-10",
                "description": "High-speed cooling fan for water dispenser condenser",
                "quantity_in_stock": 65,
                "unit_price": 1100.00
            },
            {
                "name": "Water Dispenser Hot Tank",
                "category": "tank",
                "appliance_type": "Water Dispenser",
                "part_number": "PEL-WD-TANK-11",
                "description": "Stainless steel hot water heating tank",
                "quantity_in_stock": 40,
                "unit_price": 4500.00
            }
        ]
    )
\n`\n\n## backend/app/models/service_history.py\n\n`python\nfrom sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class ServiceHistory(Base):
    __tablename__ = "service_history"

    id = Column(Integer, primary_key=True, index=True)
    appliance_id = Column(String, ForeignKey("appliances.id", ondelete="CASCADE"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    technician_name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    photos_json = Column(JSON, nullable=True)
    completed_at = Column(DateTime, server_default=func.now(), nullable=False)

    appliance = relationship("Appliance", back_populates="service_history")
    ticket = relationship("Ticket", back_populates="service_history")
\n`\n\n## backend/app/modules/experts/router.py\n\n`python\nfrom fastapi import APIRouter, Depends, Query
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
\n`\n\n## backend/app/modules/appliances/router.py\n\n`python\nfrom fastapi import APIRouter, Depends, HTTPException, Query
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
\n`\n\n## backend/app/modules/parts/router.py\n\n`python\nfrom fastapi import APIRouter, Depends, HTTPException, Query
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
\n`\n\n## backend/app/modules/service_history/router.py\n\n`python\nfrom fastapi import APIRouter, Depends, HTTPException, Query
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
\n`\n\n