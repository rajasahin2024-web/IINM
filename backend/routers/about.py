from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, uuid, shutil

from database import get_db
from models import AboutSettings, AboutBanner, AboutCoreValue
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

router = APIRouter(prefix="/api/about", tags=["about"])

# ══════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════

class AboutSettingsSchema(BaseModel):
    mission_statement: Optional[str] = None
    vision_statement: Optional[str] = None
    story_title: Optional[str] = None
    story_text: Optional[str] = None
    stats_years: Optional[str] = None
    stats_students: Optional[str] = None
    stats_courses: Optional[str] = None
    director_name: Optional[str] = None
    director_title: Optional[str] = None
    director_message: Optional[str] = None
    director_image_url: Optional[str] = None

class CoreValueSchema(BaseModel):
    title: str
    description: Optional[str] = None
    icon_name: Optional[str] = None

# ══════════════════════════════════════════════════════
#  ABOUT SETTINGS — Admin
# ══════════════════════════════════════════════════════

@router.get("/settings")
async def get_about_settings(db: Session = Depends(get_db)):
    """Public: get about us settings."""
    s = db.query(AboutSettings).first()
    if not s:
        return {}
    return {
        "mission_statement": s.mission_statement,
        "vision_statement": s.vision_statement,
        "story_title": s.story_title,
        "story_text": s.story_text,
        "stats_years": s.stats_years,
        "stats_students": s.stats_students,
        "stats_courses": s.stats_courses,
        "director_name": s.director_name,
        "director_title": s.director_title,
        "director_message": s.director_message,
        "director_image_url": rewrite_url(s.director_image_url),
    }

@router.put("/settings")
async def update_about_settings(
    req: AboutSettingsSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Admin: create or update about us settings."""
    s = db.query(AboutSettings).first()
    if not s:
        s = AboutSettings()
        db.add(s)
    for field, val in req.dict().items():
        setattr(s, field, val or None)
    db.commit()
    db.refresh(s)
    return {"message": "About settings updated successfully."}

@router.post("/upload-director-image")
async def upload_director_image(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: upload director image and update settings."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    os.makedirs("uploads/about", exist_ok=True)
    filename = f"director_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads/about", filename)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    
    s = db.query(AboutSettings).first()
    if not s:
        s = AboutSettings()
        db.add(s)
    s.director_image_url = f"/uploads/about/{filename}"
    db.commit()
    return {"url": s.director_image_url}


# ══════════════════════════════════════════════════════
#  ABOUT BANNERS — Admin
# ══════════════════════════════════════════════════════

@router.get("/banners")
async def get_banners(db: Session = Depends(get_db)):
    """Public: list active about banners ordered by order_index."""
    banners = db.query(AboutBanner).filter(AboutBanner.is_active == True).order_by(AboutBanner.order_index).all()
    return [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index} for b in banners]

@router.get("/banners/all")
async def get_all_banners(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: list all about banners including inactive."""
    banners = db.query(AboutBanner).order_by(AboutBanner.order_index).all()
    return [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index, "is_active": b.is_active} for b in banners]

@router.post("/banners/upload")
async def upload_banner(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: upload a banner image and save as a new AboutBanner record."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    os.makedirs("uploads/about", exist_ok=True)
    filename = f"banner_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads/about", filename)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    max_order = db.query(AboutBanner).count()
    banner = AboutBanner(image_url=f"/uploads/about/{filename}", order_index=max_order)
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return {"id": banner.id, "image_url": banner.image_url, "order_index": banner.order_index}

@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: delete a banner."""
    banner = db.query(AboutBanner).filter(AboutBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
    return {"message": "Deleted"}

@router.patch("/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: toggle banner active status."""
    banner = db.query(AboutBanner).filter(AboutBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    banner.is_active = not banner.is_active
    db.commit()
    return {"id": banner.id, "is_active": banner.is_active}


# ══════════════════════════════════════════════════════
#  CORE VALUES
# ══════════════════════════════════════════════════════

@router.get("/core-values")
async def get_core_values(db: Session = Depends(get_db)):
    """Public & Admin: get core values ordered by order_index."""
    values = db.query(AboutCoreValue).order_by(AboutCoreValue.order_index).all()
    return [{"id": v.id, "title": v.title, "description": v.description, "icon_name": v.icon_name, "order_index": v.order_index} for v in values]

@router.post("/core-values")
async def add_core_value(req: CoreValueSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: add a core value."""
    max_order = db.query(AboutCoreValue).count()
    val = AboutCoreValue(title=req.title, description=req.description, icon_name=req.icon_name, order_index=max_order)
    db.add(val)
    db.commit()
    db.refresh(val)
    return {"id": val.id, "title": val.title}

@router.delete("/core-values/{value_id}")
async def delete_core_value(value_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: delete a core value."""
    val = db.query(AboutCoreValue).filter(AboutCoreValue.id == value_id).first()
    if not val:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(val)
    db.commit()
    return {"message": "Deleted"}


# ══════════════════════════════════════════════════════
#  EXTENDED ABOUT US — Founders, Gallery, Timeline (JSON File Store)
# ══════════════════════════════════════════════════════

import json
import logging

EXTENDED_FILE_PATH = os.path.join("uploads", "about_extended.json")

class FounderSchema(BaseModel):
    name: str
    role: str
    bio: str
    quote: Optional[str] = ""
    image_url: Optional[str] = None
    video_url: Optional[str] = None

class GalleryItemSchema(BaseModel):
    id: str
    image_url: str
    caption: Optional[str] = ""

class TimelineItemSchema(BaseModel):
    id: str
    year: str
    title: str
    description: str
    icon_name: Optional[str] = "Target"

class ExtendedAboutSchema(BaseModel):
    founder1: FounderSchema
    founder2: FounderSchema
    gallery: List[GalleryItemSchema]
    timeline: List[TimelineItemSchema]

def get_default_extended_settings():
    return {
        "founder1": {
            "name": "Dr. Arindam Ghosh",
            "role": "Co-Founder & Chief AI Scientist",
            "bio": "Ex-IIT, Ex-Google Brain AI researcher with over 15 years of industry experience. Dr. Ghosh has spearheaded multiple award-winning generative AI frameworks and NLP models globally.",
            "quote": "Connecting the dots of AI to empower the next generation of engineers.",
            "image_url": "/uploads/about/founder1_default.png",
            "video_url": "FwOTs4UxQS4"
        },
        "founder2": {
            "name": "Prof. Sohini Mukherjee",
            "role": "Co-Founder & Director of Education",
            "bio": "A pioneering ed-tech innovator with a decade of academic excellence. Prof. Mukherjee specializes in crafting cognitive computing curriculums and immersive hands-on student structures.",
            "quote": "Democratizing artificial intelligence education is our ultimate mission.",
            "image_url": "/uploads/about/founder2_default.png",
            "video_url": "FwOTs4UxQS4"
        },
        "gallery": [
            {
                "id": "g-1",
                "image_url": "/uploads/about/gallery_1_default.jpg",
                "caption": "IINM Annual AI Convocation Ceremony"
            },
            {
                "id": "g-2",
                "image_url": "/uploads/about/gallery_2_default.jpg",
                "caption": "Collaborative Innovation Labs Session"
            },
            {
                "id": "g-3",
                "image_url": "/uploads/about/gallery_3_default.jpg",
                "caption": "National Ed-Tech Leadership Summit Keynote"
            }
        ],
        "timeline": [
            {
                "id": "t-1",
                "year": "2023",
                "title": "Inception of IINM",
                "description": "Founded with a vision to connect the dots of Artificial Intelligence education in India, introducing high-fidelity curriculum design.",
                "icon_name": "Lightbulb"
            },
            {
                "id": "t-2",
                "year": "2024",
                "title": "1,000+ AI Specialists Certified",
                "description": "Graduated our first batch of full-stack AI engineers, matching 100% of our active learners to industry partners.",
                "icon_name": "Users"
            },
            {
                "id": "t-3",
                "year": "2025",
                "title": "State-of-the-Art Research Hubs",
                "description": "Collaborated with leading enterprise platforms to open interactive physical labs, giving students access to specialized computing grids.",
                "icon_name": "Globe"
            },
            {
                "id": "t-4",
                "year": "2026",
                "title": "AIEngine & 24/7 Doubt Portals",
                "description": "Pioneered real-time instant question solvers and direct technical mentorship, establishing IINM as a premium global tech institute.",
                "icon_name": "Target"
            }
        ]
    }

def load_extended_settings():
    os.makedirs(os.path.dirname(EXTENDED_FILE_PATH), exist_ok=True)
    if not os.path.exists(EXTENDED_FILE_PATH):
        default_data = get_default_extended_settings()
        with open(EXTENDED_FILE_PATH, "w") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    try:
        with open(EXTENDED_FILE_PATH, "r") as f:
            data = json.load(f)
            # Guarantee structure integrity
            default_data = get_default_extended_settings()
            for key in ["founder1", "founder2", "gallery", "timeline"]:
                if key not in data:
                    data[key] = default_data[key]
            return data
    except Exception as e:
        logging.error(f"Error loading extended about settings: {e}")
        return get_default_extended_settings()

def save_extended_settings(data):
    os.makedirs(os.path.dirname(EXTENDED_FILE_PATH), exist_ok=True)
    try:
        with open(EXTENDED_FILE_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logging.error(f"Error saving extended about settings: {e}")
        return False

@router.get("/extended")
async def get_extended_about_settings():
    """Public: retrieve extended configuration for the About us page."""
    data = load_extended_settings()
    # Apply URL rewriting to any relative asset paths
    for f_key in ["founder1", "founder2"]:
        if data[f_key].get("image_url"):
            data[f_key]["image_url"] = rewrite_url(data[f_key]["image_url"])
    for item in data.get("gallery", []):
        if item.get("image_url"):
            item["image_url"] = rewrite_url(item["image_url"])
    return data

@router.put("/extended")
async def update_extended_about_settings(req: ExtendedAboutSchema, device: str = Depends(require_device)):
    """Admin: save dynamic extended settings. Requires device token validation."""
    success = save_extended_settings(req.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save dynamic configuration settings.")
    return {"status": "success", "message": "Extended About settings updated successfully."}

@router.post("/upload-about-image")
async def upload_about_image(file: UploadFile = File(...), device: str = Depends(require_device)):
    """Admin: general upload endpoint for founders, gallery pictures, and icons."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    os.makedirs("uploads/about", exist_ok=True)
    filename = f"img_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads/about", filename)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    url_path = f"/uploads/about/{filename}"
    return {"url": rewrite_url(url_path)}

