"""
SEO / AEO Router — all SEO and Answer-Engine-Optimization endpoints.

Public reads (GET) are open; writes (POST/PUT/DELETE) require device auth,
matching the existing pattern used across the codebase.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import json
import re
import httpx
import os

from database import get_db
from cache import cache
from models import (
    SiteSettings, SeoPageMeta, Redirect, CourseFaq, Course,
    GscProperty, GscQueryStat, BlogPost, FAQ, CourseExtendedContent,
    AISettings, SeoFooterDirectory,
)
from routers.auth import require_device
from helpers import rewrite_url
from routers.settings import _call_openrouter_chat, _extract_json

router = APIRouter(prefix="/api/seo", tags=["SEO / AEO"])

# ═══════════════════════════════════════════════════════════════
#  PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════════

class SeoSiteSchema(BaseModel):
    og_image_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    canonical_base_url: Optional[str] = None
    google_site_verification: Optional[str] = None
    default_robots_index: Optional[bool] = None
    organization_schema: Optional[str] = None
    llms_txt: Optional[str] = None
    llms_full_enabled: Optional[bool] = None
    ai_bot_allow: Optional[str] = None
    gsc_refresh_token: Optional[str] = None  # write-only, never returned in GET

class SeoPageMetaSchema(BaseModel):
    page_key: str
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    canonical_path: Optional[str] = None
    og_image_url: Optional[str] = None
    # NOTE: field is named schema_json_ld (not schema_json) to avoid shadowing
    # pydantic BaseModel.schema_json(). Stored in DB column schema_json.
    schema_json_ld: Optional[str] = None

class CourseFaqCreate(BaseModel):
    question: str
    answer: str
    is_active: bool = True

class CourseFaqUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    is_active: Optional[bool] = None

class CourseFaqReorder(BaseModel):
    id: int
    order_index: int

class RedirectCreate(BaseModel):
    from_path: str
    to_path: str
    status_code: int = 301
    is_active: bool = True

class RedirectUpdate(BaseModel):
    from_path: Optional[str] = None
    to_path: Optional[str] = None
    status_code: Optional[int] = None
    is_active: Optional[bool] = None

class SeoDirectoryLinkItem(BaseModel):
    id: Optional[str] = None
    label: str
    url: str
    is_external: Optional[bool] = False
    order_index: Optional[int] = 0

class SeoDirectoryCategory(BaseModel):
    id: Optional[str] = None
    title: str
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True
    links: List[SeoDirectoryLinkItem] = []

class SeoDirectorySchema(BaseModel):
    tagline: Optional[str] = "#Create Impact"
    show_tagline: Optional[bool] = True
    is_active: Optional[bool] = True
    categories: List[SeoDirectoryCategory] = []



# ═══════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════

DEFAULT_AI_BOTS = {
    "GPTBot": True,
    "ClaudeBot": True,
    "PerplexityBot": True,
    "Google-Extended": True,
    "CCBot": True,
    "OAI-SearchBot": True,
    "anthropic-ai": True,
}

STATIC_PAGE_KEYS = ["home", "about_us", "contact_us", "blog_list", "courses_list", "about_iinm"]


def _get_ai_bots(settings: SiteSettings) -> dict:
    if settings and settings.ai_bot_allow:
        try:
            parsed = json.loads(settings.ai_bot_allow)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return dict(DEFAULT_AI_BOTS)


def _strip_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


def _get_base_url(db: Session) -> str:
    s = db.query(SiteSettings).first()
    if s and s.canonical_base_url:
        return s.canonical_base_url.rstrip("/")
    return os.getenv("PUBLIC_BASE_URL", "https://iinmedu.com").rstrip("/")


# ═══════════════════════════════════════════════════════════════
#  1. GLOBAL SEO / AEO SITE SETTINGS
# ═══════════════════════════════════════════════════════════════

@router.get("/site")
def get_seo_site_settings(db: Session = Depends(get_db)):
    """Public: return global SEO/AEO settings (gsc_refresh_token excluded)."""
    cached_val = cache.get("seo_site")
    if cached_val is not None:
        return cached_val
    s = db.query(SiteSettings).first()
    if not s:
        result = {
            "og_image_url": None,
            "twitter_handle": None,
            "canonical_base_url": None,
            "google_site_verification": None,
            "default_robots_index": True,
            "organization_schema": None,
            "llms_txt": None,
            "llms_full_enabled": True,
            "ai_bot_allow": json.dumps(DEFAULT_AI_BOTS),
        }
    else:
        result = {
            "og_image_url": rewrite_url(s.og_image_url),
            "twitter_handle": s.twitter_handle,
            "canonical_base_url": s.canonical_base_url,
            "google_site_verification": s.google_site_verification,
            "default_robots_index": s.default_robots_index if s.default_robots_index is not None else True,
            "organization_schema": s.organization_schema,
            "llms_txt": s.llms_txt,
            "llms_full_enabled": s.llms_full_enabled if s.llms_full_enabled is not None else True,
            "ai_bot_allow": s.ai_bot_allow or json.dumps(DEFAULT_AI_BOTS),
        }
    cache.set("seo_site", result)
    return result


@router.put("/site")
def update_seo_site_settings(
    req: SeoSiteSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    s = db.query(SiteSettings).first()
    if not s:
        s = SiteSettings()
        db.add(s)
    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(s, field):
            if isinstance(value, str) and value.strip() == "":
                setattr(s, field, None)
            else:
                setattr(s, field, value)
    db.commit()
    cache.invalidate_many(["seo_site", "site_settings"])
    return {"status": "success"}


# ═══════════════════════════════════════════════════════════════
#  2. STATIC PAGE SEO META
# ═══════════════════════════════════════════════════════════════

@router.get("/pages")
def list_seo_pages(db: Session = Depends(get_db)):
    """Public: list all static page SEO meta."""
    cached_val = cache.get("seo_pages")
    if cached_val is not None:
        return cached_val
    pages = db.query(SeoPageMeta).all()
    result = [_page_out(p) for p in pages]
    cache.set("seo_pages", result)
    return result


@router.get("/pages/{page_key}")
def get_seo_page(page_key: str, db: Session = Depends(get_db)):
    """Public: single page meta."""
    p = db.query(SeoPageMeta).filter(SeoPageMeta.page_key == page_key).first()
    if not p:
        return _page_out(SeoPageMeta(page_key=page_key))
    return _page_out(p)


@router.put("/pages/{page_key}")
def upsert_seo_page(
    page_key: str,
    req: SeoPageMetaSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    p = db.query(SeoPageMeta).filter(SeoPageMeta.page_key == page_key).first()
    if not p:
        p = SeoPageMeta(page_key=page_key)
        db.add(p)
    data = req.model_dump(exclude_unset=True)
    data.pop("page_key", None)  # don't overwrite the key
    # Map schema_json_ld → schema_json DB column
    if "schema_json_ld" in data:
        data["schema_json"] = data.pop("schema_json_ld")
    for field, value in data.items():
        if hasattr(p, field):
            if isinstance(value, str) and value.strip() == "":
                setattr(p, field, None)
            else:
                setattr(p, field, value)
    db.commit()
    db.refresh(p)
    cache.invalidate("seo_pages")
    return _page_out(p)


def _page_out(p: SeoPageMeta) -> dict:
    return {
        "id": p.id,
        "page_key": p.page_key,
        "seo_title": p.seo_title,
        "seo_description": p.seo_description,
        "seo_keywords": p.seo_keywords,
        "canonical_path": p.canonical_path,
        "og_image_url": rewrite_url(p.og_image_url),
        "schema_json": p.schema_json,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ═══════════════════════════════════════════════════════════════
#  3. COURSE FAQs (AEO + FAQPage schema)
# ═══════════════════════════════════════════════════════════════

@router.get("/courses/{course_id}/faqs")
def get_course_faqs(course_id: int, db: Session = Depends(get_db)):
    """Public: list active FAQs for a course. Falls back to CourseExtendedContent.faqs_json."""
    faqs = db.query(CourseFaq).filter(
        CourseFaq.course_id == course_id,
        CourseFaq.is_active == True,
    ).order_by(CourseFaq.order_index.asc(), CourseFaq.id.asc()).all()
    if faqs:
        return [_course_faq_out(f) for f in faqs]
    # Fallback: parse faqs_json from extended content
    ext = db.query(CourseExtendedContent).filter(
        CourseExtendedContent.course_id == course_id
    ).first()
    if ext and ext.faqs_json:
        try:
            raw = json.loads(ext.faqs_json)
            if isinstance(raw, list):
                return [
                    {
                        "id": -(i + 1),  # negative IDs to distinguish from DB rows
                        "course_id": course_id,
                        "question": item.get("question") or item.get("q") or "",
                        "answer": item.get("answer") or item.get("a") or "",
                        "order_index": i,
                        "is_active": True,
                        "source": "extended_json",
                    }
                    for i, item in enumerate(raw)
                    if (item.get("question") or item.get("q")) and (item.get("answer") or item.get("a"))
                ]
        except Exception:
            pass
    return []


@router.post("/courses/{course_id}/faqs")
def create_course_faq(
    course_id: int,
    req: CourseFaqCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    max_order = db.query(func.max(CourseFaq.order_index)).filter(
        CourseFaq.course_id == course_id
    ).scalar() or 0
    faq = CourseFaq(
        course_id=course_id,
        question=req.question,
        answer=req.answer,
        is_active=req.is_active,
        order_index=max_order + 1,
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return _course_faq_out(faq)


@router.put("/course-faqs/{faq_id}")
def update_course_faq(
    faq_id: int,
    req: CourseFaqUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    faq = db.query(CourseFaq).filter(CourseFaq.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    data = req.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(faq, field, value)
    db.commit()
    return _course_faq_out(faq)


@router.delete("/course-faqs/{faq_id}")
def delete_course_faq(
    faq_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    faq = db.query(CourseFaq).filter(CourseFaq.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()
    return {"status": "success"}


@router.post("/course-faqs/reorder")
def reorder_course_faqs(
    payload: List[CourseFaqReorder],
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    for item in payload:
        faq = db.query(CourseFaq).filter(CourseFaq.id == item.id).first()
        if faq:
            faq.order_index = item.order_index
    db.commit()
    return {"status": "success"}


def _course_faq_out(f: CourseFaq) -> dict:
    return {
        "id": f.id,
        "course_id": f.course_id,
        "question": f.question,
        "answer": f.answer,
        "order_index": f.order_index,
        "is_active": f.is_active,
        "source": "db",
    }


# ═══════════════════════════════════════════════════════════════
#  4. REDIRECTS
# ═══════════════════════════════════════════════════════════════

@router.get("/redirects")
def list_redirects(db: Session = Depends(get_db)):
    """Public: list all active redirects (used by frontend middleware)."""
    redirects = db.query(Redirect).filter(Redirect.is_active == True).all()
    return [_redirect_out(r) for r in redirects]


@router.get("/redirects/all")
def list_all_redirects(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: list ALL redirects (including inactive)."""
    redirects = db.query(Redirect).order_by(Redirect.id.desc()).all()
    return [_redirect_out(r) for r in redirects]


@router.post("/redirects")
def create_redirect(
    req: RedirectCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    existing = db.query(Redirect).filter(Redirect.from_path == req.from_path).first()
    if existing:
        raise HTTPException(status_code=409, detail="A redirect with this 'from_path' already exists")
    r = Redirect(
        from_path=req.from_path,
        to_path=req.to_path,
        status_code=req.status_code,
        is_active=req.is_active,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _redirect_out(r)


@router.put("/redirects/{redirect_id}")
def update_redirect(
    redirect_id: int,
    req: RedirectUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    r = db.query(Redirect).filter(Redirect.id == redirect_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Redirect not found")
    data = req.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(r, field, value)
    db.commit()
    return _redirect_out(r)


@router.delete("/redirects/{redirect_id}")
def delete_redirect(
    redirect_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    r = db.query(Redirect).filter(Redirect.id == redirect_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Redirect not found")
    db.delete(r)
    db.commit()
    return {"status": "success"}


def _redirect_out(r: Redirect) -> dict:
    return {
        "id": r.id,
        "from_path": r.from_path,
        "to_path": r.to_path,
        "status_code": r.status_code or 301,
        "is_active": r.is_active,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ═══════════════════════════════════════════════════════════════
#  5. SITEMAP STATUS + PING
# ═══════════════════════════════════════════════════════════════

@router.get("/sitemap-status")
def sitemap_status(db: Session = Depends(get_db)):
    """Public: URL counts by type for sitemap status display."""
    course_count = db.query(Course).filter(Course.status == "PUBLISHED").count()
    blog_count = db.query(BlogPost).filter(BlogPost.status == "published").count()
    static_count = len(STATIC_PAGE_KEYS)
    last_course_mod = db.query(func.max(Course.updated_at)).filter(
        Course.status == "PUBLISHED"
    ).scalar()
    last_blog_mod = db.query(func.max(BlogPost.updated_at)).filter(
        BlogPost.status == "published"
    ).scalar()
    return {
        "courses": {"count": course_count, "last_modified": last_course_mod.isoformat() if last_course_mod else None},
        "blogs": {"count": blog_count, "last_modified": last_blog_mod.isoformat() if last_blog_mod else None},
        "static": {"count": static_count},
        "total": course_count + blog_count + static_count,
        "base_url": _get_base_url(db),
    }


@router.post("/sitemap-ping")
def ping_sitemap(engine: str = "google", device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: ping Google or Bing with the sitemap URL."""
    base = _get_base_url(db)
    sitemap_url = f"{base}/sitemap.xml"
    if engine == "bing":
        ping_url = f"https://www.bing.com/ping?sitemap={sitemap_url}"
    else:
        ping_url = f"https://www.google.com/ping?sitemap={sitemap_url}"
    try:
        resp = httpx.get(ping_url, timeout=15, follow_redirects=True)
        return {"status": "success", "engine": engine, "http_status": resp.status_code, "pinged_url": ping_url}
    except Exception as e:
        return {"status": "error", "engine": engine, "message": str(e)}


# ═══════════════════════════════════════════════════════════════
#  6. llms.txt + llms-full.txt
# ═══════════════════════════════════════════════════════════════

@router.get("/llms-txt")
def get_llms_txt(db: Session = Depends(get_db)):
    """Public: return llms.txt content. Manual override if set, else auto-generated."""
    cached_val = cache.get("seo_llms_txt")
    if cached_val is not None:
        return cached_val
    s = db.query(SiteSettings).first()
    if s and s.llms_txt and s.llms_txt.strip():
        result = {"content": s.llms_txt, "source": "manual"}
    else:
        result = {"content": _auto_generate_llms_txt(db), "source": "auto"}
    cache.set("seo_llms_txt", result)
    return result


@router.put("/llms-txt")
def update_llms_txt(
    payload: dict,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    s = db.query(SiteSettings).first()
    if not s:
        s = SiteSettings()
        db.add(s)
    content = payload.get("content", "")
    s.llms_txt = content.strip() if content and content.strip() else None
    db.commit()
    cache.invalidate("seo_llms_txt")
    return {"status": "success"}


@router.get("/llms-full")
def get_llms_full(db: Session = Depends(get_db)):
    """Public: auto-generated full markdown dump of all content for LLMs."""
    return {"content": _auto_generate_llms_full(db)}


def _auto_generate_llms_txt(db: Session) -> str:
    s = db.query(SiteSettings).first()
    site_name = (s.site_name if s else None) or "IINM"
    base = _get_base_url(db)
    lines = [f"# {site_name}", ""]
    desc = (s.meta_description if s else None) or "AI-Powered Connected Learning Platform"
    lines.append(f"> {desc}")
    lines.append("")
    lines.append("## Courses")
    courses = db.query(Course).filter(Course.status == "PUBLISHED").order_by(Course.id.asc()).all()
    for c in courses[:50]:
        title = c.title or "Untitled"
        slug = c.slug or ""
        if slug:
            lines.append(f"- [{title}]({base}/courses/{slug})")
    lines.append("")
    lines.append("## Blog")
    posts = db.query(BlogPost).filter(BlogPost.status == "published").order_by(BlogPost.id.desc()).limit(20).all()
    for p in posts:
        title = p.title or "Untitled"
        slug = p.slug or ""
        if slug:
            lines.append(f"- [{title}]({base}/blog/{slug})")
    lines.append("")
    lines.append("## About")
    lines.append(f"- [About Us]({base}/about-us)")
    lines.append(f"- [Contact Us]({base}/contact-us)")
    lines.append("")
    lines.append("## FAQs")
    faqs = db.query(FAQ).filter(FAQ.is_active == True).order_by(FAQ.order_index.asc()).limit(20).all()
    for f in faqs:
        q = (f.question or "").strip()
        if q:
            lines.append(f"- {q}")
    return "\n".join(lines)


def _auto_generate_llms_full(db: Session) -> str:
    s = db.query(SiteSettings).first()
    site_name = (s.site_name if s else None) or "IINM"
    base = _get_base_url(db)
    parts = [f"# {site_name} — Full Content for LLMs", ""]
    desc = (s.meta_description if s else None) or "AI-Powered Connected Learning Platform"
    parts.append(f"> {desc}")
    parts.append(f"> Website: {base}")
    parts.append("")

    # Courses
    parts.append("## Courses")
    parts.append("")
    courses = db.query(Course).filter(Course.status == "PUBLISHED").order_by(Course.id.asc()).all()
    for c in courses:
        parts.append(f"### {c.title}")
        if c.slug:
            parts.append(f"URL: {base}/courses/{c.slug}")
        if c.description:
            parts.append(f"Description: {_strip_html(c.description)[:500]}")
        if c.what_you_will_learn:
            parts.append(f"What you will learn: {_strip_html(c.what_you_will_learn)[:800]}")
        if c.skill_level:
            parts.append(f"Skill level: {c.skill_level}")
        if c.instructor_name:
            parts.append(f"Instructor: {c.instructor_name}")
        # Course FAQs
        cfaqs = db.query(CourseFaq).filter(
            CourseFaq.course_id == c.id, CourseFaq.is_active == True
        ).order_by(CourseFaq.order_index.asc()).all()
        if cfaqs:
            parts.append("FAQs:")
            for fq in cfaqs:
                parts.append(f"  Q: {fq.question}")
                parts.append(f"  A: {_strip_html(fq.answer)[:500]}")
        parts.append("")

    # Blog posts
    parts.append("## Blog Posts")
    parts.append("")
    posts = db.query(BlogPost).filter(BlogPost.status == "published").order_by(BlogPost.id.desc()).limit(100).all()
    for p in posts:
        parts.append(f"### {p.title}")
        if p.slug:
            parts.append(f"URL: {base}/blog/{p.slug}")
        if p.excerpt:
            parts.append(f"Summary: {_strip_html(p.excerpt)[:300]}")
        if p.content:
            parts.append(f"Content: {_strip_html(p.content)[:2000]}")
        parts.append("")

    # Global FAQs
    faqs = db.query(FAQ).filter(FAQ.is_active == True).order_by(FAQ.order_index.asc()).all()
    if faqs:
        parts.append("## General FAQs")
        parts.append("")
        for f in faqs:
            parts.append(f"Q: {f.question}")
            parts.append(f"A: {_strip_html(f.answer)[:500]}")
            parts.append("")

    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════════
#  7. SEO / AEO SCORE
# ═══════════════════════════════════════════════════════════════

@router.get("/score")
def get_seo_score(
    page_key: Optional[str] = None,
    course_id: Optional[int] = None,
    blog_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Public: compute SEO + AEO score for a page/course/blog."""
    title = None
    description = None
    canonical = None
    og_image = None
    schema_present = False
    faq_count = 0

    if course_id:
        c = db.query(Course).filter(Course.id == course_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Course not found")
        title = c.seo_title or c.title
        description = c.seo_description or c.description
        canonical = c.slug
        og_image = c.thumbnail_url
        schema_present = True  # Course schema is auto-injected
        faq_count = db.query(CourseFaq).filter(
            CourseFaq.course_id == course_id, CourseFaq.is_active == True
        ).count()
    elif blog_id:
        p = db.query(BlogPost).filter(BlogPost.id == blog_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Blog post not found")
        title = p.seo_title or p.title
        description = p.seo_description or p.excerpt
        canonical = p.slug
        og_image = p.featured_image
        schema_present = True  # Article schema is auto-injected
    elif page_key:
        pm = db.query(SeoPageMeta).filter(SeoPageMeta.page_key == page_key).first()
        if pm:
            title = pm.seo_title
            description = pm.seo_description
            canonical = pm.canonical_path
            og_image = pm.og_image_url
            schema_present = bool(pm.schema_json)
    else:
        raise HTTPException(status_code=400, detail="Provide page_key, course_id, or blog_id")

    checks = []
    # Title
    title_len = len(title) if title else 0
    checks.append({"name": "title_present", "passed": title_len > 0, "message": f"Title length: {title_len}"})
    checks.append({"name": "title_length", "passed": 30 <= title_len <= 60, "message": f"Ideal 30-60 chars, got {title_len}"})
    # Description
    desc_len = len(description) if description else 0
    checks.append({"name": "description_present", "passed": desc_len > 0, "message": f"Description length: {desc_len}"})
    checks.append({"name": "description_length", "passed": 120 <= desc_len <= 160, "message": f"Ideal 120-160 chars, got {desc_len}"})
    # Canonical
    checks.append({"name": "canonical_set", "passed": bool(canonical), "message": "Canonical URL set" if canonical else "No canonical"})
    # OG image
    checks.append({"name": "og_image_set", "passed": bool(og_image), "message": "OG image set" if og_image else "No OG image"})
    # Schema
    checks.append({"name": "schema_present", "passed": schema_present, "message": "JSON-LD schema present" if schema_present else "No schema"})
    # FAQ (AEO)
    checks.append({"name": "faq_present", "passed": faq_count > 0, "message": f"{faq_count} FAQs"})

    passed_count = sum(1 for c in checks if c["passed"])
    seo_checks = [c for c in checks if c["name"] != "faq_present"]
    seo_passed = sum(1 for c in seo_checks if c["passed"])
    seo_score = round((seo_passed / len(seo_checks)) * 100) if seo_checks else 0
    aeo_score = round((passed_count / len(checks)) * 100) if checks else 0

    return {
        "score": seo_score,
        "aeo_score": aeo_score,
        "checks": checks,
        "faq_count": faq_count,
    }


# ═══════════════════════════════════════════════════════════════
#  8. GOOGLE SEARCH CONSOLE (GSC)
# ═══════════════════════════════════════════════════════════════

@router.get("/gsc/properties")
def list_gsc_properties(device: str = Depends(require_device), db: Session = Depends(get_db)):
    props = db.query(GscProperty).all()
    return [{"id": p.id, "site_url": p.site_url, "is_default": p.is_default} for p in props]


@router.post("/gsc/sync")
def sync_gsc_stats(
    payload: dict,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: pull stats from GSC API and store. payload: {property_id, start_date, end_date}"""
    # This is a placeholder — full GSC API integration requires OAuth token.
    # The frontend will trigger this after OAuth is connected.
    property_id = payload.get("property_id")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    if not property_id:
        raise HTTPException(status_code=400, detail="property_id required")
    prop = db.query(GscProperty).filter(GscProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    s = db.query(SiteSettings).first()
    if not s or not s.gsc_refresh_token:
        raise HTTPException(status_code=400, detail="GSC not connected. Complete OAuth first.")
    # TODO: implement full GSC API call with refresh token when OAuth is wired
    return {"status": "not_implemented", "message": "GSC sync requires OAuth token exchange. Use /gsc/oauth/start first."}


@router.get("/gsc/stats")
def get_gsc_stats(
    property_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: aggregated GSC stats for dashboard."""
    query = db.query(GscQueryStat)
    if property_id:
        query = query.filter(GscQueryStat.property_id == property_id)
    if start_date:
        try:
            query = query.filter(GscQueryStat.date >= date.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(GscQueryStat.date <= date.fromisoformat(end_date))
        except ValueError:
            pass

    total_impressions = query.with_entities(func.sum(GscQueryStat.impressions)).scalar() or 0
    total_clicks = query.with_entities(func.sum(GscQueryStat.clicks)).scalar() or 0
    avg_position = query.with_entities(func.avg(GscQueryStat.position)).scalar() or 0
    total_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

    top_queries = query.group_by(GscQueryStat.query).with_entities(
        GscQueryStat.query,
        func.sum(GscQueryStat.impressions).label("impressions"),
        func.sum(GscQueryStat.clicks).label("clicks"),
        func.avg(GscQueryStat.position).label("position"),
    ).order_by(desc("clicks")).limit(20).all()

    top_pages = query.group_by(GscQueryStat.page).with_entities(
        GscQueryStat.page,
        func.sum(GscQueryStat.impressions).label("impressions"),
        func.sum(GscQueryStat.clicks).label("clicks"),
        func.avg(GscQueryStat.position).label("position"),
    ).order_by(desc("clicks")).limit(20).all()

    return {
        "summary": {
            "impressions": int(total_impressions),
            "clicks": int(total_clicks),
            "ctr": round(total_ctr, 2),
            "avg_position": round(float(avg_position), 2),
        },
        "top_queries": [
            {"query": q, "impressions": int(i), "clicks": int(c), "position": round(float(p), 2)}
            for q, i, c, p in top_queries
        ],
        "top_pages": [
            {"page": pg, "impressions": int(i), "clicks": int(c), "position": round(float(p), 2)}
            for pg, i, c, p in top_pages
        ],
    }


@router.get("/gsc/oauth/start")
def gsc_oauth_start(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: begin GSC OAuth flow. Returns authorization URL."""
    # Reuse Google API credentials from contact settings
    from models import ContactSettings
    cs = db.query(ContactSettings).first() if hasattr(db.query(ContactSettings), 'first') else None
    client_id = None
    if cs:
        client_id = getattr(cs, 'google_client_id', None)
    if not client_id:
        # Fallback: check env
        client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=400, detail="Google OAuth client_id not configured. Set it in Google API settings.")
    base = _get_base_url(db)
    redirect_uri = f"{base}/api/seo/gsc/oauth/callback"
    scope = "https://www.googleapis.com/auth/webmasters.readonly"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"auth_url": auth_url}


@router.get("/gsc/oauth/callback")
def gsc_oauth_callback(code: str, db: Session = Depends(get_db)):
    """OAuth callback: exchange code for refresh token and store."""
    from models import ContactSettings
    cs = db.query(ContactSettings).first() if hasattr(db.query(ContactSettings), 'first') else None
    client_id = getattr(cs, 'google_client_id', None) if cs else None
    client_secret = getattr(cs, 'google_client_secret', None) if cs else None
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Google OAuth credentials not configured")
    base = _get_base_url(db)
    redirect_uri = f"{base}/api/seo/gsc/oauth/callback"
    try:
        resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        token_data = resp.json()
        refresh_token = token_data.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=400, detail="No refresh_token returned. Try with prompt=consent.")
        s = db.query(SiteSettings).first()
        if not s:
            s = SiteSettings()
            db.add(s)
        s.gsc_refresh_token = refresh_token
        db.commit()
        return {"status": "success", "message": "GSC connected successfully. You can close this window."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth exchange failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════
#  9. AI FAQ SUGGESTIONS (AEO — uses existing OpenRouter AI settings)
# ═══════════════════════════════════════════════════════════════

class FaqSuggestionRequest(BaseModel):
    course_id: Optional[int] = None
    context_text: Optional[str] = None  # custom context if no course_id
    count: int = 5
    model: Optional[str] = None  # Override model for this request


@router.post("/ai/suggest-faqs")
async def suggest_faqs_with_ai(
    req: FaqSuggestionRequest,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: use existing OpenRouter AI settings to suggest FAQs for a course or custom context.
    Returns suggested Q&A pairs — does NOT save them. Admin reviews and saves via the FAQ CRUD endpoints."""
    settings = db.query(AISettings).first()
    if not settings or not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured. Set it in AI Settings.")

    # Build context from course or custom text
    context = ""
    course_title = ""
    if req.course_id:
        c = db.query(Course).filter(Course.id == req.course_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Course not found")
        course_title = c.title or ""
        context = f"Course Title: {c.title}\n"
        if c.description:
            context += f"Description: {_strip_html(c.description)[:500]}\n"
        if c.what_you_will_learn:
            context += f"What you will learn: {_strip_html(c.what_you_will_learn)[:800]}\n"
        if c.target_audience:
            context += f"Target audience: {_strip_html(c.target_audience)[:300]}\n"
        if c.skill_level:
            context += f"Skill level: {c.skill_level}\n"
    elif req.context_text:
        context = req.context_text[:2000]
    else:
        raise HTTPException(status_code=400, detail="Provide course_id or context_text")

    model = req.model or settings.model_general_text or "openai/gpt-4o-mini"
    system_prompt = f"""You are an expert SEO/AEO content creator. Generate exactly {req.count} FAQ (Frequently Asked Questions) pairs for the following content.

Return a JSON object with exactly this structure:
{{
  "faqs": [
    {{
      "question": "Clear, concise question?",
      "answer": "Factual, concise answer (2-3 sentences max)."
    }}
  ]
}}

Rules:
- Questions should be what real users/searchers would ask
- Answers should be factual and directly answer the question
- Keep questions under 80 characters
- Keep answers under 300 characters
- Focus on practical, high-value questions
- Use natural language (not keyword-stuffed)
- You MUST return a valid JSON object. Do NOT include any text before or after the JSON."""

    try:
        raw_text = await _call_openrouter_chat(
            settings.openrouter_api_key, model, system_prompt,
            f"Content context:\n{context}",
            max_tokens=2048, json_mode=True, reasoning_effort="low",
        )
        try:
            parsed = _extract_json(raw_text)
        except ValueError:
            import logging
            logging.error(f"suggest-faqs JSON parse failed. Model: {model}. Raw (first 500): {str(raw_text)[:500]}")
            raise HTTPException(status_code=500, detail=f"AI returned unparseable response. Try a different model. Model used: {model}")
        faqs = parsed.get("faqs", [])
        return {
            "suggestions": faqs[:req.count],
            "course_title": course_title,
            "model": model,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate FAQs: {str(e)}")


# ═══════════════════════════════════════════════════════════════
#  9a. AI GENERATE ORGANIZATION SCHEMA (JSON-LD)
# ═══════════════════════════════════════════════════════════════

class GenerateOrgSchemaRequest(BaseModel):
    model: Optional[str] = None  # Override model for this request


@router.post("/ai/generate-org-schema")
async def generate_org_schema_with_ai(
    req: GenerateOrgSchemaRequest,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: use OpenRouter AI to generate an EducationalOrganization JSON-LD schema from site settings."""
    settings = db.query(AISettings).first()
    if not settings or not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured. Set it in AI Settings.")

    site = db.query(SiteSettings).first()
    site_name = (site.site_name if site else None) or "IINM"
    site_url = (site.canonical_base_url if site else None) or "https://iinmedu.com"
    site_url = site_url.rstrip("/")
    logo_url = ""
    if site and site.logo_url:
        logo_url = site.logo_url if site.logo_url.startswith("http") else f"{site_url}{site.logo_url}"
    description = (site.meta_description if site else None) or "AI-Powered Connected Learning Platform"

    model = req.model or settings.model_general_text or "openai/gpt-4o-mini"

    system_prompt = f"""You are an expert SEO specialist. Generate a schema.org JSON-LD object for an educational organization.

Context:
- Organization name: {site_name}
- Website URL: {site_url}
- Logo URL: {logo_url or "(not available — omit logo field)"}
- Description: {description}
- Type: EducationalOrganization (Indian ed-tech platform)

Rules:
- The JSON-LD object MUST include "@context": "https://schema.org" and "@type": "EducationalOrganization".
- Include: name, url, logo (if available), description, sameAs (empty array if no social links known).
- Include an "address" with addressCountry: "IN".
- Include "areaServed": "IN".
- You MUST return a valid JSON object. Do NOT include any text before or after the JSON.

Return a JSON object with this structure:
{{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "{site_name}",
  "url": "{site_url}",
  "description": "...",
  "address": {{"@type": "PostalAddress", "addressCountry": "IN"}},
  "areaServed": "IN",
  "sameAs": []
}}
"""

    try:
        raw_text = await _call_openrouter_chat(
            settings.openrouter_api_key, model, system_prompt,
            f"Generate the Organization JSON-LD schema for {site_name}.",
            max_tokens=2048, json_mode=True, reasoning_effort="low",
        )
        try:
            result = _extract_json(raw_text)
        except ValueError:
            import logging
            logging.error(f"generate-org-schema JSON parse failed. Model: {model}. Raw (first 500): {str(raw_text)[:500]}")
            raise HTTPException(status_code=500, detail=f"AI returned unparseable response. Try a different model. Model used: {model}")
        schema_str = json.dumps(result, ensure_ascii=False, indent=2)
        return {"status": "success", "data": {"organization_schema": schema_str}, "model_used": model}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


# ═══════════════════════════════════════════════════════════════
#  10. SEO INTERNAL LINKS DIRECTORY (Footer Keyword Cloud Section)
# ═══════════════════════════════════════════════════════════════

DEFAULT_DIRECTORY_DATA = {
    "tagline": "#Create Impact",
    "show_tagline": True,
    "is_active": True,
    "categories": [
        {
            "id": "top-programs",
            "title": "Top Programs",
            "order_index": 0,
            "is_active": True,
            "links": [
                {"id": "tp-1", "label": "Software and AI Engineering", "url": "/courses", "order_index": 0},
                {"id": "tp-2", "label": "Modern Data Science and ML with Specialization in AI", "url": "/courses", "order_index": 1},
                {"id": "tp-3", "label": "AI Forward Deployed Engineer Program", "url": "/courses", "order_index": 2},
                {"id": "tp-4", "label": "DevOps, Cloud & AI Platform Engineering", "url": "/courses", "order_index": 3},
                {"id": "tp-5", "label": "AI & Machine Learning Program with Agentic AI", "url": "/courses/ai-agentic-software-devlopment", "order_index": 4},
                {"id": "tp-6", "label": "Online PGP in Business and AI", "url": "/courses", "order_index": 5},
                {"id": "tp-7", "label": "Global Master's in Computer Science by Woolf, optional Certification from Oxford", "url": "/courses", "order_index": 6},
                {"id": "tp-8", "label": "Global Master's in Artificial Intelligence by Woolf, optional Certification from Oxford", "url": "/courses", "order_index": 7},
                {"id": "tp-9", "label": "Executive Certification in Business & Technology Management by IIM Trichy", "url": "/courses", "order_index": 8},
                {"id": "tp-10", "label": "AI Engineering Advanced Certification by IIT-Roorkee CEC", "url": "/courses", "order_index": 9},
            ]
        },
        {
            "id": "trending-courses",
            "title": "Trending Courses",
            "order_index": 1,
            "is_active": True,
            "links": [
                {"id": "tc-1", "label": "Full Stack Developer Course", "url": "/courses", "order_index": 0},
                {"id": "tc-2", "label": "Machine Learning Course", "url": "/courses", "order_index": 1},
                {"id": "tc-3", "label": "Data Structures and Algorithms (DSA) Course", "url": "/courses", "order_index": 2},
                {"id": "tc-4", "label": "Web Development Course", "url": "/courses", "order_index": 3},
                {"id": "tc-5", "label": "System Design Course", "url": "/courses", "order_index": 4},
                {"id": "tc-6", "label": "Excel Automation with AI Agents Mastery", "url": "/courses/excel-automation-with-ai-agents-mastery", "order_index": 5},
                {"id": "tc-7", "label": "AI Finance Management Mastery (2026)", "url": "/courses/ai-finance-management-mastery-2026", "order_index": 6},
            ]
        },
        {
            "id": "free-courses",
            "title": "Free Certification Courses",
            "order_index": 2,
            "is_active": True,
            "links": [
                {"id": "fc-1", "label": "Python Course for Beginners", "url": "/courses", "order_index": 0},
                {"id": "fc-2", "label": "Free Agentic AI Course", "url": "/courses", "order_index": 1},
                {"id": "fc-3", "label": "DBMS Course", "url": "/courses", "order_index": 2},
                {"id": "fc-4", "label": "Java Course", "url": "/courses", "order_index": 3},
                {"id": "fc-5", "label": "React JS Course", "url": "/courses", "order_index": 4},
                {"id": "fc-6", "label": "Python & SQL For Data Science", "url": "/courses", "order_index": 5},
                {"id": "fc-7", "label": "Computer Networking Course", "url": "/courses", "order_index": 6},
                {"id": "fc-8", "label": "Operating System Course", "url": "/courses", "order_index": 7},
                {"id": "fc-9", "label": "SQL using MySQL Course", "url": "/courses", "order_index": 8},
                {"id": "fc-10", "label": "C++ Course", "url": "/courses", "order_index": 9},
                {"id": "fc-11", "label": "Javascript Course", "url": "/courses", "order_index": 10},
                {"id": "fc-12", "label": "DSA Java Course", "url": "/courses", "order_index": 11},
            ]
        },
        {
            "id": "tutorials",
            "title": "Tutorial",
            "order_index": 3,
            "is_active": True,
            "links": [
                {"id": "tut-1", "label": "Data Structure Tutorial", "url": "/blog", "order_index": 0},
                {"id": "tut-2", "label": "Agentic AI Tutorial", "url": "/blog", "order_index": 1},
                {"id": "tut-3", "label": "Python Tutorial", "url": "/blog", "order_index": 2},
                {"id": "tut-4", "label": "Java Tutorial", "url": "/blog", "order_index": 3},
                {"id": "tut-5", "label": "DBMS Tutorial", "url": "/blog", "order_index": 4},
                {"id": "tut-6", "label": "C Tutorial", "url": "/blog", "order_index": 5},
                {"id": "tut-7", "label": "JavaScript Tutorial", "url": "/blog", "order_index": 6},
                {"id": "tut-8", "label": "C++ Tutorial", "url": "/blog", "order_index": 7},
                {"id": "tut-9", "label": "Data Science Tutorial", "url": "/blog", "order_index": 8},
                {"id": "tut-10", "label": "CSS Tutorial", "url": "/blog", "order_index": 9},
                {"id": "tut-11", "label": "Software Engineering Tutorial", "url": "/blog", "order_index": 10},
                {"id": "tut-12", "label": "HTML Tutorial", "url": "/blog", "order_index": 11},
            ]
        },
        {
            "id": "career-resources",
            "title": "Career Advice Resources",
            "order_index": 4,
            "is_active": True,
            "links": [
                {"id": "car-1", "label": "Machine Learning Roadmap", "url": "/career", "order_index": 0},
                {"id": "car-2", "label": "SDE Roadmap", "url": "/career", "order_index": 1},
                {"id": "car-3", "label": "Web Development Roadmap", "url": "/career", "order_index": 2},
                {"id": "car-4", "label": "Python Developer Roadmap", "url": "/career", "order_index": 3},
                {"id": "car-5", "label": "AI Engineer Roadmap", "url": "/career", "order_index": 4},
                {"id": "car-6", "label": "MLOps Roadmap", "url": "/career", "order_index": 5},
                {"id": "car-7", "label": "Data Engineer Roadmap", "url": "/career", "order_index": 6},
                {"id": "car-8", "label": "Agentic AI Roadmap", "url": "/career", "order_index": 7},
                {"id": "car-9", "label": "React Roadmap", "url": "/career", "order_index": 8},
                {"id": "car-10", "label": "DevOps Roadmap", "url": "/career", "order_index": 9},
            ]
        }
    ]
}


@router.get("/directory-links")
def get_seo_directory_links(db: Session = Depends(get_db)):
    """Public: returns structured internal linking directory for footer keyword cloud."""
    cached_val = cache.get("seo:directory_links")
    if cached_val:
        return cached_val

    entry = db.query(SeoFooterDirectory).first()
    if not entry:
        # Seed default entry on first request
        entry = SeoFooterDirectory(
            tagline=DEFAULT_DIRECTORY_DATA.get("tagline", "#Create Impact"),
            show_tagline=DEFAULT_DIRECTORY_DATA.get("show_tagline", True),
            is_active=DEFAULT_DIRECTORY_DATA.get("is_active", True),
            data_json=json.dumps(DEFAULT_DIRECTORY_DATA.get("categories", [])),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

    categories = []
    if entry.data_json:
        try:
            categories = json.loads(entry.data_json)
        except Exception:
            categories = DEFAULT_DIRECTORY_DATA.get("categories", [])

    result = {
        "tagline": entry.tagline or "#Create Impact",
        "show_tagline": entry.show_tagline if entry.show_tagline is not None else True,
        "is_active": entry.is_active if entry.is_active is not None else True,
        "categories": categories,
    }
    cache.set("seo:directory_links", result, ttl=300)
    return result


@router.put("/directory-links")
def update_seo_directory_links(
    payload: SeoDirectorySchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: updates structured internal linking directory."""
    entry = db.query(SeoFooterDirectory).first()
    if not entry:
        entry = SeoFooterDirectory()
        db.add(entry)

    entry.tagline = payload.tagline or "#Create Impact"
    entry.show_tagline = payload.show_tagline if payload.show_tagline is not None else True
    entry.is_active = payload.is_active if payload.is_active is not None else True
    entry.data_json = json.dumps([c.dict() for c in payload.categories])

    db.commit()
    db.refresh(entry)
    cache.invalidate("seo:directory_links")

    return {
        "status": "success",
        "message": "SEO Directory Links updated successfully",
        "data": {
            "tagline": entry.tagline,
            "show_tagline": entry.show_tagline,
            "is_active": entry.is_active,
            "categories": [c.dict() for c in payload.categories],
        }
    }


@router.post("/directory-links/reset-default")
def reset_seo_directory_links(
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: resets SEO directory links to comprehensive default structure."""
    entry = db.query(SeoFooterDirectory).first()
    if not entry:
        entry = SeoFooterDirectory()
        db.add(entry)

    entry.tagline = DEFAULT_DIRECTORY_DATA["tagline"]
    entry.show_tagline = DEFAULT_DIRECTORY_DATA["show_tagline"]
    entry.is_active = DEFAULT_DIRECTORY_DATA["is_active"]
    entry.data_json = json.dumps(DEFAULT_DIRECTORY_DATA["categories"])

    db.commit()
    db.refresh(entry)
    cache.invalidate("seo:directory_links")

    return {
        "status": "success",
        "message": "Reset to default directory links successfully",
        "data": DEFAULT_DIRECTORY_DATA,
    }


