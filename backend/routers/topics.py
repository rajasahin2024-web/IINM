from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api", tags=["topics"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    topic_id: int

class TagUpdate(BaseModel):
    name: Optional[str] = None

class TagResponse(TagBase):
    id: int
    topic_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TopicResponse(TopicBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: List[TagResponse] = []

    class Config:
        from_attributes = True


# ─── TOPIC ROUTES ─────────────────────────────────────────────────────────────

@router.get("/topics", response_model=List[TopicResponse])
def get_topics(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    query = db.query(models.Topic)
    if search:
        query = query.filter(models.Topic.name.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.filter(models.Topic.is_active == is_active)
    return query.order_by(models.Topic.name.asc()).all()


@router.post("/topics", response_model=TopicResponse)
def create_topic(topic: TopicCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    existing = db.query(models.Topic).filter(models.Topic.name == topic.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Topic '{topic.name}' already exists")
    db_topic = models.Topic(
        name=topic.name.strip(),
        description=topic.description,
        is_active=topic.is_active,
    )
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic


@router.put("/topics/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: int, topic: TopicUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic.name is not None:
        conflict = db.query(models.Topic).filter(
            models.Topic.name == topic.name.strip(),
            models.Topic.id != topic_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Topic name '{topic.name}' is already in use")
        db_topic.name = topic.name.strip()
    if topic.description is not None:
        db_topic.description = topic.description
    if topic.is_active is not None:
        db_topic.is_active = topic.is_active
    db.commit()
    db.refresh(db_topic)
    return db_topic


@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(db_topic)
    db.commit()
    return {"message": "Deleted successfully"}


# ─── TAG ROUTES ───────────────────────────────────────────────────────────────

@router.get("/tags", response_model=List[TagResponse])
def get_tags(
    topic_id: Optional[int] = None,
    search: Optional[str] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    query = db.query(models.Tag)
    if topic_id is not None:
        query = query.filter(models.Tag.topic_id == topic_id)
    if search:
        query = query.filter(models.Tag.name.ilike(f"%{search}%"))
    return query.order_by(models.Tag.name.asc()).all()


@router.post("/tags", response_model=TagResponse)
def create_tag(tag: TagCreate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == tag.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    existing = db.query(models.Tag).filter(
        models.Tag.name == tag.name.strip(),
        models.Tag.topic_id == tag.topic_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Tag '{tag.name}' already exists in this topic")
    db_tag = models.Tag(name=tag.name.strip(), topic_id=tag.topic_id)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.put("/tags/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, tag: TagUpdate, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag.name is not None:
        db_tag.name = tag.name.strip()
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, device: str = Depends(require_device), db: Session = Depends(get_db)):
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(db_tag)
    db.commit()
    return {"message": "Deleted successfully"}
