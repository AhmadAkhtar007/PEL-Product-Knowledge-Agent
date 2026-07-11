from sqlalchemy import Column, Float, Integer, String

from backend.app.database import Base


class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    appliance_type = Column(String, nullable=False)
    part_number = Column(String, nullable=False)
    description = Column(String, nullable=True)
    quantity_in_stock = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
