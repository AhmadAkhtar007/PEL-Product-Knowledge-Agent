from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
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
