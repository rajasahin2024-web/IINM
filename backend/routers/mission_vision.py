from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import logging
import os, uuid

from database import get_db
from cache import cache
from models import MissionVisionSettings, R2Settings
from routers.auth import require_device
from helpers import rewrite_url
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mission-vision", tags=["mission-vision"])


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

class MissionVisionSchema(BaseModel):
    # Hero Section
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_text: Optional[str] = None
    hero_stats_json: Optional[str] = None
    hero_credentials_json: Optional[str] = None

    # Statutory Accreditations Section
    trust_eyebrow: Optional[str] = None
    trust_title: Optional[str] = None
    trust_desc: Optional[str] = None
    trust_cards_json: Optional[str] = None

    # Pillars Section
    pillars_eyebrow: Optional[str] = None
    pillars_title: Optional[str] = None
    pillars_desc: Optional[str] = None
    mission_tag: Optional[str] = None
    mission_title: Optional[str] = None
    mission_statement: Optional[str] = None
    mission_points_json: Optional[str] = None
    vision_tag: Optional[str] = None
    vision_title: Optional[str] = None
    vision_statement: Optional[str] = None
    vision_points_json: Optional[str] = None

    # Strategic Objectives Section
    objectives_eyebrow: Optional[str] = None
    objectives_title: Optional[str] = None
    objectives_desc: Optional[str] = None
    objectives_cards_json: Optional[str] = None

    # Core Values & Leadership Section
    values_eyebrow: Optional[str] = None
    values_title: Optional[str] = None
    values_desc: Optional[str] = None
    values_cards_json: Optional[str] = None
    director_quote: Optional[str] = None
    director_name: Optional[str] = None
    director_title: Optional[str] = None
    director_image_url: Optional[str] = None

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

def seed_mission_vision_settings(db: Session) -> MissionVisionSettings:
    existing = db.query(MissionVisionSettings).first()
    if existing:
        return existing

    item = MissionVisionSettings(
        hero_eyebrow="INSTITUTIONAL MANDATE",
        hero_title="Our Mission & Vision",
        hero_text="IINM is dedicated to delivering work-oriented, practical education designed to enhance student employability and foster self-employment. Guided by national quality standards and industry-aligned curricula, we empower learners across India to build sustainable careers.",
        hero_stats_json=json.dumps([
            "ISO 9001:2015 Certified",
            "MSME Registered (Govt. of India)",
            "Registered Under Indian Trusts Act",
            "10,000+ Students Trained"
        ]),
        hero_credentials_json=json.dumps([
            {"title": "Autonomous Educational Trust", "sub": "Registered under the Indian Trusts Act, 1882 for societal skill development."},
            {"title": "Government MSME Enterprise", "sub": "Fostering micro-enterprises, vocational competence, and youth employment."},
            {"title": "Verifiable Digital Credentials", "sub": "Central database verification recognized across employment exchanges and private recruiters."}
        ]),
        trust_eyebrow="STATUTORY RECOGNITION",
        trust_title="Certifications, Registration & Trust Framework",
        trust_desc="Our institutional operations adhere to verified government and statutory standards, providing students with recognized credentials accepted across private sectors and employment exchanges.",
        trust_cards_json=json.dumps([
            {"badge": "Quality Standard", "title": "ISO 9001:2015", "desc": "Certified Quality Management System ensuring consistent academic delivery, verified course materials, and institutional accountability."},
            {"badge": "Govt. Enterprise", "title": "MSME Registered", "desc": "Officially registered under the Ministry of Micro, Small & Medium Enterprises, Government of India, supporting entrepreneurship and skill development."},
            {"badge": "Legal Constitution", "title": "Indian Trusts Act, 1882", "desc": "Governed under statutory trust regulations as an autonomous vocational and educational institute dedicated to societal skill advancement."},
            {"badge": "Verification System", "title": "Online Credential Verification", "desc": "Centrally managed digital records enabling instantaneous online verification of certificates and marksheets for employers and institutions."}
        ]),
        pillars_eyebrow="FOUNDATIONAL PILLARS",
        pillars_title="Our Mission & Vision",
        pillars_desc="A clear, dual-focus charter that defines how we operate today and the long-term impact we are building for tomorrow.",
        mission_tag="OUR DAILY MISSION",
        mission_title="Mission of IINM",
        mission_statement="To provide market-oriented vocational and modern technical education at accessible charges to students across urban and rural sectors. We are dedicated to supporting middle-class and underserved youth who seek high-value skill development, equipping them with practical industry capabilities, entrepreneurial confidence, and self-employment opportunities.",
        mission_points_json=json.dumps([
            {"title": "Economical Education", "desc": "Offering career-oriented courses at accessible fees for middle-class and rural candidates."},
            {"title": "Practical Mentorship", "desc": "Qualified instructors delivering market-standard study materials and practical competencies."},
            {"title": "Self-Employment Support", "desc": "Assisting learners to establish independent freelance work, micro-enterprises, or corporate jobs."}
        ]),
        vision_tag="OUR STRATEGIC HORIZON",
        vision_title="Vision of IINM",
        vision_statement="To establish IINM as a premier national institution for vocational training, digital intelligence, and career transformation. We envision a future where every learner bridges the gap between formal education and real-world employment, fostering a skilled workforce recognized both nationally and globally.",
        vision_points_json=json.dumps([
            {"title": "National Excellence", "desc": "Setting high educational benchmarks in vocational, computer, and applied technical training."},
            {"title": "Industry Recognition", "desc": "Expanding academic and corporate collaborations so every qualification carries direct hiring value."},
            {"title": "Wide Economic Reach", "desc": "Empowering individuals in emerging towns and villages to participate meaningfully in the national economy."}
        ]),
        objectives_eyebrow="STRATEGIC FOCUS",
        objectives_title="Major Objectives of IINM",
        objectives_desc="Our core objective is to generate self-employment and employability opportunities among students, youth, women, and diverse communities through structured skill-building.",
        objectives_cards_json=json.dumps([
            {"num": "01", "category": "AWARENESS", "title": "Self-Employment Awareness", "desc": "Creating widespread awareness regarding self-employment avenues and building the self-confidence necessary for independent enterprise."},
            {"num": "02", "category": "JOB POTENTIAL", "title": "Enhanced Employability", "desc": "Upgrading job potential and vocational capabilities to help students secure respectable positions in private, corporate, and undertaking sectors."},
            {"num": "03", "category": "DIGITAL LITERACY", "title": "Computer & Technical Fluency", "desc": "Imparting solid computer education, digital literacy, and professional communication skills tailored to the current modern workplace."},
            {"num": "04", "category": "GOVT. SCHEMES", "title": "Government Initiatives Awareness", "desc": "Informing candidates about available government entrepreneurship schemes, microfinance options, and vocational assistance programs."},
            {"num": "05", "category": "QUALITY MATERIALS", "title": "Industry-Standard Curriculum", "desc": "Providing comprehensive, market-calibrated study materials and practical laboratory sessions covering realistic industry scenarios."},
            {"num": "06", "category": "RECOGNITION", "title": "Verified Certifications", "desc": "Awarding Certificate and Diploma credentials with online registration, accepted across employment exchanges and corporate recruitment."}
        ]),
        values_eyebrow="INSTITUTIONAL PRINCIPLES",
        values_title="Core Values & Academic Leadership",
        values_desc="The operating standards that steer our curriculum development, teaching methodology, and institutional governance.",
        values_cards_json=json.dumps([
            {"title": "Practical Competence", "desc": "Focusing on hands-on project work and real-world tools rather than passive theoretical lectures."},
            {"title": "Democratized Access", "desc": "Maintaining affordable fee structures so every student from urban and rural communities can access quality training."},
            {"title": "Institutional Integrity", "desc": "Upholding statutory compliance, transparent evaluation, and genuine verifiable certification standards."},
            {"title": "Market Relevance", "desc": "Continuously updating our syllabus to align with actual recruitment demands in private and corporate sectors."}
        ]),
        director_quote="A meaningful education must translate directly into self-reliance and dignity. At IINM, our curriculum is engineered not merely to award certificates, but to build tangible skills that empower students to secure respectable employment or establish independent enterprises.",
        director_name="Academic Advisory Council",
        director_title="Governing Board of IINM",
        director_image_url=None,
        cta_title="Take the Next Step in Your Career",
        cta_desc="Explore our job-oriented vocational and technical programs, or speak directly with our counseling advisors.",
        cta_primary_btn_text="Explore Courses",
        cta_primary_btn_link="/courses",
        cta_secondary_btn_text="Contact Admissions",
        cta_secondary_btn_link="/contact-us",
        seo_title="Our Mission & Vision | IINM",
        seo_description="Discover IINM's strategic institutional mission, future vision, statutory accreditations (ISO 9001:2015, MSME), and our 6-pillar objective to empower students with job-ready vocational and technology education.",
        seo_keywords="IINM mission, IINM vision, vocational education India, ISO 9001:2015 institute, MSME skill courses, self employment training",
        canonical_url="/mission-vision",
        og_image_url=None,
        aeo_faqs_json=json.dumps([
            {"q": "What is the primary mission of IINM?", "a": "IINM's mission is to provide market-oriented vocational and technology education at economical charges to urban and rural students, fostering self-employment and career employability."},
            {"q": "Is IINM recognized and certified?", "a": "Yes, IINM operates with an ISO 9001:2015 Certified Quality Management System, is registered under the Ministry of MSME (Govt. of India), and is registered under the Indian Trusts Act, 1882."},
            {"q": "How does IINM help students achieve self-employment?", "a": "IINM combines an 80% practical hands-on curriculum with entrepreneurial training, government scheme awareness, and recognized verifiable credentials."},
            {"q": "Can certificates issued by IINM be verified online?", "a": "Yes, all certificates and marksheets issued by IINM can be verified online through the central institutional verification portal."}
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
def get_mission_vision_data(db: Session = Depends(get_db)):
    """Public: Get complete mission and vision page data."""
    cached_val = cache.get("mission_vision_data")
    if cached_val is not None:
        return cached_val

    s = db.query(MissionVisionSettings).first()
    if not s:
        s = seed_mission_vision_settings(db)

    result = {
        "hero_eyebrow": s.hero_eyebrow,
        "hero_title": s.hero_title,
        "hero_text": s.hero_text,
        "hero_stats_json": s.hero_stats_json,
        "hero_credentials_json": s.hero_credentials_json,
        "trust_eyebrow": s.trust_eyebrow,
        "trust_title": s.trust_title,
        "trust_desc": s.trust_desc,
        "trust_cards_json": s.trust_cards_json,
        "pillars_eyebrow": s.pillars_eyebrow,
        "pillars_title": s.pillars_title,
        "pillars_desc": s.pillars_desc,
        "mission_tag": s.mission_tag,
        "mission_title": s.mission_title,
        "mission_statement": s.mission_statement,
        "mission_points_json": s.mission_points_json,
        "vision_tag": s.vision_tag,
        "vision_title": s.vision_title,
        "vision_statement": s.vision_statement,
        "vision_points_json": s.vision_points_json,
        "objectives_eyebrow": s.objectives_eyebrow,
        "objectives_title": s.objectives_title,
        "objectives_desc": s.objectives_desc,
        "objectives_cards_json": s.objectives_cards_json,
        "values_eyebrow": s.values_eyebrow,
        "values_title": s.values_title,
        "values_desc": s.values_desc,
        "values_cards_json": s.values_cards_json,
        "director_quote": s.director_quote,
        "director_name": s.director_name,
        "director_title": s.director_title,
        "director_image_url": rewrite_url(s.director_image_url),
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
    cache.set("mission_vision_data", result)
    return result


@router.put("/data")
def update_mission_vision_data(
    req: MissionVisionSchema,
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: Update mission vision page data."""
    s = db.query(MissionVisionSettings).first()
    if not s:
        s = MissionVisionSettings()
        db.add(s)

    for field, val in req.dict(exclude_unset=True).items():
        if val is not None:
            setattr(s, field, val)

    db.commit()
    cache.invalidate("mission_vision_data")
    db.refresh(s)
    return {"message": "Mission & Vision data updated successfully."}


@router.post("/upload-image")
async def upload_mission_vision_image(
    file: UploadFile = File(...),
    device: str = Depends(require_device),
    db: Session = Depends(get_db),
):
    """Admin: Upload an image (e.g. director photo or badge) to R2 or local storage."""
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    content = await file.read()
    filename = f"mv_{uuid.uuid4().hex}{ext}"
    image_url = _try_upload_to_r2(content, f"mission-vision/{filename}", file.content_type, db)
    if not image_url:
        os.makedirs("uploads/mission-vision", exist_ok=True)
        filepath = os.path.join("uploads/mission-vision", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        image_url = f"/uploads/mission-vision/{filename}"

    return {"url": image_url}
