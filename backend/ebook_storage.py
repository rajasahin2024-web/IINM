"""
Private eBook object storage helpers.

eBook bytes are NEVER given out as public URLs. Files live either in R2 under
the private `ebooks/` prefix or (when R2 is not configured) on local disk under
uploads/ebooks/. In both cases the stored key is kept in
CourseMaterial.ebook_file_key and bytes are served only through the
authenticated reader endpoints (Range-capable for pdf.js pagination).

Key formats:
  - R2:    "ebooks/<uuid>.pdf"           (object key in the configured bucket)
  - Local: "local/ebooks/<uuid>.pdf"     (maps to uploads/ebooks/<uuid>.pdf)
"""
import os
import re
import uuid
import logging
from typing import Optional, Tuple

import models

logger = logging.getLogger(__name__)

EBOOK_R2_PREFIX = "ebooks/"
EBOOK_LOCAL_PREFIX = "local/ebooks/"
EBOOK_LOCAL_DIR = "uploads/ebooks"
EBOOK_COVER_DIR = "uploads/ebooks/covers"

os.makedirs(EBOOK_LOCAL_DIR, exist_ok=True)
os.makedirs(EBOOK_COVER_DIR, exist_ok=True)

MAX_EBOOK_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB
ALLOWED_EBOOK_EXTENSIONS = {".pdf"}
ALLOWED_COVER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def get_r2_client(db):
    """Return (boto3_s3_client, r2_settings) when R2 is active; else (None, None)."""
    try:
        import boto3
    except ImportError:
        return None, None
    r2 = db.query(models.R2Settings).first()
    if not r2 or not r2.is_active or not r2.account_id or not r2.secret_access_key or not r2.bucket_name:
        return None, None
    account = (r2.account_id or "").strip()
    if "r2.cloudflarestorage.com" in account:
        endpoint = account if account.startswith("http") else f"https://{account}"
    else:
        endpoint = f"https://{account}.r2.cloudflarestorage.com"
    s3 = boto3.client(
        service_name="s3",
        endpoint_url=endpoint,
        aws_access_key_id=r2.access_key_id,
        aws_secret_access_key=r2.secret_access_key,
        region_name="auto",
    )
    return s3, r2


def _local_path_for_key(key: str) -> Optional[str]:
    """Map a `local/...` storage key to a safe absolute path under uploads/."""
    if not key.startswith("local/"):
        return None
    rel = key[len("local/"):]
    base = os.path.abspath("uploads")
    path = os.path.abspath(os.path.join(base, rel))
    if not path.startswith(base + os.sep):
        return None
    return path


def store_ebook_file(db, content: bytes, ext: str = ".pdf", content_type: str = "application/pdf") -> str:
    """Store eBook bytes privately; returns the ebook_file_key to persist."""
    s3, r2 = get_r2_client(db)
    if s3 and r2:
        key = f"{EBOOK_R2_PREFIX}{uuid.uuid4()}{ext}"
        s3.put_object(Bucket=r2.bucket_name, Key=key, Body=content, ContentType=content_type)
        return key
    fname = f"{uuid.uuid4()}{ext}"
    with open(os.path.join(EBOOK_LOCAL_DIR, fname), "wb") as f:
        f.write(content)
    return f"{EBOOK_LOCAL_PREFIX}{fname}"


def store_ebook_cover(db, content: bytes, ext: str = ".jpg") -> Optional[str]:
    """Store an eBook cover image; returns a public URL (covers are public)."""
    s3, r2 = get_r2_client(db)
    fname = f"{uuid.uuid4()}{ext}"
    if s3 and r2 and r2.public_url:
        key = f"{EBOOK_R2_PREFIX}covers/{fname}"
        s3.put_object(Bucket=r2.bucket_name, Key=key, Body=content, ContentType="image/jpeg")
        return f"{r2.public_url.rstrip('/')}/{key}"
    with open(os.path.join(EBOOK_COVER_DIR, fname), "wb") as f:
        f.write(content)
    return f"/uploads/ebooks/covers/{fname}"


def delete_ebook_file(db, key: Optional[str]) -> None:
    """Best-effort delete of a stored eBook object."""
    if not key:
        return
    try:
        if key.startswith(EBOOK_LOCAL_PREFIX):
            path = _local_path_for_key(key)
            if path and os.path.exists(path):
                os.remove(path)
            return
        s3, r2 = get_r2_client(db)
        if s3 and r2:
            s3.delete_object(Bucket=r2.bucket_name, Key=key)
    except Exception as e:
        logger.warning(f"Failed to delete ebook object {key}: {e}")


_RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


def _parse_range(range_header: Optional[str], size: int) -> Optional[Tuple[int, int]]:
    """Parse a single-range `Range: bytes=a-b` header against the object size.
    Returns (start, end) inclusive, or None when absent/unsatisfiable."""
    if not range_header:
        return None
    m = _RANGE_RE.match(range_header.strip())
    if not m:
        return None
    start_s, end_s = m.group(1), m.group(2)
    if start_s == "" and end_s == "":
        return None
    if start_s == "":
        # Suffix range: last N bytes
        n = int(end_s)
        if n <= 0:
            return None
        start = max(0, size - n)
        end = size - 1
    else:
        start = int(start_s)
        end = int(end_s) if end_s else size - 1
        end = min(end, size - 1)
    if start >= size or start > end:
        return None
    return start, end


def read_ebook_object(db, key: str, range_header: Optional[str] = None) -> dict:
    """Fetch eBook bytes (full or a single byte range).

    Returns a dict: {"status": 200|206, "content": bytes, "size": total,
                     "content_range": str|None, "content_type": str}
    Raises FileNotFoundError when the object is missing."""
    if key.startswith(EBOOK_LOCAL_PREFIX):
        path = _local_path_for_key(key)
        if not path or not os.path.exists(path):
            raise FileNotFoundError(key)
        size = os.path.getsize(path)
        rng = _parse_range(range_header, size)
        with open(path, "rb") as f:
            if rng:
                f.seek(rng[0])
                data = f.read(rng[1] - rng[0] + 1)
            else:
                data = f.read()
        return {
            "status": 206 if rng else 200,
            "content": data,
            "size": size,
            "content_range": f"bytes {rng[0]}-{rng[1]}/{size}" if rng else None,
            "content_type": "application/pdf",
        }

    s3, r2 = get_r2_client(db)
    if not s3 or not r2:
        raise FileNotFoundError("ebook storage backend unavailable")
    head = s3.head_object(Bucket=r2.bucket_name, Key=key)
    size = head.get("ContentLength", 0)
    content_type = head.get("ContentType") or "application/pdf"
    rng = _parse_range(range_header, size)
    params = {"Bucket": r2.bucket_name, "Key": key}
    if rng:
        params["Range"] = f"bytes={rng[0]}-{rng[1]}"
    obj = s3.get_object(**params)
    data = obj["Body"].read()
    return {
        "status": 206 if rng else 200,
        "content": data,
        "size": size,
        "content_range": f"bytes {rng[0]}-{rng[1]}/{size}" if rng else None,
        "content_type": content_type,
    }
