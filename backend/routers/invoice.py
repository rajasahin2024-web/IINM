from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional
import models
from database import get_db
import razorpay
import hmac
import hashlib
import uuid
import os
from security import check_public_rate_limit, get_client_ip
from helpers import rewrite_url, validate_upload, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE_BYTES

router = APIRouter(
    prefix="/api/invoice",
    tags=["invoice"]
)


def _get_razorpay_client(db: Session):
    """Get Razorpay client using keys stored in PaymentSettings."""
    settings = db.query(models.PaymentSettings).first()
    if not settings:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Please add your API keys in Admin Settings."
        )
    if settings.is_test_mode:
        key_id = settings.razorpay_test_key_id or settings.razorpay_key_id
        key_secret = settings.razorpay_test_key_secret or settings.razorpay_key_secret
    else:
        key_id = settings.razorpay_live_key_id or settings.razorpay_key_id
        key_secret = settings.razorpay_live_key_secret or settings.razorpay_key_secret
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Please add your API keys in Admin Settings."
        )
    return razorpay.Client(auth=(key_id, key_secret))


class CreateOrderRequest(BaseModel):
    invoice_uuid: str
    amount: float  # amount in INR (e.g. 1500.00)
    notes: Optional[str] = None
    installment_id: Optional[int] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    invoice_uuid: str
    amount_paid: float
    notes: Optional[str] = None
    installment_id: Optional[int] = None


@router.get("/public/{invoice_uuid}")
def get_public_invoice(invoice_uuid: str, db: Session = Depends(get_db)):
    purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.invoice_uuid == invoice_uuid
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")

    student = db.query(models.Student).filter(models.Student.id == purchase.student_id).first()
    course = db.query(models.Course).filter(models.Course.id == purchase.course_id).first()

    # Site settings for receipt-style rendering
    site = db.query(models.SiteSettings).first()
    contact_settings = db.query(models.ContactSettings).first()

    # Payment settings (Razorpay key + UPI QR)
    pay_settings = db.query(models.PaymentSettings).first()
    razorpay_key_id = None
    if pay_settings:
        if pay_settings.is_test_mode:
            razorpay_key_id = pay_settings.razorpay_test_key_id or pay_settings.razorpay_key_id
        else:
            razorpay_key_id = pay_settings.razorpay_live_key_id or pay_settings.razorpay_key_id

    # Determine what's currently due
    current_due_amount = purchase.due_amount
    due_date = None
    item_title = course.title
    installment_no = None
    total_installments = None
    already_paid = purchase.paid_amount

    # Installment schedule
    installments = []
    if purchase.is_installment:
        inst_rows = db.query(models.InstallmentSchedule).filter(
            models.InstallmentSchedule.purchase_id == purchase.id
        ).order_by(models.InstallmentSchedule.installment_no).all()

        for inst in inst_rows:
            installments.append({
                "id": inst.id,
                "installment_no": inst.installment_no,
                "due_date": inst.due_date.isoformat() if inst.due_date else None,
                "amount": inst.amount,
                "paid_amount": inst.paid_amount,
                "status": inst.status,
                "name": inst.name,
                "payment_method": inst.payment_method,
                "reference_no": inst.reference_no,
                "paid_at": inst.paid_at.isoformat() if inst.paid_at else None,
            })

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
            current_due_amount = 0

    # Transaction history
    transactions = []
    txns = db.query(models.PaymentTransaction).filter(
        models.PaymentTransaction.purchase_id == purchase.id
    ).order_by(models.PaymentTransaction.created_at.desc()).all()

    for t in txns:
        transactions.append({
            "id": t.id,
            "amount": t.amount,
            "payment_method": t.payment_method,
            "reference_no": t.reference_no,
            "notes": t.notes,
            "status": t.status,
            "screenshot_url": rewrite_url(t.screenshot_url) if t.screenshot_url else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    status = "paid"
    if current_due_amount > 0:
        if due_date and due_date < date.today():
            status = "overdue"
        else:
            status = "pending"

    # Build site settings for receipt rendering
    site_data = None
    if site:
        site_data = {
            "name": site.site_name,
            "logo_url": rewrite_url(site.logo_url),
            "dark_logo_url": rewrite_url(site.dark_logo_url),
            "favicon_url": rewrite_url(site.favicon_url),
            "founder_name": site.founder_name,
            "founder_designation": site.founder_designation,
            "founder_signature_url": rewrite_url(site.founder_signature_url),
        }

    contact_data = None
    if contact_settings:
        contact_data = {
            "phone1": contact_settings.phone1,
            "phone2": contact_settings.phone2,
            "email1": contact_settings.email1,
            "email2": contact_settings.email2,
            "address_line1": contact_settings.address_line1,
            "address_line2": contact_settings.address_line2,
            "city": contact_settings.city,
            "state": contact_settings.state,
            "pin_code": contact_settings.pin_code,
        }

    # UPI QR settings
    upi_data = None
    if pay_settings and pay_settings.upi_enabled:
        upi_data = {
            "enabled": True,
            "qr_url": rewrite_url(pay_settings.upi_qr_url) if pay_settings.upi_qr_url else None,
            "upi_id": pay_settings.upi_id,
            "payee_name": pay_settings.upi_payee_name,
        }

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
            "city": student.city,
            "state": student.state,
        },
        "course": {
            "title": course.title,
            "net_fee": purchase.net_fee,
            "item_title": item_title,
        },
        "site": site_data,
        "contact": contact_data,
        "upi": upi_data,
        "installments": installments,
        "transactions": transactions,
        "invoice_uuid": purchase.invoice_uuid,
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

    # Validate installment_id if provided
    target_installment = None
    if req.installment_id is not None:
        target_installment = db.query(models.InstallmentSchedule).filter(
            models.InstallmentSchedule.id == req.installment_id,
            models.InstallmentSchedule.purchase_id == purchase.id,
        ).first()
        if not target_installment:
            raise HTTPException(status_code=404, detail="Installment not found for this invoice")
        remaining_inst = round(target_installment.amount - target_installment.paid_amount, 2)
        if remaining_inst <= 0:
            raise HTTPException(status_code=400, detail="This installment is already fully paid")
        if req.amount > remaining_inst + 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Amount exceeds installment remaining due ₹{remaining_inst:.2f}",
            )

    client = _get_razorpay_client(db)

    amount_paise = int(round(req.amount * 100))  # Razorpay uses paise
    notes = {
        "invoice_uuid": req.invoice_uuid,
        "purchase_id": str(purchase.id),
        "student": f"{purchase.student.first_name} {purchase.student.last_name or ''}".strip(),
        "course": purchase.course.title,
    }
    if target_installment is not None:
        notes["installment_id"] = str(target_installment.id)
        notes["installment_no"] = str(target_installment.installment_no)

    order_data = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"inv_{purchase.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "notes": notes,
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
    if not pay_settings:
        raise HTTPException(status_code=503, detail="Razorpay not configured")
    if pay_settings.is_test_mode:
        secret = pay_settings.razorpay_test_key_secret or pay_settings.razorpay_key_secret
    else:
        secret = pay_settings.razorpay_live_key_secret or pay_settings.razorpay_key_secret
    if not secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    # Verify HMAC signature
    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected = hmac.new(
        secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")

    # Record payment
    amount = req.amount_paid
    if purchase.is_installment:
        # If a specific installment_id was provided, pay that one.
        # Otherwise, fall back to the next pending installment.
        target_inst = None
        if req.installment_id is not None:
            target_inst = db.query(models.InstallmentSchedule).filter(
                models.InstallmentSchedule.id == req.installment_id,
                models.InstallmentSchedule.purchase_id == purchase.id,
            ).first()
            if target_inst and target_inst.paid_amount >= target_inst.amount:
                # Already fully paid — fall back to next pending
                target_inst = None

        if target_inst is None:
            target_inst = db.query(models.InstallmentSchedule).filter(
                models.InstallmentSchedule.purchase_id == purchase.id,
                models.InstallmentSchedule.status.in_(["pending", "partial"])
            ).order_by(models.InstallmentSchedule.installment_no).first()

        if target_inst:
            target_inst.paid_amount = round(target_inst.paid_amount + amount, 2)
            target_inst.payment_method = "Razorpay"
            target_inst.reference_no = req.razorpay_payment_id
            target_inst.notes = req.notes
            if target_inst.paid_amount >= target_inst.amount:
                target_inst.status = "paid"
                target_inst.paid_at = datetime.utcnow()
            elif target_inst.paid_amount > 0:
                target_inst.status = "partial"
    
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


class UPIScreenshotSubmit(BaseModel):
    invoice_uuid: str
    amount: float
    notes: Optional[str] = None


@router.post("/upload-upi-screenshot")
async def upload_upi_screenshot(
    invoice_uuid: str = Form(...),
    amount: float = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Student uploads UPI payment screenshot as proof. Creates a pending transaction for admin approval."""
    purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.invoice_uuid == invoice_uuid
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if amount > purchase.due_amount + 0.01:
        raise HTTPException(status_code=400, detail=f"Amount exceeds due amount ₹{purchase.due_amount:.2f}")

    # Validate and save screenshot
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS, max_size=MAX_IMAGE_SIZE_BYTES)
    content = await file.read()
    unique_name = f"images/upi-screenshot-{uuid.uuid4().hex}{ext}"

    # Try R2 upload
    r2 = db.query(models.R2Settings).first()
    screenshot_url = None
    if r2 and r2.secret_access_key:
        try:
            from helpers import upload_to_r2 as r2_upload
            r2_upload(r2, unique_name, content)
            pub = (r2.public_url or "").rstrip("/")
            if pub:
                screenshot_url = f"{pub}/{unique_name}"
        except Exception:
            pass

    if not screenshot_url:
        os.makedirs("uploads/images", exist_ok=True)
        filename = unique_name.split("/")[-1]
        filepath = os.path.join("uploads", "images", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        screenshot_url = f"/uploads/images/{filename}"

    # Create pending transaction (admin will approve/reject)
    txn = models.PaymentTransaction(
        purchase_id=purchase.id,
        amount=amount,
        payment_method="UPI QR",
        reference_no=f"UPI-PENDING-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        notes=notes or "UPI payment screenshot uploaded by student",
        status="pending",
        screenshot_url=screenshot_url,
    )
    db.add(txn)
    db.commit()

    return {
        "message": "Screenshot uploaded successfully. Payment is pending admin approval.",
        "transaction_id": txn.id,
        "status": "pending",
    }
