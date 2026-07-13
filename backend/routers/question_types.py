from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api", tags=["question_types"])

# ─── SCHEMAS ─────────────────────────────────────────

class QuestionTypeBase(BaseModel):
    code: str
    name: str
    short_description: Optional[str] = None
    is_active: bool = True

class QuestionTypeCreate(QuestionTypeBase):
    pass

class QuestionTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    short_description: Optional[str] = None
    is_active: Optional[bool] = None

class QuestionTypeResponse(QuestionTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── SEED DATA ───────────────────────────────────────

DEFAULT_QUESTION_TYPES = [
    {
        "code": "MSA",
        "name": "Multiple Choice Single Answer",
        "short_description": "This question type is easy to set up and is the most frequent MCQ question in online exams. Users are allowed to pick just one answer from a list of given options.",
    },
    {
        "code": "MMA",
        "name": "Multiple Choice Multiple Answers",
        "short_description": "Multiple Choice Multiple Answers type question allows users to select one or several answers from a list of given options.",
    },
    {
        "code": "TOF",
        "name": "True or False",
        "short_description": "A true or false question consists of a statement that requires a true or false response. We can also format the options as: Yes/No, Correct/Incorrect, and Agree/Disagree.",
    },
    {
        "code": "SAQ",
        "name": "Short Answer",
        "short_description": "Short answer questions allow users to provide text or numeric answers. These responses will be validated against the provided possible answers.",
    },
    {
        "code": "MTF",
        "name": "Match the Following",
        "short_description": "A matching question is two adjacent lists of related words, phrases, pictures, or symbols. Each item in one list is paired with at least one item in the other list.",
    },
    {
        "code": "ORD",
        "name": "Ordering/Sequence",
        "short_description": "An ordering/sequence question consists of a scrambled list of related words, phrases, pictures, or symbols. The User needs to arrange them in a logical order/sequence.",
    },
    {
        "code": "FIB",
        "name": "Fill in the Blanks",
        "short_description": "A Fill in the Blank question consists of a phrase, sentence, or paragraph with a blank space where a student provides the missing word or words.",
    },
]


# ─── ROUTES ──────────────────────────────────────────

@router.get("/question-types/seed")
def seed_question_types(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Idempotently seed the 7 default question types."""
    seeded = 0
    for qt in DEFAULT_QUESTION_TYPES:
        existing = db.query(models.QuestionType).filter(models.QuestionType.code == qt["code"]).first()
        if not existing:
            db.add(models.QuestionType(**qt))
            seeded += 1
    db.commit()
    return {"message": f"Seeded {seeded} question type(s)"}


@router.get("/question-types", response_model=List[QuestionTypeResponse])
def get_question_types(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Return all question types with optional search and status filter."""
    query = db.query(models.QuestionType)
    if search:
        query = query.filter(
            models.QuestionType.name.ilike(f"%{search}%") |
            models.QuestionType.code.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.filter(models.QuestionType.is_active == is_active)
    return query.order_by(models.QuestionType.id.asc()).all()


@router.get("/question-types/{qt_id}", response_model=QuestionTypeResponse)
def get_question_type(qt_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    qt = db.query(models.QuestionType).filter(models.QuestionType.id == qt_id).first()
    if not qt:
        raise HTTPException(status_code=404, detail="Question type not found")
    return qt


@router.post("/question-types", response_model=QuestionTypeResponse)
def create_question_type(qt: QuestionTypeCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Duplicate code check
    existing = db.query(models.QuestionType).filter(models.QuestionType.code == qt.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Question type with code '{qt.code}' already exists")
    db_qt = models.QuestionType(
        code=qt.code.upper().strip(),
        name=qt.name.strip(),
        short_description=qt.short_description,
        is_active=qt.is_active,
    )
    db.add(db_qt)
    db.commit()
    db.refresh(db_qt)
    return db_qt


@router.put("/question-types/{qt_id}", response_model=QuestionTypeResponse)
def update_question_type(qt_id: int, qt: QuestionTypeUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_qt = db.query(models.QuestionType).filter(models.QuestionType.id == qt_id).first()
    if not db_qt:
        raise HTTPException(status_code=404, detail="Question type not found")
    if qt.code is not None:
        # Prevent duplicate code collision on update
        conflict = db.query(models.QuestionType).filter(
            models.QuestionType.code == qt.code.upper(),
            models.QuestionType.id != qt_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Code '{qt.code}' is already in use")
        db_qt.code = qt.code.upper().strip()
    if qt.name is not None:
        db_qt.name = qt.name.strip()
    if qt.short_description is not None:
        db_qt.short_description = qt.short_description
    if qt.is_active is not None:
        db_qt.is_active = qt.is_active
    db.commit()
    db.refresh(db_qt)
    return db_qt


@router.patch("/question-types/{qt_id}/toggle", response_model=QuestionTypeResponse)
def toggle_question_type_status(qt_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Toggle active/inactive status."""
    db_qt = db.query(models.QuestionType).filter(models.QuestionType.id == qt_id).first()
    if not db_qt:
        raise HTTPException(status_code=404, detail="Question type not found")
    db_qt.is_active = not db_qt.is_active
    db.commit()
    db.refresh(db_qt)
    return db_qt


@router.delete("/question-types/{qt_id}")
def delete_question_type(qt_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_qt = db.query(models.QuestionType).filter(models.QuestionType.id == qt_id).first()
    if not db_qt:
        raise HTTPException(status_code=404, detail="Question type not found")
    db.delete(db_qt)
    db.commit()
    return {"message": "Deleted successfully"}
