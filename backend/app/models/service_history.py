from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
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
