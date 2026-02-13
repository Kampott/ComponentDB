import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv
import os

# Import LogBase from base.py (not log_database.py)
from app.db.base import LogBase
from app.models import log  # This imports APILog model

load_dotenv()

# Alembic Config
config = context.config
fileConfig(config.config_file_name)
target_metadata = LogBase.metadata  # Use LogBase instead of Base

# Loading environmental variables
ASYNC_LOG_DATABASE_URL = os.getenv("LOG_DATABASE_URL")
SYNC_LOG_DATABASE_URL = ASYNC_LOG_DATABASE_URL.replace("asyncpg", "psycopg2")


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    context.configure(
        url=SYNC_LOG_DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = create_async_engine(ASYNC_LOG_DATABASE_URL, poolclass=pool.NullPool)
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