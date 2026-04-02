from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from os import environ

import jwt
from dotenv import dotenv_values
from passlib.context import CryptContext


# Prefer pbkdf2_sha256 to avoid runtime issues caused by bcrypt backend
# incompatibilities in some environments. Keep bcrypt schemes for compatibility
# with existing hashes.
_pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"], deprecated="auto"
)
_pwd_fallback_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
_config: dict = {**dotenv_values(".env"), **environ}


def _required_env(key: str) -> str:
    value = _config.get(key)
    if not value:
        raise RuntimeError(f"Missing required config: {key}")
    return value


def get_jwt_secret() -> str:
    return _required_env("JWT_SECRET")


def get_access_token_exp_minutes() -> int:
    return int(_config.get("JWT_ACCESS_EXPIRE_MINUTES", "15"))


def get_refresh_token_exp_days() -> int:
    return int(_config.get("JWT_REFRESH_EXPIRE_DAYS", "30"))


def hash_password(password: str) -> str:
    try:
        return _pwd_context.hash(password)
    except ValueError as exc:
        # Extra safety for environments where bcrypt backend still enforces
        # 72-byte password limit despite bcrypt_sha256 being configured.
        if "72 bytes" in str(exc):
            digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
            try:
                return _pwd_context.hash(digest)
            except ValueError:
                return _pwd_fallback_context.hash(password)
        raise


def verify_password(password: str, password_hash: str) -> bool:
    try:
        if _pwd_context.verify(password, password_hash):
            return True
    except ValueError:
        # Fall back to sha256 prehash variant for legacy/fallback writes.
        pass

    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    try:
        if _pwd_context.verify(digest, password_hash):
            return True
    except ValueError:
        pass

    return _pwd_fallback_context.verify(password, password_hash)


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=get_access_token_exp_minutes())).timestamp()),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm="HS256")


def create_refresh_token() -> tuple[str, str, datetime]:
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=get_refresh_token_exp_days())
    return token, token_hash, expires_at


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
    token_type = payload.get("type")
    if token_type != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return payload
