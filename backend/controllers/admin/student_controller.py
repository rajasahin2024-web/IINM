"""
Student Controller
Business logic for student CRUD operations.
Routers call these functions — keeping HTTP layer thin.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Student


class StudentController:

    @staticmethod
    def get_all(db: Session):
        return db.query(Student).order_by(Student.id.desc()).all()

    @staticmethod
    def get_by_id(student_id: int, db: Session):
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return student

    @staticmethod
    def create(data: dict, db: Session):
        # Email uniqueness
        if db.query(Student).filter(Student.email == data["email"]).first():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Phone uniqueness
        phone = data.get("phone")
        if phone and db.query(Student).filter(Student.phone == phone).first():
            raise HTTPException(
                status_code=400,
                detail="Phone number already registered with another student"
            )

        student = Student(**data)
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def update(student_id: int, data: dict, db: Session):
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Email uniqueness (excluding self)
        if student.email != data["email"]:
            if db.query(Student).filter(Student.email == data["email"]).first():
                raise HTTPException(status_code=400, detail="Email already taken")

        # Phone uniqueness (excluding self)
        phone = data.get("phone")
        if phone and student.phone != phone:
            existing = db.query(Student).filter(
                Student.phone == phone,
                Student.id != student_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number already registered with another student"
                )

        for key, value in data.items():
            setattr(student, key, value)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def delete(student_id: int, db: Session):
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        db.delete(student)
        db.commit()
        return None
