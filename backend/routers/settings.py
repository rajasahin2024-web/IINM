from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
import uuid
import shutil
import json
from sqlalchemy.orm import Session
from pydantic import BaseModel
import smtplib
from email.message import EmailMessage
import logging
from typing import Optional, List

from database import get_db
from models import (
    EmailSettings, SiteSettings, PaymentSettings, AISettings,
    NavbarItem, HomeHeroContent, HomePartnerSection,
    FooterMenuGroup, FooterMenuItem, FooterBottomLink, HomeCourseCategory,
    HomeJourneySection, HomeJourneyMilestone, HomeRecentCoursesSection,
    HomeRecentCourseCard, HomeFounderDesk,
    HomeStudentReelsSection, HomeStudentReel,
    HomeLearnerReviewsSection, HomeLearnerReview,
    HomeAIEcosystemSection, HomeAIEcosystemCard,
    HomeCTASection,
    Course,
)
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS, ALLOWED_DOC_EXTENSIONS, MAX_IMAGE_SIZE_BYTES

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
)

# Pydantic Schemas

class EmailSettingsSchema(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None  # write field (accepted on PUT)
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    use_tls: bool = True

class EmailSettingsResponse(BaseModel):
    """Same as EmailSettingsSchema but smtp_password is masked for security."""
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None  # always None in GET — write-only
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    use_tls: bool = True
    has_password: bool = False  # tells frontend whether a password is saved

class TestEmailRequest(BaseModel):
    test_email: str

@router.get("/email", response_model=EmailSettingsResponse)
async def get_email_settings(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Retrieve the global email settings. Password is never returned for security."""
    settings = db.query(EmailSettings).first()
    if not settings:
        return EmailSettingsResponse()
    return EmailSettingsResponse(
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_user=settings.smtp_user,
        smtp_password=None,  # never expose password
        from_email=settings.from_email,
        from_name=settings.from_name,
        use_tls=settings.use_tls,
        has_password=bool(settings.smtp_password),
    )

@router.put("/email", response_model=EmailSettingsSchema)
async def update_email_settings(req: EmailSettingsSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update the email settings."""
    settings = db.query(EmailSettings).first()
    if not settings:
        settings = EmailSettings()
        db.add(settings)
    
    settings.smtp_host = req.smtp_host
    settings.smtp_port = req.smtp_port
    settings.smtp_user = req.smtp_user
    if req.smtp_password:
        settings.smtp_password = req.smtp_password
    settings.from_email = req.from_email
    settings.from_name = req.from_name
    settings.use_tls = req.use_tls
    
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/email/test")
async def test_email_configuration(req: TestEmailRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Send a test email using the currently saved SMTP configuration."""
    settings = db.query(EmailSettings).first()
    if not settings or not settings.smtp_host or not settings.smtp_user or not settings.from_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete SMTP configuration. Please configure and save settings first."
        )

    try:
        msg = EmailMessage()
        msg.set_content(
            "Hello,\n\nThis is a test message from your IINM Platform to verify the SMTP configuration.\n\n"
            "If you received this, your email settings are correct.\n\n"
            "Best Regards,\nIINM System Administrator"
        )
        msg['Subject'] = 'IINM Platform: Test SMTP Connection'
        msg['From'] = f"{settings.from_name} <{settings.from_email}>" if settings.from_name else settings.from_email
        msg['To'] = req.test_email

        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587)
        if settings.use_tls:
            server.starttls()
        
        if settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
            
        server.send_message(msg)
        server.quit()
        
        return {"status": "success", "message": "Test email sent successfully"}
    except Exception as e:
        logging.error(f"SMTP Test Failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )

# ══════════════════════════════════════════════════════
#  SITE SETTINGS
# ══════════════════════════════════════════════════════

class SiteSettingsSchema(BaseModel):
    site_name: Optional[str] = None
    logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    meta_description: Optional[str] = None
    promo_video_url: Optional[str] = None
    analytics_id: Optional[str] = None
    bing_webmaster_id: Optional[str] = None
    notification_bar_text: Optional[str] = None
    notification_bar_items: Optional[str] = None
    ticker_speed: Optional[int] = None
    ticker_animation_type: Optional[str] = None
    ticker_bg_color: Optional[str] = None
    ticker_text_color: Optional[str] = None
    ticker_label_bg_color: Optional[str] = None
    ticker_label_text_color: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    maintenance_title: Optional[str] = None
    maintenance_message: Optional[str] = None
    maintenance_video_url: Optional[str] = None
    maintenance_bg_image_url: Optional[str] = None

@router.get("/site")
async def get_site_settings(db: Session = Depends(get_db)):
    """Retrieve the global site settings. Public endpoint."""
    settings = db.query(SiteSettings).first()
    if not settings:
        return SiteSettingsSchema()
    return {
        "site_name": settings.site_name,
        "logo_url": rewrite_url(settings.logo_url),
        "dark_logo_url": rewrite_url(settings.dark_logo_url),
        "favicon_url": rewrite_url(settings.favicon_url),
        "meta_description": settings.meta_description,
        "promo_video_url": settings.promo_video_url,
        "analytics_id": settings.analytics_id,
        "bing_webmaster_id": settings.bing_webmaster_id,
        "notification_bar_text": settings.notification_bar_text,
        "notification_bar_items": settings.notification_bar_items,
        "ticker_speed": settings.ticker_speed,
        "ticker_animation_type": settings.ticker_animation_type,
        "ticker_bg_color": settings.ticker_bg_color,
        "ticker_text_color": settings.ticker_text_color,
        "ticker_label_bg_color": settings.ticker_label_bg_color,
        "ticker_label_text_color": settings.ticker_label_text_color,
        "maintenance_mode": settings.maintenance_mode or False,
        "maintenance_title": settings.maintenance_title,
        "maintenance_message": settings.maintenance_message,
        "maintenance_video_url": settings.maintenance_video_url,
        "maintenance_bg_image_url": settings.maintenance_bg_image_url,
    }

@router.put("/site")
async def update_site_settings(req: SiteSettingsSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update the site settings. Only updates fields that are explicitly provided."""
    settings = db.query(SiteSettings).first()
    if not settings:
        settings = SiteSettings()
        db.add(settings)

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(settings, field):
            if isinstance(value, str) and value.strip() == "":
                setattr(settings, field, None)
            else:
                setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return {
        "site_name": settings.site_name,
        "logo_url": settings.logo_url,
        "dark_logo_url": settings.dark_logo_url,
        "favicon_url": settings.favicon_url,
        "meta_description": settings.meta_description,
        "promo_video_url": settings.promo_video_url,
        "analytics_id": settings.analytics_id,
        "bing_webmaster_id": settings.bing_webmaster_id,
        "notification_bar_text": settings.notification_bar_text,
        "notification_bar_items": settings.notification_bar_items,
        "ticker_speed": settings.ticker_speed,
        "ticker_animation_type": settings.ticker_animation_type,
        "ticker_bg_color": settings.ticker_bg_color,
        "ticker_text_color": settings.ticker_text_color,
        "ticker_label_bg_color": settings.ticker_label_bg_color,
        "ticker_label_text_color": settings.ticker_label_text_color,
        "maintenance_mode": settings.maintenance_mode or False,
        "maintenance_title": settings.maintenance_title,
        "maintenance_message": settings.maintenance_message,
        "maintenance_video_url": settings.maintenance_video_url,
        "maintenance_bg_image_url": settings.maintenance_bg_image_url,
    }

# ══════════════════════════════════════════════════════
#  MAINTENANCE STATUS (Public)
# ══════════════════════════════════════════════════════

class MaintenanceStatusResponse(BaseModel):
    maintenance_mode: bool = False
    maintenance_title: Optional[str] = None
    maintenance_message: Optional[str] = None
    maintenance_video_url: Optional[str] = None
    maintenance_bg_image_url: Optional[str] = None

@router.get("/maintenance", response_model=MaintenanceStatusResponse)
async def get_maintenance_status(db: Session = Depends(get_db)):
    """Public endpoint to check if the site is in maintenance mode."""
    settings = db.query(SiteSettings).first()
    if not settings:
        return MaintenanceStatusResponse()
    return MaintenanceStatusResponse(
        maintenance_mode=settings.maintenance_mode or False,
        maintenance_title=settings.maintenance_title,
        maintenance_message=settings.maintenance_message,
        maintenance_video_url=settings.maintenance_video_url,
        maintenance_bg_image_url=settings.maintenance_bg_image_url,
    )

class NotificationBarUpdate(BaseModel):
    notification_bar_text: Optional[str] = None
    notification_bar_items: Optional[str] = None
    ticker_speed: Optional[int] = None
    ticker_animation_type: Optional[str] = None
    ticker_bg_color: Optional[str] = None
    ticker_text_color: Optional[str] = None
    ticker_label_bg_color: Optional[str] = None
    ticker_label_text_color: Optional[str] = None

@router.put("/site/notification")
async def update_notification_bar(req: NotificationBarUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update only the notification bar text."""
    settings = db.query(SiteSettings).first()
    if not settings:
        settings = SiteSettings()
        db.add(settings)
    settings.notification_bar_text = req.notification_bar_text or None
    if req.notification_bar_items is not None:
        settings.notification_bar_items = req.notification_bar_items or None
    if req.ticker_speed is not None:
        settings.ticker_speed = req.ticker_speed
    if req.ticker_animation_type is not None:
        settings.ticker_animation_type = req.ticker_animation_type
    if req.ticker_bg_color is not None:
        settings.ticker_bg_color = req.ticker_bg_color or None
    if req.ticker_text_color is not None:
        settings.ticker_text_color = req.ticker_text_color or None
    if req.ticker_label_bg_color is not None:
        settings.ticker_label_bg_color = req.ticker_label_bg_color or None
    if req.ticker_label_text_color is not None:
        settings.ticker_label_text_color = req.ticker_label_text_color or None
    db.commit()
    db.refresh(settings)
    return {
        "site_name": settings.site_name,
        "logo_url": settings.logo_url,
        "dark_logo_url": settings.dark_logo_url,
        "favicon_url": settings.favicon_url,
        "meta_description": settings.meta_description,
        "promo_video_url": settings.promo_video_url,
        "analytics_id": settings.analytics_id,
        "bing_webmaster_id": settings.bing_webmaster_id,
        "notification_bar_text": settings.notification_bar_text,
        "notification_bar_items": settings.notification_bar_items,
        "ticker_speed": settings.ticker_speed,
        "ticker_animation_type": settings.ticker_animation_type,
        "ticker_bg_color": settings.ticker_bg_color,
        "ticker_text_color": settings.ticker_text_color,
        "ticker_label_bg_color": settings.ticker_label_bg_color,
        "ticker_label_text_color": settings.ticker_label_text_color,
    }

@router.post("/site/upload")
async def upload_site_image(file: UploadFile = File(...), device: str = Depends(require_device)):
    """Upload an image file and return its URL."""
    allowed_ext = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOC_EXTENSIONS
    ext = validate_upload(file, allowed_ext, max_size=MAX_IMAGE_SIZE_BYTES)
    os.makedirs("uploads", exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/uploads/{filename}"}

@router.post("/site/ticker-icon-upload")
async def upload_ticker_icon(file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Upload a ticker icon to R2 bucket (with local fallback). Returns the URL."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    unique_name = f"ticker-icons/{uuid.uuid4().hex}.{ext}"
    content = await file.read()

    # Try R2 first
    try:
        from models import R2Settings
        import boto3
        r2 = db.query(R2Settings).first()
        if r2 and r2.is_active and r2.account_id and r2.secret_access_key and r2.bucket_name:
            account = (r2.account_id or "").strip()
            if "r2.cloudflarestorage.com" in account:
                endpoint = account if account.startswith("http") else f"https://{account}"
            else:
                endpoint = f"https://{account}.r2.cloudflarestorage.com"
            s3 = boto3.client(service_name="s3", endpoint_url=endpoint, aws_access_key_id=r2.access_key_id, aws_secret_access_key=r2.secret_access_key, region_name="auto")
            s3.put_object(Bucket=r2.bucket_name, Key=unique_name, Body=content, ContentType=file.content_type or "application/octet-stream")
            pub = (r2.public_url or "").rstrip("/")
            return {"url": f"{pub}/{unique_name}" if pub else unique_name}
    except Exception as e:
        logging.warning(f"R2 upload failed for ticker icon, falling back to local: {e}")

    # Local fallback
    os.makedirs("uploads/ticker-icons", exist_ok=True)
    filename = unique_name.split("/")[-1]
    filepath = os.path.join("uploads/ticker-icons", filename)
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    return {"url": f"/uploads/ticker-icons/{filename}"}

# ══════════════════════════════════════════════════════
#  PAYMENT SETTINGS
# ══════════════════════════════════════════════════════

class PaymentSettingsSchema(BaseModel):
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None  # write field (accepted on PUT)
    is_test_mode: bool = True
    currency: str = "INR"

class PaymentSettingsResponse(BaseModel):
    """Same as PaymentSettingsSchema but secret key is masked for security."""
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None  # always None in GET — write-only
    is_test_mode: bool = True
    currency: str = "INR"
    has_secret: bool = False  # tells frontend whether a secret is saved

@router.get("/payment", response_model=PaymentSettingsResponse)
async def get_payment_settings(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Retrieve the global payment settings. Secret key is never returned for security."""
    settings = db.query(PaymentSettings).first()
    if not settings:
        return PaymentSettingsResponse()
    return PaymentSettingsResponse(
        razorpay_key_id=settings.razorpay_key_id,
        razorpay_key_secret=None,  # never expose secret
        is_test_mode=settings.is_test_mode,
        currency=settings.currency,
        has_secret=bool(settings.razorpay_key_secret),
    )

@router.put("/payment", response_model=PaymentSettingsSchema)
async def update_payment_settings(req: PaymentSettingsSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update the payment settings."""
    settings = db.query(PaymentSettings).first()
    if not settings:
        settings = PaymentSettings()
        db.add(settings)

    settings.razorpay_key_id     = req.razorpay_key_id
    if req.razorpay_key_secret:
        settings.razorpay_key_secret = req.razorpay_key_secret
    settings.is_test_mode        = req.is_test_mode
    settings.currency            = req.currency

    db.commit()
    db.refresh(settings)
    return settings

class PublicPaymentSettingsResponse(BaseModel):
    razorpay_key_id: Optional[str] = None
    currency: str = "INR"
    is_test_mode: bool = True

@router.get("/public/payment", response_model=PublicPaymentSettingsResponse)
async def get_public_payment_settings(db: Session = Depends(get_db)):
    """Retrieve public payment settings for frontend checkout."""
    settings = db.query(PaymentSettings).first()
    if not settings:
        return PublicPaymentSettingsResponse()
    return PublicPaymentSettingsResponse(
        razorpay_key_id=settings.razorpay_key_id,
        currency=settings.currency,
        is_test_mode=settings.is_test_mode,
    )

# ══════════════════════════════════════════════════════
#  R2 BUCKET SETTINGS
# ══════════════════════════════════════════════════════
from models import R2Settings
import boto3

class R2SettingsSchema(BaseModel):
    account_id: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    bucket_name: Optional[str] = None
    public_url: Optional[str] = None
    is_active: bool = True

class R2SettingsResponse(BaseModel):
    account_id: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    bucket_name: Optional[str] = None
    public_url: Optional[str] = None
    is_active: bool = True
    has_secret: bool = False

@router.get("/r2", response_model=R2SettingsResponse)
async def get_r2_settings(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Retrieve the R2 Bucket settings. Secret key is masked."""
    settings = db.query(R2Settings).first()
    if not settings:
        return R2SettingsResponse()
    return R2SettingsResponse(
        account_id=settings.account_id,
        access_key_id=settings.access_key_id,
        secret_access_key=None,  # never expose secret
        bucket_name=settings.bucket_name,
        public_url=settings.public_url,
        is_active=settings.is_active,
        has_secret=bool(settings.secret_access_key),
    )

@router.put("/r2", response_model=R2SettingsSchema)
async def update_r2_settings(req: R2SettingsSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update R2 Bucket settings."""
    settings = db.query(R2Settings).first()
    if not settings:
        settings = R2Settings()
        db.add(settings)

    settings.account_id = req.account_id
    settings.access_key_id = req.access_key_id
    if req.secret_access_key:
        settings.secret_access_key = req.secret_access_key
    settings.bucket_name = req.bucket_name
    settings.public_url = req.public_url
    settings.is_active = req.is_active

    db.commit()
    db.refresh(settings)
    return settings

class R2TestRequest(BaseModel):
    account_id: str
    access_key_id: str
    secret_access_key: Optional[str] = None
    bucket_name: Optional[str] = None

@router.post("/r2/test")
async def test_r2_connection(req: R2TestRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Test connection to Cloudflare R2 bucket with provided or saved credentials."""
    secret_key = req.secret_access_key
    if not secret_key:
        settings = db.query(R2Settings).first()
        if settings and settings.secret_access_key:
            secret_key = settings.secret_access_key
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Secret access key is required to test the connection"
            )

    try:
        account_val = req.account_id.strip()
        if "r2.cloudflarestorage.com" in account_val:
            endpoint_url = account_val if account_val.startswith("http") else f"https://{account_val}"
        else:
            endpoint_url = f"https://{account_val}.r2.cloudflarestorage.com"
            
        s3 = boto3.client(
            service_name='s3',
            endpoint_url=endpoint_url,
            aws_access_key_id=req.access_key_id,
            aws_secret_access_key=secret_key,
            region_name="auto"
        )
        # Test access by listing objects or buckets
        if req.bucket_name:
            response = s3.list_objects_v2(Bucket=req.bucket_name, MaxKeys=1)
            msg = f"Successfully connected to Cloudflare R2 bucket '{req.bucket_name}'!"
        else:
            s3.list_buckets()
            msg = "Successfully verified Cloudflare R2 API credentials!"
            
        return {"status": "success", "message": msg}
    except Exception as e:
        logging.error(f"R2 Connection Test Failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed. Please check credentials: {str(e)}"
        )

def _build_s3_client(settings: R2Settings):
    """Helper: build a boto3 S3 client from saved R2 settings."""
    account_val = (settings.account_id or "").strip()
    if "r2.cloudflarestorage.com" in account_val:
        endpoint_url = account_val if account_val.startswith("http") else f"https://{account_val}"
    else:
        endpoint_url = f"https://{account_val}.r2.cloudflarestorage.com"
    return boto3.client(
        service_name="s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.access_key_id,
        aws_secret_access_key=settings.secret_access_key,
        region_name="auto",
    )

@router.get("/r2/stats")
async def get_r2_bucket_stats(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Return real storage stats (total bytes & object count) for the saved R2 bucket."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.account_id or not settings.secret_access_key or not settings.bucket_name:
        raise HTTPException(status_code=400, detail="R2 credentials & bucket name must be saved first.")
    try:
        s3 = _build_s3_client(settings)
        total_bytes = 0
        total_objects = 0
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=settings.bucket_name):
            contents = page.get("Contents", [])
            total_objects += len(contents)
            total_bytes += sum(obj["Size"] for obj in contents)
        return {"total_bytes": total_bytes, "total_objects": total_objects, "bucket_name": settings.bucket_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch stats: {str(e)}")

@router.get("/r2/files")
async def list_r2_files(prefix: str = "", device: str = Depends(require_device), db: Session = Depends(get_db)):
    """List objects/folders inside the R2 bucket at the given prefix (for file manager)."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.account_id or not settings.secret_access_key or not settings.bucket_name:
        raise HTTPException(status_code=400, detail="R2 credentials & bucket name must be saved first.")
    try:
        s3 = _build_s3_client(settings)
        resp = s3.list_objects_v2(
            Bucket=settings.bucket_name,
            Prefix=prefix,
            Delimiter="/"
        )
        folders = [p["Prefix"] for p in resp.get("CommonPrefixes", [])]
        files = [
            {
                "key": obj["Key"],
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
                "name": obj["Key"].replace(prefix, "", 1),
            }
            for obj in resp.get("Contents", [])
            if obj["Key"] != prefix  # skip the folder-itself entry
        ]
        return {
            "prefix": prefix,
            "bucket": settings.bucket_name,
            "public_url": settings.public_url or "",
            "folders": folders,
            "files": files,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to list files: {str(e)}")

# ──────────────────────────────────────────────────────────────────────────────
#  R2 FILE MANAGER — CRUD OPERATIONS
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/r2/upload")
async def upload_to_r2(key: str, file: UploadFile = File(...), device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Upload a file to the R2 bucket at the given key (path)."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.secret_access_key:
        raise HTTPException(status_code=400, detail="R2 credentials must be saved first.")
    try:
        s3 = _build_s3_client(settings)
        content = await file.read()
        s3.put_object(
            Bucket=settings.bucket_name,
            Key=key,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
        )
        public_url = settings.public_url or ""
        file_url = f"{public_url.rstrip('/')}/{key}" if public_url else ""
        return {
            "status": "success",
            "key": key,
            "url": file_url,
            "size": len(content),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

class DeleteFileRequest(BaseModel):
    key: str

@router.delete("/r2/files")
async def delete_r2_file(req: DeleteFileRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a single file (or empty folder marker) from R2."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.secret_access_key:
        raise HTTPException(status_code=400, detail="R2 credentials must be saved first.")
    try:
        s3 = _build_s3_client(settings)
        s3.delete_object(Bucket=settings.bucket_name, Key=req.key)
        return {"status": "success", "key": req.key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete failed: {str(e)}")

class DeleteFolderRequest(BaseModel):
    prefix: str  # must end with /

@router.delete("/r2/folder")
async def delete_r2_folder(req: DeleteFolderRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Recursively delete all objects whose key starts with the prefix."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.secret_access_key:
        raise HTTPException(status_code=400, detail="R2 credentials must be saved first.")
    try:
        s3 = _build_s3_client(settings)
        paginator = s3.get_paginator("list_objects_v2")
        keys_to_delete = []
        for page in paginator.paginate(Bucket=settings.bucket_name, Prefix=req.prefix):
            for obj in page.get("Contents", []):
                keys_to_delete.append({"Key": obj["Key"]})
        if keys_to_delete:
            # Batch delete (max 1000 per request)
            for i in range(0, len(keys_to_delete), 1000):
                s3.delete_objects(
                    Bucket=settings.bucket_name,
                    Delete={"Objects": keys_to_delete[i:i+1000]},
                )
        return {"status": "success", "deleted": len(keys_to_delete)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Folder delete failed: {str(e)}")

class CreateFolderRequest(BaseModel):
    prefix: str   # parent path, e.g. "videos/"
    name: str     # new folder name (no slashes)

@router.post("/r2/folder")
async def create_r2_folder(req: CreateFolderRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a folder marker in R2 by putting a zero-byte object with a trailing slash."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.secret_access_key:
        raise HTTPException(status_code=400, detail="R2 credentials must be saved first.")
    folder_name = req.name.strip("/").replace("/", "_")
    key = f"{req.prefix}{folder_name}/"
    try:
        s3 = _build_s3_client(settings)
        s3.put_object(Bucket=settings.bucket_name, Key=key, Body=b"")
        return {"status": "success", "key": key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Create folder failed: {str(e)}")

class RenameRequest(BaseModel):
    old_key: str
    new_key: str

@router.post("/r2/rename")
async def rename_r2_file(req: RenameRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Rename (move) a file in R2 using copy + delete."""
    settings = db.query(R2Settings).first()
    if not settings or not settings.secret_access_key:
        raise HTTPException(status_code=400, detail="R2 credentials must be saved first.")
    try:
        s3 = _build_s3_client(settings)
        # Copy to new key
        s3.copy_object(
            Bucket=settings.bucket_name,
            CopySource={"Bucket": settings.bucket_name, "Key": req.old_key},
            Key=req.new_key,
        )
        # Delete old key
        s3.delete_object(Bucket=settings.bucket_name, Key=req.old_key)
        return {"status": "success", "old_key": req.old_key, "new_key": req.new_key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Rename failed: {str(e)}")

# ══════════════════════════════════════════════════════
#  AI SETTINGS  (OpenRouter-centric)
# ══════════════════════════════════════════════════════
import httpx

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
OPENROUTER_AUTH_URL = "https://openrouter.ai/api/v1/auth/key"

class AISettingsWriteSchema(BaseModel):
    gemini_api_key: Optional[str] = None
    selected_model: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    model_exam_text: Optional[str] = None
    model_image_reply: Optional[str] = None
    model_video_reply: Optional[str] = None
    model_file_read: Optional[str] = None
    model_general_text: Optional[str] = None
    model_thinking: Optional[str] = None
    model_live_doubt: Optional[str] = None
    is_active: bool = True

class AISettingsResponse(BaseModel):
    selected_model: Optional[str] = None
    is_active: bool = True
    has_gemini_key: bool = False
    has_openrouter_key: bool = False
    model_exam_text: Optional[str] = None
    model_image_reply: Optional[str] = None
    model_video_reply: Optional[str] = None
    model_file_read: Optional[str] = None
    model_general_text: Optional[str] = None
    model_thinking: Optional[str] = None
    model_live_doubt: Optional[str] = None

@router.get("/ai", response_model=AISettingsResponse)
async def get_ai_settings(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Retrieve AI settings. API keys are hidden."""
    settings = db.query(AISettings).first()
    if not settings:
        return AISettingsResponse()
    return AISettingsResponse(
        selected_model=settings.selected_model,
        is_active=settings.is_active,
        has_gemini_key=bool(settings.gemini_api_key),
        has_openrouter_key=bool(settings.openrouter_api_key),
        model_exam_text=settings.model_exam_text,
        model_image_reply=settings.model_image_reply,
        model_video_reply=settings.model_video_reply,
        model_file_read=settings.model_file_read,
        model_general_text=settings.model_general_text,
        model_thinking=settings.model_thinking,
        model_live_doubt=settings.model_live_doubt,
    )

@router.put("/ai", response_model=AISettingsWriteSchema)
async def update_ai_settings(req: AISettingsWriteSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update AI settings."""
    settings = db.query(AISettings).first()
    if not settings:
        settings = AISettings()
        db.add(settings)

    if req.gemini_api_key:
        settings.gemini_api_key = req.gemini_api_key
    if req.openrouter_api_key:
        settings.openrouter_api_key = req.openrouter_api_key
    settings.selected_model = req.selected_model
    settings.model_exam_text = req.model_exam_text
    settings.model_image_reply = req.model_image_reply
    settings.model_video_reply = req.model_video_reply
    settings.model_file_read = req.model_file_read
    settings.model_general_text = req.model_general_text
    settings.model_thinking = req.model_thinking
    settings.model_live_doubt = req.model_live_doubt
    settings.is_active = req.is_active

    db.commit()
    db.refresh(settings)
    return AISettingsWriteSchema(
        gemini_api_key=None,
        selected_model=settings.selected_model,
        openrouter_api_key=None,
        model_exam_text=settings.model_exam_text,
        model_image_reply=settings.model_image_reply,
        model_video_reply=settings.model_video_reply,
        model_file_read=settings.model_file_read,
        model_general_text=settings.model_general_text,
        model_thinking=settings.model_thinking,
        model_live_doubt=settings.model_live_doubt,
        is_active=settings.is_active,
    )

class OpenRouterTestRequest(BaseModel):
    api_key: Optional[str] = None

@router.post("/ai/openrouter/test")
async def test_openrouter_connection(req: OpenRouterTestRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Test OpenRouter API key by fetching key info and models."""
    api_key = req.api_key
    if not api_key:
        settings = db.query(AISettings).first()
        if settings and settings.openrouter_api_key:
            api_key = settings.openrouter_api_key
        else:
            raise HTTPException(status_code=400, detail="OpenRouter API Key is required to test")

    try:
        async with httpx.AsyncClient() as client:
            # Verify key info
            auth_resp = await client.get(
                OPENROUTER_AUTH_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=20.0,
            )
            key_info = None
            if auth_resp.status_code == 200:
                key_info = auth_resp.json()
            else:
                try:
                    err = auth_resp.json()
                    detail = err.get("error", {}).get("message", err.get("message", "Invalid API Key"))
                except Exception:
                    detail = "Invalid API Key or Server Error"
                raise HTTPException(status_code=400, detail=f"Authentication failed: {detail}")

            # Fetch models
            models_resp = await client.get(OPENROUTER_MODELS_URL, timeout=30.0)
            models_data = []
            if models_resp.status_code == 200:
                models_data = models_resp.json().get("data", [])

            return {
                "status": "success",
                "message": "Successfully connected to OpenRouter",
                "key_info": key_info,
                "models": models_data,
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Network Error: {str(e)}")

@router.get("/ai/openrouter/models")
async def list_openrouter_models(db: Session = Depends(get_db)):
    """Fetch all models from OpenRouter (public proxy). Cached lightly via client."""
    settings = db.query(AISettings).first()
    api_key = settings.openrouter_api_key if settings else None
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(OPENROUTER_MODELS_URL, headers=headers, timeout=30.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                raise HTTPException(status_code=502, detail="Failed to fetch models from OpenRouter")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Network Error: {str(e)}")


# ══════════════════════════════════════════════════════
#  AI GENERATE QUESTIONS
# ══════════════════════════════════════════════════════

class GenerateQuestionsRequest(BaseModel):
    prompt: str
    question_type_code: str
    question_type_name: str
    num_questions: int = 5
    # Settings parameters
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    tags: Optional[str] = None
    topic: Optional[str] = None
    difficulty_level: Optional[str] = "medium"
    default_marks: Optional[float] = 1.0
    default_time_to_solve: Optional[int] = 60
    # Optional base64-encoded file attachments
    attachments: Optional[List[dict]] = None  # [{name, mime_type, data_base64}]
    audio_transcript: Optional[str] = None
    model: Optional[str] = None  # Override model for this request


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _extract_json(text) -> dict:
    """Robustly extract JSON from AI response, handling markdown code blocks."""
    if text is None:
        raise ValueError("AI returned empty content (null)")
    text = str(text).strip()
    if not text:
        raise ValueError("AI returned empty content")
    # Try direct JSON parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting from ```json ... ``` code block
    import re
    code_block = re.search(r'```(?:json)?\s*(\{.*\})\s*```', text, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass
    # Try finding the outermost JSON object
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    raise ValueError("Unable to parse AI response as JSON")


async def _call_openrouter_chat(api_key: str, model: str, system_prompt: str, user_content, max_tokens: int = 8192):
    """Helper to call OpenRouter chat completions API."""
    url = f"{OPENROUTER_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://iinm.com",
        "X-Title": "IINM",
    }
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ]
    body = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code != 200:
            err = f"OpenRouter error: HTTP {resp.status_code}"
            try:
                err_data = resp.json()
                if isinstance(err_data, dict):
                    error_obj = err_data.get("error")
                    if isinstance(error_obj, dict):
                        err = error_obj.get("message", err)
                    elif isinstance(error_obj, str):
                        err = error_obj
                    elif "message" in err_data:
                        err = err_data["message"]
                elif isinstance(err_data, str):
                    err = err_data
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=err)
        try:
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Invalid JSON from OpenRouter: {e}")
        choices = data.get("choices") if isinstance(data, dict) else None
        if not isinstance(choices, list) or len(choices) == 0:
            raise HTTPException(status_code=502, detail="OpenRouter returned no choices")
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        if not isinstance(message, dict):
            raise HTTPException(status_code=502, detail="OpenRouter returned malformed message")
        content = message.get("content")
        if content is None:
            # Some reasoning models return reasoning/reasoning_content separately
            reasoning = message.get("reasoning") or message.get("reasoning_content")
            if reasoning:
                return str(reasoning)
            raise HTTPException(status_code=502, detail="OpenRouter returned empty content (model may be unavailable or returned a refusal)")
        return content


@router.post("/ai/generate")
async def generate_questions_with_ai(req: GenerateQuestionsRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Use OpenRouter API to generate questions based on the provided prompt and parameters."""
    settings = db.query(AISettings).first()
    if not settings or not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured. Please set it in AI Settings.")

    api_key = settings.openrouter_api_key
    model = req.model or settings.model_general_text or "openai/gpt-4o-mini"

    # Build the system instruction for structured output
    type_instructions = {
        "SAQ": "Short Answer Questions — each question has a 'question_html' (the question text in HTML) and an 'answers' array of accepted string answers.",
        "MCQ": "Multiple Choice Questions (single correct) — each question has 'question_html' and 'options': [{content_html, is_correct}] with exactly ONE option marked is_correct: true.",
        "MAQ": "Multiple Answer Questions — like MCQ but can have multiple correct options.",
        "TF": "True/False Questions — each question has 'question_html' and 'options': [{content_html: 'True', is_correct: bool}, {content_html: 'False', is_correct: bool}].",
        "FB": "Fill in the Blank — each question has 'question_html' with a blank indicated by _____ and 'answers': ['correct answer'].",
        "MTF": "Match the Following — each question has 'question_html' and 'options': [{content_html: 'A - X', is_correct: true}] for each pair.",
    }
    
    type_hint = type_instructions.get(req.question_type_code.upper(), f"{req.question_type_name} questions")
    
    system_prompt = f"""You are an expert educational content creator. Generate exactly {req.num_questions} {req.question_type_name} ({req.question_type_code}) questions.

Format rules:
- {type_hint}
- All text fields use basic HTML (bold with <b>, italic with <i>, lists with <ul><li>, etc.)
- topic: "{req.topic or 'General'}"
- difficulty_level: "{req.difficulty_level}"
- default_marks: {req.default_marks}
- default_time_to_solve: {req.default_time_to_solve} (seconds)

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "questions": [
    {{
      "question_html": "<p>Question text here</p>",
      "options": [{{"content_html": "<p>Option text</p>", "is_correct": false}}],
      "answers": ["answer text"],
      "solution_html": "<p>Explanation here</p>",
      "hint_html": "<p>Hint here</p>",
      "topic": "{req.topic or 'General'}",
      "difficulty_level": "{req.difficulty_level}",
      "default_marks": {req.default_marks},
      "default_time_to_solve": {req.default_time_to_solve}
    }}
  ]
}}

For SAQ/FB, provide "answers" array and empty "options": [].
For MCQ/MAQ/TF/MTF, provide "options" array and empty "answers": [].
"""

    # Build OpenAI-compatible user content (text + image attachments)
    user_content = []
    user_content.append({"type": "text", "text": f"User prompt:\n{req.prompt}"})

    # Add audio transcript if provided
    if req.audio_transcript:
        user_content.append({"type": "text", "text": f"\nAudio transcript:\n{req.audio_transcript}"})

    # Add file attachments if provided
    if req.attachments:
        for att in req.attachments[:3]:  # max 3
            if att.get("data_base64") and att.get("mime_type"):
                mime = att["mime_type"]
                b64 = att["data_base64"]
                if mime.startswith("image/"):
                    user_content.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"}
                    })
                else:
                    user_content.append({
                        "type": "text",
                        "text": f"\n[Attached file: {att.get('name', 'file')} ({mime})]"
                    })

    try:
        raw_text = await _call_openrouter_chat(api_key, model, system_prompt, user_content, max_tokens=8192)

        try:
            result = _extract_json(raw_text)
            questions = result.get("questions", [])
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))

        # Enrich each question with the request parameters
        for q in questions:
            q["question_type_code"] = req.question_type_code.upper()
            q["question_type_name"] = req.question_type_name
            q["category_id"] = req.category_id
            q["subcategory_id"] = req.subcategory_id
            q["tags"] = req.tags
            if "topic" not in q: q["topic"] = req.topic
            if "difficulty_level" not in q: q["difficulty_level"] = req.difficulty_level
            if "default_marks" not in q: q["default_marks"] = req.default_marks
            if "default_time_to_solve" not in q: q["default_time_to_solve"] = req.default_time_to_solve

        return {"status": "success", "questions": questions, "model_used": model}
    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


# ══════════════════════════════════════════════════════
#  AI GENERATE BLOG
# ══════════════════════════════════════════════════════

class GenerateBlogRequest(BaseModel):
    prompt: str
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    tone: Optional[str] = "Professional"
    length: Optional[str] = "Medium"
    model: Optional[str] = None  # Override model for this request

@router.post("/ai/generate_blog")
async def generate_blog_with_ai(req: GenerateBlogRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Use OpenRouter API to generate a highly professional, SEO-optimized blog post."""
    settings = db.query(AISettings).first()
    if not settings or not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured. Please set it in AI Settings.")

    api_key = settings.openrouter_api_key
    model = req.model or settings.model_general_text or "openai/gpt-4o-mini"

    length_map = {"Short": "~300 words", "Medium": "~600 words", "Long": "~1000+ words"}
    target_length = length_map.get(req.length, "~600 words")

    context_str = ""
    if req.category_name:
        context_str += f"\n- Target Category: {req.category_name}"
    if req.subcategory_name:
        context_str += f"\n- Target Sub-category: {req.subcategory_name}"

    system_prompt = f"""You are an expert, professional blog writer and SEO specialist.
Generate a highly engaging, informative, and SEO-optimized blog post based on the user's prompt.

Rules:
- Tone: {req.tone}
- Approximate Length: {target_length}{context_str}
- The 'content_html' MUST be beautifully formatted using HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>).
- Do NOT use markdown in the HTML output. Use clean HTML.
- Generate an SEO-friendly Title.
- Generate a compelling Excerpt (short meta description).
- Generate 4 to 8 relevant Tags as an array of strings.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "title": "Generated SEO Title",
  "excerpt": "Generated short excerpt",
  "content_html": "<h2>Heading</h2><p>Paragraph content...</p>",
  "tags": ["Tag1", "Tag2", "Tag3"]
}}
"""

    user_content = f"User prompt:\n{req.prompt}"

    try:
        raw_text = await _call_openrouter_chat(api_key, model, system_prompt, user_content, max_tokens=8192)
        try:
            result = _extract_json(raw_text)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"status": "success", "data": result, "model_used": model}
    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")

# ══════════════════════════════════════════════════════
#  AI GENERATE SOCIAL SNIPPETS
# ══════════════════════════════════════════════════════

class GenerateSocialSnippetRequest(BaseModel):
    title: str
    content: str
    platforms: List[str] = ["Twitter", "LinkedIn", "Facebook"]
    model: Optional[str] = None  # Override model for this request

@router.post("/ai/generate_social_snippet")
async def generate_social_snippet(req: GenerateSocialSnippetRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Use OpenRouter API to generate social media snippets from a blog post."""
    settings = db.query(AISettings).first()
    if not settings or not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured.")

    api_key = settings.openrouter_api_key
    model = req.model or settings.model_general_text or "openai/gpt-4o-mini"

    platforms_str = ", ".join(req.platforms)

    system_prompt = f"""You are an expert Social Media Manager.
Generate highly engaging social media snippets to promote a blog post.

Rules:
- Generate one snippet for EACH of these platforms: {platforms_str}
- Tailor the tone and length to the specific platform (e.g., Twitter should have hashtags and be short, LinkedIn should be professional and slightly longer).
- Include relevant emojis.

Return ONLY valid JSON in this exact format:
{{
  "snippets": [
    {{ "platform": "Twitter", "content": "..." }},
    {{ "platform": "LinkedIn", "content": "..." }}
  ]
}}
"""

    user_content = f"Blog Title: {req.title}\n\nBlog Content snippet:\n{req.content[:2000]}..."

    try:
        raw_text = await _call_openrouter_chat(api_key, model, system_prompt, user_content, max_tokens=2048)
        try:
            result = _extract_json(raw_text)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"status": "success", "data": result, "model_used": model}
    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


# ══════════════════════════════════════════════════════
#  AI GENERATE CHAPTERS FROM PDF
# ══════════════════════════════════════════════════════

class GenerateChaptersRequest(BaseModel):
    pdf_base64: str
    prompt: Optional[str] = None
    subject_name: str
    model: Optional[str] = None


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyPDF2."""
    import io
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n\n".join(text_parts)


@router.post("/ai/generate_chapters")
async def generate_chapters_with_ai(req: GenerateChaptersRequest, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Use OpenRouter API to generate curriculum chapters from an uploaded PDF syllabus."""
    import base64

    settings = db.query(AISettings).first()
    if not settings or not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured. Please set it in AI Settings.")

    api_key = settings.openrouter_api_key
    model = req.model or settings.model_file_read or settings.model_general_text or "openai/gpt-4o-mini"

    # Decode PDF and extract text
    try:
        pdf_bytes = base64.b64decode(req.pdf_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF file data.")

    try:
        pdf_text = _extract_pdf_text(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

    if not pdf_text.strip():
        raise HTTPException(status_code=400, detail="The uploaded PDF contains no extractable text. It may be a scanned image PDF.")

    # Truncate to ~50K chars to avoid token overflow
    if len(pdf_text) > 50000:
        pdf_text = pdf_text[:50000] + "\n\n[... content truncated ...]"

    prompt_hint = ""
    if req.prompt and req.prompt.strip():
        prompt_hint = f"\n\nAdditional instructions from the admin:\n{req.prompt.strip()}"

    system_prompt = f"""You are an expert curriculum designer for an educational platform.
Analyze the provided PDF syllabus content for the subject "{req.subject_name}" and generate well-structured chapters.

Rules:
- Identify logical chapter boundaries from the PDF content.
- Each chapter must have a clear, concise "title" (e.g. "Chapter 1: Introduction to Machine Learning").
- Each chapter must have a "content" field with a brief 1-3 sentence summary of what the chapter covers.
- Generate between 3 and 20 chapters depending on the content available.
- Do NOT include page numbers or references in the titles.
- Titles should be student-friendly and professional.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "chapters": [
    {{
      "title": "Chapter 1: Title Here",
      "content": "Brief summary of the chapter content."
    }}
  ]
}}
"""

    user_content = f"PDF Syllabus Content for subject '{req.subject_name}':\n\n{pdf_text}{prompt_hint}"

    try:
        raw_text = await _call_openrouter_chat(api_key, model, system_prompt, user_content, max_tokens=8192)
        try:
            result = _extract_json(raw_text)
            chapters = result.get("chapters", [])
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))

        if not chapters:
            raise HTTPException(status_code=500, detail="AI returned no chapters. Try a different model or adjust your prompt.")

        return {"status": "success", "chapters": chapters, "model_used": model}
    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


# ──────────────────────────────────────────────────
# DYNAMIC NAVBAR CMS
# ──────────────────────────────────────────────────

class NavbarItemCreateSchema(BaseModel):
    parent_id: Optional[int] = None
    title: str
    link: Optional[str] = None
    badge: Optional[str] = None
    description: Optional[str] = None
    item_type: str = "main"
    order_position: int = 0
    icon: Optional[str] = None
    meta_data: Optional[str] = None

class NavbarItemResponseSchema(BaseModel):
    id: int
    parent_id: Optional[int] = None
    title: str
    link: Optional[str] = None
    badge: Optional[str] = None
    description: Optional[str] = None
    item_type: str
    order_position: int
    icon: Optional[str] = None
    meta_data: Optional[str] = None
    sub_items: List["NavbarItemResponseSchema"] = []

    class Config:
        from_attributes = True

NavbarItemResponseSchema.model_rebuild()


def seed_navbar_data(db: Session):
    # Seeder function to populate initial navbar structures
    # Main Items
    home = NavbarItem(title="Home", link="/", item_type="main", order_position=0)
    courses = NavbarItem(title="Courses", item_type="dropdown", order_position=1)
    about = NavbarItem(title="About Us", item_type="dropdown", order_position=2)
    contact = NavbarItem(title="Contact Us", link="/contact-us", item_type="main", order_position=3)
    
    db.add_all([home, courses, about, contact])
    db.flush() # flush to get dropdown parent IDs
    
    # ─── Courses Sidebar Subcategories ───
    c_side1 = NavbarItem(parent_id=courses.id, title="Learn AI", item_type="sidebar_item", icon="🧠", order_position=0)
    c_side2 = NavbarItem(parent_id=courses.id, title="Career Prep", item_type="sidebar_item", icon="💼", order_position=1)
    c_side3 = NavbarItem(parent_id=courses.id, title="Certifications", item_type="sidebar_item", icon="🏆", order_position=2)
    db.add_all([c_side1, c_side2, c_side3])
    db.flush() # flush to get sidebar item IDs
    
    # Courses content items (nested INSIDE each sidebar subcategory)
    c_cont1 = NavbarItem(parent_id=c_side1.id, title="Advanced AI & Data Science", link="/courses", badge="FLAGSHIP", description="11-Month intensive course with high-tier advisor Advisory Board panel", item_type="content_item", order_position=0)
    c_cont2 = NavbarItem(parent_id=c_side2.id, title="Full Stack AI Engineering", link="/courses", badge="POPULAR", description="Full focus on LLMs, Fine-Tuning models, and scalable AI apps", item_type="content_item", order_position=0)
    c_cont3 = NavbarItem(parent_id=c_side3.id, title="AI Product Leadership", link="/courses", badge="MANAGEMENT", description="Strategic advisory & scaling for team leads, project managers & directors", item_type="content_item", order_position=0)
    
    # Courses footer
    c_foot = NavbarItem(parent_id=courses.id, title="Apply now to secure merit-based scholarships worth up to ₹7,00,000! ➔", link="/contact-us", meta_data="linear-gradient(135deg, #e63946 0%, #cb2d39 100%)", item_type="footer_cta", order_position=0)
    
    # ─── About Us Sidebar Subcategories ───
    a_side1 = NavbarItem(parent_id=about.id, title="Institutions", item_type="sidebar_item", icon="🏛️", order_position=0)
    a_side2 = NavbarItem(parent_id=about.id, title="Milestones", item_type="sidebar_item", icon="🌟", order_position=1)
    a_side3 = NavbarItem(parent_id=about.id, title="Support Channels", item_type="sidebar_item", icon="📞", order_position=2)
    db.add_all([a_side1, a_side2, a_side3])
    db.flush() # flush to get sidebar item IDs
    
    # About Us content items (nested INSIDE each sidebar subcategory)
    a_cont1 = NavbarItem(parent_id=a_side1.id, title="Vision & Mission", link="/about-us", badge="FOUNDATION", description="Driving next-generation tech and AI connected learning pathways", item_type="content_item", order_position=0)
    a_cont2 = NavbarItem(parent_id=a_side2.id, title="Academic Advisory Board", link="/about-us", badge="EXPERT PANEL", description="Industry advisory board guiding syllabus relevancy", item_type="content_item", order_position=0)
    a_cont3 = NavbarItem(parent_id=a_side3.id, title="Success Stories", link="/about-us", badge="ALUMNI", description="Learn how top Indian alumni achieved premium global placements", item_type="content_item", order_position=0)
    
    # About Us footer
    a_foot = NavbarItem(parent_id=about.id, title="Explore Advisory Panel details and verified student callbacks! ➔", link="/contact-us", meta_data="linear-gradient(135deg, #0a1628 0%, #152d4c 100%)", item_type="footer_cta", order_position=0)
    
    db.add_all([c_cont1, c_cont2, c_cont3, c_foot, a_cont1, a_cont2, a_cont3, a_foot])
    db.commit()


@router.get("/navbar", response_model=List[NavbarItemResponseSchema])
async def get_navbar_structure(db: Session = Depends(get_db)):
    """Retrieve the full hierarchical website navigation menu structure. Public endpoint."""
    items = db.query(NavbarItem).filter(NavbarItem.parent_id == None).order_by(NavbarItem.order_position).all()
    if not items:
        # Seed and retry
        seed_navbar_data(db)
        items = db.query(NavbarItem).filter(NavbarItem.parent_id == None).order_by(NavbarItem.order_position).all()
    return items


@router.post("/navbar", response_model=NavbarItemResponseSchema)
async def create_navbar_item(req: NavbarItemCreateSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Add a new website navigation element."""
    item = NavbarItem(
        parent_id=req.parent_id,
        title=req.title,
        link=req.link,
        badge=req.badge,
        description=req.description,
        item_type=req.item_type,
        order_position=req.order_position,
        icon=req.icon,
        meta_data=req.meta_data,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/navbar/{item_id}", response_model=NavbarItemResponseSchema)
async def update_navbar_item(item_id: int, req: NavbarItemCreateSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Modify an existing website navigation element."""
    item = db.query(NavbarItem).filter(NavbarItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Navbar item not found")
    
    item.parent_id = req.parent_id
    item.title = req.title
    item.link = req.link
    item.badge = req.badge
    item.description = req.description
    item.item_type = req.item_type
    item.order_position = req.order_position
    item.icon = req.icon
    item.meta_data = req.meta_data
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/navbar/{item_id}")
async def delete_navbar_item(item_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a website navigation element and all of its sub-elements recursively."""
    item = db.query(NavbarItem).filter(NavbarItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Navbar item not found")
    
    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Menu item deleted successfully"}


# ══════════════════════════════════════════════════════
#  FOOTER MENU CMS
# ══════════════════════════════════════════════════════

class FooterMenuItemSchema(BaseModel):
    id: Optional[int] = None
    title: str
    link: Optional[str] = None
    order_position: int = 0

class FooterMenuGroupSchema(BaseModel):
    id: Optional[int] = None
    title: str
    order_position: int = 0
    items: List[FooterMenuItemSchema] = []

class FooterBottomLinkSchema(BaseModel):
    id: Optional[int] = None
    title: str
    link: Optional[str] = None
    order_position: int = 0

class FooterMenuFullSchema(BaseModel):
    groups: List[FooterMenuGroupSchema]
    bottom_links: List[FooterBottomLinkSchema]


def seed_footer_menu_data(db: Session):
    """Seed default footer menu matching current website footer."""
    groups_data = [
        {
            "title": "Company",
            "order_position": 0,
            "items": [
                {"title": "About", "link": "/about-us", "order_position": 0},
                {"title": "Careers", "link": "/courses", "order_position": 1},
                {"title": "Contact", "link": "/contact-us", "order_position": 2},
                {"title": "Blog", "link": "/", "order_position": 3},
            ],
        },
        {
            "title": "Resources",
            "order_position": 1,
            "items": [
                {"title": "Courses", "link": "/courses", "order_position": 0},
                {"title": "Curriculum", "link": "/courses", "order_position": 1},
                {"title": "Labs", "link": "/about-us", "order_position": 2},
                {"title": "Projects", "link": "/courses", "order_position": 3},
            ],
        },
        {
            "title": "Plans",
            "order_position": 2,
            "items": [
                {"title": "For Individuals", "link": "/courses", "order_position": 0},
                {"title": "For Students", "link": "/courses", "order_position": 1},
                {"title": "For Business", "link": "/contact-us", "order_position": 2},
                {"title": "Discounts", "link": "/courses", "order_position": 3},
            ],
        },
        {
            "title": "Subjects",
            "order_position": 3,
            "items": [
                {"title": "AI", "link": "/courses", "order_position": 0},
                {"title": "Machine Learning", "link": "/courses", "order_position": 1},
                {"title": "Data Science", "link": "/courses", "order_position": 2},
                {"title": "Robotics", "link": "/courses", "order_position": 3},
                {"title": "Python", "link": "/courses", "order_position": 4},
                {"title": "Cloud Computing", "link": "/courses", "order_position": 5},
            ],
        },
        {
            "title": "Career Building",
            "order_position": 4,
            "items": [
                {"title": "Career Paths", "link": "/courses", "order_position": 0},
                {"title": "Interview Prep", "link": "/contact-us", "order_position": 1},
                {"title": "Certifications", "link": "/courses", "order_position": 2},
                {"title": "Placements", "link": "/contact-us", "order_position": 3},
            ],
        },
    ]

    for g_data in groups_data:
        group = FooterMenuGroup(
            title=g_data["title"],
            order_position=g_data["order_position"],
        )
        db.add(group)
        db.flush()
        for i_data in g_data["items"]:
            item = FooterMenuItem(
                group_id=group.id,
                title=i_data["title"],
                link=i_data["link"],
                order_position=i_data["order_position"],
            )
            db.add(item)

    bottom_data = [
        {"title": "Privacy Policy", "link": "/", "order_position": 0},
        {"title": "Cookie Policy", "link": "/", "order_position": 1},
        {"title": "Terms", "link": "/", "order_position": 2},
    ]
    for b_data in bottom_data:
        db.add(FooterBottomLink(
            title=b_data["title"],
            link=b_data["link"],
            order_position=b_data["order_position"],
        ))

    db.commit()


@router.get("/footer-menu", response_model=FooterMenuFullSchema)
async def get_footer_menu(db: Session = Depends(get_db)):
    """Retrieve the full footer menu structure. Public endpoint."""
    groups = db.query(FooterMenuGroup).order_by(FooterMenuGroup.order_position).all()
    if not groups:
        seed_footer_menu_data(db)
        groups = db.query(FooterMenuGroup).order_by(FooterMenuGroup.order_position).all()

    bottom_links = db.query(FooterBottomLink).order_by(FooterBottomLink.order_position).all()

    return {
        "groups": [
            {
                "id": g.id,
                "title": g.title,
                "order_position": g.order_position,
                "items": [
                    {"id": i.id, "title": i.title, "link": i.link, "order_position": i.order_position}
                    for i in g.items
                ],
            }
            for g in groups
        ],
        "bottom_links": [
            {"id": b.id, "title": b.title, "link": b.link, "order_position": b.order_position}
            for b in bottom_links
        ],
    }


@router.put("/footer-menu")
async def update_footer_menu(
    req: FooterMenuFullSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Replace the entire footer menu structure (full sync)."""
    # Delete existing groups (cascades to items) and bottom links
    db.query(FooterMenuGroup).delete(synchronize_session=False)
    db.query(FooterBottomLink).delete(synchronize_session=False)
    db.flush()

    # Re-create groups and items
    for g_data in req.groups:
        group = FooterMenuGroup(
            title=g_data.title,
            order_position=g_data.order_position,
        )
        db.add(group)
        db.flush()
        for i_data in g_data.items:
            db.add(FooterMenuItem(
                group_id=group.id,
                title=i_data.title,
                link=i_data.link,
                order_position=i_data.order_position,
            ))

    for b_data in req.bottom_links:
        db.add(FooterBottomLink(
            title=b_data.title,
            link=b_data.link,
            order_position=b_data.order_position,
        ))

    db.commit()
    return {"status": "success", "message": "Footer menu updated successfully"}


# ══════════════════════════════════════════════════════
#  HOME HERO CONTENT
# ══════════════════════════════════════════════════════

@router.get("/hero")
async def get_hero_content(db: Session = Depends(get_db)):
    """Retrieve the homepage hero slider content. Public endpoint."""
    record = db.query(HomeHeroContent).first()
    if not record or not record.content_json:
        return {"content": None}
    try:
        data = json.loads(record.content_json)
    except Exception:
        return {"content": None}
    return {"content": data}


class HeroContentUpdate(BaseModel):
    content_json: str

@router.put("/hero")
async def update_hero_content(req: HeroContentUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update the homepage hero slider content. Protected endpoint."""
    # Validate JSON
    try:
        parsed = json.loads(req.content_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON content")

    record = db.query(HomeHeroContent).first()
    if not record:
        record = HomeHeroContent()
        db.add(record)

    record.content_json = req.content_json
    db.commit()
    db.refresh(record)
    return {"status": "success", "content": parsed}


# ══════════════════════════════════════════════════════
#  HOME PARTNER / TRUST SECTION
# ══════════════════════════════════════════════════════

@router.get("/partners")
async def get_partner_content(db: Session = Depends(get_db)):
    """Retrieve the homepage partner/trust section content. Public endpoint."""
    record = db.query(HomePartnerSection).first()
    if not record or not record.content_json:
        return {"content": None}
    try:
        data = json.loads(record.content_json)
    except Exception:
        return {"content": None}
    return {"content": data}


class PartnerContentUpdate(BaseModel):
    content_json: str


@router.put("/partners")
async def update_partner_content(req: PartnerContentUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update the homepage partner/trust section content. Protected endpoint."""
    try:
        parsed = json.loads(req.content_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON content")

    record = db.query(HomePartnerSection).first()
    if not record:
        record = HomePartnerSection()
        db.add(record)

    record.content_json = req.content_json
    db.commit()
    db.refresh(record)
    return {"status": "success", "content": parsed}


# ──────────────────────────────────────────────────
#  HOME COURSE CATEGORIES SECTION
# ──────────────────────────────────────────────────

class HomeCourseCategorySchema(BaseModel):
    title: str
    icon_url: Optional[str] = None
    tools_text: Optional[str] = None
    tool_icons: Optional[List[str]] = None
    link_url: Optional[str] = None
    bg_image_url: Optional[str] = None
    order_position: Optional[int] = 0
    is_active: Optional[bool] = True


@router.get("/home-categories")
async def get_home_categories(db: Session = Depends(get_db)):
    """Retrieve all homepage course categories. Public endpoint."""
    records = db.query(HomeCourseCategory).filter(HomeCourseCategory.is_active == True).order_by(HomeCourseCategory.order_position.asc()).all()
    
    # Auto-seed standard categories if empty
    if not records:
        default_categories = [
            {
                "title": "Advanced AI & Machine Learning",
                "icon_url": "🧠",
                "tools_text": "Python, TensorFlow, PyTorch, Scikit-learn, OpenAI API, HuggingFace",
                "tool_icons": json.dumps([
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg"
                ]),
                "link_url": "/courses",
                "order_position": 1,
                "is_active": True
            },
            {
                "title": "Intelligent Robotics & IoT",
                "icon_url": "🦾",
                "tools_text": "C++, Arduino, Raspberry Pi, ROS (Robot Operating System), Embedded Linux",
                "tool_icons": json.dumps([
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/arduino/arduino-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/raspberrypi/raspberrypi-original.svg"
                ]),
                "link_url": "/courses",
                "order_position": 2,
                "is_active": True
            },
            {
                "title": "Full Stack AI Engineering",
                "icon_url": "💻",
                "tools_text": "React, Next.js, FastAPI, PostgreSQL, Docker, AWS Cloud",
                "tool_icons": json.dumps([
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg",
                    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"
                ]),
                "link_url": "/courses",
                "order_position": 3,
                "is_active": True
            }
        ]
        for dc in default_categories:
            db_cat = HomeCourseCategory(**dc)
            db.add(db_cat)
        db.commit()
        records = db.query(HomeCourseCategory).filter(HomeCourseCategory.is_active == True).order_by(HomeCourseCategory.order_position.asc()).all()

    results = []
    for r in records:
        try:
            icons = json.loads(r.tool_icons) if r.tool_icons else []
        except Exception:
            icons = []
        
        rewritten_icons = [rewrite_url(icon) for icon in icons]
        
        results.append({
            "id": r.id,
            "title": r.title,
            "icon_url": rewrite_url(r.icon_url),
            "tools_text": r.tools_text,
            "tool_icons": rewritten_icons,
            "link_url": r.link_url,
            "bg_image_url": rewrite_url(r.bg_image_url) if r.bg_image_url else None,
            "order_position": r.order_position,
            "is_active": r.is_active,
        })
    return results


@router.get("/home-categories/all")
async def get_all_home_categories(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Retrieve all categories including inactive ones for administrative editing."""
    records = db.query(HomeCourseCategory).order_by(HomeCourseCategory.order_position.asc()).all()
    results = []
    for r in records:
        try:
            icons = json.loads(r.tool_icons) if r.tool_icons else []
        except Exception:
            icons = []
        
        results.append({
            "id": r.id,
            "title": r.title,
            "icon_url": rewrite_url(r.icon_url),
            "tools_text": r.tools_text,
            "tool_icons": [rewrite_url(icon) for icon in icons],
            "link_url": r.link_url,
            "bg_image_url": rewrite_url(r.bg_image_url) if r.bg_image_url else None,
            "order_position": r.order_position,
            "is_active": r.is_active,
        })
    return results


@router.post("/home-categories")
async def create_home_category(req: HomeCourseCategorySchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a new homepage course category."""
    tool_icons_json = json.dumps(req.tool_icons) if req.tool_icons else "[]"
    
    new_cat = HomeCourseCategory(
        title=req.title,
        icon_url=req.icon_url,
        tools_text=req.tools_text,
        tool_icons=tool_icons_json,
        link_url=req.link_url,
        bg_image_url=req.bg_image_url,
        order_position=req.order_position or 0,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    
    return {"status": "success", "id": new_cat.id}


@router.put("/home-categories/{category_id}")
async def update_home_category(category_id: int, req: HomeCourseCategorySchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update an existing homepage course category."""
    cat = db.query(HomeCourseCategory).filter(HomeCourseCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Homepage course category not found")
        
    cat.title = req.title
    cat.icon_url = req.icon_url
    cat.tools_text = req.tools_text
    if req.tool_icons is not None:
        cat.tool_icons = json.dumps(req.tool_icons)
    cat.link_url = req.link_url
    cat.bg_image_url = req.bg_image_url
    if req.order_position is not None:
        cat.order_position = req.order_position
    if req.is_active is not None:
        cat.is_active = req.is_active
        
    db.commit()
    return {"status": "success", "message": "Category updated successfully"}


@router.delete("/home-categories/{category_id}")
async def delete_home_category(category_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a homepage course category."""
    cat = db.query(HomeCourseCategory).filter(HomeCourseCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Homepage course category not found")

    db.delete(cat)
    db.commit()
    return {"status": "success", "message": "Category deleted successfully"}


# ──────────────────────────────────────────────────
#  HOME JOURNEY (SCROLL STORYTELLING) SECTION
# ──────────────────────────────────────────────────

class HomeJourneyMilestoneSchema(BaseModel):
    tag: str
    title: str
    description: str
    accent_color: str = "#00f0ff"
    scene_type: str = "doubt_portal"
    order_position: Optional[int] = 0
    is_active: Optional[bool] = True


class HomeJourneySectionSchema(BaseModel):
    badge: str = "THE IINM LEARNING PATHWAY"
    heading: str = "Your Journey Through a Complete AI Ecosystem"
    subheading: str = "Scroll to travel the path. Each milestone lights up as you progress."


# ── Public endpoints ──

@router.get("/journey-section")
async def get_journey_section(db: Session = Depends(get_db)):
    """Get the journey section header settings (public)."""
    section = db.query(HomeJourneySection).first()
    if not section:
        return {
            "badge": "THE IINM LEARNING PATHWAY",
            "heading": "Your Journey Through a Complete AI Ecosystem",
            "subheading": "Scroll to travel the path. Each milestone lights up as you progress."
        }
    try:
        data = json.loads(section.content_json) if section.content_json else {}
    except Exception:
        data = {}
    return {
        "badge": data.get("badge", "THE IINM LEARNING PATHWAY"),
        "heading": data.get("heading", "Your Journey Through a Complete AI Ecosystem"),
        "subheading": data.get("subheading", "Scroll to travel the path. Each milestone lights up as you progress."),
    }


@router.get("/journey-milestones")
async def get_journey_milestones(db: Session = Depends(get_db)):
    """Get active journey milestones ordered by position (public)."""
    records = db.query(HomeJourneyMilestone).filter(
        HomeJourneyMilestone.is_active == True
    ).order_by(HomeJourneyMilestone.order_position.asc()).all()

    # Auto-seed defaults if empty
    if not records:
        defaults = [
            {"tag": "MILESTONE 01", "title": "24/7 AI Doubt Clearing Portal",
             "description": "An always-on LLM assistant trained on our curriculum. Ask anything, anytime — get instant answers, code fixes, and prompt guidance the moment you're stuck.",
             "accent_color": "#00f0ff", "scene_type": "doubt_portal", "order_position": 1},
            {"tag": "MILESTONE 02", "title": "Learn Latest AI Tools & Skills",
             "description": "Master the modern stack — ChatGPT, Claude, Gemini, and Cursor — through real workflow connections. We teach what the industry uses right now, not last year.",
             "accent_color": "#f472b6", "scene_type": "ai_tools", "order_position": 2},
            {"tag": "MILESTONE 03", "title": "Live Practical Classes",
             "description": "Real instructors teaching live. Students join, screens are shared, and code is written together in real time — no recorded video fatigue, just genuine interaction.",
             "accent_color": "#10b981", "scene_type": "live_classes", "order_position": 3},
            {"tag": "MILESTONE 04", "title": "Verified Certification",
             "description": "Complete your assessment, build your capstone, and earn a verified credential with a tamper-proof badge — proof of expertise recognized by top recruiters.",
             "accent_color": "#a78bfa", "scene_type": "certification", "order_position": 4},
            {"tag": "MILESTONE 05", "title": "Lifetime Course Updates",
             "description": "AI evolves fast. As new tools arrive, your access unlocks automatically — forever. Pay once, stay current for life across every future cohort and module.",
             "accent_color": "#fbbf24", "scene_type": "lifetime", "order_position": 5},
            {"tag": "MILESTONE 06", "title": "Global AI Network",
             "description": "Join a worldwide grid of connected learners, mentors, and professionals. Share prompts, find collaborators, and tap into a high-signal network of AI builders.",
             "accent_color": "#3b82f6", "scene_type": "global_network", "order_position": 6},
        ]
        for d in defaults:
            db.add(HomeJourneyMilestone(**d))
        db.commit()
        records = db.query(HomeJourneyMilestone).filter(
            HomeJourneyMilestone.is_active == True
        ).order_by(HomeJourneyMilestone.order_position.asc()).all()

    return [
        {
            "id": r.id,
            "tag": r.tag,
            "title": r.title,
            "description": r.description,
            "accent_color": r.accent_color,
            "scene_type": r.scene_type,
            "order_position": r.order_position,
            "is_active": r.is_active,
        } for r in records
    ]


# ── Admin endpoints ──

@router.get("/journey-section/all")
async def get_journey_section_all(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get the journey section header settings including all fields (admin)."""
    section = db.query(HomeJourneySection).first()
    if not section:
        return {
            "badge": "THE IINM LEARNING PATHWAY",
            "heading": "Your Journey Through a Complete AI Ecosystem",
            "subheading": "Scroll to travel the path. Each milestone lights up as you progress.",
        }
    try:
        data = json.loads(section.content_json) if section.content_json else {}
    except Exception:
        data = {}
    return {
        "badge": data.get("badge", "THE IINM LEARNING PATHWAY"),
        "heading": data.get("heading", "Your Journey Through a Complete AI Ecosystem"),
        "subheading": data.get("subheading", "Scroll to travel the path. Each milestone lights up as you progress."),
    }


@router.post("/journey-section")
async def create_or_update_journey_section(req: HomeJourneySectionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update the journey section header."""
    section = db.query(HomeJourneySection).first()
    payload = json.dumps({
        "badge": req.badge,
        "heading": req.heading,
        "subheading": req.subheading,
    })
    if not section:
        section = HomeJourneySection(content_json=payload)
        db.add(section)
    else:
        section.content_json = payload
    db.commit()
    db.refresh(section)
    return {"status": "success"}


@router.get("/journey-milestones/all")
async def get_all_journey_milestones(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get all milestones including inactive ones for admin editing."""
    records = db.query(HomeJourneyMilestone).order_by(HomeJourneyMilestone.order_position.asc()).all()
    return [
        {
            "id": r.id,
            "tag": r.tag,
            "title": r.title,
            "description": r.description,
            "accent_color": r.accent_color,
            "scene_type": r.scene_type,
            "order_position": r.order_position,
            "is_active": r.is_active,
        } for r in records
    ]


@router.post("/journey-milestones")
async def create_journey_milestone(req: HomeJourneyMilestoneSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a new journey milestone."""
    new_m = HomeJourneyMilestone(
        tag=req.tag,
        title=req.title,
        description=req.description,
        accent_color=req.accent_color,
        scene_type=req.scene_type,
        order_position=req.order_position or 0,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(new_m)
    db.commit()
    db.refresh(new_m)
    return {"status": "success", "id": new_m.id}


@router.put("/journey-milestones/{milestone_id}")
async def update_journey_milestone(milestone_id: int, req: HomeJourneyMilestoneSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update an existing journey milestone."""
    m = db.query(HomeJourneyMilestone).filter(HomeJourneyMilestone.id == milestone_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Journey milestone not found")

    m.tag = req.tag
    m.title = req.title
    m.description = req.description
    m.accent_color = req.accent_color
    m.scene_type = req.scene_type
    if req.order_position is not None:
        m.order_position = req.order_position
    if req.is_active is not None:
        m.is_active = req.is_active

    db.commit()
    return {"status": "success", "message": "Milestone updated successfully"}


@router.delete("/journey-milestones/{milestone_id}")
async def delete_journey_milestone(milestone_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a journey milestone."""
    m = db.query(HomeJourneyMilestone).filter(HomeJourneyMilestone.id == milestone_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Journey milestone not found")

    db.delete(m)
    db.commit()
    return {"status": "success", "message": "Milestone deleted successfully"}


# ──────────────────────────────────────────────────
#  HOME RECENTLY LAUNCHED COURSES SECTION
# ──────────────────────────────────────────────────

class HomeRecentCoursesSchema(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    background_image_url: Optional[str] = None
    course_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


@router.get("/home-recent-courses")
async def get_home_recent_courses(db: Session = Depends(get_db)):
    """Retrieve the homepage recently launched courses section config + hydrated courses."""
    section = db.query(HomeRecentCoursesSection).filter(HomeRecentCoursesSection.is_active == True).first()

    # Auto-seed if missing
    if not section:
        section = HomeRecentCoursesSection(
            title="Get job-ready for an in-demand career",
            subtitle="No prior experience needed to get started.",
            cta_text="Explore programs",
            cta_link="/courses",
            course_ids_json=None,
            is_active=True,
        )
        db.add(section)
        db.commit()
        db.refresh(section)

    course_ids = []
    if section.course_ids_json:
        try:
            course_ids = json.loads(section.course_ids_json)
        except Exception:
            course_ids = []

    # Hydrate courses
    courses_data = []
    if course_ids:
        courses = db.query(Course).filter(Course.id.in_(course_ids), Course.status == "PUBLISHED").all()
        # Preserve order
        course_map = {c.id: c for c in courses}
        for cid in course_ids:
            c = course_map.get(cid)
            if c:
                courses_data.append({
                    "id": c.id,
                    "slug": c.slug,
                    "title": c.title,
                    "description": c.description,
                    "thumbnail_url": c.thumbnail_url,
                    "instructor_name": c.instructor_name,
                    "instructors": [{"id": i.id, "name": i.name} for i in c.instructors],
                    "skill_level": c.skill_level,
                    "price": c.price,
                    "discount_price": c.discount_price,
                    "price_usd": c.price_usd,
                    "discount_price_usd": c.discount_price_usd,
                    "currency": c.currency,
                    "is_free": c.is_free,
                    "is_featured": c.is_featured,
                    "is_new": c.is_new,
                    "has_certificate": getattr(c, "has_certificate", True),
                    "promo_video_url": c.promo_video_url,
                })

    # Fallback: if no configured courses, return up to 4 newest published courses
    if not courses_data:
        fallback = db.query(Course).filter(Course.status == "PUBLISHED").order_by(Course.id.desc()).limit(4).all()
        for c in fallback:
            courses_data.append({
                "id": c.id,
                "slug": c.slug,
                "title": c.title,
                "description": c.description,
                "thumbnail_url": c.thumbnail_url,
                "instructor_name": c.instructor_name,
                "instructors": [{"id": i.id, "name": i.name} for i in c.instructors],
                "skill_level": c.skill_level,
                "price": c.price,
                "discount_price": c.discount_price,
                "price_usd": c.price_usd,
                "discount_price_usd": c.discount_price_usd,
                "currency": c.currency,
                "is_free": c.is_free,
                "is_featured": c.is_featured,
                "is_new": c.is_new,
                "has_certificate": getattr(c, "has_certificate", True),
                "promo_video_url": c.promo_video_url,
            })

    return {
        "section": {
            "id": section.id,
            "title": section.title,
            "subtitle": section.subtitle,
            "cta_text": section.cta_text,
            "cta_link": section.cta_link,
            "background_image_url": section.background_image_url,
            "is_active": section.is_active,
        },
        "courses": courses_data,
    }


@router.put("/home-recent-courses")
async def update_home_recent_courses(req: HomeRecentCoursesSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update the homepage recently launched courses section. Admin only."""
    section = db.query(HomeRecentCoursesSection).first()
    if not section:
        section = HomeRecentCoursesSection(is_active=True)
        db.add(section)

    if req.title is not None:
        section.title = req.title
    if req.subtitle is not None:
        section.subtitle = req.subtitle
    if req.cta_text is not None:
        section.cta_text = req.cta_text
    if req.cta_link is not None:
        section.cta_link = req.cta_link
    if req.background_image_url is not None:
        section.background_image_url = req.background_image_url
    if req.course_ids is not None:
        section.course_ids_json = json.dumps(req.course_ids)
    if req.is_active is not None:
        section.is_active = req.is_active

    db.commit()
    db.refresh(section)
    return {"status": "success", "message": "Recently launched courses section updated successfully"}


# ──────────────────────────────────────────────────
#  HOME RECENT COURSE CARDS (standalone cards for homepage section)
# ──────────────────────────────────────────────────

class HomeRecentCourseCardSchema(BaseModel):
    title: str
    slug: Optional[str] = ""
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    instructor_name: Optional[str] = None
    skill_level: Optional[str] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    price_usd: Optional[float] = None
    discount_price_usd: Optional[float] = None
    currency: Optional[str] = "INR"
    is_free: Optional[bool] = False
    has_certificate: Optional[bool] = True
    rating: Optional[float] = None
    order_position: Optional[int] = 0
    is_active: Optional[bool] = True


@router.get("/home-recent-course-cards")
async def get_home_recent_course_cards(db: Session = Depends(get_db)):
    """Retrieve all active homepage recent course cards. Public endpoint."""
    records = db.query(HomeRecentCourseCard).filter(HomeRecentCourseCard.is_active == True).order_by(HomeRecentCourseCard.order_position.asc()).all()

    # Auto-seed demo cards if empty
    if not records:
        demo_cards = [
            {
                "title": "Google Data Analytics",
                "slug": "google-data-analytics",
                "description": "Learn data analysis with Google tools",
                "thumbnail_url": None,
                "instructor_name": "Google",
                "skill_level": "Data",
                "price": 5999,
                "discount_price": 3999,
                "currency": "INR",
                "is_free": False,
                "has_certificate": True,
                "order_position": 1,
                "is_active": True,
            },
            {
                "title": "Microsoft Power BI Data Analyst",
                "slug": "microsoft-power-bi-data-analyst",
                "description": "Master Power BI for business analytics",
                "thumbnail_url": None,
                "instructor_name": "Microsoft",
                "skill_level": "Data",
                "price": 6999,
                "discount_price": 4999,
                "currency": "INR",
                "is_free": False,
                "has_certificate": True,
                "order_position": 2,
                "is_active": True,
            },
            {
                "title": "IBM Data Science",
                "slug": "ibm-data-science",
                "description": "Comprehensive data science certification",
                "thumbnail_url": None,
                "instructor_name": "IBM",
                "skill_level": "Data",
                "price": 7999,
                "discount_price": 5999,
                "currency": "INR",
                "is_free": False,
                "has_certificate": True,
                "order_position": 3,
                "is_active": True,
            },
            {
                "title": "Tableau Business Intelligence Analyst",
                "slug": "tableau-business-intelligence-analyst",
                "description": "Learn Tableau for BI reporting",
                "thumbnail_url": None,
                "instructor_name": "Tableau Learning Partner",
                "skill_level": "Business",
                "price": 5499,
                "discount_price": 3499,
                "currency": "INR",
                "is_free": False,
                "has_certificate": True,
                "order_position": 4,
                "is_active": True,
            },
        ]
        for dc in demo_cards:
            card = HomeRecentCourseCard(**dc)
            db.add(card)
        db.commit()
        records = db.query(HomeRecentCourseCard).filter(HomeRecentCourseCard.is_active == True).order_by(HomeRecentCourseCard.order_position.asc()).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "description": r.description,
            "thumbnail_url": r.thumbnail_url,
            "instructor_name": r.instructor_name,
            "skill_level": r.skill_level,
            "price": r.price,
            "discount_price": r.discount_price,
            "price_usd": r.price_usd,
            "discount_price_usd": r.discount_price_usd,
            "currency": r.currency,
            "is_free": r.is_free,
            "has_certificate": r.has_certificate,
            "rating": r.rating,
            "order_position": r.order_position,
            "is_active": r.is_active,
        }
        for r in records
    ]


@router.get("/home-recent-course-cards/all")
async def get_all_home_recent_course_cards(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Retrieve all course cards including inactive. Admin only."""
    records = db.query(HomeRecentCourseCard).order_by(HomeRecentCourseCard.order_position.asc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "description": r.description,
            "thumbnail_url": r.thumbnail_url,
            "instructor_name": r.instructor_name,
            "skill_level": r.skill_level,
            "price": r.price,
            "discount_price": r.discount_price,
            "price_usd": r.price_usd,
            "discount_price_usd": r.discount_price_usd,
            "currency": r.currency,
            "is_free": r.is_free,
            "has_certificate": r.has_certificate,
            "rating": r.rating,
            "order_position": r.order_position,
            "is_active": r.is_active,
        }
        for r in records
    ]


@router.post("/home-recent-course-cards")
async def create_home_recent_course_card(req: HomeRecentCourseCardSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a new homepage recent course card. Admin only."""
    card = HomeRecentCourseCard(
        title=req.title,
        slug=req.slug or "",
        description=req.description,
        thumbnail_url=req.thumbnail_url,
        instructor_name=req.instructor_name,
        skill_level=req.skill_level,
        price=req.price,
        discount_price=req.discount_price,
        price_usd=req.price_usd,
        discount_price_usd=req.discount_price_usd,
        currency=req.currency,
        is_free=req.is_free,
        has_certificate=req.has_certificate,
        rating=req.rating,
        order_position=req.order_position or 0,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return {"status": "success", "id": card.id}


@router.put("/home-recent-course-cards/{card_id}")
async def update_home_recent_course_card(card_id: int, req: HomeRecentCourseCardSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update an existing homepage recent course card. Admin only."""
    card = db.query(HomeRecentCourseCard).filter(HomeRecentCourseCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Course card not found")

    if req.title is not None:
        card.title = req.title
    if req.slug is not None:
        card.slug = req.slug
    if req.description is not None:
        card.description = req.description
    if req.thumbnail_url is not None:
        card.thumbnail_url = req.thumbnail_url
    if req.instructor_name is not None:
        card.instructor_name = req.instructor_name
    if req.skill_level is not None:
        card.skill_level = req.skill_level
    if req.price is not None:
        card.price = req.price
    if req.discount_price is not None:
        card.discount_price = req.discount_price
    if req.price_usd is not None:
        card.price_usd = req.price_usd
    if req.discount_price_usd is not None:
        card.discount_price_usd = req.discount_price_usd
    if req.currency is not None:
        card.currency = req.currency
    if req.is_free is not None:
        card.is_free = req.is_free
    if req.has_certificate is not None:
        card.has_certificate = req.has_certificate
    if req.rating is not None:
        card.rating = req.rating
    if req.order_position is not None:
        card.order_position = req.order_position
    if req.is_active is not None:
        card.is_active = req.is_active

    db.commit()
    db.refresh(card)
    return {"status": "success", "message": "Course card updated successfully"}


@router.delete("/home-recent-course-cards/{card_id}")
async def delete_home_recent_course_card(card_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a homepage recent course card. Admin only."""
    card = db.query(HomeRecentCourseCard).filter(HomeRecentCourseCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Course card not found")

    db.delete(card)
    db.commit()
    return {"status": "success", "message": "Course card deleted successfully"}


# ──────────────────────────────────────────────────
#  HOME FOUNDER DESK SECTION
# ──────────────────────────────────────────────────

class HomeFounderDeskSchema(BaseModel):
    badge_text: Optional[str] = None
    title: Optional[str] = None
    typewriter_words: Optional[List[str]] = None
    description: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    secondary_cta_text: Optional[str] = None
    secondary_cta_link: Optional[str] = None
    founder_image_url: Optional[str] = None
    founder_name: Optional[str] = None
    founder_role: Optional[str] = None
    founder_quote: Optional[str] = None
    right_card_title: Optional[str] = None
    right_card_body: Optional[str] = None
    background_image_url: Optional[str] = None
    video_youtube_id: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/founder-desk")
async def get_founder_desk(db: Session = Depends(get_db)):
    """Retrieve the Founder Desk section configuration. Public endpoint."""
    record = db.query(HomeFounderDesk).first()
    if not record:
        record = HomeFounderDesk(
            badge_text="Industry Insights",
            title="Industry Updates by Founder",
            typewriter_words_json=json.dumps(["AI Trends", "Tech Insights", "Industry News", "Founder's Vision"]),
            description="Stay ahead with curated insights, industry trends, and forward-looking analysis from our founder. Explore the latest in AI, technology, and education.",
            cta_text="Read All Updates",
            cta_link="/blog",
            founder_name="Founder Name",
            founder_role="CEO & Co-Founder",
            founder_quote="The future belongs to those who prepare for it today.",
            right_card_title="Latest from the Founder",
            right_card_body="Discover exclusive insights on AI evolution, emerging technologies, and how we're shaping the next generation of tech professionals.",
            is_active=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

    return {
        "section": {
            "id": record.id,
            "badge_text": record.badge_text,
            "title": record.title,
            "typewriter_words": json.loads(record.typewriter_words_json) if record.typewriter_words_json else [],
            "description": record.description,
            "cta_text": record.cta_text,
            "cta_link": record.cta_link,
            "secondary_cta_text": record.secondary_cta_text,
            "secondary_cta_link": record.secondary_cta_link,
            "founder_image_url": record.founder_image_url,
            "founder_name": record.founder_name,
            "founder_role": record.founder_role,
            "founder_quote": record.founder_quote,
            "right_card_title": record.right_card_title,
            "right_card_body": record.right_card_body,
            "background_image_url": record.background_image_url,
            "video_youtube_id": record.video_youtube_id,
            "is_active": record.is_active,
        }
    }


@router.put("/founder-desk")
async def update_founder_desk(req: HomeFounderDeskSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update the Founder Desk section. Admin only."""
    record = db.query(HomeFounderDesk).first()
    if not record:
        record = HomeFounderDesk(is_active=True)
        db.add(record)

    if req.badge_text is not None:
        record.badge_text = req.badge_text
    if req.title is not None:
        record.title = req.title
    if req.typewriter_words is not None:
        record.typewriter_words_json = json.dumps(req.typewriter_words)
    if req.description is not None:
        record.description = req.description
    if req.cta_text is not None:
        record.cta_text = req.cta_text
    if req.cta_link is not None:
        record.cta_link = req.cta_link
    if req.secondary_cta_text is not None:
        record.secondary_cta_text = req.secondary_cta_text
    if req.secondary_cta_link is not None:
        record.secondary_cta_link = req.secondary_cta_link
    if req.founder_image_url is not None:
        record.founder_image_url = req.founder_image_url
    if req.founder_name is not None:
        record.founder_name = req.founder_name
    if req.founder_role is not None:
        record.founder_role = req.founder_role
    if req.founder_quote is not None:
        record.founder_quote = req.founder_quote
    if req.right_card_title is not None:
        record.right_card_title = req.right_card_title
    if req.right_card_body is not None:
        record.right_card_body = req.right_card_body
    if req.background_image_url is not None:
        record.background_image_url = req.background_image_url
    if req.video_youtube_id is not None:
        record.video_youtube_id = req.video_youtube_id
    if req.is_active is not None:
        record.is_active = req.is_active

    db.commit()
    db.refresh(record)
    return {"status": "success", "message": "Founder Desk section updated successfully"}


class HomeStudentReelsSectionSchema(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    is_active: Optional[bool] = None

class HomeStudentReelSchema(BaseModel):
    youtube_video_id: str
    title: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_position: Optional[int] = None
    is_active: Optional[bool] = None

class HomeStudentReelUpdateSchema(BaseModel):
    youtube_video_id: Optional[str] = None
    title: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_position: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("/student-reels")
async def get_student_reels(db: Session = Depends(get_db)):
    """Public endpoint to get active student reels."""
    section = db.query(HomeStudentReelsSection).first()
    if not section:
        section = HomeStudentReelsSection(is_active=True)
        db.add(section)
        db.commit()
        db.refresh(section)

    reels = db.query(HomeStudentReel).filter(HomeStudentReel.is_active == True).order_by(HomeStudentReel.order_position.asc(), HomeStudentReel.id.asc()).all()

    if not reels:
        demo_reels = [
            HomeStudentReel(youtube_video_id="dQw4w9WgXcQ", title="My AI Journey", student_name="Rahul Das", description="From zero to AI engineer in 6 months", order_position=1, is_active=True),
            HomeStudentReel(youtube_video_id="M7lc1UVf-VE", title="Building AI Apps", student_name="Priya Sharma", description="How I built my first AI application", order_position=2, is_active=True),
            HomeStudentReel(youtube_video_id="sFceIwMYDnM", title="Career Switch", student_name="Amit Roy", description="Transitioned from marketing to AI", order_position=3, is_active=True),
            HomeStudentReel(youtube_video_id="kJQP7kiw5Fk", title="Freelancing with AI", student_name="Sneha Bose", description="Earning 5L/month with AI skills", order_position=4, is_active=True),
            HomeStudentReel(youtube_video_id="l482T0yNkeo", title="AI Certification Success", student_name="Arjun Mehta", description="How IINM certification changed my career", order_position=5, is_active=True),
            HomeStudentReel(youtube_video_id="JGwWNGJdvx8", title="Learning with Community", student_name="Ananya Gupta", description="The power of peer learning at IINM", order_position=6, is_active=True),
        ]
        for r in demo_reels:
            db.add(r)
        db.commit()
        reels = demo_reels

    return {
        "section": {
            "id": section.id,
            "title": section.title,
            "subtitle": section.subtitle,
            "is_active": section.is_active,
        },
        "reels": [
            {
                "id": r.id,
                "youtube_video_id": r.youtube_video_id,
                "title": r.title,
                "student_name": r.student_name,
                "description": r.description,
                "thumbnail_url": r.thumbnail_url or f"https://img.youtube.com/vi/{r.youtube_video_id}/hqdefault.jpg",
                "order_position": r.order_position,
                "is_active": r.is_active,
            }
            for r in reels
        ],
    }

@router.get("/student-reels/all")
async def get_all_student_reels_admin(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin endpoint to get all student reels including inactive."""
    section = db.query(HomeStudentReelsSection).first()
    reels = db.query(HomeStudentReel).order_by(HomeStudentReel.order_position.asc(), HomeStudentReel.id.asc()).all()
    return {
        "section": {
            "id": section.id if section else None,
            "title": section.title if section else "Students POV",
            "subtitle": section.subtitle if section else "",
            "is_active": section.is_active if section else True,
        },
        "reels": [
            {
                "id": r.id,
                "youtube_video_id": r.youtube_video_id,
                "title": r.title,
                "student_name": r.student_name,
                "description": r.description,
                "thumbnail_url": r.thumbnail_url or f"https://img.youtube.com/vi/{r.youtube_video_id}/hqdefault.jpg",
                "order_position": r.order_position,
                "is_active": r.is_active,
            }
            for r in reels
        ],
    }

@router.put("/student-reels/section")
async def update_student_reels_section(req: HomeStudentReelsSectionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update the student reels section config. Admin only."""
    section = db.query(HomeStudentReelsSection).first()
    if not section:
        section = HomeStudentReelsSection(is_active=True)
        db.add(section)
    if req.title is not None:
        section.title = req.title
    if req.subtitle is not None:
        section.subtitle = req.subtitle
    if req.is_active is not None:
        section.is_active = req.is_active
    db.commit()
    db.refresh(section)
    return {"status": "success", "message": "Student reels section updated"}

@router.post("/student-reels")
async def create_student_reel(req: HomeStudentReelSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a new student reel. Admin only."""
    reel = HomeStudentReel(
        youtube_video_id=req.youtube_video_id,
        title=req.title,
        student_name=req.student_name,
        description=req.description,
        thumbnail_url=req.thumbnail_url or f"https://img.youtube.com/vi/{req.youtube_video_id}/hqdefault.jpg",
        order_position=req.order_position if req.order_position is not None else 0,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(reel)
    db.commit()
    db.refresh(reel)
    return {"status": "success", "id": reel.id}

@router.put("/student-reels/{reel_id}")
async def update_student_reel(reel_id: int, req: HomeStudentReelUpdateSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update a student reel. Admin only."""
    reel = db.query(HomeStudentReel).filter(HomeStudentReel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    if req.youtube_video_id is not None:
        reel.youtube_video_id = req.youtube_video_id
    if req.title is not None:
        reel.title = req.title
    if req.student_name is not None:
        reel.student_name = req.student_name
    if req.description is not None:
        reel.description = req.description
    if req.thumbnail_url is not None:
        reel.thumbnail_url = req.thumbnail_url
    if req.order_position is not None:
        reel.order_position = req.order_position
    if req.is_active is not None:
        reel.is_active = req.is_active
    db.commit()
    db.refresh(reel)
    return {"status": "success", "message": "Reel updated"}

@router.delete("/student-reels/{reel_id}")
async def delete_student_reel(reel_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a student reel. Admin only."""
    reel = db.query(HomeStudentReel).filter(HomeStudentReel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    db.delete(reel)
    db.commit()
    return {"status": "success", "message": "Reel deleted"}


# ──────────────────────────────────────────────────
#  HOME LEARNER REVIEWS SECTION (Wall of Love)
# ──────────────────────────────────────────────────

class HomeLearnerReviewsSectionSchema(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None

class HomeLearnerReviewSchema(BaseModel):
    student_name: str
    role_title: Optional[str] = None
    company_name: Optional[str] = None
    feedback_text: str
    avatar_url: Optional[str] = None
    star_rating: Optional[int] = 5
    order_position: Optional[int] = None
    is_active: Optional[bool] = None

class HomeLearnerReviewUpdateSchema(BaseModel):
    student_name: Optional[str] = None
    role_title: Optional[str] = None
    company_name: Optional[str] = None
    feedback_text: Optional[str] = None
    avatar_url: Optional[str] = None
    star_rating: Optional[int] = None
    order_position: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("/learner-reviews")
async def get_learner_reviews(db: Session = Depends(get_db)):
    """Public endpoint to get active learner reviews."""
    section = db.query(HomeLearnerReviewsSection).first()
    if not section:
        section = HomeLearnerReviewsSection(is_active=True)
        db.add(section)
        db.commit()
        db.refresh(section)

    reviews = db.query(HomeLearnerReview).filter(HomeLearnerReview.is_active == True).order_by(HomeLearnerReview.order_position.asc(), HomeLearnerReview.id.asc()).all()

    # One-time patch: migrate old Bengali-mixed reviews to Hinglish
    TEXT_PATCH = {
        "IINM er AI course e enroll korar pore amar business e automation shuru korte parlam. Customer handling e AI tools use kore 40% time bachchi. Truly transformative experience.": "IINM ke join karne ke baad meri business mein AI automation shuru ho gaya. Customer handling mein AI tools use karke 40% time bachata hoon. Truly transformative experience hai.",
        "Amar e-commerce business er jonno AI marketing skills shikhlamm. ChatGPT r Midjourney er practical use cases bujhte perechhi. Sales 3x bere geche.": "Mere e-commerce business ke liye AI marketing skills seekh liye. ChatGPT aur Midjourney ke practical use cases samajh aa gaye. Sales 3x badh gaye hain.",
        "AI community ta khub helpful. Peer learning er jonno amar confidence berechhe. Instructors ra real-world examples dey, jeta onno kothao pawa jayna.": "AI community bahut helpful hai. Peer learning se mera confidence badh gaya. Instructors real-world examples dete hain jo kahi aur nahi milta.",
        "Product management er sathe AI integration shikhar best platform. Prompt engineering r data analysis modules khub structured. Highly recommend korchi.": "Product management ke saath AI integration seekhne ka best platform. Prompt engineering aur data analysis modules bahut structured hain. Highly recommend karta hoon.",
        "Cursor IDE r AI pair programming shikhar pore amar coding speed 2x bere geche. Lifetime updates er jonno shob latest tool shikhte pari.": "Cursor IDE aur AI pair programming seekhne ke baad mera coding speed 2x ho gaya. Lifetime updates se sab latest tools seekh sakta hoon.",
        "SEO, content generation, r automation e AI apply kore amar client der ROI dramatically improve hoyeche. Best investment for my career.": "SEO, content generation, aur automation mein AI apply karke mere clients ka ROI dramatically improve ho gaya. Career ke liye best investment hai.",
    }
    patched = False
    for r in reviews:
        if r.feedback_text in TEXT_PATCH:
            r.feedback_text = TEXT_PATCH[r.feedback_text]
            patched = True
    if patched:
        db.commit()
        for r in reviews:
            db.refresh(r)

    if not reviews:
        demo_reviews = [
            HomeLearnerReview(student_name="Amit Khurana", role_title="PROPRIETOR", company_name="Khurana Auto Parts", feedback_text="IINM ke join karne ke baad meri business mein AI automation shuru ho gaya. Customer handling mein AI tools use karke 40% time bachata hoon. Truly transformative experience hai.", star_rating=5, order_position=1, is_active=True),
            HomeLearnerReview(student_name="Kavita Rao", role_title="FOUNDER", company_name="Glow & Glamour Boutique", feedback_text="Mere e-commerce business ke liye AI marketing skills seekh liye. ChatGPT aur Midjourney ke practical use cases samajh aa gaye. Sales 3x badh gaye hain.", star_rating=5, order_position=2, is_active=True),
            HomeLearnerReview(student_name="Rahul Mehta", role_title="FOUNDER", company_name="Mehta Lifestyle & Decor", feedback_text="AI community bahut helpful hai. Peer learning se mera confidence badh gaya. Instructors real-world examples dete hain jo kahi aur nahi milta.", star_rating=5, order_position=3, is_active=True),
            HomeLearnerReview(student_name="Ananya Iyer", role_title="PRODUCT MANAGER", company_name="Fintech Solutions India", feedback_text="Product management ke saath AI integration seekhne ka best platform. Prompt engineering aur data analysis modules bahut structured hain. Highly recommend karta hoon.", star_rating=5, order_position=4, is_active=True),
            HomeLearnerReview(student_name="Vikram Singh", role_title="SOFTWARE ENGINEER", company_name="TechNova Pvt Ltd", feedback_text="Cursor IDE aur AI pair programming seekhne ke baad mera coding speed 2x ho gaya. Lifetime updates se sab latest tools seekh sakta hoon.", star_rating=5, order_position=5, is_active=True),
            HomeLearnerReview(student_name="Priya Sharma", role_title="DIGITAL MARKETER", company_name="AdWave Agency", feedback_text="SEO, content generation, aur automation mein AI apply karke mere clients ka ROI dramatically improve ho gaya. Career ke liye best investment hai.", star_rating=5, order_position=6, is_active=True),
        ]
        for r in demo_reviews:
            db.add(r)
        db.commit()
        reviews = demo_reviews

    return {
        "section": {
            "id": section.id,
            "title": section.title,
            "subtitle": section.subtitle,
            "label": section.label,
            "is_active": section.is_active,
        },
        "reviews": [
            {
                "id": r.id,
                "student_name": r.student_name,
                "role_title": r.role_title,
                "company_name": r.company_name,
                "feedback_text": r.feedback_text,
                "avatar_url": r.avatar_url,
                "star_rating": r.star_rating,
                "order_position": r.order_position,
                "is_active": r.is_active,
            }
            for r in reviews
        ],
    }

@router.get("/learner-reviews/all")
async def get_all_learner_reviews_admin(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Admin endpoint to get all learner reviews including inactive."""
    section = db.query(HomeLearnerReviewsSection).first()
    reviews = db.query(HomeLearnerReview).order_by(HomeLearnerReview.order_position.asc(), HomeLearnerReview.id.asc()).all()
    return {
        "section": {
            "id": section.id if section else None,
            "title": section.title if section else "Trusted by Thousands AI Skill Learners",
            "subtitle": section.subtitle if section else "Discover why learners choose IINM for their AI journey and career growth.",
            "label": section.label if section else "Wall of Love",
            "is_active": section.is_active if section else True,
        },
        "reviews": [
            {
                "id": r.id,
                "student_name": r.student_name,
                "role_title": r.role_title,
                "company_name": r.company_name,
                "feedback_text": r.feedback_text,
                "avatar_url": r.avatar_url,
                "star_rating": r.star_rating,
                "order_position": r.order_position,
                "is_active": r.is_active,
            }
            for r in reviews
        ],
    }

@router.put("/learner-reviews/section")
async def update_learner_reviews_section(req: HomeLearnerReviewsSectionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update the learner reviews section config. Admin only."""
    section = db.query(HomeLearnerReviewsSection).first()
    if not section:
        section = HomeLearnerReviewsSection(is_active=True)
        db.add(section)
    if req.title is not None:
        section.title = req.title
    if req.subtitle is not None:
        section.subtitle = req.subtitle
    if req.label is not None:
        section.label = req.label
    if req.is_active is not None:
        section.is_active = req.is_active
    db.commit()
    db.refresh(section)
    return {"status": "success", "message": "Learner reviews section updated"}

@router.post("/learner-reviews")
async def create_learner_review(req: HomeLearnerReviewSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a new learner review. Admin only."""
    review = HomeLearnerReview(
        student_name=req.student_name,
        role_title=req.role_title,
        company_name=req.company_name,
        feedback_text=req.feedback_text,
        avatar_url=req.avatar_url,
        star_rating=req.star_rating if req.star_rating is not None else 5,
        order_position=req.order_position if req.order_position is not None else 0,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"status": "success", "id": review.id}

@router.put("/learner-reviews/{review_id}")
async def update_learner_review(review_id: int, req: HomeLearnerReviewUpdateSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update a learner review. Admin only."""
    review = db.query(HomeLearnerReview).filter(HomeLearnerReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if req.student_name is not None:
        review.student_name = req.student_name
    if req.role_title is not None:
        review.role_title = req.role_title
    if req.company_name is not None:
        review.company_name = req.company_name
    if req.feedback_text is not None:
        review.feedback_text = req.feedback_text
    if req.avatar_url is not None:
        review.avatar_url = req.avatar_url
    if req.star_rating is not None:
        review.star_rating = req.star_rating
    if req.order_position is not None:
        review.order_position = req.order_position
    if req.is_active is not None:
        review.is_active = req.is_active
    db.commit()
    db.refresh(review)
    return {"status": "success", "message": "Review updated"}

@router.delete("/learner-reviews/{review_id}")
async def delete_learner_review(review_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete a learner review. Admin only."""
    review = db.query(HomeLearnerReview).filter(HomeLearnerReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"status": "success", "message": "Review deleted"}


# ──────────────────────────────────────────────────
#  HOME AI ECOSYSTEM SECTION
# ──────────────────────────────────────────────────

class HomeAIEcosystemCardSchema(BaseModel):
    title: str
    description: str
    accent_color: Optional[str] = "#4facfe"
    order_position: int = 0
    is_active: Optional[bool] = True


class HomeAIEcosystemSectionSchema(BaseModel):
    label: str = "IINM AI Ecosystem"
    heading_line1: str = "Everything you need"
    heading_line2: str = "to master modern AI"
    accent_word: str = "modern AI"
    lead: str = "One complete learning environment. Six interconnected pillars. From your first doubt to your final credential — everything lives here."


class HomeCTASectionSchema(BaseModel):
    badge_text: str = "Admissions Open"
    heading_line1: str = "Ready to"
    heading_accent: str = "Connect the Dots"
    heading_line2: str = "of AI?"
    description: str = "Enroll in our upcoming cohort to master deep tech competencies, work in elite robotics laboratories, and accelerate your career trajectory."
    button_text: str = "Apply For Admission"
    button_link: str = "/contact-us"


@router.get("/ai-ecosystem-section")
async def get_ai_ecosystem_section(db: Session = Depends(get_db)):
    """Get the AI Ecosystem section header settings (public)."""
    section = db.query(HomeAIEcosystemSection).first()
    if not section:
        return {
            "label": "IINM AI Ecosystem",
            "heading_line1": "Everything you need",
            "heading_line2": "to master modern AI",
            "accent_word": "modern AI",
            "lead": "One complete learning environment. Six interconnected pillars. From your first doubt to your final credential — everything lives here.",
        }
    try:
        data = json.loads(section.content_json) if section.content_json else {}
    except Exception:
        data = {}
    return {
        "label": data.get("label", "IINM AI Ecosystem"),
        "heading_line1": data.get("heading_line1", "Everything you need"),
        "heading_line2": data.get("heading_line2", "to master modern AI"),
        "accent_word": data.get("accent_word", "modern AI"),
        "lead": data.get("lead", "One complete learning environment. Six interconnected pillars. From your first doubt to your final credential — everything lives here."),
    }


@router.get("/ai-ecosystem-cards")
async def get_ai_ecosystem_cards(db: Session = Depends(get_db)):
    """Get active AI Ecosystem cards ordered by position (public)."""
    records = db.query(HomeAIEcosystemCard).filter(
        HomeAIEcosystemCard.is_active == True
    ).order_by(HomeAIEcosystemCard.order_position.asc()).all()

    # Auto-seed defaults if empty
    if not records:
        defaults = [
            {"title": "AI Doubt Portal",
             "description": "24/7 curriculum-trained AI mentor helping students solve coding, automation, prompting and AI workflow problems instantly.",
             "accent_color": "#4facfe", "order_position": 1},
            {"title": "Latest AI Tools",
             "description": "Hands-on training with ChatGPT, Claude, Gemini, Cursor and every cutting-edge tool the industry adopts. Stay ahead of the curve.",
             "accent_color": "#00f2fe", "order_position": 2},
            {"title": "Live Practical Classes",
             "description": "Real instructors, live coding, screen sharing and interactive problem solving. Learn by building, not just watching.",
             "accent_color": "#4facfe", "order_position": 3},
            {"title": "Verified Credentials",
             "description": "Earn industry-recognized certificates after rigorous assessment. Blockchain-verified badges that recruiters trust.",
             "accent_color": "#00f2fe", "order_position": 4},
            {"title": "Lifetime Updates",
             "description": "AI evolves daily. Your enrollment unlocks every future module, tool update and curriculum refresh forever. Pay once, grow forever.",
             "accent_color": "#4facfe", "order_position": 5},
            {"title": "AI Community",
             "description": "Join a high-signal global network of AI builders, mentors and collaborators. Share prompts, find partners, accelerate together.",
             "accent_color": "#00f2fe", "order_position": 6},
        ]
        for d in defaults:
            db.add(HomeAIEcosystemCard(**d))
        db.commit()
        records = db.query(HomeAIEcosystemCard).filter(
            HomeAIEcosystemCard.is_active == True
        ).order_by(HomeAIEcosystemCard.order_position.asc()).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "accent_color": r.accent_color,
            "order_position": r.order_position,
            "is_active": r.is_active,
        }
        for r in records
    ]


@router.get("/ai-ecosystem-section/all")
async def get_ai_ecosystem_section_all(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get the AI Ecosystem section header settings including all fields (admin)."""
    section = db.query(HomeAIEcosystemSection).first()
    if not section:
        return {
            "label": "IINM AI Ecosystem",
            "heading_line1": "Everything you need",
            "heading_line2": "to master modern AI",
            "accent_word": "modern AI",
            "lead": "One complete learning environment. Six interconnected pillars. From your first doubt to your final credential — everything lives here.",
        }
    try:
        data = json.loads(section.content_json) if section.content_json else {}
    except Exception:
        data = {}
    return {
        "label": data.get("label", "IINM AI Ecosystem"),
        "heading_line1": data.get("heading_line1", "Everything you need"),
        "heading_line2": data.get("heading_line2", "to master modern AI"),
        "accent_word": data.get("accent_word", "modern AI"),
        "lead": data.get("lead", "One complete learning environment. Six interconnected pillars. From your first doubt to your final credential — everything lives here."),
    }


@router.post("/ai-ecosystem-section")
async def create_or_update_ai_ecosystem_section(req: HomeAIEcosystemSectionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update the AI Ecosystem section header."""
    section = db.query(HomeAIEcosystemSection).first()
    payload = json.dumps({
        "label": req.label,
        "heading_line1": req.heading_line1,
        "heading_line2": req.heading_line2,
        "accent_word": req.accent_word,
        "lead": req.lead,
    })
    if not section:
        section = HomeAIEcosystemSection(content_json=payload)
        db.add(section)
    else:
        section.content_json = payload
    db.commit()
    db.refresh(section)
    return {"status": "success", "message": "AI Ecosystem section updated"}


@router.get("/ai-ecosystem-cards/all")
async def get_all_ai_ecosystem_cards(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get all AI Ecosystem cards including inactive ones for admin editing."""
    records = db.query(HomeAIEcosystemCard).order_by(HomeAIEcosystemCard.order_position.asc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "accent_color": r.accent_color,
            "order_position": r.order_position,
            "is_active": r.is_active,
        }
        for r in records
    ]


@router.post("/ai-ecosystem-cards")
async def create_ai_ecosystem_card(req: HomeAIEcosystemCardSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create a new AI Ecosystem card."""
    new_card = HomeAIEcosystemCard(
        title=req.title,
        description=req.description,
        accent_color=req.accent_color or "#4facfe",
        order_position=req.order_position,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return {"status": "success", "message": "Card created", "id": new_card.id}


@router.put("/ai-ecosystem-cards/{card_id}")
async def update_ai_ecosystem_card(card_id: int, req: HomeAIEcosystemCardSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Update an existing AI Ecosystem card."""
    card = db.query(HomeAIEcosystemCard).filter(HomeAIEcosystemCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    card.title = req.title
    card.description = req.description
    if req.accent_color is not None:
        card.accent_color = req.accent_color
    if req.order_position is not None:
        card.order_position = req.order_position
    if req.is_active is not None:
        card.is_active = req.is_active
    db.commit()
    db.refresh(card)
    return {"status": "success", "message": "Card updated"}


@router.delete("/ai-ecosystem-cards/{card_id}")
async def delete_ai_ecosystem_card(card_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Delete an AI Ecosystem card."""
    card = db.query(HomeAIEcosystemCard).filter(HomeAIEcosystemCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"status": "success", "message": "Card deleted"}


# ══════════════════════════════════════════════════════
#  FOMO NOTIFICATIONS SETTINGS
# ══════════════════════════════════════════════════════

FOMO_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "fomo_settings.json")


class FomoThemeSchema(BaseModel):
    is_active: bool = True
    position: str = "bottom-left"
    bg_color: str = "#0a1628"
    text_color: str = "#ffffff"
    gradient_style: str = "linear-gradient(135deg, #0a1628 0%, #1a2942 100%)"
    use_gradient: bool = True
    border_radius: str = "round"
    animation_type: str = "slide-fade"
    display_duration: int = 6
    interval_duration: int = 12


class FomoEventSchema(BaseModel):
    id: str
    student_name: str
    image_url: Optional[str] = None
    action: str = "purchased"  # "purchased", "certified", "joined"
    course_name: str
    location: str
    time_text: str


class FomoSettingsSchema(BaseModel):
    theme: FomoThemeSchema
    events: List[FomoEventSchema]


def get_default_fomo_settings():
    return {
        "theme": {
            "is_active": True,
            "position": "bottom-left",
            "bg_color": "#0a1628",
            "text_color": "#ffffff",
            "gradient_style": "linear-gradient(135deg, #0a1628 0%, #1a2942 100%)",
            "use_gradient": True,
            "border_radius": "round",
            "animation_type": "slide-fade",
            "display_duration": 6,
            "interval_duration": 12
        },
        "events": [
            {
                "id": "1",
                "student_name": "Rahul Das",
                "image_url": "/female-teacher.png",
                "action": "purchased",
                "course_name": "Generative AI Masterclass",
                "location": "Kolkata, WB",
                "time_text": "2 minutes ago"
            },
            {
                "id": "2",
                "student_name": "Priya Sharma",
                "image_url": "/female-teacher.png",
                "action": "certified",
                "course_name": "Robotics & Elite AI Program",
                "location": "Mumbai, MH",
                "time_text": "5 minutes ago"
            },
            {
                "id": "3",
                "student_name": "Amit Roy",
                "image_url": "/female-teacher.png",
                "action": "joined",
                "course_name": "AI Agent Developer Cohort",
                "location": "Delhi, NCR",
                "time_text": "12 minutes ago"
            },
            {
                "id": "4",
                "student_name": "Sneha Bose",
                "image_url": "/female-teacher.png",
                "action": "purchased",
                "course_name": "Cursor & Claude Prompt Engineering",
                "location": "Kolkata, WB",
                "time_text": "15 minutes ago"
            },
            {
                "id": "5",
                "student_name": "Arjun Mehta",
                "image_url": "/female-teacher.png",
                "action": "certified",
                "course_name": "Generative AI Masterclass",
                "location": "Bangalore, KA",
                "time_text": "30 minutes ago"
            }
        ]
    }


def load_fomo_settings():
    os.makedirs(os.path.dirname(FOMO_FILE_PATH), exist_ok=True)
    if not os.path.exists(FOMO_FILE_PATH):
        default_data = get_default_fomo_settings()
        with open(FOMO_FILE_PATH, "w") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    try:
        with open(FOMO_FILE_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading fomo settings: {e}")
        return get_default_fomo_settings()


def save_fomo_settings(data):
    os.makedirs(os.path.dirname(FOMO_FILE_PATH), exist_ok=True)
    try:
        with open(FOMO_FILE_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logging.error(f"Error saving fomo settings: {e}")
        return False


@router.get("/fomo", response_model=FomoSettingsSchema)
async def get_fomo_settings():
    """Retrieve the global FOMO notification settings and events list."""
    return load_fomo_settings()


@router.put("/fomo")
async def update_fomo_settings(req: FomoSettingsSchema, device: str = Depends(require_device)):
    """Create or update the FOMO notification settings. Admin only."""
    success = save_fomo_settings(req.model_dump())
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save FOMO settings file."
        )
    return {"status": "success", "message": "FOMO settings updated successfully"}


@router.get("/cta-section")
async def get_cta_section(db: Session = Depends(get_db)):
    """Get the homepage CTA section content (public)."""
    section = db.query(HomeCTASection).first()
    if not section:
        return {
            "badge_text": "Admissions Open",
            "heading_line1": "Ready to",
            "heading_accent": "Connect the Dots",
            "heading_line2": "of AI?",
            "description": "Enroll in our upcoming cohort to master deep tech competencies, work in elite robotics laboratories, and accelerate your career trajectory.",
            "button_text": "Apply For Admission",
            "button_link": "/contact-us",
        }
    try:
        data = json.loads(section.content_json) if section.content_json else {}
    except Exception:
        data = {}
    return {
        "badge_text": data.get("badge_text", "Admissions Open"),
        "heading_line1": data.get("heading_line1", "Ready to"),
        "heading_accent": data.get("heading_accent", "Connect the Dots"),
        "heading_line2": data.get("heading_line2", "of AI?"),
        "description": data.get("description", "Enroll in our upcoming cohort to master deep tech competencies, work in elite robotics laboratories, and accelerate your career trajectory."),
        "button_text": data.get("button_text", "Apply For Admission"),
        "button_link": data.get("button_link", "/contact-us"),
    }


@router.get("/cta-section/all")
async def get_cta_section_all(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Get the homepage CTA section content including all fields (admin)."""
    section = db.query(HomeCTASection).first()
    if not section:
        return {
            "badge_text": "Admissions Open",
            "heading_line1": "Ready to",
            "heading_accent": "Connect the Dots",
            "heading_line2": "of AI?",
            "description": "Enroll in our upcoming cohort to master deep tech competencies, work in elite robotics laboratories, and accelerate your career trajectory.",
            "button_text": "Apply For Admission",
            "button_link": "/contact-us",
        }
    try:
        data = json.loads(section.content_json) if section.content_json else {}
    except Exception:
        data = {}
    return {
        "badge_text": data.get("badge_text", "Admissions Open"),
        "heading_line1": data.get("heading_line1", "Ready to"),
        "heading_accent": data.get("heading_accent", "Connect the Dots"),
        "heading_line2": data.get("heading_line2", "of AI?"),
        "description": data.get("description", "Enroll in our upcoming cohort to master deep tech competencies, work in elite robotics laboratories, and accelerate your career trajectory."),
        "button_text": data.get("button_text", "Apply For Admission"),
        "button_link": data.get("button_link", "/contact-us"),
    }


@router.post("/cta-section")
async def create_or_update_cta_section(req: HomeCTASectionSchema, device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Create or update the homepage CTA section header."""
    section = db.query(HomeCTASection).first()
    payload = json.dumps({
        "badge_text": req.badge_text,
        "heading_line1": req.heading_line1,
        "heading_accent": req.heading_accent,
        "heading_line2": req.heading_line2,
        "description": req.description,
        "button_text": req.button_text,
        "button_link": req.button_link,
    })
    if not section:
        section = HomeCTASection(content_json=payload)
        db.add(section)
    else:
        section.content_json = payload
    db.commit()
    db.refresh(section)
    return {"status": "success", "message": "CTA section updated"}


