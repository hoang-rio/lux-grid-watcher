from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from logging import getLogger

from .email_config import smtp_settings

logger = getLogger(__name__)


def _send_email(to: str, subject: str, html_body: str) -> None:
    cfg = smtp_settings()

    if not cfg["host"]:
        logger.warning("SMTP_HOST not configured — skipping email to %s (subject: %s)", to, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from"] or cfg["username"]
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if cfg["use_ssl"]:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"]) as srv:
                if cfg["username"]:
                    srv.login(cfg["username"], cfg["password"])
                srv.sendmail(msg["From"], [to], msg.as_string())
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"]) as srv:
                if cfg["use_tls"]:
                    srv.starttls()
                if cfg["username"]:
                    srv.login(cfg["username"], cfg["password"])
                srv.sendmail(msg["From"], [to], msg.as_string())
        logger.info("Email sent to %s (subject: %s)", to, subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)


def send_verification_email(to: str, token: str, base_url: str) -> None:
    verify_url = f"{base_url.rstrip('/')}/auth/verify-email?token={token}"
    html = f"""
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="{verify_url}">{verify_url}</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you did not register, you can ignore this email.</p>
    """
    _send_email(to, "Confirm your email address", html)


def send_password_reset_email(to: str, token: str, base_url: str) -> None:
    reset_url = f"{base_url.rstrip('/')}/auth/reset-password?token={token}"
    html = f"""
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
    """
    _send_email(to, "Reset your password", html)
