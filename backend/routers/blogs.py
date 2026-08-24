"""
Blog Management Router
Endpoints for BlogPost, BlogCategory, BlogSubCategory CRUD.
All write operations are protected with require_device.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timezone
import re
import math
import hashlib

try:
    import nh3
    _HAS_NH3 = True
except ImportError:
    _HAS_NH3 = False

from database import get_db, SessionLocal
from models import BlogPost, BlogCategory, BlogSubCategory, DeviceSession, BlogAuthor, BlogRevision, BlogComment, BlogRating, BlogReaction
from fastapi import Header
from security import check_public_rate_limit, get_client_ip, verify_turnstile, hash_ip, should_count_view

router = APIRouter(prefix="/api/blogs", tags=["blogs"])


# ─────────────────────────────────────────────────────────────────
# HTML sanitization (defense-in-depth against stored XSS)
# ─────────────────────────────────────────────────────────────────

# Allowlist mirrors what react-simple-wysiwyg + the editor toolbar produce.
_BLOG_ALLOWED_TAGS = {
    "p", "br", "hr", "span", "div",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "small",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption",
}
_BLOG_ALLOWED_ATTRS = {
    "a": {"href", "title", "target", "rel"},
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
    """Sanitize blog HTML content to strip XSS vectors (scripts, on* handlers, etc.).
    Returns None if input is None. If nh3 is not installed, returns input unchanged
    (frontend DOMPurify is the primary defense)."""
    if raw is None:
        return None
    if not _HAS_NH3:
        return raw
    return nh3.clean(
        raw,
        tags=_BLOG_ALLOWED_TAGS,
        attributes=_BLOG_ALLOWED_ATTRS,
        url_schemes={"http", "https", "mailto", "tel", "data"},
        clean_content_tags={"script", "style", "iframe", "object", "embed", "form"},
    )


# ─────────────────────────────────────────────────────────────────
# Auth helper
# ─────────────────────────────────────────────────────────────────

def require_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db),
) -> str:
    if not x_device_token:
        raise HTTPException(status_code=401, detail="X-Device-Token header required")
    session = db.query(DeviceSession).filter(
        DeviceSession.device_token == x_device_token,
        DeviceSession.is_approved == True,
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized device")
    return x_device_token


# ─────────────────────────────────────────────────────────────────
# Slug helpers
# ─────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def _unique_slug(base: str, model, db: Session, exclude_id: int = None) -> str:
    slug = _slugify(base)[:200]
    candidate = slug
    n = 1
    while True:
        q = db.query(model).filter(model.slug == candidate)
        if exclude_id:
            q = q.filter(model.id != exclude_id)
        if not q.first():
            return candidate
        candidate = f"{slug}-{n}"
        n += 1


def _reading_time(html_content: str) -> int:
    if not html_content:
        return 0
    text = re.sub(r"<[^>]+>", " ", html_content)
    words = len(text.split())
    return max(1, math.ceil(words / 200))


# ─────────────────────────────────────────────────────────────────
# Serialisers
# ─────────────────────────────────────────────────────────────────

def _cat_out(c: BlogCategory) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "color": c.color,
        "is_active": c.is_active,
        "subcategory_count": len(c.subcategories),
        "post_count": len([p for p in c.posts if p.status == "published"]),
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _subcat_out(s: BlogSubCategory) -> dict:
    return {
        "id": s.id,
        "category_id": s.category_id,
        "category_name": s.category.name if s.category else None,
        "name": s.name,
        "slug": s.slug,
        "description": s.description,
        "is_active": s.is_active,
        "post_count": len([p for p in s.posts if p.status == "published"]),
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _post_out(p: BlogPost, full: bool = False) -> dict:
    base = {
        "id": p.id,
        "title": p.title,
        "slug": p.slug,
        "excerpt": p.excerpt,
        "featured_image": p.featured_image,
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "category_color": p.category.color if p.category else None,
        "subcategory_id": p.subcategory_id,
        "subcategory_name": p.subcategory.name if p.subcategory else None,
        "tags": p.tags,
        "author_id": p.author_id,
        "author_name": p.author.name if p.author else p.author_name,
        "author_avatar": p.author.profile_image if p.author else p.author_avatar,
        "status": p.status,
        "is_featured": p.is_featured,
        "reading_time": p.reading_time,
        "views": p.views,
        "clap_count": p.clap_count,
        "seo_title": p.seo_title,
        "seo_description": p.seo_description,
        "seo_keywords": p.seo_keywords,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
    if full:
        base["content"] = p.content
    return base


# ═══════════════════════════════════════════════════════════════
# BLOG AUTHOR ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class AuthorIn(BaseModel):
    name: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    social_links: Optional[str] = None
    is_active: bool = True

def _author_out(a: BlogAuthor) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "bio": a.bio,
        "profile_image": a.profile_image,
        "social_links": a.social_links,
        "is_active": a.is_active,
        "post_count": len([p for p in a.posts if p.status == "published"]),
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }

@router.get("/authors")
def list_authors(db: Session = Depends(get_db)):
    authors = db.query(BlogAuthor).order_by(BlogAuthor.name).all()
    return [_author_out(a) for a in authors]

@router.post("/authors", dependencies=[Depends(require_device)])
def create_author(payload: AuthorIn, db: Session = Depends(get_db)):
    author = BlogAuthor(
        name=payload.name,
        bio=payload.bio,
        profile_image=payload.profile_image,
        social_links=payload.social_links,
        is_active=payload.is_active,
    )
    db.add(author)
    db.commit()
    db.refresh(author)
    return _author_out(author)

@router.put("/authors/{author_id}", dependencies=[Depends(require_device)])
def update_author(author_id: int, payload: AuthorIn, db: Session = Depends(get_db)):
    author = db.query(BlogAuthor).filter(BlogAuthor.id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    author.name = payload.name
    author.bio = payload.bio
    author.profile_image = payload.profile_image
    author.social_links = payload.social_links
    author.is_active = payload.is_active
    db.commit()
    db.refresh(author)
    return _author_out(author)

@router.delete("/authors/{author_id}", dependencies=[Depends(require_device)])
def delete_author(author_id: int, db: Session = Depends(get_db)):
    author = db.query(BlogAuthor).filter(BlogAuthor.id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    db.delete(author)
    db.commit()
    return {"message": "deleted"}


# ═══════════════════════════════════════════════════════════════
# BLOG CATEGORY ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"
    is_active: bool = True


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(BlogCategory).order_by(BlogCategory.name).all()
    return [_cat_out(c) for c in cats]


@router.post("/categories", dependencies=[Depends(require_device)])
def create_category(payload: CategoryIn, db: Session = Depends(get_db)):
    slug = _unique_slug(payload.name, BlogCategory, db)
    cat = BlogCategory(
        name=payload.name,
        slug=slug,
        description=payload.description,
        color=payload.color or "#6366f1",
        is_active=payload.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _cat_out(cat)


@router.put("/categories/{cat_id}", dependencies=[Depends(require_device)])
def update_category(cat_id: int, payload: CategoryIn, db: Session = Depends(get_db)):
    cat = db.query(BlogCategory).filter(BlogCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.name = payload.name
    cat.slug = _unique_slug(payload.name, BlogCategory, db, exclude_id=cat_id)
    cat.description = payload.description
    cat.color = payload.color or cat.color
    cat.is_active = payload.is_active
    db.commit()
    db.refresh(cat)
    return _cat_out(cat)


@router.delete("/categories/{cat_id}", dependencies=[Depends(require_device)])
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(BlogCategory).filter(BlogCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"message": "deleted"}


# ═══════════════════════════════════════════════════════════════
# BLOG SUB-CATEGORY ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class SubCategoryIn(BaseModel):
    category_id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True


@router.get("/subcategories")
def list_subcategories(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(BlogSubCategory)
    if category_id:
        q = q.filter(BlogSubCategory.category_id == category_id)
    return [_subcat_out(s) for s in q.order_by(BlogSubCategory.name).all()]


@router.post("/subcategories", dependencies=[Depends(require_device)])
def create_subcategory(payload: SubCategoryIn, db: Session = Depends(get_db)):
    # Ensure parent category exists
    cat = db.query(BlogCategory).filter(BlogCategory.id == payload.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Parent category not found")
    slug = _unique_slug(payload.name, BlogSubCategory, db)
    sub = BlogSubCategory(
        category_id=payload.category_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _subcat_out(sub)


@router.put("/subcategories/{sub_id}", dependencies=[Depends(require_device)])
def update_subcategory(sub_id: int, payload: SubCategoryIn, db: Session = Depends(get_db)):
    sub = db.query(BlogSubCategory).filter(BlogSubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="SubCategory not found")
    sub.category_id = payload.category_id
    sub.name = payload.name
    sub.slug = _unique_slug(payload.name, BlogSubCategory, db, exclude_id=sub_id)
    sub.description = payload.description
    sub.is_active = payload.is_active
    db.commit()
    db.refresh(sub)
    return _subcat_out(sub)


@router.delete("/subcategories/{sub_id}", dependencies=[Depends(require_device)])
def delete_subcategory(sub_id: int, db: Session = Depends(get_db)):
    sub = db.query(BlogSubCategory).filter(BlogSubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="SubCategory not found")
    db.delete(sub)
    db.commit()
    return {"message": "deleted"}


# ═══════════════════════════════════════════════════════════════
# BLOG POST ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class PostIn(BaseModel):
    title: str
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    tags: Optional[str] = None
    author_id: Optional[int] = None
    status: Optional[str] = "draft"
    is_featured: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    published_at: Optional[datetime] = None


@router.get("")
def list_posts(
    request: Request,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    # ── Authorization: only authenticated devices may filter by non-published status.
    # Public (unauthenticated) callers are forced to published-only so drafts/archived
    # posts are never leaked.
    token = request.headers.get("X-Device-Token")
    is_admin = False
    if token:
        is_admin = db.query(DeviceSession).filter(
            DeviceSession.device_token == token,
            DeviceSession.is_approved == True,
        ).first() is not None
    effective_status = status if is_admin else "published"

    q = db.query(BlogPost)
    if effective_status:
        q = q.filter(BlogPost.status == effective_status)
    if category_id:
        q = q.filter(BlogPost.category_id == category_id)
    if subcategory_id:
        q = q.filter(BlogPost.subcategory_id == subcategory_id)
    if featured is not None:
        q = q.filter(BlogPost.is_featured == featured)
    if search:
        q = q.filter(or_(
            BlogPost.title.ilike(f"%{search}%"),
            BlogPost.excerpt.ilike(f"%{search}%"),
            BlogPost.author_name.ilike(f"%{search}%"),
        ))
    total = q.count()
    posts = q.order_by(BlogPost.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [_post_out(p) for p in posts],
    }


@router.get("/stats")
def post_stats(db: Session = Depends(get_db)):
    total      = db.query(BlogPost).count()
    published  = db.query(BlogPost).filter(BlogPost.status == "published").count()
    drafts     = db.query(BlogPost).filter(BlogPost.status == "draft").count()
    archived   = db.query(BlogPost).filter(BlogPost.status == "archived").count()
    featured   = db.query(BlogPost).filter(BlogPost.is_featured == True).count()
    # SQL aggregation instead of loading every row into Python.
    views = db.query(func.sum(BlogPost.views)).scalar() or 0
    return {
        "total": total,
        "published": published,
        "drafts": drafts,
        "archived": archived,
        "featured": featured,
        "total_views": views,
    }


@router.get("/{post_id}")
def get_post(post_id: int, request: Request, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    # Non-published posts are only visible to authenticated devices (admin).
    if p.status != "published":
        token = request.headers.get("X-Device-Token")
        if not token or not db.query(DeviceSession).filter(
            DeviceSession.device_token == token,
            DeviceSession.is_approved == True,
        ).first():
            raise HTTPException(status_code=404, detail="Post not found")
    return _post_out(p, full=True)


@router.post("", dependencies=[Depends(require_device)])
def create_post(payload: PostIn, db: Session = Depends(get_db)):
    slug = _unique_slug(payload.title, BlogPost, db)
    rt = _reading_time(payload.content or "")
    now = datetime.now(timezone.utc)
    
    # If scheduled date provided, use it. Else if published, use now.
    pub_date = None
    if payload.published_at:
        pub_date = payload.published_at
    elif payload.status == "published":
        pub_date = now

    post = BlogPost(
        title=payload.title,
        slug=slug,
        excerpt=payload.excerpt,
        content=_sanitize_html(payload.content),
        featured_image=payload.featured_image,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        tags=payload.tags,
        author_id=payload.author_id,
        status=payload.status or "draft",
        is_featured=payload.is_featured,
        reading_time=rt,
        seo_title=payload.seo_title,
        seo_description=payload.seo_description,
        seo_keywords=payload.seo_keywords,
        published_at=pub_date,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Create initial revision if there's content
    if post.content:
        rev = BlogRevision(blog_id=post.id, content=post.content, title=post.title, excerpt=post.excerpt)
        db.add(rev)
        db.commit()

    return _post_out(post, full=True)


@router.put("/{post_id}", dependencies=[Depends(require_device)])
def update_post(post_id: int, payload: PostIn, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")

    content_changed = p.content != payload.content

    p.title = payload.title
    p.slug = _unique_slug(payload.title, BlogPost, db, exclude_id=post_id)
    p.excerpt = payload.excerpt
    p.content = _sanitize_html(payload.content)
    p.featured_image = payload.featured_image
    p.category_id = payload.category_id
    p.subcategory_id = payload.subcategory_id
    p.tags = payload.tags
    p.author_id = payload.author_id
    p.is_featured = payload.is_featured
    p.reading_time = _reading_time(payload.content or "")
    p.seo_title = payload.seo_title
    p.seo_description = payload.seo_description
    p.seo_keywords = payload.seo_keywords

    # Status transition
    old_status = p.status
    new_status = payload.status or old_status
    p.status = new_status
    
    # Scheduling & Publish Date
    if payload.published_at:
        p.published_at = payload.published_at
    elif new_status == "published" and old_status != "published":
        p.published_at = datetime.now(timezone.utc)
    elif new_status != "published" and not payload.published_at:
        p.published_at = None

    db.commit()

    # Create revision if content changed
    if content_changed and p.content:
        # keep last 20 revisions to save space
        rev_count = db.query(BlogRevision).filter(BlogRevision.blog_id == p.id).count()
        if rev_count >= 20:
            oldest = db.query(BlogRevision).filter(BlogRevision.blog_id == p.id).order_by(BlogRevision.created_at.asc()).first()
            if oldest: db.delete(oldest)
            
        rev = BlogRevision(blog_id=p.id, content=p.content, title=p.title, excerpt=p.excerpt)
        db.add(rev)
        db.commit()

    db.refresh(p)
    return _post_out(p, full=True)


@router.post("/{post_id}/publish", dependencies=[Depends(require_device)])
def publish_post(post_id: int, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    p.status = "published"
    p.published_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "published", "id": post_id}


@router.post("/{post_id}/archive", dependencies=[Depends(require_device)])
def archive_post(post_id: int, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    p.status = "archived"
    p.published_at = None
    db.commit()
    return {"message": "archived", "id": post_id}


@router.post("/{post_id}/draft", dependencies=[Depends(require_device)])
def draft_post(post_id: int, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    p.status = "draft"
    p.published_at = None
    db.commit()
    return {"message": "moved to draft", "id": post_id}


@router.delete("/{post_id}", dependencies=[Depends(require_device)])
def delete_post(post_id: int, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(p)
    db.commit()
    return {"message": "deleted"}


# ═══════════════════════════════════════════════════════════════
# ENGAGEMENT & REVISIONS
# ═══════════════════════════════════════════════════════════════

@router.post("/{post_id}/view")
def increment_view(post_id: int, db: Session = Depends(get_db)):
    """Increment view count without auth (called on page load)."""
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    p.views += 1
    db.commit()
    return {"views": p.views}

@router.post("/{post_id}/clap")
def increment_clap(post_id: int, db: Session = Depends(get_db)):
    """Increment clap count without auth."""
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    p.clap_count += 1
    db.commit()
    return {"claps": p.clap_count}

@router.get("/{post_id}/revisions", dependencies=[Depends(require_device)])
def get_revisions(post_id: int, db: Session = Depends(get_db)):
    revisions = db.query(BlogRevision).filter(BlogRevision.blog_id == post_id).order_by(BlogRevision.created_at.desc()).all()
    return [{
        "id": r.id,
        "title": r.title,
        "excerpt": r.excerpt,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in revisions]

@router.post("/{post_id}/revisions/{rev_id}/restore", dependencies=[Depends(require_device)])
def restore_revision(post_id: int, rev_id: int, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    r = db.query(BlogRevision).filter(BlogRevision.id == rev_id, BlogRevision.blog_id == post_id).first()
    if not p or not r:
        raise HTTPException(status_code=404, detail="Post or Revision not found")
    
    p.content = r.content
    if r.title: p.title = r.title
    if r.excerpt: p.excerpt = r.excerpt

    db.commit()
    return {"message": "restored"}


# ═══════════════════════════════════════════════════════════════
# PUBLIC BLOG DETAIL & INTERACTION ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/slug/{slug}")
def get_post_by_slug(slug: str, request: Request, db: Session = Depends(get_db)):
    p = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not p or p.status != "published":
        raise HTTPException(status_code=404, detail="Post not found")
    # Increment views only if this (IP, slug) pair hasn't been seen recently,
    # so refreshes/bots/crawlers don't inflate the count. Avoids turning every
    # read into a write when the same user revisits within the TTL window.
    client_ip = get_client_ip(request)
    if should_count_view(client_ip, slug):
        p.views = (p.views or 0) + 1
        db.commit()
    # Rating stats via SQL aggregation (avoid loading all rows into Python).
    avg_rating = db.query(func.avg(BlogRating.rating)).filter(BlogRating.post_id == p.id).scalar()
    rating_count = db.query(func.count(BlogRating.id)).filter(BlogRating.post_id == p.id).scalar()
    avg_rating = round(avg_rating, 1) if avg_rating else 0
    rating_counts = {i: 0 for i in range(1, 6)}
    for r_val, c_val in db.query(BlogRating.rating, func.count(BlogRating.id)).filter(
        BlogRating.post_id == p.id
    ).group_by(BlogRating.rating).all():
        if r_val in rating_counts:
            rating_counts[r_val] = c_val
    # Reaction stats via SQL aggregation.
    reaction_summary = {}
    for rtype, c_val in db.query(BlogReaction.reaction_type, func.count(BlogReaction.id)).filter(
        BlogReaction.post_id == p.id
    ).group_by(BlogReaction.reaction_type).all():
        reaction_summary[rtype] = c_val
    # Comment count.
    comment_count = db.query(BlogComment).filter(BlogComment.post_id == p.id, BlogComment.is_approved == True).count()
    return {
        "post": _post_out(p, full=True),
        "author": {
            "id": p.author.id if p.author else None,
            "name": p.author.name if p.author else p.author_name,
            "bio": p.author.bio if p.author else None,
            "profile_image": p.author.profile_image if p.author else p.author_avatar,
            "post_count": len([pp for pp in (p.author.posts if p.author else []) if pp.status == "published"]),
        } if p.author else {"name": p.author_name, "bio": None, "profile_image": p.author_avatar, "post_count": 0},
        "rating": {"average": avg_rating, "count": rating_count or 0, "distribution": rating_counts},
        "reactions": reaction_summary,
        "comment_count": comment_count,
    }


# ── Comments ──

class CommentIn(BaseModel):
    name: str
    email: Optional[str] = None
    content: str
    parent_id: Optional[int] = None
    turnstile_token: Optional[str] = None


def _comment_out(c: BlogComment) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "content": c.content,
        "parent_id": c.parent_id,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "replies": [_comment_out(r) for r in c.replies if r.is_approved],
    }


@router.get("/{post_id}/comments")
def list_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = db.query(BlogComment).filter(
        BlogComment.post_id == post_id,
        BlogComment.parent_id == None,
        BlogComment.is_approved == True,
    ).order_by(BlogComment.created_at.desc()).all()
    return {"items": [_comment_out(c) for c in comments]}


@router.post("/{post_id}/comments")
async def create_comment(post_id: int, payload: CommentIn, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)  # 10 per 5 min
    # Cloudflare Turnstile captcha verification (fails open if not configured).
    if not await verify_turnstile(payload.turnstile_token, client_ip):
        raise HTTPException(status_code=400, detail="Captcha verification failed. Please try again.")
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if payload.parent_id:
        parent = db.query(BlogComment).filter(BlogComment.id == payload.parent_id, BlogComment.post_id == post_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    comment = BlogComment(
        post_id=post_id,
        parent_id=payload.parent_id,
        name=payload.name.strip(),
        email=payload.email.strip() if payload.email else None,
        content=payload.content.strip(),
        is_approved=True,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_out(comment)


# ── Ratings & Reviews ──

class RatingIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    rating: int
    review: Optional[str] = None


@router.get("/{post_id}/ratings")
def get_ratings(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    ratings = db.query(BlogRating).filter(BlogRating.post_id == post_id).order_by(BlogRating.created_at.desc()).all()
    # Average via SQL aggregation (avoid Python loop over all rows).
    avg = db.query(func.avg(BlogRating.rating)).filter(BlogRating.post_id == post_id).scalar()
    return {
        "average": round(avg, 1) if avg else 0,
        "count": len(ratings),
        "items": [
            {"id": r.id, "name": r.name, "rating": r.rating, "review": r.review, "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in ratings
        ],
    }


@router.post("/{post_id}/ratings")
def submit_rating(post_id: int, payload: RatingIn, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    # Dedup: one rating per IP per post. If already rated, update the existing
    # rating instead of inserting a duplicate (so the average can't be spammed).
    ip_h = hash_ip(client_ip)
    existing = db.query(BlogRating).filter(
        BlogRating.post_id == post_id,
        BlogRating.ip_hash == ip_h,
    ).first()
    if existing:
        existing.rating = payload.rating
        existing.name = payload.name.strip() if payload.name else existing.name
        existing.email = payload.email.strip() if payload.email else existing.email
        existing.review = payload.review.strip() if payload.review else existing.review
        db.commit()
        db.refresh(existing)
        rating_id = existing.id
    else:
        rating = BlogRating(
            post_id=post_id,
            name=payload.name.strip() if payload.name else None,
            email=payload.email.strip() if payload.email else None,
            rating=payload.rating,
            review=payload.review.strip() if payload.review else None,
            ip_hash=ip_h,
        )
        db.add(rating)
        db.commit()
        db.refresh(rating)
        rating_id = rating.id
    avg = db.query(func.avg(BlogRating.rating)).filter(BlogRating.post_id == post_id).scalar()
    count = db.query(func.count(BlogRating.id)).filter(BlogRating.post_id == post_id).scalar()
    return {"average": round(avg or 0, 1), "count": count or 0, "id": rating_id}


# ── Reactions ──

_ALLOWED_REACTIONS = {"clap", "like", "love", "fire", "rocket"}


class ReactionIn(BaseModel):
    reaction_type: str = "clap"  # clap, like, love, fire, rocket


@router.get("/{post_id}/reactions")
def get_reactions(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    reactions = db.query(BlogReaction).filter(BlogReaction.post_id == post_id).all()
    summary = {}
    for r in reactions:
        summary[r.reaction_type] = summary.get(r.reaction_type, 0) + 1
    return {"total": len(reactions), "breakdown": summary}


@router.post("/{post_id}/reactions")
def add_reaction(post_id: int, payload: ReactionIn, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)
    # Validate reaction_type against an allowlist to prevent DB pollution.
    if payload.reaction_type not in _ALLOWED_REACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid reaction_type. Allowed: {', '.join(sorted(_ALLOWED_REACTIONS))}",
        )
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # Dedup: one reaction per IP per post. If already reacted, update the
    # existing reaction_type (toggle) instead of inserting duplicates.
    ip_h = hash_ip(client_ip)
    existing = db.query(BlogReaction).filter(
        BlogReaction.post_id == post_id,
        BlogReaction.ip_hash == ip_h,
    ).first()
    if existing:
        if existing.reaction_type == payload.reaction_type:
            # Same reaction again → remove (toggle off).
            db.delete(existing)
            db.commit()
        else:
            existing.reaction_type = payload.reaction_type
            db.commit()
    else:
        reaction = BlogReaction(
            post_id=post_id,
            reaction_type=payload.reaction_type,
            ip_hash=ip_h,
        )
        db.add(reaction)
        db.commit()
    reactions = db.query(BlogReaction).filter(BlogReaction.post_id == post_id).all()
    summary = {}
    for r in reactions:
        summary[r.reaction_type] = summary.get(r.reaction_type, 0) + 1
    return {"total": len(reactions), "breakdown": summary}
