from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api", tags=["comprehensions"])

# ─── SCHEMAS ─────────────────────────────────────────

class ComprehensionBase(BaseModel):
    code: str
    title: str
    body_html: str
    is_active: bool = True

class ComprehensionCreate(ComprehensionBase):
    pass

class ComprehensionUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    body_html: Optional[str] = None
    is_active: Optional[bool] = None

class ComprehensionResponse(ComprehensionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── ROUTES ──────────────────────────────────────────

@router.get("/comprehensions", response_model=List[ComprehensionResponse])
def get_comprehensions(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    query = db.query(models.ComprehensionPassage)
    if search:
        query = query.filter(
            models.ComprehensionPassage.title.ilike(f"%{search}%") |
            models.ComprehensionPassage.code.ilike(f"%{search}%") |
            models.ComprehensionPassage.body_html.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.filter(models.ComprehensionPassage.is_active == is_active)
    return query.order_by(models.ComprehensionPassage.id.desc()).all()


@router.get("/comprehensions/{comp_id}", response_model=ComprehensionResponse)
def get_comprehension(comp_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    comp = db.query(models.ComprehensionPassage).filter(models.ComprehensionPassage.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprehension passage not found")
    return comp


@router.post("/comprehensions", response_model=ComprehensionResponse)
def create_comprehension(comp: ComprehensionCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    existing = db.query(models.ComprehensionPassage).filter(models.ComprehensionPassage.code == comp.code.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Comprehension passage with code '{comp.code}' already exists")
    
    db_comp = models.ComprehensionPassage(
        code=comp.code.strip(),
        title=comp.title.strip(),
        body_html=comp.body_html,
        is_active=comp.is_active,
    )
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp


@router.put("/comprehensions/{comp_id}", response_model=ComprehensionResponse)
def update_comprehension(comp_id: int, comp: ComprehensionUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_comp = db.query(models.ComprehensionPassage).filter(models.ComprehensionPassage.id == comp_id).first()
    if not db_comp:
        raise HTTPException(status_code=404, detail="Comprehension passage not found")
    
    if comp.code is not None:
        conflict = db.query(models.ComprehensionPassage).filter(
            models.ComprehensionPassage.code == comp.code.strip(),
            models.ComprehensionPassage.id != comp_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Code '{comp.code}' is already in use")
        db_comp.code = comp.code.strip()
    
    if comp.title is not None:
        db_comp.title = comp.title.strip()
    if comp.body_html is not None:
        db_comp.body_html = comp.body_html
    if comp.is_active is not None:
        db_comp.is_active = comp.is_active
        
    db.commit()
    db.refresh(db_comp)
    return db_comp


@router.patch("/comprehensions/{comp_id}/toggle", response_model=ComprehensionResponse)
def toggle_comprehension_status(comp_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_comp = db.query(models.ComprehensionPassage).filter(models.ComprehensionPassage.id == comp_id).first()
    if not db_comp:
        raise HTTPException(status_code=404, detail="Comprehension passage not found")
    
    db_comp.is_active = not db_comp.is_active
    db.commit()
    db.refresh(db_comp)
    return db_comp


@router.delete("/comprehensions/{comp_id}")
def delete_comprehension(comp_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_comp = db.query(models.ComprehensionPassage).filter(models.ComprehensionPassage.id == comp_id).first()
    if not db_comp:
        raise HTTPException(status_code=404, detail="Comprehension passage not found")
    
    db.delete(db_comp)
    db.commit()
    return {"message": "Deleted successfully"}
