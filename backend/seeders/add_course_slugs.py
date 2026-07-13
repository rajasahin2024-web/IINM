import os
import re
from sqlalchemy import text
from database import SessionLocal
from models import Course

def create_slug(title: str) -> str:
    # Lowercase and replace non-alphanumeric characters with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    return slug

def migrate():
    db = SessionLocal()
    try:
        # Add column if not exists
        try:
            db.execute(text("ALTER TABLE courses ADD COLUMN slug VARCHAR(255) UNIQUE"))
            db.execute(text("CREATE INDEX ix_courses_slug ON courses(slug)"))
            db.commit()
            print("Added slug column.")
        except Exception as e:
            db.rollback()
            print(f"Column might already exist: {e}")

        # Populate slugs for existing courses
        courses = db.query(Course).all()
        for course in courses:
            if not course.slug:
                base_slug = create_slug(course.title) if course.title else f"course-{course.id}"
                
                # Check for uniqueness
                slug = base_slug
                counter = 1
                while db.query(Course).filter(Course.slug == slug, Course.id != course.id).first():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                    
                course.slug = slug
                print(f"Set slug for Course {course.id}: {slug}")
        
        db.commit()
        print("Successfully migrated course slugs.")
    except Exception as e:
        db.rollback()
        print(f"Error migrating: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
