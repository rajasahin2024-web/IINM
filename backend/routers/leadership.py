from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os, uuid, shutil

from database import get_db
from models import LeadershipTeam
from helpers import rewrite_url
from routers.auth import require_device
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

router = APIRouter(prefix="/api/leadership", tags=["leadership"])

UPLOAD_DIR = "uploads/leadership"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _to_dict(m: LeadershipTeam, base_url: str = "") -> dict:
    return {
        "id":          m.id,
        "name":        m.name,
        "designation": m.designation,
        "bio":         m.bio,
        "image_url":   rewrite_url(m.image_url),
        "video_url":   rewrite_url(m.video_url),
        "order_index": m.order_index,
        "is_active":   m.is_active,
        "created_at":  m.created_at.isoformat() if m.created_at else None,
    }

# ── Public endpoint ──────────────────────────────────
@router.get("/public")
def get_public(db: Session = Depends(get_db)):
    members = db.query(LeadershipTeam).filter(
        LeadershipTeam.is_active == True
    ).order_by(LeadershipTeam.order_index).all()
    return [_to_dict(m) for m in members]

# ── Admin: list all ──────────────────────────────────
@router.get("", dependencies=[Depends(require_device)])
def get_all(db: Session = Depends(get_db)):
    members = db.query(LeadershipTeam).order_by(LeadershipTeam.order_index).all()
    return [_to_dict(m) for m in members]

# ── Admin: create ────────────────────────────────────
@router.post("", dependencies=[Depends(require_device)])
def create(
    name:        str = Form(...),
    designation: Optional[str] = Form(None),
    bio:         Optional[str] = Form(None),
    video_url:   Optional[str] = Form(None),
    order_index: int = Form(0),
    is_active:   bool = Form(True),
    image:       Optional[UploadFile] = File(None),
    db:          Session = Depends(get_db),
):
    image_url = None
    if image and image.filename:
        ext = validate_upload(image, ALLOWED_IMAGE_EXTENSIONS)
        fname = f"{uuid.uuid4().hex}{ext}"
        path  = os.path.join(UPLOAD_DIR, fname)
        with open(path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_url = f"/uploads/leadership/{fname}"

    member = LeadershipTeam(
        name=name, designation=designation, bio=bio,
        image_url=image_url, video_url=video_url,
        order_index=order_index, is_active=is_active,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return _to_dict(member)

# ── Admin: update ────────────────────────────────────
@router.put("/{member_id}", dependencies=[Depends(require_device)])
def update(
    member_id:   int,
    name:        str = Form(...),
    designation: Optional[str] = Form(None),
    bio:         Optional[str] = Form(None),
    video_url:   Optional[str] = Form(None),
    order_index: int = Form(0),
    is_active:   bool = Form(True),
    image:       Optional[UploadFile] = File(None),
    db:          Session = Depends(get_db),
):
    member = db.query(LeadershipTeam).filter(LeadershipTeam.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if image and image.filename:
        # Remove old image if exists
        if member.image_url:
            old = member.image_url.lstrip("/")
            if os.path.exists(old):
                os.remove(old)
        ext = validate_upload(image, ALLOWED_IMAGE_EXTENSIONS)
        fname = f"{uuid.uuid4().hex}{ext}"
        path  = os.path.join(UPLOAD_DIR, fname)
        with open(path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        member.image_url = f"/uploads/leadership/{fname}"

    member.name        = name
    member.designation = designation
    member.bio         = bio
    member.video_url   = video_url
    member.order_index = order_index
    member.is_active   = is_active
    db.commit()
    db.refresh(member)
    return _to_dict(member)

# ── Admin: delete ────────────────────────────────────
@router.delete("/{member_id}", dependencies=[Depends(require_device)])
def delete(member_id: int, db: Session = Depends(get_db)):
    member = db.query(LeadershipTeam).filter(LeadershipTeam.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.image_url:
        path = member.image_url.lstrip("/")
        if os.path.exists(path):
            os.remove(path)
    db.delete(member)
    db.commit()
    return {"message": "deleted"}
