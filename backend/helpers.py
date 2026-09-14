import os
import re
import logging
import smtplib
from email.message import EmailMessage
from fastapi import HTTPException

logger = logging.getLogger(__name__)

BASE_URL = os.getenv("BASE_URL", "http://localhost:2007")

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_upload(file: "UploadFile", allowed_exts: set[str] = ALLOWED_IMAGE_EXTENSIONS, max_size: int = MAX_IMAGE_SIZE_BYTES) -> str:
    """Validate uploaded file extension and size. Returns the file extension (e.g. '.jpg')."""
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(allowed_exts))}")
    if file.size and file.size > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024*1024)} MB")
    return ext


def rewrite_url(url: str | None) -> str | None:
    """Rewrite URLs: prepend BASE_URL for relative paths, and replace any hardcoded
    backend domain:8000 URLs with the configured BASE_URL."""
    if not url:
        return url
    # If it's a relative upload path, prepend BASE_URL
    if url.startswith("/uploads/"):
        return f"{BASE_URL}{url}"
    # Replace any http://<domain>:8000 or https://<domain>:8000 with BASE_URL
    url = re.sub(r"https?://[^/]+:8000", BASE_URL, url)
    # Replace localhost variants
    url = re.sub(r"https?://localhost:8000", BASE_URL, url)
    return url


def rewrite_url_relative(url: str | None) -> str | None:
    """Student-facing variant of rewrite_url: emits relative /uploads/... paths.

    The Next.js frontend proxies /uploads/* to the backend (next.config.ts
    rewrite), so same-origin relative URLs satisfy the CSP img-src 'self' rule,
    whereas absolute http://localhost:2007 URLs are blocked by the browser.
    Only use this for responses consumed by the frontend's own pages — keep
    rewrite_url (absolute) for emails, SEO/OG tags, and server-side fetches.
    """
    if not url:
        return url
    if url.startswith("/uploads/"):
        return url
    # Absolute URLs pointing back at this backend's uploads → make relative
    if url.startswith(f"{BASE_URL}/uploads/"):
        return url[len(BASE_URL):]
    m = re.match(r"https?://[^/]+:8000(/uploads/.*)", url)
    if m:
        return m.group(1)
    return rewrite_url(url)


def rewrite_dict_urls(data: dict, url_fields: list[str]) -> dict:
    """Rewrite URLs in specific fields of a dictionary."""
    result = dict(data)
    for field in url_fields:
        if field in result:
            result[field] = rewrite_url(result[field])
    return result


def send_email(db, to: str, subject: str, html_body: str | None = None, text_body: str | None = None) -> bool:
    """Send an email using the site's saved SMTP settings (email_settings table).

    Shared mailer for all outbound email — settings test email, slot-booking
    confirmations, student password resets, etc.

    Raises RuntimeError when SMTP is not configured, ValueError when no body is
    given, and propagates smtplib/network errors so callers can decide how to
    surface the failure (log-and-continue, generic 200, or HTTP 500).
    """
    from models import EmailSettings  # lazy import — avoids circular imports

    settings = db.query(EmailSettings).first()
    if not settings or not settings.smtp_host or not settings.from_email:
        raise RuntimeError("SMTP is not configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = (
        f"{settings.from_name} <{settings.from_email}>"
        if settings.from_name else settings.from_email
    )
    msg["To"] = to

    if text_body:
        msg.set_content(text_body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")
    elif html_body:
        # HTML-only caller: derive a plaintext fallback for mail clients.
        plain = re.sub(r"<[^>]+>", " ", html_body)
        plain = re.sub(r"\s+", " ", plain).strip()
        msg.set_content(plain or subject)
        msg.add_alternative(html_body, subtype="html")
    else:
        raise ValueError("send_email requires html_body or text_body")

    server = smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587, timeout=15)
    try:
        if settings.use_tls:
            server.starttls()
        if settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
    finally:
        try:
            server.quit()
        except Exception:
            pass
    return True
