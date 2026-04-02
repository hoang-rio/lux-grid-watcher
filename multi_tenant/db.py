from __future__ import annotations

from os import environ
from typing import Generator

from dotenv import dotenv_values
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


config: dict = {**dotenv_values(".env"), **environ}


def get_database_url() -> str:
    """Return SQLAlchemy database URL for PostgreSQL multi-tenant storage."""
    db_url = config.get("POSTGRES_DB_URL") or config.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError(
            "Missing POSTGRES_DB_URL (or DATABASE_URL). "
            "Please configure PostgreSQL connection in .env"
        )
    return db_url


_engine: Engine | None = None
_SessionFactory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(
            get_database_url(),
            pool_pre_ping=True,
            future=True,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
    return _SessionFactory


def get_db_session() -> Generator[Session, None, None]:
    """Yield a DB session and close it safely."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
