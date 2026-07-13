from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import FAQ
from .auth import require_device
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/faqs", tags=["FAQs"])

class FAQCreate(BaseModel):
    question: str
    answer: str
    is_active: bool = True

class FAQUpdate(BaseModel):
    question: str = None
    answer: str = None
    is_active: bool = None

class FAQReorder(BaseModel):
    id: int
    order_index: int

@router.get("")
def get_faqs(public: bool = False, db: Session = Depends(get_db)):
    query = db.query(FAQ)
    if public:
        query = query.filter(FAQ.is_active == True)
    return query.order_by(FAQ.order_index.asc(), FAQ.id.desc()).all()

@router.post("")
def create_faq(payload: FAQCreate, db: Session = Depends(get_db), device: dict = Depends(require_device)):
    max_order = db.query(FAQ).count()
    new_faq = FAQ(
        question=payload.question,
        answer=payload.answer,
        is_active=payload.is_active,
        order_index=max_order
    )
    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)
    return new_faq

@router.put("/{faq_id}")
def update_faq(faq_id: int, payload: FAQUpdate, db: Session = Depends(get_db), device: dict = Depends(require_device)):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    if payload.question is not None:
        faq.question = payload.question
    if payload.answer is not None:
        faq.answer = payload.answer
    if payload.is_active is not None:
        faq.is_active = payload.is_active
        
    db.commit()
    return {"status": "success"}

@router.delete("/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db), device: dict = Depends(require_device)):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()
    return {"status": "success"}

@router.post("/reorder")
def reorder_faqs(payload: List[FAQReorder], db: Session = Depends(get_db), device: dict = Depends(require_device)):
    for item in payload:
        faq = db.query(FAQ).filter(FAQ.id == item.id).first()
        if faq:
            faq.order_index = item.order_index
    db.commit()
    return {"status": "success"}
