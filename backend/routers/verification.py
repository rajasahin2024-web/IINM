import re
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
import models
from helpers import rewrite_url

router = APIRouter(prefix="/api/public/verification", tags=["Public Verification"])


def mask_email(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return email
    username, domain = email.split("@", 1)
    if len(username) <= 2:
        masked_user = username[0] + "*"
    else:
        masked_user = username[:2] + ("*" * min(len(username) - 3, 5)) + username[-1]
    return f"{masked_user}@{domain}"


def mask_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    # Keep only digits and leading plus
    cleaned = re.sub(r"[^\d+]", "", phone)
    if len(cleaned) >= 10:
        # Show first 4-5 and last 2 digits
        return cleaned[:5] + "••••" + cleaned[-2:]
    return cleaned


def format_reg_no(student_id: int, created_at: Optional[datetime]) -> str:
    year = created_at.year if created_at else 2026
    return f"IINM-{year}-{student_id:04d}"


def find_student_by_query(query: str, db: Session) -> Optional[models.Student]:
    raw = query.strip()
    if not raw:
        return None

    # 1. Match IINM-YYYY-NNNN or STU-NNNN or numeric ID
    reg_match = re.search(r"IINM-\d{4}-(\d+)", raw, re.IGNORECASE)
    if reg_match:
        stu_id = int(reg_match.group(1))
        student = db.query(models.Student).filter(models.Student.id == stu_id).first()
        if student:
            return student

    stu_match = re.search(r"STU-(\d+)", raw, re.IGNORECASE)
    if stu_match:
        stu_id = int(stu_match.group(1))
        student = db.query(models.Student).filter(models.Student.id == stu_id).first()
        if student:
            return student

    # If raw is just pure numeric ID (e.g. "1", "12")
    if raw.isdigit():
        stu_id = int(raw)
        student = db.query(models.Student).filter(models.Student.id == stu_id).first()
        if student:
            return student

    # 2. Match Email (case insensitive)
    if "@" in raw:
        student = db.query(models.Student).filter(func.lower(models.Student.email) == raw.lower()).first()
        if student:
            return student

    # 3. Match Invoice UUID
    purchase_match = db.query(models.CoursePurchase).filter(models.CoursePurchase.invoice_uuid == raw).first()
    if purchase_match:
        student = db.query(models.Student).filter(models.Student.id == purchase_match.student_id).first()
        if student:
            return student

    # 4. Match Phone Number (fuzzy search on digits)
    digits = re.sub(r"\D", "", raw)
    if len(digits) >= 10:
        last10 = digits[-10:]
        student = (
            db.query(models.Student)
            .filter(
                or_(
                    models.Student.phone.ilike(f"%{last10}%"),
                    models.Student.alternative_phone.ilike(f"%{last10}%"),
                )
            )
            .first()
        )
        if student:
            return student

    # 5. Fallback: exact full name or email prefix match
    student = (
        db.query(models.Student)
        .filter(
            or_(
                func.concat(models.Student.first_name, " ", func.coalesce(models.Student.last_name, "")).ilike(f"%{raw}%"),
                models.Student.email.ilike(f"%{raw}%"),
            )
        )
        .first()
    )
    return student


@router.get("/admission")
def verify_admission(
    query: str = Query(..., min_length=1, description="Student Registration No, ID, Phone, Email, or Invoice UUID"),
    db: Session = Depends(get_db),
):
    student = find_student_by_query(query, db)
    if not student:
        raise HTTPException(
            status_code=404,
            detail="No admission record found matching the provided registration number, email, or mobile number.",
        )

    # Gather purchases & courses
    purchases = (
        db.query(models.CoursePurchase)
        .filter(models.CoursePurchase.student_id == student.id)
        .order_by(models.CoursePurchase.id.desc())
        .all()
    )

    # Gather batch enrollments
    enrollments = (
        db.query(models.BatchEnrollment)
        .filter(models.BatchEnrollment.student_id == student.id)
        .order_by(models.BatchEnrollment.id.desc())
        .all()
    )

    # Index enrollments by course_id for fast linking
    course_to_enrollments: Dict[int, List[models.BatchEnrollment]] = {}
    for en in enrollments:
        if en.batch and en.batch.course_id:
            course_to_enrollments.setdefault(en.batch.course_id, []).append(en)

    courses_admitted: List[Dict[str, Any]] = []
    seen_course_ids = set()

    for p in purchases:
        c = p.course
        if not c:
            continue
        seen_course_ids.add(c.id)
        
        # Link batch for this course if assigned
        assigned_batch_info = None
        course_ens = course_to_enrollments.get(c.id, [])
        if course_ens:
            primary_en = course_ens[0]
            b = primary_en.batch
            if b:
                routines_list = []
                if b.routines:
                    for r in b.routines:
                        time_str = f"{r.start_time or ''} - {r.end_time or ''}".strip(" -")
                        routines_list.append(f"{r.day_of_week} ({time_str})" if time_str else r.day_of_week)

                assigned_batch_info = {
                    "batch_id": b.id,
                    "batch_name": b.name,
                    "mode": b.mode or "Online",
                    "status": b.status or "Ongoing",  # Ongoing, Completed, Upcoming
                    "enrollment_status": primary_en.status or "active",
                    "start_date": b.start_date.isoformat() if b.start_date else None,
                    "end_date": b.end_date.isoformat() if b.end_date else None,
                    "routines": routines_list,
                }

        # Format admission date
        adm_date = p.created_at.strftime("%B %d, %Y") if p.created_at else (
            student.created_at.strftime("%B %d, %Y") if student.created_at else "Verified"
        )

        courses_admitted.append({
            "purchase_id": p.id,
            "invoice_uuid": p.invoice_uuid,
            "course_id": c.id,
            "title": c.title,
            "slug": c.slug,
            "thumbnail_url": rewrite_url(c.thumbnail_url if hasattr(c, "thumbnail_url") else None),
            "duration": c.duration if hasattr(c, "duration") else None,
            "admission_date": adm_date,
            "admission_status": "Active Enrolled" if (p.status == "active" and p.is_active) else (p.status.capitalize() if p.status else "Active"),
            "payment_status": "Completed" if (p.paid_amount and p.paid_amount >= (p.net_fee or 0)) else "Active Admitted",
            "is_current": (p.status == "active" and p.is_active),
            "batch": assigned_batch_info,
        })

    # Also check if any batch enrollment exists for a course that wasn't in purchases (e.g. manual admin batch assignment)
    for en in enrollments:
        if en.batch and en.batch.course:
            c = en.batch.course
            if c.id not in seen_course_ids:
                seen_course_ids.add(c.id)
                b = en.batch
                routines_list = []
                if b.routines:
                    for r in b.routines:
                        time_str = f"{r.start_time or ''} - {r.end_time or ''}".strip(" -")
                        routines_list.append(f"{r.day_of_week} ({time_str})" if time_str else r.day_of_week)

                courses_admitted.append({
                    "purchase_id": None,
                    "invoice_uuid": None,
                    "course_id": c.id,
                    "title": c.title,
                    "slug": c.slug,
                    "thumbnail_url": rewrite_url(c.thumbnail_url if hasattr(c, "thumbnail_url") else None),
                    "duration": c.duration if hasattr(c, "duration") else None,
                    "admission_date": en.join_date.strftime("%B %d, %Y") if en.join_date else "Verified",
                    "admission_status": "Active Enrolled" if en.status == "active" else (en.status.capitalize() if en.status else "Active"),
                    "payment_status": "Active Admitted",
                    "is_current": (en.status == "active"),
                    "batch": {
                        "batch_id": b.id,
                        "batch_name": b.name,
                        "mode": b.mode or "Online",
                        "status": b.status or "Ongoing",
                        "enrollment_status": en.status or "active",
                        "start_date": b.start_date.isoformat() if b.start_date else None,
                        "end_date": b.end_date.isoformat() if b.end_date else None,
                        "routines": routines_list,
                    },
                })

    reg_no = format_reg_no(student.id, student.created_at)
    full_name = f"{student.first_name} {student.last_name or ''}".strip()
    verification_hash = hashlib.sha256(f"IINM:{student.id}:{reg_no}:{student.email}".encode()).hexdigest()[:16].upper()

    return {
        "status": "VERIFIED",
        "verification_code": f"IINM-VRF-{verification_hash[:8]}",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "student": {
            "id": student.id,
            "registration_no": reg_no,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "full_name": full_name,
            "masked_email": mask_email(student.email),
            "masked_phone": mask_phone(student.phone),
            "profile_photo_url": rewrite_url(student.profile_photo_url),
            "date_of_birth": student.date_of_birth.strftime("%B %d, %Y") if student.date_of_birth else None,
            "gender": student.gender,
            "city": student.city,
            "state": student.state,
            "highest_qualification": student.highest_qualification,
            "current_occupation": student.current_occupation,
            "student_category": student.student_category,
            "admission_date": student.created_at.strftime("%B %d, %Y") if student.created_at else None,
            "is_active": student.is_active,
        },
        "courses_count": len(courses_admitted),
        "courses": courses_admitted,
        "institutional_credentials": {
            "institute_name": "Indian Institute of New Media (IINM)",
            "governance": "Autonomous Technical & Digital Media Training Council",
            "certifications": ["ISO 9001:2015 Quality Certified", "MSME Registered (Govt. of India)", "NITI Aayog NGO Darpan Verified"],
            "verification_authority": "Central Academic Records & Admission Verification Wing",
            "official_portal": "https://iinmedu.com/verification",
        },
    }
