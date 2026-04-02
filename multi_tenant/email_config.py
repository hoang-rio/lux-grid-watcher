from __future__ import annotations

from os import environ

from dotenv import dotenv_values


config: dict = {**dotenv_values(".env"), **environ}


def smtp_settings() -> dict:
    """Return SMTP sender configuration for verification/reset emails."""
    return {
        "host": config.get("SMTP_HOST", ""),
        "port": int(config.get("SMTP_PORT", "587")),
        "username": config.get("SMTP_USER", ""),
        "password": config.get("SMTP_PASSWORD", ""),
        "from": config.get("SMTP_FROM", ""),
        "use_tls": config.get("SMTP_TLS", "true").lower() == "true",
        "use_ssl": config.get("SMTP_SSL", "false").lower() == "true",
    }
