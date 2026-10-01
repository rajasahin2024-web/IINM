"""
Webinar funnel plumbing — ₹499 ticket checkout (Razorpay UPI/cards/netbanking),
eWebinar auto-registration on payment success, and the caller sheet the
telecall team works daily.

Flow:
  LP (frontend /webinar)
    → POST /api/webinar/checkout        (create lead + Razorpay order, ₹499 fixed server-side)
    → Razorpay Checkout modal (UPI intent / QR / card)
    → POST /api/webinar/verify          (HMAC signature check → paid → eWebinar register → email join link)
    → Meta Pixel `Purchase` fires on the LP success state

  Safety nets / data in:
    POST /api/webinar/razorpay-webhook  (payment.captured — covers dropped checkout callbacks)
    POST /api/webinar/ewebinar-hook     (eWebinar registrant webhooks: Joined/Watched/… → attendee analytics)

  Caller sheet:
    GET  /api/webinar/caller-sheet[?format=csv]   (Bearer CALLER_SHEET_TOKEN)
    POST /api/webinar/caller-sheet/{uuid}/call    (mark call outcome)
    POST /api/webinar/{uuid}/retry-registration   (replay failed eWebinar registration)

Env:
    WEBINAR_TICKET_PRICE_INR   ticket price in ₹ (default 499 — board-approved price point)
    EWEBINAR_API_KEY           ew_api_… key with `Registrants` permission (Team settings → Integrations → API access)
    EWEBINAR_WEBINAR_ID        the published evergreen webinar's id
    EWEBINAR_API_BASE          default https://api.ewebinar.com/v2
    EWEBINAR_SESSION_TIME      optional ISO-8601; omit for JIT/next-session registration
    EWEBINAR_REGISTRATION_URL  optional generic endpoint (e.g. Zapier catch hook) used INSTEAD of the REST API
    EWEBINAR_HOOK_TOKEN        shared secret for the inbound eWebinar webhook (?token=… on the URL)
    RAZORPAY_WEBHOOK_SECRET    Razorpay dashboard webhook secret for payment.captured
    CALLER_SHEET_TOKEN         bearer token guarding the caller sheet + ops endpoints

Razorpay key id/secret reuse the admin-managed `payment_settings` table
(test/live toggle) — same source as invoice checkout.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import hashlib
import hmac
import json
import logging
import os
import re
import uuid as uuidlib

import httpx
import razorpay

import models
from cache import cache
from database import get_db
from helpers import send_email
from routers.invoice import _get_razorpay_client
from security import check_public_rate_limit, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webinar", tags=["webinar"])

# ── Config (env) ────────────────────────────────────────────────────────────
TICKET_PRICE_INR = int(os.getenv("WEBINAR_TICKET_PRICE_INR", "499"))
TICKET_AMOUNT_PAISE = TICKET_PRICE_INR * 100

EWEBINAR_API_KEY = os.getenv("EWEBINAR_API_KEY", "")
EWEBINAR_API_BASE = os.getenv("EWEBINAR_API_BASE", "https://api.ewebinar.com/v2").rstrip("/")
EWEBINAR_WEBINAR_ID = os.getenv("EWEBINAR_WEBINAR_ID", "")
EWEBINAR_SESSION_TIME = os.getenv("EWEBINAR_SESSION_TIME", "")
EWEBINAR_REGISTRATION_URL = os.getenv("EWEBINAR_REGISTRATION_URL", "")
EWEBINAR_HOOK_TOKEN = os.getenv("EWEBINAR_HOOK_TOKEN", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
CALLER_SHEET_TOKEN = os.getenv("CALLER_SHEET_TOKEN", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://iinmedu.com").rstrip("/")

WEBINAR_TITLE = os.getenv("WEBINAR_TITLE", "Agentic AI Career Webinar")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_VALID_CALL_STATUSES = {"contacted", "interested", "not_interested", "no_answer", "callback"}


# ── Schemas ─────────────────────────────────────────────────────────────────
class CheckoutRequest(BaseModel):
    name: str
    email: str
    phone: str
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    fbc: Optional[str] = None
    fbp: Optional[str] = None
    referrer: Optional[str] = None


class VerifyRequest(BaseModel):
    lead_uuid: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class CallUpdateRequest(BaseModel):
    call_status: str
    notes: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────────────────────
def _razorpay_key_id(db: Session) -> Optional[str]:
    s = db.query(models.PaymentSettings).first()
    if not s:
        return None
    if s.is_test_mode:
        return s.razorpay_test_key_id or s.razorpay_key_id
    return s.razorpay_live_key_id or s.razorpay_key_id


def _razorpay_key_secret(db: Session) -> Optional[str]:
    s = db.query(models.PaymentSettings).first()
    if not s:
        return None
    if s.is_test_mode:
        return s.razorpay_test_key_secret or s.razorpay_key_secret
    return s.razorpay_live_key_secret or s.razorpay_key_secret


def _normalize_phone(raw: str) -> str:
    """Normalize to a 10-digit Indian mobile (strips +91/91/0 prefixes)."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def _public_lead(lead: "models.WebinarLead") -> dict:
    return {
        "uuid": lead.uuid,
        "status": lead.status,
        "join_url": lead.ewebinar_join_url,
        "replay_url": lead.ewebinar_replay_url,
        "session_time": lead.ewebinar_session_time.isoformat() if lead.ewebinar_session_time else None,
        "registered": lead.status == "registered",
    }


def _register_with_ewebinar(lead: "models.WebinarLead") -> None:
    """Register the paid lead in eWebinar. Best-effort: raises on failure so the
    caller can mark registration_pending — a paid ticket is never lost."""
    first, _, last = (lead.name or "").strip().partition(" ")
    payload = {
        "email": lead.email,
        "firstName": first or lead.name,
        "lastName": last or "",
        "name": lead.name,
        "phone": lead.phone,
        "webinarId": EWEBINAR_WEBINAR_ID,
        "leadUuid": lead.uuid,
        "source": "razorpay-checkout",
    }
    if EWEBINAR_SESSION_TIME:
        payload["sessionTime"] = EWEBINAR_SESSION_TIME

    if EWEBINAR_REGISTRATION_URL:
        # Generic target (e.g. Zapier catch hook) — full payload, no auth.
        resp = httpx.post(EWEBINAR_REGISTRATION_URL, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json() if resp.content else {}
    elif EWEBINAR_API_KEY and EWEBINAR_WEBINAR_ID:
        resp = httpx.post(
            f"{EWEBINAR_API_BASE}/registrants",
            json=payload,
            headers={"Authorization": f"Bearer {EWEBINAR_API_KEY}"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json() if resp.content else {}
    else:
        raise RuntimeError("eWebinar is not configured (set EWEBINAR_API_KEY+EWEBINAR_WEBINAR_ID or EWEBINAR_REGISTRATION_URL)")

    lead.ewebinar_registrant_id = (
        data.get("id") or data.get("registrantId") or data.get("attendeeId")
    )
    lead.ewebinar_join_url = data.get("joinLink") or data.get("join_link") or data.get("joinUrl")
    lead.ewebinar_replay_url = data.get("replayLink") or data.get("replay_link")
    if data.get("sessionTime"):
        try:
            lead.ewebinar_session_time = datetime.fromisoformat(str(data["sessionTime"]).replace("Z", "+00:00"))
        except ValueError:
            pass
    lead.ewebinar_state = data.get("state") or "Registered"


def _send_ticket_email(lead: "models.WebinarLead", db: Session) -> None:
    join = lead.ewebinar_join_url
    join_block = (
        f'<p style="text-align:center;margin:24px 0">'
        f'<a href="{join}" style="background:#e63946;color:#fff;padding:14px 32px;'
        f'border-radius:8px;text-decoration:none;font-weight:700">Join the Webinar</a></p>'
        f'<p style="color:#64748b;font-size:13px">Or paste this link: {join}</p>'
        if join else
        '<p style="color:#64748b">Your join link will follow shortly — '
        'we are confirming your seat with the webinar platform.</p>'
    )
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="color:#0a1628">Your seat is booked 🎉</h2>
      <p>Hi {lead.name},</p>
      <p>Payment received for <b>{WEBINAR_TITLE}</b> — ₹{lead.amount_paise // 100} (INR),
      ref <code>{lead.razorpay_payment_id}</code>.</p>
      {join_block}
      <p style="color:#64748b;font-size:13px">Watch the full session and stay till the end —
      attendees get the 48-hour bonus offer on our courses.</p>
      <p style="color:#64748b;font-size:13px">— IINM Team · {FRONTEND_URL}</p>
    </div>
    """
    send_email(db, lead.email, f"You're in — {WEBINAR_TITLE}", html_body=html)


def _finalize_paid_lead(lead: "models.WebinarLead", payment_id: str, db: Session) -> None:
    """Idempotent: mark paid, register in eWebinar, email the join link."""
    already_paid = lead.status in ("paid", "registered", "registration_pending", "registration_failed")
    if not already_paid:
        lead.status = "paid"
        lead.razorpay_payment_id = payment_id
        lead.paid_at = datetime.utcnow()
    elif payment_id and not lead.razorpay_payment_id:
        lead.razorpay_payment_id = payment_id
        lead.paid_at = lead.paid_at or datetime.utcnow()

    if lead.status != "registered":
        try:
            _register_with_ewebinar(lead)
            lead.status = "registered"
            lead.registered_at = datetime.utcnow()
            lead.registration_error = None
        except Exception as e:
            logger.warning("eWebinar registration failed for lead %s: %s", lead.uuid, e)
            lead.status = "registration_pending"
            lead.registration_error = str(e)[:1000]

    db.commit()

    try:
        _send_ticket_email(lead, db)
    except Exception as e:
        logger.warning("Ticket email failed for lead %s: %s", lead.uuid, e)


def _require_sheet_token(request: Request) -> None:
    """Bearer-token guard for caller-sheet / ops endpoints."""
    if not CALLER_SHEET_TOKEN:
        raise HTTPException(status_code=503, detail="Caller sheet not configured (CALLER_SHEET_TOKEN unset)")
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.query_params.get("token", "")
    if not token or not hmac.compare_digest(token, CALLER_SHEET_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Public checkout endpoints ───────────────────────────────────────────────
@router.get("/config")
def webinar_checkout_config(db: Session = Depends(get_db)):
    """Public checkout config for the LP — publishable key + fixed ticket price."""
    cached = cache.get("webinar:checkout_config")
    if cached:
        return cached
    resp = {
        "razorpay_key_id": _razorpay_key_id(db),
        "amount_paise": TICKET_AMOUNT_PAISE,
        "amount_inr": TICKET_PRICE_INR,
        "currency": "INR",
        "title": WEBINAR_TITLE,
    }
    cache.set("webinar:checkout_config", resp, ttl=60)
    return resp


@router.post("/checkout")
def webinar_checkout(req: CheckoutRequest, request: Request, db: Session = Depends(get_db)):
    """Create a webinar lead + Razorpay order. Price is fixed server-side (₹499)."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=8, window=300)

    name = (req.name or "").strip()
    email = (req.email or "").strip().lower()
    phone = _normalize_phone(req.phone)
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Valid email is required")
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit mobile number is required")

    # Re-buy guard: same email already paid → return their join link, no new order.
    existing_paid = db.query(models.WebinarLead).filter(
        models.WebinarLead.email == email,
        models.WebinarLead.status.in_(["paid", "registered", "registration_pending", "registration_failed"]),
    ).order_by(models.WebinarLead.id.desc()).first()
    if existing_paid:
        return {
            "already_paid": True,
            "lead": _public_lead(existing_paid),
            "message": "This email already has a paid seat. Your join link is below.",
        }

    # Reuse an unpaid lead for the same email (abandoned checkout retry).
    lead = db.query(models.WebinarLead).filter(
        models.WebinarLead.email == email,
        models.WebinarLead.status == "created",
    ).order_by(models.WebinarLead.id.desc()).first()
    if not lead:
        lead = models.WebinarLead(
            uuid=uuidlib.uuid4().hex,
            name=name, email=email, phone=phone,
            status="created",
            amount_paise=TICKET_AMOUNT_PAISE, currency="INR",
        )
        db.add(lead)
    else:
        lead.name, lead.phone = name, phone
        lead.amount_paise = TICKET_AMOUNT_PAISE

    lead.utm_source = req.utm_source
    lead.utm_medium = req.utm_medium
    lead.utm_campaign = req.utm_campaign
    lead.utm_term = req.utm_term
    lead.utm_content = req.utm_content
    lead.fbc = req.fbc
    lead.fbp = req.fbp
    lead.referrer = (req.referrer or "")[:512] or None

    client = _get_razorpay_client(db)
    order = client.order.create(data={
        "amount": TICKET_AMOUNT_PAISE,
        "currency": "INR",
        "receipt": f"web_{lead.uuid[:24]}",
        "notes": {
            "product": "webinar_ticket",
            "lead_uuid": lead.uuid,
            "email": email,
            "webinar": WEBINAR_TITLE,
        },
    })
    lead.razorpay_order_id = order["id"]
    db.commit()

    return {
        "already_paid": False,
        "lead_uuid": lead.uuid,
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "razorpay_key_id": _razorpay_key_id(db),
    }


@router.post("/verify")
def webinar_verify(req: VerifyRequest, request: Request, db: Session = Depends(get_db)):
    """Verify the Razorpay signature, mark paid, register into eWebinar."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=10, window=300)

    lead = db.query(models.WebinarLead).filter(models.WebinarLead.uuid == req.lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Order not found")
    if lead.razorpay_order_id != req.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch")

    secret = _razorpay_key_secret(db)
    if not secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    expected = hmac.new(
        secret.encode("utf-8"),
        f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    _finalize_paid_lead(lead, req.razorpay_payment_id, db)
    return {"ok": True, "lead": _public_lead(lead), "amount_inr": lead.amount_paise // 100}


@router.get("/status/{lead_uuid}")
def webinar_status(lead_uuid: str, db: Session = Depends(get_db)):
    """Success-page polling: flips registration_pending → registered once eWebinar confirms."""
    lead = db.query(models.WebinarLead).filter(models.WebinarLead.uuid == lead_uuid).first()
    if not lead or lead.status == "created":
        raise HTTPException(status_code=404, detail="Not found")
    return {"lead": _public_lead(lead)}


# ── Inbound webhooks ────────────────────────────────────────────────────────
@router.post("/razorpay-webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay webhook — handles payment.captured as a backup to /verify."""
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), raw, hashlib.sha256
    ).hexdigest()
    if not signature or not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = json.loads(raw)
    if event.get("event") == "payment.captured":
        entity = event.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        if order_id:
            lead = db.query(models.WebinarLead).filter(
                models.WebinarLead.razorpay_order_id == order_id
            ).first()
            if lead:
                _finalize_paid_lead(lead, payment_id, db)
    return {"ok": True}


@router.post("/ewebinar-hook")
async def ewebinar_hook(request: Request, db: Session = Depends(get_db)):
    """eWebinar registrant webhook → attendee analytics for the caller sheet.

    eWebinar webhook config only accepts a URL, so the shared secret travels as
    ?token=… on the configured endpoint.
    """
    if not EWEBINAR_HOOK_TOKEN:
        raise HTTPException(status_code=503, detail="eWebinar hook not configured")
    token = request.query_params.get("token", "")
    if not token or not hmac.compare_digest(token, EWEBINAR_HOOK_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await request.json()
    email = (payload.get("email") or "").strip().lower()
    registrant_id = payload.get("attendeeId") or payload.get("id")
    lead = None
    if registrant_id:
        lead = db.query(models.WebinarLead).filter(
            models.WebinarLead.ewebinar_registrant_id == registrant_id
        ).first()
    if not lead and email:
        lead = db.query(models.WebinarLead).filter(
            models.WebinarLead.email == email,
            models.WebinarLead.status != "created",
        ).order_by(models.WebinarLead.id.desc()).first()
    if not lead:
        return {"ok": True, "matched": False}

    if registrant_id and not lead.ewebinar_registrant_id:
        lead.ewebinar_registrant_id = registrant_id
    if payload.get("joinLink") and not lead.ewebinar_join_url:
        lead.ewebinar_join_url = payload["joinLink"]
    if payload.get("replayLink"):
        lead.ewebinar_replay_url = payload["replayLink"]

    action = payload.get("action") or ""
    state = payload.get("state") or None
    now = datetime.utcnow()
    lead.ewebinar_last_action = action[:48] or lead.ewebinar_last_action
    lead.ewebinar_state = (state or "")[:32] or lead.ewebinar_state
    if action in ("Joined",) or state == "Joined":
        lead.joined_at = lead.joined_at or now
    if action in ("WatchedWebinar", "WatchedReplay", "WebinarFinished") or state == "Watched":
        lead.watched_at = lead.watched_at or now
    if action == "Registered" and lead.status == "registration_pending":
        lead.status = "registered"
        lead.registered_at = lead.registered_at or now

    session_time = payload.get("sessionTime")
    if session_time:
        try:
            lead.ewebinar_session_time = datetime.fromisoformat(str(session_time).replace("Z", "+00:00"))
        except ValueError:
            pass

    db.commit()
    return {"ok": True, "matched": True, "lead": lead.uuid}


# ── Caller sheet (telecall team) ────────────────────────────────────────────
def _caller_rows(db: Session, status_filter: Optional[str], uncalled_only: bool):
    q = db.query(models.WebinarLead).filter(models.WebinarLead.status != "created")
    if status_filter:
        q = q.filter(models.WebinarLead.status == status_filter)
    if uncalled_only:
        q = q.filter(models.WebinarLead.call_status.is_(None))
    leads = q.order_by(models.WebinarLead.paid_at.desc().nullslast(), models.WebinarLead.id.desc()).all()
    return [
        {
            "uuid": l.uuid,
            "name": l.name,
            "email": l.email,
            "phone": l.phone,
            "status": l.status,
            "paid_at": l.paid_at.isoformat() if l.paid_at else None,
            "amount_inr": l.amount_paise // 100,
            "payment_ref": l.razorpay_payment_id,
            "join_url": l.ewebinar_join_url,
            "session_time": l.ewebinar_session_time.isoformat() if l.ewebinar_session_time else None,
            "attended": bool(l.joined_at),
            "joined_at": l.joined_at.isoformat() if l.joined_at else None,
            "watched": bool(l.watched_at),
            "ewebinar_state": l.ewebinar_state,
            "utm_source": l.utm_source,
            "utm_campaign": l.utm_campaign,
            "call_status": l.call_status,
            "call_notes": l.call_notes,
            "called_at": l.called_at.isoformat() if l.called_at else None,
        }
        for l in leads
    ]


@router.get("/caller-sheet")
def caller_sheet(
    request: Request,
    db: Session = Depends(get_db),
    format: str = "json",
    status: Optional[str] = None,
    uncalled: bool = False,
):
    """Daily caller list — JSON for tooling, ?format=csv for Google Sheets/Excel import."""
    _require_sheet_token(request)
    rows = _caller_rows(db, status, uncalled)
    if format == "csv":
        import csv
        import io
        buf = io.StringIO()
        fields = ["name", "email", "phone", "paid_at", "attended", "joined_at", "watched",
                  "ewebinar_state", "call_status", "call_notes", "utm_campaign", "join_url", "uuid"]
        w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=webinar-caller-sheet.csv"},
        )
    return {"count": len(rows), "rows": rows}


@router.post("/caller-sheet/{lead_uuid}/call")
def caller_sheet_mark_call(lead_uuid: str, req: CallUpdateRequest, request: Request, db: Session = Depends(get_db)):
    """Caller marks an outcome on a lead row."""
    _require_sheet_token(request)
    lead = db.query(models.WebinarLead).filter(models.WebinarLead.uuid == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if req.call_status not in _VALID_CALL_STATUSES:
        raise HTTPException(status_code=400, detail=f"call_status must be one of {sorted(_VALID_CALL_STATUSES)}")
    lead.call_status = req.call_status
    lead.call_notes = (req.notes or "")[:2000] or None
    lead.called_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "uuid": lead.uuid, "call_status": lead.call_status}


@router.post("/{lead_uuid}/retry-registration")
def retry_registration(lead_uuid: str, request: Request, db: Session = Depends(get_db)):
    """Ops retry for paid leads whose eWebinar registration failed/pending."""
    _require_sheet_token(request)
    lead = db.query(models.WebinarLead).filter(models.WebinarLead.uuid == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.status not in ("paid", "registration_pending", "registration_failed"):
        raise HTTPException(status_code=400, detail=f"Lead status '{lead.status}' is not retryable")
    try:
        _register_with_ewebinar(lead)
        lead.status = "registered"
        lead.registered_at = datetime.utcnow()
        lead.registration_error = None
        db.commit()
    except Exception as e:
        lead.status = "registration_failed"
        lead.registration_error = str(e)[:1000]
        db.commit()
        raise HTTPException(status_code=502, detail=f"eWebinar registration failed: {e}")
    return {"ok": True, "lead": _public_lead(lead)}
