"""
Static Pages Router — CMS-managed standalone pages (Privacy Policy, Terms, etc.).

Public endpoints (cached, TTL 300s):
  GET /api/pages/published       — list of published pages (for sitemap / nav links)
  GET /api/pages/slug/{slug}     — single published page by slug

Admin endpoints (require_device):
  GET    /api/pages              — list (status/search/skip/limit)
  GET    /api/pages/stats        — counts by status
  GET    /api/pages/{id}         — single (admin sees non-published)
  POST   /api/pages              — create
  PUT    /api/pages/{id}         — update
  POST   /api/pages/{id}/{publish|archive|draft}
  DELETE /api/pages/{id}
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, timezone
import re
import math

try:
    import nh3
    _HAS_NH3 = True
except ImportError:
    _HAS_NH3 = False

from database import get_db
from models import StaticPage, DeviceSession
from cache import cache
from routers.auth import require_device

router = APIRouter(prefix="/api/pages", tags=["pages"])


# ─────────────────────────────────────────────────────────────────
# HTML sanitization (same allowlist as blogs)
# ─────────────────────────────────────────────────────────────────

_PAGE_ALLOWED_TAGS = {
    "p", "br", "hr", "span", "div",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "small",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption",
}
_PAGE_ALLOWED_ATTRS = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height", "loading", "fetchpriority"},
    "span": {"style", "class"},
    "div": {"style", "class"},
    "p": {"style", "class"},
    "td": {"colspan", "rowspan", "style"},
    "th": {"colspan", "rowspan", "style"},
    "pre": {"class"},
    "code": {"class"},
    "figure": {"class"},
    "blockquote": {"style", "class"},
}


def _sanitize_html(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    if not _HAS_NH3:
        return raw
    return nh3.clean(
        raw,
        tags=_PAGE_ALLOWED_TAGS,
        attributes=_PAGE_ALLOWED_ATTRS,
        url_schemes={"http", "https", "mailto", "tel", "data"},
        clean_content_tags={"script", "style", "iframe", "object", "embed", "form"},
    )


# ─────────────────────────────────────────────────────────────────
# Slug helpers
# ─────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def _unique_slug(base: str, db: Session, exclude_id: int = None) -> str:
    slug = _slugify(base)[:200] or "page"
    candidate = slug
    n = 1
    while True:
        q = db.query(StaticPage).filter(StaticPage.slug == candidate)
        if exclude_id:
            q = q.filter(StaticPage.id != exclude_id)
        if not q.first():
            return candidate
        candidate = f"{slug}-{n}"
        n += 1


# ─────────────────────────────────────────────────────────────────
# Serialiser
# ─────────────────────────────────────────────────────────────────

def _page_out(p: StaticPage, full: bool = False) -> dict:
    base = {
        "id": p.id,
        "title": p.title,
        "slug": p.slug,
        "excerpt": p.excerpt,
        "featured_image": p.featured_image,
        "status": p.status,
        "seo_title": p.seo_title,
        "seo_description": p.seo_description,
        "seo_keywords": p.seo_keywords,
        "show_in_sitemap": p.show_in_sitemap,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
    if full:
        base["content"] = p.content
    return base


# ═══════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS (cached)
# ═══════════════════════════════════════════════════════════════

@router.get("/published")
def list_published_pages(response: Response, db: Session = Depends(get_db)):
    """Public: list of published pages (for sitemap / nav links)."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cached = cache.get("pages_published")
    if cached is not None:
        return cached
    items = (
        db.query(StaticPage)
        .filter(StaticPage.status == "published")
        .order_by(StaticPage.title.asc())
        .all()
    )
    result = [
        {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            "published_at": p.published_at.isoformat() if p.published_at else None,
        }
        for p in items
    ]
    cache.set("pages_published", result)
    return result


@router.get("/slug/{slug}")
def get_page_by_slug(slug: str, response: Response, db: Session = Depends(get_db)):
    """Public: single published page by slug."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cache_key = f"page_{slug}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    p = db.query(StaticPage).filter(StaticPage.slug == slug).first()
    if not p or p.status != "published":
        raise HTTPException(status_code=404, detail="Page not found")
    result = _page_out(p, full=True)
    cache.set(cache_key, result)
    return result


# ═══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class PageIn(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    status: Optional[str] = "draft"
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    show_in_sitemap: bool = True
    published_at: Optional[datetime] = None


def _is_admin(request: Request, db: Session) -> bool:
    token = request.headers.get("X-Device-Token")
    if not token:
        return False
    return db.query(DeviceSession).filter(
        DeviceSession.device_token == token,
        DeviceSession.is_approved == True,
    ).first() is not None


def _invalidate(slug: str = None) -> None:
    cache.invalidate("pages_published")
    if slug:
        cache.invalidate(f"page_{slug}")


@router.get("")
def list_pages(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    # Public callers forced to published-only (mirror blogs.py).
    is_admin = _is_admin(request, db)
    effective_status = status if is_admin else "published"

    q = db.query(StaticPage)
    if effective_status:
        q = q.filter(StaticPage.status == effective_status)
    if search:
        q = q.filter(or_(
            StaticPage.title.ilike(f"%{search}%"),
            StaticPage.excerpt.ilike(f"%{search}%"),
        ))
    total = q.count()
    pages = q.order_by(StaticPage.updated_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [_page_out(p) for p in pages],
    }


@router.get("/stats")
def page_stats(db: Session = Depends(get_db)):
    total     = db.query(StaticPage).count()
    published = db.query(StaticPage).filter(StaticPage.status == "published").count()
    drafts    = db.query(StaticPage).filter(StaticPage.status == "draft").count()
    archived  = db.query(StaticPage).filter(StaticPage.status == "archived").count()
    return {
        "total": total,
        "published": published,
        "drafts": drafts,
        "archived": archived,
    }


@router.get("/{page_id}")
def get_page(page_id: int, request: Request, db: Session = Depends(get_db)):
    p = db.query(StaticPage).filter(StaticPage.id == page_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page not found")
    if p.status != "published" and not _is_admin(request, db):
        raise HTTPException(status_code=404, detail="Page not found")
    return _page_out(p, full=True)


@router.post("")
def create_page(payload: PageIn, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Slug: use provided slug (slugified) or derive from title.
    base = payload.slug if payload.slug and payload.slug.strip() else payload.title
    slug = _unique_slug(base, db)
    now = datetime.now(timezone.utc)
    pub_date = None
    if payload.published_at:
        pub_date = payload.published_at
    elif payload.status == "published":
        pub_date = now

    page = StaticPage(
        title=payload.title.strip(),
        slug=slug,
        excerpt=payload.excerpt,
        content=_sanitize_html(payload.content),
        featured_image=payload.featured_image,
        status=payload.status or "draft",
        seo_title=payload.seo_title,
        seo_description=payload.seo_description,
        seo_keywords=payload.seo_keywords,
        show_in_sitemap=payload.show_in_sitemap,
        published_at=pub_date,
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    _invalidate(slug)
    return _page_out(page, full=True)


@router.put("/{page_id}")
def update_page(page_id: int, payload: PageIn, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(StaticPage).filter(StaticPage.id == page_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page not found")

    old_slug = p.slug

    # Slug: if caller provided a custom slug, slugify + ensure unique; else regenerate from title.
    if payload.slug and payload.slug.strip() and _slugify(payload.slug) != _slugify(p.title):
        new_slug = _unique_slug(payload.slug, db, exclude_id=page_id)
    else:
        new_slug = _unique_slug(payload.title, db, exclude_id=page_id)

    p.title = payload.title.strip()
    p.slug = new_slug
    p.excerpt = payload.excerpt
    p.content = _sanitize_html(payload.content)
    p.featured_image = payload.featured_image
    p.seo_title = payload.seo_title
    p.seo_description = payload.seo_description
    p.seo_keywords = payload.seo_keywords
    p.show_in_sitemap = payload.show_in_sitemap

    # Status transitions + publish date (mirror blogs.py).
    old_status = p.status
    new_status = payload.status or old_status
    p.status = new_status
    if payload.published_at:
        p.published_at = payload.published_at
    elif new_status == "published" and old_status != "published":
        p.published_at = datetime.now(timezone.utc)
    elif new_status != "published" and not payload.published_at:
        p.published_at = None

    db.commit()
    db.refresh(p)

    # Invalidate both old and new slug caches (slug may have changed).
    _invalidate(old_slug)
    if new_slug != old_slug:
        _invalidate(new_slug)
    return _page_out(p, full=True)


@router.post("/{page_id}/publish")
def publish_page(page_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(StaticPage).filter(StaticPage.id == page_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page not found")
    p.status = "published"
    p.published_at = datetime.now(timezone.utc)
    db.commit()
    _invalidate(p.slug)
    return {"message": "published", "id": page_id}


@router.post("/{page_id}/archive")
def archive_page(page_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(StaticPage).filter(StaticPage.id == page_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page not found")
    p.status = "archived"
    p.published_at = None
    db.commit()
    _invalidate(p.slug)
    return {"message": "archived", "id": page_id}


@router.post("/{page_id}/draft")
def draft_page(page_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(StaticPage).filter(StaticPage.id == page_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page not found")
    p.status = "draft"
    p.published_at = None
    db.commit()
    _invalidate(p.slug)
    return {"message": "moved to draft", "id": page_id}


@router.delete("/{page_id}")
def delete_page(page_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(StaticPage).filter(StaticPage.id == page_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Page not found")
    slug = p.slug
    db.delete(p)
    db.commit()
    _invalidate(slug)
    return {"message": "deleted"}
