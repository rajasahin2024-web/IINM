from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from routers.courses import require_device
import models

router = APIRouter(prefix="/api", tags=["testimonials"])


# ── Pydantic Schemas ──────────────────────────────────
class TestimonialCreate(BaseModel):
    student_name: str
    course_name: str
    designation: Optional[str] = None
    feedback_text: Optional[str] = None
    youtube_video_url: str
    is_active: bool = True


class TestimonialUpdate(BaseModel):
    student_name: Optional[str] = None
    course_name: Optional[str] = None
    designation: Optional[str] = None
    feedback_text: Optional[str] = None
    youtube_video_url: Optional[str] = None
    is_active: Optional[bool] = None


def to_dict(t: models.StudentTestimonial) -> dict:
    return {
        "id": t.id,
        "student_name": t.student_name,
        "course_name": t.course_name,
        "designation": t.designation,
        "feedback_text": t.feedback_text,
        "youtube_video_url": t.youtube_video_url,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


# ── Admin endpoints (auth required) ──────────────────

@router.get("/testimonials")
def list_testimonials(
    page: int = 1,
    page_size: int = 10,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    q = db.query(models.StudentTestimonial).order_by(models.StudentTestimonial.id.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [to_dict(t) for t in items],
    }


@router.post("/testimonials")
def create_testimonial(
    data: TestimonialCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    t = models.StudentTestimonial(
        student_name=data.student_name,
        course_name=data.course_name,
        designation=data.designation,
        feedback_text=data.feedback_text,
        youtube_video_url=data.youtube_video_url,
        is_active=data.is_active,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return to_dict(t)


@router.put("/testimonials/{tid}")
def update_testimonial(
    tid: int,
    data: TestimonialUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    t = db.query(models.StudentTestimonial).filter(models.StudentTestimonial.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return to_dict(t)


@router.delete("/testimonials/{tid}")
def delete_testimonial(
    tid: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    t = db.query(models.StudentTestimonial).filter(models.StudentTestimonial.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


# ── Public endpoint (no auth) ─────────────────────────

@router.get("/public/testimonials")
def public_testimonials(db: Session = Depends(get_db)):
    items = db.query(models.StudentTestimonial)\
        .filter(models.StudentTestimonial.is_active == True)\
        .order_by(models.StudentTestimonial.id.desc())\
        .limit(20).all()
    return [to_dict(t) for t in items]
