from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime
import models
from database import get_db
from routers.auth import require_device
import time

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Simple in-memory cache to store dashboard data for 2 minutes
_cache = {
    "timestamp": 0,
    "data": None,
    "ttl": 120  # Cache duration in seconds (2 minutes)
}

@router.get("/summary")
def get_dashboard_summary(device: str = Depends(require_device), db: Session = Depends(get_db)):
    global _cache
    current_time = time.time()
    
    # Return cached data if it is still valid
    if _cache["data"] and (current_time - _cache["timestamp"] < _cache["ttl"]):
        return _cache["data"]

    now = datetime.utcnow()
    current_month = now.month
    current_year  = now.year

    # ── Counts ──────────────────────────────────────────────────────────
    total_courses   = db.query(func.count(models.Course.id)).scalar() or 0
    active_courses  = db.query(func.count(models.Course.id)).filter(
        models.Course.status == "published"
    ).scalar() or 0

    total_students  = db.query(func.count(models.Student.id)).scalar() or 0
    active_students = db.query(func.count(models.Student.id)).filter(
        models.Student.is_active == True
    ).scalar() or 0

    total_batches   = db.query(func.count(models.Batch.id)).scalar() or 0
    active_batches  = db.query(func.count(models.Batch.id)).filter(
        models.Batch.status.in_(["Ongoing", "Upcoming"])
    ).scalar() or 0

    total_questions = db.query(func.count(models.Question.id)).scalar() or 0
    total_materials = db.query(func.count(models.CourseMaterial.id)).scalar() or 0
    total_exams     = db.query(func.count(models.Exam.id)).scalar() or 0
    total_chapters  = db.query(func.count(models.Chapter.id)).scalar() or 0

    # ── Revenue ─────────────────────────────────────────────────────────
    try:
        month_revenue = float(
            db.query(func.sum(models.PaymentTransaction.amount)).filter(
                models.PaymentTransaction.status == "approved",
                extract("month", models.PaymentTransaction.created_at) == current_month,
                extract("year",  models.PaymentTransaction.created_at) == current_year,
            ).scalar() or 0
        )
        total_revenue = float(
            db.query(func.sum(models.PaymentTransaction.amount)).filter(
                models.PaymentTransaction.status == "approved"
            ).scalar() or 0
        )
    except Exception:
        month_revenue = 0.0
        total_revenue = 0.0

    # Last 6 months revenue chart - Optimized into a single query
    m_ago = current_month - 5
    y_ago = current_year
    if m_ago <= 0:
        m_ago += 12
        y_ago -= 1
    start_date_6m = datetime(y_ago, m_ago, 1)

    chart_data = db.query(
        extract("year", models.PaymentTransaction.created_at).label("y"),
        extract("month", models.PaymentTransaction.created_at).label("m"),
        func.sum(models.PaymentTransaction.amount).label("total")
    ).filter(
        models.PaymentTransaction.status == "approved",
        models.PaymentTransaction.created_at >= start_date_6m
    ).group_by(
        extract("year", models.PaymentTransaction.created_at),
        extract("month", models.PaymentTransaction.created_at)
    ).all()

    revenue_map = {(int(r.y), int(r.m)): float(r.total or 0) for r in chart_data}
    monthly_revenue = []
    
    for i in range(5, -1, -1):
        m = (current_month - i - 1) % 12 + 1
        y = current_year if (current_month - i) > 0 else current_year - 1
        amt = revenue_map.get((y, m), 0.0)
        monthly_revenue.append({"month": datetime(y, m, 1).strftime("%b"), "amount": amt})

    # Purchases this month
    try:
        month_purchases = db.query(func.count(models.CoursePurchase.id)).filter(
            extract("month", models.CoursePurchase.created_at) == current_month,
            extract("year",  models.CoursePurchase.created_at) == current_year,
        ).scalar() or 0
    except Exception:
        month_purchases = 0

    # Outstanding dues (due_amount > 0)
    try:
        overdue_count = db.query(func.count(models.CoursePurchase.id)).filter(
            models.CoursePurchase.due_amount > 0
        ).scalar() or 0
    except Exception:
        overdue_count = 0

    # ── Device access summary ────────────────────────────────────────────
    from models import DeviceSession
    approved_devices = db.query(func.count(DeviceSession.id)).filter(DeviceSession.is_approved == True).scalar() or 0
    pending_devices  = db.query(func.count(DeviceSession.id)).filter(
        DeviceSession.is_approved == False, DeviceSession.is_rejected == False
    ).scalar() or 0
    rejected_devices = db.query(func.count(DeviceSession.id)).filter(DeviceSession.is_rejected == True).scalar() or 0

    # ── Recent students — order by id desc ────
    recent_students = db.query(models.Student).order_by(models.Student.id.desc()).limit(20).all()
    recent_students_list = [
        {
            "id":         s.id,
            "name":       f"{s.first_name} {s.last_name or ''}".strip(),
            "email":      s.email,
            "created_at": None,
            "is_active":  s.is_active,
        }
        for s in recent_students
    ]

    # ── Recent courses ────────────────────────────────────────────────────
    recent_courses = db.query(models.Course).order_by(models.Course.created_at.desc()).limit(5).all()
    recent_courses_list = [
        {
            "id":         c.id,
            "title":      c.title,
            "is_active":  c.status == "published",
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in recent_courses
    ]

    # ── Batch enrollment overview - Optimized (Fix N+1 query issue) ───────
    batches = db.query(models.Batch).filter(
        models.Batch.status.in_(["Ongoing", "Upcoming"])
    ).limit(8).all()
    
    batch_ids = [b.id for b in batches]
    enrollment_map = {}
    if batch_ids:
        enrollments = db.query(
            models.BatchEnrollment.batch_id,
            func.count(models.BatchEnrollment.id)
        ).filter(
            models.BatchEnrollment.batch_id.in_(batch_ids)
        ).group_by(models.BatchEnrollment.batch_id).all()
        enrollment_map = {b_id: count for b_id, count in enrollments}

    batch_overview = []
    for b in batches:
        batch_overview.append({
            "id":         b.id,
            "name":       b.name,
            "status":     b.status,
            "enrolled":   enrollment_map.get(b.id, 0),
            "capacity":   b.max_capacity or 50,
            "start_date": b.start_date.isoformat() if b.start_date else None,
        })

    # ── Upcoming Installments ─────────────────────────────────────────────
    today = datetime.utcnow().date()
    try:
        upcoming_insts = db.query(models.InstallmentSchedule).join(
            models.CoursePurchase
        ).join(
            models.Student, models.CoursePurchase.student_id == models.Student.id
        ).filter(
            models.InstallmentSchedule.paid_amount < models.InstallmentSchedule.amount,
            models.InstallmentSchedule.due_date >= today
        ).order_by(models.InstallmentSchedule.due_date.asc()).limit(5).all()

        upcoming_installments = []
        for inst in upcoming_insts:
            student = inst.purchase.student
            upcoming_installments.append({
                "id": inst.id,
                "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
                "amount": inst.amount - (inst.paid_amount or 0),
                "due_date": inst.due_date.isoformat() if inst.due_date else None,
                "installment_no": inst.installment_no
            })
    except Exception as e:
        upcoming_installments = []

    response_data = {
        "counts": {
            "total_courses":   total_courses,
            "active_courses":  active_courses,
            "total_students":  total_students,
            "active_students": active_students,
            "total_batches":   total_batches,
            "active_batches":  active_batches,
            "total_questions": total_questions,
            "total_materials": total_materials,
            "total_exams":     total_exams,
            "total_chapters":  total_chapters,
            "month_purchases": month_purchases,
        },
        "revenue": {
            "month_revenue": month_revenue,
            "total_revenue": total_revenue,
            "overdue_count": overdue_count,
            "monthly_chart": monthly_revenue,
        },
        "devices": {
            "approved": approved_devices,
            "pending":  pending_devices,
            "rejected": rejected_devices,
        },
        "recent_students": recent_students_list,
        "recent_courses":  recent_courses_list,
        "batch_overview":  batch_overview,
        "upcoming_installments": upcoming_installments,
    }
    
    # Save into cache
    _cache["data"] = response_data
    _cache["timestamp"] = current_time

    return response_data

