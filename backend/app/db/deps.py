from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_async_session

# Use it as a dependency in your endpoints
async def get_db() -> AsyncSession:
    async for session in get_async_session():
        yield session