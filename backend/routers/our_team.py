from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os, uuid, json, time

from database import get_db
from models import OurTeamPageSettings, R2Settings
from helpers import rewrite_url
from routers.auth import require_device
from security import validate_upload, ALLOWED_IMAGE_EXTENSIONS
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/our-team", tags=["our-team"])

UPLOAD_DIR = "uploads/team"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

class OurTeamUpdateSchema(BaseModel):
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_text: Optional[str] = None
    hero_badges_json: Optional[str] = None
    hero_card_rows_json: Optional[str] = None

    executive_eyebrow: Optional[str] = None
    executive_title: Optional[str] = None
    executive_desc: Optional[str] = None
    executive_cards_json: Optional[str] = None

    team_eyebrow: Optional[str] = None
    team_title: Optional[str] = None
    team_desc: Optional[str] = None
    team_categories_json: Optional[str] = None
    team_members_json: Optional[str] = None

    affiliations_eyebrow: Optional[str] = None
    affiliations_title: Optional[str] = None
    affiliations_desc: Optional[str] = None
    affiliations_logos_json: Optional[str] = None

    framework_eyebrow: Optional[str] = None
    framework_title: Optional[str] = None
    framework_desc: Optional[str] = None
    framework_cards_json: Optional[str] = None

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


def seed_default_our_team(db: Session) -> OurTeamPageSettings:
    """Pre-seed database with authentic institutional faculty and team profiles."""
    default_hero_badges = [
        "15:1 Student-Mentor Ratio",
        "Ex-IIT & Tech Veterans",
        "100% 1-on-1 Capstone Guidance",
        "50+ Industry Mentors"
    ]

    default_hero_card_rows = [
        {
            "title": "Academic Rigour Meets Industry Insight",
            "sub": "Faculty members bring an average of 12+ years across premier research institutes and tier-1 tech firms."
        },
        {
            "title": "Dedicated 1-on-1 Capstone Guidance",
            "sub": "Every student is paired with a domain mentor for real-world architecture, code reviews, and thesis defense."
        },
        {
            "title": "Continuous Curriculum Evolution",
            "sub": "Academic council reviews syllabi quarterly with advisory leaders from Microsoft, TCS, and Google."
        }
    ]

    default_executive_cards = [
        {
            "role": "Academic Director & Board Chair",
            "name": "Prof. Dr. Anil Sharma",
            "degrees": "Ph.D. (IIT Kharagpur), M.Tech (IISc)",
            "bio": "Over 24 years of distinguished leadership across premier higher education and applied artificial intelligence research. Former scientific advisor and visiting chair at international computer science congresses.",
            "quote": "Our objective is simple: bridge the profound canyon between textbook academic theory and the mission-critical code deployed in modern AI enterprises.",
            "image_url": "/uploads/team/director_anil_sharma.jpg",
            "experience_badge": "24+ Yrs Academic Leadership",
            "linkedin_url": "https://linkedin.com",
            "email": "director@iinmedu.com"
        },
        {
            "role": "Dean of Applied AI & Research",
            "name": "Prof. Dr. Priyanka Sen",
            "degrees": "Ph.D. (Jadavpur Univ), Post-Doc (AI Labs)",
            "bio": "Pioneering researcher in natural language processing, transformer architectures, and computer vision. Has authored 40+ peer-reviewed papers and mentored over 1,200 tech practitioners across India.",
            "quote": "True machine intelligence isn't learned by watching tutorials—it's forged when students debug real tensor graphs and optimize loss functions under mentor guidance.",
            "image_url": "/uploads/team/prof_priyanka_sen.jpg",
            "experience_badge": "Ex-Head of AI Research",
            "linkedin_url": "https://linkedin.com",
            "email": "priyanka.sen@iinmedu.com"
        }
    ]

    default_team_categories = [
        "All Members",
        "Executive Council",
        "AI & Machine Learning",
        "Cloud & Data Engineering",
        "Industry Mentors"
    ]

    default_team_members = [
        {
            "id": "tm-1",
            "name": "Prof. Dr. Anil Sharma",
            "designation": "Academic Director & Distinguished Professor",
            "category": "Executive Council",
            "specialty": "Cognitive Computing & Academic Governance",
            "experience_badge": "Ph.D. IIT Kharagpur • 24+ Yrs",
            "bio": "Oversees curriculum excellence, institutional accreditation standards, and research partnerships with national technology initiatives.",
            "image_url": "/uploads/team/director_anil_sharma.jpg",
            "linkedin_url": "https://linkedin.com",
            "email": "director@iinmedu.com",
            "is_visible": True,
            "order_index": 1
        },
        {
            "id": "tm-2",
            "name": "Prof. Dr. Priyanka Sen",
            "designation": "Head of Department, Artificial Intelligence",
            "category": "AI & Machine Learning",
            "specialty": "Large Language Models & Neural Architectures",
            "experience_badge": "40+ IEEE/ACM Papers • 16 Yrs Exp",
            "bio": "Leads the core AI fellowship, guiding capstone projects in generative transformers, reinforcement learning, and production neural models.",
            "image_url": "/uploads/team/prof_priyanka_sen.jpg",
            "linkedin_url": "https://linkedin.com",
            "email": "priyanka.sen@iinmedu.com",
            "is_visible": True,
            "order_index": 2
        },
        {
            "id": "tm-3",
            "name": "Vikram Singh",
            "designation": "Principal Cloud Architect & Lead Mentor",
            "category": "Cloud & Data Engineering",
            "specialty": "Distributed Systems & Kubernetes Infrastructure",
            "experience_badge": "Ex-TCS Innovation • AWS Certified",
            "bio": "Mentors students in multi-cloud scalability, microservices resilience, CI/CD automated deployment, and high-concurrency database pipelines.",
            "image_url": "/uploads/team/mentor_vikram_singh.jpg",
            "linkedin_url": "https://linkedin.com",
            "email": "vikram.singh@iinmedu.com",
            "is_visible": True,
            "order_index": 3
        },
        {
            "id": "tm-4",
            "name": "Sneha Mukherjee",
            "designation": "Senior Data Scientist & Capstone Lead",
            "category": "AI & Machine Learning",
            "specialty": "Applied Predictive Analytics & MLOps",
            "experience_badge": "Ex-FinTech Lead • 11 Yrs Industry",
            "bio": "Conducts intensive laboratory workshops in feature store engineering, model drift monitoring, data streaming pipelines, and automated MLOps.",
            "image_url": "/uploads/team/mentor_sneha_mukherjee.jpg",
            "linkedin_url": "https://linkedin.com",
            "email": "sneha.mukherjee@iinmedu.com",
            "is_visible": True,
            "order_index": 4
        }
    ]

    default_affiliations_logos = [
        {"id": "aff-1", "name": "IIT Kharagpur", "tag": "Research Alumni"},
        {"id": "aff-2", "name": "IIM Calcutta", "tag": "Management Fellow"},
        {"id": "aff-3", "name": "Microsoft", "tag": "Industry Advisory"},
        {"id": "aff-4", "name": "TCS Research", "tag": "Innovation Partner"},
        {"id": "aff-5", "name": "ISRO Affiliated", "tag": "Applied Robotics"},
        {"id": "aff-6", "name": "Amazon Web Services", "tag": "Cloud Mentorship"}
    ]

    default_framework_cards = [
        {
            "title": "Practitioner-Led Pedagogy",
            "desc": "Instructors are active researchers and industry practitioners who test their skills daily in real production environments."
        },
        {
            "title": "Rigorous Capstone Thesis Defense",
            "desc": "Every learner completes a verified industrial project evaluated by both internal faculty and external corporate examiners."
        },
        {
            "title": "Ethical & Responsible AI Standards",
            "desc": "Our educators place integrity, algorithmic fairness, and data privacy at the core of all advanced computational training."
        }
    ]

    default_aeo_faqs = [
        {
            "q": "What qualifications do IINM faculty members hold?",
            "a": "IINM faculty members hold advanced postgraduate and doctoral degrees (Ph.D., M.Tech) from premier institutions including IITs, IISc, and state universities, complemented by at least 8 to 15+ years of practical corporate experience."
        },
        {
            "q": "Do students receive 1-on-1 mentorship at IINM?",
            "a": "Yes. Every enrolled student is assigned a dedicated faculty mentor and industry practitioner who conducts weekly 1-on-1 code reviews, architectural discussions, and career guidance."
        },
        {
            "q": "How can an experienced technologist apply to become an IINM mentor?",
            "a": "Industry experts with 7+ years in machine learning, cloud architecture, or data engineering can apply via our faculty portal or contact admissions at mentor@iinmedu.com."
        }
    ]

    record = OurTeamPageSettings(
        hero_eyebrow="INSTITUTIONAL FACULTY & LEADERSHIP",
        hero_title="The Minds Shaping Tomorrow's Tech Leaders",
        hero_subtitle="Distinguished researchers, academic scholars, and veteran industry architects united by a single vision: elevating technological education to international excellence.",
        hero_text="At IINM, education transcends passive lectures. Our faculty members bring battle-tested industrial acumen and rigorous academic methodology directly into every workshop, laboratory session, and capstone project.",
        hero_badges_json=json.dumps(default_hero_badges),
        hero_card_rows_json=json.dumps(default_hero_card_rows),

        executive_eyebrow="GOVERNING BODY & DEANS",
        executive_title="Executive Leadership & Academic Council",
        executive_desc="Guiding institutional vision, maintaining statutory curriculum rigor, and nurturing an environment of relentless intellectual discovery.",
        executive_cards_json=json.dumps(default_executive_cards),

        team_eyebrow="FACULTY & INDUSTRY PRACTITIONERS",
        team_title="Meet Our Academic Mentors",
        team_desc="Explore our dedicated team of professors, researchers, and tech mentors who guide students through rigorous curriculum and industrial projects.",
        team_categories_json=json.dumps(default_team_categories),
        team_members_json=json.dumps(default_team_members),

        affiliations_eyebrow="INSTITUTIONAL PEDIGREE",
        affiliations_title="Where Our Faculty & Advisory Board Come From",
        affiliations_desc="Our educators and guest mentors draw foundational experience from leading national research institutions and premier technology enterprises.",
        affiliations_logos_json=json.dumps(default_affiliations_logos),

        framework_eyebrow="OUR PEDAGOGICAL PHILOSOPHY",
        framework_title="How Our Mentorship Architecture Works",
        framework_desc="A three-pillar instructional model ensuring theoretical depth translates into tangible career competence.",
        framework_cards_json=json.dumps(default_framework_cards),

        cta_title="Ready to Learn from Industry Masters?",
        cta_desc="Join comprehensive certified programs designed and delivered by India's top academic and industry technology leaders.",
        cta_primary_btn_text="Explore Faculty-Led Courses",
        cta_primary_btn_link="/courses",
        cta_secondary_btn_text="Apply as an Industry Mentor",
        cta_secondary_btn_link="/contact-us",

        seo_title="Our Team & Faculty | Indian Institute of New Media",
        seo_description="Meet the distinguished academic faculty, AI researchers, and veteran industry mentors driving technical education and capstone excellence at IINM.",
        seo_keywords="IINM Faculty, Tech Mentors, AI Professors, Computer Science Faculty India, Industry Mentors Kolkata, Educational Leadership",
        canonical_url="https://iinmedu.com/our-team",
        og_image_url="/uploads/team/director_anil_sharma.jpg",
        aeo_faqs_json=json.dumps(default_aeo_faqs)
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _to_dict(rec: OurTeamPageSettings) -> dict:
    return {
        "hero_eyebrow": rec.hero_eyebrow,
        "hero_title": rec.hero_title,
        "hero_subtitle": rec.hero_subtitle,
        "hero_text": rec.hero_text,
        "hero_badges_json": rec.hero_badges_json,
        "hero_card_rows_json": rec.hero_card_rows_json,

        "executive_eyebrow": rec.executive_eyebrow,
        "executive_title": rec.executive_title,
        "executive_desc": rec.executive_desc,
        "executive_cards_json": rec.executive_cards_json,

        "team_eyebrow": rec.team_eyebrow,
        "team_title": rec.team_title,
        "team_desc": rec.team_desc,
        "team_categories_json": rec.team_categories_json,
        "team_members_json": rec.team_members_json,

        "affiliations_eyebrow": rec.affiliations_eyebrow,
        "affiliations_title": rec.affiliations_title,
        "affiliations_desc": rec.affiliations_desc,
        "affiliations_logos_json": rec.affiliations_logos_json,

        "framework_eyebrow": rec.framework_eyebrow,
        "framework_title": rec.framework_title,
        "framework_desc": rec.framework_desc,
        "framework_cards_json": rec.framework_cards_json,

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
        "og_image_url": rewrite_url(rec.og_image_url),
        "aeo_faqs_json": rec.aeo_faqs_json,

        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
    }


# ── Public: Get Page Data ──
@router.get("/data")
def get_our_team_data(db: Session = Depends(get_db)):
    global _cache_data, _cache_time
    now = time.time()
    if _cache_data is not None and (now - _cache_time) < CACHE_TTL:
        return _cache_data

    record = db.query(OurTeamPageSettings).first()
    if not record:
        record = seed_default_our_team(db)

    _cache_data = _to_dict(record)
    _cache_time = now
    return _cache_data


# ── Admin: Update Page Data ──
@router.put("/data", dependencies=[Depends(require_device)])
def update_our_team_data(payload: OurTeamUpdateSchema, db: Session = Depends(get_db)):
    record = db.query(OurTeamPageSettings).first()
    if not record:
        record = seed_default_our_team(db)

    update_fields = payload.model_dump(exclude_unset=True)
    for field, val in update_fields.items():
        if val is not None:
            setattr(record, field, val)

    db.commit()
    db.refresh(record)
    _invalidate_cache()
    return _to_dict(record)


# ── Admin: Upload Faculty / Mentor Photo ──
@router.post("/upload-photo", dependencies=[Depends(require_device)])
async def upload_team_photo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = validate_upload(file, ALLOWED_IMAGE_EXTENSIONS)
    fname = f"team_{uuid.uuid4().hex[:10]}{ext}"
    content = await file.read()

    # Upload to Cloudflare R2 bucket first
    r2_url = _try_upload_to_r2(content, f"team/{fname}", file.content_type, db)
    if r2_url:
        _invalidate_cache()
        return {"url": r2_url}

    # Local fallback
    dest_path = os.path.join(UPLOAD_DIR, fname)
    with open(dest_path, "wb") as f:
        f.write(content)

    _invalidate_cache()
    return {"url": f"/uploads/team/{fname}"}
