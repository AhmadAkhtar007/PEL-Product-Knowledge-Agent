from sqlalchemy import Column, Integer, String, Float, event
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
