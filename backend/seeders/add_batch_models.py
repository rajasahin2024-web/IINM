import os

MODELS = """
# ==========================================
# BATCH MANAGEMENT & ADVANCED SCHEDULING
# ==========================================

class Instructor(Base):
    __tablename__ = "instructors"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    email      = Column(String(255), nullable=True)
    phone      = Column(String(50), nullable=True)
    bio        = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batches = relationship("Batch", secondary="batch_instructors", back_populates="instructors")

class BatchInstructor(Base):
    __tablename__ = "batch_instructors"
    batch_id      = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="CASCADE"), primary_key=True)

class Batch(Base):
    __tablename__ = "batches"
    id                  = Column(Integer, primary_key=True, index=True)
    course_id           = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    
    name                = Column(String(255), nullable=False) # e.g. "Morning Batch 01"
    mode                = Column(String(50), default="Online") # Online, Offline, Hybrid
    meeting_url         = Column(String(500), nullable=True) # Zoom/Meet
    status              = Column(String(50), default="Upcoming") # Upcoming, Ongoing, Completed, Cancelled
    
    start_date          = Column(Date, nullable=True)
    end_date            = Column(Date, nullable=True)
    
    max_capacity        = Column(Integer, default=50)
    enable_waitlist     = Column(Boolean, default=False)
    
    discount_amount     = Column(Float, nullable=True) # Batch specific discount
    enable_installments = Column(Boolean, default=False)
    
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    course       = relationship("Course", backref="batches")
    instructors  = relationship("Instructor", secondary="batch_instructors", back_populates="batches")
    routines     = relationship("BatchRoutine", back_populates="batch", cascade="all, delete-orphan")
    content_drip = relationship("BatchContentDrip", back_populates="batch", cascade="all, delete-orphan")


class BatchRoutine(Base):
    __tablename__ = "batch_routines"
    id          = Column(Integer, primary_key=True, index=True)
    batch_id    = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"))
    day_of_week = Column(String(20), nullable=False) # e.g. "Monday", "Tuesday"
    start_time  = Column(String(20), nullable=True)  # Format: "10:00 AM" or Time
    end_time    = Column(String(20), nullable=True)
    
    batch = relationship("Batch", back_populates="routines")

class BatchContentDrip(Base):
    __tablename__ = "batch_content_drips"
    id            = Column(Integer, primary_key=True, index=True)
    batch_id      = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"))
    chapter_id    = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"))
    unlock_date   = Column(Date, nullable=False)
    
    batch   = relationship("Batch", back_populates="content_drip")
    chapter = relationship("Chapter")
"""

def main():
    filepath = "backend/models.py"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "class Batch(" in content:
        print("Models already exist!")
        return

    with open(filepath, "a", encoding="utf-8") as f:
        f.write("\n" + MODELS)
    
    print("Successfully added batch models to models.py")

if __name__ == "__main__":
    main()
