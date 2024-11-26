import sqlite3
import time
import logging

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

MIGRATIONS_SQL = [
    "CREATE TABLE IF NOT EXISTS migration (id INTEGER PRIMARY KEY, applied_at TEXT)",
    "CREATE TABLE IF NOT EXISTS daily_chart (id VARCHAR PRIMARY KEY, datetime TEXT, pv INTEGER, battery INTEGER, grid INTEGER, consumption INTEGER, soc INTERGER)",
]
def execute_migration_sql(id: int, sql: str, cursor: sqlite3.Cursor) -> None:
    global logger
    logger.info(f"Executing sql: \"{sql}\"")
    cursor.execute(sql)
    cursor.execute(
        "INSERT INTO migration (id, applied_at) VALUES (?, ?)",
        (id, time.time()),
    )

def run_migration(db_connection: sqlite3.Connection | None = None, _logger: logging.Logger | None = None) -> None:
    global logger
    if _logger is not None:
        logger = _logger
    if db_connection is None:
        from dotenv import dotenv_values
        from os import environ
        config: dict = {
            **dotenv_values(".env"),
            **environ
        }
        db_name = config["DB_NAME"]
        conn = sqlite3.connect(db_name)
    else:
        conn = db_connection
    logger.info("Running migration")
    cursor = conn.cursor()
    has_migration_table = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migration'"
    ).fetchone()
    if has_migration_table is None:
        logger.info("Start migration")
        for id, sql in enumerate(MIGRATIONS_SQL, start=1):
            execute_migration_sql(id, sql, cursor)
        conn.commit()
    else:
        last_migration = cursor.execute(
            "SELECT id, applied_at FROM migration ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if last_migration is not None:
            last_id, _ = last_migration
            if len(MIGRATIONS_SQL) <= last_id:
                logger.info("Nothing to migrate")
                return
            next_id = last_id + 1
            logger.info(f"Migrating since {next_id}")
            pending_migrations = MIGRATIONS_SQL[last_id:]
            for id, sql in enumerate(pending_migrations, start=next_id):
                execute_migration_sql(id, sql, cursor)
            conn.commit()
    cursor.close()
    conn.close()

if __name__ == '__main__':
    run_migration()