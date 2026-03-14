from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from settings import get_required_env

_engine = None
_session_factory = None


def get_database_url() -> str:
    return get_required_env("DATABASE_URL")


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory

    if _session_factory is None:
        _engine = create_async_engine(get_database_url(), future=True, echo=False)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)

    return _session_factory
