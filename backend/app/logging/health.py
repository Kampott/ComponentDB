import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.database import async_log_session

async def check_log_db_health() -> bool:
    """Check if log database is accessible"""
    try:
        async with async_log_session() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[health] Log DB check failed: {e}")
        return False