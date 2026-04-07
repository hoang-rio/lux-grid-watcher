"""Auth API routes: register, login, refresh, logout, profile, email verification, password reset."""
from __future__ import annotations

import asyncio
import hashlib
import re
import secrets
import uuid
from os import environ
from functools import partial
from logging import getLogger

import jwt as _jwt
from aiohttp.aiohttp import web
from dotenv import dotenv_values

from multi_tenant.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from multi_tenant.db import get_db_session
from multi_tenant import repository as repo
from multi_tenant.email_service import send_password_reset_email, send_verification_email
from multi_tenant.i18n import get_locale_from_accept_language, translate

logger = getLogger(__name__)
_config: dict = {**dotenv_values(".env"), **environ}

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
    """Decode Bearer token → (payload_dict, None) or (None, error_response)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, _err(request, "Unauthorized", 401)
    token = auth[7:]
    try:
        payload = decode_access_token(token)
        return payload, None
    except _jwt.ExpiredSignatureError:
        return None, _err(request, "Token expired", 401)
    except Exception:
        return None, _err(request, "Invalid token", 401)


def _session():
    """Return a new SQLAlchemy session (caller must close)."""
    return next(get_db_session())


def _user_dict(user) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "email_confirmed": user.email_confirmed,
    }


def _get_base_url(request: web.Request) -> str:
    xf_proto = request.headers.get("X-Forwarded-Proto", "")
    if xf_proto:
        scheme = xf_proto.split(",", 1)[0].strip().lower()
        if scheme not in {"http", "https"}:
            scheme = "https" if request.secure else "http"
    else:
        scheme = "https" if request.secure else "http"

    return f"{scheme}://{request.host}"


async def auth_config(_: web.Request) -> web.Response:
    auth_required = bool(_config.get("POSTGRES_DB_URL") or _config.get("DATABASE_URL"))
    return _ok(auth_required=auth_required)


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

async def register(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))

    if not _EMAIL_RE.match(email):
        return _err(request, "Invalid email address")
    if len(password) < 8:
        return _err(request, "Password must be at least 8 characters")

    session = _session()
    try:
        if repo.get_user_by_email(session, email):
            return _err(request, "Email already registered")

        pw_hash = hash_password(password)
        user = repo.create_user(session, email, pw_hash)

        # Create email verification token
        token_plain = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_plain.encode("utf-8")).hexdigest()
        repo.create_email_verification_token(session, user.id, token_hash)
        session.commit()

        # Send verification email in background (non-blocking)
        base_url = _get_base_url(request)
        loop = asyncio.get_event_loop()
        locale = _locale(request)
        loop.run_in_executor(None, partial(send_verification_email, email, token_plain, base_url, locale))

        return _ok(
            message=_msg(request, "Registration successful. Please check your email to verify your account."),
            user=_user_dict(user),
        )
    except Exception as exc:
        session.rollback()
        logger.error("register error: %s", exc)
        return _err(request, "Registration failed", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

async def login(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))

    session = _session()
    try:
        user = repo.get_user_by_email(session, email)
        if not user or not verify_password(password, user.password_hash):
            return _err(request, "Invalid email or password", 401)

        access_token = create_access_token(str(user.id), user.email)
        token_plain, token_hash, expires_at = create_refresh_token()
        repo.create_refresh_token_record(session, user.id, token_hash, expires_at)
        session.commit()

        return _ok(
            access_token=access_token,
            refresh_token=token_plain,
            user=_user_dict(user),
        )
    except Exception as exc:
        session.rollback()
        logger.error("login error: %s", exc)
        return _err(request, "Login failed", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------

async def refresh(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    token_plain = str(body.get("refresh_token", ""))
    if not token_plain:
        return _err(request, "refresh_token is required")

    session = _session()
    try:
        rt = repo.get_active_refresh_token(session, token_plain)
        if rt is None:
            return _err(request, "Invalid or expired refresh token", 401)

        user = repo.get_user_by_id(session, rt.user_id)
        if user is None:
            return _err(request, "User not found", 401)

        # Rotate tokens (revoke old, issue new)
        repo.revoke_refresh_token(session, rt)
        access_token = create_access_token(str(user.id), user.email)
        new_plain, new_hash, new_expires = create_refresh_token()
        repo.create_refresh_token_record(session, user.id, new_hash, new_expires)
        session.commit()

        return _ok(access_token=access_token, refresh_token=new_plain)
    except Exception as exc:
        session.rollback()
        logger.error("refresh error: %s", exc)
        return _err(request, "Token refresh failed", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

async def logout(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    try:
        body = await request.json()
    except Exception:
        body = {}

    token_plain = str(body.get("refresh_token", ""))

    session = _session()
    try:
        if token_plain:
            rt = repo.get_active_refresh_token(session, token_plain)
            if rt:
                repo.revoke_refresh_token(session, rt)
        else:
            # Revoke all sessions for this user
            repo.revoke_all_user_refresh_tokens(session, uuid.UUID(payload["sub"]))
        session.commit()
        return _ok(message=_msg(request, "Logged out"))
    except Exception as exc:
        session.rollback()
        logger.error("logout error: %s", exc)
        return _err(request, "Logout failed", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# GET /auth/profile
# ---------------------------------------------------------------------------

async def profile(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    session = _session()
    try:
        user = repo.get_user_by_id(session, uuid.UUID(payload["sub"]))
        if user is None:
            return _err(request, "User not found", 404)
        return _ok(user=_user_dict(user))
    except Exception as exc:
        logger.error("profile error: %s", exc)
        return _err(request, "Failed to load profile", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /auth/send-verify-email
# ---------------------------------------------------------------------------

async def send_verify_email(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    session = _session()
    try:
        user = repo.get_user_by_id(session, uuid.UUID(payload["sub"]))
        if user is None:
            return _err(request, "User not found", 404)
        if user.email_confirmed:
            return _ok(message=_msg(request, "Email already verified"))

        token_plain = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_plain.encode("utf-8")).hexdigest()
        repo.create_email_verification_token(session, user.id, token_hash)
        session.commit()

        base_url = _get_base_url(request)
        loop = asyncio.get_event_loop()
        locale = _locale(request)
        loop.run_in_executor(None, partial(send_verification_email, user.email, token_plain, base_url, locale))

        return _ok(message=_msg(request, "Verification email sent"))
    except Exception as exc:
        session.rollback()
        logger.error("send_verify_email error: %s", exc)
        return _err(request, "Failed to send verification email", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# GET /auth/verify-email?token=...
# ---------------------------------------------------------------------------

async def verify_email(request: web.Request) -> web.Response:
    base_url = _get_base_url(request)
    token_plain = request.rel_url.query.get("token", "")
    if not token_plain:
        return web.HTTPFound(f"{base_url}/?verified=0")

    session = _session()
    try:
        evt = repo.get_valid_email_verification_token(session, token_plain)
        if evt is None:
            return web.HTTPFound(f"{base_url}/?verified=0")

        user = repo.get_user_by_id(session, evt.user_id)
        if user is None:
            return web.HTTPFound(f"{base_url}/?verified=0")

        repo.use_email_verification_token(session, evt)
        repo.mark_user_email_confirmed(session, user)
        session.commit()

        return web.HTTPFound(f"{base_url}/?verified=1")
    except Exception as exc:
        session.rollback()
        logger.error("verify_email error: %s", exc)
        return web.HTTPFound(f"{base_url}/?verified=0")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /auth/forgot-password
# ---------------------------------------------------------------------------

async def forgot_password(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    email = str(body.get("email", "")).strip().lower()
    if not email:
        return _err(request, "email is required")

    # Always return success to avoid user enumeration
    session = _session()
    try:
        user = repo.get_user_by_email(session, email)
        if user and user.email_confirmed:
            token_plain = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token_plain.encode("utf-8")).hexdigest()
            repo.create_password_reset_token(session, user.id, token_hash)
            session.commit()

            base_url = _get_base_url(request)
            loop = asyncio.get_event_loop()
            locale = _locale(request)
            loop.run_in_executor(None, partial(send_password_reset_email, email, token_plain, base_url, locale))
        else:
            session.rollback()
    except Exception as exc:
        session.rollback()
        logger.error("forgot_password error: %s", exc)
    finally:
        session.close()

    return _ok(message=_msg(request, "If that email is registered and verified, a reset link has been sent."))


# ---------------------------------------------------------------------------
# POST /auth/reset-password
# ---------------------------------------------------------------------------

async def reset_password(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    token_plain = str(body.get("token", ""))
    new_password = str(body.get("new_password", ""))

    if not token_plain:
        return _err(request, "token is required")
    if len(new_password) < 8:
        return _err(request, "Password must be at least 8 characters")

    session = _session()
    try:
        prt = repo.get_valid_password_reset_token(session, token_plain)
        if prt is None:
            return _err(request, "Invalid or expired reset token")

        user = repo.get_user_by_id(session, prt.user_id)
        if user is None:
            return _err(request, "User not found", 404)

        pw_hash = hash_password(new_password)
        repo.update_user_password(session, user, pw_hash)
        repo.use_password_reset_token(session, prt)
        # Invalidate all existing sessions after password change
        repo.revoke_all_user_refresh_tokens(session, user.id)
        session.commit()

        return _ok(message=_msg(request, "Password reset successfully. Please log in with your new password."))
    except Exception as exc:
        session.rollback()
        logger.error("reset_password error: %s", exc)
        return _err(request, "Password reset failed", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# POST /auth/change-password
# ---------------------------------------------------------------------------

async def change_password(request: web.Request) -> web.Response:
    payload, err = _require_jwt(request)
    if err:
        return err

    try:
        body = await request.json()
    except Exception:
        return _err(request, "Invalid JSON body")

    current_password = str(body.get("current_password", ""))
    new_password = str(body.get("new_password", ""))

    if not current_password:
        return _err(request, "Current password is required")
    if len(new_password) < 8:
        return _err(request, "Password must be at least 8 characters")
    if current_password == new_password:
        return _err(request, "New password must be different from current password")

    session = _session()
    try:
        user = repo.get_user_by_id(session, uuid.UUID(payload["sub"]))
        if user is None:
            return _err(request, "User not found", 404)

        if not verify_password(current_password, user.password_hash):
            return _err(request, "Current password is incorrect", 401)

        pw_hash = hash_password(new_password)
        repo.update_user_password(session, user, pw_hash)
        # Invalidate all existing sessions after password change
        repo.revoke_all_user_refresh_tokens(session, user.id)
        session.commit()

        return _ok(message=_msg(request, "Password changed successfully. Please log in with your new password."))
    except Exception as exc:
        session.rollback()
        logger.error("change_password error: %s", exc)
        return _err(request, "Password change failed", 500)
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Route list
# ---------------------------------------------------------------------------

AUTH_ROUTES = [
    web.get("/auth/config", auth_config),
    web.post("/auth/register", register),
    web.post("/auth/login", login),
    web.post("/auth/refresh", refresh),
    web.post("/auth/logout", logout),
    web.get("/auth/profile", profile),
    web.post("/auth/send-verify-email", send_verify_email),
    web.get("/auth/verify-email", verify_email),
    web.post("/auth/forgot-password", forgot_password),
    web.post("/auth/reset-password", reset_password),
    web.post("/auth/change-password", change_password),
]
