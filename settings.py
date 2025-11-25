import sqlite3

settings = {}

def load_settings(db_conn: sqlite3.Connection):
    cursor = db_conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    for key, value in rows:
        settings[key] = value
    cursor.close()

def save_setting(key: str, value, db_conn: sqlite3.Connection):
    cursor = db_conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    db_conn.commit()
    settings[key] = str(value)
    cursor.close()

def get_setting(key: str, default=None):
    return settings.get(key, default)
