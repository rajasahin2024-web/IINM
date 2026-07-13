from routers.auth import require_device
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, noload
from sqlalchemy import text
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel

from database import get_db
import models
from helpers import rewrite_url

router = APIRouter(prefix="/api", tags=["batches"])

# --- PYDANTIC SCHEMAS ---

class InstructorBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    qualification: Optional[str] = None
    experience_years: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_twitter: Optional[str] = None
    social_website: Optional[str] = None
    intro_video_url: Optional[str] = None
    achievements: Optional[str] = None

class InstructorCreate(InstructorBase):
    pass

class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    qualification: Optional[str] = None
    experience_years: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_twitter: Optional[str] = None
    social_website: Optional[str] = None
    intro_video_url: Optional[str] = None
    achievements: Optional[str] = None

class InstructorResponse(InstructorBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class BatchRoutineBase(BaseModel):
    day_of_week: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class BatchRoutineResponse(BatchRoutineBase):
    id: int
    class Config:
        from_attributes = True

class BatchBase(BaseModel):
    name: str
    mode: str = "Online"
    meeting_url: Optional[str] = None
    status: str = "Upcoming"
    course_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_capacity: int = 50
    enable_waitlist: bool = False
    discount_amount: Optional[float] = None
    enable_installments: bool = False

class BatchCreate(BatchBase):
    instructor_ids: List[int] = []
    routines: List[BatchRoutineBase] = []
    content_drip: List["BatchContentDripBase"] = []

class BatchUpdate(BaseModel):
    name: Optional[str] = None
    mode: Optional[str] = None
    meeting_url: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_capacity: Optional[int] = None
    enable_waitlist: Optional[bool] = None
    discount_amount: Optional[float] = None
    enable_installments: Optional[bool] = None
    instructor_ids: Optional[List[int]] = None
    routines: Optional[List[BatchRoutineBase]] = None
    content_drip: Optional[List["BatchContentDripBase"]] = None

class StudentLightResponse(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True

class BatchEnrollmentResponse(BaseModel):
    id: int
    join_date: date
    status: str
    student: StudentLightResponse
    
    class Config:
        from_attributes = True

class EnrollRequest(BaseModel):
    email: str

class BatchContentDripBase(BaseModel):
    chapter_id: Optional[int] = None
    unlock_date: Optional[date] = None

class BatchContentDripResponse(BatchContentDripBase):
    id: int
    batch_id: int
    class Config:
        from_attributes = True

class BatchResponse(BatchBase):
    id: int
    created_at: datetime
    instructors: List[InstructorResponse] = []
    routines: List[BatchRoutineResponse] = []
    enrollments: List[BatchEnrollmentResponse] = []
    content_drip: List[BatchContentDripResponse] = []
    class Config:
        from_attributes = True


# --- BATCH CONTENT DRIP ROUTES ---

class UpdateContentDripRequest(BaseModel):
    drips: List[BatchContentDripBase]

@router.put("/batches/{batch_id}/content-drip", response_model=List[BatchContentDripResponse])
def update_batch_content_drip(batch_id: int, req: UpdateContentDripRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch: raise HTTPException(status_code=404, detail="Batch not found")

    db.query(models.BatchContentDrip).filter(models.BatchContentDrip.batch_id == batch_id).delete()

    new_drips = []
    for d in req.drips:
        if not d.unlock_date:
            continue
        drip = models.BatchContentDrip(
            batch_id=batch_id,
            chapter_id=d.chapter_id,
            unlock_date=d.unlock_date
        )
        db.add(drip)
        new_drips.append(drip)

    db.commit()
    for d in new_drips:
        db.refresh(d)

    return new_drips



# --- INSTRUCTOR ROUTES ---

@router.get("/instructors", response_model=List[InstructorResponse])
def get_instructors(device: str = Depends(require_device), db: Session = Depends(get_db)):
    return (
        db.query(models.Instructor)
        .options(noload(models.Instructor.batches), noload(models.Instructor.courses))
        .order_by(models.Instructor.name)
        .all()
    )

@router.post("/instructors", response_model=InstructorResponse)
def create_instructor(instructor: InstructorCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_inst = models.Instructor(**instructor.dict())
    db.add(db_inst)
    db.commit()
    db.refresh(db_inst)
    return db_inst

@router.put("/instructors/{instructor_id}", response_model=InstructorResponse)
def update_instructor(instructor_id: int, req: InstructorUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_inst = db.query(models.Instructor).filter(models.Instructor.id == instructor_id).first()
    if not db_inst:
        raise HTTPException(status_code=404, detail="Instructor not found")
        
    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_inst, key, value)
        
    db.commit()
    db.refresh(db_inst)
    return db_inst

@router.delete("/instructors/{instructor_id}")
def delete_instructor(instructor_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_inst = db.query(models.Instructor).filter(models.Instructor.id == instructor_id).first()
    if not db_inst:
        raise HTTPException(status_code=404, detail="Instructor not found")
        
    db.delete(db_inst)
    db.commit()
    return {"message": "Instructor deleted successfully"}

# --- BATCH ROUTES ---

@router.get("/courses/{course_id}/batches", response_model=List[BatchResponse])
def get_course_batches(course_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Verify course exists
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    return db.query(models.Batch).filter(models.Batch.course_id == course_id).all()

@router.get("/batches", response_model=List[BatchResponse])
def get_all_batches(device: str = Depends(require_device), db: Session = Depends(get_db)):
    return db.query(models.Batch).all()

@router.post("/batches", response_model=BatchResponse)
def create_batch(req: BatchCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    db_batch = models.Batch(
        name=req.name,
        mode=req.mode,
        meeting_url=req.meeting_url,
        status=req.status,
        course_id=req.course_id,
        start_date=req.start_date,
        end_date=req.end_date,
        max_capacity=req.max_capacity,
        enable_waitlist=req.enable_waitlist,
        discount_amount=req.discount_amount,
        enable_installments=req.enable_installments
    )
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)

    # Add routines
    for r in req.routines:
        db_routine = models.BatchRoutine(
            batch_id=db_batch.id,
            day_of_week=r.day_of_week,
            start_time=r.start_time,
            end_time=r.end_time
        )
        db.add(db_routine)

    # Add instructors
    for i_id in req.instructor_ids:
        db_bi = models.BatchInstructor(batch_id=db_batch.id, instructor_id=i_id)
        db.add(db_bi)
        
    # Add content drip schedules
    if hasattr(req, 'content_drip') and req.content_drip:
        for drip in req.content_drip:
            db_drip = models.BatchContentDrip(
                batch_id=db_batch.id,
                chapter_id=drip.chapter_id,
                material_id=drip.material_id,
                unlock_date=drip.unlock_date
            )
            db.add(db_drip)

    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("/batches/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

@router.put("/batches/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, req: BatchUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    update_data = req.dict(exclude_unset=True)
    
    # Handle simple fields
    for field in ["name", "mode", "meeting_url", "status", "start_date", "end_date", "max_capacity", "enable_waitlist", "discount_amount", "enable_installments"]:
        if field in update_data and update_data[field] is not None:
            setattr(db_batch, field, update_data[field])

    # Handle instructors
    if "instructor_ids" in update_data and update_data["instructor_ids"] is not None:
        db.query(models.BatchInstructor).filter(models.BatchInstructor.batch_id == batch_id).delete()
        for i_id in update_data["instructor_ids"]:
             db.add(models.BatchInstructor(batch_id=batch_id, instructor_id=i_id))

    # Handle routines
    if "routines" in update_data and update_data["routines"] is not None:
        db.query(models.BatchRoutine).filter(models.BatchRoutine.batch_id == batch_id).delete()
        for r in update_data["routines"]:
             db.add(models.BatchRoutine(
                 batch_id=batch_id,
                 day_of_week=r["day_of_week"] if type(r) is dict else r.day_of_week,
                 start_time=r["start_time"] if type(r) is dict else r.start_time,
                 end_time=r["end_time"] if type(r) is dict else r.end_time
             ))

    # Handle content drip
    if "content_drip" in update_data and update_data["content_drip"] is not None:
        db.query(models.BatchContentDrip).filter(models.BatchContentDrip.batch_id == batch_id).delete()
        for d in update_data["content_drip"]:
             db.add(models.BatchContentDrip(
                 batch_id=batch_id,
                 chapter_id=d["chapter_id"] if isinstance(d, dict) else d.chapter_id,
                 material_id=d.get("material_id") if isinstance(d, dict) else getattr(d, "material_id", None),
                 unlock_date=d["unlock_date"] if isinstance(d, dict) else d.unlock_date
             ))

    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    db.delete(db_batch)
    db.commit()
    return {"message": "Batch deleted successfully"}

# --- BATCH ENROLLMENT ROUTES ---

@router.post("/batches/{batch_id}/enroll")
def enroll_student_in_batch(batch_id: int, req: EnrollRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch: raise HTTPException(status_code=404, detail="Batch not found")

    student = db.query(models.Student).filter(models.Student.email == req.email).first()
    if not student: raise HTTPException(status_code=404, detail="Email is not registered. Please register the student first.")

    existing = db.query(models.BatchEnrollment).filter(models.BatchEnrollment.batch_id == batch_id, models.BatchEnrollment.student_id == student.id).first()
    if existing: raise HTTPException(status_code=400, detail="User is already added to this batch.")

    # Check capacity and waitlist
    active_enrollments = db.query(models.BatchEnrollment).filter(models.BatchEnrollment.batch_id == batch_id, models.BatchEnrollment.status == "active").count()
    status = "active"
    if active_enrollments >= batch.max_capacity:
        if batch.enable_waitlist:
            status = "waitlisted"
        else:
            raise HTTPException(status_code=400, detail="Batch capacity is full and waitlist is not enabled.")

    enrollment = models.BatchEnrollment(batch_id=batch_id, student_id=student.id, status=status)
    db.add(enrollment)
    db.commit()
    return {"message": "Student successfully enrolled." if status == "active" else "Batch full. Student added to waitlist."}
@router.post("/batches/{batch_id}/unenroll/{student_id}")
def unenroll_student_from_batch(batch_id: int, student_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    enrollment = db.query(models.BatchEnrollment).filter(models.BatchEnrollment.batch_id == batch_id, models.BatchEnrollment.student_id == student_id).first()
    if not enrollment: raise HTTPException(status_code=404, detail="Enrollment not found.")
    
    was_active = (enrollment.status == "active")
    db.delete(enrollment)
    db.commit()

    # If an active student was removed, promote the oldest waitlisted student
    if was_active:
        waitlisted = db.query(models.BatchEnrollment).filter(
            models.BatchEnrollment.batch_id == batch_id, 
            models.BatchEnrollment.status == "waitlisted"
        ).order_by(models.BatchEnrollment.created_at.asc()).first()
        
        if waitlisted:
            waitlisted.status = "active"
            db.commit()

    return {"message": "Student successfully removed from batch."}

