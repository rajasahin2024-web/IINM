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
import subprocess
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

def _generate_thumbnail(video_path: str, output_jpg: str) -> bool:
    """Grab a frame ~1s into the video as a JPEG thumbnail via FFmpeg."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-ss", "00:00:01", "-i", video_path,
             "-vframes", "1", "-vf", "scale=1280:-2", "-q:v", "3", output_jpg],
            capture_output=True, text=True, timeout=120,
        )
        return result.returncode == 0 and os.path.exists(output_jpg)
    except Exception as e:
        logging.warning(f"Thumbnail generation failed: {e}")
        return False


def _set_hls_status(db: Session, material_id: int, status: str, error: Optional[str] = None):
    """Update hls_status/hls_error on a material row (own transaction)."""
    try:
        mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
        if mat:
            mat.hls_status = status
            mat.hls_error = error
            db.commit()
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to set hls_status={status} for material {material_id}: {e}")


def _r2_key_of_url(url: Optional[str], public_url: str) -> Optional[str]:
    """Extract the R2 object key from a public URL (module-level helper)."""
    if not url or not public_url:
        return None
    pub = public_url.rstrip("/")
    if not url.startswith(pub):
        return None
    return url[len(pub):].lstrip("/")


def _transcode_video_hls_background(material_id: int, source_key: str):
    """Background task: transcode a video to HLS and upload to R2.

    Downloads the source object from R2 straight to a temp file (streaming —
    the video never sits in RAM), transcodes with FFmpeg, uploads the HLS
    output back to R2 and finally deletes the source object (the HLS
    renditions fully replace it).

    Runs after the upload response is sent. Uses its own DB session
    (the request session is closed by then).
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
            _set_hls_status(db, material_id, "failed", "HLS transcoding is disabled in settings")
            return
        if not is_ffmpeg_installed():
            logging.warning(f"HLS transcode skipped (no FFmpeg) for material {material_id}")
            _set_hls_status(db, material_id, "failed", "FFmpeg is not installed on the server")
            return
        if not r2_settings.public_url or not r2_settings.bucket_name:
            logging.warning(f"HLS transcode skipped (no R2 public_url) for material {material_id}")
            _set_hls_status(db, material_id, "failed", "R2 storage is not fully configured")
            return

        s3, r2 = _get_r2_client(db)
        if not s3 or not r2:
            logging.error(f"R2 client unavailable for HLS transcode (material {material_id})")
            _set_hls_status(db, material_id, "failed", "R2 client unavailable")
            return

        _set_hls_status(db, material_id, "processing")

        # Parse qualities
        qualities = [q.strip() for q in (r2_settings.hls_qualities or "").split(",") if q.strip()] or DEFAULT_QUALITIES

        # Stream the source object from R2 to a temp file (no RAM buffering)
        ext = os.path.splitext(source_key)[1] or ".mp4"
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_input.close()
        s3.download_file(Bucket=r2.bucket_name, Key=source_key, Filename=temp_input.name)

        # ── Auto-generate a thumbnail if the user didn't provide one ──
        mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
        if mat and not mat.thumbnail_url:
            thumb_name = f"{uuid.uuid4()}.jpg"
            thumb_tmp = os.path.join(tempfile.gettempdir(), f"thumb_{thumb_name}")
            if _generate_thumbnail(temp_input.name, thumb_tmp):
                try:
                    t_key = f"{R2_MATERIALS_PREFIX}thumbnails/{thumb_name}"
                    with open(thumb_tmp, "rb") as tf:
                        s3.put_object(
                            Bucket=r2.bucket_name, Key=t_key, Body=tf.read(),
                            ContentType="image/jpeg",
                        )
                    mat.thumbnail_url = f"{r2.public_url.rstrip('/')}/{t_key}"
                    db.commit()
                    logging.info(f"Auto thumbnail generated for material {material_id}")
                except Exception as e:
                    logging.warning(f"Thumbnail upload failed for material {material_id}: {e}")
                finally:
                    if os.path.exists(thumb_tmp):
                        os.remove(thumb_tmp)

        # Transcode to HLS
        hls_uuid = uuid.uuid4().hex
        temp_hls_dir = os.path.join(tempfile.gettempdir(), f"hls_{hls_uuid}")
        master_path, transcode_err = transcode_to_hls(temp_input.name, temp_hls_dir, qualities)
        if not master_path:
            logging.error(f"HLS transcode failed for material {material_id}: {transcode_err}")
            _set_hls_status(db, material_id, "failed", transcode_err or "FFmpeg transcode failed")
            return

        # Upload HLS output to R2
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

        if not master_url:
            logging.error(f"HLS upload returned no master_url for material {material_id}")
            _set_hls_status(db, material_id, "failed", "HLS upload to storage failed")
            return

        # Success — HLS renditions fully replace the source object.
        # Keep file_url as the original source URL for semantic clarity
        # (the source object itself is deleted from R2 below).
        # The frontend prefers hls_url for playback; file_url is only a
        # fallback used while HLS is not yet ready.
        mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
        if mat:
            mat.hls_url = master_url
            mat.hls_status = "ready"
            mat.hls_error = None
            db.commit()
            logging.info(f"HLS ready for material {material_id}: {master_url}")

        # Delete the now-redundant source object from R2
        try:
            s3.delete_object(Bucket=r2.bucket_name, Key=source_key)
            logging.info(f"Deleted source object {source_key} (material {material_id})")
        except Exception as e:
            logging.warning(f"Failed to delete source object {source_key}: {e}")

    except Exception as e:
        logging.error(f"HLS background transcode error for material {material_id}: {e}")
        _set_hls_status(db, material_id, "failed", str(e)[:500])
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
    hls_status: Optional[str] = None
    hls_error: Optional[str] = None
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


# ─── Presigned Direct-to-R2 Upload ────────────────────────────────────────────

class PresignRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"
    size: int


@router.post("/materials/presign")
def presign_material_upload(
    body: PresignRequest,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """
    Issue a short-lived presigned PUT URL so the browser can upload the file
    directly to R2 — bypassing this server (and any proxy body-size limits)
    entirely. The object is verified when POST /materials confirms the upload.
    """
    if body.size <= 0:
        raise HTTPException(status_code=400, detail="Invalid file size")
    if body.size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 500 MB.")

    ext = os.path.splitext(body.filename)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for security reasons.")

    s3, r2 = _get_r2_client(db)
    if not s3 or not r2:
        raise HTTPException(status_code=503, detail="Storage is not configured")
    pub = (r2.public_url or "").rstrip("/")
    if not pub:
        raise HTTPException(status_code=503, detail="Storage public URL is not configured")

    key = f"{R2_MATERIALS_PREFIX}{uuid.uuid4()}{ext}"
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": r2.bucket_name,
            "Key": key,
            "ContentType": body.content_type,
        },
        ExpiresIn=1800,  # 30 minutes
    )
    return {
        "upload_url": upload_url,
        "file_url": f"{pub}/{key}",
        "file_key": key,
        "expires_in": 1800,
    }


@router.post("/materials/{material_id}/retranscode", response_model=MaterialResponse)
def retranscode_material(
    material_id: int,
    background_tasks: BackgroundTasks = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Re-run HLS transcoding for a failed/pending video material."""
    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    if mat.file_type != "video":
        raise HTTPException(status_code=400, detail="Only video materials can be transcoded")
    if mat.hls_status not in ("failed", "pending", None):
        raise HTTPException(status_code=409, detail="Transcode already completed or in progress")

    # The source object must still exist in R2 (it is deleted after success)
    s3, r2 = _get_r2_client(db)
    if not s3 or not r2:
        raise HTTPException(status_code=503, detail="Storage is not configured")
    pub = (r2.public_url or "").rstrip("/")
    source_key = None
    if pub and mat.file_url and mat.file_url.startswith(pub):
        candidate = mat.file_url[len(pub):].lstrip("/")
        if not candidate.startswith("course-materials/hls/"):
            try:
                s3.head_object(Bucket=r2.bucket_name, Key=candidate)
                source_key = candidate
            except Exception:
                pass
    if not source_key:
        raise HTTPException(status_code=409, detail="Source file no longer available — please re-upload the video")

    mat.hls_status = "pending"
    mat.hls_error = None
    db.commit()
    db.refresh(mat)

    if background_tasks:
        background_tasks.add_task(
            _transcode_video_hls_background,
            material_id=mat.id,
            source_key=source_key,
        )
    return mat


@router.post("/materials/{material_id}/regenerate-thumbnail", response_model=MaterialResponse)
def regenerate_thumbnail(
    material_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Regenerate a thumbnail from the source video using FFmpeg.

    Works by downloading the source video (or HLS master if source was
    deleted) to a temp file, extracting a frame, uploading the new
    thumbnail to R2, and deleting the old thumbnail object.
    """
    import boto3, tempfile as _tf

    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    if mat.file_type != "video":
        raise HTTPException(status_code=400, detail="Thumbnail regeneration is only available for video materials")

    s3, r2 = _get_r2_client(db)
    if not s3 or not r2:
        raise HTTPException(status_code=503, detail="Storage is not configured")

    pub = (r2.public_url or "").rstrip("/")

    # Determine the source to extract a frame from.
    # Prefer the original source file; fall back to HLS master playlist
    # (FFmpeg can read .m3u8 as input).
    source_url = None
    if mat.file_url and mat.file_url.startswith(pub):
        candidate = mat.file_url[len(pub):].lstrip("/")
        if not candidate.startswith("course-materials/hls/"):
            try:
                s3.head_object(Bucket=r2.bucket_name, Key=candidate)
                source_url = mat.file_url
            except Exception:
                pass
    if not source_url and mat.hls_url:
        source_url = mat.hls_url
    if not source_url:
        raise HTTPException(status_code=409, detail="No source video or HLS stream available to extract a thumbnail from")

    # Download source to temp file (for direct R2 source) or use URL directly for HLS
    temp_input = None
    ff_input = source_url
    if source_url.startswith(pub) and not source_url.endswith(".m3u8"):
        # Download the R2 source object to a temp file
        source_key = source_url[len(pub):].lstrip("/")
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        try:
            s3.download_fileobj(r2.bucket_name, source_key, temp_input)
            temp_input.close()
            ff_input = temp_input.name
        except Exception as e:
            temp_input.close()
            if os.path.exists(temp_input.name):
                os.unlink(temp_input.name)
            raise HTTPException(status_code=500, detail=f"Failed to download source video: {e}")

    # Generate thumbnail with FFmpeg
    thumb_name = f"{uuid.uuid4()}.jpg"
    thumb_tmp = os.path.join(tempfile.gettempdir(), f"thumb_{thumb_name}")
    try:
        ok = _generate_thumbnail(ff_input, thumb_tmp)
        if not ok:
            raise HTTPException(status_code=500, detail="FFmpeg failed to extract a thumbnail frame from the video")

        # Upload new thumbnail to R2
        t_key = f"{R2_MATERIALS_PREFIX}thumbnails/{thumb_name}"
        with open(thumb_tmp, "rb") as tf:
            s3.put_object(Bucket=r2.bucket_name, Key=t_key, Body=tf.read(), ContentType="image/jpeg")
        new_thumb_url = f"{pub}/{t_key}"

        # Delete old thumbnail from R2
        old_key = _r2_key_of_url(mat.thumbnail_url, pub)
        if old_key and old_key.startswith(f"{R2_MATERIALS_PREFIX}thumbnails/"):
            try:
                s3.delete_object(Bucket=r2.bucket_name, Key=old_key)
                logging.info(f"Deleted old thumbnail {old_key} (material {material_id})")
            except Exception as e:
                logging.warning(f"Failed to delete old thumbnail {old_key}: {e}")

        mat.thumbnail_url = new_thumb_url
        db.commit()
        db.refresh(mat)
        logging.info(f"Thumbnail regenerated for material {material_id}: {new_thumb_url}")
        return mat
    finally:
        if os.path.exists(thumb_tmp):
            os.remove(thumb_tmp)
        if temp_input and os.path.exists(temp_input.name):
            os.unlink(temp_input.name)


@router.post("/materials/{material_id}/ai-thumbnail", response_model=MaterialResponse)
async def generate_ai_thumbnail(
    material_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Generate a thumbnail using AI via OpenRouter's Image Generation API.

    Uses the OpenRouter API key from AISettings to generate a visually
    appealing thumbnail based on the material's title and description.
    The generated image is uploaded to R2 and the old thumbnail is deleted.
    """
    import urllib.request as _urllib
    import json as _json
    import base64 as _base64

    mat = db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    # Load AI settings — use OpenRouter (already configured by the user)
    from models import AISettings as _AISettings
    ai = db.query(_AISettings).first()
    if not ai or not ai.openrouter_api_key:
        raise HTTPException(status_code=503, detail="AI is not configured — set OpenRouter API key in AI Settings first")
    if not ai.is_active:
        raise HTTPException(status_code=503, detail="AI settings are disabled — enable them in AI Settings first")

    # The selected_model field stores the image generation model slug
    model = ai.selected_model
    if not model:
        raise HTTPException(status_code=503, detail="No image generation model selected — pick one in AI Settings first")

    s3, r2 = _get_r2_client(db)
    if not s3 or not r2:
        raise HTTPException(status_code=503, detail="Storage is not configured")

    pub = (r2.public_url or "").rstrip("/")

    # Build a prompt for thumbnail generation
    title = mat.title or "Educational Video"
    desc = (mat.description or "").strip()
    tags = (mat.tags or "").strip()
    prompt = (
        f"Create a professional, eye-catching YouTube-style video thumbnail. "
        f"Video title: \"{title}\". "
    )
    if desc:
        prompt += f"Description: {desc[:200]}. "
    if tags:
        prompt += f"Topics: {tags}. "
    prompt += (
        "Make it visually appealing with bold text overlay of the title, "
        "relevant imagery, and a modern educational style. "
        "No watermarks, no real faces of identifiable people."
    )

    # Call OpenRouter Image Generation API
    # POST https://openrouter.ai/api/v1/images
    api_url = "https://openrouter.ai/api/v1/images"
    payload = {
        "model": model,
        "prompt": prompt,
        "aspect_ratio": "16:9",
        "n": 1,
    }

    try:
        req_data = _json.dumps(payload).encode("utf-8")
        req = _urllib.Request(
            api_url, data=req_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {ai.openrouter_api_key}",
            },
            method="POST",
        )
        with _urllib.urlopen(req, timeout=120) as resp:
            result = _json.loads(resp.read().decode("utf-8"))
    except _urllib.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8")[:1000]
        except Exception:
            pass
        logging.error(f"OpenRouter image API failed for material {material_id}: {e} — {err_body}")
        raise HTTPException(status_code=502, detail=f"AI image generation failed: {e.reason}. {err_body[:300]}")
    except Exception as e:
        logging.error(f"AI thumbnail generation API call failed for material {material_id}: {e}")
        raise HTTPException(status_code=502, detail=f"AI image generation failed: {e}")

    # Extract image data from OpenRouter response
    # Response format: { "data": [ { "b64_json": "..." } ], "usage": {...} }
    image_bytes = None
    try:
        data_list = result.get("data", [])
        if data_list and data_list[0].get("b64_json"):
            image_bytes = _base64.b64decode(data_list[0]["b64_json"])
        elif data_list and data_list[0].get("url"):
            # Some models return a URL instead of base64 — download it
            img_url = data_list[0]["url"]
            img_req = _urllib.Request(img_url)
            with _urllib.urlopen(img_req, timeout=60) as img_resp:
                image_bytes = img_resp.read()
    except Exception as e:
        logging.error(f"Failed to parse AI image response for material {material_id}: {e}")

    if not image_bytes:
        logging.warning(f"AI returned no image for material {material_id}, falling back to FFmpeg thumbnail")
        return regenerate_thumbnail(material_id, device, db)

    # Upload AI-generated thumbnail to R2
    thumb_name = f"{uuid.uuid4()}.jpg"
    t_key = f"{R2_MATERIALS_PREFIX}thumbnails/{thumb_name}"
    try:
        s3.put_object(Bucket=r2.bucket_name, Key=t_key, Body=image_bytes, ContentType="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload AI thumbnail to storage: {e}")

    new_thumb_url = f"{pub}/{t_key}"

    # Delete old thumbnail from R2
    old_key = _r2_key_of_url(mat.thumbnail_url, pub)
    if old_key and old_key.startswith(f"{R2_MATERIALS_PREFIX}thumbnails/"):
        try:
            s3.delete_object(Bucket=r2.bucket_name, Key=old_key)
            logging.info(f"Deleted old thumbnail {old_key} (material {material_id})")
        except Exception as e:
            logging.warning(f"Failed to delete old thumbnail {old_key}: {e}")

    mat.thumbnail_url = new_thumb_url
    db.commit()
    db.refresh(mat)
    logging.info(f"AI thumbnail generated for material {material_id}: {new_thumb_url}")
    return mat


@router.post("/materials", response_model=MaterialResponse)
async def upload_material(
    title:       str                    = Form(...),
    description: Optional[str]          = Form(None),
    tags:        Optional[str]          = Form(None),
    youtube_url: Optional[str]          = Form(None),
    file_url:    Optional[str]          = Form(None),   # presigned-flow: R2 public URL of an already-uploaded object
    file_key:    Optional[str]          = Form(None),   # presigned-flow: R2 object key
    file:        Optional[UploadFile]   = File(None),
    thumbnail:   Optional[UploadFile]   = File(None),
    background_tasks: BackgroundTasks   = None,
    device:      str                    = Depends(require_device),
    db: Session = Depends(get_db),
):
    """
    Upload a material.
    - Presigned flow: file already uploaded by the browser directly to R2 —
      pass `file_url` + `file_key` and the object is verified via head_object.
    - Multipart fallback: `file` is stored to R2 (if active) or local uploads/.
    """
    file_url_out  = None
    file_type     = None
    file_size     = None
    thumbnail_url = None
    hls_status    = None
    source_key    = None   # R2 key of the source video, when HLS transcode should run
    content       = None   # raw bytes, only in multipart fallback mode

    if youtube_url and youtube_url.strip():
        file_type = "youtube"

    elif file_key and file_url:
        # ── Presigned flow: verify the browser-uploaded object ─────
        s3, r2 = _get_r2_client(db)
        if not s3 or not r2:
            raise HTTPException(status_code=503, detail="Storage is not configured")
        if not file_key.startswith(R2_MATERIALS_PREFIX):
            raise HTTPException(status_code=400, detail="Invalid storage key")
        ext = os.path.splitext(file_key)[1].lower()
        if ext in BLOCKED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for security reasons.")
        try:
            head = s3.head_object(Bucket=r2.bucket_name, Key=file_key)
        except Exception:
            raise HTTPException(status_code=400, detail="Uploaded file not found in storage. Please retry the upload.")
        file_size = head.get("ContentLength")
        if file_size and file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 500 MB.")
        content_type = head.get("ContentType") or ""
        file_url_out = file_url
        source_key = file_key

        if ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"] or content_type.startswith("video/"):
            file_type = "video"
        elif ext == ".pdf" or content_type == "application/pdf":
            file_type = "pdf"
        elif ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"] or content_type.startswith("image/"):
            file_type = "image"
        else:
            file_type = "document"

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
                file_url_out = f"{pub}/{r2_key}"
                r2_uploaded = True
                source_key = r2_key
            else:
                logging.error("R2 upload skipped: public_url is empty — falling back to local storage")
        if not r2_uploaded:
            # ── Local fallback ────────────────────────
            save_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(save_path, "wb") as buf:
                buf.write(content)
            file_url_out = f"{BASE_URL}/uploads/materials/{unique_name}"
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

    # Videos with an R2 source will be transcoded in the background
    if file_type == "video" and source_key:
        hls_status = "pending"

    material = models.CourseMaterial(
        title=title, description=description, tags=clean_tags,
        file_type=file_type, file_url=file_url_out,
        youtube_url=youtube_url.strip() if youtube_url else None,
        thumbnail_url=thumbnail_url, file_size=file_size,
        order_position=next_position,
        hls_status=hls_status,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # ── Trigger silent HLS transcoding in background (videos on R2 only) ──
    if background_tasks and file_type == "video" and source_key:
        background_tasks.add_task(
            _transcode_video_hls_background,
            material_id=material.id,
            source_key=source_key,
        )

    return material


@router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    title:       str           = Form(...),
    description: Optional[str] = Form(None),
    tags:        Optional[str] = Form(None),
    file_url:    Optional[str] = Form(None),   # presigned-flow: replacement file already in R2
    file_key:    Optional[str] = Form(None),
    file:        Optional[UploadFile] = File(None),      # multipart fallback replacement
    thumbnail:   Optional[UploadFile] = File(None),      # replacement thumbnail
    background_tasks: BackgroundTasks = None,
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

    s3, r2 = _get_r2_client(db)
    pub = (r2.public_url or "").rstrip("/") if r2 else ""

    def _r2_key_of(url: Optional[str]) -> Optional[str]:
        if not url or not pub or not url.startswith(pub):
            return None
        return url[len(pub):].lstrip("/")

    # ── Thumbnail replacement ────────────────────────────────────────────────
    if thumbnail is not None:
        t_ext = os.path.splitext(thumbnail.filename)[1].lower() or ".jpg"
        if t_ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(status_code=400, detail="Thumbnail must be a JPG, PNG or WebP image")
        t_content = await thumbnail.read()
        t_name = f"{uuid.uuid4()}{t_ext}"
        if s3 and r2 and pub:
            t_key = f"{R2_MATERIALS_PREFIX}thumbnails/{t_name}"
            s3.put_object(Bucket=r2.bucket_name, Key=t_key, Body=t_content,
                          ContentType="image/jpeg")
            old_key = _r2_key_of(mat.thumbnail_url)
            if old_key and old_key.startswith(f"{R2_MATERIALS_PREFIX}thumbnails/"):
                try:
                    s3.delete_object(Bucket=r2.bucket_name, Key=old_key)
                except Exception:
                    pass
            mat.thumbnail_url = f"{pub}/{t_key}"
        else:
            t_path = os.path.join(THUMB_DIR, t_name)
            with open(t_path, "wb") as tbuf:
                tbuf.write(t_content)
            mat.thumbnail_url = f"{BASE_URL}/uploads/thumbnails/{t_name}"

    # ── File (video/document) replacement ────────────────────────────────────
    new_source_key: Optional[str] = None
    new_file_type: Optional[str] = None

    if file_key and file_url:
        if not s3 or not r2:
            raise HTTPException(status_code=503, detail="Storage is not configured")
        if not file_key.startswith(R2_MATERIALS_PREFIX):
            raise HTTPException(status_code=400, detail="Invalid storage key")
        ext = os.path.splitext(file_key)[1].lower()
        if ext in BLOCKED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for security reasons.")
        try:
            head = s3.head_object(Bucket=r2.bucket_name, Key=file_key)
        except Exception:
            raise HTTPException(status_code=400, detail="Uploaded file not found in storage. Please retry the upload.")
        if head.get("ContentLength", 0) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 500 MB.")
        content_type = head.get("ContentType") or ""
        new_source_key = file_key
        new_file_size = head.get("ContentLength")
        new_file_url = file_url
    elif file is not None:
        file.file.seek(0, 2)
        f_bytes = file.file.tell()
        file.file.seek(0)
        if f_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 500 MB.")
        ext = os.path.splitext(file.filename)[1].lower()
        if ext in BLOCKED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for security reasons.")
        content = await file.read()
        content_type = file.content_type or ""
        unique_name = f"{uuid.uuid4()}{ext}"
        if s3 and r2 and pub:
            new_source_key = f"{R2_MATERIALS_PREFIX}{unique_name}"
            s3.put_object(Bucket=r2.bucket_name, Key=new_source_key, Body=content,
                          ContentType=content_type or "application/octet-stream")
            new_file_url = f"{pub}/{new_source_key}"
        else:
            save_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(save_path, "wb") as buf:
                buf.write(content)
            new_file_url = f"{BASE_URL}/uploads/materials/{unique_name}"
        new_file_size = len(content)
    else:
        content_type = None
        new_file_size = None
        new_file_url = None

    if new_source_key and s3 and r2:
        # ── Remove the old media: stale HLS folder + old source object ──
        old_hls_prefix = _r2_key_of(mat.hls_url)
        if old_hls_prefix:
            old_hls_prefix = old_hls_prefix.rsplit("/", 1)[0]
            if old_hls_prefix.startswith(f"{R2_MATERIALS_PREFIX}hls/"):
                try:
                    resp = s3.list_objects_v2(Bucket=r2.bucket_name, Prefix=f"{old_hls_prefix}/")
                    keys = [o["Key"] for o in resp.get("Contents", [])]
                    for i in range(0, len(keys), 1000):
                        s3.delete_objects(Bucket=r2.bucket_name,
                                          Delete={"Objects": [{"Key": k} for k in keys[i:i + 1000]]})
                except Exception as e:
                    logging.warning(f"Failed to delete old HLS folder {old_hls_prefix}: {e}")
        old_source_key = _r2_key_of(mat.file_url)
        if old_source_key and old_source_key != new_source_key and not old_source_key.startswith(f"{R2_MATERIALS_PREFIX}hls/"):
            try:
                s3.delete_object(Bucket=r2.bucket_name, Key=old_source_key)
            except Exception:
                pass

        # ── Recompute file type from the new file ──
        ext = os.path.splitext(new_source_key)[1].lower()
        if ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"] or content_type.startswith("video/"):
            new_file_type = "video"
        elif ext == ".pdf" or content_type == "application/pdf":
            new_file_type = "pdf"
        elif ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"] or content_type.startswith("image/"):
            new_file_type = "image"
        else:
            new_file_type = "document"

        mat.file_url = new_file_url
        mat.file_size = new_file_size
        mat.file_type = new_file_type
        mat.youtube_url = None
        mat.hls_url = None
        mat.hls_error = None
        mat.hls_status = "pending" if new_file_type == "video" else None

    db.commit()
    db.refresh(mat)

    # ── Re-transcode the replacement video in the background ──
    if background_tasks and new_source_key and mat.file_type == "video":
        background_tasks.add_task(
            _transcode_video_hls_background,
            material_id=mat.id,
            source_key=new_source_key,
        )

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

    # ── Collect R2 keys to delete (avoid double-deleting the HLS master) ──
    r2_keys: list[str] = []
    for url in [mat.file_url, mat.thumbnail_url]:
        if not url:
            continue
        if s3 and r2 and pub and url.startswith(pub):
            r2_keys.append(url[len(pub):].lstrip("/"))
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

    # ── Delete the whole HLS folder (playlists + segments) from R2 ──
    if s3 and r2 and pub and mat.hls_url and mat.hls_url.startswith(pub):
        # hls_url points to .../hls/{uuid}/master.m3u8 — the folder is everything before the last segment
        hls_prefix = mat.hls_url[len(pub):].lstrip("/").rsplit("/", 1)[0]
        if hls_prefix.startswith(f"{R2_MATERIALS_PREFIX}hls/"):
            try:
                resp = s3.list_objects_v2(Bucket=r2.bucket_name, Prefix=f"{hls_prefix}/")
                keys = [o["Key"] for o in resp.get("Contents", [])]
                for i in range(0, len(keys), 1000):
                    s3.delete_objects(
                        Bucket=r2.bucket_name,
                        Delete={"Objects": [{"Key": k} for k in keys[i:i + 1000]]},
                    )
            except Exception as e:
                logging.warning(f"Failed to delete HLS folder {hls_prefix}: {e}")
        # The master.m3u8 object itself is part of the folder listing above;
        # drop it from the plain-key list so we don't delete it twice.
        r2_keys = [k for k in r2_keys if not k.startswith(f"{hls_prefix}/")]

    for r2_key in r2_keys:
        try:
            s3.delete_object(Bucket=r2.bucket_name, Key=r2_key)
        except Exception:
            pass

    db.delete(mat)
    db.commit()
    return {"message": "Deleted"}


# ─── Orphaned / Redundant Storage Files ───────────────────────────────────────

def _classify_r2_objects(db: Session):
    """Scan R2 course-materials/ and classify objects that are safe to remove.

    Returns (groups, s3, r2) where groups = {
        redundant_sources: [...],  # source videos whose HLS is ready (policy: delete)
        orphan_hls_folders: [...], # HLS folders no material points to
        unreferenced_files: [...], # objects no material references at all
    }
    """
    s3, r2 = _get_r2_client(db)
    if not s3 or not r2:
        return None, None, None
    pub = (r2.public_url or "").rstrip("/")

    materials = db.query(
        models.CourseMaterial.id,
        models.CourseMaterial.title,
        models.CourseMaterial.file_url,
        models.CourseMaterial.thumbnail_url,
        models.CourseMaterial.hls_url,
        models.CourseMaterial.hls_status,
    ).all()

    referenced_keys: set[str] = set()
    referenced_hls_prefixes: set[str] = set()
    redundant_source_keys: dict[str, dict] = {}   # key -> material info
    for m in materials:
        for url in (m.file_url, m.thumbnail_url):
            if url and pub and url.startswith(pub):
                referenced_keys.add(url[len(pub):].lstrip("/"))
        if m.hls_url and pub and m.hls_url.startswith(pub):
            hls_prefix = m.hls_url[len(pub):].lstrip("/").rsplit("/", 1)[0]
            referenced_hls_prefixes.add(hls_prefix)
            referenced_keys.add(m.hls_url[len(pub):].lstrip("/"))
        # Source still on storage while HLS is ready → redundant per policy
        if (m.hls_status == "ready" and m.file_url and m.hls_url
                and m.file_url != m.hls_url and pub and m.file_url.startswith(pub)):
            key = m.file_url[len(pub):].lstrip("/")
            if not key.startswith(f"{R2_MATERIALS_PREFIX}hls/"):
                redundant_source_keys[key] = {"material_id": m.id, "title": m.title}

    groups = {
        "redundant_sources": [],
        "orphan_hls_folders": [],
        "unreferenced_files": [],
    }
    hls_folder_objects: dict[str, list] = {}

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=r2.bucket_name, Prefix=R2_MATERIALS_PREFIX, PaginationConfig={"PageSize": 1000}):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            info = {
                "key": key,
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
            }
            if key.startswith(f"{R2_MATERIALS_PREFIX}hls/"):
                # UUID-level folder: course-materials/hls/{uuid} (rendition
                # subfolders like .../{uuid}/0 must count as the same folder)
                folder = "/".join(key.split("/")[:3])
                hls_folder_objects.setdefault(folder, []).append(info)
            elif key in referenced_keys:
                continue
            elif key in redundant_source_keys:
                groups["redundant_sources"].append({**info, "material": redundant_source_keys[key]})
            else:
                groups["unreferenced_files"].append(info)

    for folder, objects in hls_folder_objects.items():
        if folder not in referenced_hls_prefixes:
            groups["orphan_hls_folders"].append({
                "prefix": folder,
                "object_count": len(objects),
                "size": sum(o["size"] for o in objects),
                "last_modified": max(o["last_modified"] for o in objects),
            })

    return groups, s3, r2


@router.get("/materials/orphaned")
def list_orphaned_files(
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Storage files that are no longer needed (safe-to-delete candidates)."""
    groups, s3, r2 = _classify_r2_objects(db)
    if groups is None:
        raise HTTPException(status_code=503, detail="Storage is not configured")
    return groups


class OrphanDeleteRequest(BaseModel):
    keys: List[str]


@router.post("/materials/orphaned/delete")
def delete_orphaned_files(
    body: OrphanDeleteRequest,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Delete specific orphaned objects from storage. Referenced keys are
    re-verified immediately before deletion (protects against races)."""
    s3, r2 = _get_r2_client(db)
    if not s3 or not r2:
        raise HTTPException(status_code=503, detail="Storage is not configured")

    # Re-classify to get the current safe-to-delete set
    groups, _, _ = _classify_r2_objects(db)
    safe_keys: set[str] = {g["key"] for g in groups["redundant_sources"]}
    safe_keys.update(g["key"] for g in groups["unreferenced_files"])
    for folder in groups["orphan_hls_folders"]:
        safe_keys.add(folder["prefix"])  # handled as prefix below

    deleted, skipped = 0, 0
    plain_keys = [k for k in body.keys if not k.startswith(f"{R2_MATERIALS_PREFIX}hls/")]
    hls_prefixes = [k for k in body.keys if k.startswith(f"{R2_MATERIALS_PREFIX}hls/")]

    for key in plain_keys:
        if key in safe_keys:
            try:
                s3.delete_object(Bucket=r2.bucket_name, Key=key)
                deleted += 1
            except Exception:
                skipped += 1
        else:
            skipped += 1

    for prefix in hls_prefixes:
        if prefix in safe_keys:
            try:
                resp = s3.list_objects_v2(Bucket=r2.bucket_name, Prefix=f"{prefix}/")
                keys = [o["Key"] for o in resp.get("Contents", [])]
                for i in range(0, len(keys), 1000):
                    s3.delete_objects(
                        Bucket=r2.bucket_name,
                        Delete={"Objects": [{"Key": k} for k in keys[i:i + 1000]]},
                    )
                    deleted += len(keys[i:i + 1000])
            except Exception:
                skipped += 1
        else:
            skipped += 1

    return {"deleted": deleted, "skipped": skipped}


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
