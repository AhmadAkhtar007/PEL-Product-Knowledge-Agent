from sqlalchemy import Column, Integer, String

from backend.app.database import Base


class Expert(Base):
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role_title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
