from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings
from app.db.base import Base
import os

DATABASE_URL = settings.DATABASE_URL


#Starting asynchronous SQLAlchemy engine
engine = create_async_engine(DATABASE_URL, future=True, echo=False)

#Object to connect with the DB, using the async session
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

AsyncSessionLocal = async_session

# For fastapi: makes session through endpoints
async def get_async_session() -> AsyncSession:
    async with async_session() as session:
        yield session