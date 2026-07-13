from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import random, string
import csv
import io
from fastapi.responses import StreamingResponse

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api", tags=["questions"])


# ─── SCHEMAS ─────────────────────────────────────────

class OptionCreate(BaseModel):
    content_html: str
    is_correct: bool
    order_index: int = 0

class OptionResponse(BaseModel):
    id: int
    content_html: str
    is_correct: bool
    order_index: int

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    question_type_id: int
    question_type_code: str
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    tags: Optional[str] = None          # comma-separated
    question_html: str
    is_active: bool = True
    options: List[OptionCreate] = []


class QuestionUpdate(BaseModel):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    tags: Optional[str] = None
    question_html: Optional[str] = None
    is_active: Optional[bool] = None
    options: Optional[List[OptionCreate]] = None


class QuestionResponse(BaseModel):
    id: int
    code: str
    question_type_id: int
    question_type_code: str
    category_id: Optional[int]
    subcategory_id: Optional[int]
    tags: Optional[str]
    topic: Optional[str] = None
    difficulty_level: Optional[str] = None
    default_marks: Optional[float] = None
    default_time_to_solve: Optional[int] = None
    solution_html: Optional[str] = None
    enable_solution_video: Optional[bool] = None
    video_type: Optional[str] = None
    video_link: Optional[str] = None
    hint_html: Optional[str] = None
    enable_attachment: Optional[bool] = None
    attachment_type: Optional[str] = None
    attachment_comprehension_id: Optional[int] = None
    attachment_audio_type: Optional[str] = None
    attachment_audio_link: Optional[str] = None
    attachment_video_type: Optional[str] = None
    attachment_video_link: Optional[str] = None
    question_html: str
    is_active: bool
    created_at: datetime
    options: List[OptionResponse] = []
    # Joined names for listing
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    question_type_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── HELPERS ─────────────────────────────────────────

def _gen_code() -> str:
    """Generate unique code like que_Ab3Xy8Zk"""
    chars = string.ascii_letters + string.digits
    suffix = "".join(random.choices(chars, k=8))
    return f"que_{suffix}"


def _enrich(q: models.Question) -> dict:
    return {
        "id":                 q.id,
        "code":               q.code,
        "question_type_id":   q.question_type_id,
        "question_type_code": q.question_type_code,
        "question_type_name": q.question_type.name if q.question_type else None,
        "category_id":        q.category_id,
        "category_name":      q.category.name if q.category else None,
        "subcategory_id":     q.subcategory_id,
        "subcategory_name":   q.subcategory.name if q.subcategory else None,
        "tags":               q.tags,
        "topic":              q.topic,
        "difficulty_level":   q.difficulty_level,
        "default_marks":      q.default_marks,
        "default_time_to_solve": q.default_time_to_solve,
        "solution_html":      q.solution_html,
        "enable_solution_video": q.enable_solution_video,
        "video_type":         q.video_type,
        "video_link":         q.video_link,
        "hint_html":          q.hint_html,
        "enable_attachment":  q.enable_attachment,
        "attachment_type":    q.attachment_type,
        "attachment_comprehension_id": q.attachment_comprehension_id,
        "attachment_audio_type": q.attachment_audio_type,
        "attachment_audio_link": q.attachment_audio_link,
        "attachment_video_type": q.attachment_video_type,
        "attachment_video_link": q.attachment_video_link,
        "question_html":      q.question_html,
        "is_active":          q.is_active,
        "created_at":         q.created_at,
        "options": [
            {
                "id":           o.id,
                "content_html": o.content_html,
                "is_correct":   o.is_correct,
                "order_index":  o.order_index,
            }
            for o in q.options
        ],
    }


# ─── ROUTES ──────────────────────────────────────────

@router.get("/questions/export/csv")
def export_questions_csv(device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Retrieve all questions, eagerly loading relations
    questions = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .order_by(models.Question.id.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Code", "Question Type", "Category", "Subcategory", "Tags", 
        "Difficulty", "Marks", "Status", "Question HTML"
    ])

    for q in questions:
        writer.writerow([
            q.code,
            q.question_type.name if q.question_type else "",
            q.category.name if q.category else "",
            q.subcategory.name if q.subcategory else "",
            q.tags or "",
            q.difficulty_level or "",
            q.default_marks or "",
            "Active" if q.is_active else "Inactive",
            q.question_html or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=questions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/questions")
def list_questions(
    search:           Optional[str]  = None,
    tag:              Optional[str]  = None,       # filter by tag substring
    question_type_id: Optional[int]  = Query(None),
    type_code:        Optional[str]  = Query(None),
    category_id:      Optional[int]  = Query(None),
    subcategory_id:   Optional[int]  = Query(None),
    is_active:        Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
    )
    if search:
        q = q.filter(
            models.Question.code.ilike(f"%{search}%") |
            models.Question.question_html.ilike(f"%{search}%")
        )
    if tag:
        q = q.filter(models.Question.tags.ilike(f"%{tag}%"))
    if question_type_id:
        q = q.filter(models.Question.question_type_id == question_type_id)
    if type_code:
        q = q.filter(models.Question.question_type_code == type_code.upper())
    if category_id:
        q = q.filter(models.Question.category_id == category_id)
    if subcategory_id:
        q = q.filter(models.Question.subcategory_id == subcategory_id)
    if is_active is not None:
        q = q.filter(models.Question.is_active == is_active)

    total = q.count()
    questions = q.order_by(models.Question.id.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [_enrich(item) for item in questions],
    }



@router.get("/questions/{q_id}")
def get_question(q_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .filter(models.Question.id == q_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return _enrich(q)


@router.post("/questions")
def create_question(payload: QuestionCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Verify question type exists
    qt = db.query(models.QuestionType).filter(models.QuestionType.id == payload.question_type_id).first()
    if not qt:
        raise HTTPException(status_code=400, detail="Invalid question_type_id")

    # Generate unique code
    code = None
    for _ in range(10):
        candidate = _gen_code()
        if not db.query(models.Question).filter(models.Question.code == candidate).first():
            code = candidate
            break
    if code is None:
        raise HTTPException(status_code=500, detail="Failed to generate a unique question code. Please try again.")

    q = models.Question(
        code               = code,
        question_type_id   = payload.question_type_id,
        question_type_code = payload.question_type_code.upper(),
        category_id        = payload.category_id,
        subcategory_id     = payload.subcategory_id,
        tags               = payload.tags,
        question_html      = payload.question_html,
        is_active          = payload.is_active,
    )
    db.add(q)
    db.flush()  # get q.id

    for i, opt in enumerate(payload.options):
        db.add(models.QuestionOption(
            question_id  = q.id,
            content_html = opt.content_html,
            is_correct   = opt.is_correct,
            order_index  = opt.order_index if opt.order_index else i,
        ))

    db.commit()
    db.refresh(q)

    # Reload with joins
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .filter(models.Question.id == q.id)
        .first()
    )
    return _enrich(q)


@router.put("/questions/{q_id}")
def update_question(q_id: int, payload: QuestionUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.category_id is not None:
        q.category_id = payload.category_id
    if payload.subcategory_id is not None:
        q.subcategory_id = payload.subcategory_id
    if payload.tags is not None:
        q.tags = payload.tags
    if payload.question_html is not None:
        q.question_html = payload.question_html
    if payload.is_active is not None:
        q.is_active = payload.is_active

    if payload.options is not None:
        # Replace all options
        db.query(models.QuestionOption).filter(models.QuestionOption.question_id == q_id).delete()
        for i, opt in enumerate(payload.options):
            db.add(models.QuestionOption(
                question_id  = q_id,
                content_html = opt.content_html,
                is_correct   = opt.is_correct,
                order_index  = opt.order_index if opt.order_index else i,
            ))

    db.commit()
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .filter(models.Question.id == q_id)
        .first()
    )
    return _enrich(q)


class QuestionSettingsUpdate(BaseModel):
    category_id:           Optional[int]   = None
    subcategory_id:        Optional[int]   = None
    tags:                  Optional[str]   = None
    topic:                 Optional[str]   = None
    difficulty_level:      Optional[str]   = None
    default_marks:         Optional[float] = None
    default_time_to_solve: Optional[int]   = None
    is_active:             Optional[bool]  = None


@router.patch("/questions/{q_id}/settings")
def update_question_settings(q_id: int, payload: QuestionSettingsUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.category_id is not None:
        q.category_id = payload.category_id
    if payload.subcategory_id is not None:
        q.subcategory_id = payload.subcategory_id
    if payload.tags is not None:
        q.tags = payload.tags
    if payload.topic is not None:
        q.topic = payload.topic
    if payload.difficulty_level is not None:
        q.difficulty_level = payload.difficulty_level
    if payload.default_marks is not None:
        q.default_marks = payload.default_marks
    if payload.default_time_to_solve is not None:
        q.default_time_to_solve = payload.default_time_to_solve
    if payload.is_active is not None:
        q.is_active = payload.is_active

    db.commit()
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .filter(models.Question.id == q_id)
        .first()
    )
    return _enrich(q)


class QuestionSolutionUpdate(BaseModel):
    solution_html:         Optional[str]  = None
    enable_solution_video: Optional[bool] = None
    video_type:            Optional[str]  = None
    video_link:            Optional[str]  = None
    hint_html:             Optional[str]  = None


@router.patch("/questions/{q_id}/solution")
def update_question_solution(q_id: int, payload: QuestionSolutionUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.solution_html is not None:
        q.solution_html = payload.solution_html
    if payload.enable_solution_video is not None:
        q.enable_solution_video = payload.enable_solution_video
    if payload.video_type is not None:
        q.video_type = payload.video_type
    if payload.video_link is not None:
        q.video_link = payload.video_link
    if payload.hint_html is not None:
        q.hint_html = payload.hint_html

    db.commit()
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .filter(models.Question.id == q_id)
        .first()
    )
    return _enrich(q)


class QuestionAttachmentUpdate(BaseModel):
    enable_attachment: Optional[bool] = None
    attachment_type: Optional[str] = None
    attachment_comprehension_id: Optional[int] = None
    attachment_audio_type: Optional[str] = None
    attachment_audio_link: Optional[str] = None
    attachment_video_type: Optional[str] = None
    attachment_video_link: Optional[str] = None

@router.patch("/questions/{q_id}/attachment")
def update_question_attachment(q_id: int, payload: QuestionAttachmentUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.enable_attachment is not None:
        q.enable_attachment = payload.enable_attachment
    if payload.attachment_type is not None:
        q.attachment_type = payload.attachment_type
    if payload.attachment_comprehension_id is not None:
        q.attachment_comprehension_id = payload.attachment_comprehension_id
    if payload.attachment_audio_type is not None:
        q.attachment_audio_type = payload.attachment_audio_type
    if payload.attachment_audio_link is not None:
        q.attachment_audio_link = payload.attachment_audio_link
    if payload.attachment_video_type is not None:
        q.attachment_video_type = payload.attachment_video_type
    if payload.attachment_video_link is not None:
        q.attachment_video_link = payload.attachment_video_link

    db.commit()
    q = (
        db.query(models.Question)
        .options(
            joinedload(models.Question.question_type),
            joinedload(models.Question.category),
            joinedload(models.Question.subcategory),
            joinedload(models.Question.options),
        )
        .filter(models.Question.id == q_id)
        .first()
    )
    return _enrich(q)


@router.patch("/questions/{q_id}/toggle")
def toggle_question(q_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.is_active = not q.is_active
    db.commit()
    return {"id": q_id, "is_active": q.is_active}


@router.delete("/questions/{q_id}")
def delete_question(q_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"message": "Deleted"}
