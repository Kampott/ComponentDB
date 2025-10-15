import asyncio
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.database import async_session
from app.logger import logger
from app.models.auth import User

# конфигурация из переменных окружения
SUPERUSER_EMAIL = settings.superuser_email
SUPERUSER_PASS = settings.superuser_password

async def create_superuser():
    session: AsyncSession | None = None
    async with async_session() as session:
        logger.debug("Создание async_session")
        try:
            result = await session.execute(select(User).filter_by(email=SUPERUSER_EMAIL))
            user = result.scalar_one_or_none()
            if user:
                logger.warning("Суперпользователь уже существует")
                return

            logger.debug("Получение хэша пароля")
            hashed_password = get_password_hash(SUPERUSER_PASS)

            logger.info("Создание пользователя...")
            user = User(
                email=SUPERUSER_EMAIL,
                password_hash=hashed_password,
                is_active=True,
            )
            session.add(user)
            await session.commit()
            logger.info("Суперпользователь создан: %s", SUPERUSER_EMAIL)
        finally:
            await session.close()


if __name__ == "__main__":
    asyncio.run(create_superuser())
