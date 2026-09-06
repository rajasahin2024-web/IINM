from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os, uuid, json, time
import logging

from database import get_db
from models import SampleCertificatePageSettings, R2Settings
from helpers import rewrite_url
from routers.auth import require_device
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sample-certificate", tags=["sample-certificate"])

UPLOAD_DIR = "uploads/sample_certificates"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Cloudflare R2 helper ──
def _get_r2_client(db: Session):
    try:
        import boto3
        r2 = db.query(R2Settings).first()
        if not r2 or not r2.is_active or not r2.account_id or not r2.secret_access_key or not r2.bucket_name:
            return None, None
        account = (r2.account_id or "").strip()
        if "r2.cloudflarestorage.com" in account:
            endpoint = account if account.startswith("http") else f"https://{account}"
        else:
            endpoint = f"https://{account}.r2.cloudflarestorage.com"

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=r2.access_key_id,
            aws_secret_access_key=r2.secret_access_key,
            region_name="auto",
        )
        return s3, r2
    except Exception:
        return None, None

def _try_upload_to_r2(content: bytes, key: str, content_type: str | None, db: Session) -> str | None:
    try:
        s3, r2 = _get_r2_client(db)
        if not s3 or not r2:
            return None
        ext = key.split(".")[-1].lower() if "." in key else "jpeg"
        ct = content_type or f"image/{ext}"
        s3.put_object(Bucket=r2.bucket_name, Key=key, Body=content, ContentType=ct)
        public_url = (r2.public_url or "https://cdn.iinmedu.com").rstrip("/")
        return f"{public_url}/{key}" if public_url else key
    except Exception as e:
        logger.warning(f"R2 upload failed for {key}: {e}")
        return None

# ── In-memory cache ──
_cache_data = None
_cache_time = 0.0
CACHE_TTL = 60.0  # seconds

def _invalidate_cache():
    global _cache_data, _cache_time
    _cache_data = None
    _cache_time = 0.0

class SampleCertificateUpdateSchema(BaseModel):
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_text: Optional[str] = None
    hero_badges_json: Optional[str] = None
    hero_card_rows_json: Optional[str] = None

    verify_eyebrow: Optional[str] = None
    verify_title: Optional[str] = None
    verify_desc: Optional[str] = None
    verify_portal_url: Optional[str] = None
    verify_steps_json: Optional[str] = None

    gallery_eyebrow: Optional[str] = None
    gallery_title: Optional[str] = None
    gallery_desc: Optional[str] = None
    gallery_categories_json: Optional[str] = None
    sample_certificates_json: Optional[str] = None

    security_eyebrow: Optional[str] = None
    security_title: Optional[str] = None
    security_desc: Optional[str] = None
    security_features_json: Optional[str] = None

    cta_title: Optional[str] = None
    cta_desc: Optional[str] = None
    cta_primary_btn_text: Optional[str] = None
    cta_primary_btn_link: Optional[str] = None
    cta_secondary_btn_text: Optional[str] = None
    cta_secondary_btn_link: Optional[str] = None

    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    canonical_url: Optional[str] = None
    og_image_url: Optional[str] = None
    aeo_faqs_json: Optional[str] = None


def _to_dict(rec: SampleCertificatePageSettings) -> dict:
    return {
        "id": rec.id,
        "hero_eyebrow": rec.hero_eyebrow,
        "hero_title": rec.hero_title,
        "hero_subtitle": rec.hero_subtitle,
        "hero_text": rec.hero_text,
        "hero_badges_json": rec.hero_badges_json,
        "hero_card_rows_json": rec.hero_card_rows_json,

        "verify_eyebrow": rec.verify_eyebrow,
        "verify_title": rec.verify_title,
        "verify_desc": rec.verify_desc,
        "verify_portal_url": rec.verify_portal_url,
        "verify_steps_json": rec.verify_steps_json,

        "gallery_eyebrow": rec.gallery_eyebrow,
        "gallery_title": rec.gallery_title,
        "gallery_desc": rec.gallery_desc,
        "gallery_categories_json": rec.gallery_categories_json,
        "sample_certificates_json": rec.sample_certificates_json,

        "security_eyebrow": rec.security_eyebrow,
        "security_title": rec.security_title,
        "security_desc": rec.security_desc,
        "security_features_json": rec.security_features_json,

        "cta_title": rec.cta_title,
        "cta_desc": rec.cta_desc,
        "cta_primary_btn_text": rec.cta_primary_btn_text,
        "cta_primary_btn_link": rec.cta_primary_btn_link,
        "cta_secondary_btn_text": rec.cta_secondary_btn_text,
        "cta_secondary_btn_link": rec.cta_secondary_btn_link,

        "seo_title": rec.seo_title,
        "seo_description": rec.seo_description,
        "seo_keywords": rec.seo_keywords,
        "canonical_url": rec.canonical_url,
        "og_image_url": rec.og_image_url,
        "aeo_faqs_json": rec.aeo_faqs_json,
        "updated_at": str(rec.updated_at) if rec.updated_at else None,
    }


def seed_default_sample_certificate(db: Session) -> SampleCertificatePageSettings:
    default_hero_badges = [
        "Encrypted QR Code Verification",
        "ISO 9001:2015 Quality Framework",
        "Unique Serial & Central Database Record",
        "Accepted by Global Tech Recruiters",
    ]

    default_hero_card_rows = [
        {"title": "Institutional Award Seal", "sub": "Embossed golden crest with tamper-proof security pattern."},
        {"title": "Direct Employer Verification", "sub": "Recruiters can verify authenticity in seconds via QR scan or Reg ID."},
        {"title": "Curriculum Competency Transcript", "sub": "Accompanied by verifiable grade cards & capstone project repository."},
    ]

    default_verify_steps = [
        {"step": "01", "title": "Locate Credential ID", "desc": "Find the unique certificate serial number (e.g., IINM-AIML-2026-9842) printed at the bottom."},
        {"step": "02", "title": "Scan QR Code or Enter ID", "desc": "Scan the tamper-resistant QR code with your smartphone camera or enter the ID in our portal."},
        {"step": "03", "title": "Instant Live Verification", "desc": "The central verification engine renders student details, issue date, grade honors, and digital validity in real time."},
    ]

    default_categories = [
        "All Certificates",
        "AI & Machine Learning",
        "Cloud & Software Engineering",
        "Data Science & Analytics",
        "Cyber Security",
    ]

    default_sample_certificates = [
        {
            "id": "sc-1",
            "course_name": "Post Graduate Diploma in Artificial Intelligence & Machine Learning",
            "short_code": "PGD-AIML",
            "category": "AI & Machine Learning",
            "level": "Post Graduate Diploma",
            "duration": "1 Year Intensive",
            "reg_no_sample": "IINM-AIML-2026-9842",
            "image_url": "https://cdn.iinmedu.com/sample-certificates/iinm_pgd_ai_ml_sample_certificate.jpg",
            "description": "Awarded upon successful completion of core transformer architectures, LLM fine-tuning, computer vision, and deep reinforcement learning capstone defenses.",
            "skills_covered": ["Transformers & LLMs", "PyTorch Deep Learning", "Computer Vision", "MLOps Pipelines", "Neural Architectures"],
            "is_visible": True,
            "order_index": 1,
        },
    ]

    default_security_features = [
        {"title": "Encrypted Dynamic QR Code", "desc": "Each certificate carries a cryptographically verifiable QR code pointing directly to the student's immutable institutional record."},
        {"title": "Central Database Registration ID", "desc": "Indexed under an unalterable alphanumeric serial number verified by HR recruitment desks and overseas credential evaluators."},
        {"title": "ISO 9001:2015 Quality Assurance", "desc": "Program curricula, lab evaluation standards, and graduation criteria operate under audited ISO educational management protocols."},
        {"title": "Dual Executive Signatures", "desc": "Countersigned by the Academic Director and Controller of Examinations with high-resolution anti-tamper vector linework."},
        {"title": "Anti-Counterfeit Guilloche Border", "desc": "High-density mathematical guilloche patterns and textured security backgrounds engineered to prevent unauthorized scanning or duplication."},
        {"title": "Integrated Portfolio Repository", "desc": "Recruiters scanning the certificate receive verified links to the student's evaluated GitHub capstone code and live project deployments."},
    ]

    default_faqs = [
        {
            "q": "How can an employer or recruitment agency verify an IINM certificate?",
            "a": "Employers can verify any IINM certificate in seconds by scanning the tamper-proof QR code printed on the certificate or entering the candidate's unique registration number in our official Verification Portal.",
        },
        {
            "q": "Are sample certificates identical to the final certificate issued to students?",
            "a": "Yes. The sample certificates shown on this page demonstrate the exact layout, paper security Guilloche patterning, golden seal, dual signatures, and QR code verification structure of the physical and digital credentials awarded upon graduation.",
        },
        {
            "q": "Do I receive both physical hardcopy and verifiable digital e-certificates?",
            "a": "Yes. All graduates receive a high-resolution, cryptographically signed digital e-certificate for LinkedIn and digital portfolios, as well as a framed physical parchment certificate with embossed seal awarded during commencement.",
        },
        {
            "q": "Can I request an official transcript along with my course certificate?",
            "a": "Yes. Every course certificate is backed by an official institutional mark sheet and capstone project performance evaluation, which can be downloaded directly from the student portal or requested by prospective employers.",
        },
        {
            "q": "What should I do if my certificate serial number does not show up in verification?",
            "a": "In the rare event of a database indexing delay or typographical mismatch, candidates and recruiters can contact our Academic Verification Office at verification@iinmedu.com for immediate manual verification within 24 hours.",
        },
    ]

    record = SampleCertificatePageSettings(
        hero_eyebrow="OFFICIAL CREDENTIALS & ACADEMIC INTEGRITY",
        hero_title="Sample Course Certificates & Verified Credentials",
        hero_subtitle="Industry-Standard Diplomas Backed by Central Online Verification & ISO 9001:2015 Standards",
        hero_text="Explore authentic sample certificates awarded across our flagship artificial intelligence, cloud architecture, data science, and cyber security programs. Every certificate represents rigorous project defense, verified competency, and instant employer verification.",
        hero_badges_json=json.dumps(default_hero_badges),
        hero_card_rows_json=json.dumps(default_hero_card_rows),

        verify_eyebrow="AUTHENTICATION GATEWAY",
        verify_title="Verify Any IINM Certificate in Real Time",
        verify_desc="Recruiters, HR departments, and educational institutions can verify the authenticity of any IINM credential within seconds. Our tamper-proof digital registry guarantees complete academic integrity.",
        verify_portal_url="/certification#verification",
        verify_steps_json=json.dumps(default_verify_steps),

        gallery_eyebrow="OFFICIAL CREDENTIAL SPECIMEN",
        gallery_title="Explore Official Sample Certificate",
        gallery_desc="Inspect our official specimen credential awarded upon graduation. Engineered with high-resolution typography, anti-counterfeit Guilloche borders, and instant digital QR verification.",
        gallery_categories_json=json.dumps(default_categories),
        sample_certificates_json=json.dumps(default_sample_certificates),

        security_eyebrow="CREDENTIAL DEFENSE & SECURITY",
        security_title="6 Tamper-Proof Security Features Built into Every Certificate",
        security_desc="We engineer our certificates to exceed corporate and multinational verification standards, ensuring your hard-earned credentials can never be forged or misattributed.",
        security_features_json=json.dumps(default_security_features),

        cta_title="Ready to Earn Your Industry-Recognized Credential?",
        cta_desc="Join our elite technical cohorts, build production-grade projects, and earn credentials trusted by leading technology firms across India and abroad.",
        cta_primary_btn_text="Explore Certified Courses",
        cta_primary_btn_link="/courses",
        cta_secondary_btn_text="Access Verification Portal",
        cta_secondary_btn_link="/certification#verification",

        seo_title="Sample Certificates & Verified Diplomas | Indian Institute of New Media",
        seo_description="Inspect official sample certificates awarded by IINM for AI, Full Stack Cloud Engineering, Data Science, and Cyber Security. 100% verified online with tamper-proof QR codes.",
        seo_keywords="IINM sample certificate, verified diploma, certificate verification portal, AI course certificate, cloud engineering diploma, ISO 9001:2015 institute",
        canonical_url="https://iinmedu.com/sample-certificate",
        og_image_url="https://cdn.iinmedu.com/sample-certificates/iinm_pgd_ai_ml_sample_certificate.jpg",
        aeo_faqs_json=json.dumps(default_faqs),
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Public: Get Page Data (Cached) ──
@router.get("/data")
def get_sample_certificate_data(db: Session = Depends(get_db)):
    global _cache_data, _cache_time
    now = time.time()
    if _cache_data and (now - _cache_time < CACHE_TTL):
        return _cache_data

    rec = db.query(SampleCertificatePageSettings).first()
    if not rec:
        rec = seed_default_sample_certificate(db)

    data = _to_dict(rec)
    _cache_data = data
    _cache_time = now
    return data


# ── Super Admin: Update Page Data ──
@router.put("/data", dependencies=[Depends(require_device)])
def update_sample_certificate_data(
    payload: SampleCertificateUpdateSchema,
    db: Session = Depends(get_db),
):
    record = db.query(SampleCertificatePageSettings).first()
    if not record:
        record = seed_default_sample_certificate(db)

    update_fields = payload.model_dump(exclude_unset=True)
    for field, val in update_fields.items():
        if val is not None:
            setattr(record, field, val)

    db.commit()
    db.refresh(record)
    _invalidate_cache()
    return _to_dict(record)


# ── Super Admin: Upload Sample Certificate Image ──
@router.post("/upload-certificate", dependencies=[Depends(require_device)])
async def upload_sample_certificate(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    fname = f"cert_{uuid.uuid4().hex[:10]}{ext}"
    content = await file.read()

    # Upload to Cloudflare R2 bucket first
    r2_url = _try_upload_to_r2(content, f"sample-certificates/{fname}", file.content_type, db)
    if r2_url:
        _invalidate_cache()
        return {"url": r2_url}

    # Local fallback
    dest_path = os.path.join(UPLOAD_DIR, fname)
    with open(dest_path, "wb") as f:
        f.write(content)

    _invalidate_cache()
    return {"url": f"/uploads/sample_certificates/{fname}"}
