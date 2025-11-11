import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from app.db.database import get_async_session
from app.models.auth import User, Role, Permission, UserRole, RolePermission
from app.core.security import get_password_hash
from app.crud.auth.users import create_user
from app.schemas.auth import UserCreate

load_dotenv()

SUPERUSER_EMAIL = os.getenv("SUPERUSER_EMAIL", "root@example.com")
SUPERUSER_PASSWORD = os.getenv("SUPERUSER_PASSWORD", "changeme")


async def seed_superuser():
    async for session in get_async_session():
        result = await session.execute(select(User).where(User.email == SUPERUSER_EMAIL))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"Superuser '{SUPERUSER_EMAIL}' already exists.")
            return



        result = await session.execute(select(Permission).where(Permission.name == "SUPER_PERMISSION"))
        super_permission = result.scalar_one_or_none()
        if not super_permission:
            super_permission = Permission(
                name="SUPER_PERMISSION",
                description="Has all permissions, full access."
            )
            session.add(super_permission)
            await session.commit()
            await session.refresh(super_permission)
            print("Super permission created")


        result = await session.execute(select(Role).where(Role.name == "SUPER_USER"))
        super_role = result.scalar_one_or_none()
        if not super_role:
            super_role = Role(
                name="SUPER_USER",
                description="Has all permissions, full access."
            )
            session.add(super_role)
            await session.commit()
            await session.refresh(super_role)
            print("Created SUPER_USER role.")
        
        existing_role_perm = await session.scalar(
            select(RolePermission).where(
                RolePermission.role_id == super_role.id,
                RolePermission.permission_id == super_permission.id
            )
        )

        if not existing_role_perm:
            role_permission = RolePermission(
                role_id=super_role.id,
                permission_id=super_permission.id
            )
            session.add(role_permission)
            await session.commit()
            await session.refresh(role_permission)
            print("Linked SUPER_USER role to SUPER_PERMISSION.")
        else:
            print("SUPER_USER role already linked to SUPER_PERMISSION.")
        

        user_in = UserCreate(email=SUPERUSER_EMAIL, password=SUPERUSER_PASSWORD)
        new_user = await create_user(session, user_in)
        print(f"Created superuser '{SUPERUSER_EMAIL}'.")
        user_role = UserRole(user_id=new_user.id, role_id=super_role.id)
        session.add(user_role)
        await session.commit()

        print("Linked SUPER_USER role to superuser.")

        print("Superuser created.")



if __name__ == "__main__":
    asyncio.run(seed_superuser())
