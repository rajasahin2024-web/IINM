"""
Student eBook reader endpoints — mounted under /api/student.

Private delivery model: eBook files are never reachable via a public URL.
Bytes are served only through the authenticated, Range-capable /file endpoint
(pdf.js issues byte-range requests for pagination). Access requires an active
purchase or batch enrollment for a course that contains the material.

Endpoints:
  GET /api/student/ebooks/{material_id}            — meta + TOC + progress
  GET /api/student/ebooks/{material_id}/file       — private PDF bytes (Range)
  PUT /api/student/ebooks/{material_id}/progress   — resume-where-left marker
  PUT /api/student/ebooks/{material_id}/chapters/{idx} — mark chapter complete

Completing every TOC chapter also marks the material complete in
BatchStudentMaterialProgress, which drives existing unlock machinery
(sequential video unlock in ebook_video courses, certificate progress).
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
import models
import ebook_storage
from helpers import rewrite_url_relative
from routers.student_auth import require_student, _ACTIVE_ENROLLMENT_STATUSES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/student/ebooks", tags=["student-ebooks"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ProgressUpdate(BaseModel):
    last_page: Optional[int] = Field(default=None, ge=0)
    last_chapter_index: Optional[int] = Field(default=None, ge=0)


class ChapterCompletionUpdate(BaseModel):
    is_completed: bool = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_ebook_material(db: Session, material_id: int) -> models.CourseMaterial:
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat or mat.file_type != "ebook":
        raise HTTPException(status_code=404, detail="eBook not found")
    return mat


def _ebook_access(db: Session, student_id: int, material_id: int) -> tuple[bool, list[int]]:
    """Return (has_access, batch_ids). Access = active purchase OR live
    enrollment for any course that contains this material."""
    course_ids = [
        r[0] for r in db.query(models.course_chapters.c.course_id)
        .join(models.topic_materials,
              models.topic_materials.c.topic_id == models.course_chapters.c.chapter_id)
        .filter(models.topic_materials.c.material_id == material_id)
        .all()
    ]
    if not course_ids:
        return False, []

    has_purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.student_id == student_id,
        models.CoursePurchase.course_id.in_(course_ids),
        models.CoursePurchase.is_active == True,
        models.CoursePurchase.status != "cancelled",
    ).first() is not None

    enrollments = (
        db.query(models.BatchEnrollment)
        .join(models.Batch, models.BatchEnrollment.batch_id == models.Batch.id)
        .filter(
            models.BatchEnrollment.student_id == student_id,
            models.Batch.course_id.in_(course_ids),
            models.BatchEnrollment.status.in_(_ACTIVE_ENROLLMENT_STATUSES),
        )
        .all()
    )
    batch_ids = [e.batch_id for e in enrollments]
    return (has_purchase or bool(batch_ids)), batch_ids


def _toc_list(mat: models.CourseMaterial) -> list:
    toc = mat.ebook_toc
    return toc if isinstance(toc, list) else []


def _sync_material_completion(db: Session, student_id: int, material_id: int,
                              batch_ids: list[int]) -> bool:
    """Recompute whole-eBook completion (all TOC chapters done) and mirror it
    into BatchStudentMaterialProgress for each of the student's batches —
    the flag that drives material-unlock conditions and course progress.
    Returns the computed completion state."""
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    toc = _toc_list(mat) if mat else []
    if not toc:
        return False

    done_rows = db.query(models.StudentEbookChapterProgress).filter(
        models.StudentEbookChapterProgress.student_id == student_id,
        models.StudentEbookChapterProgress.material_id == material_id,
        models.StudentEbookChapterProgress.is_completed == True,
    ).all()
    done_idx = {r.chapter_index for r in done_rows}
    complete = all(i in done_idx for i in range(len(toc)))

    now = datetime.now(timezone.utc)
    for batch_id in batch_ids:
        prog = db.query(models.BatchStudentMaterialProgress).filter(
            models.BatchStudentMaterialProgress.batch_id == batch_id,
            models.BatchStudentMaterialProgress.student_id == student_id,
            models.BatchStudentMaterialProgress.material_id == material_id,
        ).first()
        if prog is None:
            prog = models.BatchStudentMaterialProgress(
                batch_id=batch_id,
                student_id=student_id,
                material_id=material_id,
            )
            db.add(prog)
        prog.is_completed = complete
        prog.last_accessed = now
    return complete


def _progress_payload(db: Session, student_id: int, mat: models.CourseMaterial,
                      batch_ids: list[int]) -> dict:
    prog = db.query(models.StudentEbookProgress).filter(
        models.StudentEbookProgress.student_id == student_id,
        models.StudentEbookProgress.material_id == mat.id,
    ).first()
    done_rows = db.query(models.StudentEbookChapterProgress).filter(
        models.StudentEbookChapterProgress.student_id == student_id,
        models.StudentEbookChapterProgress.material_id == mat.id,
        models.StudentEbookChapterProgress.is_completed == True,
    ).all()
    done_idx = sorted(r.chapter_index for r in done_rows)
    toc = _toc_list(mat)
    is_complete = bool(toc) and all(i in done_idx for i in range(len(toc)))
    return {
        "last_page": prog.last_page if prog else 0,
        "last_chapter_index": prog.last_chapter_index if prog else None,
        "last_accessed": prog.last_accessed.isoformat() if prog and prog.last_accessed else None,
        "completed_chapters": done_idx,
        "total_chapters": len(toc),
        "is_complete": is_complete,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{material_id}")
def get_ebook_meta(material_id: int, student: models.Student = Depends(require_student),
                   db: Session = Depends(get_db)):
    """eBook metadata + TOC + the student's reading progress."""
    mat = _get_ebook_material(db, material_id)
    has_access, batch_ids = _ebook_access(db, student.id, material_id)
    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have access to this eBook")

    return {
        "id": mat.id,
        "title": mat.title,
        "description": mat.description,
        "cover_url": rewrite_url_relative(mat.ebook_cover_url),
        "toc": _toc_list(mat),
        "page_count": mat.ebook_page_count,
        "file_size": mat.file_size,
        "has_file": bool(mat.ebook_file_key),
        "progress": _progress_payload(db, student.id, mat, batch_ids),
    }


@router.get("/{material_id}/file")
def stream_ebook_file(material_id: int, request: Request,
                      student: models.Student = Depends(require_student),
                      db: Session = Depends(get_db)):
    """Private eBook bytes. Supports `Range: bytes=a-b` so the reader can
    paginate without downloading the whole file; full GET also works.
    Never emits a public/shareable URL — the session cookie is required."""
    mat = _get_ebook_material(db, material_id)
    has_access, _batch_ids = _ebook_access(db, student.id, material_id)
    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have access to this eBook")
    if not mat.ebook_file_key:
        raise HTTPException(status_code=404, detail="No eBook file attached")

    try:
        obj = ebook_storage.read_ebook_object(db, mat.ebook_file_key, request.headers.get("range"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="eBook file not found in storage")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(len(obj["content"])),
        # Private bytes — never cached by shared/public caches
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if obj["content_range"]:
        headers["Content-Range"] = obj["content_range"]
    return Response(content=obj["content"], status_code=obj["status"],
                    media_type=obj["content_type"], headers=headers)


@router.put("/{material_id}/progress")
def update_reading_progress(material_id: int, req: ProgressUpdate,
                            student: models.Student = Depends(require_student),
                            db: Session = Depends(get_db)):
    """Upsert the student's resume-where-left marker (idempotent)."""
    mat = _get_ebook_material(db, material_id)
    has_access, batch_ids = _ebook_access(db, student.id, material_id)
    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have access to this eBook")

    now = datetime.now(timezone.utc)
    prog = db.query(models.StudentEbookProgress).filter(
        models.StudentEbookProgress.student_id == student.id,
        models.StudentEbookProgress.material_id == material_id,
    ).first()
    if prog is None:
        prog = models.StudentEbookProgress(student_id=student.id, material_id=material_id)
        db.add(prog)
    if req.last_page is not None:
        prog.last_page = req.last_page
    if req.last_chapter_index is not None:
        prog.last_chapter_index = req.last_chapter_index
    prog.last_accessed = now

    # Keep last_accessed fresh on the batch material progress too
    for batch_id in batch_ids:
        bmp = db.query(models.BatchStudentMaterialProgress).filter(
            models.BatchStudentMaterialProgress.batch_id == batch_id,
            models.BatchStudentMaterialProgress.student_id == student.id,
            models.BatchStudentMaterialProgress.material_id == material_id,
        ).first()
        if bmp is None:
            bmp = models.BatchStudentMaterialProgress(
                batch_id=batch_id, student_id=student.id, material_id=material_id)
            db.add(bmp)
        bmp.last_accessed = now

    db.commit()
    return {"progress": _progress_payload(db, student.id, mat, batch_ids)}


@router.put("/{material_id}/chapters/{chapter_index}")
def set_chapter_completion(material_id: int, chapter_index: int, req: ChapterCompletionUpdate,
                           student: models.Student = Depends(require_student),
                           db: Session = Depends(get_db)):
    """Mark a TOC chapter complete/incomplete. When every TOC chapter is
    complete the material itself is marked complete for the student's
    batches — this is what unlocks recorded videos in ebook_video courses."""
    mat = _get_ebook_material(db, material_id)
    has_access, batch_ids = _ebook_access(db, student.id, material_id)
    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have access to this eBook")

    toc = _toc_list(mat)
    if chapter_index < 0 or chapter_index >= len(toc):
        raise HTTPException(status_code=400, detail="Invalid chapter index")

    now = datetime.now(timezone.utc)
    row = db.query(models.StudentEbookChapterProgress).filter(
        models.StudentEbookChapterProgress.student_id == student.id,
        models.StudentEbookChapterProgress.material_id == material_id,
        models.StudentEbookChapterProgress.chapter_index == chapter_index,
    ).first()
    if row is None:
        row = models.StudentEbookChapterProgress(
            student_id=student.id, material_id=material_id, chapter_index=chapter_index)
        db.add(row)
    row.is_completed = req.is_completed
    row.completed_at = now if req.is_completed else None

    # Session runs with autoflush=False — the pending chapter row must be
    # flushed before the completion aggregate re-queries the table.
    db.flush()
    is_complete = _sync_material_completion(db, student.id, material_id, batch_ids)
    db.commit()

    return {
        "progress": _progress_payload(db, student.id, mat, batch_ids),
        "material_completed": is_complete,
    }
