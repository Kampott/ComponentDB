import asyncio

from scripts.seed_permissions import seed_permissions
from scripts.seed_superuser import seed_superuser


async def init_db() -> None:
    await seed_permissions()
    await seed_superuser()


if __name__ == "__main__":
    asyncio.run(init_db())
