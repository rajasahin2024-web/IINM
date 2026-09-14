"""
Student panel course features — mounted under /api/student.

All endpoints are guarded by require_student (httpOnly cookie session) and are
strictly scoped to the authenticated student's own active BatchEnrollments —
a student can never reach another batch's exams, payments, or notices.

Endpoints:
  GET   /api/student/courses/{course_id}/exams         — batch exams w/ computed state
  POST  /api/student/exam-assignments/{id}/start       — begin (or resume) an attempt
  GET   /api/student/exam-attempts/{id}                — attempt state + questions (no answers)
  POST  /api/student/exam-attempts/{id}/answers        — upsert answers in-progress
  POST  /api/student/exam-attempts/{id}/submit         — score + finalize
  GET   /api/student/courses/{course_id}/results       — gradebook w/ review
  GET   /api/student/courses/{course_id}/payments      — fees, installments, txns, invoice refs
  GET   /api/student/courses/{course_id}/notices       — global + batch-targeted notices
  GET   /api/student/courses/{course_id}/certificate   — certificate availability
  GET   /api/student/profile                           — full personal details
  PATCH /api/student/profile                           — update personal details
  POST  /api/student/change-password                   — verify current, set new

Timer authority is server-side: deadlines are computed from started_at +
duration_mins (falling back to the assignment window). A small grace period
(SUBMIT_GRACE_SECONDS) absorbs client clock/network drift on save/submit.
"""
import hashlib
import logging
import random
import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from pydantic import BaseModel, Field

from database import get_db
import models
from helpers import rewrite_url_relative
from security import hash_password, verify_password
from routers.student_auth import require_student, _ACTIVE_ENROLLMENT_STATUSES
from routers.verification import format_reg_no

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/student", tags=["student-panel"])

SUBMIT_GRACE_SECONDS = 60
_OBJECTIVE_TYPES = {"MSA", "MMA", "TOF"}
_TAG_RE = re.compile(r"<[^>]+>")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ExamAnswerIn(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    answer_text: Optional[str] = Field(default=None, max_length=20000)


class ExamAnswersPayload(BaseModel):
    answers: List[ExamAnswerIn] = Field(max_length=500)


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    alternative_phone: Optional[str] = Field(default=None, max_length=50)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(default=None, max_length=20)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    pin_code: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=5000)
    profile_photo_url: Optional[str] = Field(default=None, max_length=2000)
    highest_qualification: Optional[str] = Field(default=None, max_length=100)
    current_occupation: Optional[str] = Field(default=None, max_length=100)
    student_category: Optional[str] = Field(default=None, max_length=100)
    job_title: Optional[str] = Field(default=None, max_length=150)
    company_name: Optional[str] = Field(default=None, max_length=255)
    work_experience: Optional[str] = Field(default=None, max_length=50)
    linkedin_url: Optional[str] = Field(default=None, max_length=2000)
    preferred_language: Optional[str] = Field(default=None, max_length=50)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=50)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _as_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize a DB datetime to tz-aware UTC (naive values are UTC)."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _course_context(db: Session, student_id: int, course_id: int):
    """Resolve the student's access to a course.

    Returns (purchase, enrollment, batch_ids). Raises 403 when the student has
    neither an active purchase nor a live enrollment for the course."""
    purchase = (
        db.query(models.CoursePurchase)
        .filter(
            models.CoursePurchase.student_id == student_id,
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
            models.BatchEnrollment.student_id == student_id,
            models.Batch.course_id == course_id,
            models.BatchEnrollment.status.in_(_ACTIVE_ENROLLMENT_STATUSES),
        )
        .order_by(models.BatchEnrollment.id.desc())
        .all()
    )
    if not purchase and not enrollments:
        raise HTTPException(status_code=403, detail="You do not have access to this course")

    enrollment = next((e for e in enrollments if e.status == "active"), enrollments[0] if enrollments else None)
    batch_ids = [e.batch_id for e in enrollments]
    return purchase, enrollment, batch_ids


def _check_unlock(db: Session, assignment: models.BatchExamAssignment, student_id: int):
    """Progress-based unlock check (mirrors routers/exams.py student view).
    Returns (is_locked, unlock_reason)."""
    if assignment.unlock_condition_type == "chapter" and assignment.unlock_condition_value:
        prog = db.query(models.BatchChapterProgress).filter(
            models.BatchChapterProgress.batch_id == assignment.batch_id,
            models.BatchChapterProgress.chapter_id == assignment.unlock_condition_value,
        ).first()
        if not prog or not prog.is_completed:
            return True, "You must complete the required chapter to unlock this exam."
    elif assignment.unlock_condition_type == "material" and assignment.unlock_condition_value:
        prog = db.query(models.BatchStudentMaterialProgress).filter(
            models.BatchStudentMaterialProgress.batch_id == assignment.batch_id,
            models.BatchStudentMaterialProgress.student_id == student_id,
            models.BatchStudentMaterialProgress.material_id == assignment.unlock_condition_value,
        ).first()
        if not prog or not prog.is_completed:
            return True, "You must complete the required material (Video/PDF) to unlock this exam."
    return False, None


def _attempt_deadline(attempt: models.StudentExamAttempt,
                    assignment: models.BatchExamAssignment) -> Optional[datetime]:
    """Server-side deadline for an attempt: started_at + duration_mins, falling
    back to the assignment's scheduled_end. None means untimed."""
    started = _as_aware(attempt.started_at)
    if assignment.duration_mins and started:
        return started + timedelta(minutes=assignment.duration_mins)
    return _as_aware(assignment.scheduled_end)


def _remaining_seconds(attempt: models.StudentExamAttempt,
                       assignment: models.BatchExamAssignment) -> Optional[int]:
    deadline = _attempt_deadline(attempt, assignment)
    if deadline is None:
        return None
    return max(0, int((deadline - _now()).total_seconds()))


def _expire_stale_attempts(db: Session, attempts: list[models.StudentExamAttempt]) -> None:
    """Lazily mark in_progress attempts as expired once their deadline + grace
    has passed. Caller commits."""
    now = _now()
    dirty = False
    for att in attempts:
        if att.status != "in_progress":
            continue
        deadline = _attempt_deadline(att, att.assignment)
        if deadline and now > deadline + timedelta(seconds=SUBMIT_GRACE_SECONDS):
            att.status = "expired"
            dirty = True
    if dirty:
        db.commit()


def _strip_html(html: Optional[str]) -> str:
    return _TAG_RE.sub("", html or "").strip().casefold()


def _question_public_payload(eq: models.ExamQuestion, saved: Optional[models.StudentExamAnswer]) -> dict:
    """Question shape for a live attempt — never includes correct answers or
    solution fields."""
    q = eq.question
    return {
        "exam_question_id": eq.id,
        "question_id": eq.question_id,
        "order_position": eq.order_position,
        "marks": eq.marks,
        "negative_marks": eq.negative_marks,
        "question_type_code": q.question_type_code if q else None,
        "question_html": q.question_html if q else None,
        "hint_html": q.hint_html if q else None,
        "options": [
            {"id": o.id, "content_html": o.content_html, "order_index": o.order_index}
            for o in (q.options if q else [])
        ],
        "saved_answer": {
            "selected_option_ids": saved.selected_option_ids,
            "answer_text": saved.answer_text,
        } if saved else None,
    }


def _attempt_summary(attempt: models.StudentExamAttempt,
                     assignment: models.BatchExamAssignment) -> dict:
    return {
        "attempt_id": attempt.id,
        "attempt_no": attempt.attempt_no,
        "status": attempt.status,
        "started_at": _as_aware(attempt.started_at).isoformat() if attempt.started_at else None,
        "submitted_at": _as_aware(attempt.submitted_at).isoformat() if attempt.submitted_at else None,
        "score": attempt.score,
        "total_marks": attempt.total_marks,
        "passed": attempt.passed,
        "remaining_seconds": _remaining_seconds(attempt, assignment) if attempt.status == "in_progress" else 0,
    }


def _get_owned_attempt(db: Session, attempt_id: int, student_id: int) -> models.StudentExamAttempt:
    attempt = (
        db.query(models.StudentExamAttempt)
        .options(
            joinedload(models.StudentExamAttempt.assignment).joinedload(models.BatchExamAssignment.exam),
            joinedload(models.StudentExamAttempt.answers),
        )
        .filter(models.StudentExamAttempt.id == attempt_id)
        .first()
    )
    # 404 (not 403) — do not leak that another student's attempt exists.
    if not attempt or attempt.student_id != student_id:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    return attempt


def _ordered_exam_questions(attempt: models.StudentExamAttempt) -> list[models.ExamQuestion]:
    """Apply the frozen question_order (shuffle) captured at start time."""
    eqs = list(attempt.assignment.exam.questions)
    if attempt.question_order:
        rank = {qid: i for i, qid in enumerate(attempt.question_order)}
        eqs.sort(key=lambda eq: rank.get(eq.question_id, len(rank)))
    return eqs


def _score_attempt(attempt: models.StudentExamAttempt) -> None:
    """Score objective question types, persist per-answer results, and set
    score/total_marks/passed on the attempt. Written types stay unscored
    (is_correct/marks_awarded left NULL)."""
    assignment = attempt.assignment
    exam = assignment.exam
    answers_by_qid = {a.question_id: a for a in attempt.answers}

    total = 0.0
    score = 0.0
    for eq in exam.questions:
        q = eq.question
        total += eq.marks or 0.0
        ans = answers_by_qid.get(eq.question_id)
        if not q or not ans:
            continue
        code = (q.question_type_code or "").upper()

        if code in _OBJECTIVE_TYPES:
            if not ans.selected_option_ids:
                continue
            correct_ids = {o.id for o in q.options if o.is_correct}
            if set(ans.selected_option_ids) == correct_ids:
                ans.is_correct = True
                ans.marks_awarded = eq.marks
            else:
                ans.is_correct = False
                ans.marks_awarded = -(eq.negative_marks or 0.0) if exam.negative_marking else 0.0
            score += ans.marks_awarded
        elif code == "SAQ":
            text = (ans.answer_text or "").strip()
            if not text:
                continue
            # Acceptable answers live in the option list for SAQ questions.
            accepted = {_strip_html(o.content_html) for o in q.options}
            accepted.discard("")
            if not accepted:
                continue  # no key configured — leave unscored
            if _strip_html(text) in accepted:
                ans.is_correct = True
                ans.marks_awarded = eq.marks
            else:
                ans.is_correct = False
                ans.marks_awarded = -(eq.negative_marks or 0.0) if exam.negative_marking else 0.0
            score += ans.marks_awarded
        # Other types (MTF, ORD, FIB, unknown) are stored but left unscored.

    attempt.score = round(score, 2)
    attempt.total_marks = round(total, 2)

    if assignment.pass_marks is not None:
        attempt.passed = score >= assignment.pass_marks
    elif exam.pass_percentage is not None and total > 0:
        attempt.passed = (score / total) * 100 >= exam.pass_percentage
    else:
        attempt.passed = None


# ─── Exams list ───────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/exams")
def list_course_exams(course_id: int, student: models.Student = Depends(require_student),
                      db: Session = Depends(get_db)):
    """Exams assigned to the student's batch(es) for this course, each with a
    computed state: upcoming | available | in_progress | locked | completed |
    expired (window closed without a submitted attempt)."""
    _purchase, _enrollment, batch_ids = _course_context(db, student.id, course_id)
    if not batch_ids:
        return {"exams": []}

    assignments = (
        db.query(models.BatchExamAssignment)
        .options(joinedload(models.BatchExamAssignment.exam).joinedload(models.Exam.questions))
        .filter(
            models.BatchExamAssignment.batch_id.in_(batch_ids),
            models.BatchExamAssignment.status != "cancelled",
        )
        .order_by(models.BatchExamAssignment.scheduled_start)
        .all()
    )
    if not assignments:
        return {"exams": []}

    attempts = (
        db.query(models.StudentExamAttempt)
        .options(joinedload(models.StudentExamAttempt.assignment))
        .filter(
            models.StudentExamAttempt.student_id == student.id,
            models.StudentExamAttempt.assignment_id.in_([a.id for a in assignments]),
        )
        .all()
    )
    _expire_stale_attempts(db, attempts)
    attempts_by_assignment: dict[int, list[models.StudentExamAttempt]] = {}
    for att in attempts:
        attempts_by_assignment.setdefault(att.assignment_id, []).append(att)

    now = _now()
    result = []
    for a in assignments:
        exam = a.exam
        att_list = attempts_by_assignment.get(a.id, [])
        submitted = [t for t in att_list if t.status == "submitted"]
        active = next((t for t in att_list if t.status == "in_progress"), None)

        start = _as_aware(a.scheduled_start)
        end = _as_aware(a.scheduled_end)
        is_locked, unlock_reason = _check_unlock(db, a, student.id)

        allowed = exam.number_of_attempts if (exam and exam.restrict_attempts) else None
        attempts_used = len(att_list)
        attempts_remaining = (allowed - attempts_used) if allowed is not None else None

        if submitted:
            best = max(submitted, key=lambda t: (t.score is not None, t.score or 0))
            state = "completed"
        elif active:
            state = "in_progress"
        elif start and now < start:
            state = "upcoming"
        elif end and now > end:
            state = "expired"
        elif is_locked:
            state = "locked"
        elif attempts_remaining is not None and attempts_remaining <= 0:
            state = "locked"
            unlock_reason = "No attempts remaining for this exam."
        else:
            state = "available"

        item = {
            "assignment_id": a.id,
            "exam_id": a.exam_id,
            "exam_title": exam.title if exam else None,
            "exam_code": exam.code if exam else None,
            "exam_type": exam.exam_type if exam else None,
            "question_count": len(exam.questions) if exam else 0,
            "scheduled_start": start.isoformat() if start else None,
            "scheduled_end": end.isoformat() if end else None,
            "duration_mins": a.duration_mins,
            "pass_marks": a.pass_marks,
            "pass_percentage": exam.pass_percentage if exam else None,
            "state": state,
            "unlock_reason": unlock_reason if state == "locked" else None,
            "attempts_used": attempts_used,
            "attempts_allowed": allowed,
            "attempts_remaining": attempts_remaining,
            "can_retake": bool(submitted) and (attempts_remaining is None or attempts_remaining > 0)
                          and not (end and now > end) and not is_locked,
            "active_attempt": _attempt_summary(active, a) if active else None,
        }
        if submitted:
            item["result"] = {
                "best_score": best.score,
                "total_marks": best.total_marks,
                "passed": best.passed,
                "last_submitted_at": _as_aware(best.submitted_at).isoformat() if best.submitted_at else None,
                "submitted_attempts": len(submitted),
            }
        result.append(item)

    return {"exams": result}


# ─── Attempt lifecycle ────────────────────────────────────────────────────────

@router.post("/exam-assignments/{assignment_id}/start", status_code=201)
def start_exam_attempt(assignment_id: int, student: models.Student = Depends(require_student),
                       db: Session = Depends(get_db)):
    """Create an attempt after enforcing schedule window, unlock condition,
    attempt limits, and one-active-attempt-per-student. Returns the live
    attempt (resumed if one is already in progress)."""
    assignment = (
        db.query(models.BatchExamAssignment)
        .options(joinedload(models.BatchExamAssignment.exam).joinedload(models.Exam.questions))
        .filter(models.BatchExamAssignment.id == assignment_id)
        .first()
    )
    if not assignment or assignment.status == "cancelled":
        raise HTTPException(status_code=404, detail="Exam assignment not found")

    enrolled = db.query(models.BatchEnrollment).filter(
        models.BatchEnrollment.batch_id == assignment.batch_id,
        models.BatchEnrollment.student_id == student.id,
        models.BatchEnrollment.status.in_(_ACTIVE_ENROLLMENT_STATUSES),
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="This exam is not assigned to your batch")

    now = _now()
    start = _as_aware(assignment.scheduled_start)
    end = _as_aware(assignment.scheduled_end)
    if start and now < start:
        raise HTTPException(status_code=400, detail="This exam has not started yet")
    if end and now > end:
        raise HTTPException(status_code=400, detail="The exam window has closed")

    is_locked, unlock_reason = _check_unlock(db, assignment, student.id)
    if is_locked:
        raise HTTPException(status_code=403, detail=unlock_reason or "This exam is locked")

    attempts = (
        db.query(models.StudentExamAttempt)
        .filter(
            models.StudentExamAttempt.assignment_id == assignment_id,
            models.StudentExamAttempt.student_id == student.id,
        )
        .order_by(models.StudentExamAttempt.attempt_no)
        .all()
    )
    _expire_stale_attempts(db, attempts)

    live = next((t for t in attempts if t.status == "in_progress"), None)
    if live:
        # Idempotent resume — one active attempt per student per assignment.
        return {"attempt": _attempt_summary(live, assignment), "resumed": True}

    exam = assignment.exam
    if exam and exam.restrict_attempts and exam.number_of_attempts is not None:
        if len(attempts) >= exam.number_of_attempts:
            raise HTTPException(status_code=400, detail="No attempts remaining for this exam")

    question_ids = [eq.question_id for eq in (exam.questions if exam else [])]
    question_order = random.sample(question_ids, len(question_ids)) \
        if (exam and exam.shuffle_questions and question_ids) else None
    total_marks = round(sum(eq.marks or 0.0 for eq in (exam.questions if exam else [])), 2)

    attempt = models.StudentExamAttempt(
        assignment_id=assignment_id,
        student_id=student.id,
        attempt_no=len(attempts) + 1,
        status="in_progress",
        total_marks=total_marks,
        question_order=question_order,
    )
    db.add(attempt)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # Unique partial index race — another request created the live attempt.
        live = db.query(models.StudentExamAttempt).filter(
            models.StudentExamAttempt.assignment_id == assignment_id,
            models.StudentExamAttempt.student_id == student.id,
            models.StudentExamAttempt.status == "in_progress",
        ).first()
        if live:
            return {"attempt": _attempt_summary(live, assignment), "resumed": True}
        raise
    db.refresh(attempt)
    return {"attempt": _attempt_summary(attempt, assignment), "resumed": False}


@router.get("/exam-attempts/{attempt_id}")
def get_exam_attempt(attempt_id: int, student: models.Student = Depends(require_student),
                   db: Session = Depends(get_db)):
    """Attempt state + exam questions WITHOUT correct answers, plus the
    server-computed remaining seconds."""
    attempt = _get_owned_attempt(db, attempt_id, student.id)
    _expire_stale_attempts(db, [attempt])
    assignment = attempt.assignment
    exam = assignment.exam

    saved_by_qid = {a.question_id: a for a in attempt.answers}
    questions = [
        _question_public_payload(eq, saved_by_qid.get(eq.question_id))
        for eq in _ordered_exam_questions(attempt)
    ]

    return {
        "attempt": _attempt_summary(attempt, assignment),
        "exam": {
            "exam_id": exam.id if exam else None,
            "title": exam.title if exam else None,
            "description": exam.description if exam else None,
            "duration_mins": assignment.duration_mins,
            "pass_marks": assignment.pass_marks,
            "negative_marking": bool(exam.negative_marking) if exam else False,
        },
        "questions": questions,
    }


@router.post("/exam-attempts/{attempt_id}/answers")
def save_exam_answers(attempt_id: int, req: ExamAnswersPayload,
                    student: models.Student = Depends(require_student),
                    db: Session = Depends(get_db)):
    """Upsert answers during an in-progress attempt (autosave-friendly)."""
    attempt = _get_owned_attempt(db, attempt_id, student.id)
    _expire_stale_attempts(db, [attempt])
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail=f"Attempt is {attempt.status}")

    assignment = attempt.assignment
    deadline = _attempt_deadline(attempt, assignment)
    if deadline and _now() > deadline + timedelta(seconds=SUBMIT_GRACE_SECONDS):
        attempt.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Time is up — the attempt has expired")

    exam = assignment.exam
    valid_qids = {eq.question_id for eq in (exam.questions if exam else [])}
    valid_options: dict[int, set[int]] = {
        eq.question_id: {o.id for o in eq.question.options}
        for eq in (exam.questions if exam else []) if eq.question
    }

    existing = {a.question_id: a for a in attempt.answers}
    saved = 0
    for item in req.answers:
        if item.question_id not in valid_qids:
            raise HTTPException(status_code=400, detail=f"Question {item.question_id} is not part of this exam")
        if item.selected_option_ids is not None:
            allowed = valid_options.get(item.question_id, set())
            if any(oid not in allowed for oid in item.selected_option_ids):
                raise HTTPException(status_code=400, detail="Invalid option id for question")

        ans = existing.get(item.question_id)
        if ans is None:
            ans = models.StudentExamAnswer(attempt_id=attempt.id, question_id=item.question_id)
            db.add(ans)
            existing[item.question_id] = ans
        ans.selected_option_ids = item.selected_option_ids
        ans.answer_text = item.answer_text
        saved += 1

    db.commit()
    return {
        "saved": saved,
        "remaining_seconds": _remaining_seconds(attempt, assignment),
    }


@router.post("/exam-attempts/{attempt_id}/submit")
def submit_exam_attempt(attempt_id: int, student: models.Student = Depends(require_student),
                      db: Session = Depends(get_db)):
    """Score objective questions, apply negative marking + pass rules, and mark
    the attempt submitted. Idempotent: re-submitting returns the stored result.
    Submissions past duration + grace are rejected and the attempt expires."""
    attempt = _get_owned_attempt(db, attempt_id, student.id)
    if attempt.status == "submitted":
        return {"attempt": _attempt_summary(attempt, attempt.assignment), "already_submitted": True}
    if attempt.status == "expired":
        raise HTTPException(status_code=400, detail="Attempt has expired")

    assignment = attempt.assignment
    deadline = _attempt_deadline(attempt, assignment)
    if deadline and _now() > deadline + timedelta(seconds=SUBMIT_GRACE_SECONDS):
        attempt.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Time is up — the attempt has expired")

    _score_attempt(attempt)
    attempt.status = "submitted"
    attempt.submitted_at = _now()
    db.commit()
    db.refresh(attempt)
    return {"attempt": _attempt_summary(attempt, assignment)}


# ─── Results / gradebook ─────────────────────────────────────────────────────

@router.get("/courses/{course_id}/results")
def course_results(course_id: int, student: models.Student = Depends(require_student),
                   db: Session = Depends(get_db)):
    """Gradebook: every attempt for the course's batch assignments with score,
    pass/fail and per-question review. Correct answers + solutions are included
    only when exam.hide_solutions is false."""
    _purchase, _enrollment, batch_ids = _course_context(db, student.id, course_id)
    if not batch_ids:
        return {"results": []}

    assignments = (
        db.query(models.BatchExamAssignment)
        .options(joinedload(models.BatchExamAssignment.exam))
        .filter(
            models.BatchExamAssignment.batch_id.in_(batch_ids),
            models.BatchExamAssignment.status != "cancelled",
        )
        .all()
    )
    if not assignments:
        return {"results": []}
    by_id = {a.id: a for a in assignments}

    attempts = (
        db.query(models.StudentExamAttempt)
        .options(joinedload(models.StudentExamAttempt.answers))
        .filter(
            models.StudentExamAttempt.student_id == student.id,
            models.StudentExamAttempt.assignment_id.in_(list(by_id)),
        )
        .order_by(models.StudentExamAttempt.assignment_id, models.StudentExamAttempt.attempt_no)
        .all()
    )
    _expire_stale_attempts(db, attempts)

    results = []
    for attempt in attempts:
        assignment = by_id.get(attempt.assignment_id)
        if not assignment:
            continue
        exam = assignment.exam
        show_solutions = not (exam.hide_solutions if exam else False)
        answers_by_qid = {a.question_id: a for a in attempt.answers}

        review = None
        if attempt.status == "submitted":
            review = []
            for eq in _ordered_exam_questions(attempt):
                q = eq.question
                ans = answers_by_qid.get(eq.question_id)
                item = {
                    "exam_question_id": eq.id,
                    "question_id": eq.question_id,
                    "question_type_code": q.question_type_code if q else None,
                    "question_html": q.question_html if q else None,
                    "marks": eq.marks,
                    "negative_marks": eq.negative_marks,
                    "your_answer": {
                        "selected_option_ids": ans.selected_option_ids if ans else None,
                        "answer_text": ans.answer_text if ans else None,
                    },
                    "is_correct": ans.is_correct if ans else None,
                    "marks_awarded": ans.marks_awarded if ans else None,
                }
                if show_solutions:
                    item["options"] = [
                        {"id": o.id, "content_html": o.content_html, "is_correct": bool(o.is_correct)}
                        for o in (q.options if q else [])
                    ]
                    item["solution_html"] = q.solution_html if q else None
                else:
                    item["options"] = [
                        {"id": o.id, "content_html": o.content_html}
                        for o in (q.options if q else [])
                    ]
                review.append(item)

        results.append({
            **_attempt_summary(attempt, assignment),
            "assignment_id": assignment.id,
            "exam_id": assignment.exam_id,
            "exam_title": exam.title if exam else None,
            "exam_type": exam.exam_type if exam else None,
            "pass_marks": assignment.pass_marks,
            "pass_percentage": exam.pass_percentage if exam else None,
            "solutions_visible": show_solutions,
            "review": review,
        })

    return {"results": results}


# ─── Payments ────────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/payments")
def course_payments(course_id: int, student: models.Student = Depends(require_student),
                    db: Session = Depends(get_db)):
    """Fee summary for the student's CoursePurchase: totals, installment
    schedule, transaction history and invoice/receipt refs."""
    purchase, _enrollment, _batch_ids = _course_context(db, student.id, course_id)
    if not purchase:
        return {"purchase": None, "installments": [], "transactions": []}

    installments = [
        {
            "id": inst.id,
            "installment_no": inst.installment_no,
            "name": inst.name,
            "due_date": inst.due_date.isoformat() if inst.due_date else None,
            "amount": inst.amount,
            "paid_amount": inst.paid_amount,
            "status": inst.status,
            "payment_method": inst.payment_method,
            "reference_no": inst.reference_no,
            "paid_at": inst.paid_at.isoformat() if inst.paid_at else None,
        }
        for inst in db.query(models.InstallmentSchedule)
        .filter(models.InstallmentSchedule.purchase_id == purchase.id)
        .order_by(models.InstallmentSchedule.installment_no)
        .all()
    ]
    transactions = [
        {
            "id": t.id,
            "amount": t.amount,
            "payment_method": t.payment_method,
            "reference_no": t.reference_no,
            "notes": t.notes,
            "status": t.status,
            "screenshot_url": rewrite_url_relative(t.screenshot_url) if t.screenshot_url else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in db.query(models.PaymentTransaction)
        .filter(models.PaymentTransaction.purchase_id == purchase.id)
        .order_by(models.PaymentTransaction.created_at.desc())
        .all()
    ]

    inv = purchase.invoice_uuid
    return {
        "purchase": {
            "purchase_id": purchase.id,
            "status": purchase.status,
            "total_fee": purchase.total_fee,
            "discount": purchase.discount,
            "net_fee": purchase.net_fee,
            "paid_amount": purchase.paid_amount,
            "due_amount": purchase.due_amount,
            "refunded_amount": purchase.refunded_amount,
            "is_installment": bool(purchase.is_installment),
            "total_installments": purchase.total_installments,
            "installment_frequency": purchase.installment_frequency,
            "invoice_uuid": inv,
            "invoice_url": f"/invoice/{inv}" if inv else None,
            "receipt_url": f"/receipt/{inv}" if inv else None,
        },
        "installments": installments,
        "transactions": transactions,
    }


# ─── Notices ─────────────────────────────────────────────────────────────────

def _notice_dict(n: models.Notice) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "notice_no": n.notice_no,
        "notice_date": n.notice_date.isoformat() if n.notice_date else None,
        "category": n.category or "General",
        "description": n.description,
        "cover_image": rewrite_url_relative(n.cover_image),
        "attachment_url": rewrite_url_relative(n.attachment_url),
        "attachment_name": n.attachment_name,
        "is_pinned": bool(n.is_pinned),
        "batch_id": n.batch_id,
        "scope": "batch" if n.batch_id else "institute",
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("/courses/{course_id}/notices")
def course_notices(course_id: int,
                   limit: int = Query(50, ge=1, le=200),
                   offset: int = Query(0, ge=0),
                   student: models.Student = Depends(require_student),
                   db: Session = Depends(get_db)):
    """Notices relevant to this student: institute-wide (batch_id NULL) plus
    notices targeted at any of their batches for this course."""
    _purchase, _enrollment, batch_ids = _course_context(db, student.id, course_id)

    query = db.query(models.Notice).filter(models.Notice.is_active == True)
    if batch_ids:
        query = query.filter(or_(models.Notice.batch_id.is_(None),
                                 models.Notice.batch_id.in_(batch_ids)))
    else:
        query = query.filter(models.Notice.batch_id.is_(None))

    total = query.count()
    items = (
        query.order_by(desc(models.Notice.is_pinned), desc(models.Notice.notice_date),
                       desc(models.Notice.id))
        .offset(offset).limit(limit).all()
    )
    return {"items": [_notice_dict(n) for n in items], "total": total}


# ─── Certificate ─────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/certificate")
def course_certificate(course_id: int, student: models.Student = Depends(require_student),
                       db: Session = Depends(get_db)):
    """Certificate availability for a completed course. States:
    not_eligible (course issues no certificate / no access context),
    pending (certificate offered but course not yet complete),
    eligible (course complete — includes everything needed to render/verify)."""
    purchase, enrollment, batch_ids = _course_context(db, student.id, course_id)

    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not course.has_certificate:
        return {"state": "not_eligible", "reason": "This course does not offer a certificate."}

    # Progress = completed materials over total course materials
    material_rows = (
        db.query(models.topic_materials.c.material_id)
        .join(models.course_chapters,
              models.course_chapters.c.chapter_id == models.topic_materials.c.topic_id)
        .filter(models.course_chapters.c.course_id == course_id)
        .all()
    )
    material_ids = {r[0] for r in material_rows}
    completed = 0
    if material_ids and batch_ids:
        completed = (
            db.query(models.BatchStudentMaterialProgress)
            .filter(
                models.BatchStudentMaterialProgress.student_id == student.id,
                models.BatchStudentMaterialProgress.batch_id.in_(batch_ids),
                models.BatchStudentMaterialProgress.material_id.in_(material_ids),
                models.BatchStudentMaterialProgress.is_completed == True,
            )
            .count()
        )
    total_materials = len(material_ids)
    progress_pct = round((completed / total_materials) * 100) if total_materials else 0

    graduated = bool(enrollment and enrollment.status == "graduated")
    complete = graduated or (total_materials > 0 and completed >= total_materials)

    if not complete:
        return {
            "state": "pending",
            "reason": "Complete all course materials to unlock your certificate.",
            "progress": {
                "total_materials": total_materials,
                "completed_materials": completed,
                "progress_pct": progress_pct,
            },
        }

    reg_no = format_reg_no(student.id, student.created_at)
    verification_hash = hashlib.sha256(
        f"IINM:{student.id}:{reg_no}:{student.email}".encode()
    ).hexdigest()[:16].upper()
    batch = enrollment.batch if enrollment else None
    completion_date = (
        (batch.end_date if batch else None)
        or (enrollment.join_date if enrollment else None)
        or date.today()
    )

    return {
        "state": "eligible",
        "certificate": {
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "registration_no": reg_no,
            "course_title": course.title,
            "course_id": course.id,
            "batch_name": batch.name if batch else None,
            "completion_date": completion_date.isoformat() if completion_date else None,
            "verification_code": f"IINM-VRF-{verification_hash[:8]}",
            "verification_url": f"/verification?reg={reg_no}",
            "certificate_image_url": rewrite_url_relative(course.certificate_image_url),
        },
        "progress": {
            "total_materials": total_materials,
            "completed_materials": completed,
            "progress_pct": progress_pct,
        },
    }


# ─── Profile & password ──────────────────────────────────────────────────────

def _profile_dict(s: models.Student) -> dict:
    return {
        "id": s.id,
        "first_name": s.first_name,
        "last_name": s.last_name,
        "email": s.email,
        "phone": s.phone,
        "alternative_phone": s.alternative_phone,
        "date_of_birth": s.date_of_birth.isoformat() if s.date_of_birth else None,
        "gender": s.gender,
        "city": s.city,
        "state": s.state,
        "pin_code": s.pin_code,
        "address": s.address,
        "profile_photo_url": rewrite_url_relative(s.profile_photo_url),
        "highest_qualification": s.highest_qualification,
        "current_occupation": s.current_occupation,
        "student_category": s.student_category,
        "job_title": s.job_title,
        "company_name": s.company_name,
        "work_experience": s.work_experience,
        "linkedin_url": s.linkedin_url,
        "preferred_language": s.preferred_language,
        "emergency_contact_name": s.emergency_contact_name,
        "emergency_contact_phone": s.emergency_contact_phone,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/profile")
def get_profile(student: models.Student = Depends(require_student)):
    """Full personal details for the authenticated student."""
    return _profile_dict(student)


@router.patch("/profile")
def update_profile(req: ProfileUpdate, student: models.Student = Depends(require_student),
                   db: Session = Depends(get_db)):
    """Update personal details. Email is intentionally not editable here."""
    updates = req.model_dump(exclude_unset=True)
    if "first_name" in updates and not (updates["first_name"] or "").strip():
        raise HTTPException(status_code=400, detail="First name cannot be empty")
    for field, value in updates.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return _profile_dict(student)


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, student: models.Student = Depends(require_student),
                    db: Session = Depends(get_db)):
    """Verify the current password and set a new one. The session cookie is a
    stateless HMAC token, so it stays valid until expiry — same semantics as
    the reset-password flow."""
    if not student.password_hash:
        raise HTTPException(
            status_code=400,
            detail="No password is set on this account. Use forgot-password to create one.",
        )
    if not verify_password(req.current_password, student.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    student.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}
