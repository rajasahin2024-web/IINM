"""
Shared security utilities for all routers.
Provides file upload validation and rate limiting helpers.
"""
import os
import time
from typing import Optional
from fastapi import HTTPException, UploadFile

# ─── File Upload Security ────────────────────────────────────────────────────

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024   # 10 MB for images
MAX_GENERAL_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB for general uploads

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico"}
ALLOWED_DOC_EXTENSIONS = {".pdf"}

# Extensions that must NEVER be stored — XSS / code execution
BLOCKED_EXTENSIONS = {
    ".html", ".htm", ".xhtml", ".js", ".mjs", ".ts", ".tsx",
    ".jsx", ".php", ".php3", ".php4", ".php5", ".phtml",
    ".asp", ".aspx", ".jsp", ".cgi", ".py", ".rb", ".pl",
    ".sh", ".bat", ".cmd", ".ps1", ".exe", ".dll", ".so",
    ".xml",
}


def validate_upload(
    file: UploadFile,
    allowed_extensions: set[str],
    max_size: int = MAX_IMAGE_SIZE_BYTES,
) -> str:
    """
    Validate an uploaded file's extension (from filename) and size.
    Returns a safe, sanitized extension (lowercase, with dot).
    Raises HTTPException on invalid uploads.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    ext = os.path.splitext(file.filename)[1].lower()

    if not ext:
        raise HTTPException(status_code=400, detail="File must have an extension.")

    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed for security reasons."
        )

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    # Check file size by seeking
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {max_mb} MB."
        )

    return ext


# ─── Rate Limiting (in-memory, per IP) ───────────────────────────────────────

_public_rate_buckets: dict[str, list[float]] = {}
PUBLIC_RATE_LIMIT = 10       # max requests
PUBLIC_RATE_WINDOW = 60      # per 60 seconds


def check_public_rate_limit(ip: str, limit: int = PUBLIC_RATE_LIMIT, window: int = PUBLIC_RATE_WINDOW):
    """
    Simple in-memory rate limiter for public write endpoints.
    Raises HTTPException(429) if exceeded.
    """
    if ip in ("127.0.0.1", "localhost", "::1"):
        return

    now = time.time()
    attempts = _public_rate_buckets.get(ip, [])
    attempts = [t for t in attempts if now - t < window]
    if len(attempts) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please wait {window} seconds before trying again."
        )
    attempts.append(now)
    _public_rate_buckets[ip] = attempts


def get_client_ip(request) -> str:
    """Extract real client IP from request, respecting proxy headers."""
    forwarded_for = request.headers.get("X-Forwarded-For") or request.headers.get("CF-Connecting-IP")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"
