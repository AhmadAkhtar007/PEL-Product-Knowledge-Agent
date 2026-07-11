import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from backend.app.database import Base


class TicketStatus(str, enum.Enum):
    new = "new"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


TicketStatusEnum = Enum(
    TicketStatus,
    name="ticket_status_enum",
    values_callable=lambda enum_cls: [status.value for status in enum_cls],
    native_enum=True,
    create_type=False,
)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    appliance_model = Column(String, nullable=False)
    issue_description = Column(String, nullable=False)
    status = Column(
        TicketStatusEnum,
        nullable=False,
        default=TicketStatus.new,
        server_default=TicketStatus.new.value,
    )
    assigned_technician_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    appliance_id = Column(
        String,
        ForeignKey("appliances.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    appliance = relationship("Appliance", back_populates="tickets")
    service_history = relationship("ServiceHistory", back_populates="ticket")
