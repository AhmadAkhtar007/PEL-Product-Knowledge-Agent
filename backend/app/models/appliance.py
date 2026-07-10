import uuid
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
