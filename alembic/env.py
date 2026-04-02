from __future__ import annotations

from logging.config import fileConfig
from os import environ

from alembic import context
from dotenv import dotenv_values
from sqlalchemy import engine_from_config, pool

from multi_tenant.models import Base


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


target_metadata = Base.metadata


def _database_url() -> str:
    env_config: dict = {**dotenv_values(".env"), **environ}
    return (
        env_config.get("POSTGRES_DB_URL")
        or env_config.get("DATABASE_URL")
        or config.get_main_option("sqlalchemy.url")
    )


def run_migrations_offline() -> None:
    url = _database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = _database_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
