from sqlalchemy import Column, Date, DateTime, String, func
from sqlalchemy.orm import relationship

from backend.app.database import Base


class Appliance(Base):
    __tablename__ = "appliances"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=True)
    product_category = Column(String, nullable=False)
    model = Column(String, nullable=False)
    serial_number = Column(String, nullable=True)
    purchase_date = Column(Date, nullable=True)
    registered_at = Column(DateTime, server_default=func.now(), nullable=False)
    qr_data = Column(String, nullable=True)

    tickets = relationship("Ticket", back_populates="appliance")
    service_history = relationship(
        "ServiceHistory",
        back_populates="appliance",
        cascade="all, delete-orphan",
    )
