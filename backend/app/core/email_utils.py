"""Tiny SMTP helper — reuses the same SMTP_HOST/SMTP_PORT/SMTP_EMAIL/
SMTP_PASSWORD env vars every other feature uses.

Failing silently is intentional: we never want an email hiccup to break a
core operation (tenant provisioning still succeeds even if the welcome mail
bounces). Callers can inspect the returned dict for status if they care.
"""
import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_html(to: str, subject: str, html: str,
              from_name: str = "Sitera") -> dict:
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "465"))
    sender = os.environ.get("SMTP_EMAIL")
    password = os.environ.get("SMTP_PASSWORD")
    if not (host and sender and password and to):
        return {"ok": False, "reason": "smtp_not_configured"}

    msg = MIMEText(html, "html")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{sender}>"
    msg["To"] = to
    try:
        with smtplib.SMTP_SSL(host, port, timeout=20) as s:
            s.login(sender, password)
            s.sendmail(sender, [to], msg.as_string())
        return {"ok": True}
    except Exception as e:  # noqa: BLE001
        logger.warning("SMTP send failed to %s: %s", to, e)
        return {"ok": False, "reason": str(e)[:200]}
