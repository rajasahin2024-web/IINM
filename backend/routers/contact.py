from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import os, uuid, shutil

from database import get_db
from cache import cache
from models import ContactSettings, ContactBanner, ContactInquiry, GoogleApiSettings
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
    map_lat: Optional[str] = None
    map_lng: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    youtube_url: Optional[str] = None
    twitter_url: Optional[str] = None
    # Page content
    page_title: Optional[str] = None
    page_subtitle: Optional[str] = None
    get_in_touch_heading: Optional[str] = None
    get_in_touch_description: Optional[str] = None
    contact_email_label: Optional[str] = None
    contact_phone_label: Optional[str] = None
    registered_office_label: Optional[str] = None
    registered_office_city: Optional[str] = None
    registered_office_address: Optional[str] = None
    form_title: Optional[str] = None
    form_subtitle: Optional[str] = None
    state_options: Optional[str] = None
    qualification_options: Optional[str] = None
    terms_text: Optional[str] = None
    terms_url: Optional[str] = None
    success_message: Optional[str] = None
    review_badges: Optional[str] = None

class InquirySchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    interest: Optional[str] = Field(None, max_length=200)
    state: Optional[str] = Field(None, max_length=100)
    qualification: Optional[str] = Field(None, max_length=100)
    message: Optional[str] = Field(None, max_length=2000)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.strip().lower()

# ══════════════════════════════════════════════════════
#  CONTACT SETTINGS — Admin
# ══════════════════════════════════════════════════════

@router.get("/settings")
async def get_contact_settings(response: Response, db: Session = Depends(get_db)):
    """Public: get contact settings for the public Contact Us page."""
    response.headers["Cache-Control"] = "public, max-age=60"
    cached_val = cache.get("contact_settings")
    if cached_val is not None:
        return cached_val
    s = db.query(ContactSettings).first()
    if not s:
        result = {}
    else:
        result = {
            "phone1": s.phone1, "phone2": s.phone2, "whatsapp": s.whatsapp,
            "email1": s.email1, "email2": s.email2,
            "address_line1": s.address_line1, "address_line2": s.address_line2,
            "city": s.city, "state": s.state, "pin_code": s.pin_code, "country": s.country,
            "weekday_hours": s.weekday_hours, "weekend_hours": s.weekend_hours,
            "map_embed_url": s.map_embed_url,
            "map_lat": s.map_lat, "map_lng": s.map_lng,
            "facebook_url": s.facebook_url, "instagram_url": s.instagram_url,
            "linkedin_url": s.linkedin_url, "youtube_url": s.youtube_url, "twitter_url": s.twitter_url,
            "page_title": s.page_title, "page_subtitle": s.page_subtitle,
            "get_in_touch_heading": s.get_in_touch_heading, "get_in_touch_description": s.get_in_touch_description,
            "contact_email_label": s.contact_email_label, "contact_phone_label": s.contact_phone_label,
            "registered_office_label": s.registered_office_label, "registered_office_city": s.registered_office_city,
            "registered_office_address": s.registered_office_address,
            "form_title": s.form_title, "form_subtitle": s.form_subtitle,
            "state_options": s.state_options, "qualification_options": s.qualification_options,
            "terms_text": s.terms_text, "terms_url": s.terms_url,
            "success_message": s.success_message, "review_badges": s.review_badges,
        }
    cache.set("contact_settings", result)
    return result

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
    for field, val in req.dict(exclude_unset=True).items():
        setattr(s, field, val or None)
    db.commit()
    db.refresh(s)
    cache.invalidate("contact_settings")
    return {"message": "Contact settings updated successfully."}

# ══════════════════════════════════════════════════════
#  CONTACT BANNERS — Admin
# ══════════════════════════════════════════════════════

@router.get("/banners")
async def get_banners(db: Session = Depends(get_db)):
    """Public: list active banners ordered by order_index."""
    cached_val = cache.get("contact_banners")
    if cached_val is not None:
        return cached_val
    banners = db.query(ContactBanner).filter(ContactBanner.is_active == True).order_by(ContactBanner.order_index).all()
    result = [{"id": b.id, "image_url": rewrite_url(b.image_url), "caption": b.caption, "order_index": b.order_index} for b in banners]
    cache.set("contact_banners", result)
    return result

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
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("uploads/contact", filename)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    # Get max order index
    max_order = db.query(ContactBanner).count()
    banner = ContactBanner(image_url=f"/uploads/contact/{filename}", order_index=max_order)
    db.add(banner)
    db.commit()
    db.refresh(banner)
    cache.invalidate("contact_banners")
    return {"id": banner.id, "image_url": banner.image_url, "order_index": banner.order_index}

@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: delete a banner."""
    banner = db.query(ContactBanner).filter(ContactBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
    cache.invalidate("contact_banners")
    return {"message": "Deleted"}

@router.patch("/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: toggle banner active status."""
    banner = db.query(ContactBanner).filter(ContactBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    banner.is_active = not banner.is_active
    db.commit()
    cache.invalidate("contact_banners")
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
        interest=req.interest, state=req.state,
        qualification=req.qualification, message=req.message
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


# ══════════════════════════════════════════════════════
#  GOOGLE API SETTINGS — Admin
# ══════════════════════════════════════════════════════

class GoogleApiSchema(BaseModel):
    google_map_api_key: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: Optional[str] = None
    enable_google_login: Optional[bool] = None

@router.get("/google-api")
async def get_google_api_settings(db: Session = Depends(get_db)):
    """Public: get Google API settings (map key only, secrets excluded)."""
    s = db.query(GoogleApiSettings).first()
    if not s:
        return {}
    return {
        "google_map_api_key": s.google_map_api_key or "",
        "enable_google_login": bool(s.enable_google_login) if s.enable_google_login is not None else False,
    }

@router.get("/google-api/admin")
async def get_google_api_settings_admin(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: get all Google API settings including secrets."""
    s = db.query(GoogleApiSettings).first()
    if not s:
        return {}
    return {
        "google_map_api_key": s.google_map_api_key or "",
        "google_client_id": s.google_client_id or "",
        "google_client_secret": s.google_client_secret or "",
        "google_redirect_uri": s.google_redirect_uri or "",
        "enable_google_login": bool(s.enable_google_login) if s.enable_google_login is not None else False,
    }

@router.put("/google-api")
async def update_google_api_settings(
    req: GoogleApiSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Admin: create or update Google API settings."""
    s = db.query(GoogleApiSettings).first()
    if not s:
        s = GoogleApiSettings()
        db.add(s)
    for field, val in req.dict().items():
        setattr(s, field, val or None)
    db.commit()
    return {"message": "Google API settings updated successfully."}


# ══════════════════════════════════════════════════════
#  GOOGLE API — TEST ENDPOINTS
# ══════════════════════════════════════════════════════

@router.post("/google-api/test-map")
async def test_google_map_api_key(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: test the Google Maps API key by making a simple Geocoding API call."""
    import httpx
    s = db.query(GoogleApiSettings).first()
    if not s or not s.google_map_api_key:
        raise HTTPException(status_code=400, detail="No Google Map API key configured.")
    try:
        url = f"https://maps.googleapis.com/maps/api/geocode/json?address=Kolkata&key={s.google_map_api_key}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            data = resp.json()
        if data.get("status") == "OK":
            return {"success": True, "message": "API key is valid. Google Maps Geocoding API responded successfully."}
        elif data.get("status") == "REQUEST_DENIED":
            return {"success": False, "message": f"Request denied: {data.get('error_message', 'API key may be restricted or invalid.')}"}
        elif data.get("status") == "INVALID_REQUEST":
            return {"success": False, "message": f"Invalid request: {data.get('error_message', 'Check API key restrictions.')}"}
        else:
            return {"success": False, "message": f"API returned status: {data.get('status')}. {data.get('error_message', '')}"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Request timed out. Check your network connection."}
    except Exception as e:
        return {"success": False, "message": f"Test failed: {str(e)}"}


@router.post("/google-api/test-oauth")
async def test_google_oauth_credentials(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin: test Google OAuth credentials by checking the token endpoint."""
    import httpx
    s = db.query(GoogleApiSettings).first()
    if not s or not s.google_client_id or not s.google_client_secret:
        raise HTTPException(status_code=400, detail="Google Client ID and Secret are required for testing.")
    try:
        # Try to get a token info with invalid code — if credentials are wrong, we get invalid_client
        url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": s.google_client_id,
            "client_secret": s.google_client_secret,
            "grant_type": "authorization_code",
            "code": "4/0test_dummy_code_for_validation",
            "redirect_uri": s.google_redirect_uri or "http://localhost",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, data=payload)
            data = resp.json()
        if data.get("error") == "invalid_grant":
            return {"success": True, "message": "OAuth credentials are valid. (Invalid grant expected for dummy code — credentials accepted by Google.)"}
        elif data.get("error") == "invalid_client":
            return {"success": False, "message": f"Invalid client credentials: {data.get('error_description', 'Check Client ID and Secret.')}"}
        elif data.get("error") == "redirect_uri_mismatch":
            return {"success": False, "message": f"Redirect URI mismatch: {data.get('error_description', 'The redirect URI is not registered in Google Console.')}"}
        else:
            err = data.get("error", "unknown")
            desc = data.get("error_description", "")
            if err == "invalid_grant":
                return {"success": True, "message": "OAuth credentials appear valid. (Dummy code rejected as expected.)"}
            return {"success": False, "message": f"Test result: {err} — {desc}"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Request timed out. Check your network connection."}
    except Exception as e:
        return {"success": False, "message": f"Test failed: {str(e)}"}
