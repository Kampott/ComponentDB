import asyncio
import json
from app.db.database import get_async_session
from app.crud.auth.permissions import get_permissions, create_permission
from app.schemas.auth import PermissionCreate
import os


BASE_DIR = os.path.dirname(__file__)
PERMISSIONS_FILE = os.path.join(BASE_DIR, "permissions.json")

async def seed_permissions():
    async for session in get_async_session():
        # load perms from file
        with open(PERMISSIONS_FILE, "r") as f:
            permissions_data = json.load(f)

        for perm_data in permissions_data.get("permissions", []):
            existing_perms = await get_permissions(session, name=perm_data["name"])
            if not existing_perms:
                await create_permission(session, PermissionCreate(**perm_data))

        await session.commit()
        print("Permissions seeded successfully")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
