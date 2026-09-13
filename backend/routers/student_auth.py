"""
Student panel auth & dashboard router — mounted under /api/student.

Endpoints:
  POST /api/student/auth/forgot-password   — generic 200, emails a reset link
  POST /api/student/auth/reset-password    — consume token, set bcrypt password
  GET  /api/student/me                     — profile basics (cookie auth)
  POST /api/student/logout                 — clears the session cookie
  GET  /api/student/my-courses             — course-card payload
  GET  /api/student/courses/{course_id}    — per-course dashboard (403 w/o access)

Reset tokens are single-use, HMAC-SHA256 hashed at rest, and expire after
RESET_TOKEN_TTL_MINUTES. All public-facing failures return generic responses —
no account enumeration.
"""
import os
import time
import secrets
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from pydantic import BaseModel, Field

from database import get_db, SessionLocal
import models
from helpers import send_email, rewrite_url
from security import (
    check_public_rate_limit,
    get_client_ip,
    hash_password,
    verify_password,
    verify_student_token,
    hash_reset_token,
    get_student_auth_secret,
    STUDENT_TOKEN_COOKIE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/student", tags=["student-panel"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://iinmedu.com").rstrip("/")
RESET_TOKEN_TTL_MINUTES = 60
RESEND_COOLDOWN_SECONDS = 60

# Per-email resend cooldown (in-memory — matches existing rate-limiter style)
_reset_cooldowns: dict[str, float] = {}

# Static bcrypt hash used to equalize forgot-password timing for unknown emails
_DUMMY_BCRYPT = hash_password("dummy-password-for-timing")

_ACTIVE_ENROLLMENT_STATUSES = ("active", "waitlisted", "graduated")


# ─── Dependencies ─────────────────────────────────────────────────────────────

def require_student(request: Request, db: Session = Depends(get_db)) -> models.Student:
    """Dependency: authenticates a student via the iinm_student_token httpOnly cookie."""
    token = request.cookies.get(STUDENT_TOKEN_COOKIE)
    student_id = verify_student_token(token) if token else None
    if not student_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student or not student.is_active:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return student


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _send_reset_email(email: str, first_name: str, reset_url: str) -> None:
    """Background send — opens its own session (request session is closed)."""
    db = SessionLocal()
    try:
        site = db.query(models.SiteSettings).first()
        site_name = (site.site_name if site else "IINM") or "IINM"
        html_body = (
            f"<p>Hello {first_name},</p>"
            f"<p>We received a request to reset the password for your {site_name} student account.</p>"
            f'<p><a href="{reset_url}">Click here to set a new password</a> '
            f"(this link is valid for {RESET_TOKEN_TTL_MINUTES} minutes and can be used once).</p>"
            f"<p>If you did not request this, you can safely ignore this email.</p>"
            f"<p>Best Regards,<br>{site_name} Team</p>"
        )
        send_email(db, to=email, subject=f"Password Reset — {site_name}", html_body=html_body)
    except Exception as e:
        logger.warning(f"Password reset email failed: {e}")
    finally:
        db.close()


def _course_progress_map(db: Session, student_id: int, course_ids: list[int]) -> dict[int, dict]:
    """Return {course_id: {"total": n, "completed": n}} using two grouped queries.

    'completed' counts distinct course materials the student finished — only
    materials still attached to the course are counted.
    """
    if not course_ids:
        return {}
    totals = dict(
        db.query(
            models.course_chapters.c.course_id,
            func.count(func.distinct(models.topic_materials.c.material_id)),
        )
        .join(models.topic_materials,
              models.topic_materials.c.topic_id == models.course_chapters.c.chapter_id)
        .filter(models.course_chapters.c.course_id.in_(course_ids))
        .group_by(models.course_chapters.c.course_id)
        .all()
    )
    completed = dict(
        db.query(
            models.course_chapters.c.course_id,
            func.count(func.distinct(models.BatchStudentMaterialProgress.material_id)),
        )
        .join(models.Batch, models.Batch.course_id == models.course_chapters.c.course_id)
        .join(models.BatchStudentMaterialProgress, and_(
            models.BatchStudentMaterialProgress.batch_id == models.Batch.id,
            models.BatchStudentMaterialProgress.student_id == student_id,
            models.BatchStudentMaterialProgress.is_completed == True,
        ))
        .join(models.topic_materials, and_(
            models.topic_materials.c.topic_id == models.course_chapters.c.chapter_id,
            models.topic_materials.c.material_id == models.BatchStudentMaterialProgress.material_id,
        ))
        .filter(models.course_chapters.c.course_id.in_(course_ids))
        .group_by(models.course_chapters.c.course_id)
        .all()
    )
    return {
        cid: {"total": totals.get(cid, 0), "completed": completed.get(cid, 0)}
        for cid in course_ids
    }


def _payment_payload(purchase: Optional[models.CoursePurchase],
                     next_installment: Optional[models.InstallmentSchedule]) -> Optional[dict]:
    if not purchase:
        return None
    return {
        "purchase_id": purchase.id,
        "status": purchase.status,
        "net_fee": purchase.net_fee,
        "paid_amount": purchase.paid_amount,
        "due_amount": purchase.due_amount,
        "invoice_uuid": purchase.invoice_uuid,
        "is_installment": bool(purchase.is_installment),
        "total_installments": purchase.total_installments,
        "installment_frequency": purchase.installment_frequency,
        "next_installment": {
            "installment_no": next_installment.installment_no,
            "name": next_installment.name,
            "due_date": next_installment.due_date.isoformat() if next_installment.due_date else None,
            "amount": next_installment.amount,
            "paid_amount": next_installment.paid_amount,
            "status": next_installment.status,
        } if next_installment else None,
    }


def _batch_payload(batch: Optional[models.Batch]) -> Optional[dict]:
    if not batch:
        return None
    return {
        "id": batch.id,
        "name": batch.name,
        "mode": batch.mode,
        "status": batch.status,
        "start_date": batch.start_date.isoformat() if batch.start_date else None,
        "end_date": batch.end_date.isoformat() if batch.end_date else None,
        "meeting_url": batch.meeting_url,
    }


def _enrollment_payload(enrollment: Optional[models.BatchEnrollment]) -> Optional[dict]:
    if not enrollment:
        return None
    return {
        "status": enrollment.status,
        "join_date": enrollment.join_date.isoformat() if enrollment.join_date else None,
    }


def _next_installments_map(db: Session, purchase_ids: list[int]) -> dict[int, models.InstallmentSchedule]:
    """First unpaid installment per purchase — single query, no N+1."""
    if not purchase_ids:
        return {}
    rows = (
        db.query(models.InstallmentSchedule)
        .filter(
            models.InstallmentSchedule.purchase_id.in_(purchase_ids),
            models.InstallmentSchedule.status.in_(["pending", "partial", "overdue"]),
        )
        .order_by(models.InstallmentSchedule.purchase_id, models.InstallmentSchedule.installment_no)
        .all()
    )
    result: dict[int, models.InstallmentSchedule] = {}
    for row in rows:
        result.setdefault(row.purchase_id, row)
    return result


# ─── Auth endpoints ───────────────────────────────────────────────────────────

@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request,
                    background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Request a password reset link. Always returns the same generic 200 —
    the response never reveals whether the email is registered."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)

    generic = {"message": "If this email exists, a reset link has been sent."}
    email = (req.email or "").strip().lower()
    if not email or "@" not in email:
        return generic

    if not get_student_auth_secret():
        logger.error("STUDENT_AUTH_SECRET/DEVICE_ADMIN_SECRET not configured — cannot issue reset tokens")
        raise HTTPException(status_code=503, detail="Password reset is not configured")

    student = db.query(models.Student).filter(models.Student.email == email).first()

    now = time.time()
    on_cooldown = (now - _reset_cooldowns.get(email, 0)) < RESEND_COOLDOWN_SECONDS
    # Opportunistic cleanup of stale cooldown entries
    if len(_reset_cooldowns) > 10000:
        for k in [k for k, t in _reset_cooldowns.items() if now - t > 3600]:
            _reset_cooldowns.pop(k, None)

    # Both paths pay one bcrypt verify so known/unknown/inactive/cooldown
    # requests have near-identical timing (email send runs in the background).
    verify_password("dummy-password", _DUMMY_BCRYPT)
    if not student or not student.is_active or on_cooldown:
        return generic

    # Invalidate previous unused tokens, then issue a fresh single-use token
    now_dt = datetime.now(timezone.utc)
    db.query(models.StudentPasswordReset).filter(
        models.StudentPasswordReset.student_id == student.id,
        models.StudentPasswordReset.used_at.is_(None),
    ).update({"used_at": now_dt}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    db.add(models.StudentPasswordReset(
        student_id=student.id,
        token_hash=hash_reset_token(raw_token),
        expires_at=now_dt + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        requested_ip=client_ip,
    ))
    db.commit()

    _reset_cooldowns[email] = now
    reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
    background_tasks.add_task(_send_reset_email, student.email, student.first_name or "Student", reset_url)
    return generic


@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Consume a reset token and set the student's password (bcrypt)."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)

    invalid = HTTPException(status_code=400, detail="Invalid or expired reset link")
    token_hash = hash_reset_token(req.token.strip())
    now_dt = datetime.now(timezone.utc)

    reset = db.query(models.StudentPasswordReset).filter(
        models.StudentPasswordReset.token_hash == token_hash
    ).first()
    if not reset or reset.used_at is not None or not reset.expires_at or reset.expires_at <= now_dt:
        raise invalid

    student = db.query(models.Student).filter(
        models.Student.id == reset.student_id,
        models.Student.is_active == True,
    ).first()
    if not student:
        raise invalid

    student.password_hash = hash_password(req.password)
    reset.used_at = now_dt
    # Invalidate any other outstanding tokens for this student
    db.query(models.StudentPasswordReset).filter(
        models.StudentPasswordReset.student_id == student.id,
        models.StudentPasswordReset.used_at.is_(None),
        models.StudentPasswordReset.id != reset.id,
    ).update({"used_at": now_dt}, synchronize_session=False)
    db.commit()

    return {"message": "Password updated. You can now sign in."}


@router.get("/me")
def get_student_me(student: models.Student = Depends(require_student)):
    """Return profile basics for the authenticated student."""
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "email": student.email,
        "phone": student.phone,
        "profile_photo_url": rewrite_url(student.profile_photo_url),
        "city": student.city,
        "state": student.state,
        "created_at": student.created_at.isoformat() if student.created_at else None,
    }


@router.post("/logout")
def student_logout():
    """Clear the student session cookie. Always succeeds."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(STUDENT_TOKEN_COOKIE, path="/")
    return response


# ─── Course dashboard endpoints ───────────────────────────────────────────────

@router.get("/my-courses")
def my_courses(student: models.Student = Depends(require_student), db: Session = Depends(get_db)):
    """Course-card payload: one card per course the student has a non-cancelled
    purchase or enrollment for."""
    sid = student.id

    purchases = (
        db.query(models.CoursePurchase)
        .options(joinedload(models.CoursePurchase.course))
        .filter(
            models.CoursePurchase.student_id == sid,
            models.CoursePurchase.is_active == True,
            models.CoursePurchase.status != "cancelled",
        )
        .order_by(models.CoursePurchase.id.desc())
        .all()
    )
    enrollments = (
        db.query(models.BatchEnrollment)
        .options(joinedload(models.BatchEnrollment.batch).joinedload(models.Batch.course))
        .filter(
            models.BatchEnrollment.student_id == sid,
            models.BatchEnrollment.status != "cancelled",
        )
        .order_by(models.BatchEnrollment.id.desc())
        .all()
    )

    # Latest purchase + best enrollment per course
    purchase_by_course: dict[int, models.CoursePurchase] = {}
    for p in purchases:
        purchase_by_course.setdefault(p.course_id, p)
    enrollment_by_course: dict[int, models.BatchEnrollment] = {}
    for e in enrollments:
        cid = e.batch.course_id if e.batch else None
        if cid is None:
            continue
        current = enrollment_by_course.get(cid)
        # Prefer an active enrollment, otherwise the most recent one
        if current is None or (e.status == "active" and current.status != "active"):
            enrollment_by_course[cid] = e

    course_ids = list(dict.fromkeys(list(purchase_by_course) + list(enrollment_by_course)))
    progress = _course_progress_map(db, sid, course_ids)
    next_inst = _next_installments_map(db, [p.id for p in purchase_by_course.values()])

    courses = (
        {c.id: c for c in db.query(models.Course).filter(models.Course.id.in_(course_ids)).all()}
        if course_ids else {}
    )

    cards = []
    for cid in course_ids:
        course = courses.get(cid)
        if not course:
            continue
        purchase = purchase_by_course.get(cid)
        enrollment = enrollment_by_course.get(cid)
        prog = progress.get(cid, {"total": 0, "completed": 0})
        pct = round((prog["completed"] / prog["total"]) * 100) if prog["total"] else 0
        cards.append({
            "course_id": course.id,
            "title": course.title,
            "slug": course.slug,
            "thumbnail_url": rewrite_url(course.thumbnail_url),
            "batch": _batch_payload(enrollment.batch if enrollment else None),
            "enrollment": _enrollment_payload(enrollment),
            "payment": _payment_payload(purchase, next_inst.get(purchase.id) if purchase else None),
            "progress": {
                "total_materials": prog["total"],
                "completed_materials": prog["completed"],
                "progress_pct": pct,
                "percent": pct,
            },
        })

    return {"courses": cards}


@router.get("/courses/{course_id}")
def course_dashboard(course_id: int, student: models.Student = Depends(require_student),
                     db: Session = Depends(get_db)):
    """Per-course dashboard: chapters, materials, batch routine/live classes and
    the student's progress. 403 unless the student has an active purchase or
    enrollment for the course."""
    sid = student.id

    purchase = (
        db.query(models.CoursePurchase)
        .filter(
            models.CoursePurchase.student_id == sid,
            models.CoursePurchase.course_id == course_id,
            models.CoursePurchase.is_active == True,
            models.CoursePurchase.status != "cancelled",
        )
        .order_by(models.CoursePurchase.id.desc())
        .first()
    )
    enrollments = (
        db.query(models.BatchEnrollment)
        .join(models.Batch, models.BatchEnrollment.batch_id == models.Batch.id)
        .options(joinedload(models.BatchEnrollment.batch))
        .filter(
            models.BatchEnrollment.student_id == sid,
            models.Batch.course_id == course_id,
            models.BatchEnrollment.status.in_(_ACTIVE_ENROLLMENT_STATUSES),
        )
        .order_by(models.BatchEnrollment.id.desc())
        .all()
    )
    if not purchase and not enrollments:
        raise HTTPException(status_code=403, detail="You do not have access to this course")

    enrollment = next((e for e in enrollments if e.status == "active"), enrollments[0] if enrollments else None)
    batch = enrollment.batch if enrollment else None

    course = (
        db.query(models.Course)
        .options(joinedload(models.Course.chapters).joinedload(models.Chapter.materials))
        .filter(models.Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    chapters = sorted(course.chapters, key=lambda c: (c.order_position or 0, c.id))
    chapter_ids = [c.id for c in chapters]

    # Batch-taught chapter status + per-student material progress + live classes
    chapter_progress: dict[int, models.BatchChapterProgress] = {}
    material_progress: dict[int, models.BatchStudentMaterialProgress] = {}
    routines: list[models.BatchRoutine] = []
    chapter_drip: dict[int, date] = {}
    liveclass_drip: dict[int, date] = {}
    if batch:
        chapter_progress = {
            p.chapter_id: p
            for p in db.query(models.BatchChapterProgress).filter(
                models.BatchChapterProgress.batch_id == batch.id
            ).all()
        }
        material_progress = {
            p.material_id: p
            for p in db.query(models.BatchStudentMaterialProgress).filter(
                models.BatchStudentMaterialProgress.batch_id == batch.id,
                models.BatchStudentMaterialProgress.student_id == sid,
            ).all()
        }
        routines = db.query(models.BatchRoutine).filter(
            models.BatchRoutine.batch_id == batch.id
        ).all()
        for d in db.query(models.BatchContentDrip).filter(
            models.BatchContentDrip.batch_id == batch.id
        ).all():
            if d.chapter_id:
                chapter_drip[d.chapter_id] = d.unlock_date
            if d.live_class_id:
                liveclass_drip[d.live_class_id] = d.unlock_date

    live_classes_by_chapter: dict[int, list[models.ChapterLiveClass]] = {}
    if chapter_ids:
        for lc in db.query(models.ChapterLiveClass).filter(
            models.ChapterLiveClass.chapter_id.in_(chapter_ids)
        ).order_by(models.ChapterLiveClass.scheduled_at).all():
            live_classes_by_chapter.setdefault(lc.chapter_id, []).append(lc)

    chapter_items = []
    all_live_classes = []
    material_ids: set[int] = set()
    completed_ids: set[int] = set()
    for ch in chapters:
        mats = []
        for m in sorted(ch.materials, key=lambda x: (x.order_position or 0, x.id)):
            p = material_progress.get(m.id)
            done = bool(p and p.is_completed)
            material_ids.add(m.id)
            if done:
                completed_ids.add(m.id)
            mats.append({
                "id": m.id,
                "title": m.title,
                "file_type": m.file_type,
                "file_url": rewrite_url(m.file_url),
                "hls_url": rewrite_url(m.hls_url) if m.hls_status == "ready" else None,
                "hls_status": m.hls_status,
                "youtube_url": m.youtube_url,
                "thumbnail_url": rewrite_url(m.thumbnail_url),
                "order_position": m.order_position,
                "is_completed": done,
                "watch_time_sec": p.watch_time_sec if p else 0,
                "last_accessed": p.last_accessed.isoformat() if p and p.last_accessed else None,
            })
        cp = chapter_progress.get(ch.id)
        ch_live = [{
            "id": lc.id,
            "title": lc.title,
            "meeting_url": lc.meeting_url,
            "scheduled_at": lc.scheduled_at.isoformat() if lc.scheduled_at else None,
            "unlock_date": liveclass_drip[lc.id].isoformat() if lc.id in liveclass_drip else None,
            "chapter_title": ch.title,
        } for lc in live_classes_by_chapter.get(ch.id, [])]
        all_live_classes.extend(ch_live)
        chapter_items.append({
            "id": ch.id,
            "title": ch.title,
            "order_position": ch.order_position,
            "unlock_date": chapter_drip[ch.id].isoformat() if ch.id in chapter_drip else None,
            "is_taught": bool(cp and cp.is_completed),
            "is_completed": bool(cp and cp.is_completed),
            "taught_date": cp.completed_date.isoformat() if cp and cp.completed_date else None,
            "completed_date": cp.completed_date.isoformat() if cp and cp.completed_date else None,
            "notes": cp.notes if cp else None,
            "materials": mats,
            "live_classes": ch_live,
        })

    next_inst = _next_installments_map(db, [purchase.id] if purchase else [])
    total_materials = len(material_ids)
    completed_materials = len(completed_ids)

    return {
        "course": {
            "id": course.id,
            "title": course.title,
            "slug": course.slug,
            "description": course.description,
            "thumbnail_url": rewrite_url(course.thumbnail_url),
            "instructor_name": course.instructor_name,
            "skill_level": course.skill_level,
        },
        "batch": _batch_payload(batch),
        "routine": [{
            "day_of_week": r.day_of_week,
            "start_time": r.start_time,
            "end_time": r.end_time,
        } for r in routines],
        "enrollment": _enrollment_payload(enrollment),
        "payment": _payment_payload(purchase, next_inst.get(purchase.id) if purchase else None),
        "progress": {
            "total_materials": total_materials,
            "completed_materials": completed_materials,
            "progress_pct": round((completed_materials / total_materials) * 100) if total_materials else 0,
            "percent": round((completed_materials / total_materials) * 100) if total_materials else 0,
            "total_chapters": len(chapters),
            "taught_chapters": sum(1 for p in chapter_progress.values() if p.is_completed),
        },
        "live_classes": all_live_classes,
        "chapters": chapter_items,
    }
