from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional
import models
from database import get_db
import razorpay
import hmac
import hashlib
from security import check_public_rate_limit, get_client_ip

router = APIRouter(
    prefix="/api/invoice",
    tags=["invoice"]
)


def _get_razorpay_client(db: Session):
    """Get Razorpay client using keys stored in PaymentSettings."""
    settings = db.query(models.PaymentSettings).first()
    if not settings or not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Please add your API keys in Admin Settings."
        )
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


class CreateOrderRequest(BaseModel):
    invoice_uuid: str
    amount: float  # amount in INR (e.g. 1500.00)
    notes: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    invoice_uuid: str
    amount_paid: float
    notes: Optional[str] = None


@router.get("/public/{invoice_uuid}")
def get_public_invoice(invoice_uuid: str, db: Session = Depends(get_db)):
    purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.invoice_uuid == invoice_uuid
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")

    student = db.query(models.Student).filter(models.Student.id == purchase.student_id).first()
    course = db.query(models.Course).filter(models.Course.id == purchase.course_id).first()

    # Determine what's currently due
    current_due_amount = purchase.due_amount
    due_date = None
    item_title = course.title
    installment_no = None
    total_installments = None
    already_paid = purchase.paid_amount  # total paid so far

    if purchase.is_installment:
        # Use paid_amount < amount (not stored status) to reliably find next due installment
        next_inst = db.query(models.InstallmentSchedule).filter(
            models.InstallmentSchedule.purchase_id == purchase.id,
            models.InstallmentSchedule.paid_amount < models.InstallmentSchedule.amount
        ).order_by(models.InstallmentSchedule.installment_no).first()

        if next_inst:
            current_due_amount = round(next_inst.amount - next_inst.paid_amount, 2)
            due_date = next_inst.due_date
            installment_no = next_inst.installment_no
            total_installments = purchase.total_installments
            item_title = f"{course.title} — Installment #{next_inst.installment_no} of {purchase.total_installments}"
        else:
            # All installments paid
            current_due_amount = 0

    # Fetch razorpay key_id (public) to send to frontend
    pay_settings = db.query(models.PaymentSettings).first()
    razorpay_key_id = pay_settings.razorpay_key_id if pay_settings else None

    status = "paid"
    if current_due_amount > 0:
        if due_date and due_date < date.today():
            status = "overdue"
        else:
            status = "pending"

    return {
        "invoice_no": f"INV-{purchase.id:05d}",
        "date": purchase.created_at.date() if purchase.created_at else date.today(),
        "due_date": due_date,
        "status": status,
        "total_fee": purchase.net_fee,
        "total_due": purchase.due_amount,
        "already_paid": already_paid,
        "current_due": current_due_amount,
        "is_installment": purchase.is_installment,
        "installment_no": installment_no,
        "total_installments": total_installments,
        "razorpay_key_id": razorpay_key_id,
        "student": {
            "name": f"{student.first_name} {student.last_name or ''}".strip(),
            "email": student.email,
            "phone": student.phone,
        },
        "course": {
            "title": course.title,
            "net_fee": purchase.net_fee,
            "item_title": item_title,
        }
    }



@router.post("/create-order")
def create_razorpay_order(req: CreateOrderRequest, request: Request, db: Session = Depends(get_db)):
    """Create a Razorpay order for the given invoice."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)
    purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.invoice_uuid == req.invoice_uuid
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if req.amount > purchase.due_amount + 0.01:
        raise HTTPException(status_code=400, detail=f"Amount exceeds due amount ₹{purchase.due_amount:.2f}")

    client = _get_razorpay_client(db)

    amount_paise = int(round(req.amount * 100))  # Razorpay uses paise
    order_data = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"inv_{purchase.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "notes": {
            "invoice_uuid": req.invoice_uuid,
            "purchase_id": str(purchase.id),
            "student": f"{purchase.student.first_name} {purchase.student.last_name or ''}".strip(),
            "course": purchase.course.title,
        }
    }

    try:
        order = client.order.create(data=order_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay error: {str(e)}")

    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
    }


@router.post("/verify-payment")
def verify_razorpay_payment(req: VerifyPaymentRequest, request: Request, db: Session = Depends(get_db)):
    """Verify Razorpay signature and record payment."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)
    purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.invoice_uuid == req.invoice_uuid
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Fetch secret for signature verification
    pay_settings = db.query(models.PaymentSettings).first()
    if not pay_settings or not pay_settings.razorpay_key_secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    # Verify HMAC signature
    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected = hmac.new(
        pay_settings.razorpay_key_secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")

    # Record payment
    amount = req.amount_paid
    if purchase.is_installment:
        # Find next pending installment
        next_inst = db.query(models.InstallmentSchedule).filter(
            models.InstallmentSchedule.purchase_id == purchase.id,
            models.InstallmentSchedule.status.in_(["pending", "partial"])
        ).order_by(models.InstallmentSchedule.installment_no).first()

        if next_inst:
            next_inst.paid_amount = round(next_inst.paid_amount + amount, 2)
            next_inst.payment_method = "Razorpay"
            next_inst.reference_no = req.razorpay_payment_id
            next_inst.notes = req.notes
            if next_inst.paid_amount >= next_inst.amount:
                next_inst.status = "paid"
                next_inst.paid_at = datetime.utcnow()
            elif next_inst.paid_amount > 0:
                next_inst.status = "partial"
    
    purchase.paid_amount = round(purchase.paid_amount + amount, 2)
    purchase.due_amount = round(purchase.net_fee - purchase.paid_amount, 2)
    if purchase.due_amount <= 0:
        purchase.status = "completed"
    elif purchase.status != "active":
        purchase.status = "active"

    # Create transaction record
    txn = models.PaymentTransaction(
        purchase_id=purchase.id,
        amount=amount,
        payment_method="Razorpay",
        reference_no=req.razorpay_payment_id,
        notes=req.notes or f"Razorpay: {req.razorpay_payment_id}",
        status="approved"
    )
    db.add(txn)
    db.commit()

    return {
        "message": "Payment recorded successfully!",
        "purchase_status": purchase.status,
        "due_amount": purchase.due_amount,
    }
