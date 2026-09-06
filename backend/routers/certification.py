from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import logging
import os, uuid

from database import get_db
from cache import cache
from models import CertificationPageSettings, R2Settings
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/certification", tags=["certification"])


# ══════════════════════════════════════════════════════
#  R2 UPLOAD HELPER
# ══════════════════════════════════════════════════════

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
        public_url = (r2.public_url or "").rstrip("/")
        return f"{public_url}/{key}" if public_url else key
    except Exception as e:
        logger.warning(f"R2 upload failed for {key}: {e}")
        return None


# ══════════════════════════════════════════════════════
#  SCHEMA
# ══════════════════════════════════════════════════════

class CertificationPageSchema(BaseModel):
    # Hero Section
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_text: Optional[str] = None
    hero_badges_json: Optional[str] = None
    hero_card_rows_json: Optional[str] = None

    # Statutory Accreditations Section
    standards_eyebrow: Optional[str] = None
    standards_title: Optional[str] = None
    standards_desc: Optional[str] = None
    standards_cards_json: Optional[str] = None

    # Scanned Documents Gallery Section
    gallery_eyebrow: Optional[str] = None
    gallery_title: Optional[str] = None
    gallery_desc: Optional[str] = None
    gallery_items_json: Optional[str] = None

    # Academic & Skill Development Partnerships Section
    partners_eyebrow: Optional[str] = None
    partners_title: Optional[str] = None
    partners_desc: Optional[str] = None
    partners_cards_json: Optional[str] = None

    # Online Verification System Section
    verification_eyebrow: Optional[str] = None
    verification_title: Optional[str] = None
    verification_desc: Optional[str] = None
    verification_steps_json: Optional[str] = None
    verification_portal_url: Optional[str] = None

    # CTA Section
    cta_title: Optional[str] = None
    cta_desc: Optional[str] = None
    cta_primary_btn_text: Optional[str] = None
    cta_primary_btn_link: Optional[str] = None
    cta_secondary_btn_text: Optional[str] = None
    cta_secondary_btn_link: Optional[str] = None

    # SEO & AEO
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    canonical_url: Optional[str] = None
    og_image_url: Optional[str] = None
    aeo_faqs_json: Optional[str] = None


# ══════════════════════════════════════════════════════
#  SEED FUNCTION
# ══════════════════════════════════════════════════════

def seed_certification_settings(db: Session) -> CertificationPageSettings:
    existing = db.query(CertificationPageSettings).first()
    if existing:
        return existing

    item = CertificationPageSettings(
        hero_eyebrow="QUALITY STANDARDS & ACCREDITATIONS",
        hero_title="Institutional Certifications",
        hero_subtitle="Verifiable Statutory Recognitions & Quality Framework",
        hero_text="IINM is dedicated to delivering work-oriented, practical vocational education backed by recognized national certifications, statutory trust registrations, and verifiable digital marksheets. Our credentials adhere to strict quality benchmarks accepted across corporate employers and employment exchanges.",
        hero_badges_json=json.dumps([
            "ISO 9001:2015 Certified",
            "MSME Registered (Govt. of India)",
            "Indian Trusts Act, 1882",
            "NITI Aayog Registered"
        ]),
        hero_card_rows_json=json.dumps([
            {"title": "Autonomous Educational Trust", "sub": "Registered under Indian Trusts Act, 1882 for vocational education excellence."},
            {"title": "MSME Registered Enterprise", "sub": "Udyam registration supporting skill incubation and self-employment."},
            {"title": "100% Online Verification", "sub": "Instant digital credential verification accessible to corporate recruiters."}
        ]),
        standards_eyebrow="STATUTORY RECOGNITION",
        standards_title="Accreditations & Quality Certifications",
        standards_desc="Our institutional operations comply with national quality benchmarks and statutory acts to ensure student credentials retain long-term professional validity.",
        standards_cards_json=json.dumps([
            {"badge": "Quality Standard", "title": "ISO 9001:2015", "desc": "Certified Quality Management System ensuring standardized course delivery, syllabus relevance, and rigorous academic evaluation."},
            {"badge": "Legal Constitution", "title": "Indian Trusts Act, 1882", "desc": "Legally constituted autonomous educational trust registered under statutory provisions for social and technical skill advancement."},
            {"badge": "Govt. of India", "title": "MSME Udyam Registration", "desc": "Officially registered under the Ministry of Micro, Small & Medium Enterprises (Govt. of India) fostering youth employability."},
            {"badge": "National Registry", "title": "NITI Aayog (NGO Darpan)", "desc": "Enrolled in the Government of India's NITI Aayog portal, affirming institutional transparency and public compliance."},
            {"badge": "Institutional Ethics", "title": "Central Vigilance Commission", "desc": "Committed to integrity, high ethical governance, anti-corruption standards, and unbiased student grading."}
        ]),
        gallery_eyebrow="OFFICIAL DOCUMENT ARCHIVE",
        gallery_title="Scanned Affiliation & Certification Documents",
        gallery_desc="Inspect our official statutory registrations, quality seals, and governance certificates in high-resolution.",
        gallery_items_json=json.dumps([
            {"badge": "ISO CERTIFICATE", "title": "ISO 9001:2015 Quality Certificate", "authority": "Certified Quality Management System", "image_url": "", "reg_no": "ISO 9001:2015"},
            {"badge": "TRUST DEED", "title": "Deed of Trust Registration", "authority": "Registered under Indian Trusts Act, 1882", "image_url": "", "reg_no": "Autonomous Educational Trust"},
            {"badge": "GOVT. REGISTRATION", "title": "MSME Udyam Registration Certificate", "authority": "Ministry of MSME, Government of India", "image_url": "", "reg_no": "Udyam Portal Registered"},
            {"badge": "GOVT. PORTAL", "title": "NITI Aayog NGO Darpan Certificate", "authority": "NITI Aayog, Government of India", "image_url": "", "reg_no": "NGO Darpan Enrolment"},
            {"badge": "ETHICS PLEDGE", "title": "Central Vigilance Commission Certificate", "authority": "Central Vigilance Commission, India", "image_url": "", "reg_no": "Integrity Pledge Verified"},
            {"badge": "ACADEMIC AFFILIATION", "title": "Vocational Course Affiliation Approval", "authority": "Skill Assessment & Academic Council", "image_url": "", "reg_no": "Vocational Training Authorization"}
        ]),
        partners_eyebrow="COLLABORATION FRAMEWORK",
        partners_title="Academic & Skill Development Partnerships",
        partners_desc="IINM collaborates with recognized awarding bodies and skill assessment councils to enhance the employability and industry acceptance of our learners.",
        partners_cards_json=json.dumps([
            {"title": "National Skill Development Framework", "desc": "Curriculum aligned with industry occupational standards to bridge the gap between classroom theory and real-world workplace tools."},
            {"title": "Vocational Awarding Alignment", "desc": "Certificates and diplomas awarded in partnership with certified assessment boards, certifying genuine competence in computer, IT, and management tracks."},
            {"title": "University Pathway Options", "desc": "Structured credit transfer and higher skill degree (B.Voc / D.Voc) guidance for candidates seeking formal higher qualifications."}
        ]),
        verification_eyebrow="CREDENTIAL INTEGRITY",
        verification_title="3-Step Online Verification Framework",
        verification_desc="Every certificate and marksheet issued by IINM is backed by a secure digital database record, preventing fraudulent duplication and enabling instant employer verification.",
        verification_steps_json=json.dumps([
            {"step": "01", "title": "Scan QR Code", "desc": "Scan the tamper-proof QR code printed on the official certificate to access the encrypted institutional URL directly."},
            {"step": "02", "title": "Enter Roll / Reg. Number", "desc": "Input the unique student enrollment number into the central verification portal to retrieve verified student records."},
            {"step": "03", "title": "Instant Authentication", "desc": "Review candidate details, course name, issue date, grade, and download the authenticated digital validation sheet."}
        ]),
        verification_portal_url="/contact-us",
        cta_title="Validate Your Professional Credentials",
        cta_desc="Empower your resume with ISO 9001:2015 certified, verifiable vocational diplomas recognized across private and corporate sectors.",
        cta_primary_btn_text="Explore Certified Courses",
        cta_primary_btn_link="/courses",
        cta_secondary_btn_text="Contact Admissions",
        cta_secondary_btn_link="/contact-us",
        seo_title="Institutional Certifications & Accreditations | IINM",
        seo_description="Inspect IINM's official certifications, ISO 9001:2015 quality standards, MSME Udyam registration, Indian Trusts Act charter, and scanned credential archive.",
        seo_keywords="IINM certifications, ISO 9001:2015 institute, MSME registered vocational institute, certificate verification, verified diplomas India",
        canonical_url="/certification",
        og_image_url=None,
        aeo_faqs_json=json.dumps([
            {"q": "Are certificates issued by IINM valid for employment in private and corporate sectors?", "a": "Yes, IINM certificates and diplomas are awarded under an ISO 9001:2015 certified quality framework, recognized by private employers, IT firms, and corporate recruiters for skill-based positions."},
            {"q": "How can an employer or recruitment agency verify an IINM certificate?", "a": "Employers can verify certificates instantaneously by scanning the QR code printed on the certificate or entering the candidate's unique registration number in the online verification portal."},
            {"q": "Is IINM registered with the Government of India?", "a": "Yes, IINM is registered under the Ministry of MSME (Govt. of India Udyam portal), registered under the Indian Trusts Act, 1882, and listed in NITI Aayog NGO Darpan."},
            {"q": "Can I view the official registration documents and affiliation letters of IINM?", "a": "Yes, IINM maintains an open scanned document archive on this page displaying high-resolution copies of our ISO certificate, Trust deed, MSME certificate, and statutory affiliation approvals."}
        ]),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# ══════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════

@router.get("/data")
def get_certification_data(db: Session = Depends(get_db)):
    """Public: Get complete certification page data."""
    cached_val = cache.get("certification_page_data")
    if cached_val is not None:
        return cached_val

    s = db.query(CertificationPageSettings).first()
    if not s:
        s = seed_certification_settings(db)

    result = {
        "hero_eyebrow": s.hero_eyebrow,
        "hero_title": s.hero_title,
        "hero_subtitle": s.hero_subtitle,
        "hero_text": s.hero_text,
        "hero_badges_json": s.hero_badges_json,
        "hero_card_rows_json": s.hero_card_rows_json,
        "standards_eyebrow": s.standards_eyebrow,
        "standards_title": s.standards_title,
        "standards_desc": s.standards_desc,
        "standards_cards_json": s.standards_cards_json,
        "gallery_eyebrow": s.gallery_eyebrow,
        "gallery_title": s.gallery_title,
        "gallery_desc": s.gallery_desc,
        "gallery_items_json": s.gallery_items_json,
        "partners_eyebrow": s.partners_eyebrow,
        "partners_title": s.partners_title,
        "partners_desc": s.partners_desc,
        "partners_cards_json": s.partners_cards_json,
        "verification_eyebrow": s.verification_eyebrow,
        "verification_title": s.verification_title,
        "verification_desc": s.verification_desc,
        "verification_steps_json": s.verification_steps_json,
        "verification_portal_url": s.verification_portal_url,
        "cta_title": s.cta_title,
        "cta_desc": s.cta_desc,
        "cta_primary_btn_text": s.cta_primary_btn_text,
        "cta_primary_btn_link": s.cta_primary_btn_link,
        "cta_secondary_btn_text": s.cta_secondary_btn_text,
        "cta_secondary_btn_link": s.cta_secondary_btn_link,
        "seo_title": s.seo_title,
        "seo_description": s.seo_description,
        "seo_keywords": s.seo_keywords,
        "canonical_url": s.canonical_url,
        "og_image_url": rewrite_url(s.og_image_url),
        "aeo_faqs_json": s.aeo_faqs_json,
    }
    cache.set("certification_page_data", result)
    return result


@router.put("/data")
def update_certification_data(
    req: CertificationPageSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Super Admin: Update certification page data."""
    s = db.query(CertificationPageSettings).first()
    if not s:
        s = CertificationPageSettings()
        db.add(s)

    for field, val in req.dict(exclude_unset=True).items():
        if val is not None:
            setattr(s, field, val)

    db.commit()
    cache.invalidate("certification_page_data")
    db.refresh(s)
    return {"message": "Certification page data updated successfully."}


@router.post("/upload-document")
async def upload_certification_document(
    file: UploadFile = File(...),
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Super Admin: Upload scanned certificate or document image."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    content = await file.read()
    filename = f"cert_{uuid.uuid4().hex}{ext}"
    image_url = _try_upload_to_r2(content, f"certifications/{filename}", file.content_type, db)
    if not image_url:
        os.makedirs("uploads/certifications", exist_ok=True)
        filepath = os.path.join("uploads/certifications", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        image_url = f"/uploads/certifications/{filename}"

    return {"url": image_url}
