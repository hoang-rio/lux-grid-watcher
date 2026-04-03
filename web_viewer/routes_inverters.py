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

logger = getLogger(__name__)

CORS = {"Access-Control-Allow-Origin": "*"}
INVERTER_OFFLINE_TIMEOUT = timedelta(minutes=10)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(**kwargs) -> web.Response:
    return web.json_response({"success": True, **kwargs}, headers=CORS)


def _err(message: str, status: int = 400) -> web.Response:
    return web.json_response({"success": False, "message": message}, status=status, headers=CORS)


def _require_jwt(request: web.Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, _err("Unauthorized", 401)
    try:
        payload = decode_access_token(auth[7:])
        return payload, None
    except _jwt.ExpiredSignatureError:
        return None, _err("Token expired", 401)
    except Exception:
        return None, _err("Invalid token", 401)


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
        "invert_serial": inv.invert_serial,
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
        return _err("Failed to load inverters", 500)
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
        return _err("Invalid JSON body")

    name = str(body.get("name", "")).strip()
    dongle_serial = str(body.get("dongle_serial", "")).strip()
    invert_serial = str(body.get("invert_serial", "")).strip()

    if not dongle_serial:
        return _err("dongle_serial is required")
    if not invert_serial:
        return _err("invert_serial is required")
    if not name:
        name = dongle_serial

    session = _session()
    try:
        # Check uniqueness
        if repo.get_inverter_by_dongle_serial(session, dongle_serial):
            return _err("dongle_serial already registered")
        if repo.get_inverter_by_invert_serial(session, invert_serial):
            return _err("invert_serial already registered")

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
        return _err("Failed to create inverter", 500)
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
        return _err("Invalid inverter id")

    session = _session()
    try:
        inverter = repo.get_inverter_by_id_and_user(session, inverter_id, uuid.UUID(payload["sub"]))
        if inverter is None:
            return _err("Inverter not found", 404)
        repo.delete_inverter_hard(session, inverter)
        session.commit()
        return _ok(message="Inverter removed")
    except Exception as exc:
        session.rollback()
        logger.error("delete_inverter error: %s", exc)
        return _err("Failed to remove inverter", 500)
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
        return _err("Invalid inverter id")

    try:
        body = await request.json()
    except Exception:
        return _err("Invalid JSON body")

    name = str(body.get("name", "")).strip()
    invert_serial = str(body.get("invert_serial", "")).strip()

    if not name:
        return _err("name is required")
    if not invert_serial:
        return _err("invert_serial is required")

    session = _session()
    try:
        user_id = uuid.UUID(payload["sub"])
        inverter = repo.get_inverter_by_id_and_user(session, inverter_id, user_id)
        if inverter is None:
            return _err("Inverter not found", 404)

        existed = repo.get_inverter_by_invert_serial(session, invert_serial)
        if existed is not None and existed.id != inverter.id:
            return _err("invert_serial already registered")

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
        return _err("Failed to update inverter", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# CORS preflight
# ---------------------------------------------------------------------------

async def _cors_options(_: web.Request) -> web.Response:
    return web.Response(
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
    )


# ---------------------------------------------------------------------------
# Route list
# ---------------------------------------------------------------------------

INVERTER_ROUTES = [
    web.get("/inverters", list_inverters),
    web.post("/inverters", create_inverter),
    web.patch("/inverters/{id}", update_inverter),
    web.delete("/inverters/{id}", delete_inverter),
    web.options("/inverters", _cors_options),
    web.options("/inverters/{id}", _cors_options),
]
