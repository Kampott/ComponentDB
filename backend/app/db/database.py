from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.db.base import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL")


#Starting asynchronous SQLAlchemy engine
engine = create_async_engine(DATABASE_URL, echo=True)

#Object to connect with the DB, using the async session
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


# For fastapi: makes session through endpoints
async def get_async_session() -> AsyncSession:
    async with async_session() as session:
        yield session