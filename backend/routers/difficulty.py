from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api", tags=["difficulty"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class DifficultyBase(BaseModel):
    label: str           # e.g. "Easy"
    code: str            # e.g. "easy"
    color: str           # e.g. "#22c55e"
    order_index: int = 0
    is_active: bool = True

class DifficultyCreate(DifficultyBase):
    pass

class DifficultyUpdate(BaseModel):
    label: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class DifficultyResponse(DifficultyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── SEED DATA ────────────────────────────────────────────────────────────────

DEFAULT_LEVELS = [
    {"label": "Very Easy",  "code": "very_easy", "color": "#86efac", "order_index": 1},
    {"label": "Easy",       "code": "easy",       "color": "#22c55e", "order_index": 2},
    {"label": "Medium",     "code": "medium",     "color": "#f59e0b", "order_index": 3},
    {"label": "Hard",       "code": "hard",       "color": "#ef4444", "order_index": 4},
    {"label": "Very Hard",  "code": "very_hard",  "color": "#7f1d1d", "order_index": 5},
]


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.get("/difficulty-levels/seed")
def seed_difficulty_levels(device: str = Depends(require_device), db: Session = Depends(get_db)):
    seeded = 0
    for lvl in DEFAULT_LEVELS:
        existing = db.query(models.DifficultyLevel).filter(models.DifficultyLevel.code == lvl["code"]).first()
        if not existing:
            db.add(models.DifficultyLevel(**lvl))
            seeded += 1
    db.commit()
    return {"message": f"Seeded {seeded} difficulty level(s)"}


@router.get("/difficulty-levels", response_model=List[DifficultyResponse])
def get_difficulty_levels(
    is_active: Optional[bool] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    query = db.query(models.DifficultyLevel)
    if is_active is not None:
        query = query.filter(models.DifficultyLevel.is_active == is_active)
    return query.order_by(models.DifficultyLevel.order_index.asc()).all()


@router.post("/difficulty-levels", response_model=DifficultyResponse)
def create_difficulty_level(lvl: DifficultyCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    existing = db.query(models.DifficultyLevel).filter(models.DifficultyLevel.code == lvl.code.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Difficulty level with code '{lvl.code}' already exists")
    db_lvl = models.DifficultyLevel(
        label=lvl.label.strip(),
        code=lvl.code.lower().strip(),
        color=lvl.color,
        order_index=lvl.order_index,
        is_active=lvl.is_active,
    )
    db.add(db_lvl)
    db.commit()
    db.refresh(db_lvl)
    return db_lvl


@router.put("/difficulty-levels/{lvl_id}", response_model=DifficultyResponse)
def update_difficulty_level(lvl_id: int, lvl: DifficultyUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_lvl = db.query(models.DifficultyLevel).filter(models.DifficultyLevel.id == lvl_id).first()
    if not db_lvl:
        raise HTTPException(status_code=404, detail="Difficulty level not found")
    if lvl.label is not None:
        db_lvl.label = lvl.label.strip()
    if lvl.code is not None:
        conflict = db.query(models.DifficultyLevel).filter(
            models.DifficultyLevel.code == lvl.code.lower().strip(),
            models.DifficultyLevel.id != lvl_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Code '{lvl.code}' is already in use")
        db_lvl.code = lvl.code.lower().strip()
    if lvl.color is not None:
        db_lvl.color = lvl.color
    if lvl.order_index is not None:
        db_lvl.order_index = lvl.order_index
    if lvl.is_active is not None:
        db_lvl.is_active = lvl.is_active
    db.commit()
    db.refresh(db_lvl)
    return db_lvl


@router.delete("/difficulty-levels/{lvl_id}")
def delete_difficulty_level(lvl_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_lvl = db.query(models.DifficultyLevel).filter(models.DifficultyLevel.id == lvl_id).first()
    if not db_lvl:
        raise HTTPException(status_code=404, detail="Difficulty level not found")
    db.delete(db_lvl)
    db.commit()
    return {"message": "Deleted successfully"}
