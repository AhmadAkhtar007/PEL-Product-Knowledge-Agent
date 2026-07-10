from sqlalchemy import Column, Integer, String, event
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

