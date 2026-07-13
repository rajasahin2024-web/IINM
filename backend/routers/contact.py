from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, uuid, shutil

from database import get_db
from models import ContactSettings, ContactBanner, ContactInquiry
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS, check_public_rate_limit, get_client_ip

router = APIRouter(prefix="/api/contact", tags=["contact"])

# ══════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════

class ContactSettingsSchema(BaseModel):
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    whatsapp: Optional[str] = None
    email1: Optional[str] = None
    email2: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    country: Optional[str] = None
    weekday_hours: Optional[str] = None
    weekend_hours: Optional[str] = None
    map_embed_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    youtube_url: Optional[str] = None
    twitter_url: Optional[str] = None

class InquirySchema(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    interest: Optional[str] = None
    message: Optional[str] = None

# ══════════════════════════════════════════════════════
#  CONTACT SETTINGS — Admin
# ══════════════════════════════════════════════════════

@router.get("/settings")
async def get_contact_settings(db: Session = Depends(get_db)):
    """Public: get contact settings for the public Contact Us page."""
    s = db.query(ContactSettings).first()
    if not s:
        return {}
    return {
        "phone1": s.phone1, "phone2": s.phone2, "whatsapp": s.whatsapp,
        "email1": s.email1, "email2": s.email2,
        "address_line1": s.address_line1, "address_line2": s.address_line2,
        "city": s.city, "state": s.state, "pin_code": s.pin_code, "country": s.country,
        "weekday_hours": s.weekday_hours, "weekend_hours": s.weekend_hours,
        "map_embed_url": s.map_embed_url,
        "facebook_url": s.facebook_url, "instagram_url": s.instagram_url,
        "linkedin_url": s.linkedin_url, "youtube_url": s.youtube_url, "twitter_url": s.twitter_url,
    }

@router.put("/settings")
async def update_contact_settings(
    req: ContactSettingsSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Admin: create or update contact settings."""
    s = db.query(ContactSettings).first()
    if not s:
        s = ContactSettings()
        db.add(s)
    for field, val in req.dict().items():
        setattr(s, field, val or None)
    db.commit()
    db.refresh(s)
    return {"message": "Contact settings updated successfully."}

# ══════════════════════════════════════════════════════
#  CONTACT BANNERS — Admin
# ══════════════════════════════════════════════════════

@router.get("/banners")
async def get_banners(db: Session = Depends(get_db)):
    """Public: list active banners ordered by order_index."""
    banners = db.query(ContactBanner).filter(ContactBanner.is_active == True).order_by(ContactBanner.order_index).all()
    return [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index} for b in banners]

@router.get("/banners/all")
async def get_all_banners(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: list all banners including inactive."""
    banners = db.query(ContactBanner).order_by(ContactBanner.order_index).all()
    return [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index, "is_active": b.is_active} for b in banners]

@router.post("/banners/upload")
async def upload_banner(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: upload a banner image and save as a new ContactBanner record."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    os.makedirs("uploads/contact", exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads/contact", filename)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    # Get max order index
    max_order = db.query(ContactBanner).count()
    banner = ContactBanner(image_url=f"/uploads/contact/{filename}", order_index=max_order)
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return {"id": banner.id, "image_url": banner.image_url, "order_index": banner.order_index}

@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: delete a banner."""
    banner = db.query(ContactBanner).filter(ContactBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
    return {"message": "Deleted"}

@router.patch("/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: toggle banner active status."""
    banner = db.query(ContactBanner).filter(ContactBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    banner.is_active = not banner.is_active
    db.commit()
    return {"id": banner.id, "is_active": banner.is_active}

# ══════════════════════════════════════════════════════
#  INQUIRIES
# ══════════════════════════════════════════════════════

@router.post("/inquiry")
async def submit_inquiry(req: InquirySchema, request: Request, db: Session = Depends(get_db)):
    """Public: submit a contact inquiry from the public Contact Us page."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=5, window=300)  # 5 per 5 min
    inquiry = ContactInquiry(
        name=req.name, email=req.email, phone=req.phone,
        interest=req.interest, message=req.message
    )
    db.add(inquiry)
    db.commit()
    return {"message": "Thank you! Your inquiry has been submitted successfully."}

@router.get("/inquiries")
async def get_inquiries(
    page: int = 1,
    limit: int = 20,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Admin: list all submitted inquiries, paginated, newest first."""
    total = db.query(ContactInquiry).count()
    items = db.query(ContactInquiry).order_by(ContactInquiry.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": [
            {
                "id": i.id, "name": i.name, "email": i.email, "phone": i.phone,
                "interest": i.interest, "message": i.message,
                "is_read": i.is_read,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in items
        ]
    }

@router.patch("/inquiries/{inquiry_id}/read")
async def mark_inquiry_read(inquiry_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: mark an inquiry as read."""
    inq = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Not found")
    inq.is_read = True
    db.commit()
    return {"message": "Marked as read"}
