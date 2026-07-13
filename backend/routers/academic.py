from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel, Field
import math

from database import get_db
import models
from routers.auth import require_device

router = APIRouter(prefix="/api/academic", tags=["academic"])


# ─── HELPERS ──────────────────────────────────────────────────

def compute_installment_status(inst: models.InstallmentSchedule) -> str:
    """Compute live status for an installment (not stored, derived on fetch)."""
    if inst.paid_amount >= inst.amount:
        return "paid"
    if inst.paid_amount > 0:
        return "partial"
    due = inst.due_date if isinstance(inst.due_date, date) else date.fromisoformat(str(inst.due_date))
    if due < date.today():
        return "overdue"
    return "pending"


def build_schedule(net_fee: float, n: int, frequency: str, freq_days: Optional[int], first_date: date, paying_amount: float = 0.0, custom_dates: Optional[List[date]] = None) -> list:
    """Return list of (installment_no, due_date, amount) tuples."""
    remaining = max(net_fee - paying_amount, 0.0)
    future_n = n - 1
    
    rows = []
    # Row 1 is the initial down payment (dated today)
    rows.append((1, date.today(), paying_amount))
    
    if future_n > 0:
        per = math.floor(remaining / future_n * 100) / 100
        last = round(remaining - per * (future_n - 1), 2)
        
        current = first_date
        for i in range(1, future_n + 1):
            amt = last if i == future_n else per
            
            if custom_dates and len(custom_dates) >= i:
                due_dt = custom_dates[i-1]
            else:
                due_dt = current
                
            rows.append((i + 1, due_dt, amt))
            
            if not custom_dates:
                if frequency == "monthly":
                    current = current + relativedelta(months=1)
                elif frequency == "weekly":
                    current = current + timedelta(weeks=1)
                elif frequency == "fortnightly":
                    current = current + timedelta(weeks=2)
                else:  # custom
                    current = current + timedelta(days=freq_days or 30)
    return rows


def auto_deactivate_overdue_purchases(db: Session):
    """Automatically set is_active=False for purchases with overdue installments."""
    today = date.today()
    overdue_purchases = db.query(models.CoursePurchase).join(models.InstallmentSchedule).filter(
        models.CoursePurchase.is_active == True,
        models.CoursePurchase.status != "cancelled",
        models.InstallmentSchedule.due_date < today,
        models.InstallmentSchedule.paid_amount < models.InstallmentSchedule.amount
    ).all()
    if overdue_purchases:
        for p in overdue_purchases:
            p.is_active = False
        db.commit()


# ─── PYDANTIC SCHEMAS ──────────────────────────────────────────

class CouponValidate(BaseModel):
    course_id: int
    coupon_code: str

class PurchaseCreate(BaseModel):
    student_id: int
    course_id: int
    discount: Optional[float] = 0.0
    coupon_code: Optional[str] = None
    paying_amount: float
    payment_method: Optional[str] = "Cash"
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    record_payment: bool = True  # If False, the initial paying_amount is just marked as DUE, not PAID
    # installment fields
    is_installment: bool = False
    total_installments: Optional[int] = Field(default=None, ge=2, le=24)
    installment_frequency: Optional[str] = None   # monthly|weekly|fortnightly|custom
    frequency_days: Optional[int] = None
    first_payment_date: Optional[date] = None
    custom_installment_dates: Optional[List[date]] = None


class InstallmentPaymentCreate(BaseModel):
    installment_id: int
    amount: float
    payment_method: Optional[str] = "Cash"
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "approved"

class GeneralPaymentCreate(BaseModel):
    amount: float
    payment_method: Optional[str] = "Cash"
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "approved"

class CancelPurchaseCreate(BaseModel):
    refund_amount: float = 0.0
    notes: Optional[str] = None


class InstallmentOut(BaseModel):
    id: int
    installment_no: int
    due_date: date
    amount: float
    paid_amount: float
    status: str
    payment_method: Optional[str]
    reference_no: Optional[str]
    notes: Optional[str]
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: int
    amount: float
    payment_method: Optional[str]
    reference_no: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── ROUTES ──────────────────────────────────────────

@router.post("/coupons/validate")
def validate_coupon(
    data: CouponValidate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    coupon = db.query(models.Coupon).filter(
        func.lower(models.Coupon.code) == data.coupon_code.lower(),
        models.Coupon.is_active == True
    ).first()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or inactive promo code.")
    if coupon.valid_until and coupon.valid_until < date.today():
        raise HTTPException(status_code=400, detail="This promo code has expired.")
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Promo code usage limit reached.")
        
    course = db.query(models.Course).filter(models.Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
        
    fee = course.price or 0.0
    if coupon.discount_type == 'percentage':
        discount = round((coupon.discount_value / 100.0) * fee, 2)
    else:
        discount = coupon.discount_value
        
    discount = min(discount, fee) # cannot discount more than fee
    
    return {
        "is_valid": True,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "calculated_discount": discount,
        "net_fee": round(fee - discount, 2)
    }

@router.post("/purchase")
def create_purchase(
    data: PurchaseCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    # 1. Validate student
    student = db.query(models.Student).filter(models.Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Validate course
    course = db.query(models.Course).filter(models.Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 3. Check duplicate purchase
    existing = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.student_id == data.student_id,
        models.CoursePurchase.course_id == data.course_id,
        models.CoursePurchase.status != "cancelled",
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This student has already purchased this course.",
        )

    # 4. Calculate fees
    total_fee = course.price or 0.0
    discount = data.discount or 0.0
    coupon_id = None
    
    # Override with coupon logic if provided
    if data.coupon_code:
        coupon = db.query(models.Coupon).filter(
            func.lower(models.Coupon.code) == data.coupon_code.lower(),
            models.Coupon.is_active == True
        ).first()
        if coupon and (not coupon.valid_until or coupon.valid_until >= date.today()):
            if not coupon.usage_limit or coupon.used_count < coupon.usage_limit:
                coupon_id = coupon.id
                if coupon.discount_type == 'percentage':
                    discount = round((coupon.discount_value / 100.0) * total_fee, 2)
                else:
                    discount = coupon.discount_value
                # increment usage count
                coupon.used_count += 1

    net_fee = max(total_fee - discount, 0.0)

    # 5. Validate minimum payment (only if recording payment, or just generally?)
    # actually, if we are NOT recording payment, we are generating an invoice for them to pay.
    # We still want the "Initial Due" to meet the minimum payment requirement!
    if course.min_payment_type and course.min_payment_value:
        if course.min_payment_type == "percentage":
            min_required = round((course.min_payment_value / 100) * net_fee, 2)
        else:
            min_required = course.min_payment_value
        if data.paying_amount < min_required:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum initial amount required is ₹{min_required:.2f}.",
            )

    # 6. Installment validation
    if data.is_installment:
        if not data.total_installments or data.total_installments < 2:
            raise HTTPException(status_code=400, detail="Installment count must be at least 2.")
        if data.total_installments > 24:
            raise HTTPException(status_code=400, detail="Installment count cannot exceed 24.")
        if data.custom_installment_dates:
            if len(data.custom_installment_dates) != data.total_installments - 1:
                raise HTTPException(status_code=400, detail="Number of custom dates must match the number of future installments.")
        else:
            if not data.installment_frequency:
                raise HTTPException(status_code=400, detail="Installment frequency or custom dates are required.")
            if data.installment_frequency == "custom" and not data.frequency_days:
                raise HTTPException(status_code=400, detail="Custom frequency requires frequency_days.")

    # 7. paying amount cannot exceed net_fee
    if data.paying_amount > net_fee:
        raise HTTPException(
            status_code=400,
            detail=f"Paying amount (₹{data.paying_amount}) cannot exceed net fee (₹{net_fee}).",
        )

    # 8. Create purchase record
    first_date = data.first_payment_date or date.today()
    import uuid
    inv_uuid = str(uuid.uuid4())
    # Determine initial paid amount
    initial_paid = data.paying_amount if data.record_payment else 0.0

    purchase = models.CoursePurchase(
        student_id=data.student_id,
        course_id=data.course_id,
        total_fee=total_fee,
        discount=discount,
        net_fee=net_fee,
        paid_amount=initial_paid,
        due_amount=round(net_fee - initial_paid, 2),
        status="completed" if initial_paid >= net_fee else "active",
        notes=data.notes,
        coupon_id=coupon_id,
        invoice_uuid=inv_uuid,
        is_installment=data.is_installment,
        total_installments=data.total_installments if data.is_installment else None,
        installment_frequency=data.installment_frequency if data.is_installment else None,
        frequency_days=data.frequency_days if data.is_installment else None,
        first_payment_date=first_date if data.is_installment else None,
    )
    db.add(purchase)
    db.flush()  # get purchase.id

    # 9. First payment transaction
    if data.paying_amount > 0 and data.record_payment:
        txn = models.PaymentTransaction(
            purchase_id=purchase.id,
            amount=data.paying_amount,
            payment_method=data.payment_method,
            reference_no=data.reference_no,
            notes=data.notes,
            status="approved" # initial payment is auto-approved here
        )
        db.add(txn)
        db.flush()
        if not txn.reference_no:
            txn.reference_no = f"IINM-TXN-{datetime.now().strftime('%Y%m')}-{txn.id:04d}"

    # 10. Create installment schedule rows
    if data.is_installment:
        schedule = build_schedule(
            net_fee=net_fee,
            n=data.total_installments,
            frequency=data.installment_frequency,
            freq_days=data.frequency_days,
            first_date=first_date,
            paying_amount=data.paying_amount,
            custom_dates=data.custom_installment_dates,
        )
        for (inst_no, due_dt, amt) in schedule:
            if inst_no == 1:
                paid = data.paying_amount if data.record_payment else 0.0
            else:
                paid = 0.0
            st = "paid" if paid >= amt else ("partial" if paid > 0 else "pending")
            inst = models.InstallmentSchedule(
                purchase_id=purchase.id,
                installment_no=inst_no,
                due_date=due_dt,
                amount=amt,
                paid_amount=paid,
                status=st,
                paid_at=datetime.utcnow() if st == "paid" else None,
            )
            db.add(inst)

    db.commit()
    db.refresh(purchase)

    return {
        "message": "Course purchased successfully!",
        "purchase_id": purchase.id,
        "due_amount": purchase.due_amount,
        "status": purchase.status,
        "is_installment": purchase.is_installment,
        "total_installments": purchase.total_installments,
        "invoice_uuid": purchase.invoice_uuid,
    }


@router.get("/purchases")
def list_purchases(
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """List all purchases, optionally filtered by student or course."""
    auto_deactivate_overdue_purchases(db)
    query = db.query(models.CoursePurchase)
    if student_id:
        query = query.filter(models.CoursePurchase.student_id == student_id)
    if course_id:
        query = query.filter(models.CoursePurchase.course_id == course_id)
    purchases = query.order_by(models.CoursePurchase.id.desc()).all()

    result = []
    for p in purchases:
        # Installment summary
        inst_paid = 0
        inst_total = p.total_installments or 0
        if p.is_installment and p.installments:
            inst_paid = sum(1 for i in p.installments if compute_installment_status(i) == "paid")

        result.append({
            "id": p.id,
            "student_id": p.student_id,
            "student_name": f"{p.student.first_name} {p.student.last_name or ''}".strip(),
            "student_email": p.student.email,
            "course_id": p.course_id,
            "course_title": p.course.title,
            "total_fee": p.total_fee,
            "discount": p.discount,
            "net_fee": p.net_fee,
            "paid_amount": p.paid_amount,
            "due_amount": p.due_amount,
            "refunded_amount": p.refunded_amount,
            "status": p.status,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "is_installment": p.is_installment,
            "total_installments": inst_total,
            "installments_paid": inst_paid,
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "payment_method": t.payment_method,
                    "reference_no": t.reference_no,
                    "status": t.status,
                    "created_at": t.created_at,
                }
                for t in p.transactions
            ],
        })
    return result

@router.get("/purchases/overdue")
def list_overdue_purchases(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Return a list of purchases with currently overdue installments."""
    today = date.today()
    overdue_insts = db.query(models.InstallmentSchedule).filter(
        models.InstallmentSchedule.due_date < today,
        models.InstallmentSchedule.paid_amount < models.InstallmentSchedule.amount
    ).all()
    
    result = []
    seen = set()
    for inst in overdue_insts:
        p = inst.purchase
        if p.status == 'cancelled' or p.id in seen:
            continue
        seen.add(p.id)
        result.append({
            "purchase_id": p.id,
            "student_id": p.student_id,
            "student_name": f"{p.student.first_name} {p.student.last_name or ''}".strip(),
            "student_email": p.student.email,
            "student_phone": p.student.phone,
            "course_title": p.course.title,
            "net_fee": p.net_fee,
            "paid_amount": p.paid_amount,
            "due_amount": p.due_amount,
            "installment_no": inst.installment_no,
            "overdue_installment_amount": round(inst.amount - inst.paid_amount, 2),
            "due_date": inst.due_date,
        })
    return result

@router.get("/purchases/overdue/count")
def count_unseen_overdue_purchases(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Return the number of unseen overdue installments."""
    today = date.today()
    count = db.query(models.InstallmentSchedule).join(models.CoursePurchase).filter(
        models.CoursePurchase.status != 'cancelled',
        models.InstallmentSchedule.due_date < today,
        models.InstallmentSchedule.paid_amount < models.InstallmentSchedule.amount,
        models.InstallmentSchedule.admin_seen_overdue == False
    ).count()
    return {"count": count}

@router.post("/purchases/overdue/mark-seen")
def mark_overdue_purchases_seen(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Mark all currently overdue installments as seen by the admin."""
    today = date.today()
    unseen_insts = db.query(models.InstallmentSchedule).join(models.CoursePurchase).filter(
        models.CoursePurchase.status != 'cancelled',
        models.InstallmentSchedule.due_date < today,
        models.InstallmentSchedule.paid_amount < models.InstallmentSchedule.amount,
        models.InstallmentSchedule.admin_seen_overdue == False
    ).all()
    
    for inst in unseen_insts:
        inst.admin_seen_overdue = True
        
    if unseen_insts:
        db.commit()
        
    return {"message": "Marked all as seen", "updated_count": len(unseen_insts)}

@router.get("/purchases/{purchase_id}/installments")
def get_installments(
    purchase_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Return the full installment schedule for a purchase."""
    purchase = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if not purchase.is_installment:
        raise HTTPException(status_code=400, detail="This is not an installment purchase")

    rows = []
    for inst in purchase.installments:
        rows.append({
            "id": inst.id,
            "installment_no": inst.installment_no,
            "due_date": inst.due_date,
            "amount": inst.amount,
            "paid_amount": inst.paid_amount,
            "status": compute_installment_status(inst),
            "payment_method": inst.payment_method,
            "reference_no": inst.reference_no,
            "notes": inst.notes,
            "paid_at": inst.paid_at,
        })
    return {
        "purchase_id": purchase.id,
        "student_name": f"{purchase.student.first_name} {purchase.student.last_name or ''}".strip(),
        "course_title": purchase.course.title,
        "net_fee": purchase.net_fee,
        "paid_amount": purchase.paid_amount,
        "due_amount": purchase.due_amount,
        "refunded_amount": purchase.refunded_amount,
        "status": purchase.status,
        "total_installments": purchase.total_installments,
        "installment_frequency": purchase.installment_frequency,
        "frequency_days": purchase.frequency_days,
        "invoice_uuid": purchase.invoice_uuid,
        "installments": rows,
    }


@router.post("/purchases/{purchase_id}/pay-installment")
def pay_installment(
    purchase_id: int,
    data: InstallmentPaymentCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Record a payment against a specific installment."""
    purchase = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    inst = db.query(models.InstallmentSchedule).filter(
        models.InstallmentSchedule.id == data.installment_id,
        models.InstallmentSchedule.purchase_id == purchase_id,
    ).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installment not found")

    current_status = compute_installment_status(inst)
    if current_status == "paid":
        raise HTTPException(status_code=400, detail="This installment is already fully paid.")

    remaining = round(inst.amount - inst.paid_amount, 2)
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive.")
    if data.amount > remaining:
        raise HTTPException(status_code=400, detail=f"Amount exceeds remaining due (₹{remaining:.2f}).")

    # Update installment
    inst.paid_amount = round(inst.paid_amount + data.amount, 2)
    inst.payment_method = data.payment_method
    inst.reference_no = data.reference_no
    inst.notes = data.notes
    new_status = compute_installment_status(inst)
    inst.status = new_status
    if new_status == "paid":
        inst.paid_at = datetime.utcnow()

    # Update purchase totals
    purchase.paid_amount = round(purchase.paid_amount + data.amount, 2)
    purchase.due_amount = round(purchase.net_fee - purchase.paid_amount, 2)
    if purchase.due_amount <= 0:
        purchase.status = "completed"
    
    # Auto-reactivate on payment
    if not purchase.is_active:
        purchase.is_active = True

    # Create transaction record
    txn = models.PaymentTransaction(
        purchase_id=purchase.id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_no=data.reference_no,
        notes=data.notes,
        status=data.status
    )
    db.add(txn)
    db.commit()
    db.refresh(inst)

    return {
        "message": "Payment recorded successfully!",
        "installment_no": inst.installment_no,
        "installment_status": compute_installment_status(inst),
        "purchase_status": purchase.status,
        "purchase_due": purchase.due_amount,
        "is_active": purchase.is_active,
    }

@router.get("/purchases/{purchase_id}")
def get_purchase_details(
    purchase_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Get full details of a regular purchase."""
    auto_deactivate_overdue_purchases(db)
    p = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    return {
        "id": p.id,
        "student_name": f"{p.student.first_name} {p.student.last_name or ''}".strip(),
        "course_title": p.course.title,
        "net_fee": p.net_fee,
        "paid_amount": p.paid_amount,
        "due_amount": p.due_amount,
        "refunded_amount": p.refunded_amount,
        "status": p.status,
        "is_active": p.is_active,
        "invoice_uuid": p.invoice_uuid,
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "payment_method": t.payment_method,
                "reference_no": t.reference_no,
                "status": t.status,
                "created_at": t.created_at,
            }
            for t in p.transactions
        ]
    }

@router.post("/purchases/{purchase_id}/pay")
def pay_general_purchase(
    purchase_id: int,
    data: GeneralPaymentCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Record a payment for a non-installment purchase."""
    purchase = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase.is_installment:
        raise HTTPException(status_code=400, detail="Use installment payment endpoint for this purchase.")
    
    if purchase.status == "completed" or purchase.due_amount <= 0:
        raise HTTPException(status_code=400, detail="Purchase is already fully paid.")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive.")
    if data.amount > purchase.due_amount:
        raise HTTPException(status_code=400, detail=f"Amount exceeds due amount (₹{purchase.due_amount:.2f}).")

    purchase.paid_amount = round(purchase.paid_amount + data.amount, 2)
    purchase.due_amount = round(purchase.net_fee - purchase.paid_amount, 2)
    if purchase.due_amount <= 0:
        purchase.status = "completed"
        
    if not purchase.is_active:
        purchase.is_active = True

    txn = models.PaymentTransaction(
        purchase_id=purchase.id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_no=data.reference_no,
        notes=data.notes,
        status=data.status
    )
    db.add(txn)
    db.commit()

    return {
        "message": "Payment recorded successfully!",
        "purchase_status": purchase.status,
        "purchase_due": purchase.due_amount,
        "is_active": purchase.is_active,
    }

@router.post("/purchases/{purchase_id}/toggle-active")
def toggle_purchase_active(
    purchase_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Manually toggle a purchase active/inactive state."""
    p = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    p.is_active = not p.is_active
    db.commit()
    return {
        "message": "Purchase status updated successfully.",
        "is_active": p.is_active
    }

@router.post("/purchases/{purchase_id}/cancel")
def cancel_purchase(
    purchase_id: int,
    data: CancelPurchaseCreate,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Cancel a purchase and optionally record a refund."""
    p = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    if p.status == "cancelled":
        raise HTTPException(status_code=400, detail="Purchase is already cancelled.")

    p.status = "cancelled"
    
    if data.refund_amount > 0:
        if data.refund_amount > p.paid_amount:
            raise HTTPException(status_code=400, detail="Cannot refund more than what was paid.")
        
        p.refunded_amount = round(p.refunded_amount + data.refund_amount, 2)
        p.paid_amount = round(p.paid_amount - data.refund_amount, 2)
        p.due_amount = 0.0 # cancelled, nothing due anymore
        
        # Create a negative transaction for refund
        txn = models.PaymentTransaction(
            purchase_id=p.id,
            amount=-data.refund_amount,
            payment_method="Refund",
            notes=data.notes or "Refunded during cancellation",
            status="approved"
        )
        db.add(txn)
    else:
        p.due_amount = 0.0
        if data.notes:
            p.notes = (p.notes + "\n" + data.notes) if p.notes else data.notes

    # Optional: also cancel all pending installments
    if p.is_installment:
        for inst in p.installments:
            if inst.paid_amount < inst.amount:
                # keep paid amount, but mark it handled so it's not overdue
                inst.amount = inst.paid_amount 
                inst.status = "paid" if inst.paid_amount > 0 else "cancelled"
                
    db.commit()
    return {"message": "Purchase cancelled successfully."}

@router.post("/transactions/{txn_id}/approve")
def approve_transaction(
    txn_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Approve a pending payment transaction."""
    txn = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.status == "approved":
        raise HTTPException(status_code=400, detail="Transaction is already approved.")
        
    txn.status = "approved"
    db.commit()
    return {"message": "Transaction approved."}

@router.delete("/purchases/{purchase_id}")
def delete_purchase(
    purchase_id: int,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Delete a purchase and its related transactions and installments."""
    p = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    db.delete(p)
    db.commit()
    return {"message": "Purchase deleted successfully."}

@router.get("/collections/overview")
def get_collections_overview(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Return course-wise and batch-wise revenue breakdown."""
    purchases = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.status != "cancelled"
    ).all()
    
    enrollments = db.query(models.BatchEnrollment).filter(
        models.BatchEnrollment.status != "cancelled"
    ).all()
    
    student_course_batch = {}
    for e in enrollments:
        if e.student_id not in student_course_batch:
            student_course_batch[e.student_id] = {}
        if getattr(e.batch, 'course_id', None):
            student_course_batch[e.student_id][e.batch.course_id] = e.batch
            
    total_revenue = 0.0
    total_collected = 0.0
    total_outstanding = 0.0
    courses_map = {}
    
    for p in purchases:
        c_id = p.course_id
        if c_id not in courses_map:
            courses_map[c_id] = {
                "course_id": c_id,
                "course_title": p.course.title if p.course else f"Course {c_id}",
                "total_revenue": 0.0,
                "collected": 0.0,
                "outstanding": 0.0,
                "students_count": 0,
                "batches": {},
                "unassigned": {
                    "batch_id": "unassigned",
                    "batch_name": "Unassigned / Direct Purchase",
                    "total_revenue": 0.0,
                    "collected": 0.0,
                    "outstanding": 0.0,
                    "students_count": 0
                }
            }
        
        batch_obj = student_course_batch.get(p.student_id, {}).get(c_id)
        if batch_obj:
            b_id = batch_obj.id
            if b_id not in courses_map[c_id]["batches"]:
                courses_map[c_id]["batches"][b_id] = {
                    "batch_id": b_id,
                    "batch_name": batch_obj.name,
                    "total_revenue": 0.0,
                    "collected": 0.0,
                    "outstanding": 0.0,
                    "students_count": 0
                }
            target = courses_map[c_id]["batches"][b_id]
        else:
            target = courses_map[c_id]["unassigned"]
            
        revenue = p.net_fee or 0.0
        collected = p.paid_amount or 0.0
        outstanding = p.due_amount or 0.0
        
        target["total_revenue"] += revenue
        target["collected"] += collected
        target["outstanding"] += outstanding
        target["students_count"] += 1
        
        courses_map[c_id]["total_revenue"] += revenue
        courses_map[c_id]["collected"] += collected
        courses_map[c_id]["outstanding"] += outstanding
        courses_map[c_id]["students_count"] += 1
        
        total_revenue += revenue
        total_collected += collected
        total_outstanding += outstanding
        
    collections_by_course = []
    for c_id, c_data in courses_map.items():
        batches_list = list(c_data["batches"].values())
        batches_list.sort(key=lambda x: x["batch_name"])
        c_data["batches"] = batches_list
        collections_by_course.append(c_data)
        
    collections_by_course.sort(key=lambda x: x["total_revenue"], reverse=True)

    return {
        "global_metrics": {
            "total_revenue": total_revenue,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "total_courses": len(collections_by_course)
        },
        "collections_by_course": collections_by_course
    }

@router.get("/collections/outstanding-details")
def get_outstanding_details(device: str = Depends(require_device), db: Session = Depends(get_db)):
    """Return student-level details for all outstanding payments."""
    purchases = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.status != "cancelled",
        models.CoursePurchase.due_amount > 0
    ).all()
    
    enrollments = db.query(models.BatchEnrollment).filter(
        models.BatchEnrollment.status != "cancelled"
    ).all()
    
    student_course_batch = {}
    for e in enrollments:
        if e.student_id not in student_course_batch:
            student_course_batch[e.student_id] = {}
        if getattr(e.batch, 'course_id', None):
            student_course_batch[e.student_id][e.batch.course_id] = e.batch

    result = []
    for p in purchases:
        batch_name = "Unassigned"
        batch_obj = student_course_batch.get(p.student_id, {}).get(p.course_id)
        if batch_obj:
            batch_name = batch_obj.name
            
        next_due_date = None
        if p.is_installment and p.installments:
            pending_insts = [i for i in p.installments if compute_installment_status(i) in ("pending", "partial", "overdue")]
            pending_insts.sort(key=lambda x: x.due_date)
            if pending_insts:
                next_due_date = pending_insts[0].due_date
                
        result.append({
            "purchase_id": p.id,
            "student_name": f"{p.student.first_name} {p.student.last_name or ''}".strip(),
            "student_email": p.student.email,
            "student_phone": p.student.phone,
            "course_title": p.course.title if p.course else f"Course {p.course_id}",
            "batch_name": batch_name,
            "due_amount": p.due_amount,
            "is_installment": p.is_installment,
            "next_due_date": next_due_date
        })
        
    result.sort(key=lambda x: x["due_amount"], reverse=True)
    return result

# ==========================================
# PAYMENTS MANAGEMENT
# ==========================================

class PaymentRecordRequest(BaseModel):
    purchase_id: int
    amount: float
    payment_method: str
    reference_no: Optional[str] = None
    notes: Optional[str] = None

@router.get("/payments")
def list_payments(
    skip: int = 0,
    limit: int = 100,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Fetch all payment transactions for the ledger."""
    txns = db.query(models.PaymentTransaction).order_by(models.PaymentTransaction.id.desc()).offset(skip).limit(limit).all()
    
    result = []
    for t in txns:
        p = t.purchase
        student = p.student if p else None
        course = p.course if p else None
        
        result.append({
            "id": t.id,
            "purchase_id": t.purchase_id,
            "amount": t.amount,
            "payment_method": t.payment_method,
            "reference_no": t.reference_no,
            "notes": t.notes,
            "status": t.status,
            "created_at": t.created_at,
            "student_name": f"{student.first_name} {student.last_name or ''}".strip() if student else "Unknown",
            "student_contact": student.phone or student.email if student else "",
            "course_title": course.title if course else "Unknown",
        })
    return result

@router.post("/payments/record")
def record_payment(
    data: PaymentRecordRequest,
    device: str = Depends(require_device),
    db: Session = Depends(get_db)
):
    """Record a new manual payment and apply waterfall allocation."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    purchase = db.query(models.CoursePurchase).filter(models.CoursePurchase.id == data.purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase record not found.")

    if purchase.due_amount <= 0:
        raise HTTPException(status_code=400, detail="This purchase has no outstanding dues.")

    if data.amount > purchase.due_amount:
        raise HTTPException(status_code=400, detail=f"Amount exceeds outstanding dues (₹{purchase.due_amount:.2f}).")

    # 1. Create Transaction
    txn = models.PaymentTransaction(
        purchase_id=purchase.id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_no=data.reference_no,
        notes=data.notes,
        status="approved"
    )
    db.add(txn)
    db.flush()
    if not txn.reference_no:
        txn.reference_no = f"IINM-TXN-{datetime.now().strftime('%Y%m')}-{txn.id:04d}"

    # 2. Update Purchase
    purchase.paid_amount += data.amount
    purchase.due_amount -= data.amount
    
    if purchase.due_amount <= 0.01: # float tolerance
        purchase.status = "completed"

    # 3. Waterfall Allocation for Installments
    if purchase.is_installment:
        unpaid_insts = db.query(models.InstallmentSchedule).filter(
            models.InstallmentSchedule.purchase_id == purchase.id,
            models.InstallmentSchedule.status.in_(["pending", "partial", "overdue"])
        ).order_by(models.InstallmentSchedule.installment_no).all()

        remaining_to_allocate = data.amount
        for inst in unpaid_insts:
            if remaining_to_allocate <= 0:
                break
            
            needed = inst.amount - inst.paid_amount
            if remaining_to_allocate >= needed:
                inst.paid_amount += needed
                inst.status = "paid"
                inst.paid_at = datetime.utcnow()
                remaining_to_allocate -= needed
            else:
                inst.paid_amount += remaining_to_allocate
                inst.status = "partial"
                remaining_to_allocate = 0

    db.commit()
    return {"message": "Payment recorded successfully", "transaction_id": txn.id, "new_due_amount": purchase.due_amount}
