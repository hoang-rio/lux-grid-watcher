import sqlite3

settings = {}
config = {}

def init_config(_config: dict):
    """Initialize config from .env or environment variables."""
    global config
    config = _config

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
    """Get setting from DB. Returns default if not found."""
    return settings.get(key, default)

# Getter functions for settings - same logic as original app.py
# Priority: DB settings -> config (.env) -> hardcoded default
def get_abnormal_detection_enabled():
    return get_setting("ABNORMAL_DETECTION_ENABLED", config.get("ABNORMAL_DETECTION_ENABLED", "true")).lower() == "true"

def get_abnormal_check_cooldown_hours():
    return int(get_setting("ABNORMAL_CHECK_COOLDOWN_HOURS", config.get("ABNORMAL_CHECK_COOLDOWN_HOURS", 3)))

def get_abnormal_usage_count():
    return 32 * get_abnormal_check_cooldown_hours()

def get_normal_min_usage_count():
    return 5 * get_abnormal_check_cooldown_hours()

def get_abnormal_min_power():
    return int(get_setting("ABNORMAL_MIN_POWER", config.get("ABNORMAL_MIN_POWER", 900)))

def get_off_grid_warning_power():
    return int(get_setting("OFF_GRID_WARNING_POWER", config.get("OFF_GRID_WARNING_POWER", 2200)))

def get_off_grid_warning_soc():
    return int(get_setting("OFF_GRID_WARNING_SOC", config.get("OFF_GRID_WARNING_SOC", 87)))

def get_max_battery_power():
    return int(get_setting("MAX_BATTERY_POWER", config.get("MAX_BATTERY_POWER", 3000)))

def get_off_grid_warning_enabled():
    return get_setting("OFF_GRID_WARNING_ENABLED", config.get("OFF_GRID_WARNING_ENABLED", "true")).lower() == "true"

def get_battery_full_notify_enabled():
    return get_setting("BATTERY_FULL_NOTIFY_ENABLED", config.get("BATTERY_FULL_NOTIFY_ENABLED", "true")).lower() == "true"

def get_battery_full_notify_body():
    return get_setting("BATTERY_FULL_NOTIFY_BODY", config.get("BATTERY_FULL_NOTIFY_BODY", "Pin đã sạc đầy 100%. Có thể bật bình nóng lạnh để tối ưu sử dụng."))

def get_abnormal_notify_body():
    return get_setting("ABNORMAL_NOTIFY_BODY", config.get("ABNORMAL_NOTIFY_BODY", "Tiêu thụ điện bất thường, vui lòng kiểm tra xem vòi nước đã khoá chưa."))
