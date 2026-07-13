from routers.auth import require_device
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import date
from pydantic import BaseModel

from database import get_db
import models

router = APIRouter(prefix="/api/progress", tags=["Course Progress"])


# ─── SCHEMAS ───────────────────────────────────────────

class ChapterProgressUpdate(BaseModel):
    chapter_id: int
    is_completed: bool
    completed_date: Optional[date] = None
    notes: Optional[str] = None

class MaterialProgressUpdate(BaseModel):
    material_id: int
    is_completed: bool
    watch_time_sec: Optional[int] = 0


# ─── BATCH SYLLABUS (Teacher/Admin) ────────────────────

@router.get("/batch/{batch_id}")
def get_batch_progress(batch_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get full syllabus progress for a batch — chapters list with completion status."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Get the course's chapters using eager loading to avoid lazy-load issues
    course = (
        db.query(models.Course)
        .options(joinedload(models.Course.chapters).joinedload(models.Chapter.materials))
        .filter(models.Course.id == batch.course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    chapters = sorted(course.chapters, key=lambda c: c.order_position)  # eagerly loaded + sorted

    # Existing progress records for this batch
    progress_records = {
        p.chapter_id: p
        for p in db.query(models.BatchChapterProgress).filter(
            models.BatchChapterProgress.batch_id == batch_id
        ).all()
    }

    chapter_list = []
    total_chapters = len(chapters)
    completed_chapters = 0

    for chapter in chapters:
        prog = progress_records.get(chapter.id)
        is_done = prog.is_completed if prog else False
        if is_done:
            completed_chapters += 1

        # Count materials in chapter
        total_materials = len(chapter.materials)

        chapter_list.append({
            "chapter_id": chapter.id,
            "chapter_title": chapter.title,
            "order_position": chapter.order_position,
            "total_materials": total_materials,
            "is_completed": is_done,
            "completed_date": prog.completed_date.isoformat() if prog and prog.completed_date else None,
            "notes": prog.notes if prog else None,
        })

    overall_pct = round((completed_chapters / total_chapters) * 100) if total_chapters > 0 else 0

    return {
        "batch_id": batch_id,
        "batch_name": batch.name,
        "course_id": course.id,
        "course_title": course.title,
        "total_chapters": total_chapters,
        "completed_chapters": completed_chapters,
        "overall_progress_pct": overall_pct,
        "chapters": chapter_list,
    }


@router.post("/batch/{batch_id}/chapter")
def update_chapter_progress(batch_id: int, req: ChapterProgressUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Mark a chapter as completed or incomplete for a batch."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing = db.query(models.BatchChapterProgress).filter(
        models.BatchChapterProgress.batch_id == batch_id,
        models.BatchChapterProgress.chapter_id == req.chapter_id
    ).first()

    if existing:
        existing.is_completed = req.is_completed
        existing.completed_date = req.completed_date or (date.today() if req.is_completed else None)
        existing.notes = req.notes
    else:
        new_prog = models.BatchChapterProgress(
            batch_id=batch_id,
            chapter_id=req.chapter_id,
            is_completed=req.is_completed,
            completed_date=req.completed_date or (date.today() if req.is_completed else None),
            notes=req.notes,
        )
        db.add(new_prog)

    db.commit()
    return {"message": "Chapter progress updated successfully."}


# ─── STUDENT ANALYTICS ─────────────────────────────────

@router.get("/batch/{batch_id}/students")
def get_batch_student_analytics(batch_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get per-student material completion analytics for a batch."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Get course with eager-loaded chapters + materials
    course = (
        db.query(models.Course)
        .options(joinedload(models.Course.chapters).joinedload(models.Chapter.materials))
        .filter(models.Course.id == batch.course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Count total materials in the course
    total_materials = 0
    for chapter in course.chapters:
        total_materials += len(chapter.materials)

    # All active/waitlisted enrollments
    enrollments = db.query(models.BatchEnrollment).filter(
        models.BatchEnrollment.batch_id == batch_id
    ).all()

    # Get all progress records for this batch
    all_progress = db.query(models.BatchStudentMaterialProgress).filter(
        models.BatchStudentMaterialProgress.batch_id == batch_id
    ).all()

    # Group progress by student
    progress_by_student: dict[int, list] = {}
    for p in all_progress:
        progress_by_student.setdefault(p.student_id, []).append(p)

    # Batch syllabus progress percentage (teacher-marked)
    batch_progress = db.query(models.BatchChapterProgress).filter(
        models.BatchChapterProgress.batch_id == batch_id,
        models.BatchChapterProgress.is_completed == True
    ).count()
    total_batch_chapters = len(course.chapters)
    batch_syllabus_pct = round((batch_progress / total_batch_chapters) * 100) if total_batch_chapters > 0 else 0

    student_list = []
    for enrollment in enrollments:
        student = enrollment.student
        student_progress = progress_by_student.get(student.id, [])
        completed_count = sum(1 for p in student_progress if p.is_completed)
        student_pct = round((completed_count / total_materials) * 100) if total_materials > 0 else 0

        # Determine risk: if batch syllabus is > 40% but student < 25% => at risk
        is_at_risk = batch_syllabus_pct >= 40 and student_pct < 25

        student_list.append({
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "email": student.email,
            "phone": student.phone,
            "enrollment_status": enrollment.status,
            "completed_materials": completed_count,
            "total_materials": total_materials,
            "progress_pct": student_pct,
            "is_at_risk": is_at_risk,
            "join_date": enrollment.join_date.isoformat() if enrollment.join_date else None,
        })

    # Sort: at-risk first, then by progress asc
    student_list.sort(key=lambda s: (not s["is_at_risk"], -s["progress_pct"]))

    return {
        "batch_id": batch_id,
        "batch_name": batch.name,
        "batch_syllabus_pct": batch_syllabus_pct,
        "total_materials": total_materials,
        "total_students": len(enrollments),
        "students": student_list,
    }


@router.post("/batch/{batch_id}/student/{student_id}/material")
def update_student_material_progress(
    batch_id: int,
    student_id: int,
    req: MaterialProgressUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Mark a material as completed/incomplete for a specific student."""
    existing = db.query(models.BatchStudentMaterialProgress).filter(
        models.BatchStudentMaterialProgress.batch_id == batch_id,
        models.BatchStudentMaterialProgress.student_id == student_id,
        models.BatchStudentMaterialProgress.material_id == req.material_id,
    ).first()

    from datetime import datetime
    now = datetime.utcnow()

    if existing:
        existing.is_completed = req.is_completed
        existing.watch_time_sec = req.watch_time_sec or 0
        existing.last_accessed = now
    else:
        new_p = models.BatchStudentMaterialProgress(
            batch_id=batch_id,
            student_id=student_id,
            material_id=req.material_id,
            is_completed=req.is_completed,
            watch_time_sec=req.watch_time_sec or 0,
            last_accessed=now,
        )
        db.add(new_p)

    db.commit()
    return {"message": "Student material progress updated."}
