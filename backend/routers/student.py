from routers.auth import require_device
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
from database import get_db
from models import Student

router = APIRouter(prefix="/api/students", tags=["Students"])

class StudentCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    is_active: bool = True

    # Personal Information
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    profile_photo_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None

    # Educational Qualification
    highest_qualification: Optional[str] = None
    tenth_board: Optional[str] = None
    tenth_year: Optional[str] = None
    tenth_percentage: Optional[str] = None
    twelfth_board: Optional[str] = None
    twelfth_year: Optional[str] = None
    twelfth_percentage: Optional[str] = None
    twelfth_stream: Optional[str] = None
    graduation_degree: Optional[str] = None
    graduation_university: Optional[str] = None
    graduation_year: Optional[str] = None
    graduation_cgpa: Optional[str] = None
    current_occupation: Optional[str] = None

    # Identity & Documents
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    student_id_url: Optional[str] = None

    # Professional Info
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    work_experience: Optional[str] = None
    linkedin_url: Optional[str] = None

    # LMS Specific
    source: Optional[str] = None
    referral_code: Optional[str] = None
    preferred_language: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class StudentUpdate(StudentCreate):
    pass


@router.get("/")
def get_students(device: str = Depends(require_device), db: Session = Depends(get_db)):
    return db.query(Student).order_by(Student.id.desc()).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Email uniqueness
    db_student = db.query(Student).filter(Student.email == student.email).first()
    if db_student:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Phone uniqueness
    if student.phone:
        existing_phone = db.query(Student).filter(Student.phone == student.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered with another student")

    new_student = Student(**student.model_dump())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.put("/{student_id}")
def update_student(student_id: int, student: StudentUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Email uniqueness (excluding current student)
    if db_student.email != student.email:
        existing = db.query(Student).filter(Student.email == student.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")

    # Phone uniqueness (excluding current student)
    if student.phone and db_student.phone != student.phone:
        existing_phone = db.query(Student).filter(
            Student.phone == student.phone,
            Student.id != student_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered with another student")

    for key, value in student.model_dump().items():
        setattr(db_student, key, value)

    db.commit()
    db.refresh(db_student)
    return db_student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    db.delete(db_student)
    db.commit()
    return None
