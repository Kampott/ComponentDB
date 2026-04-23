import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy import pool
from alembic import context

from base import Base
from models import auth, core, events, integrity
from settings import get_required_env, load_core_env

load_core_env()

# Alembic Config
config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

# Loading environmental variables
ASYNC_DATABASE_URL = get_required_env("DATABASE_URL")
SYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("asyncpg", "psycopg2")
SUPERUSER_EMAIL = get_required_env("SUPERUSER_EMAIL")
SUPERUSER_PASSWORD = get_required_env("SUPERUSER_PASSWORD")


def process_revision_directives(migration_context, revision, directives):
    if not getattr(config.cmd_opts, "autogenerate", False):
        return

    if not directives:
        return

    script = directives[0]
    if script.upgrade_ops.is_empty():
        directives[:] = []
        print("Изменений в основной схеме нет. Ревизия не создана.")


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    context.configure(
        url=SYNC_DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        process_revision_directives=process_revision_directives,
    )
    with context.begin_transaction():
        context.run_migrations()



async def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = create_async_engine(ASYNC_DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

def do_run_migrations(connection: AsyncConnection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        process_revision_directives=process_revision_directives,
    )
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
