from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import random, string

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api/exams", tags=["Exams"])


# ─── HELPERS ──────────────────────────────────────────

def _gen_code():
    chars = string.ascii_letters + string.digits
    suffix = ''.join(random.choices(chars, k=9))
    return f"exam_{suffix}"

def _exam_to_dict(exam: models.Exam, include_questions: bool = False) -> dict:
    d = {
        "id": exam.id,
        "code": exam.code,
        "title": exam.title,
        "description": exam.description,
        "category_id": exam.category_id,
        "subcategory_id": exam.subcategory_id,
        "exam_type": exam.exam_type,
        "is_paid": exam.is_paid,
        "is_public": exam.is_public,
        "status": exam.status,
        "pass_percentage": exam.pass_percentage,
        "negative_marking": exam.negative_marking,
        "shuffle_questions": exam.shuffle_questions,
        "restrict_attempts": exam.restrict_attempts,
        "number_of_attempts": exam.number_of_attempts,
        "show_leaderboard": exam.show_leaderboard,
        "hide_solutions": exam.hide_solutions,
        "duration_mode": exam.duration_mode,
        "marks_mode": exam.marks_mode,
        "category_name": exam.category.name if exam.category else None,
        "subcategory_name": exam.subcategory.name if exam.subcategory else None,
        "question_count": len(exam.questions),
        "created_at": exam.created_at.isoformat() if exam.created_at else None,
        "updated_at": exam.updated_at.isoformat() if exam.updated_at else None,
    }
    if include_questions:
        d["questions"] = [
            {
                "id": eq.id,
                "question_id": eq.question_id,
                "order_position": eq.order_position,
                "marks": eq.marks,
                "negative_marks": eq.negative_marks,
                "question_code": eq.question.code if eq.question else None,
                "question_preview": (eq.question.question_html or "").replace("<br>", " ").strip()[:100] if eq.question else None,
            }
            for eq in exam.questions
        ]
    return d


# ─── SCHEMAS ──────────────────────────────────────────

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    exam_type: Optional[str] = None
    is_paid: bool = False
    is_public: bool = True
    status: str = "Draft"
    pass_percentage: float = 60.0
    negative_marking: bool = False
    shuffle_questions: bool = False
    restrict_attempts: bool = False
    number_of_attempts: Optional[int] = None
    show_leaderboard: bool = False
    hide_solutions: bool = False
    duration_mode: str = "Auto"
    marks_mode: str = "Auto"

class ExamUpdate(ExamCreate):
    pass

class ExamQuestionAdd(BaseModel):
    question_ids: List[int]
    marks: float = 1.0
    negative_marks: float = 0.0

class BatchAssignCreate(BaseModel):
    batch_id: int
    exam_id: int
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    pass_marks: Optional[float] = None
    duration_mins: Optional[int] = None
    notes: Optional[str] = None
    status: str = "scheduled"
    unlock_condition_type: Optional[str] = None
    unlock_condition_value: Optional[int] = None


# ─── EXAM CRUD ────────────────────────────────────────

@router.get("")
def list_exams(
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    q = db.query(models.Exam)
    if status:
        q = q.filter(models.Exam.status == status)
    if category_id:
        q = q.filter(models.Exam.category_id == category_id)
    exams = q.order_by(models.Exam.created_at.desc()).all()
    return [_exam_to_dict(e) for e in exams]


@router.get("/{exam_id}")
def get_exam(exam_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return _exam_to_dict(exam, include_questions=True)


@router.post("", status_code=201)
def create_exam(req: ExamCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    exam = models.Exam(
        code=_gen_code(),
        title=req.title,
        description=req.description,
        category_id=req.category_id,
        subcategory_id=req.subcategory_id,
        exam_type=req.exam_type,
        is_paid=req.is_paid,
        is_public=req.is_public,
        status=req.status,
        pass_percentage=req.pass_percentage,
        negative_marking=req.negative_marking,
        shuffle_questions=req.shuffle_questions,
        restrict_attempts=req.restrict_attempts,
        number_of_attempts=req.number_of_attempts,
        show_leaderboard=req.show_leaderboard,
        hide_solutions=req.hide_solutions,
        duration_mode=req.duration_mode,
        marks_mode=req.marks_mode,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return _exam_to_dict(exam)


@router.put("/{exam_id}")
def update_exam(exam_id: int, req: ExamUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    for field, value in req.dict(exclude_unset=True).items():
        setattr(exam, field, value)
    db.commit()
    db.refresh(exam)
    return _exam_to_dict(exam)


@router.delete("/{exam_id}")
def delete_exam(exam_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return {"message": "Exam deleted successfully"}


# ─── EXAM QUESTIONS ───────────────────────────────────

@router.post("/{exam_id}/questions")
def add_questions_to_exam(exam_id: int, req: ExamQuestionAdd, device: str = Depends(require_device), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    existing_qids = {eq.question_id for eq in exam.questions}
    added = 0
    current_max = max((eq.order_position for eq in exam.questions), default=0)

    for qid in req.question_ids:
        if qid in existing_qids:
            continue
        current_max += 1
        eq = models.ExamQuestion(
            exam_id=exam_id,
            question_id=qid,
            order_position=current_max,
            marks=req.marks,
            negative_marks=req.negative_marks,
        )
        db.add(eq)
        added += 1

    db.commit()
    return {"message": f"Added {added} questions to exam.", "added": added}


@router.delete("/{exam_id}/questions/{eq_id}")
def remove_question_from_exam(exam_id: int, eq_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    eq = db.query(models.ExamQuestion).filter(
        models.ExamQuestion.id == eq_id,
        models.ExamQuestion.exam_id == exam_id
    ).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Question not found in this exam")
    db.delete(eq)
    db.commit()
    return {"message": "Question removed from exam"}


# ─── BATCH EXAM ASSIGNMENT ────────────────────────────

@router.get("/assignments/batch/{batch_id}")
def get_batch_assignments(batch_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    assignments = db.query(models.BatchExamAssignment).filter(
        models.BatchExamAssignment.batch_id == batch_id
    ).order_by(models.BatchExamAssignment.scheduled_start).all()

    return [
        {
            "id": a.id,
            "batch_id": a.batch_id,
            "exam_id": a.exam_id,
            "exam_title": a.exam.title,
            "exam_code": a.exam.code,
            "exam_type": a.exam.exam_type,
            "question_count": len(a.exam.questions),
            "scheduled_start": a.scheduled_start.isoformat() if a.scheduled_start else None,
            "scheduled_end": a.scheduled_end.isoformat() if a.scheduled_end else None,
            "pass_marks": a.pass_marks,
            "duration_mins": a.duration_mins,
            "notes": a.notes,
            "status": a.status,
            "unlock_condition_type": a.unlock_condition_type,
            "unlock_condition_value": a.unlock_condition_value,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assignments
    ]


@router.post("/assignments")
def create_batch_assignment(req: BatchAssignCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Check if already assigned
    existing = db.query(models.BatchExamAssignment).filter(
        models.BatchExamAssignment.batch_id == req.batch_id,
        models.BatchExamAssignment.exam_id == req.exam_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This exam is already assigned to this batch.")

    assignment = models.BatchExamAssignment(
        batch_id=req.batch_id,
        exam_id=req.exam_id,
        scheduled_start=req.scheduled_start,
        scheduled_end=req.scheduled_end,
        pass_marks=req.pass_marks,
        duration_mins=req.duration_mins,
        notes=req.notes,
        status=req.status,
        unlock_condition_type=req.unlock_condition_type,
        unlock_condition_value=req.unlock_condition_value,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Exam assigned to batch successfully.", "id": assignment.id}


@router.put("/assignments/{assignment_id}")
def update_assignment(assignment_id: int, req: BatchAssignCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(models.BatchExamAssignment).filter(models.BatchExamAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    a.scheduled_start = req.scheduled_start
    a.scheduled_end = req.scheduled_end
    a.pass_marks = req.pass_marks
    a.duration_mins = req.duration_mins
    a.notes = req.notes
    a.status = req.status
    a.unlock_condition_type = req.unlock_condition_type
    a.unlock_condition_value = req.unlock_condition_value
    db.commit()
    return {"message": "Assignment updated."}

@router.get("/student/{student_id}/batch/{batch_id}")
def get_student_batch_exams(student_id: int, batch_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Fetch assigned exams for a student in a batch, with lock status evaluated based on progress."""
    assignments = db.query(models.BatchExamAssignment).filter(
        models.BatchExamAssignment.batch_id == batch_id,
        models.BatchExamAssignment.status.in_(["scheduled", "active"])
    ).order_by(models.BatchExamAssignment.scheduled_start).all()
    
    result = []
    for a in assignments:
        is_locked = False
        unlock_reason = None
        
        if a.unlock_condition_type == "chapter" and a.unlock_condition_value:
            prog = db.query(models.BatchChapterProgress).filter(
                models.BatchChapterProgress.batch_id == batch_id,
                models.BatchChapterProgress.chapter_id == a.unlock_condition_value
            ).first()
            if not prog or not prog.is_completed:
                is_locked = True
                unlock_reason = "You must complete the required chapter to unlock this exam."
                
        elif a.unlock_condition_type == "material" and a.unlock_condition_value:
            prog = db.query(models.BatchStudentMaterialProgress).filter(
                models.BatchStudentMaterialProgress.batch_id == batch_id,
                models.BatchStudentMaterialProgress.student_id == student_id,
                models.BatchStudentMaterialProgress.material_id == a.unlock_condition_value
            ).first()
            if not prog or not prog.is_completed:
                is_locked = True
                unlock_reason = "You must complete the required material (Video/PDF) to unlock this exam."

        result.append({
            "assignment_id": a.id,
            "exam_id": a.exam_id,
            "exam_title": a.exam.title,
            "exam_code": a.exam.code,
            "question_count": len(a.exam.questions),
            "scheduled_start": a.scheduled_start.isoformat() if a.scheduled_start else None,
            "scheduled_end": a.scheduled_end.isoformat() if a.scheduled_end else None,
            "duration_mins": a.duration_mins,
            "pass_marks": a.pass_marks,
            "is_locked": is_locked,
            "unlock_reason": unlock_reason
        })
    return result


@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    a = db.query(models.BatchExamAssignment).filter(models.BatchExamAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(a)
    db.commit()
    return {"message": "Assignment removed."}
