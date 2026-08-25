"""
Career module — public Career page + admin CMS.

Public endpoints (cached):
  GET  /api/career/settings        — page content (singleton)
  GET  /api/career/positions       — active role templates
  GET  /api/career/jobs            — published open job posts
  GET  /api/career/jobs/{slug}     — single job post
  POST /api/career/apply           — submit application (CV + socials), rate-limited

Admin endpoints (require_device):
  Settings:   PUT /api/career/settings
  Positions:  GET/POST/PUT/DELETE /api/career/positions[...], PATCH .../toggle
  Jobs:       GET/POST/PUT/DELETE /api/career/jobs[...], PATCH .../status, .../feature
  Apps:       GET /api/career/applications[...], GET/PUT/PATCH/DELETE /api/career/applications/{id}
  Stats:      GET /api/career/stats
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
import os, uuid, shutil, json, re, logging

from database import get_db
from cache import cache
from models import (
    CareerSettings,
    CareerPosition,
    CareerJobPost,
    CareerApplication,
    R2Settings,
)
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_DOC_EXTENSIONS, MAX_GENERAL_SIZE_BYTES, check_public_rate_limit, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/career", tags=["career"])

UPLOAD_DIR = "uploads/career"

# ══════════════════════════════════════════════════════
#  R2 HELPERS (mirrors about.py)
# ══════════════════════════════════════════════════════

def _get_r2_client(db: Session):
    try:
        import boto3
        r2 = db.query(R2Settings).first()
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
    except Exception:
        return None, None


def _try_upload_to_r2(content: bytes, key: str, content_type: str | None, db: Session) -> str | None:
    try:
        s3, r2 = _get_r2_client(db)
        if not s3 or not r2:
            return None
        ct = content_type or "application/pdf"
        s3.put_object(Bucket=r2.bucket_name, Key=key, Body=content, ContentType=ct)
        public_url = (r2.public_url or "").rstrip("/")
        return f"{public_url}/{key}" if public_url else key
    except Exception as e:
        logger.warning(f"R2 upload failed for {key}: {e}")
        return None


# ══════════════════════════════════════════════════════
#  UTILITIES
# ══════════════════════════════════════════════════════

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    s = (value or "").lower().strip()
    s = _SLUG_RE.sub("-", s).strip("-")
    return s or f"item-{uuid.uuid4().hex[:8]}"


def _ensure_unique_slug(db: Session, model, slug: str, exclude_id: Optional[int] = None) -> str:
    base = slug
    n = 1
    while True:
        q = db.query(model).filter(model.slug == slug)
        if exclude_id is not None:
            q = q.filter(model.id != exclude_id)
        if not q.first():
            return slug
        n += 1
        slug = f"{base}-{n}"


def _parse_json(value: Optional[str], default):
    if not value:
        return default
    try:
        return json.loads(value)
    except Exception:
        return default


def _settings_out(s: Optional[CareerSettings]) -> dict:
    if not s:
        return {
            "hero_eyebrow": None, "hero_title": None, "hero_subtitle": None, "hero_image_url": None,
            "intro_eyebrow": None, "intro_title": None, "intro_text": None,
            "culture_eyebrow": None, "culture_title": None, "culture_text": None, "culture_image_url": None,
            "perks": [],
            "cta_eyebrow": None, "cta_title": None, "cta_text": None, "cta_button_label": None,
            "open_form_title": None, "open_form_subtitle": None, "open_form_success_message": None,
            "email_to_notify": None,
        }
    return {
        "hero_eyebrow": s.hero_eyebrow, "hero_title": s.hero_title, "hero_subtitle": s.hero_subtitle,
        "hero_image_url": rewrite_url(s.hero_image_url),
        "intro_eyebrow": s.intro_eyebrow, "intro_title": s.intro_title, "intro_text": s.intro_text,
        "culture_eyebrow": s.culture_eyebrow, "culture_title": s.culture_title, "culture_text": s.culture_text,
        "culture_image_url": rewrite_url(s.culture_image_url),
        "perks": _parse_json(s.perks_json, []),
        "cta_eyebrow": s.cta_eyebrow, "cta_title": s.cta_title, "cta_text": s.cta_text,
        "cta_button_label": s.cta_button_label,
        "open_form_title": s.open_form_title, "open_form_subtitle": s.open_form_subtitle,
        "open_form_success_message": s.open_form_success_message,
        "email_to_notify": s.email_to_notify,
    }


def _position_out(p: CareerPosition) -> dict:
    return {
        "id": p.id, "title": p.title, "slug": p.slug,
        "department": p.department, "description": p.description,
        "is_active": bool(p.is_active),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _job_out(j: CareerJobPost, position_title: Optional[str] = None) -> dict:
    return {
        "id": j.id,
        "position_id": j.position_id,
        "position_title": position_title,
        "title": j.title,
        "slug": j.slug,
        "summary": j.summary,
        "description": j.description,
        "requirements": j.requirements,
        "responsibilities": j.responsibilities,
        "location": j.location,
        "job_type": j.job_type,
        "experience_min": j.experience_min,
        "experience_max": j.experience_max,
        "salary_min": j.salary_min,
        "salary_max": j.salary_max,
        "salary_currency": j.salary_currency,
        "vacancies": j.vacancies,
        "application_deadline": j.application_deadline.isoformat() if j.application_deadline else None,
        "status": j.status,
        "is_featured": bool(j.is_featured),
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "updated_at": j.updated_at.isoformat() if j.updated_at else None,
        "published_at": j.published_at.isoformat() if j.published_at else None,
    }


def _application_out(a: CareerApplication, job_title: Optional[str] = None) -> dict:
    return {
        "id": a.id,
        "job_post_id": a.job_post_id,
        "job_title": job_title,
        "full_name": a.full_name,
        "email": a.email,
        "phone": a.phone,
        "cv_url": rewrite_url(a.cv_url),
        "cover_note": a.cover_note,
        "linkedin_url": a.linkedin_url,
        "github_url": a.github_url,
        "portfolio_url": a.portfolio_url,
        "twitter_url": a.twitter_url,
        "expected_salary": a.expected_salary,
        "notice_period_days": a.notice_period_days,
        "years_experience": a.years_experience,
        "status": a.status,
        "admin_notes": a.admin_notes,
        "is_read": bool(a.is_read),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


# ══════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════

class CareerSettingsSchema(BaseModel):
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image_url: Optional[str] = None
    intro_eyebrow: Optional[str] = None
    intro_title: Optional[str] = None
    intro_text: Optional[str] = None
    culture_eyebrow: Optional[str] = None
    culture_title: Optional[str] = None
    culture_text: Optional[str] = None
    culture_image_url: Optional[str] = None
    perks_json: Optional[str] = None
    cta_eyebrow: Optional[str] = None
    cta_title: Optional[str] = None
    cta_text: Optional[str] = None
    cta_button_label: Optional[str] = None
    open_form_title: Optional[str] = None
    open_form_subtitle: Optional[str] = None
    open_form_success_message: Optional[str] = None
    email_to_notify: Optional[str] = None


class PositionSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    department: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = True


class JobPostSchema(BaseModel):
    position_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    job_type: Optional[str] = Field("full_time", max_length=50)
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = Field("INR", max_length=10)
    vacancies: Optional[int] = 1
    application_deadline: Optional[date] = None
    status: Optional[str] = Field("open", max_length=20)
    is_featured: Optional[bool] = False


class JobStatusSchema(BaseModel):
    status: str = Field(..., max_length=20)


class ApplicationNotesSchema(BaseModel):
    admin_notes: Optional[str] = None


class ApplicationStatusSchema(BaseModel):
    status: str = Field(..., max_length=20)


# ══════════════════════════════════════════════════════
#  SETTINGS — Public + Admin
# ══════════════════════════════════════════════════════

@router.get("/settings")
async def get_career_settings(response: Response, db: Session = Depends(get_db)):
    """Public: career page content."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cached = cache.get("career_settings")
    if cached is not None:
        return cached
    s = db.query(CareerSettings).first()
    result = _settings_out(s)
    cache.set("career_settings", result)
    return result


@router.put("/settings")
async def update_career_settings(
    req: CareerSettingsSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    s = db.query(CareerSettings).first()
    if not s:
        s = CareerSettings()
        db.add(s)
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(s, field, val or None)
    db.commit()
    db.refresh(s)
    cache.invalidate("career_settings")
    return {"message": "Career settings updated successfully."}


# ══════════════════════════════════════════════════════
#  POSITIONS — Public + Admin
# ══════════════════════════════════════════════════════

@router.get("/positions")
async def list_public_positions(response: Response, db: Session = Depends(get_db)):
    """Public: active positions only."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cached = cache.get("career_positions_public")
    if cached is not None:
        return cached
    items = db.query(CareerPosition).filter(CareerPosition.is_active == True).order_by(CareerPosition.title).all()
    result = [_position_out(p) for p in items]
    cache.set("career_positions_public", result)
    return result


@router.get("/positions/all")
async def list_all_positions(device: str = Depends(require_device), db: Session = Depends(get_db)):
    items = db.query(CareerPosition).order_by(CareerPosition.created_at.desc()).all()
    return [_position_out(p) for p in items]


@router.post("/positions")
async def create_position(req: PositionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    slug = slugify(req.slug or req.title)
    slug = _ensure_unique_slug(db, CareerPosition, slug)
    p = CareerPosition(
        title=req.title, slug=slug,
        department=req.department, description=req.description,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    cache.invalidate("career_positions_public")
    return _position_out(p)


@router.put("/positions/{position_id}")
async def update_position(position_id: int, req: PositionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(CareerPosition).filter(CareerPosition.id == position_id).first()
    if not p:
        raise HTTPException(404, "Position not found")
    p.title = req.title
    if req.slug and req.slug != p.slug:
        p.slug = _ensure_unique_slug(db, CareerPosition, slugify(req.slug), exclude_id=p.id)
    p.department = req.department
    p.description = req.description
    if req.is_active is not None:
        p.is_active = req.is_active
    db.commit()
    db.refresh(p)
    cache.invalidate("career_positions_public")
    cache.invalidate("career_jobs_public")
    return _position_out(p)


@router.delete("/positions/{position_id}")
async def delete_position(position_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(CareerPosition).filter(CareerPosition.id == position_id).first()
    if not p:
        raise HTTPException(404, "Position not found")
    db.delete(p)
    db.commit()
    cache.invalidate("career_positions_public")
    cache.invalidate("career_jobs_public")
    return {"message": "Deleted"}


@router.patch("/positions/{position_id}/toggle")
async def toggle_position(position_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    p = db.query(CareerPosition).filter(CareerPosition.id == position_id).first()
    if not p:
        raise HTTPException(404, "Position not found")
    p.is_active = not p.is_active
    db.commit()
    cache.invalidate("career_positions_public")
    return {"id": p.id, "is_active": bool(p.is_active)}


# ══════════════════════════════════════════════════════
#  JOB POSTS — Public + Admin
# ══════════════════════════════════════════════════════

def _job_with_position(db: Session, j: CareerJobPost) -> dict:
    pos_title = None
    if j.position_id:
        pos = db.query(CareerPosition).filter(CareerPosition.id == j.position_id).first()
        if pos:
            pos_title = pos.title
    return _job_out(j, pos_title)


@router.get("/jobs")
async def list_public_jobs(response: Response, db: Session = Depends(get_db)):
    """Public: published open job posts."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cached = cache.get("career_jobs_public")
    if cached is not None:
        return cached
    items = (
        db.query(CareerJobPost)
        .filter(CareerJobPost.status == "open")
        .order_by(CareerJobPost.is_featured.desc(), CareerJobPost.published_at.desc(), CareerJobPost.created_at.desc())
        .all()
    )
    result = [_job_with_position(db, j) for j in items]
    cache.set("career_jobs_public", result)
    return result


@router.get("/jobs/all")
async def list_all_jobs(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    q = db.query(CareerJobPost)
    if status:
        q = q.filter(CareerJobPost.status == status)
    total = q.count()
    items = q.order_by(CareerJobPost.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": [_job_with_position(db, j) for j in items],
    }


@router.get("/jobs/{slug}")
async def get_public_job(slug: str, response: Response, db: Session = Depends(get_db)):
    """Public: single job post by slug (only if open)."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cache_key = f"career_job_{slug}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    j = db.query(CareerJobPost).filter(CareerJobPost.slug == slug, CareerJobPost.status == "open").first()
    if not j:
        raise HTTPException(404, "Job post not found")
    result = _job_with_position(db, j)
    cache.set(cache_key, result)
    return result


@router.post("/jobs")
async def create_job(req: JobPostSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    slug = slugify(req.slug or req.title)
    slug = _ensure_unique_slug(db, CareerJobPost, slug)
    j = CareerJobPost(
        position_id=req.position_id,
        title=req.title, slug=slug,
        summary=req.summary, description=req.description,
        requirements=req.requirements, responsibilities=req.responsibilities,
        location=req.location, job_type=req.job_type or "full_time",
        experience_min=req.experience_min, experience_max=req.experience_max,
        salary_min=req.salary_min, salary_max=req.salary_max,
        salary_currency=req.salary_currency or "INR",
        vacancies=req.vacancies or 1,
        application_deadline=req.application_deadline,
        status=req.status or "open",
        is_featured=bool(req.is_featured),
        published_at=datetime.utcnow() if (req.status or "open") == "open" else None,
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    cache.invalidate("career_jobs_public")
    return _job_with_position(db, j)


@router.put("/jobs/{job_id}")
async def update_job(job_id: int, req: JobPostSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    j = db.query(CareerJobPost).filter(CareerJobPost.id == job_id).first()
    if not j:
        raise HTTPException(404, "Job post not found")
    j.position_id = req.position_id
    j.title = req.title
    if req.slug and req.slug != j.slug:
        j.slug = _ensure_unique_slug(db, CareerJobPost, slugify(req.slug), exclude_id=j.id)
    j.summary = req.summary
    j.description = req.description
    j.requirements = req.requirements
    j.responsibilities = req.responsibilities
    j.location = req.location
    j.job_type = req.job_type or "full_time"
    j.experience_min = req.experience_min
    j.experience_max = req.experience_max
    j.salary_min = req.salary_min
    j.salary_max = req.salary_max
    j.salary_currency = req.salary_currency or "INR"
    j.vacancies = req.vacancies or 1
    j.application_deadline = req.application_deadline
    new_status = req.status or j.status
    if new_status == "open" and j.status != "open" and not j.published_at:
        j.published_at = datetime.utcnow()
    j.status = new_status
    j.is_featured = bool(req.is_featured)
    db.commit()
    db.refresh(j)
    cache.invalidate("career_jobs_public")
    cache.invalidate(f"career_job_{j.slug}")
    return _job_with_position(db, j)


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    j = db.query(CareerJobPost).filter(CareerJobPost.id == job_id).first()
    if not j:
        raise HTTPException(404, "Job post not found")
    slug = j.slug
    db.delete(j)
    db.commit()
    cache.invalidate("career_jobs_public")
    cache.invalidate(f"career_job_{slug}")
    return {"message": "Deleted"}


@router.patch("/jobs/{job_id}/status")
async def set_job_status(job_id: int, req: JobStatusSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    j = db.query(CareerJobPost).filter(CareerJobPost.id == job_id).first()
    if not j:
        raise HTTPException(404, "Job post not found")
    if req.status not in ("open", "closed", "draft"):
        raise HTTPException(400, "Invalid status")
    if req.status == "open" and j.status != "open" and not j.published_at:
        j.published_at = datetime.utcnow()
    j.status = req.status
    db.commit()
    db.refresh(j)
    cache.invalidate("career_jobs_public")
    cache.invalidate(f"career_job_{j.slug}")
    return {"id": j.id, "status": j.status}


@router.patch("/jobs/{job_id}/feature")
async def toggle_job_feature(job_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    j = db.query(CareerJobPost).filter(CareerJobPost.id == job_id).first()
    if not j:
        raise HTTPException(404, "Job post not found")
    j.is_featured = not j.is_featured
    db.commit()
    cache.invalidate("career_jobs_public")
    return {"id": j.id, "is_featured": bool(j.is_featured)}


# ══════════════════════════════════════════════════════
#  APPLICATIONS — Public submit + Admin manage
# ══════════════════════════════════════════════════════

@router.post("/apply")
async def submit_application(
    request: Request,
    data: str = Form(...),
    cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Public: submit a job application. `data` is a JSON string; `cv` is an optional PDF."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=5, window=300)  # 5 per 5 min

    try:
        payload = json.loads(data)
    except Exception:
        raise HTTPException(400, "Invalid application data.")

    full_name = (payload.get("full_name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    if not full_name:
        raise HTTPException(400, "Full name is required.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Valid email is required.")

    job_post_id = payload.get("job_post_id")
    if job_post_id:
        jp = db.query(CareerJobPost).filter(CareerJobPost.id == int(job_post_id)).first()
        if not jp:
            raise HTTPException(400, "Selected job post does not exist.")

    cv_url: Optional[str] = None
    if cv and cv.filename:
        ext = validate_upload(cv, ALLOWED_DOC_EXTENSIONS, MAX_GENERAL_SIZE_BYTES)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        content = await cv.read()
        with open(filepath, "wb") as buf:
            buf.write(content)
        local_url = f"/{UPLOAD_DIR}/{filename}"
        # Try R2; fall back to local path
        r2_url = _try_upload_to_r2(content, f"career/{filename}", cv.content_type, db)
        cv_url = r2_url or local_url
        await cv.seek(0)

    app = CareerApplication(
        job_post_id=int(job_post_id) if job_post_id else None,
        full_name=full_name,
        email=email,
        phone=(payload.get("phone") or "").strip() or None,
        cv_url=cv_url,
        cover_note=(payload.get("cover_note") or "").strip() or None,
        linkedin_url=(payload.get("linkedin_url") or "").strip() or None,
        github_url=(payload.get("github_url") or "").strip() or None,
        portfolio_url=(payload.get("portfolio_url") or "").strip() or None,
        twitter_url=(payload.get("twitter_url") or "").strip() or None,
        expected_salary=int(payload["expected_salary"]) if payload.get("expected_salary") not in (None, "",) else None,
        notice_period_days=int(payload["notice_period_days"]) if payload.get("notice_period_days") not in (None, "",) else None,
        years_experience=int(payload["years_experience"]) if payload.get("years_experience") not in (None, "",) else None,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return {"message": "Your application has been submitted successfully. Our team will get in touch if your profile matches."}


@router.get("/applications")
async def list_applications(
    status: Optional[str] = None,
    job_post_id: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    q = db.query(CareerApplication)
    if status:
        q = q.filter(CareerApplication.status == status)
    if job_post_id:
        q = q.filter(CareerApplication.job_post_id == job_post_id)
    total = q.count()
    items = q.order_by(CareerApplication.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    # join job titles
    job_ids = {a.job_post_id for a in items if a.job_post_id}
    job_titles: dict = {}
    if job_ids:
        jobs = db.query(CareerJobPost).filter(CareerJobPost.id.in_(job_ids)).all()
        job_titles = {j.id: j.title for j in jobs}
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": [_application_out(a, job_titles.get(a.job_post_id)) for a in items],
    }


@router.get("/applications/{application_id}")
async def get_application(application_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(CareerApplication).filter(CareerApplication.id == application_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    job_title = None
    if a.job_post_id:
        jp = db.query(CareerJobPost).filter(CareerJobPost.id == a.job_post_id).first()
        if jp:
            job_title = jp.title
    return _application_out(a, job_title)


@router.patch("/applications/{application_id}/status")
async def set_application_status(application_id: int, req: ApplicationStatusSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(CareerApplication).filter(CareerApplication.id == application_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    if req.status not in ("new", "reviewing", "interview", "hired", "rejected"):
        raise HTTPException(400, "Invalid status")
    a.status = req.status
    db.commit()
    db.refresh(a)
    return {"id": a.id, "status": a.status}


@router.patch("/applications/{application_id}/read")
async def mark_application_read(application_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(CareerApplication).filter(CareerApplication.id == application_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    a.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/applications/{application_id}/notes")
async def update_application_notes(application_id: int, req: ApplicationNotesSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(CareerApplication).filter(CareerApplication.id == application_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    a.admin_notes = req.admin_notes or None
    db.commit()
    return {"message": "Notes saved"}


@router.delete("/applications/{application_id}")
async def delete_application(application_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(CareerApplication).filter(CareerApplication.id == application_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    db.delete(a)
    db.commit()
    return {"message": "Deleted"}


# ══════════════════════════════════════════════════════
#  STATS — Admin dashboard cards
# ══════════════════════════════════════════════════════

@router.get("/stats")
async def career_stats(device: str = Depends(require_device), db: Session = Depends(get_db)):
    jobs_total = db.query(CareerJobPost).count()
    jobs_open = db.query(CareerJobPost).filter(CareerJobPost.status == "open").count()
    jobs_closed = db.query(CareerJobPost).filter(CareerJobPost.status == "closed").count()
    jobs_draft = db.query(CareerJobPost).filter(CareerJobPost.status == "draft").count()
    positions_total = db.query(CareerPosition).count()
    positions_active = db.query(CareerPosition).filter(CareerPosition.is_active == True).count()

    app_total = db.query(CareerApplication).count()
    app_by_status = {}
    for st in ("new", "reviewing", "interview", "hired", "rejected"):
        app_by_status[st] = db.query(CareerApplication).filter(CareerApplication.status == st).count()
    app_unread = db.query(CareerApplication).filter(CareerApplication.is_read == False).count()

    return {
        "jobs": {"total": jobs_total, "open": jobs_open, "closed": jobs_closed, "draft": jobs_draft},
        "positions": {"total": positions_total, "active": positions_active},
        "applications": {"total": app_total, "unread": app_unread, "by_status": app_by_status},
    }
