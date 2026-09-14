from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, desc
from typing import Optional
from datetime import date, datetime
import os
import uuid
import shutil

from database import get_db
from models import Notice, Batch
from helpers import rewrite_url
from routers.auth import require_device
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

router = APIRouter(prefix="/api/notices", tags=["notices"])

COVERS_DIR = "uploads/notices/covers"
DOCS_DIR = "uploads/notices/docs"
os.makedirs(COVERS_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)

ALLOWED_DOC_EXTS = {".pdf", ".doc", ".docx"}
MAX_DOC_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def _to_dict(n: Notice) -> dict:
    return {
        "id":              n.id,
        "title":           n.title,
        "notice_no":       n.notice_no,
        "notice_date":     n.notice_date.isoformat() if n.notice_date else None,
        "category":        n.category or "General",
        "description":     n.description,
        "cover_image":     rewrite_url(n.cover_image),
        "attachment_url":  rewrite_url(n.attachment_url),
        "attachment_name": n.attachment_name,
        "is_active":       bool(n.is_active),
        "is_pinned":       bool(n.is_pinned),
        "batch_id":        n.batch_id,
        "batch_name":      n.batch.name if n.batch else None,
        "created_at":      n.created_at.isoformat() if n.created_at else None,
        "updated_at":      n.updated_at.isoformat() if n.updated_at else None,
    }


def _parse_date(val: Optional[str]) -> date:
    if not val or not val.strip():
        return date.today()
    try:
        return datetime.strptime(val.strip(), "%Y-%m-%d").date()
    except ValueError:
        return date.today()


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/public")
def get_public_notices(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    # Public board is institute-wide only — batch-targeted notices stay in the student panel.
    query = (db.query(Notice).options(selectinload(Notice.batch))
             .filter(Notice.is_active == True, Notice.batch_id.is_(None)))

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Notice.title.ilike(term),
                Notice.notice_no.ilike(term),
                Notice.description.ilike(term),
            )
        )

    if category and category.strip() and category.strip().lower() != "all":
        query = query.filter(Notice.category.ilike(category.strip()))

    total = query.count()
    items = (
        query.order_by(
            desc(Notice.is_pinned),
            desc(Notice.notice_date),
            desc(Notice.id),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": [_to_dict(n) for n in items],
        "total": total,
    }


@router.get("/public/{notice_id}")
def get_public_notice_detail(notice_id: int, db: Session = Depends(get_db)):
    notice = (
        db.query(Notice)
        .filter(Notice.id == notice_id, Notice.is_active == True,
                Notice.batch_id.is_(None))
        .first()
    )
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found or inactive")
    return _to_dict(notice)


@router.get("/categories")
def get_notice_categories(db: Session = Depends(get_db)):
    standard = ["General", "Academic", "Admission", "Examinations", "Events", "Holiday"]
    db_cats = [
        r[0] for r in db.query(Notice.category).distinct().filter(Notice.category.isnot(None)).all()
        if r[0] and r[0].strip()
    ]
    all_cats = list(dict.fromkeys(standard + db_cats))
    return all_cats


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS (Protected with require_device)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("", dependencies=[Depends(require_device)])
def get_all_admin_notices(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),  # 'all', 'active', 'draft', 'pinned'
    db: Session = Depends(get_db),
):
    query = db.query(Notice).options(selectinload(Notice.batch))

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Notice.title.ilike(term),
                Notice.notice_no.ilike(term),
                Notice.description.ilike(term),
            )
        )

    if category and category.strip() and category.strip().lower() != "all":
        query = query.filter(Notice.category.ilike(category.strip()))

    if status == "active":
        query = query.filter(Notice.is_active == True)
    elif status == "draft":
        query = query.filter(Notice.is_active == False)
    elif status == "pinned":
        query = query.filter(Notice.is_pinned == True)

    notices = query.order_by(
        desc(Notice.is_pinned),
        desc(Notice.notice_date),
        desc(Notice.id),
    ).all()

    return [_to_dict(n) for n in notices]


@router.post("", dependencies=[Depends(require_device)])
def create_notice(
    title:        str = Form(...),
    notice_no:   Optional[str] = Form(None),
    notice_date: Optional[str] = Form(None),
    category:    str = Form("General"),
    description: Optional[str] = Form(None),
    is_active:   bool = Form(True),
    is_pinned:   bool = Form(False),
    batch_id:    Optional[int] = Form(None),  # None/0 = institute-wide
    cover_image: Optional[UploadFile] = File(None),
    attachment:  Optional[UploadFile] = File(None),
    db:          Session = Depends(get_db),
):
    parsed_date = _parse_date(notice_date)
    target_batch_id = batch_id if batch_id else None
    if target_batch_id and not db.query(Batch).filter(Batch.id == target_batch_id).first():
        raise HTTPException(status_code=400, detail="Batch not found")

    # 1. Handle Cover Image
    cover_image_url = None
    if cover_image and cover_image.filename:
        ext = validate_upload(cover_image, ALLOWED_IMAGE_EXTENSIONS)
        fname = f"cover_{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(COVERS_DIR, fname)
        with open(target_path, "wb") as f:
            shutil.copyfileobj(cover_image.file, f)
        cover_image_url = f"/uploads/notices/covers/{fname}"

    # 2. Handle PDF/Doc Attachment
    attachment_url = None
    attachment_name = None
    if attachment and attachment.filename:
        ext = validate_upload(attachment, ALLOWED_DOC_EXTS, max_size=MAX_DOC_SIZE_BYTES)
        fname = f"doc_{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(DOCS_DIR, fname)
        with open(target_path, "wb") as f:
            shutil.copyfileobj(attachment.file, f)
        attachment_url = f"/uploads/notices/docs/{fname}"
        attachment_name = attachment.filename

    notice = Notice(
        title=title.strip(),
        notice_no=notice_no.strip() if notice_no else None,
        notice_date=parsed_date,
        category=category.strip() if category else "General",
        description=description,
        cover_image=cover_image_url,
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        is_active=is_active,
        is_pinned=is_pinned,
        batch_id=target_batch_id,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return _to_dict(notice)


@router.put("/{notice_id}", dependencies=[Depends(require_device)])
def update_notice(
    notice_id:          int,
    title:               str = Form(...),
    notice_no:          Optional[str] = Form(None),
    notice_date:        Optional[str] = Form(None),
    category:           str = Form("General"),
    description:        Optional[str] = Form(None),
    is_active:          bool = Form(True),
    is_pinned:          bool = Form(False),
    batch_id:           Optional[int] = Form(None),  # 0 clears targeting -> institute-wide
    remove_cover_image: bool = Form(False),
    remove_attachment:  bool = Form(False),
    cover_image:        Optional[UploadFile] = File(None),
    attachment:         Optional[UploadFile] = File(None),
    db:                 Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    notice.title = title.strip()
    notice.notice_no = notice_no.strip() if notice_no else None
    notice.notice_date = _parse_date(notice_date)
    notice.category = category.strip() if category else "General"
    notice.description = description
    notice.is_active = is_active
    notice.is_pinned = is_pinned

    if batch_id is not None:
        target_batch_id = batch_id if batch_id > 0 else None
        if target_batch_id and not db.query(Batch).filter(Batch.id == target_batch_id).first():
            raise HTTPException(status_code=400, detail="Batch not found")
        notice.batch_id = target_batch_id

    # Cover image removal/update
    if remove_cover_image and notice.cover_image:
        old_path = notice.cover_image.lstrip("/")
        if os.path.exists(old_path):
            try: os.remove(old_path)
            except OSError: pass
        notice.cover_image = None

    if cover_image and cover_image.filename:
        if notice.cover_image:
            old_path = notice.cover_image.lstrip("/")
            if os.path.exists(old_path):
                try: os.remove(old_path)
                except OSError: pass
        ext = validate_upload(cover_image, ALLOWED_IMAGE_EXTENSIONS)
        fname = f"cover_{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(COVERS_DIR, fname)
        with open(target_path, "wb") as f:
            shutil.copyfileobj(cover_image.file, f)
        notice.cover_image = f"/uploads/notices/covers/{fname}"

    # Attachment removal/update
    if remove_attachment and notice.attachment_url:
        old_path = notice.attachment_url.lstrip("/")
        if os.path.exists(old_path):
            try: os.remove(old_path)
            except OSError: pass
        notice.attachment_url = None
        notice.attachment_name = None

    if attachment and attachment.filename:
        if notice.attachment_url:
            old_path = notice.attachment_url.lstrip("/")
            if os.path.exists(old_path):
                try: os.remove(old_path)
                except OSError: pass
        ext = validate_upload(attachment, ALLOWED_DOC_EXTS, max_size=MAX_DOC_SIZE_BYTES)
        fname = f"doc_{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(DOCS_DIR, fname)
        with open(target_path, "wb") as f:
            shutil.copyfileobj(attachment.file, f)
        notice.attachment_url = f"/uploads/notices/docs/{fname}"
        notice.attachment_name = attachment.filename

    db.commit()
    db.refresh(notice)
    return _to_dict(notice)


@router.patch("/{notice_id}/toggle-active", dependencies=[Depends(require_device)])
def toggle_active(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    notice.is_active = not notice.is_active
    db.commit()
    db.refresh(notice)
    return {"id": notice.id, "is_active": notice.is_active}


@router.patch("/{notice_id}/toggle-pinned", dependencies=[Depends(require_device)])
def toggle_pinned(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    notice.is_pinned = not notice.is_pinned
    db.commit()
    db.refresh(notice)
    return {"id": notice.id, "is_pinned": notice.is_pinned}


@router.delete("/{notice_id}", dependencies=[Depends(require_device)])
def delete_notice(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    if notice.cover_image:
        old_path = notice.cover_image.lstrip("/")
        if os.path.exists(old_path):
            try: os.remove(old_path)
            except OSError: pass

    if notice.attachment_url:
        old_path = notice.attachment_url.lstrip("/")
        if os.path.exists(old_path):
            try: os.remove(old_path)
            except OSError: pass

    db.delete(notice)
    db.commit()
    return {"ok": True, "deleted_id": notice_id}
