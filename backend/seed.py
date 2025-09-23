import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import async_session
from app.models.auth import User, Role
from app.core.security import get_password_hash
from app.core.config import settings


async def seed_superuser():
    async with async_session() as session:
        # проверяем, есть ли роль superuser
        result = await session.execute(select(Role).where(Role.name == "superuser"))
        role = result.scalars().first()
        if not role:
            role = Role(name="superuser", description="Full access")
            session.add(role)
            await session.commit()
            await session.refresh(role)

        # проверяем, есть ли юзер
        result = await session.execute(select(User).where(User.email == settings.SUPERUSER_EMAIL))
        user = result.scalars().first()

        if not user:
            user = User(
                id=uuid.uuid4(),
                email=settings.SUPERUSER_EMAIL,
                password_hash=get_password_hash(settings.SUPERUSER_PASSWORD),
                is_active=True
            )
            user.roles.append(role)
            session.add(user)
            await session.commit()
            print(f"Created superuser: {user.email}")
        else:
            print("Superuser already exists")


if __name__ == "__main__":
    asyncio.run(seed_superuser())
