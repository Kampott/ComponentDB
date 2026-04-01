from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.base import LogBase

DATABASE_URL = settings.DATABASE_URL
LOG_DATABASE_URL = settings.LOG_DATABASE_URL


#Starting asynchronous SQLAlchemy engine
engine = create_async_engine(DATABASE_URL, future=True, echo=False)
log_engine = create_async_engine(LOG_DATABASE_URL, future=True, echo=False)

#Object to connect with the DB, using the async session
async_session = async_sessionmaker(engine, expire_on_commit=False)
#setting up async session for logging
async_log_session = async_sessionmaker(log_engine, expire_on_commit=False)

AsyncSessionLocal = async_session

# For fastapi: makes session through endpoints
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

# For logging with fastapi
async def get_async_log_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_log_session() as session:
        yield session
