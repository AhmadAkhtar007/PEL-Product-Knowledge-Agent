from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.app.config import settings

# Create async engine
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Create async session factory
async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Declarative base for SQLAlchemy models
Base = declarative_base()

# Dependency to get active async database session
async def get_db_session():
    async with async_session() as session:
        yield session
