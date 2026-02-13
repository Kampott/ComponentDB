import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession
from sqlalchemy.future import select
from passlib.hash import bcrypt
import uuid
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv
from app.db.base import Base
from app.models import core
from app.models import auth
import os

load_dotenv()

# Alembic Config
config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

# Loading environmental variables
ASYNC_DATABASE_URL = os.getenv("DATABASE_URL")
SYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("asyncpg", "psycopg2")
SUPERUSER_EMAIL = os.getenv("SUPERUSER_EMAIL", "root@example.com")
SUPERUSER_PASSWORD = os.getenv("SUPERUSER_PASSWORD", "changeme")


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    context.configure(
        url=SYNC_DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()



async def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = create_async_engine(ASYNC_DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

def do_run_migrations(connection: AsyncConnection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())