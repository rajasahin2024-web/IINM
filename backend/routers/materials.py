from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Header, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os
import uuid
import shutil
import logging
import tempfile
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("BASE_URL", "http://localhost:2007")

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api", tags=["materials"])

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB

# Extensions that must NEVER be stored — serving them from /uploads would allow
# XSS attacks (HTML/JS execution) or server-side code execution.
BLOCKED_EXTENSIONS = {
    ".html", ".htm", ".xhtml", ".js", ".mjs", ".ts", ".tsx",
    ".jsx", ".php", ".php3", ".php4", ".php5", ".phtml",
    ".asp", ".aspx", ".jsp", ".cgi", ".py", ".rb", ".pl",
    ".sh", ".bat", ".cmd", ".ps1", ".exe", ".dll", ".so",
    ".xml",  # can trigger SSRF in some parsers
}

def _require_approved_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db),
) -> str:
    """Require an approved device token to upload or delete materials."""
    if not x_device_token:
        raise HTTPException(status_code=401, detail="X-Device-Token header required")
    from models import DeviceSession
    session = db.query(DeviceSession).filter(
        DeviceSession.device_token == x_device_token,
        DeviceSession.is_approved == True
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized device")
    return x_device_token

UPLOAD_DIR = "uploads/materials"
THUMB_DIR  = "uploads/thumbnails"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMB_DIR,  exist_ok=True)

R2_MATERIALS_PREFIX = "course-materials/"

# ─── R2 Helper ────────────────────────────────────────────────────────────────

def _get_r2_client(db: Session):
    """Return (boto3_s3_client, r2_settings) when R2 is active; else (None, None)."""
    try:
        import boto3
        r2 = db.query(models.R2Settings).first()
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


# ─── HLS Background Transcode ──────────────────────────────────────────────────

def _transcode_video_hls_background(material_id: int, source_bytes: bytes, source_ext: str, r2_key: str):
    """Background task: transcode a video to HLS and upload to R2.

    Runs after the upload response is sent. Uses its own DB session
    (the request session is closed by then). Silently skips if FFmpeg
    is missing or HLS is disabled.
    """
    from hls.ffmpeg_check import is_ffmpeg_installed
    from hls.video_transcode import transcode_to_hls, DEFAULT_QUALITIES
    from hls.r2_hls_upload import upload_hls_to_r2
    from database import SessionLocal

    db = SessionLocal()
    temp_input = None
    temp_hls_dir = None
    try:
        # Check HLS is enabled + FFmpeg installed
        r2_settings = db.query(models.R2Settings).first()
        if not r2_settings or not r2_settings.hls_enabled or not r2_settings.is_active:
            logging.info(f"HLS transcode skipped (disabled) for material {material_id}")
            return
        if not is_ffmpeg_installed():
            logging.warning(f"HLS transcode skipped (no FFmpeg) for material {material_id}")
            return
        if not r2_settings.public_url or not r2_settings.bucket_name:
            logging.warning(f"HLS transcode skipped (no R2 public_url) for material {material_id}")
            return

        # Parse qualities
        qualities = [q.strip() for q in (r2_settings.hls_qualities or "").split(",") if q.strip()] or DEFAULT_QUALITIES

        # Write source bytes to temp file
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=source_ext or ".mp4")
        temp_input.write(source_bytes)
        temp_input.close()

        # Transcode to HLS
        hls_uuid = uuid.uuid4().hex
        temp_hls_dir = os.path.join(tempfile.gettempdir(), f"hls_{hls_uuid}")
        master_path = transcode_to_hls(temp_input.name, temp_hls_dir, qualities)
        if not master_path:
            logging.error(f"HLS transcode failed for material {material_id}")
            return

        # Build R2 client and upload
        s3, r2 = _get_r2_client(db)
        if not s3 or not r2:
            logging.error(f"R2 client unavailable for HLS upload (material {material_id})")
            return

        r2_prefix = f"course-materials/hls/{hls_uuid}"
        master_url = upload_hls_to_r2(
            s3_client=s3,
            bucket_name=r2.bucket_name,
            public_url=r2.public_url,
            local_dir=temp_hls_dir,
            r2_prefix=r2_prefix,
        )
        # upload_hls_to_r2 already deletes temp_hls_dir
        temp_hls_dir = None

        if master_url:
            # Update the material row
            mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
            if mat:
                mat.hls_url = master_url
                db.commit()
                logging.info(f"HLS URL saved for material {material_id}: {master_url}")
        else:
            logging.error(f"HLS upload returned no master_url for material {material_id}")

    except Exception as e:
        logging.error(f"HLS background transcode error for material {material_id}: {e}")
    finally:
        # Clean up temp input file
        if temp_input and os.path.exists(temp_input.name):
            os.unlink(temp_input.name)
        # Clean up temp HLS dir if still exists (upload failed before cleanup)
        if temp_hls_dir and os.path.exists(temp_hls_dir):
            shutil.rmtree(temp_hls_dir, ignore_errors=True)
        db.close()


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class MaterialResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    tags: Optional[str] = None
    file_type: str
    file_url: Optional[str] = None
    hls_url: Optional[str] = None
    youtube_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_size: Optional[int] = None
    order_position: int = 0

    created_at: datetime

    class Config:
        from_attributes = True

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.get("/materials/tags")
def get_all_tags(device: str = Depends(require_device), db: Session = Depends(get_db)):
    rows = db.query(models.CourseMaterial.tags).filter(
        models.CourseMaterial.tags.isnot(None),
        models.CourseMaterial.tags != ""
    ).all()
    tag_set: set[str] = set()
    for (tag_str,) in rows:
        for t in tag_str.split(","):
            t = t.strip()
            if t:
                tag_set.add(t)
    return sorted(tag_set)


@router.get("/materials", response_model=List[MaterialResponse])
def get_all_materials(
    file_type: Optional[str] = Query(None),
    search:    Optional[str] = Query(None),
    tag:       Optional[str] = Query(None),
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Global content library — no course filter required."""
    query = db.query(models.CourseMaterial)
    if file_type and file_type != "all":
        query = query.filter(models.CourseMaterial.file_type == file_type)
    if search:
        query = query.filter(models.CourseMaterial.title.ilike(f"%{search}%"))
    if tag:
        query = query.filter(models.CourseMaterial.tags.ilike(f"%{tag}%"))
    return query.order_by(models.CourseMaterial.order_position.asc(), models.CourseMaterial.id.desc()).all()


@router.post("/materials", response_model=MaterialResponse)
async def upload_material(
    title:       str                    = Form(...),
    description: Optional[str]          = Form(None),
    tags:        Optional[str]          = Form(None),
    youtube_url: Optional[str]          = Form(None),
    file:        Optional[UploadFile]   = File(None),
    thumbnail:   Optional[UploadFile]   = File(None),
    background_tasks: BackgroundTasks   = None,
    device:      str                    = Depends(require_device),
    db: Session = Depends(get_db),
):
    """
    Upload a material.
    - If R2 is configured and active  → stores under course-materials/ in the R2 bucket.
    - Otherwise                       → falls back to local uploads/ directory.
    """
    file_url      = None
    file_type     = None
    file_size     = None
    thumbnail_url = None

    if youtube_url and youtube_url.strip():
        file_type = "youtube"

    elif file:
        # ── Size check ────────────────────────────────
        file.file.seek(0, 2)
        file_bytes = file.file.tell()
        file.file.seek(0)
        if file_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 500 MB.")

        ext          = os.path.splitext(file.filename)[1].lower()
        content_type = file.content_type or ""

        # ── Block dangerous extensions (XSS / code execution prevention) ──
        if ext in BLOCKED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' is not allowed for security reasons."
            )

        if ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"] or content_type.startswith("video/"):
            file_type = "video"
        elif ext == ".pdf" or content_type == "application/pdf":
            file_type = "pdf"
        elif ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"] or content_type.startswith("image/"):
            file_type = "image"
        else:
            file_type = "document"

        unique_name = f"{uuid.uuid4()}{ext}"
        content     = await file.read()
        file_size   = len(content)

        # ── Try R2 ────────────────────────────────────
        s3, r2 = _get_r2_client(db)
        r2_uploaded = False
        if s3 and r2:
            r2_key  = f"{R2_MATERIALS_PREFIX}{unique_name}"
            pub      = (r2.public_url or "").rstrip("/")
            if pub:
                s3.put_object(
                    Bucket=r2.bucket_name,
                    Key=r2_key,
                    Body=content,
                    ContentType=content_type or "application/octet-stream",
                )
                file_url = f"{pub}/{r2_key}"
                r2_uploaded = True
            else:
                logging.error("R2 upload skipped: public_url is empty — falling back to local storage")
        if not r2_uploaded:
            # ── Local fallback ────────────────────────
            save_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(save_path, "wb") as buf:
                buf.write(content)
            file_url  = f"{BASE_URL}/uploads/materials/{unique_name}"
            file_size = os.path.getsize(save_path)
    else:
        raise HTTPException(status_code=400, detail="Either a file or a YouTube URL must be provided")

    # ── Thumbnail ─────────────────────────────────────────────────────────────
    if thumbnail and file_type in ["video", "youtube"]:
        t_ext     = os.path.splitext(thumbnail.filename)[1].lower() or ".jpg"
        t_name    = f"{uuid.uuid4()}{t_ext}"
        t_content = await thumbnail.read()

        s3, r2 = _get_r2_client(db)
        if s3 and r2:
            t_key = f"{R2_MATERIALS_PREFIX}thumbnails/{t_name}"
            s3.put_object(Bucket=r2.bucket_name, Key=t_key, Body=t_content, ContentType="image/jpeg")
            pub           = (r2.public_url or "").rstrip("/")
            thumbnail_url = f"{pub}/{t_key}" if pub else t_key
        else:
            t_path = os.path.join(THUMB_DIR, t_name)
            with open(t_path, "wb") as tbuf:
                tbuf.write(t_content)
            thumbnail_url = f"{BASE_URL}/uploads/thumbnails/{t_name}"

    # ── Normalise tags ────────────────────────────────────────────────────────
    clean_tags = None
    if tags:
        parts      = [t.strip().lstrip("#").lower() for t in tags.replace(",", " ").split() if t.strip()]
        clean_tags = ",".join(dict.fromkeys(parts))

    # ── Get next order position ──────────────────────────────────────────────────
    max_position = db.query(func.max(models.CourseMaterial.order_position)).scalar() or 0
    next_position = max_position + 1

    material = models.CourseMaterial(
        title=title, description=description, tags=clean_tags,
        file_type=file_type, file_url=file_url,
        youtube_url=youtube_url.strip() if youtube_url else None,
        thumbnail_url=thumbnail_url, file_size=file_size,
        order_position=next_position,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # ── Trigger silent HLS transcoding in background (videos only) ──
    if background_tasks and file_type == "video" and content:
        background_tasks.add_task(
            _transcode_video_hls_background,
            material_id=material.id,
            source_bytes=content,
            source_ext=ext or ".mp4",
            r2_key="",
        )

    return material


@router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    title:       str           = Form(...),
    description: Optional[str] = Form(None),
    tags:        Optional[str] = Form(None),
    device:      str           = Depends(require_device),
    db: Session = Depends(get_db),
):
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    mat.title       = title
    mat.description = description
    if tags is not None:
        parts   = [t.strip().lstrip("#").lower() for t in tags.replace(",", " ").split() if t.strip()]
        mat.tags = ",".join(dict.fromkeys(parts)) if parts else None
    db.commit()
    db.refresh(mat)
    return mat


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    s3, r2 = _get_r2_client(db)
    pub     = (r2.public_url or "").rstrip("/") if r2 else ""

    for url in [mat.file_url, mat.thumbnail_url]:
        if not url:
            continue
        if s3 and r2 and pub and url.startswith(pub):
            # Delete from R2
            r2_key = url[len(pub):].lstrip("/")
            try:
                s3.delete_object(Bucket=r2.bucket_name, Key=r2_key)
            except Exception:
                pass
        else:
            # Delete from local disk
            for prefix in [f"{BASE_URL}/", "/"]:
                if url.startswith(prefix):
                    relative = url[len(prefix):]
                    break
            else:
                relative = None
            if relative and os.path.exists(relative):
                try:
                    os.remove(relative)
                except OSError:
                    pass

    db.delete(mat)
    db.commit()
    return {"message": "Deleted"}


@router.put("/materials/reorder")
def reorder_materials(
    material_orders: List[dict],  # [{"id": 1, "order_position": 0}, {"id": 2, "order_position": 1}, ...]
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """
    Reorder materials by updating their order_position values.
    Expects a list of objects with 'id' and 'order_position' fields.
    """
    try:
        for item in material_orders:
            material_id = item.get("id")
            new_position = item.get("order_position")
            
            if material_id is None or new_position is None:
                continue
                
            material = db.query(models.CourseMaterial).filter(
                models.CourseMaterial.id == material_id
            ).first()
            
            if material:
                material.order_position = new_position
        
        db.commit()
        return {"message": "Materials reordered successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reorder materials: {str(e)}")


# ─── Legacy course-scoped routes removed ──────────────────────────────────────
