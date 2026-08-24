"""
Public Slot Booking Router — handles the "Book Your Slot" flow from the
public course detail page. All endpoints are PUBLIC (no device auth) and
protected by IP-based rate limiting.

Flow:
  1. GET  /config                         — razorpay key, google map key, site info
  2. GET  /courses                        — published courses for dropdown
  3. GET  /courses/{course_id}/batches    — upcoming/ongoing batches with seat counts
  4. POST /upload-photo                   — profile photo upload to R2
  5. POST /create-order                   — Razorpay order for booking amount
  6. POST /verify-and-register            — verify payment + create Student/Purchase/Enrollment/Txn + email + push
  7. GET  /receipt/{invoice_uuid}         — receipt data for PDF generation
"""
import os
import uuid
import hmac
import hashlib
import logging
from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel, EmailStr

from database import get_db
import models
from helpers import rewrite_url
from security import (
    check_public_rate_limit,
    get_client_ip,
    validate_upload,
    ALLOWED_IMAGE_EXTENSIONS,
    MAX_IMAGE_SIZE_BYTES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public/slot-booking", tags=["slot-booking"])

# Razorpay is optional at import time — only needed for order creation
try:
    import razorpay
    _HAS_RAZORPAY = True
except ImportError:
    _HAS_RAZORPAY = False

# Pusher is optional — only needed for push notifications
try:
    from pusher import Pusher
    _HAS_PUSHER = True
except ImportError:
    _HAS_PUSHER = False

# boto3 is needed for R2 uploads
try:
    import boto3
    _HAS_BOTO3 = True
except ImportError:
    _HAS_BOTO3 = False


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_razorpay_client(db: Session):
    """Get Razorpay client using keys stored in PaymentSettings.
    Uses test keys if is_test_mode is True, live keys otherwise.
    Falls back to legacy razorpay_key_id/secret if test/live keys are not set.
    """
    if not _HAS_RAZORPAY:
        raise HTTPException(status_code=503, detail="Razorpay SDK is not installed on the server.")
    settings = db.query(models.PaymentSettings).first()
    if not settings:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Please contact support."
        )
    # Select keys based on test mode
    if settings.is_test_mode:
        key_id = settings.razorpay_test_key_id or settings.razorpay_key_id
        key_secret = settings.razorpay_test_key_secret or settings.razorpay_key_secret
    else:
        key_id = settings.razorpay_live_key_id or settings.razorpay_key_id
        key_secret = settings.razorpay_live_key_secret or settings.razorpay_key_secret
    if not key_id or not key_secret:
        mode = "test" if settings.is_test_mode else "live"
        raise HTTPException(
            status_code=503,
            detail=f"Razorpay {mode} keys are not configured. Please contact support."
        )
    return razorpay.Client(auth=(key_id, key_secret))


def _build_s3_client(settings: models.R2Settings):
    """Build a boto3 S3 client for Cloudflare R2."""
    account_val = (settings.account_id or "").strip()
    if "r2.cloudflarestorage.com" in account_val:
        endpoint_url = account_val if account_val.startswith("http") else f"https://{account_val}"
    else:
        endpoint_url = f"https://{account_val}.r2.cloudflarestorage.com"
    return boto3.client(
        service_name="s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.access_key_id,
        aws_secret_access_key=settings.secret_access_key,
        region_name="auto",
    )


def _compute_booking_amount(course: models.Course) -> float:
    """Compute the slot booking amount from course min_payment settings."""
    if course.is_free:
        return 0.0
    if course.min_payment_type and course.min_payment_value:
        if course.min_payment_type == "percentage":
            base = course.discount_price if course.discount_price else (course.price or 0.0)
            return round((course.min_payment_value / 100.0) * base, 2)
        else:
            return float(course.min_payment_value)
    # Default: full course price
    return float(course.discount_price if course.discount_price else (course.price or 0.0))


def _compute_full_payment_discounted(course: models.Course) -> float:
    """Compute the discounted full payment price if the discount is still valid."""
    if not course.full_payment_discount_type or not course.full_payment_discount_value:
        return 0.0
    if not course.full_payment_discount_valid_till:
        return 0.0
    # Check if the offer is still valid
    if course.full_payment_discount_valid_till < datetime.now(course.full_payment_discount_valid_till.tzinfo):
        return 0.0
    base = float(course.discount_price if course.discount_price else (course.price or 0.0))
    val = course.full_payment_discount_value
    if course.full_payment_discount_type == "percentage":
        return max(0.0, round(base - (base * min(val, 100) / 100.0), 2))
    if course.full_payment_discount_type == "amount":
        return max(0.0, round(base - min(val, base), 2))
    return 0.0


def _send_booking_email(db: Session, student: models.Student, course: models.Course,
                        batch: Optional[models.Batch], booking_amount: float,
                        invoice_uuid: str, class_start_date: Optional[date]):
    """Send a booking confirmation email via SMTP. Fails silently if not configured."""
    try:
        import smtplib
        from email.message import EmailMessage
        settings = db.query(models.EmailSettings).first()
        if not settings or not settings.smtp_host or not settings.from_email:
            logger.warning("SMTP not configured — skipping booking email.")
            return
        msg = EmailMessage()
        site = db.query(models.SiteSettings).first()
        site_name = (site.site_name if site else "IINM") or "IINM"
        msg["Subject"] = f"Slot Booked — {course.title} | {site_name}"
        msg["From"] = f"{settings.from_name} <{settings.from_email}>" if settings.from_name else settings.from_email
        msg["To"] = student.email
        start_str = class_start_date.strftime("%d %B %Y") if class_start_date else "To be announced"
        batch_str = batch.name if batch else "To be assigned"
        body = (
            f"Hello {student.first_name},\n\n"
            f"Congratulations! Your slot has been successfully booked.\n\n"
            f"Course: {course.title}\n"
            f"Batch: {batch_str}\n"
            f"Class Start Date: {start_str}\n"
            f"Booking Amount Paid: Rs. {booking_amount:,.2f}\n"
            f"Receipt No: {invoice_uuid}\n\n"
            f"IMPORTANT: Admission fees must be paid before the class start date "
            f"to get confirmed admission and your platform login credentials.\n\n"
            f"Best Regards,\n{site_name} Team"
        )
        msg.set_content(body)
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587)
        if settings.use_tls:
            server.starttls()
        if settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        logger.warning(f"Booking email failed: {e}")


def _send_push_notification(db: Session, student_name: str, course_title: str, amount: float):
    """Send a push notification to admin via Pusher. Fails silently if not configured."""
    if not _HAS_PUSHER:
        return
    try:
        settings = db.query(models.PusherSettings).first()
        if not settings or not settings.is_active or not settings.app_id:
            return
        pusher_client = Pusher(
            app_id=settings.app_id,
            key=settings.key,
            secret=settings.secret,
            cluster=settings.cluster or "ap2",
            ssl=True,
        )
        pusher_client.trigger(
            "slot-bookings",
            "new-booking",
            {
                "student": student_name,
                "course": course_title,
                "amount": amount,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
    except Exception as e:
        logger.warning(f"Pusher notification failed: {e}")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class SlotBookingConfig(BaseModel):
    razorpay_key_id: Optional[str] = None
    currency: str = "INR"
    is_test_mode: bool = True
    google_map_api_key: Optional[str] = None
    enable_google_login: bool = False
    google_client_id: Optional[str] = None
    site_name: Optional[str] = None
    logo_url: Optional[str] = None
    founder_name: Optional[str] = None
    founder_designation: Optional[str] = None
    founder_signature_url: Optional[str] = None


class CourseListItem(BaseModel):
    id: int
    title: str
    slug: Optional[str] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    is_free: bool = False
    currency: Optional[str] = None
    min_payment_type: Optional[str] = None
    min_payment_value: Optional[float] = None
    full_payment_discount_type: Optional[str] = None
    full_payment_discount_value: Optional[float] = None
    full_payment_discount_valid_till: Optional[str] = None


class BatchListItem(BaseModel):
    id: int
    name: str
    mode: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_capacity: int = 50
    seats_available: int = 0
    enrolled_count: int = 0
    enable_waitlist: bool = False


class CreateOrderRequest(BaseModel):
    course_id: int
    student_name: str
    student_email: str
    phone: Optional[str] = None
    amount: float
    pay_mode: Optional[str] = "booking"  # "booking" | "full"


class VerifyAndRegisterRequest(BaseModel):
    # Razorpay response
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    amount_paid: float
    # Student details
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: str
    date_of_birth: Optional[date] = None
    profile_photo_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    address: Optional[str] = None
    highest_qualification: Optional[str] = None
    student_category: Optional[str] = None
    # Booking details
    course_id: int
    batch_id: Optional[int] = None
    allow_email_notifications: bool = True
    allow_push_notifications: bool = True
    agree_terms: bool = True


class CheckExistingResponse(BaseModel):
    already_booked: bool
    invoice_uuid: Optional[str] = None
    detail: Optional[str] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/config", response_model=SlotBookingConfig)
def get_slot_booking_config(db: Session = Depends(get_db)):
    """Public: return all config needed by the booking drawer frontend."""
    pay = db.query(models.PaymentSettings).first()
    google = db.query(models.GoogleApiSettings).first()
    site = db.query(models.SiteSettings).first()
    # Send the correct key (test or live) to the frontend based on is_test_mode
    if pay:
        if pay.is_test_mode:
            rzp_key = pay.razorpay_test_key_id or pay.razorpay_key_id
        else:
            rzp_key = pay.razorpay_live_key_id or pay.razorpay_key_id
    else:
        rzp_key = None
    return SlotBookingConfig(
        razorpay_key_id=rzp_key,
        currency=pay.currency if pay else "INR",
        is_test_mode=pay.is_test_mode if pay else True,
        google_map_api_key=google.google_map_api_key if google else None,
        enable_google_login=bool(google.enable_google_login) if google else False,
        google_client_id=google.google_client_id if google else None,
        site_name=site.site_name if site else None,
        logo_url=rewrite_url(site.logo_url) if site else None,
        founder_name=site.founder_name if site else None,
        founder_designation=site.founder_designation if site else None,
        founder_signature_url=rewrite_url(site.founder_signature_url) if site else None,
    )


@router.get("/courses", response_model=List[CourseListItem])
def list_public_courses_for_booking(db: Session = Depends(get_db)):
    """Public: list all PUBLISHED courses for the course dropdown."""
    courses = (
        db.query(models.Course)
        .filter(models.Course.status == "PUBLISHED")
        .order_by(models.Course.is_featured.desc(), models.Course.id.desc())
        .all()
    )
    return [
        CourseListItem(
            id=c.id,
            title=c.title,
            slug=c.slug,
            price=c.price,
            discount_price=c.discount_price,
            is_free=c.is_free,
            currency=c.currency,
            min_payment_type=c.min_payment_type,
            min_payment_value=c.min_payment_value,
            full_payment_discount_type=c.full_payment_discount_type,
            full_payment_discount_value=c.full_payment_discount_value,
            full_payment_discount_valid_till=c.full_payment_discount_valid_till.isoformat() if c.full_payment_discount_valid_till else None,
        )
        for c in courses
    ]


@router.get("/courses/{course_id}/batches", response_model=List[BatchListItem])
def list_public_batches(course_id: int, db: Session = Depends(get_db)):
    """Public: list all batches for a course with seat availability.

    Returns Upcoming/Ongoing batches first (selectable), then Completed batches
    (for reference, shown below in the UI). Actual enrollment counts are used.
    """
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Fetch Upcoming/Ongoing batches first, then Completed batches
    active_batches = (
        db.query(models.Batch)
        .filter(
            models.Batch.course_id == course_id,
            models.Batch.status.in_(["Upcoming", "Ongoing"]),
        )
        .order_by(models.Batch.start_date.asc().nullslast())
        .all()
    )
    completed_batches = (
        db.query(models.Batch)
        .filter(
            models.Batch.course_id == course_id,
            models.Batch.status == "Completed",
        )
        .order_by(models.Batch.start_date.desc().nullslast())
        .all()
    )

    result = []
    for b in active_batches + completed_batches:
        actual_enrolled = (
            db.query(func.count(models.BatchEnrollment.id))
            .filter(
                models.BatchEnrollment.batch_id == b.id,
                models.BatchEnrollment.status == "active",
            )
            .scalar() or 0
        )
        # Display count = starting_count (admin-set head-start) + actual enrollments.
        # starting_count decreases by 1 for each real enrollment (so it tapers off
        # as real students join). Formula: max(starting_count - actual_enrolled, 0) + actual_enrolled
        # This simplifies to: starting_count stays as a floor until real enrollments exceed it.
        starting = b.starting_count or 0
        if actual_enrolled >= starting:
            # Real enrollments have overtaken the fake head-start — show real count
            enrolled_count = actual_enrolled
        else:
            # Show starting_count as the base, real enrollments are "part of" it
            enrolled_count = starting
        seats_available = max(b.max_capacity - enrolled_count, 0)
        result.append(BatchListItem(
            id=b.id,
            name=b.name,
            mode=b.mode,
            status=b.status,
            start_date=b.start_date,
            end_date=b.end_date,
            max_capacity=b.max_capacity,
            seats_available=seats_available,
            enrolled_count=enrolled_count,
            enable_waitlist=b.enable_waitlist,
        ))
    return result


@router.get("/check-existing", response_model=CheckExistingResponse)
def check_existing_booking(
    course_id: int,
    email: str,
    request: Request,
    db: Session = Depends(get_db),
    phone: Optional[str] = None,
):
    """Public: check whether this email/phone already has an active purchase for the course."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=20, window=300)

    student = db.query(models.Student).filter(models.Student.email == email).first()
    if not student and phone:
        student = db.query(models.Student).filter(models.Student.phone == phone).first()
    if not student:
        return CheckExistingResponse(already_booked=False)

    existing = (
        db.query(models.CoursePurchase)
        .filter(
            models.CoursePurchase.student_id == student.id,
            models.CoursePurchase.course_id == course_id,
            models.CoursePurchase.status != "cancelled",
        )
        .first()
    )
    if existing:
        return CheckExistingResponse(
            already_booked=True,
            invoice_uuid=existing.invoice_uuid,
            detail="You have already booked a slot for this course. Check your email for the receipt.",
        )
    return CheckExistingResponse(already_booked=False)


@router.post("/upload-photo")
async def upload_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Public: upload a profile photo to R2 bucket. Validates image type & size."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=20, window=300)

    if not _HAS_BOTO3:
        raise HTTPException(status_code=503, detail="File storage is not configured.")

    # Validate: images only, max 5 MB
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS, max_size=5 * 1024 * 1024)

    r2 = db.query(models.R2Settings).first()
    if not r2 or not r2.secret_access_key or not r2.bucket_name:
        raise HTTPException(status_code=503, detail="File storage is not configured. Please contact support.")

    key = f"student-photos/{uuid.uuid4().hex}{ext}"
    try:
        s3 = _build_s3_client(r2)
        content = await file.read()
        s3.put_object(
            Bucket=r2.bucket_name,
            Key=key,
            Body=content,
            ContentType=file.content_type or "image/jpeg",
        )
        public_url = r2.public_url or ""
        file_url = f"{public_url.rstrip('/')}/{key}" if public_url else ""
        return {"status": "success", "url": file_url, "key": key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


@router.post("/create-order")
def create_booking_order(req: CreateOrderRequest, request: Request, db: Session = Depends(get_db)):
    """Public: create a Razorpay order for the slot booking amount."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Booking amount must be positive.")

    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check for duplicate active purchase before creating a Razorpay order
    student_conditions = [models.Student.email == req.student_email]
    if req.phone:
        student_conditions.append(models.Student.phone == req.phone)
    student = db.query(models.Student).filter(or_(*student_conditions)).first() if student_conditions else None
    if student:
        existing_purchase = (
            db.query(models.CoursePurchase)
            .filter(
                models.CoursePurchase.student_id == student.id,
                models.CoursePurchase.course_id == req.course_id,
                models.CoursePurchase.status != "cancelled",
            )
            .first()
        )
        if existing_purchase:
            raise HTTPException(
                status_code=400,
                detail="You have already booked a slot for this course. Check your email for the receipt.",
            )

    # Verify the amount matches the expected booking amount (prevent tampering)
    if req.pay_mode == "full":
        expected = _compute_full_payment_discounted(course)
        if expected <= 0:
            raise HTTPException(
                status_code=400,
                detail="Full payment discount is not available for this course."
            )
    else:
        expected = _compute_booking_amount(course)
    if abs(req.amount - expected) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Amount mismatch. Expected Rs. {expected:.2f}."
        )

    client = _get_razorpay_client(db)
    amount_paise = int(round(req.amount * 100))
    order_data = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"slot_{course.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "notes": {
            "course_id": str(course.id),
            "course": course.title,
            "student_name": req.student_name,
            "student_email": req.student_email,
        },
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


@router.post("/verify-and-register")
def verify_and_register(req: VerifyAndRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Public: verify Razorpay signature, create Student + CoursePurchase + BatchEnrollment +
    PaymentTransaction, send email + push notification, return receipt data."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)

    if not req.agree_terms:
        raise HTTPException(status_code=400, detail="You must agree to the Terms & Conditions.")

    # 1. Verify Razorpay signature
    pay_settings = db.query(models.PaymentSettings).first()
    if not pay_settings or not pay_settings.razorpay_key_secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured.")

    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_sig = hmac.new(
        pay_settings.razorpay_key_secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature.")

    # 2. Validate course
    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 3. Validate batch (if provided)
    batch = None
    if req.batch_id:
        batch = db.query(models.Batch).filter(
            models.Batch.id == req.batch_id,
            models.Batch.course_id == req.course_id,
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found for this course.")

        # Check seat availability
        enrolled_count = (
            db.query(func.count(models.BatchEnrollment.id))
            .filter(
                models.BatchEnrollment.batch_id == batch.id,
                models.BatchEnrollment.status == "active",
            )
            .scalar() or 0
        )
        seats_available = max(batch.max_capacity - enrolled_count, 0)
        if seats_available <= 0 and not batch.enable_waitlist:
            raise HTTPException(status_code=400, detail="This batch is full. Please select another batch.")

    # 4. Check for duplicate active purchase
    existing_purchase = (
        db.query(models.CoursePurchase)
        .filter(
            models.CoursePurchase.student_id == None,  # placeholder, will check after student upsert
        )
        .first()
    )

    # 5. Find-or-create Student by email
    student = db.query(models.Student).filter(models.Student.email == req.email).first()
    if student:
        # Update existing student fields
        student.first_name = req.first_name
        if req.last_name:
            student.last_name = req.last_name
        student.phone = req.phone
        if req.date_of_birth:
            student.date_of_birth = req.date_of_birth
        if req.profile_photo_url:
            student.profile_photo_url = req.profile_photo_url
        if req.city:
            student.city = req.city
        if req.state:
            student.state = req.state
        if req.pin_code:
            student.pin_code = req.pin_code
        if req.address:
            student.address = req.address
        if req.highest_qualification:
            student.highest_qualification = req.highest_qualification
        if req.student_category:
            student.student_category = req.student_category
        student.source = "slot_booking"
    else:
        # Check phone uniqueness
        if req.phone:
            existing_phone = db.query(models.Student).filter(models.Student.phone == req.phone).first()
            if existing_phone:
                raise HTTPException(status_code=400, detail="Phone number already registered. Use the same email to log in.")
        student = models.Student(
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
            phone=req.phone,
            date_of_birth=req.date_of_birth,
            profile_photo_url=req.profile_photo_url,
            city=req.city,
            state=req.state,
            pin_code=req.pin_code,
            address=req.address,
            highest_qualification=req.highest_qualification,
            student_category=req.student_category,
            source="slot_booking",
            is_active=True,
        )
        db.add(student)
        db.flush()

    # 6. Check for duplicate active purchase (now that we have the student)
    existing_purchase = (
        db.query(models.CoursePurchase)
        .filter(
            models.CoursePurchase.student_id == student.id,
            models.CoursePurchase.course_id == req.course_id,
            models.CoursePurchase.status != "cancelled",
        )
        .first()
    )
    if existing_purchase:
        raise HTTPException(
            status_code=400,
            detail="You have already booked a slot for this course. Check your email for the receipt."
        )

    # 7. Create CoursePurchase
    total_fee = float(course.discount_price if course.discount_price else (course.price or 0.0))
    booking_amount = req.amount_paid
    net_fee = total_fee
    due_amount = round(net_fee - booking_amount, 2)
    inv_uuid = str(uuid.uuid4())

    purchase = models.CoursePurchase(
        student_id=student.id,
        course_id=course.id,
        total_fee=total_fee,
        discount=0.0,
        net_fee=net_fee,
        paid_amount=booking_amount,
        due_amount=due_amount,
        status="completed" if due_amount <= 0 else "active",
        notes="Slot Booking (online)",
        invoice_uuid=inv_uuid,
        is_installment=False,
        is_active=True,
    )
    db.add(purchase)
    db.flush()

    # 8. Create PaymentTransaction
    txn = models.PaymentTransaction(
        purchase_id=purchase.id,
        amount=booking_amount,
        payment_method="Razorpay",
        reference_no=req.razorpay_payment_id,
        notes=f"Slot booking payment — Razorpay Order: {req.razorpay_order_id}",
        status="approved",
    )
    db.add(txn)
    db.flush()
    if not txn.reference_no or not txn.reference_no.startswith("IINM-TXN"):
        txn.reference_no = f"IINM-TXN-{datetime.now().strftime('%Y%m')}-{txn.id:04d}"

    # 9. Create BatchEnrollment
    enrollment_status = "active"
    if batch:
        enrolled_count = (
            db.query(func.count(models.BatchEnrollment.id))
            .filter(
                models.BatchEnrollment.batch_id == batch.id,
                models.BatchEnrollment.status == "active",
            )
            .scalar() or 0
        )
        if enrolled_count >= batch.max_capacity and batch.enable_waitlist:
            enrollment_status = "waitlisted"
        enrollment = models.BatchEnrollment(
            batch_id=batch.id,
            student_id=student.id,
            status=enrollment_status,
        )
        db.add(enrollment)

    db.commit()
    db.refresh(purchase)
    db.refresh(student)

    # 10. Send confirmation email (non-blocking — fails silently)
    class_start_date = batch.start_date if batch else course.start_date.date() if course.start_date else None
    _send_booking_email(
        db=db,
        student=student,
        course=course,
        batch=batch,
        booking_amount=booking_amount,
        invoice_uuid=inv_uuid,
        class_start_date=class_start_date,
    )

    # 11. Send push notification (non-blocking — fails silently)
    _send_push_notification(
        db=db,
        student_name=f"{student.first_name} {student.last_name or ''}".strip(),
        course_title=course.title,
        amount=booking_amount,
    )

    # 12. Return receipt data
    site = db.query(models.SiteSettings).first()
    contact = db.query(models.ContactSettings).first()
    return {
        "status": "success",
        "message": "Slot booked successfully!",
        "invoice_uuid": inv_uuid,
        "student_id": student.id,
        "purchase_id": purchase.id,
        "transaction_id": txn.id,
        "batch_name": batch.name if batch else None,
        "batch_status": enrollment_status if batch else None,
        "class_start_date": class_start_date.isoformat() if class_start_date else None,
        "booking_amount": booking_amount,
        "course_fee": purchase.net_fee,
        "due_amount": purchase.due_amount,
        "currency": pay_settings.currency if pay_settings else "INR",
        "course_title": course.title,
        "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
        "student_email": student.email,
        "student_phone": student.phone,
        "student_address": student.address,
        "site_name": site.site_name if site else None,
        "logo_url": rewrite_url(site.logo_url or site.dark_logo_url) if site else None,
        "dark_logo_url": rewrite_url(site.dark_logo_url) if site else None,
        "favicon_url": rewrite_url(site.favicon_url) if site else None,
        "founder_name": site.founder_name if site else None,
        "founder_designation": site.founder_designation if site else None,
        "founder_signature_url": rewrite_url(site.founder_signature_url) if site else None,
        "contact": {
            "phone1": contact.phone1 if contact else None,
            "phone2": contact.phone2 if contact else None,
            "email1": contact.email1 if contact else None,
            "email2": contact.email2 if contact else None,
            "address_line1": contact.address_line1 if contact else None,
            "address_line2": contact.address_line2 if contact else None,
            "city": contact.city if contact else None,
            "state": contact.state if contact else None,
            "pin_code": contact.pin_code if contact else None,
            "country": contact.country if contact else None,
            "terms_text": contact.terms_text if contact else None,
            "terms_url": contact.terms_url if contact else None,
        },
    }


@router.get("/receipt/{invoice_uuid}")
def get_booking_receipt(invoice_uuid: str, db: Session = Depends(get_db)):
    """Public: return receipt data for PDF generation."""
    purchase = db.query(models.CoursePurchase).filter(
        models.CoursePurchase.invoice_uuid == invoice_uuid
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Receipt not found")

    student = db.query(models.Student).filter(models.Student.id == purchase.student_id).first()
    course = db.query(models.Course).filter(models.Course.id == purchase.course_id).first()

    # Find the batch enrollment for this student+course
    enrollment = (
        db.query(models.BatchEnrollment)
        .filter(models.BatchEnrollment.student_id == student.id)
        .order_by(models.BatchEnrollment.id.desc())
        .first()
    )
    batch = enrollment.batch if enrollment else None

    # Get the first (booking) transaction
    txn = (
        db.query(models.PaymentTransaction)
        .filter(models.PaymentTransaction.purchase_id == purchase.id)
        .order_by(models.PaymentTransaction.id.asc())
        .first()
    )

    site = db.query(models.SiteSettings).first()
    contact = db.query(models.ContactSettings).first()
    pay = db.query(models.PaymentSettings).first()

    class_start_date = batch.start_date if batch else (course.start_date.date() if course.start_date else None)

    return {
        "invoice_no": f"INV-{purchase.id:05d}",
        "invoice_uuid": purchase.invoice_uuid,
        "date": purchase.created_at.date().isoformat() if purchase.created_at else date.today().isoformat(),
        "payment_date": txn.created_at.isoformat() if txn else None,
        "transaction_id": txn.reference_no if txn else None,
        "booking_amount": txn.amount if txn else purchase.paid_amount,
        "course_fee": purchase.net_fee,
        "due_amount": purchase.due_amount,
        "student": {
            "name": f"{student.first_name} {student.last_name or ''}".strip(),
            "email": student.email,
            "phone": student.phone,
            "city": student.city,
            "state": student.state,
            "address": student.address,
        },
        "course": {
            "title": course.title,
        },
        "batch": {
            "name": batch.name if batch else None,
            "mode": batch.mode if batch else None,
            "start_date": batch.start_date.isoformat() if batch and batch.start_date else None,
        },
        "class_start_date": class_start_date.isoformat() if class_start_date else None,
        "currency": pay.currency if pay else "INR",
        "site": {
            "name": site.site_name if site else None,
            "logo_url": rewrite_url(site.logo_url or site.dark_logo_url) if site else None,
            "dark_logo_url": rewrite_url(site.dark_logo_url) if site else None,
            "favicon_url": rewrite_url(site.favicon_url) if site else None,
            "founder_name": site.founder_name if site else None,
            "founder_designation": site.founder_designation if site else None,
            "founder_signature_url": rewrite_url(site.founder_signature_url) if site else None,
            "contact": {
                "phone1": contact.phone1 if contact else None,
                "phone2": contact.phone2 if contact else None,
                "email1": contact.email1 if contact else None,
                "email2": contact.email2 if contact else None,
                "address_line1": contact.address_line1 if contact else None,
                "address_line2": contact.address_line2 if contact else None,
                "city": contact.city if contact else None,
                "state": contact.state if contact else None,
                "pin_code": contact.pin_code if contact else None,
                "country": contact.country if contact else None,
                "terms_text": contact.terms_text if contact else None,
                "terms_url": contact.terms_url if contact else None,
            },
        },
    }
