from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DBAPIError
from sqlalchemy import text
from pydantic import BaseModel
import httpx
import os
import uuid
import logging
import secrets
import hashlib
import hmac
import base64
import time
from typing import Optional

from database import engine, SessionLocal, Base, get_db
from cache import cache as app_cache
from models import AdminUser, DeviceSession, DeviceAdminUser, Student
from routers import courses, materials, questions, question_types, settings, comprehensions, topics, difficulty, batches, student, academic, progress, exams, dashboard, blogs, testimonials, contact, about, faq, leadership, invoice, slot_booking, seo, career, pages
from security import check_public_rate_limit, get_client_ip, verify_password

# ── Database Setup ──────────────────────────────────────────────────────────
# create_all: Creates all tables on a FRESH database (safe — skips if exists).
# For schema changes going forward, use Alembic:
#   alembic revision --autogenerate -m "description"
#   alembic upgrade head
# On a fresh DB: start server first (create_all runs), then: alembic stamp head
Base.metadata.create_all(bind=engine)

# ── Disable Swagger docs in production (set ENABLE_DOCS=true in .env to re-enable locally) ──
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "false").lower() == "true"

app = FastAPI(
    title="IINM Admin API",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)

app.include_router(courses.router)
app.include_router(settings.router)
app.include_router(materials.router)
app.include_router(question_types.router)
app.include_router(questions.router)
app.include_router(comprehensions.router)
app.include_router(topics.router)
app.include_router(difficulty.router)
app.include_router(batches.router)
app.include_router(student.router)
app.include_router(academic.router)
app.include_router(progress.router)
app.include_router(exams.router)
app.include_router(dashboard.router)
app.include_router(blogs.router)
app.include_router(testimonials.router)
app.include_router(contact.router)
app.include_router(about.router)
app.include_router(faq.router)
app.include_router(leadership.router)
app.include_router(invoice.router)
app.include_router(slot_booking.router)
app.include_router(seo.router)
app.include_router(career.router)
app.include_router(pages.router)
# Ensure upload directories exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/materials", exist_ok=True)
os.makedirs("uploads/thumbnails", exist_ok=True)
os.makedirs("uploads/leadership", exist_ok=True)
os.makedirs("uploads/career", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://iinmedu.com",
        "https://www.iinmedu.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:2021",
        "http://127.0.0.1:2021",
        "http://147.93.29.113:2021",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Device-Token", "Authorization", "X-Requested-With"],
)

# ── Security Headers Middleware (pure ASGI) ─────────────────────────────────
# Pure ASGI middleware injects security headers into http.response.start WITHOUT
# buffering the response body. This is critical: BaseHTTPMiddleware buffers the
# entire response before sending it, which delays db.close() in get_db's finally
# block and holds DB connections longer than necessary, causing QueuePool
# exhaustion under concurrent load.
# See: https://www.starlette.io/middleware/#limitations-of-basemiddleware

class SecurityHeadersMiddleware:
    """Pure ASGI middleware — adds static security headers, no body buffering."""

    _HEADERS = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
        (b"strict-transport-security", b"max-age=31536000; includeSubDomains; preload"),
    ]

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Only intercept HTTP requests; pass through websocket/lifespan as-is.
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Build a header lookup so we overwrite existing values without
                # creating duplicates (security headers should be authoritative).
                existing = dict(message.get("headers", []))
                for name, value in self._HEADERS:
                    existing[name] = value
                message["headers"] = list(existing.items())
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(SecurityHeadersMiddleware)

# ── Global DB Exception Handlers ─────────────────────────────────────────────
# When the database is unreachable, return 503 instead of crashing the server.
# The frontend middleware detects 503 and redirects to /maintenance.

@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    logging.error(f"DB OperationalError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Database temporarily unavailable", "error": "db_down"}
    )

@app.exception_handler(DBAPIError)
async def db_api_error_handler(request: Request, exc: DBAPIError):
    logging.error(f"DBAPIError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Database temporarily unavailable", "error": "db_down"}
    )

# ── Health Check Endpoint ────────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    """Public health check — verifies database connectivity."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"}
        )


GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Device admin secret — MUST be set in environment, no default
DEVICE_ADMIN_SECRET = os.getenv("DEVICE_ADMIN_SECRET")
if not DEVICE_ADMIN_SECRET:
    logging.warning(
        "DEVICE_ADMIN_SECRET is not set in environment. "
        "Device admin login will be disabled until it is configured."
    )

# Student login secret — used to sign session cookies. Falls back to device admin
# secret so the feature works without a separate env var, but a dedicated secret is
# strongly recommended for production.
STUDENT_AUTH_SECRET = os.getenv("STUDENT_AUTH_SECRET") or DEVICE_ADMIN_SECRET
if not STUDENT_AUTH_SECRET:
    logging.warning(
        "STUDENT_AUTH_SECRET is not set in environment. "
        "Student login will be disabled until it is configured."
    )

# ── Token store with expiry (48 hours) ──
_TOKEN_TTL_SECONDS = 48 * 60 * 60  # 48 hours

class _TokenEntry:
    def __init__(self, token: str):
        self.token = token
        self.created_at = time.time()

    def is_expired(self) -> bool:
        return (time.time() - self.created_at) > _TOKEN_TTL_SECONDS

_device_admin_tokens: dict[str, _TokenEntry] = {}

def _make_device_admin_token() -> str:
    token = secrets.token_urlsafe(32)
    _device_admin_tokens[token] = _TokenEntry(token)
    return token

def _verify_device_admin_token(token: str) -> bool:
    entry = _device_admin_tokens.get(token)
    if not entry:
        return False
    if entry.is_expired():
        del _device_admin_tokens[token]
        return False
    return True

def _require_device_admin_token(authorization: Optional[str] = Header(None)) -> str:
    """Dependency: validates device-admin Bearer token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization[len("Bearer "):]
    if not _verify_device_admin_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    return token

def _require_admin_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db)
) -> str:
    """Dependency: validates main admin access via approved device token in X-Device-Token header."""
    if not x_device_token:
        raise HTTPException(status_code=401, detail="X-Device-Token header required")
    session = db.query(DeviceSession).filter(
        DeviceSession.device_token == x_device_token,
        DeviceSession.is_approved == True
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized device")
    return x_device_token

# ── Student session helpers ──────────────────────────────────────────────────
_STUDENT_TOKEN_TTL_SECONDS = 48 * 60 * 60  # 48 hours

def _make_student_token(student_id: int) -> str:
    if not STUDENT_AUTH_SECRET:
        raise RuntimeError("STUDENT_AUTH_SECRET is not configured")
    expiry = int(time.time()) + _STUDENT_TOKEN_TTL_SECONDS
    payload = f"{student_id}:{expiry}"
    signature = hmac.new(
        STUDENT_AUTH_SECRET.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}:{signature}".encode('utf-8')).decode('utf-8').rstrip('=')
    return token

def _verify_student_token(token: str) -> int | None:
    if not STUDENT_AUTH_SECRET:
        return None
    try:
        # Restore base64 padding
        padded = token + '=' * (-len(token) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode('utf-8')
        student_id_str, expiry_str, signature = decoded.rsplit(':', 2)
        student_id = int(student_id_str)
        expiry = int(expiry_str)
        if time.time() > expiry:
            return None
        expected = hmac.new(
            STUDENT_AUTH_SECRET.encode('utf-8'),
            f"{student_id}:{expiry}".encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        return student_id
    except Exception:
        return None

# ── Cache Management Endpoints ───────────────────────────────────────────────
# Must be defined AFTER _require_admin_device (default args evaluate at def time).
@app.delete("/api/settings/cache/clear")
async def clear_cache(device: str = Depends(_require_admin_device)):
    """Admin: clear the in-memory response cache. Use after manual DB edits."""
    count = app_cache.clear()
    logging.info(f"Cache cleared by admin: {count} entries removed")
    return {"status": "success", "entries_cleared": count}

@app.get("/api/settings/cache/stats")
async def cache_stats(device: str = Depends(_require_admin_device)):
    """Admin: inspect the in-memory cache — entries, hits/misses, per-key TTL."""
    return app_cache.stats()

@app.delete("/api/settings/cache/invalidate/{cache_key:path}")
async def invalidate_cache_key(
    cache_key: str,
    device: str = Depends(_require_admin_device),
):
    """Admin: invalidate a single cache key (e.g. 'settings:site')."""
    app_cache.invalidate(cache_key)
    logging.info(f"Cache key invalidated by admin: {cache_key}")
    return {"status": "success", "key": cache_key}

@app.post("/api/settings/cache/reset-stats")
async def reset_cache_stats(device: str = Depends(_require_admin_device)):
    """Admin: reset only the hit/miss/set/invalidation counters."""
    app_cache.reset_stats()
    return {"status": "success"}

# ── Login rate limiting (simple in-memory, per IP) ──
_login_attempts: dict[str, list[float]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60

def _check_rate_limit(ip: str):
    if ip in ("127.0.0.1", "localhost", "::1"):
        return
        
    now = time.time()
    attempts = _login_attempts.get(ip, [])
    # Keep only attempts within the window
    attempts = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Please wait {LOGIN_WINDOW_SECONDS} seconds."
        )
    attempts.append(now)
    _login_attempts[ip] = attempts


async def _reverse_geocode(lat: float, lng: float) -> str:
    """Call Google Maps Geocoding API; returns formatted address or 'Unknown Location'."""
    if not GOOGLE_MAPS_API_KEY:
        return "Unknown Location"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                f"https://maps.googleapis.com/maps/api/geocode/json",
                params={"latlng": f"{lat},{lng}", "key": GOOGLE_MAPS_API_KEY}
            )
            data = resp.json()
            if data.get("status") == "OK" and data.get("results"):
                return data["results"][0]["formatted_address"]
    except Exception as e:
        logging.warning(f"Geocode failed: {e}")
    return "Unknown Location"

# ══════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    email: str
    password: str
    device_token: str

class DeviceRequestSchema(BaseModel):
    device_token: str
    name: str
    email: str
    phone: str
    device_name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None

class DeviceAdminLoginSchema(BaseModel):
    email: str
    password: str

class TokenHeader(BaseModel):
    token: str

class VerifyDeviceSchema(BaseModel):
    device_token: str

class StudentLoginRequest(BaseModel):
    identifier: str
    password: str

# ══════════════════════════════════════════════════════
#  DEVICE CHECK (frontend polls this on load)
# ══════════════════════════════════════════════════════

@app.get("/api/device-info")
async def device_info(token: str, db: Session = Depends(get_db)):
    """
    Returns the stored location & device details for a given device token.
    Used by the login page to display the registered location of this device.
    """
    if not token:
        raise HTTPException(status_code=400, detail="Token required")

    session = db.query(DeviceSession).filter(DeviceSession.device_token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Device not found")

    return {
        "device_name":  session.device_name or "Unknown Device",
        "device_model": session.device_model or "Unknown",
        "location":     session.location or "Unknown Location",
        "lat":          session.lat,
        "lng":          session.lng,
        "ip_address":   session.ip_address or "Unknown",
        "registered_at": session.created_at.isoformat() if session.created_at else None,
    }

@app.get("/api/device-status")
async def device_status(token: str, db: Session = Depends(get_db)):
    """
    Returns the status of a device token.
    Response: { status: 'unknown' | 'pending' | 'approved' | 'rejected' }
    """
    if not token:
        return {"status": "unknown"}

    session = db.query(DeviceSession).filter(DeviceSession.device_token == token).first()
    if not session:
        return {"status": "unknown"}
    if session.is_approved:
        return {"status": "approved"}
    if session.is_rejected:
        return {"status": "rejected"}
    return {"status": "pending"}

# ══════════════════════════════════════════════════════
#  DEVICE REQUEST SUBMISSION
# ══════════════════════════════════════════════════════

@app.post("/api/request-device")
async def request_device(req: DeviceRequestSchema, request: Request, db: Session = Depends(get_db)):
    """New device submits this form. Stores all details and waits for admin approval."""
    client_ip = get_client_ip(request)
    check_public_rate_limit(client_ip, limit=5, window=300)  # 5 requests per 5 min
    existing = db.query(DeviceSession).filter(DeviceSession.device_token == req.device_token).first()

    device_model_str = "Unknown Device"
    if req.user_agent:
        try:
            from user_agents import parse
            ua = parse(req.user_agent)
            device_model_str = f"{ua.os.family} {ua.os.version_string} / {ua.browser.family}".strip(" /")
        except Exception:
            device_model_str = "Unknown Device"

    # IP address
    forwarded_for = request.headers.get("X-Forwarded-For") or request.headers.get("CF-Connecting-IP")
    if req.ip_address:
        ip_address = req.ip_address
    elif forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else "0.0.0.0"

    if req.location:
        location_str = req.location
    else:
        location_str = "Location not provided"
        if req.lat is not None and req.lng is not None:
            location_str = await _reverse_geocode(req.lat, req.lng)

    if existing:
        if existing.is_approved:
            return {"message": "already_approved", "status": "approved"}
        if existing.is_rejected:
            # Allow re-submission after rejection
            existing.is_rejected = False
            existing.requester_name  = req.name
            existing.requester_email = req.email
            existing.requester_phone = req.phone
            existing.device_name     = req.device_name
            existing.device_model    = device_model_str
            existing.lat             = req.lat
            existing.lng             = req.lng
            existing.location        = location_str
            existing.ip_address      = ip_address
            db.commit()
            return {"message": "request_resubmitted", "status": "pending"}

        # Still pending — just update details
        existing.requester_name  = req.name
        existing.requester_email = req.email
        existing.requester_phone = req.phone
        existing.device_name     = req.device_name
        existing.device_model    = device_model_str
        existing.lat             = req.lat
        existing.lng             = req.lng
        existing.location        = location_str
        existing.ip_address      = ip_address
        db.commit()
        return {"message": "request_updated", "status": "pending"}

    # Get first admin to link to (system must be seeded)
    admin = db.query(AdminUser).first()

    new_session = DeviceSession(
        admin_id        = admin.id if admin else None,
        device_token    = req.device_token,
        requester_name  = req.name,
        requester_email = req.email,
        requester_phone = req.phone,
        device_name     = req.device_name,
        device_model    = device_model_str,
        lat             = req.lat,
        lng             = req.lng,
        location        = location_str,
        ip_address      = ip_address,
        is_approved     = False,
        is_rejected     = False,
        purpose         = "Device Access Request",
    )
    db.add(new_session)
    db.commit()
    return {"message": "request_submitted", "status": "pending"}

# ══════════════════════════════════════════════════════
#  LOGIN (only approved devices)
# ══════════════════════════════════════════════════════

@app.post("/api/login")
async def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Rate limit by IP
    client_ip = get_client_ip(request)
    _check_rate_limit(client_ip)

    # Validate credentials
    admin = db.query(AdminUser).filter(AdminUser.email == req.email).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Validate device
    session = db.query(DeviceSession).filter(DeviceSession.device_token == req.device_token).first()
    if not session:
        raise HTTPException(status_code=403, detail="unauthorized_device")
    if session.is_rejected:
        raise HTTPException(status_code=403, detail="device_rejected")
    if not session.is_approved:
        raise HTTPException(status_code=403, detail="device_pending")

    return {"message": "Login successful", "device_token": session.device_token}

@app.post("/api/verify-device")
async def verify_device(req: VerifyDeviceSchema, db: Session = Depends(get_db)):
    # Verify that the device is approved
    session = db.query(DeviceSession).filter(
        DeviceSession.device_token == req.device_token,
        DeviceSession.is_approved == True
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"status": "ok"}

# ══════════════════════════════════════════════════════
#  STUDENT LOGIN
# ══════════════════════════════════════════════════════

@app.post("/api/student/login")
async def student_login(req: StudentLoginRequest, request: Request, db: Session = Depends(get_db)):
    if not STUDENT_AUTH_SECRET:
        raise HTTPException(status_code=503, detail="Student login is not configured")

    client_ip = get_client_ip(request)
    _check_rate_limit(client_ip)

    # Search by email or phone, treat identifier as email first then phone
    identifier = req.identifier.strip().lower()
    student = db.query(Student).filter(Student.email == identifier).first()
    if not student:
        student = db.query(Student).filter(Student.phone == req.identifier.strip()).first()

    if not student or not student.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials or account is inactive")

    if not student.is_active:
        raise HTTPException(status_code=403, detail="Invalid credentials or account is inactive")

    if not verify_password(req.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials or account is inactive")

    token = _make_student_token(student.id)
    response = JSONResponse(
        content={
            "message": "Login successful",
            "student": {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "email": student.email,
                "phone": student.phone,
            },
        },
        status_code=200,
    )
    is_https = request.url.scheme == "https"
    response.set_cookie(
        "iinm_student_token",
        token,
        max_age=_STUDENT_TOKEN_TTL_SECONDS,
        httponly=True,
        secure=is_https,
        samesite="lax",
        path="/",
    )
    return response

# ══════════════════════════════════════════════════════
#  DEVICE ADMIN PANEL AUTH
# ══════════════════════════════════════════════════════

@app.post("/api/device-admin/login")
async def device_admin_login(req: DeviceAdminLoginSchema, db: Session = Depends(get_db)):
    if not DEVICE_ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Device admin is not configured")
    admin = db.query(DeviceAdminUser).filter(DeviceAdminUser.email == req.email).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _make_device_admin_token()
    return {"token": token, "email": admin.email}

@app.get("/api/device-admin/sessions")
async def device_admin_sessions(
    token: str = Depends(_require_device_admin_token),
    db: Session = Depends(get_db)
):
    sessions = db.query(DeviceSession).order_by(DeviceSession.created_at.desc()).all()
    return [_session_to_dict(s) for s in sessions]

@app.get("/api/device-admin/session-by-token/{device_token_hash}")
async def device_admin_session_by_token(
    device_token_hash: str,
    token: str = Depends(_require_device_admin_token),
    db: Session = Depends(get_db)
):
    """Get full session details by device_token (UUID hash) — used for the detail view page."""
    s = db.query(DeviceSession).filter(DeviceSession.device_token == device_token_hash).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id":               s.id,
        "device_token":     s.device_token,
        "status":           "approved" if s.is_approved else ("rejected" if s.is_rejected else "pending"),
        "requester_name":   s.requester_name,
        "requester_email":  s.requester_email,
        "requester_phone":  s.requester_phone,
        "device_name":      s.device_name,
        "device_model":     s.device_model,
        "location":         s.location,
        "lat":              s.lat,
        "lng":              s.lng,
        "ip_address":       s.ip_address,
        "purpose":          s.purpose,
        "created_at":       s.created_at.isoformat() if s.created_at else None,
        "is_approved":      s.is_approved,
        "is_rejected":      s.is_rejected,
    }

@app.post("/api/device-admin/approve/{session_id}")
async def device_admin_approve(
    session_id: int,
    token: str = Depends(_require_device_admin_token),
    db: Session = Depends(get_db)
):
    s = _get_session_or_404(session_id, db)
    s.is_approved = True
    s.is_rejected = False
    db.commit()
    return {"message": "approved", "id": session_id}

@app.post("/api/device-admin/reject/{session_id}")
async def device_admin_reject(
    session_id: int,
    token: str = Depends(_require_device_admin_token),
    db: Session = Depends(get_db)
):
    s = _get_session_or_404(session_id, db)
    s.is_approved = False
    s.is_rejected = True
    db.commit()
    return {"message": "rejected", "id": session_id}

@app.post("/api/device-admin/revoke/{session_id}")
async def device_admin_revoke(
    session_id: int,
    token: str = Depends(_require_device_admin_token),
    db: Session = Depends(get_db)
):
    s = _get_session_or_404(session_id, db)
    s.is_approved = False
    s.is_rejected = False
    db.commit()
    return {"message": "revoked", "id": session_id}

@app.delete("/api/device-admin/delete/{session_id}")
async def device_admin_delete(
    session_id: int,
    token: str = Depends(_require_device_admin_token),
    db: Session = Depends(get_db)
):
    """Permanently delete a rejected device session."""
    s = _get_session_or_404(session_id, db)
    if not s.is_rejected:
        raise HTTPException(status_code=400, detail="Only rejected sessions can be deleted")
    db.delete(s)
    db.commit()
    return {"message": "deleted", "id": session_id}

# ══════════════════════════════════════════════════════
#  LEGACY / EXISTING ENDPOINTS — NOW PROTECTED
# ══════════════════════════════════════════════════════

@app.get("/api/sessions")
async def get_sessions(
    device: str = Depends(_require_admin_device),
    db: Session = Depends(get_db)
):
    """Protected — requires approved device token in X-Device-Token header."""
    sessions = db.query(DeviceSession).order_by(DeviceSession.created_at.desc()).all()
    return [_session_to_dict(s) for s in sessions]

@app.post("/api/toggle-device/{session_id}")
async def toggle_device(
    session_id: int,
    device: str = Depends(_require_admin_device),
    db: Session = Depends(get_db)
):
    """Protected — requires approved device token in X-Device-Token header."""
    s = _get_session_or_404(session_id, db)
    s.is_approved = not s.is_approved
    if s.is_approved:
        s.is_rejected = False
    db.commit()
    return {"message": "toggled", "is_approved": s.is_approved}

@app.get("/api/me")
async def get_me(
    device: str = Depends(_require_admin_device),
    db: Session = Depends(get_db)
):
    """Protected — requires approved device token in X-Device-Token header."""
    admin = db.query(AdminUser).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {"email": admin.email, "id": admin.id}

# ══════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════

def _get_session_or_404(session_id: int, db: Session) -> DeviceSession:
    s = db.query(DeviceSession).filter(DeviceSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Device session not found")
    return s

def _session_to_dict(s: DeviceSession) -> dict:
    if s.is_approved:
        status = "approved"
    elif s.is_rejected:
        status = "rejected"
    else:
        status = "pending"
    return {
        "id":               s.id,
        "device_token":     s.device_token,
        "requester_name":   s.requester_name,
        "requester_email":  s.requester_email,
        "requester_phone":  s.requester_phone,
        "device_name":      s.device_name,
        "device_model":     s.device_model,
        "lat":              s.lat,
        "lng":              s.lng,
        "location":         s.location or "Unknown",
        "ip_address":       s.ip_address,
        "is_approved":      bool(s.is_approved),
        "is_rejected":      bool(s.is_rejected),
        "status":           status,
        "created_at":       s.created_at.isoformat() if s.created_at else None,
        "updated_at":       s.updated_at.isoformat() if s.updated_at else None,
    }
