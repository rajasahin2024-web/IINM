from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import logging
import os, uuid

from database import get_db
from cache import cache
from models import (
    AboutSettings,
    AboutBanner,
    AboutCoreValue,
    AboutFounder,
    AboutGalleryItem,
    AboutTimelineItem,
    AboutAlumniLogo,
    R2Settings,
)
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/about", tags=["about"])

# ══════════════════════════════════════════════════════
#  R2 HELPER
# ══════════════════════════════════════════════════════

def _get_r2_client(db: Session):
    """Return (boto3_s3_client, r2_settings) when R2 is active; else (None, None)."""
    try:
        import boto3

        r2 = db.query(R2Settings).first()
        if not r2 or not r2.is_active or not r2.account_id or not r2.secret_access_key or not r2.bucket_name:
            return None, None
        account = (r2.account_id or "").strip()
        if "r2.cloudflarestorage.com" in account:
            endpoint = account if account.startswith("http") else f"https://{account}"
        else:
            endpoint = f"https://{account}.r2.cloudflarestorage.com"
        s3 = boto3.client(
            service_name="s3",
            endpoint_url=endpoint,
            aws_access_key_id=r2.access_key_id,
            aws_secret_access_key=r2.secret_access_key,
            region_name="auto",
        )
        return s3, r2
    except Exception:
        return None, None


def _try_upload_to_r2(content: bytes, key: str, content_type: str | None, db: Session) -> str | None:
    """Upload bytes to R2 and return the public URL, or None if R2 is not active/fails."""
    try:
        s3, r2 = _get_r2_client(db)
        if not s3 or not r2:
            return None
        ext = key.split(".")[-1].lower() if "." in key else "jpeg"
        ct = content_type or f"image/{ext}"
        s3.put_object(Bucket=r2.bucket_name, Key=key, Body=content, ContentType=ct)
        public_url = (r2.public_url or "").rstrip("/")
        return f"{public_url}/{key}" if public_url else key
    except Exception as e:
        logger.warning(f"R2 upload failed for {key}: {e}")
        return None


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
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_note: Optional[str] = None
    hero_image_1: Optional[str] = None
    hero_image_2: Optional[str] = None
    hero_image_3: Optional[str] = None
    hero_image_4: Optional[str] = None
    hero_image_5: Optional[str] = None
    hero_image_6: Optional[str] = None
    difference_eyebrow: Optional[str] = None
    difference_title: Optional[str] = None
    difference_video_url: Optional[str] = None
    difference_at_iinm_heading: Optional[str] = None
    difference_traditional_heading: Optional[str] = None
    difference_rows_json: Optional[str] = None
    alumni_eyebrow: Optional[str] = None
    alumni_title: Optional[str] = None
    alumni_description: Optional[str] = None

class CoreValueSchema(BaseModel):
    title: str
    description: Optional[str] = None
    icon_name: Optional[str] = None

# ══════════════════════════════════════════════════════
#  ABOUT SETTINGS — Admin
# ══════════════════════════════════════════════════════

def seed_about_settings(db: Session) -> None:
    existing = db.query(AboutSettings).first()
    if existing is not None:
        return
    db.add(AboutSettings(
        mission_statement="To empower global learners through institutional access to cutting-edge AI skills, world-class mentors, and certified assessment pathways.",
        vision_statement="To become the definitive node connecting the dots of Artificial Intelligence education, forming highly robust industry collaborations.",
        story_title="A community for the curious",
        story_text="IINM brings together curious minds, experienced educators, and industry practitioners to create a learning environment where technology becomes a tool for meaningful progress.",
        stats_years="3+",
        stats_students="10,000+",
        stats_courses="50+",
        director_name="Built by educators and practitioners",
        director_title="",
        director_message="The best learning experiences make people feel seen, challenged, and ready for what comes next.",
        director_image_url=None,
        hero_eyebrow="IINM • BEYOND THE CLASSROOM",
        hero_title="Meet the Team of IINM Academy",
        hero_subtitle="People, purpose, and practical learning working together to shape the next generation of builders.",
        hero_note="Learn. Build. Belong.",
        hero_image_1=None,
        hero_image_2=None,
        hero_image_3=None,
        hero_image_4=None,
        hero_image_5=None,
        hero_image_6=None,
        difference_eyebrow="THE DIFFERENCE",
        difference_title="More than a course. A connected learning system.",
        difference_video_url=None,
        difference_at_iinm_heading="At IINM",
        difference_traditional_heading="Traditional learning",
        difference_rows_json=json.dumps([
            {"at_iinm": "Projects before perfection", "traditional": "Content before context"},
            {"at_iinm": "Mentors from the field", "traditional": "One-way instruction"},
            {"at_iinm": "Community and accountability", "traditional": "Learning alone"},
            {"at_iinm": "Portfolio-ready outcomes", "traditional": "Certificate-only finish"},
        ]),
        alumni_eyebrow="OUR LEARNERS, OUT THERE",
        alumni_title="10,000+ learners moving forward.",
        alumni_description="From first projects to meaningful careers, our community carries the IINM spirit into ambitious teams and organisations.",
    ))
    db.commit()

@router.get("/settings")
async def get_about_settings(db: Session = Depends(get_db)):
    """Public: get about us settings."""
    cached_val = cache.get("about_settings")
    if cached_val is not None:
        return cached_val
    seed_about_settings(db)
    s = db.query(AboutSettings).first()
    if not s:
        return {}
    result = {
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
        "hero_eyebrow": s.hero_eyebrow,
        "hero_title": s.hero_title,
        "hero_subtitle": s.hero_subtitle,
        "hero_note": s.hero_note,
        "hero_image_1": rewrite_url(s.hero_image_1),
        "hero_image_2": rewrite_url(s.hero_image_2),
        "hero_image_3": rewrite_url(s.hero_image_3),
        "hero_image_4": rewrite_url(s.hero_image_4),
        "hero_image_5": rewrite_url(s.hero_image_5),
        "hero_image_6": rewrite_url(s.hero_image_6),
        "difference_eyebrow": s.difference_eyebrow,
        "difference_title": s.difference_title,
        "difference_video_url": s.difference_video_url,
        "difference_at_iinm_heading": s.difference_at_iinm_heading,
        "difference_traditional_heading": s.difference_traditional_heading,
        "difference_rows_json": s.difference_rows_json,
        "alumni_eyebrow": s.alumni_eyebrow,
        "alumni_title": s.alumni_title,
        "alumni_description": s.alumni_description,
    }
    cache.set("about_settings", result)
    return result

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
    cache.invalidate("about_settings")
    db.refresh(s)
    return {"message": "About settings updated successfully."}

@router.post("/upload-director-image")
async def upload_director_image(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: upload director image to R2 (or local fallback) and update settings."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    content = await file.read()
    filename = f"director_{uuid.uuid4().hex}{ext}"
    url = _try_upload_to_r2(content, f"about/director/{filename}", file.content_type, db)
    if not url:
        os.makedirs("uploads/about", exist_ok=True)
        filepath = os.path.join("uploads/about", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        url = f"/uploads/about/{filename}"

    s = db.query(AboutSettings).first()
    if not s:
        s = AboutSettings()
        db.add(s)
    s.director_image_url = url
    db.commit()
    cache.invalidate("about_settings")
    return {"url": s.director_image_url}


# ══════════════════════════════════════════════════════
#  ABOUT BANNERS — Admin
# ══════════════════════════════════════════════════════

@router.get("/banners")
async def get_banners(db: Session = Depends(get_db)):
    """Public: list active about banners ordered by order_index."""
    cached_val = cache.get("about_banners")
    if cached_val is not None:
        return cached_val
    banners = db.query(AboutBanner).filter(AboutBanner.is_active == True).order_by(AboutBanner.order_index).all()
    result = [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index} for b in banners]
    cache.set("about_banners", result)
    return result

@router.get("/banners/all")
async def get_all_banners(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: list all about banners including inactive."""
    banners = db.query(AboutBanner).order_by(AboutBanner.order_index).all()
    return [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index, "is_active": b.is_active} for b in banners]

@router.post("/banners/upload")
async def upload_banner(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: upload a banner image to R2 (or local fallback) and save as a new AboutBanner record."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    content = await file.read()
    filename = f"banner_{uuid.uuid4().hex}{ext}"
    image_url = _try_upload_to_r2(content, f"about/banners/{filename}", file.content_type, db)
    if not image_url:
        os.makedirs("uploads/about", exist_ok=True)
        filepath = os.path.join("uploads/about", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        image_url = f"/uploads/about/{filename}"
    max_order = db.query(AboutBanner).count()
    banner = AboutBanner(image_url=image_url, order_index=max_order)
    db.add(banner)
    db.commit()
    cache.invalidate("about_banners")
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
    cache.invalidate("about_banners")
    return {"message": "Deleted"}

@router.patch("/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: toggle banner active status."""
    banner = db.query(AboutBanner).filter(AboutBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    banner.is_active = not banner.is_active
    db.commit()
    cache.invalidate("about_banners")
    return {"id": banner.id, "is_active": banner.is_active}


# ══════════════════════════════════════════════════════
#  CORE VALUES
# ══════════════════════════════════════════════════════

@router.get("/core-values")
async def get_core_values(db: Session = Depends(get_db)):
    """Public & Admin: get core values ordered by order_index."""
    cached_val = cache.get("about_core_values")
    if cached_val is not None:
        return cached_val
    values = db.query(AboutCoreValue).order_by(AboutCoreValue.order_index).all()
    result = [{"id": v.id, "title": v.title, "description": v.description, "icon_name": v.icon_name, "order_index": v.order_index} for v in values]
    cache.set("about_core_values", result)
    return result

@router.post("/core-values")
async def add_core_value(req: CoreValueSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: add a core value."""
    max_order = db.query(AboutCoreValue).count()
    val = AboutCoreValue(title=req.title, description=req.description, icon_name=req.icon_name, order_index=max_order)
    db.add(val)
    db.commit()
    cache.invalidate("about_core_values")
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
    cache.invalidate("about_core_values")
    return {"message": "Deleted"}


# ══════════════════════════════════════════════════════
#  EXTENDED ABOUT US — Founders, Gallery, Timeline (Database Store)
# ══════════════════════════════════════════════════════

class FounderSchema(BaseModel):
    name: str
    role: str
    bio: str
    quote: Optional[str] = ""
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    business_logo_url: Optional[str] = None

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

class AlumniLogoSchema(BaseModel):
    id: str
    image_url: str

class ExtendedAboutSchema(BaseModel):
    founder1: FounderSchema
    founder2: FounderSchema
    gallery: List[GalleryItemSchema]
    timeline: List[TimelineItemSchema]
    alumni_logos: List[AlumniLogoSchema]

def get_default_extended_settings():
    return {
        "founder1": {
            "name": "Dr. Arindam Ghosh",
            "role": "Co-Founder & Chief AI Scientist",
            "bio": "Ex-IIT, Ex-Google Brain AI researcher with over 15 years of industry experience. Dr. Ghosh has spearheaded multiple award-winning generative AI frameworks and NLP models globally.",
            "quote": "Connecting the dots of AI to empower the next generation of engineers.",
            "image_url": "/uploads/about/founder1_default.png",
            "video_url": "FwOTs4UxQS4",
            "linkedin_url": "",
            "business_logo_url": ""
        },
        "founder2": {
            "name": "Prof. Sohini Mukherjee",
            "role": "Co-Founder & Director of Education",
            "bio": "A pioneering ed-tech innovator with a decade of academic excellence. Prof. Mukherjee specializes in crafting cognitive computing curriculums and immersive hands-on student structures.",
            "quote": "Democratizing artificial intelligence education is our ultimate mission.",
            "image_url": "/uploads/about/founder2_default.png",
            "video_url": "FwOTs4UxQS4",
            "linkedin_url": "",
            "business_logo_url": ""
        },
        "gallery": [
            {"id": "g-1", "image_url": "/uploads/about/gallery_1_default.jpg", "caption": "IINM Annual AI Convocation Ceremony"},
            {"id": "g-2", "image_url": "/uploads/about/gallery_2_default.jpg", "caption": "Collaborative Innovation Labs Session"},
            {"id": "g-3", "image_url": "/uploads/about/gallery_3_default.jpg", "caption": "National Ed-Tech Leadership Summit Keynote"}
        ],
        "timeline": [
            {"id": "t-1", "year": "2023", "title": "Inception of IINM", "description": "Founded with a vision to connect the dots of Artificial Intelligence education in India, introducing high-fidelity curriculum design.", "icon_name": "Lightbulb"},
            {"id": "t-2", "year": "2024", "title": "1,000+ AI Specialists Certified", "description": "Graduated our first batch of full-stack AI engineers, matching 100% of our active learners to industry partners.", "icon_name": "Users"},
            {"id": "t-3", "year": "2025", "title": "State-of-the-Art Research Hubs", "description": "Collaborated with leading enterprise platforms to open interactive physical labs, giving students access to specialized computing grids.", "icon_name": "Globe"},
            {"id": "t-4", "year": "2026", "title": "AIEngine & 24/7 Doubt Portals", "description": "Pioneered real-time instant question solvers and direct technical mentorship, establishing IINM as a premium global tech institute.", "icon_name": "Target"}
        ],
        "alumni_logos": [
            {"id": "al-1", "image_url": "/uploads/about/google_logo_default.png"},
            {"id": "al-2", "image_url": "/uploads/about/microsoft_logo_default.png"},
            {"id": "al-3", "image_url": "/uploads/about/amazon_logo_default.png"},
            {"id": "al-4", "image_url": "/uploads/about/deloitte_logo_default.png"},
            {"id": "al-5", "image_url": "/uploads/about/ibm_logo_default.png"},
            {"id": "al-6", "image_url": "/uploads/about/accenture_logo_default.png"},
        ]
    }

def seed_extended_settings(db: Session) -> None:
    founder_exists = db.execute(select(AboutFounder.id).limit(1)).scalar_one_or_none()
    gallery_exists = db.execute(select(AboutGalleryItem.id).limit(1)).scalar_one_or_none()
    timeline_exists = db.execute(select(AboutTimelineItem.id).limit(1)).scalar_one_or_none()
    alumni_exists = db.execute(select(AboutAlumniLogo.id).limit(1)).scalar_one_or_none()
    if founder_exists is not None or gallery_exists is not None or timeline_exists is not None or alumni_exists is not None:
        return

    defaults = get_default_extended_settings()
    for index, slot_key in enumerate(("founder1", "founder2")):
        founder = defaults[slot_key]
        db.add(AboutFounder(
            slot_key=slot_key,
            name=founder["name"],
            role=founder["role"],
            bio=founder["bio"],
            quote=founder.get("quote"),
            image_url=founder.get("image_url"),
            video_url=founder.get("video_url"),
            linkedin_url=founder.get("linkedin_url"),
            business_logo_url=founder.get("business_logo_url"),
            order_index=index,
        ))
    for index, item in enumerate(defaults["gallery"]):
        db.add(AboutGalleryItem(
            public_id=item["id"],
            image_url=item["image_url"],
            caption=item.get("caption"),
            order_index=index,
        ))
    for index, item in enumerate(defaults["timeline"]):
        db.add(AboutTimelineItem(
            public_id=item["id"],
            year=item["year"],
            title=item["title"],
            description=item["description"],
            icon_name=item.get("icon_name"),
            order_index=index,
        ))
    for index, item in enumerate(defaults["alumni_logos"]):
        db.add(AboutAlumniLogo(
            public_id=item["id"],
            image_url=item["image_url"],
            order_index=index,
        ))
    db.commit()

def serialize_founder(founder: AboutFounder | None, fallback: dict) -> dict:
    if founder is None:
        return {
            **fallback,
            "image_url": rewrite_url(fallback.get("image_url")),
        }
    return {
        "name": founder.name,
        "role": founder.role,
        "bio": founder.bio,
        "quote": founder.quote or "",
        "image_url": rewrite_url(founder.image_url),
        "video_url": founder.video_url,
        "linkedin_url": founder.linkedin_url or "",
        "business_logo_url": rewrite_url(founder.business_logo_url),
    }

def load_extended_settings(db: Session) -> dict:
    seed_extended_settings(db)
    defaults = get_default_extended_settings()
    founders = db.execute(
        select(AboutFounder).order_by(AboutFounder.order_index, AboutFounder.id)
    ).scalars().all()
    founder_by_slot = {founder.slot_key: founder for founder in founders}
    gallery = db.execute(
        select(AboutGalleryItem).order_by(AboutGalleryItem.order_index, AboutGalleryItem.id)
    ).scalars().all()
    timeline = db.execute(
        select(AboutTimelineItem).order_by(AboutTimelineItem.order_index, AboutTimelineItem.id)
    ).scalars().all()
    alumni_logos = db.execute(
        select(AboutAlumniLogo).order_by(AboutAlumniLogo.order_index, AboutAlumniLogo.id)
    ).scalars().all()
    return {
        "founder1": serialize_founder(founder_by_slot.get("founder1"), defaults["founder1"]),
        "founder2": serialize_founder(founder_by_slot.get("founder2"), defaults["founder2"]),
        "gallery": [
            {"id": item.public_id, "image_url": rewrite_url(item.image_url), "caption": item.caption or ""}
            for item in gallery
        ],
        "timeline": [
            {"id": item.public_id, "year": item.year, "title": item.title, "description": item.description, "icon_name": item.icon_name or "Target"}
            for item in timeline
        ],
        "alumni_logos": [
            {"id": item.public_id, "image_url": rewrite_url(item.image_url)}
            for item in alumni_logos
        ],
    }

def save_extended_settings(data: ExtendedAboutSchema, db: Session) -> None:
    payload = data.dict()
    try:
        for index, slot_key in enumerate(("founder1", "founder2")):
            founder_data = payload[slot_key]
            founder = db.execute(
                select(AboutFounder).where(AboutFounder.slot_key == slot_key)
            ).scalar_one_or_none()
            if founder is None:
                founder = AboutFounder(slot_key=slot_key)
                db.add(founder)
            founder.name = founder_data["name"]
            founder.role = founder_data["role"]
            founder.bio = founder_data["bio"]
            founder.quote = founder_data.get("quote") or ""
            founder.image_url = founder_data.get("image_url")
            founder.video_url = founder_data.get("video_url")
            founder.linkedin_url = founder_data.get("linkedin_url")
            founder.business_logo_url = founder_data.get("business_logo_url")
            founder.order_index = index

        gallery_items = payload.get("gallery", [])
        gallery_ids = [item["id"] for item in gallery_items]
        if gallery_ids:
            db.execute(delete(AboutGalleryItem).where(~AboutGalleryItem.public_id.in_(gallery_ids)))
        else:
            db.execute(delete(AboutGalleryItem))
        for index, item in enumerate(gallery_items):
            gallery_item = db.execute(
                select(AboutGalleryItem).where(AboutGalleryItem.public_id == item["id"])
            ).scalar_one_or_none()
            if gallery_item is None:
                gallery_item = AboutGalleryItem(public_id=item["id"])
                db.add(gallery_item)
            gallery_item.image_url = item["image_url"]
            gallery_item.caption = item.get("caption") or ""
            gallery_item.order_index = index

        timeline_items = payload.get("timeline", [])
        timeline_ids = [item["id"] for item in timeline_items]
        if timeline_ids:
            db.execute(delete(AboutTimelineItem).where(~AboutTimelineItem.public_id.in_(timeline_ids)))
        else:
            db.execute(delete(AboutTimelineItem))
        for index, item in enumerate(timeline_items):
            timeline_item = db.execute(
                select(AboutTimelineItem).where(AboutTimelineItem.public_id == item["id"])
            ).scalar_one_or_none()
            if timeline_item is None:
                timeline_item = AboutTimelineItem(public_id=item["id"])
                db.add(timeline_item)
            timeline_item.year = item["year"]
            timeline_item.title = item["title"]
            timeline_item.description = item["description"]
            timeline_item.icon_name = item.get("icon_name") or "Target"
            timeline_item.order_index = index

        alumni_logos = payload.get("alumni_logos", [])
        alumni_ids = [item["id"] for item in alumni_logos]
        if alumni_ids:
            db.execute(delete(AboutAlumniLogo).where(~AboutAlumniLogo.public_id.in_(alumni_ids)))
        else:
            db.execute(delete(AboutAlumniLogo))
        for index, item in enumerate(alumni_logos):
            logo = db.execute(
                select(AboutAlumniLogo).where(AboutAlumniLogo.public_id == item["id"])
            ).scalar_one_or_none()
            if logo is None:
                logo = AboutAlumniLogo(public_id=item["id"])
                db.add(logo)
            logo.image_url = item["image_url"]
            logo.order_index = index

        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to save extended About settings")
        raise HTTPException(status_code=500, detail="Failed to save dynamic configuration settings.")

@router.get("/extended")
async def get_extended_about_settings(db: Session = Depends(get_db)):
    """Public: retrieve extended configuration for the About us page."""
    return load_extended_settings(db)

@router.put("/extended")
async def update_extended_about_settings(
    req: ExtendedAboutSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: save dynamic extended settings. Requires device token validation."""
    save_extended_settings(req, db)
    return {"status": "success", "message": "Extended About settings updated successfully."}

@router.post("/upload-about-image")
async def upload_about_image(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: general upload endpoint for founders, gallery pictures, and icons (R2 or local)."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    content = await file.read()
    filename = f"img_{uuid.uuid4().hex}{ext}"
    url = _try_upload_to_r2(content, f"about/general/{filename}", file.content_type, db)
    if not url:
        os.makedirs("uploads/about", exist_ok=True)
        filepath = os.path.join("uploads/about", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        url = f"/uploads/about/{filename}"
    return {"url": rewrite_url(url)}

