from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
import re
import json
from pydantic import BaseModel

from database import get_db
import models
from routers.auth import require_device
from helpers import rewrite_url

router = APIRouter(prefix="/api", tags=["courses"])

# ─── PYDANTIC SCHEMAS ──────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_active: bool = True
    desktop_banner_ratio: Optional[str] = None
    mobile_banner_ratio: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class SubCategoryBase(BaseModel):
    name: str
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_active: bool = True

class SubCategoryCreate(SubCategoryBase):
    category_id: int

class SubCategoryUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_active: Optional[bool] = None

class SubCategoryResponse(SubCategoryBase):
    id: int
    category_id: int
    created_at: datetime
    class Config:
        from_attributes = True


class SubjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    price: Optional[float] = 0.0
    discounted_price: Optional[float] = None
    price_usd: Optional[float] = None
    discounted_price_usd: Optional[float] = None
    validity_days: Optional[int] = 365
    is_active: Optional[bool] = True
    is_purchasable: Optional[bool] = True
    display_order: Optional[int] = 0

class SubjectCreate(SubjectBase):
    subcategory_id: int

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    subcategory_id: Optional[int] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    price: Optional[float] = None
    discounted_price: Optional[float] = None
    price_usd: Optional[float] = None
    discounted_price_usd: Optional[float] = None
    validity_days: Optional[int] = None
    is_active: Optional[bool] = None
    is_purchasable: Optional[bool] = None
    display_order: Optional[int] = None

class SubjectResponse(SubjectBase):
    id: int
    subcategory_id: int
    created_at: datetime
    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    validity_days: Optional[int] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    price_usd: Optional[float] = None
    discount_price_usd: Optional[float] = None
    is_free: bool = False
    currency: str = "INR"
    min_payment_type: Optional[str] = None   # 'percentage' | 'amount' | None
    min_payment_value: Optional[float] = None
    thumbnail_url: Optional[str] = None
    promo_video_url: Optional[str] = None
    status: str = "DRAFT"
    is_featured: bool = False
    show_on_homepage: bool = False
    show_instructor_publicly: bool = True
    instructor_name: Optional[str] = None
    skill_level: Optional[str] = None
    prerequisites: Optional[str] = None
    what_you_will_learn: Optional[str] = None
    target_audience: Optional[str] = None
    has_certificate: bool = False
    certificate_image_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    is_new: bool = False
    upload_syllabus: Optional[str] = None

class CourseCreate(CourseBase):
    subject_ids: List[int] = []
    chapter_ids: List[int] = []

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_ids: Optional[List[int]] = None
    chapter_ids: Optional[List[int]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    validity_days: Optional[int] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    price_usd: Optional[float] = None
    discount_price_usd: Optional[float] = None
    is_free: Optional[bool] = None
    currency: Optional[str] = None
    min_payment_type: Optional[str] = None
    min_payment_value: Optional[float] = None
    thumbnail_url: Optional[str] = None
    promo_video_url: Optional[str] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    show_on_homepage: Optional[bool] = None
    show_instructor_publicly: Optional[bool] = None
    instructor_name: Optional[str] = None
    skill_level: Optional[str] = None
    prerequisites: Optional[str] = None
    what_you_will_learn: Optional[str] = None
    target_audience: Optional[str] = None
    has_certificate: Optional[bool] = None
    certificate_image_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    is_new: Optional[bool] = None
    upload_syllabus: Optional[str] = None

class InstructorSimpleResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True

class CourseResponse(CourseBase):
    id: int
    created_at: datetime
    subjects: List[SubjectResponse] = []
    # Can't directly include ChapterResponse because of circular/forward ref easily, so we just return chapter_ids mapping
    chapter_ids: List[int] = []
    instructors: List[InstructorSimpleResponse] = []

    @classmethod
    def from_orm_model(cls, obj):
        dict_obj = obj.__dict__.copy()
        dict_obj["subjects"] = getattr(obj, "subjects", [])
        dict_obj["chapter_ids"] = [ch.id for ch in getattr(obj, "chapters", [])]
        dict_obj["instructors"] = [{"id": i.id, "name": i.name, "phone": i.phone} for i in getattr(obj, "instructors", [])]
        return cls(**dict_obj)

    class Config:
        from_attributes = True


class ChapterBase(BaseModel):
    title: str
    content: Optional[str] = None
    is_active: bool = True

class ChapterCreate(ChapterBase):
    subject_id: int

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class CourseMaterialLightResponse(BaseModel):
    id: int
    title: str
    file_type: str
    class Config:
        from_attributes = True

class ChapterResponse(ChapterBase):
    id: int
    subject_id: int
    order_position: int = 0
    is_active: bool
    created_at: datetime
    materials: List[CourseMaterialLightResponse] = []
    
    @classmethod
    def from_orm_model(cls, obj):
        dict_obj = obj.__dict__.copy()
        dict_obj["materials"] = [{"id": m.id, "title": m.title, "file_type": m.file_type} for m in getattr(obj, "materials", [])]
        return cls(**dict_obj)
        
    class Config:
        from_attributes = True


# ─── ROUTES ──────────────────────────────────────────

# 1. Categories
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(search: Optional[str] = None, device: str = Depends(require_device), db: Session = Depends(get_db)):
    query = db.query(models.Category)
    if search:
        query = query.filter(models.Category.name.ilike(f"%{search}%"))
    return query.order_by(models.Category.id.desc()).all()

@router.post("/categories", response_model=CategoryResponse)
def create_category(category: CategoryCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_cat = models.Category(
        name=category.name,
        icon_url=category.icon_url,
        banner_url=category.banner_url,
        is_active=category.is_active,
        desktop_banner_ratio=category.desktop_banner_ratio,
        mobile_banner_ratio=category.mobile_banner_ratio
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.put("/categories/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: int, category: CategoryUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db_cat.name = category.name
    db_cat.icon_url = category.icon_url
    db_cat.banner_url = category.banner_url
    db_cat.is_active = category.is_active
    db_cat.desktop_banner_ratio = category.desktop_banner_ratio
    db_cat.mobile_banner_ratio = category.mobile_banner_ratio
    
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    try:
        # Unlink questions to avoid foreign key violations via subcategories cascade
        db.execute(text("UPDATE questions SET category_id = NULL WHERE category_id = :id"), {"id": cat_id})
        db.execute(text("UPDATE questions SET subcategory_id = NULL WHERE subcategory_id IN (SELECT id FROM subcategories WHERE category_id = :id)"), {"id": cat_id})
        
        db.delete(db_cat)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "Deleted"}


# 2. SubCategories
@router.get("/subcategories", response_model=List[SubCategoryResponse])
def get_all_subcategories(search: Optional[str] = None, category_id: Optional[int] = Query(None), device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Can fetch all across all categories, with optional search and category filter
    query = db.query(models.SubCategory)
    if category_id:
        query = query.filter(models.SubCategory.category_id == category_id)
    if search:
        query = query.filter(models.SubCategory.name.ilike(f"%{search}%"))
    return query.order_by(models.SubCategory.id.desc()).all()

@router.get("/categories/{category_id}/subcategories", response_model=List[SubCategoryResponse])
def get_subcategories(category_id: int, search: Optional[str] = None, device: str = Depends(require_device), db: Session = Depends(get_db)):
    query = db.query(models.SubCategory).filter(models.SubCategory.category_id == category_id)
    if search:
        query = query.filter(models.SubCategory.name.ilike(f"%{search}%"))
    return query.order_by(models.SubCategory.id.desc()).all()

@router.post("/categories/{category_id}/subcategories", response_model=SubCategoryResponse)
def create_subcategory(category_id: int, subcat: SubCategoryCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_subcat = models.SubCategory(
        name=subcat.name, 
        category_id=category_id,
        icon_url=subcat.icon_url,
        banner_url=subcat.banner_url,
        is_active=subcat.is_active
    )
    db.add(db_subcat)
    db.commit()
    db.refresh(db_subcat)
    return db_subcat

@router.post("/subcategories", response_model=SubCategoryResponse)
def create_subcategory_flat(subcat: SubCategoryCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Flat endpoint: create a subcategory by passing category_id in the body."""
    db_subcat = models.SubCategory(
        name=subcat.name,
        category_id=subcat.category_id,
        icon_url=subcat.icon_url,
        banner_url=subcat.banner_url,
        is_active=subcat.is_active
    )
    db.add(db_subcat)
    db.commit()
    db.refresh(db_subcat)
    return db_subcat

@router.put("/subcategories/{subcat_id}", response_model=SubCategoryResponse)
def update_subcategory(subcat_id: int, subcat: SubCategoryUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_subcat = db.query(models.SubCategory).filter(models.SubCategory.id == subcat_id).first()
    if not db_subcat:
        raise HTTPException(status_code=404, detail="SubCategory not found")
    if subcat.name is not None:
        db_subcat.name = subcat.name
    if subcat.category_id is not None:
        db_subcat.category_id = subcat.category_id
    if subcat.icon_url is not None:
        db_subcat.icon_url = subcat.icon_url
    if subcat.banner_url is not None:
        db_subcat.banner_url = subcat.banner_url
    if subcat.is_active is not None:
        db_subcat.is_active = subcat.is_active
    db.commit()
    db.refresh(db_subcat)
    return db_subcat

@router.delete("/subcategories/{subcat_id}")
def delete_subcategory(subcat_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_subcat = db.query(models.SubCategory).filter(models.SubCategory.id == subcat_id).first()
    if not db_subcat:
        raise HTTPException(status_code=404, detail="SubCategory not found")
        
    try:
        # Unlink questions to avoid foreign key violations
        db.execute(text("UPDATE questions SET subcategory_id = NULL WHERE subcategory_id = :id"), {"id": subcat_id})
        
        db.delete(db_subcat)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "Deleted"}


# 3. Subjects
@router.get("/subjects", response_model=List[SubjectResponse])
def get_all_subjects(search: Optional[str] = None, subcategory_id: Optional[int] = Query(None), device: str = Depends(require_device), db: Session = Depends(get_db)):
    query = db.query(models.Subject)
    if subcategory_id:
        query = query.filter(models.Subject.subcategory_id == subcategory_id)
    if search:
        query = query.filter(models.Subject.name.ilike(f"%{search}%"))
    return query.order_by(models.Subject.id.desc()).all()

@router.get("/subcategories/{subcategory_id}/subjects", response_model=List[SubjectResponse])
def get_subjects(subcategory_id: int, search: Optional[str] = None, device: str = Depends(require_device), db: Session = Depends(get_db)):
    query = db.query(models.Subject).filter(models.Subject.subcategory_id == subcategory_id)
    if search:
        query = query.filter(models.Subject.name.ilike(f"%{search}%"))
    return query.order_by(models.Subject.id.desc()).all()

@router.post("/subcategories/{subcategory_id}/subjects", response_model=SubjectResponse)
def create_subject(subcategory_id: int, subject: SubjectCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_subject = models.Subject(
        name=subject.name,
        subcategory_id=subcategory_id,
        description=subject.description,
        thumbnail_url=subject.thumbnail_url,
        price=subject.price,
        discounted_price=subject.discounted_price,
        validity_days=subject.validity_days,
        is_active=subject.is_active,
        is_purchasable=subject.is_purchasable,
        display_order=subject.display_order,
    )
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.put("/subjects/{sub_id}", response_model=SubjectResponse)
def update_subject(sub_id: int, subject: SubjectUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_subject = db.query(models.Subject).filter(models.Subject.id == sub_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.name is not None:
        db_subject.name = subject.name
    if subject.subcategory_id is not None:
        db_subject.subcategory_id = subject.subcategory_id
    if subject.description is not None:
        db_subject.description = subject.description
    if subject.thumbnail_url is not None:
        db_subject.thumbnail_url = subject.thumbnail_url
    if subject.price is not None:
        db_subject.price = subject.price
    if subject.discounted_price is not None:
        db_subject.discounted_price = subject.discounted_price
    if subject.validity_days is not None:
        db_subject.validity_days = subject.validity_days
    if subject.is_active is not None:
        db_subject.is_active = subject.is_active
    if subject.is_purchasable is not None:
        db_subject.is_purchasable = subject.is_purchasable
    if subject.display_order is not None:
        db_subject.display_order = subject.display_order
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.delete("/subjects/{sub_id}")
def delete_subject(sub_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_subject = db.query(models.Subject).filter(models.Subject.id == sub_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(db_subject)
    db.commit()
    return {"message": "Deleted"}


@router.delete("/subjects/{sub_id}/force")
def force_delete_subject(sub_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Force-delete a subject and all its chapters, materials, and live classes."""
    db_subject = db.query(models.Subject).filter(models.Subject.id == sub_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    chapters = db.query(models.Chapter).filter(models.Chapter.subject_id == sub_id).all()
    for ch in chapters:
        db.execute(text("DELETE FROM topic_materials WHERE topic_id = :cid"), {"cid": ch.id})
        db.query(models.ChapterLiveClass).filter(models.ChapterLiveClass.chapter_id == ch.id).delete()
        db.execute(text("DELETE FROM course_chapters WHERE chapter_id = :cid"), {"cid": ch.id})
    db.query(models.Chapter).filter(models.Chapter.subject_id == sub_id).delete()
    db.execute(text("DELETE FROM course_subjects WHERE subject_id = :sid"), {"sid": sub_id})
    db.delete(db_subject)
    db.commit()
    return {"message": "Subject and all related chapters, materials, and live classes deleted"}


@router.get("/public/instructors")
def get_public_instructors(db: Session = Depends(get_db)):
    """Returns all active instructors publicly without auth."""
    instructors = db.query(models.Instructor).filter(models.Instructor.is_active == True).order_by(models.Instructor.name).all()
    return [{"id": i.id, "name": i.name} for i in instructors]

# 4. Courses — PUBLIC endpoint (no auth required, for homepage catalog)
@router.get("/public/courses")
def get_public_courses(search: Optional[str] = None, db: Session = Depends(get_db)):
    """Returns all PUBLISHED courses publicly without auth."""
    query = db.query(models.Course).options(joinedload(models.Course.instructors)).filter(models.Course.status == "PUBLISHED")
    if search:
        query = query.filter(models.Course.title.ilike(f"%{search}%"))
    courses = query.order_by(models.Course.is_featured.desc(), models.Course.id.desc()).all()
    result = []
    for c in courses:
        result.append({
            "id": c.id,
            "slug": c.slug,
            "title": c.title,
            "description": c.description,
            "thumbnail_url": rewrite_url(c.thumbnail_url),
            "promo_video_url": rewrite_url(c.promo_video_url),
            "price": c.price,
            "discount_price": c.discount_price,
            "price_usd": c.price_usd,
            "discount_price_usd": c.discount_price_usd,
            "is_free": c.is_free,
            "currency": c.currency,
            "min_payment_value": c.min_payment_value,
            "status": c.status,
            "is_featured": c.is_featured,
            "show_on_homepage": c.show_on_homepage,
            "is_new": c.is_new,
            "instructor_name": c.instructor_name,
            "has_certificate": c.has_certificate,
            "validity_days": c.validity_days,
            "upload_syllabus": rewrite_url(c.upload_syllabus),
            "instructors": [{"id": i.id, "name": i.name} for i in getattr(c, "instructors", [])],
        })
    return result

@router.get("/public/courses/{slug}")
def get_public_course_details(slug: str, db: Session = Depends(get_db)):
    c = db.query(models.Course).filter(models.Course.slug == slug, models.Course.status == "PUBLISHED").first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Get chapters ordered by position
    chapters_data = []
    for ch in sorted(c.chapters, key=lambda x: x.order_position):
        if not ch.is_active:
            continue
        materials_data = []
        for mat in ch.materials:
            materials_data.append({
                "id": mat.id,
                "title": mat.title,
                "file_type": mat.file_type
                # Explicitly EXCLUDING file_url, youtube_url, etc.
            })
        live_classes_data = [
            {
                "id": lc.id,
                "title": lc.title
            }
            for lc in getattr(ch, "live_classes", [])
        ]
        chapters_data.append({
            "id": ch.id,
            "title": ch.title,
            "subject": {"id": ch.subject.id, "name": ch.subject.name} if ch.subject else None,
            "materials": materials_data,
            "live_classes": live_classes_data
        })

    # Fetch all active instructors (prioritizing assigned course instructors)
    active_instructors = db.query(models.Instructor).filter(models.Instructor.is_active == True).order_by(models.Instructor.id.asc()).all()
    assigned_ids = {inst.id for inst in c.instructors if inst.is_active}
    combined_instructors = [inst for inst in c.instructors if inst.is_active] + [inst for inst in active_instructors if inst.id not in assigned_ids]

    instructors_data = [
        {
            "id": inst.id,
            "name": inst.name,
            "bio": inst.bio,
            "avatar_url": rewrite_url(inst.avatar_url),
            "email": inst.email,
            "qualification": inst.qualification,
            "experience_years": inst.experience_years,
            "designation": inst.designation,
            "specialization": inst.specialization,
            "teaching_hours": inst.teaching_hours,
            "rating": inst.rating,
            "social_linkedin": inst.social_linkedin,
            "social_twitter": inst.social_twitter,
            "social_website": inst.social_website,
            "intro_video_url": rewrite_url(inst.intro_video_url),
            "achievements": inst.achievements,
        }
        for inst in combined_instructors
    ]

    return {
        "id": c.id,
        "slug": c.slug,
        "title": c.title,
        "description": c.description,
        "thumbnail_url": rewrite_url(c.thumbnail_url),
        "promo_video_url": rewrite_url(c.promo_video_url),
        "price": c.price,
        "discount_price": c.discount_price,
        "price_usd": c.price_usd,
        "discount_price_usd": c.discount_price_usd,
        "is_free": c.is_free,
        "currency": c.currency,
        "min_payment_value": c.min_payment_value,
        "status": c.status,
        "is_featured": c.is_featured,
        "show_on_homepage": c.show_on_homepage,
        "is_new": c.is_new,
        "instructor_name": c.instructor_name,
        "has_certificate": c.has_certificate,
        "validity_days": c.validity_days,
        "prerequisites": c.prerequisites,
        "what_you_will_learn": c.what_you_will_learn,
        "target_audience": c.target_audience,
        "upload_syllabus": rewrite_url(c.upload_syllabus),
        "show_instructor_publicly": c.show_instructor_publicly if c.show_instructor_publicly is not None else True,
        "chapters": chapters_data,
        "instructors": instructors_data,
    }


# ── COURSE EXTENDED CONTENT SCHEMAS & DEFAULTS ─────────────────

class BrochureLeadCreate(BaseModel):
    course_id: Optional[int] = None
    name: str
    email: str
    phone: Optional[str] = None
    source: Optional[str] = "brochure_download"

class CourseExtendedUpdate(BaseModel):
    hero_badges_json: Optional[str] = None
    hiring_companies_json: Optional[str] = None
    market_impact_json: Optional[str] = None
    who_is_for_json: Optional[str] = None
    career_outcomes_json: Optional[str] = None
    projects_json: Optional[str] = None
    comparison_matrix_json: Optional[str] = None
    certificates_json: Optional[str] = None
    video_testimonials_json: Optional[str] = None
    faqs_json: Optional[str] = None


def get_default_course_extended_data(course_title: str):
    return {
        "hero_badges": [
            "Live Cohorts & 1:1 Mentorship",
            "76% Enterprise AI Adoption",
            "Agentic AI & Capstone Projects",
            "Industry Certificate Included"
        ],
        "hiring_companies": [
            {"name": "Google", "logo": "/company-google.svg"},
            {"name": "Microsoft", "logo": "/company-microsoft.svg"},
            {"name": "Amazon", "logo": "/company-amazon.svg"},
            {"name": "Meta", "logo": "/company-meta.svg"},
            {"name": "Nvidia", "logo": "/company-nvidia.svg"},
            {"name": "OpenAI", "logo": "/company-openai.svg"}
        ],
        "market_impact": {
            "quote": "Generative AI is expected to transform 38 million organized-sector jobs in India by 2030 , primarily by redesigning tasks and boosting productivity.",
            "quote_author": "KEN RESEARCH",
            "stat_main": "76%",
            "stat_label": "76% of business leaders are willing to pay higher compensation for professionals with AI skills.",
            "cards": [
                {"title": "Professionals Demand", "value": "Data & AI", "desc": "The demand for professionals who can work at the intersection of data, engineering, and AI is growing faster than ever."},
                {"title": "NASSCOM Forecast", "value": "1.5 Million+", "desc": "According to NASSCOM, India alone is expected to have over 1.5 million data and AI job openings by 2026."}
            ]
        },
        "who_is_for": [
            {
                "title": "Software & Full-Stack Engineers",
                "experience": "1+ Years Exp",
                "desc": "Looking to master LLMs, RAG, CrewAI, AutoGen, and build production-grade autonomous agentic applications.",
                "icon": "Code"
            },
            {
                "title": "Tech Leads & Solution Architects",
                "experience": "3+ Years Exp",
                "desc": "Designed to lead enterprise AI transformations, design multi-agent workflows, and deploy scalable AI pipelines.",
                "icon": "Layers"
            },
            {
                "title": "Freshers & AI Enthusiasts",
                "experience": "Foundational Coding",
                "desc": "Eager to fast-track career growth with high-demand AI skills, real-world portfolio capstones, and top placement support.",
                "icon": "GraduationCap"
            }
        ],
        "career_outcomes": {
            "avg_salary": "21.5 LPA",
            "avg_hike": "118%",
            "top_package": "52 LPA",
            "placements": [
                {
                    "name": "Abhishek Sharma",
                    "role_from": "SDE-1 at Local Firm",
                    "role_to": "GenAI Engineer at Top Tech",
                    "hike": "135% Hike",
                    "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
                    "linkedin": "https://linkedin.com"
                },
                {
                    "name": "Priya Verma",
                    "role_from": "Backend Dev at Enterprise",
                    "role_to": "AI Agent Architect",
                    "hike": "112% Hike",
                    "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
                    "linkedin": "https://linkedin.com"
                },
                {
                    "name": "Rohan Mehta",
                    "role_from": "Data Analyst",
                    "role_to": "LLM Solutions Engineer",
                    "hike": "140% Hike",
                    "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
                    "linkedin": "https://linkedin.com"
                }
            ]
        },
        "projects": [
            {
                "id": "p1",
                "title": "Autonomous Multi-Agent Software Developer",
                "category": "Agentic AI Framework",
                "description": "Build an end-to-end multi-agent coding assistant using CrewAI and AutoGen that parses user requirements, writes frontend/backend code, runs test suites, and fixes bugs autonomously.",
                "tags": ["CrewAI", "AutoGen", "OpenAI GPT-4o", "LangChain", "Python"],
                "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                "highlights": [
                    "Multi-agent task decomposition & planning",
                    "Automated code execution in sandboxed Docker",
                    "Self-correcting feedback loops"
                ]
            },
            {
                "id": "p2",
                "title": "Enterprise RAG Search & Knowledge Engine",
                "category": "GenAI & Vector DB",
                "description": "Engineered a production-ready Retrieval-Augmented Generation platform capable of indexing millions of PDF documents with hybrid search, re-ranking, and low-latency response generation.",
                "tags": ["LlamaIndex", "Pinecone", "FastAPI", "vLLM", "Embeddings"],
                "image_url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
                "highlights": [
                    "Hybrid BM25 + Vector Semantic Search",
                    "Cohere Re-ranker integration",
                    "Sub-second response SLA with streaming"
                ]
            },
            {
                "id": "p3",
                "title": "Real-Time AI Voice & Multimodal Customer Agent",
                "category": "Multimodal & Voice AI",
                "description": "Constructed an ultra-low latency voice conversational agent using WebRTC, OpenAI Whisper speech-to-text, Claude 3.5 Sonnet tool-use, and ElevenLabs voice synthesis.",
                "tags": ["Whisper", "ElevenLabs", "Claude 3.5 Sonnet", "WebRTC", "Function Calling"],
                "image_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
                "highlights": [
                    "Sub-500ms voice latency pipeline",
                    "Dynamic CRM tool function calling",
                    "Multilingual speech support"
                ]
            }
        ],
        "comparison_matrix": [
            {"feature": "Live Class", "iinm": True, "others": False, "others_note": "(Mostly recorded)"},
            {"feature": "24×7 WhatsApp Doubt Clearing Portal", "iinm": True, "others": False},
            {"feature": "AI Doubt Clearing Mentor", "iinm": True, "others": False},
            {"feature": "IINM Cloud [Free Domain + Hosting] 6 Months", "iinm": True, "others": False},
            {"feature": "Certifications", "iinm": True, "others": "limited", "others_note": "Limited"},
            {"feature": "Freelancing Opportunities", "iinm": True, "others": False},
            {"feature": "Lifetime Course Access", "iinm": True, "others": False, "others_note": "(Limited access)"},
            {"feature": "New Tool Learning & Upgrades", "iinm": True, "others": False}
        ],
        "certificates": {
            "eyebrow": "— Certifications —",
            "title": "Industry-Recognized GenAI",
            "title_blue": "Certifications",
            "items": [
                {"image_url": "/certificate-appreciation.png", "alt": "Certificate of Appreciation - GenAI Specialization"},
                {"image_url": "/certificate-partnership.png", "alt": "Certificate of Partnership - Nasscom FutureSkills"}
            ]
        },
        "video_testimonials": [
            {
                "id": "vt1",
                "name": "Aman Srivastava",
                "role": "Lead AI Engineer",
                "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "thumbnail": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
                "quote": "The hands-on multi-agent capstones helped me transition into a high-paying GenAI role within 3 months!"
            },
            {
                "id": "vt2",
                "name": "Sneha Roy",
                "role": "Senior Software Engineer",
                "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "thumbnail": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
                "quote": "Deep diving into RAG, vector databases, and CrewAI gave me the confidence to crack senior AI interviews."
            }
        ],
        "faqs": [
            {
                "question": "What are the prerequisites for this course?",
                "answer": "Basic proficiency in programming (Python, JavaScript, or any language) and basic understanding of data structures is recommended. No prior ML/AI background is required as we cover foundations to advanced topics."
            },
            {
                "question": "How are the live classes conducted?",
                "answer": "Classes are held live interactively on weekends with recorded sessions available immediately after each lecture on your dashboard."
            },
            {
                "question": "Will I get 1:1 mentorship and placement assistance?",
                "answer": "Yes! You get assigned a dedicated mentor for code reviews, project guidance, resume building, and 1:1 mock interviews with placement referrals."
            },
            {
                "question": "How do I download the full course curriculum brochure?",
                "answer": "Click the 'Download Brochure' button on the hero section or top banner, enter your details, and the full PDF syllabus will open directly for download."
            }
        ]
    }


@router.get("/public/courses/{slug}/extended")
def get_public_course_extended_details(slug: str, db: Session = Depends(get_db)):
    c = db.query(models.Course).filter(models.Course.slug == slug, models.Course.status == "PUBLISHED").first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")

    base_data = get_public_course_details(slug, db)
    defaults = get_default_course_extended_data(c.title)

    ext = c.extended_content

    def safe_parse(json_str, fallback):
        if not json_str:
            return fallback
        try:
            return json.loads(json_str)
        except Exception:
            return fallback

    extended_data = {
        "hero_badges": safe_parse(ext.hero_badges_json if ext else None, defaults["hero_badges"]),
        "hiring_companies": safe_parse(ext.hiring_companies_json if ext else None, defaults["hiring_companies"]),
        "market_impact": safe_parse(ext.market_impact_json if ext else None, defaults["market_impact"]),
        "who_is_for": safe_parse(ext.who_is_for_json if ext else None, defaults["who_is_for"]),
        "career_outcomes": safe_parse(ext.career_outcomes_json if ext else None, defaults["career_outcomes"]),
        "projects": safe_parse(ext.projects_json if ext else None, defaults["projects"]),
        "comparison_matrix": safe_parse(ext.comparison_matrix_json if ext else None, defaults["comparison_matrix"]),
        "certificates": safe_parse(ext.certificates_json if ext else None, defaults["certificates"]),
        "video_testimonials": safe_parse(ext.video_testimonials_json if ext else None, defaults["video_testimonials"]),
        "faqs": safe_parse(ext.faqs_json if ext else None, defaults["faqs"]),
    }

    base_data["extended"] = extended_data
    return base_data


@router.put("/courses/{course_id}/extended")
def update_course_extended_details(
    course_id: int,
    payload: CourseExtendedUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")

    ext = db.query(models.CourseExtendedContent).filter(models.CourseExtendedContent.course_id == course_id).first()
    if not ext:
        ext = models.CourseExtendedContent(course_id=course_id)
        db.add(ext)

    if payload.hero_badges_json is not None:
        ext.hero_badges_json = payload.hero_badges_json
    if payload.hiring_companies_json is not None:
        ext.hiring_companies_json = payload.hiring_companies_json
    if payload.market_impact_json is not None:
        ext.market_impact_json = payload.market_impact_json
    if payload.who_is_for_json is not None:
        ext.who_is_for_json = payload.who_is_for_json
    if payload.career_outcomes_json is not None:
        ext.career_outcomes_json = payload.career_outcomes_json
    if payload.projects_json is not None:
        ext.projects_json = payload.projects_json
    if payload.comparison_matrix_json is not None:
        ext.comparison_matrix_json = payload.comparison_matrix_json
    if payload.certificates_json is not None:
        ext.certificates_json = payload.certificates_json
    if payload.video_testimonials_json is not None:
        ext.video_testimonials_json = payload.video_testimonials_json
    if payload.faqs_json is not None:
        ext.faqs_json = payload.faqs_json

    db.commit()
    db.refresh(ext)
    return {"status": "success", "message": "Course extended content updated successfully"}


@router.post("/public/courses/brochure-lead")
def submit_brochure_lead(payload: BrochureLeadCreate, db: Session = Depends(get_db)):
    # Log lead / brochure request
    syllabus_url = None
    if payload.course_id:
        c = db.query(models.Course).filter(models.Course.id == payload.course_id).first()
        if c and c.upload_syllabus:
            syllabus_url = rewrite_url(c.upload_syllabus)

    return {
        "status": "success",
        "message": "Brochure request submitted successfully",
        "syllabus_url": syllabus_url
    }

@router.get("/courses", response_model=List[CourseResponse])
def get_all_courses(search: Optional[str] = None, subject_id: Optional[int] = Query(None), device: str = Depends(require_device), db: Session = Depends(get_db)):
    query = db.query(models.Course).options(joinedload(models.Course.instructors))
    if subject_id:
        query = query.filter(models.Course.subjects.any(id=subject_id))
    if search:
        query = query.filter(models.Course.title.ilike(f"%{search}%"))
    courses = query.order_by(models.Course.id.desc()).all()
    return [CourseResponse.from_orm_model(c) for c in courses]

@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    course = db.query(models.Course).options(
        joinedload(models.Course.subjects),
        joinedload(models.Course.instructors)
    ).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse.from_orm_model(course)

@router.post("/courses", response_model=CourseResponse)
def create_course(course: CourseCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_course = models.Course(
        title=course.title,
        description=course.description,
        start_date=course.start_date,
        end_date=course.end_date,
        validity_days=course.validity_days,
        price=course.price,
        discount_price=course.discount_price,
        currency=course.currency,
        is_free=course.is_free,
        min_payment_type=course.min_payment_type,
        min_payment_value=course.min_payment_value,
        thumbnail_url=course.thumbnail_url,
        promo_video_url=course.promo_video_url,
        status=course.status,
        is_featured=course.is_featured,
        show_on_homepage=course.show_on_homepage,
        is_new=course.is_new,
        instructor_name=course.instructor_name,
        skill_level=course.skill_level,
        prerequisites=course.prerequisites,
        what_you_will_learn=course.what_you_will_learn,
        has_certificate=course.has_certificate,
        certificate_image_url=course.certificate_image_url,
        upload_syllabus=course.upload_syllabus
    )
    
    # Auto-generate slug
    base_slug = re.sub(r'[^a-z0-9]+', '-', course.title.lower()).strip('-')
    slug = base_slug
    counter = 1
    while db.query(models.Course).filter(models.Course.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    db_course.slug = slug
    
    if course.subject_ids:
        subs = db.query(models.Subject).filter(models.Subject.id.in_(course.subject_ids)).all()
        db_course.subjects = subs
    if course.chapter_ids:
        chaps = db.query(models.Chapter).filter(models.Chapter.id.in_(course.chapter_ids)).all()
        db_course.chapters = chaps
        
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return CourseResponse.from_orm_model(db_course)

@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, course: CourseUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_c:
        raise HTTPException(status_code=404, detail="Course not found")
    for key, val in course.dict(exclude_unset=True).items():
        if key not in ["subject_ids", "chapter_ids"]:
            setattr(db_c, key, val)
    
    # Auto-update slug if title was updated
    if course.title is not None:
        base_slug = re.sub(r'[^a-z0-9]+', '-', course.title.lower()).strip('-')
        slug = base_slug
        counter = 1
        while db.query(models.Course).filter(models.Course.slug == slug, models.Course.id != course_id).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        db_c.slug = slug
    if course.subject_ids is not None:
        subs = db.query(models.Subject).filter(models.Subject.id.in_(course.subject_ids)).all()
        db_c.subjects = subs
    if course.chapter_ids is not None:
        chaps = db.query(models.Chapter).filter(models.Chapter.id.in_(course.chapter_ids)).all()
        db_c.chapters = chaps
        
    db.commit()
    db.refresh(db_c)
    return CourseResponse.from_orm_model(db_c)

@router.delete("/courses/{course_id}")
def delete_course(course_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_c:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(db_c)
    db.commit()
    return {"message": "Deleted"}


# 5. Chapters
@router.get("/chapters", response_model=List[ChapterResponse])
def get_all_chapters(search: Optional[str] = None, device: str = Depends(require_device), db: Session = Depends(get_db)):
    query = db.query(models.Chapter)
    if search:
        query = query.filter(models.Chapter.title.ilike(f"%{search}%"))
    return query.order_by(models.Chapter.id.desc()).all()

@router.get("/subjects/{subject_id}/chapters", response_model=List[ChapterResponse])
def get_chapters(
    subject_id: int,
    search: Optional[str] = None,
    active_only: bool = False,       # <- student-facing: pass ?active_only=true
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    query = db.query(models.Chapter).options(joinedload(models.Chapter.materials)).filter(models.Chapter.subject_id == subject_id)
    if search:
        query = query.filter(models.Chapter.title.ilike(f"%{search}%"))
    if active_only:
        query = query.filter(models.Chapter.is_active == True)
    chapters = query.order_by(models.Chapter.order_position.asc(), models.Chapter.id.asc()).all()
    return [ChapterResponse.from_orm_model(ch) for ch in chapters]

@router.post("/subjects/{subject_id}/chapters", response_model=ChapterResponse)
def create_chapter(subject_id: int, chapter: ChapterCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    # Place new chapter at the end of the list for this subject
    max_pos = db.query(models.Chapter).filter(
        models.Chapter.subject_id == subject_id
    ).count()
    db_chap = models.Chapter(
        title=chapter.title,
        content=chapter.content,
        subject_id=subject_id,
        order_position=max_pos,
        is_active=chapter.is_active,
    )
    db.add(db_chap)
    db.commit()
    db.refresh(db_chap)
    return db_chap

@router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
def update_chapter(chapter_id: int, chapter: ChapterUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if chapter.title is not None:
        db_chap.title = chapter.title
    if chapter.content is not None:
        db_chap.content = chapter.content
    if chapter.is_active is not None:
        db_chap.is_active = chapter.is_active
    db.commit()
    db.refresh(db_chap)
    return db_chap


@router.patch("/chapters/{chapter_id}/toggle-active", response_model=ChapterResponse)
def toggle_chapter_active(chapter_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Flip is_active: True → False or False → True."""
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db_chap.is_active = not db_chap.is_active
    db.commit()
    db.refresh(db_chap)
    return db_chap

@router.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db.delete(db_chap)
    db.commit()
    return {"message": "Deleted"}


@router.delete("/chapters/{chapter_id}/force")
def force_delete_chapter(chapter_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Force-delete a chapter and all its materials and live classes."""
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db.execute(text("DELETE FROM topic_materials WHERE topic_id = :cid"), {"cid": chapter_id})
    db.query(models.ChapterLiveClass).filter(models.ChapterLiveClass.chapter_id == chapter_id).delete()
    db.execute(text("DELETE FROM course_chapters WHERE chapter_id = :cid"), {"cid": chapter_id})
    db.delete(db_chap)
    db.commit()
    return {"message": "Chapter and all related materials and live classes deleted"}


# Reorder chapters within a subject
class ChapterOrderItem(BaseModel):
    id: int
    order_position: int

@router.put("/subjects/{subject_id}/chapters/reorder")
def reorder_chapters(
    subject_id: int,
    items: List[ChapterOrderItem],
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """
    Accepts [{id: 1, order_position: 0}, {id: 2, order_position: 1}, ...]
    and batch-updates order_position on the chapters table.
    """
    try:
        for item in items:
            db.query(models.Chapter).filter(
                models.Chapter.id == item.id,
                models.Chapter.subject_id == subject_id,
            ).update({"order_position": item.order_position})
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reorder failed: {e}")


# 6. Chapter Materials (Link Library Materials to Chapters)

# Local import to prevent circular dependency at top
from .materials import MaterialResponse

@router.get("/chapters/{chapter_id}/materials", response_model=List[MaterialResponse])
def get_chapter_materials(chapter_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    # Use raw SQL to sort materials by the per-chapter order_position
    result = db.execute(
        text("""
            SELECT cm.*
            FROM course_materials cm
            JOIN topic_materials tm ON tm.material_id = cm.id
            WHERE tm.topic_id = :chapter_id
            ORDER BY tm.order_position ASC, cm.id ASC
        """),
        {"chapter_id": chapter_id}
    )
    rows = result.mappings().all()
    # Map to MaterialResponse manually
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "tags": r["tags"],
            "file_type": r["file_type"],
            "file_url": r["file_url"],
            "youtube_url": r["youtube_url"],
            "thumbnail_url": r["thumbnail_url"],
            "file_size": r["file_size"],
            "order_position": r["order_position"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]

@router.post("/chapters/{chapter_id}/materials/{material_id}")
def add_material_to_chapter(chapter_id: int, material_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    # Check if already linked
    existing = db.execute(
        text("SELECT 1 FROM topic_materials WHERE topic_id = :cid AND material_id = :mid"),
        {"cid": chapter_id, "mid": material_id}
    ).fetchone()

    if not existing:
        # Get the max order_position for this chapter to place new item at the end
        result = db.execute(
            text("SELECT COALESCE(MAX(order_position), -1) FROM topic_materials WHERE topic_id = :cid"),
            {"cid": chapter_id}
        )
        max_pos = result.scalar() or -1
        next_pos = max_pos + 1

        db.execute(
            text("INSERT INTO topic_materials (topic_id, material_id, order_position) VALUES (:cid, :mid, :pos)"),
            {"cid": chapter_id, "mid": material_id, "pos": next_pos}
        )
        db.commit()
        
    return {"status": "success"}

@router.delete("/chapters/{chapter_id}/materials/{material_id}")
def remove_material_from_chapter(chapter_id: int, material_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
        
    if mat in db_chap.materials:
        db_chap.materials.remove(mat)
        db.commit()
        
    return {"status": "success"}


# 7. Reorder materials within a chapter
class MaterialOrderItem(BaseModel):
    id: int
    order_position: int

@router.put("/chapters/{chapter_id}/materials/reorder")
def reorder_chapter_materials(
    chapter_id: int,
    items: List[MaterialOrderItem],
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """
    Accepts a list like [{"id": 3, "order_position": 0}, {"id": 7, "order_position": 1}, ...]
    and updates order_position in the topic_materials pivot for this chapter.
    """
    db_chap = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    try:
        for item in items:
            db.execute(
                text("""
                    UPDATE topic_materials
                    SET order_position = :pos
                    WHERE topic_id = :cid AND material_id = :mid
                """),
                {"pos": item.order_position, "cid": chapter_id, "mid": item.id},
            )
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reorder failed: {e}")


# ─── 8a. JSON Material Creation (for AI Agent) ──────────────────────────────

class JsonMaterialCreate(BaseModel):
    title: str
    description: Optional[str] = None
    youtube_url: Optional[str] = None
    file_type: str = "text"
    tags: Optional[str] = None

@router.post("/chapters/{chapter_id}/create-material")
def create_and_link_material(
    chapter_id: int,
    data: JsonMaterialCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Create a material via JSON (no file upload) and link it to a chapter.
    Used by the AI Course Agent for text/youtube-based materials."""
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    file_type = data.file_type or "text"
    if data.youtube_url and data.youtube_url.strip():
        file_type = "youtube"

    max_position = db.query(models.CourseMaterial).count()
    material = models.CourseMaterial(
        title=data.title.strip(),
        description=data.description,
        tags=data.tags,
        file_type=file_type,
        file_url=None,
        youtube_url=data.youtube_url.strip() if data.youtube_url else None,
        order_position=max_position + 1,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # Link material to chapter
    existing = db.execute(
        text("SELECT 1 FROM topic_materials WHERE topic_id = :cid AND material_id = :mid"),
        {"cid": chapter_id, "mid": material.id}
    ).fetchone()
    if not existing:
        result = db.execute(
            text("SELECT COALESCE(MAX(order_position), -1) FROM topic_materials WHERE topic_id = :cid"),
            {"cid": chapter_id}
        )
        next_pos = (result.scalar() or -1) + 1
        db.execute(
            text("INSERT INTO topic_materials (topic_id, material_id, order_position) VALUES (:cid, :mid, :pos)"),
            {"cid": chapter_id, "mid": material.id, "pos": next_pos}
        )
        db.commit()

    return {"id": material.id, "title": material.title, "file_type": material.file_type, "status": "linked"}


class JsonMaterialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    youtube_url: Optional[str] = None
    tags: Optional[str] = None

@router.put("/materials/{material_id}/json")
def update_material_json(
    material_id: int,
    data: JsonMaterialUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Update a material via JSON (no file upload). Used by admin curriculum panel."""
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    if data.title is not None:
        mat.title = data.title.strip()
    if data.description is not None:
        mat.description = data.description
    if data.youtube_url is not None:
        mat.youtube_url = data.youtube_url.strip() if data.youtube_url.strip() else None
        mat.file_type = "youtube" if mat.youtube_url else mat.file_type
    if data.tags is not None:
        mat.tags = data.tags
    db.commit()
    db.refresh(mat)
    return {"id": mat.id, "title": mat.title, "file_type": mat.file_type, "status": "updated"}


@router.delete("/chapters/{chapter_id}/materials/{material_id}")
def unlink_material_from_chapter(
    chapter_id: int,
    material_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Remove a material from a chapter (unlink only, does not delete the material)."""
    db.execute(
        text("DELETE FROM topic_materials WHERE topic_id = :cid AND material_id = :mid"),
        {"cid": chapter_id, "mid": material_id}
    )
    db.commit()
    return {"status": "unlinked"}


# ─── 8b. Chapter Live Classes ───────────────────────────────────────────────

class LiveClassCreate(BaseModel):
    title: str
    meeting_url: str
    scheduled_at: Optional[str] = None  # ISO string from frontend

class LiveClassResponse(BaseModel):
    id: int
    chapter_id: int
    title: str
    meeting_url: str
    scheduled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("/chapters/{chapter_id}/live-classes", response_model=List[LiveClassResponse])
def get_live_classes(chapter_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db.query(models.ChapterLiveClass).filter(
        models.ChapterLiveClass.chapter_id == chapter_id
    ).order_by(models.ChapterLiveClass.scheduled_at.asc()).all()

@router.post("/chapters/{chapter_id}/live-classes", response_model=LiveClassResponse)
def create_live_class(
    chapter_id: int,
    data: LiveClassCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    scheduled = None
    if data.scheduled_at:
        try:
            scheduled = datetime.fromisoformat(data.scheduled_at.replace("Z", "+00:00"))
        except Exception:
            pass

    live_class = models.ChapterLiveClass(
        chapter_id=chapter_id,
        title=data.title.strip(),
        meeting_url=data.meeting_url.strip(),
        scheduled_at=scheduled,
    )
    db.add(live_class)
    db.commit()
    db.refresh(live_class)
    return live_class

@router.delete("/live-classes/{live_class_id}")
def delete_live_class(
    live_class_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    lc = db.query(models.ChapterLiveClass).filter(models.ChapterLiveClass.id == live_class_id).first()
    if not lc:
        raise HTTPException(status_code=404, detail="Live class not found")
    db.delete(lc)
    db.commit()
    return {"status": "deleted"}


class LiveClassUpdate(BaseModel):
    title: Optional[str] = None
    meeting_url: Optional[str] = None
    scheduled_at: Optional[str] = None

@router.put("/live-classes/{live_class_id}", response_model=LiveClassResponse)
def update_live_class(
    live_class_id: int,
    data: LiveClassUpdate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    lc = db.query(models.ChapterLiveClass).filter(models.ChapterLiveClass.id == live_class_id).first()
    if not lc:
        raise HTTPException(status_code=404, detail="Live class not found")
    if data.title is not None:
        lc.title = data.title.strip()
    if data.meeting_url is not None:
        lc.meeting_url = data.meeting_url.strip()
    if data.scheduled_at is not None:
        try:
            lc.scheduled_at = datetime.fromisoformat(data.scheduled_at.replace("Z", "+00:00")) if data.scheduled_at else None
        except Exception:
            pass
    db.commit()
    db.refresh(lc)
    return lc


# ─── 9. Course Instructor Assignment ─────────────────────────────────────────

class CourseInstructorUpdate(BaseModel):
    instructor_ids: List[int]

@router.get("/courses/{course_id}/instructors")
def get_course_instructors(course_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return [
        {
            "id": inst.id,
            "name": inst.name,
            "email": inst.email,
            "phone": inst.phone,
            "bio": inst.bio,
            "avatar_url": inst.avatar_url,
            "is_active": inst.is_active,
            "created_at": inst.created_at,
        }
        for inst in course.instructors
    ]

@router.put("/courses/{course_id}/instructors")
def set_course_instructors(course_id: int, req: CourseInstructorUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    instructors = db.query(models.Instructor).filter(models.Instructor.id.in_(req.instructor_ids)).all()
    course.instructors = instructors
    db.commit()
    db.refresh(course)
    return {"status": "success", "assigned": len(instructors)}
