"""Inverter management API routes: list, create, delete."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import uuid
from logging import getLogger

import jwt as _jwt
from aiohttp.aiohttp import web

from multi_tenant.auth import decode_access_token
from multi_tenant.db import get_db_session
from multi_tenant import repository as repo
from multi_tenant.i18n import get_locale_from_accept_language, translate
import settings

logger = getLogger(__name__)

INVERTER_OFFLINE_TIMEOUT = timedelta(minutes=10)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(**kwargs) -> web.Response:
    return web.json_response({"success": True, **kwargs})


def _locale(request: web.Request) -> str:
    return get_locale_from_accept_language(request.headers.get("Accept-Language"))


def _msg(request: web.Request, message: str) -> str:
    return translate(message, _locale(request))


def _err(request: web.Request, message: str, status: int = 400) -> web.Response:
    return web.json_response(
        {"success": False, "message": _msg(request, message)},
        status=status,
    )


def _require_jwt(request: web.Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, _err(request, "Unauthorized", 401)
    try:
        payload = decode_access_token(auth[7:])
        return payload, None
    except _jwt.ExpiredSignatureError:
        return None, _err(request, "Token expired", 401)
    except Exception:
        return None, _err(request, "Invalid token", 401)


def _session():
    return next(get_db_session())


def _is_inverter_online(last_communication_at: datetime | None) -> bool:
    if last_communication_at is None:
        return False
    return (datetime.utcnow() - last_communication_at) <= INVERTER_OFFLINE_TIMEOUT


def _to_utc_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat()


def _inverter_dict(inv, last_communication_at: datetime | None = None) -> dict:
    return {
        "id": str(inv.id),
        "name": inv.name,
        "dongle_serial": inv.dongle_serial,
        "invert_serial": inv.invert_serial or "",
        "is_active": inv.is_active,
        "created_at": _to_utc_iso(inv.created_at),
        "last_communication_at": _to_utc_iso(last_communication_at),
        "is_online": _is_inverter_online(last_communication_at),
    }


# ---------------------------------------------------------------------------
# GET /inverters
# ---------------------------------------------------------------------------

async def list_inverters(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    session = _session()
    try:
        inverters = repo.get_inverters_by_user(session, uuid.UUID(payload["sub"]))
        inverter_items = []
        for inverter in inverters:
            latest_state = repo.get_inverter_latest_state(session, inverter.id)
            last_communication_at = latest_state.updated_at if latest_state else None
            inverter_items.append(_inverter_dict(inverter, last_communication_at))
        return _ok(inverters=inverter_items)
    except Exception as exc:
        logger.error("list_inverters error: %s", exc)
        return _err(request, "Failed to load inverters", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /inverters
# ---------------------------------------------------------------------------

async def create_inverter(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    name = str(body.get("name", "")).strip()
    dongle_serial = str(body.get("dongle_serial", "")).strip()
    invert_serial = str(body.get("invert_serial", "")).strip() or None

    if not dongle_serial:
        return _err(request, "dongle_serial is required")
    if not name:
        name = dongle_serial

    session = _session()
    try:
        max_inverters = settings.get_max_inverters_system()
        if max_inverters > 0:
            current_count = repo.get_active_inverters_count(session)
            if current_count >= max_inverters:
                return _err(request, "Maximum inverters reached")

        # Check uniqueness
        if repo.get_inverter_by_dongle_serial(session, dongle_serial):
            return _err(request, "dongle_serial already registered")
        if invert_serial and repo.get_inverter_by_invert_serial(session, invert_serial):
            return _err(request, "invert_serial already registered")

        inverter = repo.create_inverter(
            session,
            user_id=uuid.UUID(payload["sub"]),
            name=name,
            dongle_serial=dongle_serial,
            invert_serial=invert_serial,
        )
        session.commit()
        return _ok(inverter=_inverter_dict(inverter))
    except Exception as exc:
        session.rollback()
        logger.error("create_inverter error: %s", exc)
        return _err(request, "Failed to create inverter", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# DELETE /inverters/{id}
# ---------------------------------------------------------------------------

async def delete_inverter(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    inverter_id_str = request.match_info.get("id", "")
    try:
        inverter_id = uuid.UUID(inverter_id_str)
    except ValueError:
        return _err(request, "Invalid inverter id")

    session = _session()
    try:
        inverter = repo.get_inverter_by_id_and_user(session, inverter_id, uuid.UUID(payload["sub"]))
        if inverter is None:
            return _err(request, "Inverter not found", 404)
        repo.delete_inverter_hard(session, inverter)
        session.commit()
        return _ok(message=_msg(request, "Inverter removed"))
    except Exception as exc:
        session.rollback()
        logger.error("delete_inverter error: %s", exc)
        return _err(request, "Failed to remove inverter", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# PATCH /inverters/{id}
# ---------------------------------------------------------------------------

async def update_inverter(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    inverter_id_str = request.match_info.get("id", "")
    try:
        inverter_id = uuid.UUID(inverter_id_str)
    except ValueError:
        return _err(request, "Invalid inverter id")

    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    name = str(body.get("name", "")).strip()
    invert_serial = str(body.get("invert_serial", "")).strip() or None

    if not name:
        return _err(request, "name is required")

    session = _session()
    try:
        user_id = uuid.UUID(payload["sub"])
        inverter = repo.get_inverter_by_id_and_user(session, inverter_id, user_id)
        if inverter is None:
            return _err(request, "Inverter not found", 404)

        if invert_serial:
            existed = repo.get_inverter_by_invert_serial(session, invert_serial)
            if existed is not None and existed.id != inverter.id:
                return _err(request, "invert_serial already registered")

        updated = repo.update_inverter(
            session,
            inverter,
            name=name,
            invert_serial=invert_serial,
        )
        session.commit()
        latest_state = repo.get_inverter_latest_state(session, updated.id)
        last_communication_at = latest_state.updated_at if latest_state else None
        return _ok(inverter=_inverter_dict(updated, last_communication_at))
    except Exception as exc:
        session.rollback()
        logger.error("update_inverter error: %s", exc)
        return _err(request, "Failed to update inverter", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Route list
# ---------------------------------------------------------------------------

INVERTER_ROUTES = [
    web.get("/inverters", list_inverters),
    web.post("/inverters", create_inverter),
    web.patch("/inverters/{id}", update_inverter),
    web.delete("/inverters/{id}", delete_inverter),
]
