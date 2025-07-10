# backend/app/api/deps.py
from app.db.database import get_async_session
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Use it as a dependency in your endpoints
def get_db() -> AsyncSession:
    return Depends(get_async_session)