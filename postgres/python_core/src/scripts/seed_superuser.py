import asyncio
from sqlalchemy import select

from models import Permission, Role, RolePermission, User, UserRole
from scripts.db import get_session_factory
from scripts.security import get_password_hash
from settings import get_required_env

SUPERUSER_EMAIL = get_required_env("SUPERUSER_EMAIL")
SUPERUSER_PASSWORD = get_required_env("SUPERUSER_PASSWORD")


async def seed_superuser() -> None:
    session_factory = get_session_factory()

    async with session_factory() as session:
        existing_user = await session.scalar(select(User).where(User.email == SUPERUSER_EMAIL))
        if existing_user:
            print(f"Superuser '{SUPERUSER_EMAIL}' already exists.")
            return

        super_permission = await session.scalar(
            select(Permission).where(Permission.name == "SUPER_PERMISSION")
        )
        if super_permission is None:
            super_permission = Permission(
                name="SUPER_PERMISSION",
                description="Has all permissions, full access.",
            )
            session.add(super_permission)
            await session.flush()
            print("Super permission created")

        super_role = await session.scalar(select(Role).where(Role.name == "SUPER_USER"))
        if super_role is None:
            super_role = Role(
                name="SUPER_USER",
                description="Has all permissions, full access.",
            )
            session.add(super_role)
            await session.flush()
            print("Created SUPER_USER role.")

        existing_role_perm = await session.scalar(
            select(RolePermission).where(
                RolePermission.role_id == super_role.id,
                RolePermission.permission_id == super_permission.id,
            )
        )
        if existing_role_perm is None:
            session.add(
                RolePermission(
                    role_id=super_role.id,
                    permission_id=super_permission.id,
                )
            )
            print("Linked SUPER_USER role to SUPER_PERMISSION.")
        else:
            print("SUPER_USER role already linked to SUPER_PERMISSION.")

        new_user = User(
            email=SUPERUSER_EMAIL,
            password_hash=get_password_hash(SUPERUSER_PASSWORD),
            is_active=True,
        )
        session.add(new_user)
        await session.flush()
        print(f"Created superuser '{SUPERUSER_EMAIL}'.")

        session.add(UserRole(user_id=new_user.id, role_id=super_role.id))
        await session.commit()
        print("Linked SUPER_USER role to superuser.")
        print("Superuser created.")


if __name__ == "__main__":
    asyncio.run(seed_superuser())
