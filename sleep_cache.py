import threading
from typing import Optional


ALLOWED_SLEEP_TIME_VALUES = {3, 5, 10, 15, 30}
ALLOWED_SLEEP_TIME_SETTING_VALUES = {str(value) for value in ALLOWED_SLEEP_TIME_VALUES}

_sleep_time_cache: dict[str, int] = {}
_sleep_time_cache_lock = threading.Lock()
_enabled: Optional[bool] = None


def set_enabled(enabled: bool) -> None:
    """Enable or disable caching. When disabled, cache is cleared and
    get/set become no-ops.
    """
    global _enabled
    _enabled = bool(enabled)
    if not _enabled:
        with _sleep_time_cache_lock:
            _sleep_time_cache.clear()


def _is_enabled() -> bool:
    global _enabled
    if _enabled is None:
        import os
        _enabled = bool(os.environ.get("POSTGRES_DB_URL") or os.environ.get("DATABASE_URL"))
    return _enabled


def normalize_sleep_time(value, fallback: int = 30) -> int:
    try:
        parsed = int(value)
    except Exception:
        parsed = fallback
    return parsed if parsed in ALLOWED_SLEEP_TIME_VALUES else fallback


def get_cached_sleep_time(user_id: str) -> Optional[int]:
    if not _is_enabled():
        return None
    with _sleep_time_cache_lock:
        return _sleep_time_cache.get(str(user_id))


def set_cached_sleep_time(user_id: str, value, fallback: int = 30) -> int:
    normalized = normalize_sleep_time(value, fallback)
    if not _is_enabled():
        return normalized
    with _sleep_time_cache_lock:
        _sleep_time_cache[str(user_id)] = normalized
    return normalized


def clear_sleep_time_cache(user_id: str | None = None) -> None:
    if not _is_enabled():
        return
    with _sleep_time_cache_lock:
        if user_id is None:
            _sleep_time_cache.clear()
            return
        _sleep_time_cache.pop(str(user_id), None)
