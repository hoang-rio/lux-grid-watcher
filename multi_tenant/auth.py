from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from os import environ

import jwt
from dotenv import dotenv_values
from passlib.context import CryptContext


_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


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
