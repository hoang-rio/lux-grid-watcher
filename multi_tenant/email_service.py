from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from logging import getLogger

from .email_config import smtp_settings
from .i18n import Locale, email_body_html, email_subject

logger = getLogger(__name__)


def _send_email(to: str, subject: str, html_body: str, action_url: str | None = None) -> None:
    cfg = smtp_settings()

    if not cfg["host"]:
        if action_url:
            logger.warning(
                "SMTP_HOST not configured — skipping email to %s (subject: %s). [DEV] Action URL: %s",
                to, subject, action_url,
            )
        else:
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


def send_verification_email(to: str, token: str, base_url: str, locale: Locale = "en") -> None:
    verify_url = f"{base_url.rstrip('/')}/auth/verify-email?token={token}"
    html = email_body_html("verification", locale, url=verify_url)
    _send_email(to, email_subject("verification", locale), html, action_url=verify_url)


def send_password_reset_email(to: str, token: str, base_url: str, locale: Locale = "en") -> None:
    reset_url = f"{base_url.rstrip('/')}/?token={token}"
    html = email_body_html("reset_password", locale, url=reset_url)
    _send_email(to, email_subject("reset_password", locale), html, action_url=reset_url)
