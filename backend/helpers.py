import os
import re
from fastapi import HTTPException

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


def rewrite_dict_urls(data: dict, url_fields: list[str]) -> dict:
    """Rewrite URLs in specific fields of a dictionary."""
    result = dict(data)
    for field in url_fields:
        if field in result:
            result[field] = rewrite_url(result[field])
    return result
