import os
import re

BASE_URL = os.getenv("BASE_URL", "http://localhost:2007")


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
