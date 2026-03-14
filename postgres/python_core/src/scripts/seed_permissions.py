import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from models import Permission
from scripts.db import get_session_factory


PERMISSIONS_FILE = Path(__file__).with_name("permissions.json")


async def seed_permissions() -> None:
    permissions_data = json.loads(PERMISSIONS_FILE.read_text())
    session_factory = get_session_factory()

    async with session_factory() as session:
        for perm_data in permissions_data.get("permissions", []):
            existing_permission = await session.scalar(
                select(Permission).where(Permission.name == perm_data["name"])
            )
            if existing_permission is None:
                session.add(Permission(**perm_data))

        await session.commit()
        print("Permissions seeded successfully")


if __name__ == "__main__":
    asyncio.run(seed_permissions())
