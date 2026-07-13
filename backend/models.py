from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Boolean, Float, Table, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

course_subjects = Table(
    'course_subjects', Base.metadata,
    Column('course_id', Integer, ForeignKey('courses.id', ondelete="CASCADE"), primary_key=True),
    Column('subject_id', Integer, ForeignKey('subjects.id', ondelete="CASCADE"), primary_key=True)
)

course_chapters = Table(
    'course_chapters', Base.metadata,
    Column('course_id', Integer, ForeignKey('courses.id', ondelete="CASCADE"), primary_key=True),
    Column('chapter_id', Integer, ForeignKey('chapters.id', ondelete="CASCADE"), primary_key=True)
)

course_instructors = Table(
    'course_instructors', Base.metadata,
    Column('course_id', Integer, ForeignKey('courses.id', ondelete="CASCADE"), primary_key=True),
    Column('instructor_id', Integer, ForeignKey('instructors.id', ondelete="CASCADE"), primary_key=True)
)


topic_materials = Table(
    'topic_materials', Base.metadata,
    Column('topic_id', Integer, ForeignKey('chapters.id', ondelete="CASCADE"), primary_key=True),
    Column('material_id', Integer, ForeignKey('course_materials.id', ondelete="CASCADE"), primary_key=True),
    Column('order_position', Integer, default=0, server_default=text('0')),
)

class AdminUser(Base):
    __tablename__ = "admins"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))
    devices       = relationship("DeviceSession", back_populates="admin")

class DeviceAdminUser(Base):
    __tablename__ = "device_admins"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))

class DeviceSession(Base):
    __tablename__ = "device_sessions"
    id               = Column(Integer, primary_key=True, index=True)
    admin_id         = Column(Integer, ForeignKey("admins.id"), nullable=True)
    device_token     = Column(String(255), unique=True, index=True)

    # Who is requesting
    requester_name   = Column(String(150), nullable=True)
    requester_email  = Column(String(255), nullable=True)
    requester_phone  = Column(String(50), nullable=True)
    purpose          = Column(Text, nullable=True)

    # Device info
    device_name      = Column(String(255), nullable=True)   # user-provided label e.g. "Windows PC"
    device_model     = Column(String(255), nullable=True)   # auto-detected OS/Browser string

    # Location
    lat              = Column(Float, nullable=True)
    lng              = Column(Float, nullable=True)
    location         = Column(Text, nullable=True)          # reverse-geocoded address
    ip_address       = Column(String(50), nullable=True)

    # Status — only one of approved/rejected can be True
    is_approved      = Column(Boolean, default=False)
    is_rejected      = Column(Boolean, default=False)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    admin            = relationship("AdminUser", back_populates="devices")

# ──────────────────────────────────────────────────
# LMS Taxonomy Models
# ──────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(255), unique=True, index=True)
    icon_url      = Column(Text, nullable=True)
    banner_url    = Column(Text, nullable=True)
    is_active     = Column(Boolean, default=True)
    desktop_banner_ratio = Column(String(50), nullable=True)
    mobile_banner_ratio  = Column(String(50), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())
    
    subcategories = relationship("SubCategory", back_populates="category", cascade="all, delete-orphan")

class SubCategory(Base):
    __tablename__ = "subcategories"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(255), index=True)
    category_id   = Column(Integer, ForeignKey("categories.id"))
    icon_url      = Column(Text, nullable=True)
    banner_url    = Column(Text, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())
    
    category      = relationship("Category", back_populates="subcategories")
    subjects      = relationship("Subject", back_populates="subcategory", cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(255), index=True)
    subcategory_id   = Column(Integer, ForeignKey("subcategories.id"))
    description      = Column(Text, nullable=True)
    thumbnail_url    = Column(Text, nullable=True)
    price            = Column(Float, default=0.0)
    discounted_price = Column(Float, nullable=True)
    price_usd        = Column(Float, nullable=True)
    discounted_price_usd = Column(Float, nullable=True)
    validity_days    = Column(Integer, default=365)
    is_active        = Column(Boolean, default=True)
    is_purchasable   = Column(Boolean, default=True)
    display_order    = Column(Integer, default=0)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    
    subcategory      = relationship("SubCategory", back_populates="subjects")
    courses          = relationship("Course", secondary=course_subjects, back_populates="subjects")
    chapters         = relationship("Chapter", back_populates="subject", cascade="all, delete-orphan")

class Course(Base):
    __tablename__ = "courses"
    id               = Column(Integer, primary_key=True, index=True)
    title            = Column(String(255), index=True)
    description      = Column(Text, nullable=True)
    
    # ── Timeline & Validity
    start_date       = Column(DateTime(timezone=True), nullable=True)
    end_date         = Column(DateTime(timezone=True), nullable=True)
    validity_days    = Column(Integer, nullable=True) # Lifetime access if null
    
    # ── Pricing & Sales
    price            = Column(Float, nullable=True)
    discount_price   = Column(Float, nullable=True)
    price_usd        = Column(Float, nullable=True)
    discount_price_usd = Column(Float, nullable=True)
    is_free          = Column(Boolean, default=False)
    currency         = Column(String(10), default="INR")
    
    # ── Slug
    slug             = Column(String(255), unique=True, index=True, nullable=True)


    # ── Minimum Payment Requirement
    min_payment_type  = Column(String(20), nullable=True)   # 'percentage' | 'amount' | None
    min_payment_value = Column(Float, nullable=True)         # e.g. 30 (%) or 500 (fixed amount)
    
    # ── Media & Assets
    thumbnail_url    = Column(Text, nullable=True)
    promo_video_url  = Column(Text, nullable=True)
    
    # ── Status & Visibility
    status           = Column(String(50), default="DRAFT") # DRAFT | PUBLISHED | ARCHIVED
    is_featured      = Column(Boolean, default=False)
    show_on_homepage = Column(Boolean, default=False)
    show_instructor_publicly = Column(Boolean, default=True)
    is_new           = Column(Boolean, default=False)  # Admin-controlled "NEW" badge
    
    # ── Additional Metadata
    instructor_name  = Column(String(255), nullable=True)
    skill_level      = Column(String(50), nullable=True) # Beginner | Intermediate | Advanced
    prerequisites    = Column(Text, nullable=True)
    what_you_will_learn = Column(Text, nullable=True) # Stored as newline-separated text
    target_audience  = Column(Text, nullable=True)
    upload_syllabus  = Column(Text, nullable=True)
    has_certificate  = Column(Boolean, default=False)
    certificate_image_url = Column(Text, nullable=True)
    
    # ── SEO Metadata
    seo_title        = Column(String(255), nullable=True)
    seo_description  = Column(Text, nullable=True)
    seo_keywords     = Column(Text, nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    
    subjects         = relationship("Subject", secondary=course_subjects, back_populates="courses")
    chapters         = relationship("Chapter", secondary=course_chapters, back_populates="courses")
    instructors      = relationship("Instructor", secondary=course_instructors, back_populates="courses")

class Chapter(Base):
    __tablename__ = "chapters"
    id               = Column(Integer, primary_key=True, index=True)
    title            = Column(String(255))
    content          = Column(Text, nullable=True)
    subject_id       = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"))
    order_position   = Column(Integer, default=0)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    
    subject          = relationship("Subject", back_populates="chapters")
    courses          = relationship("Course", secondary=course_chapters, back_populates="chapters")
    materials        = relationship(
        "CourseMaterial",
        secondary=topic_materials,
        back_populates="chapters",
        order_by=topic_materials.c.order_position.asc(),
    )

class CourseMaterial(Base):
    __tablename__ = "course_materials"
    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String(255))
    description  = Column(Text, nullable=True)
    tags         = Column(Text, nullable=True)
    file_type    = Column(String(50))          # video | pdf | image | document | youtube
    file_url     = Column(Text, nullable=True)  # uploaded file URL
    youtube_url  = Column(Text, nullable=True)  # YouTube video link
    thumbnail_url = Column(Text, nullable=True)  # custom thumbnail for videos
    file_size    = Column(Integer, nullable=True)  # bytes
    order_position = Column(Integer, default=0)  # for drag-and-drop ordering
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())
    
    chapters     = relationship("Chapter", secondary=topic_materials, back_populates="materials")


class ChapterLiveClass(Base):
    __tablename__ = "chapter_live_classes"
    id             = Column(Integer, primary_key=True, index=True)
    chapter_id     = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    title          = Column(String(255), nullable=False)
    meeting_url    = Column(Text, nullable=False)
    scheduled_at   = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    chapter        = relationship("Chapter", backref="live_classes")


# ──────────────────────────────────────────────────
# Question Bank Models
# ──────────────────────────────────────────────────

class ComprehensionPassage(Base):
    __tablename__ = "comprehension_passages"
    id            = Column(Integer, primary_key=True, index=True)
    code          = Column(String(50), unique=True, index=True)
    title         = Column(String(255))
    body_html     = Column(Text)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

class Topic(Base):
    __tablename__ = "topics"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
    tags        = relationship("Tag", back_populates="topic", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), index=True)
    topic_id   = Column(Integer, ForeignKey("topics.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    topic      = relationship("Topic", back_populates="tags")

class DifficultyLevel(Base):
    __tablename__ = "difficulty_levels"
    id          = Column(Integer, primary_key=True, index=True)
    label       = Column(String(100))         # "Easy"
    code        = Column(String(50), unique=True, index=True)  # "easy"
    color       = Column(String(20))          # "#22c55e"
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

class QuestionType(Base):
    __tablename__ = "question_types"
    id                = Column(Integer, primary_key=True, index=True)
    code              = Column(String(10), unique=True, index=True)   # e.g. MSA
    name              = Column(String(255))                           # e.g. Multiple Choice Single Answer
    short_description = Column(Text, nullable=True)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())
    questions         = relationship("Question", back_populates="question_type")


# ──────────────────────────────────────────────────
# Question Bank — Question + Options
# ──────────────────────────────────────────────────

class Question(Base):
    __tablename__ = "questions"
    id                = Column(Integer, primary_key=True, index=True)
    code              = Column(String(30), unique=True, index=True)   # e.g. que_ABC12345
    question_type_id  = Column(Integer, ForeignKey("question_types.id"))
    question_type_code= Column(String(10))                            # e.g. MSA (denormalised for speed)
    category_id       = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id    = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    tags              = Column(Text, nullable=True)                   # comma-separated
    question_html     = Column(Text)
    topic             = Column(String(255), nullable=True)
    difficulty_level  = Column(String(50), nullable=True, default="medium")  # very_easy|easy|medium|hard|very_hard
    default_marks     = Column(Float, nullable=True, default=1.0)
    default_time_to_solve = Column(Integer, nullable=True, default=60)  # seconds
    
    # Solution tab fields
    solution_html     = Column(Text, nullable=True)
    enable_solution_video = Column(Boolean, default=False)
    video_type        = Column(String(50), nullable=True)  # 'mp4', 'youtube', 'vimeo'
    video_link        = Column(Text, nullable=True)
    hint_html         = Column(Text, nullable=True)
    
    # Attachment tab fields
    enable_attachment = Column(Boolean, default=False)
    attachment_type   = Column(String(50), nullable=True) # comprehension, audio, video
    attachment_comprehension_id = Column(Integer, nullable=True)
    attachment_audio_type = Column(String(50), nullable=True)
    attachment_audio_link = Column(Text, nullable=True)
    attachment_video_type = Column(String(50), nullable=True)
    attachment_video_link = Column(Text, nullable=True)

    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    question_type     = relationship("QuestionType", back_populates="questions")
    category          = relationship("Category")
    subcategory       = relationship("SubCategory")
    options           = relationship("QuestionOption", back_populates="question",
                                    cascade="all, delete-orphan", order_by="QuestionOption.order_index")


class QuestionOption(Base):
    __tablename__ = "question_options"
    id            = Column(Integer, primary_key=True, index=True)
    question_id   = Column(Integer, ForeignKey("questions.id"))
    content_html  = Column(Text)
    is_correct    = Column(Boolean, default=False)
    order_index   = Column(Integer, default=0)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    question      = relationship("Question", back_populates="options")


# ──────────────────────────────────────────────────
# Settings Models
# ──────────────────────────────────────────────────

class EmailSettings(Base):
    __tablename__ = "email_settings"
    id            = Column(Integer, primary_key=True, index=True)
    smtp_host     = Column(String(255), nullable=True)
    smtp_port     = Column(Integer, nullable=True)
    smtp_user     = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    from_email    = Column(String(255), nullable=True)
    from_name     = Column(String(255), nullable=True)
    use_tls       = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

class SiteSettings(Base):
    __tablename__ = "site_settings"
    id              = Column(Integer, primary_key=True, index=True)
    # General Site Identity
    site_name       = Column(String(255), nullable=True)
    logo_url        = Column(Text, nullable=True)
    dark_logo_url   = Column(Text, nullable=True)
    favicon_url     = Column(Text, nullable=True)
    meta_description = Column(Text, nullable=True)
    # Homepage Banners — stored as JSON array of {url, order}
    banner_images   = Column(Text, nullable=True)
    # Promo video YouTube URL for homepage
    promo_video_url = Column(Text, nullable=True)
    # Analytics & SEO
    analytics_id        = Column(String(255), nullable=True)
    bing_webmaster_id   = Column(String(255), nullable=True)
    # Notification bar
    notification_bar_text = Column(Text, nullable=True)
    notification_bar_items = Column(Text, nullable=True)  # JSON array of {text, icon_url}
    # Ticker animation/color settings
    ticker_speed = Column(Integer, nullable=True)  # marquee speed in seconds (e.g. 30)
    ticker_animation_type = Column(String(50), nullable=True)  # scroll, fade, slide
    ticker_bg_color = Column(String(20), nullable=True)
    ticker_text_color = Column(String(20), nullable=True)
    ticker_label_bg_color = Column(String(20), nullable=True)
    ticker_label_text_color = Column(String(20), nullable=True)
    # Maintenance mode
    maintenance_mode      = Column(Boolean, default=False)
    maintenance_title     = Column(String(255), nullable=True)
    maintenance_message   = Column(Text, nullable=True)
    maintenance_video_url = Column(Text, nullable=True)
    maintenance_bg_image_url = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())


class PaymentSettings(Base):
    __tablename__ = "payment_settings"
    id                  = Column(Integer, primary_key=True, index=True)
    razorpay_key_id     = Column(String(255), nullable=True)
    razorpay_key_secret = Column(String(255), nullable=True)
    is_test_mode        = Column(Boolean, default=True)
    currency            = Column(String(10), default="INR")
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

class R2Settings(Base):
    __tablename__ = "r2_settings"
    id                = Column(Integer, primary_key=True, index=True)
    account_id        = Column(String(255), nullable=True)
    access_key_id     = Column(String(255), nullable=True)
    secret_access_key = Column(String(255), nullable=True)
    bucket_name       = Column(String(255), nullable=True)
    public_url        = Column(String(255), nullable=True)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

class AISettings(Base):
    __tablename__ = "ai_settings"
    id                = Column(Integer, primary_key=True, index=True)
    gemini_api_key    = Column(String(255), nullable=True)
    selected_model    = Column(String(255), nullable=True)
    # OpenRouter fields
    openrouter_api_key    = Column(String(500), nullable=True)
    model_exam_text       = Column(String(255), nullable=True)
    model_image_reply     = Column(String(255), nullable=True)
    model_video_reply     = Column(String(255), nullable=True)
    model_file_read       = Column(String(255), nullable=True)
    model_general_text    = Column(String(255), nullable=True)
    model_thinking        = Column(String(255), nullable=True)
    model_live_doubt      = Column(String(255), nullable=True)
    is_active             = Column(Boolean, default=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())
    updated_at            = Column(DateTime(timezone=True), onupdate=func.now())



# ==========================================
# BATCH MANAGEMENT & ADVANCED SCHEDULING
# ==========================================

class Instructor(Base):
    __tablename__ = "instructors"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    email      = Column(String(255), nullable=True)
    phone      = Column(String(50), nullable=True)
    gender     = Column(String(50), nullable=True)
    bio        = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    qualification = Column(String(255), nullable=True)
    experience_years = Column(String(50), nullable=True)
    designation = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)
    social_linkedin = Column(String(500), nullable=True)
    social_twitter = Column(String(500), nullable=True)
    social_website = Column(String(500), nullable=True)
    intro_video_url = Column(String(500), nullable=True)
    achievements = Column(Text, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batches    = relationship("Batch", secondary="batch_instructors", back_populates="instructors")
    courses    = relationship("Course", secondary=course_instructors, back_populates="instructors")


class BatchInstructor(Base):
    __tablename__ = "batch_instructors"
    batch_id      = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="CASCADE"), primary_key=True)


class Batch(Base):
    __tablename__ = "batches"
    id                  = Column(Integer, primary_key=True, index=True)
    course_id           = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    name                = Column(String(255), nullable=False)
    mode                = Column(String(50), default="Online")      # Online, Offline, Hybrid
    meeting_url         = Column(String(500), nullable=True)
    status              = Column(String(50), default="Upcoming")    # Upcoming, Ongoing, Completed, Cancelled
    start_date          = Column(Date, nullable=True)
    end_date            = Column(Date, nullable=True)
    max_capacity        = Column(Integer, default=50)
    enable_waitlist     = Column(Boolean, default=False)
    discount_amount     = Column(Float, nullable=True)
    enable_installments = Column(Boolean, default=False)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    course       = relationship("Course", backref="batches")
    instructors  = relationship("Instructor", secondary="batch_instructors", back_populates="batches")
    routines     = relationship("BatchRoutine", back_populates="batch", cascade="all, delete-orphan")
    content_drip = relationship("BatchContentDrip", back_populates="batch", cascade="all, delete-orphan")
    enrollments  = relationship("BatchEnrollment", back_populates="batch", cascade="all, delete-orphan")


class BatchRoutine(Base):
    __tablename__ = "batch_routines"
    id          = Column(Integer, primary_key=True, index=True)
    batch_id    = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"))
    day_of_week = Column(String(20), nullable=False) # e.g. "Monday", "Tuesday"
    start_time  = Column(String(20), nullable=True)  # Format: "10:00 AM" or Time
    end_time    = Column(String(20), nullable=True)
    
    batch = relationship("Batch", back_populates="routines")

class BatchContentDrip(Base):
    __tablename__ = "batch_content_drips"
    id            = Column(Integer, primary_key=True, index=True)
    batch_id      = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"))
    chapter_id    = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"))
    unlock_date   = Column(Date, nullable=False)
    
    batch   = relationship("Batch", back_populates="content_drip")
    chapter = relationship("Chapter")


# ==========================================
# STUDENT MANAGEMENT & ENROLLMENTS
# ==========================================

class Student(Base):
    __tablename__ = "students"
    id                = Column(Integer, primary_key=True, index=True)
    first_name        = Column(String(100), nullable=False)
    last_name         = Column(String(100), nullable=True)
    email             = Column(String(255), unique=True, index=True, nullable=False)
    phone             = Column(String(50), nullable=True)
    alternative_phone = Column(String(50), nullable=True)
    is_active         = Column(Boolean, default=True)

    # Personal Information
    date_of_birth     = Column(Date, nullable=True)
    gender            = Column(String(20), nullable=True)
    profile_photo_url = Column(Text, nullable=True)
    city              = Column(String(100), nullable=True)
    state             = Column(String(100), nullable=True)
    pin_code          = Column(String(20), nullable=True)

    # Educational Qualification
    highest_qualification = Column(String(100), nullable=True)
    tenth_board           = Column(String(100), nullable=True)
    tenth_year            = Column(String(10), nullable=True)
    tenth_percentage      = Column(String(20), nullable=True)
    twelfth_board         = Column(String(100), nullable=True)
    twelfth_year          = Column(String(10), nullable=True)
    twelfth_percentage    = Column(String(20), nullable=True)
    twelfth_stream        = Column(String(50), nullable=True)
    graduation_degree     = Column(String(100), nullable=True)
    graduation_university = Column(String(255), nullable=True)
    graduation_year       = Column(String(10), nullable=True)
    graduation_cgpa       = Column(String(20), nullable=True)
    current_occupation    = Column(String(100), nullable=True)

    # Identity & Documents
    aadhaar_number    = Column(String(20), nullable=True)
    pan_number        = Column(String(20), nullable=True)
    student_id_url    = Column(Text, nullable=True)

    # Professional Info
    job_title         = Column(String(150), nullable=True)
    company_name      = Column(String(255), nullable=True)
    work_experience   = Column(String(50), nullable=True)
    linkedin_url      = Column(Text, nullable=True)

    # LMS Specific
    source                  = Column(String(100), nullable=True)
    referral_code           = Column(String(50), nullable=True)
    preferred_language      = Column(String(50), nullable=True)
    emergency_contact_name  = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)

    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    enrollments       = relationship("BatchEnrollment", back_populates="student", cascade="all, delete-orphan")



class BatchEnrollment(Base):
    __tablename__ = "batch_enrollments"
    id         = Column(Integer, primary_key=True, index=True)
    batch_id   = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    join_date  = Column(Date, nullable=False, server_default=func.current_date())
    status     = Column(String(50), default="active") # active, suspended, graduated, cancelled, waitlisted

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    batch      = relationship("Batch", back_populates="enrollments")
    student    = relationship("Student", back_populates="enrollments")


# ==========================================
# COURSE PROGRESS TRACKING
# ==========================================

class BatchChapterProgress(Base):
    """Tracks which chapters/topics have been covered in a batch (Teacher/Admin view)."""
    __tablename__ = "batch_chapter_progress"
    id          = Column(Integer, primary_key=True, index=True)
    batch_id    = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    chapter_id  = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    
    is_completed   = Column(Boolean, default=False)
    completed_date = Column(Date, nullable=True)         # date this chapter was taught
    notes          = Column(Text, nullable=True)         # teacher's class notes
    
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    batch   = relationship("Batch", backref="chapter_progress")
    chapter = relationship("Chapter")


class BatchStudentMaterialProgress(Base):
    """Tracks which materials (video/pdf) individual students have completed."""
    __tablename__ = "batch_student_material_progress"
    id          = Column(Integer, primary_key=True, index=True)
    batch_id    = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    student_id  = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    material_id = Column(Integer, ForeignKey("course_materials.id", ondelete="CASCADE"), nullable=False)

    is_completed   = Column(Boolean, default=False)
    watch_time_sec = Column(Integer, default=0)          # seconds watched (for videos)
    last_accessed  = Column(DateTime(timezone=True), nullable=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    batch    = relationship("Batch")
    student  = relationship("Student")
    material = relationship("CourseMaterial")



# ==========================================
# COURSE PURCHASE & PAYMENT TRACKING
# ==========================================

class CoursePurchase(Base):
    __tablename__ = "course_purchases"
    id            = Column(Integer, primary_key=True, index=True)
    student_id    = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id     = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    total_fee     = Column(Float, nullable=False)          # course price at time of purchase
    discount      = Column(Float, default=0.0)             # applied discount amount
    net_fee       = Column(Float, nullable=False)          # total_fee - discount
    paid_amount   = Column(Float, default=0.0)             # cumulative amount paid so far
    due_amount    = Column(Float, nullable=False)          # net_fee - paid_amount
    refunded_amount = Column(Float, default=0.0)           # amount refunded if cancelled

    status        = Column(String(50), default="active")   # active | completed | cancelled
    notes         = Column(Text, nullable=True)
    coupon_id     = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    invoice_uuid  = Column(String(50), nullable=True, unique=True, index=True)

    # Installment fields
    is_installment        = Column(Boolean, default=False)
    total_installments    = Column(Integer, nullable=True)
    installment_frequency = Column(String(20), nullable=True)  # monthly|weekly|fortnightly|custom
    frequency_days        = Column(Integer, nullable=True)     # used when frequency='custom'
    first_payment_date    = Column(Date, nullable=True)

    is_active             = Column(Boolean, default=True)

    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    student         = relationship("Student", backref="course_purchases")
    course          = relationship("Course", backref="purchases")
    coupon          = relationship("Coupon")
    transactions    = relationship("PaymentTransaction", back_populates="purchase", cascade="all, delete-orphan")
    installments    = relationship("InstallmentSchedule", back_populates="purchase", cascade="all, delete-orphan", order_by="InstallmentSchedule.installment_no")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    id            = Column(Integer, primary_key=True, index=True)
    purchase_id   = Column(Integer, ForeignKey("course_purchases.id", ondelete="CASCADE"), nullable=False)

    amount        = Column(Float, nullable=False)
    payment_method= Column(String(50), nullable=True)      # Cash | UPI | Bank Transfer | Cheque | Card
    reference_no  = Column(String(255), nullable=True)     # cheque/txn reference
    notes         = Column(Text, nullable=True)
    status        = Column(String(50), default="approved") # pending | approved | rejected

    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    purchase      = relationship("CoursePurchase", back_populates="transactions")


class InstallmentSchedule(Base):
    __tablename__ = "installment_schedules"
    id              = Column(Integer, primary_key=True, index=True)
    purchase_id     = Column(Integer, ForeignKey("course_purchases.id", ondelete="CASCADE"), nullable=False)

    installment_no  = Column(Integer, nullable=False)          # 1, 2, 3 ...
    due_date        = Column(Date, nullable=False)             # auto-calculated
    amount          = Column(Float, nullable=False)            # amount due for this installment
    paid_amount     = Column(Float, default=0.0)              # how much has been paid
    status          = Column(String(20), default="pending")   # pending|paid|partial|overdue
    admin_seen_overdue = Column(Boolean, default=False)       # whether admin has seen this overdue item

    payment_method  = Column(String(50), nullable=True)
    reference_no    = Column(String(255), nullable=True)
    notes           = Column(Text, nullable=True)
    paid_at         = Column(DateTime(timezone=True), nullable=True)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    purchase        = relationship("CoursePurchase", back_populates="installments")

# ──────────────────────────────────────────────────
# ENTERPRISE PURCHASE FEATURES
# ──────────────────────────────────────────────────

class Coupon(Base):
    __tablename__ = "coupons"
    id             = Column(Integer, primary_key=True, index=True)
    code           = Column(String(50), unique=True, index=True)
    discount_type  = Column(String(20)) # 'percentage' or 'flat'
    discount_value = Column(Float, nullable=False)
    is_active      = Column(Boolean, default=True)
    valid_until    = Column(Date, nullable=True)
    usage_limit    = Column(Integer, nullable=True) # Max number of times this coupon can be used
    used_count     = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# EXAM MANAGEMENT (DB-backed)
# ==========================================

class Exam(Base):
    """Exam template created in Masters > Curriculum > Exams."""
    __tablename__ = "exams"
    id              = Column(Integer, primary_key=True, index=True)
    code            = Column(String(100), unique=True, index=True)   # auto-generated e.g. exam_6wUsgvX23
    title           = Column(String(255), nullable=False)
    description     = Column(Text, nullable=True)

    category_id     = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id  = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    exam_type       = Column(String(100), nullable=True)             # Online Test | Offline Written etc.

    # Access control
    is_paid         = Column(Boolean, default=False)
    is_public       = Column(Boolean, default=True)
    status          = Column(String(50), default="Draft")            # Draft | Published

    # Settings (stored as columns for simplicity)
    duration_mode       = Column(String(20), default="Auto")         # Auto | Manual
    marks_mode          = Column(String(20), default="Auto")
    negative_marking    = Column(Boolean, default=False)
    pass_percentage     = Column(Float, default=60.0)
    shuffle_questions   = Column(Boolean, default=False)
    restrict_attempts   = Column(Boolean, default=False)
    number_of_attempts  = Column(Integer, nullable=True)
    show_leaderboard    = Column(Boolean, default=False)
    hide_solutions      = Column(Boolean, default=False)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    category        = relationship("Category")
    subcategory     = relationship("SubCategory")
    questions       = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.order_position")
    assignments     = relationship("BatchExamAssignment", back_populates="exam", cascade="all, delete-orphan")


class ExamQuestion(Base):
    """Questions linked to an Exam template (references existing Question bank)."""
    __tablename__ = "exam_questions"
    id              = Column(Integer, primary_key=True, index=True)
    exam_id         = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id     = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    order_position  = Column(Integer, default=0)
    marks           = Column(Float, default=1.0)
    negative_marks  = Column(Float, default=0.0)

    exam            = relationship("Exam", back_populates="questions")
    question        = relationship("Question")


class BatchExamAssignment(Base):
    """Assigns an Exam template to a specific Batch with a schedule."""
    __tablename__ = "batch_exam_assignments"
    id              = Column(Integer, primary_key=True, index=True)
    batch_id        = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    exam_id         = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)

    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end   = Column(DateTime(timezone=True), nullable=True)
    pass_marks      = Column(Float, nullable=True)                   # override exam default
    duration_mins   = Column(Integer, nullable=True)                 # override exam duration
    notes           = Column(Text, nullable=True)
    status          = Column(String(50), default="scheduled")        # scheduled | active | completed | cancelled
    
    # Progress-Based Unlock
    unlock_condition_type  = Column(String(50), nullable=True)       # None, 'chapter', 'material'
    unlock_condition_value = Column(Integer, nullable=True)          # chapter_id or material_id

    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    batch           = relationship("Batch")
    exam            = relationship("Exam", back_populates="assignments")


# ==========================================
# BLOG MANAGEMENT
# ==========================================

class BlogCategory(Base):
    __tablename__ = "blog_categories"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), unique=True, nullable=False)
    slug        = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color       = Column(String(20), nullable=True, default="#6366f1")  # hex colour for badge
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    subcategories = relationship("BlogSubCategory", back_populates="category", cascade="all, delete-orphan")
    posts         = relationship("BlogPost", back_populates="category")


class BlogSubCategory(Base):
    __tablename__ = "blog_subcategories"
    id          = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("blog_categories.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    slug        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("BlogCategory", back_populates="subcategories")
    posts    = relationship("BlogPost", back_populates="subcategory")


class BlogAuthor(Base):
    __tablename__ = "blog_authors"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(255), nullable=False)
    bio           = Column(Text, nullable=True)
    profile_image = Column(Text, nullable=True)  # URL
    social_links  = Column(Text, nullable=True)  # JSON string of social links
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    posts         = relationship("BlogPost", back_populates="author")


class BlogRevision(Base):
    __tablename__ = "blog_revisions"
    id            = Column(Integer, primary_key=True, index=True)
    blog_id       = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False)
    content       = Column(Text, nullable=False)  # The HTML content at this revision
    excerpt       = Column(Text, nullable=True)
    title         = Column(String(500), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    post          = relationship("BlogPost", back_populates="revisions")


class BlogPost(Base):
    __tablename__ = "blog_posts"
    id              = Column(Integer, primary_key=True, index=True)

    # Core content
    title           = Column(String(500), nullable=False)
    slug            = Column(String(500), unique=True, nullable=False)
    excerpt         = Column(Text, nullable=True)        # short summary / subtitle
    content         = Column(Text, nullable=True)        # full HTML body

    # Media
    featured_image  = Column(Text, nullable=True)        # URL

    # Classification
    category_id     = Column(Integer, ForeignKey("blog_categories.id"), nullable=True)
    subcategory_id  = Column(Integer, ForeignKey("blog_subcategories.id"), nullable=True)
    tags            = Column(Text, nullable=True)         # comma-separated e.g. "python,tutorial"

    # Authorship
    author_id       = Column(Integer, ForeignKey("blog_authors.id", ondelete="SET NULL"), nullable=True)
    author_name     = Column(String(255), default="Admin") # Legacy
    author_avatar   = Column(Text, nullable=True)          # Legacy

    # Status lifecycle
    status          = Column(String(20), default="draft")  # draft | published | archived
    is_featured     = Column(Boolean, default=False)

    # Analytics
    reading_time    = Column(Integer, default=0)           # minutes (auto-computed)
    views           = Column(Integer, default=0)
    clap_count      = Column(Integer, default=0)

    # SEO
    seo_title       = Column(String(500), nullable=True)
    seo_description = Column(Text, nullable=True)
    seo_keywords    = Column(Text, nullable=True)

    # Timestamps
    published_at    = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    category    = relationship("BlogCategory", back_populates="posts")
    subcategory = relationship("BlogSubCategory", back_populates="posts")
    author      = relationship("BlogAuthor", back_populates="posts")
    revisions   = relationship("BlogRevision", back_populates="post", cascade="all, delete-orphan", order_by="desc(BlogRevision.created_at)")
    comments    = relationship("BlogComment", back_populates="post", cascade="all, delete-orphan", order_by="desc(BlogComment.created_at)")
    ratings     = relationship("BlogRating", back_populates="post", cascade="all, delete-orphan")
    reactions   = relationship("BlogReaction", back_populates="post", cascade="all, delete-orphan")


class BlogComment(Base):
    __tablename__ = "blog_comments"
    id          = Column(Integer, primary_key=True, index=True)
    post_id     = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False)
    parent_id   = Column(Integer, ForeignKey("blog_comments.id", ondelete="CASCADE"), nullable=True)
    name        = Column(String(255), nullable=False)
    email       = Column(String(255), nullable=True)
    content     = Column(Text, nullable=False)
    is_approved = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
    post        = relationship("BlogPost", back_populates="comments")
    replies     = relationship("BlogComment", back_populates="parent", cascade="all, delete-orphan")
    parent      = relationship("BlogComment", back_populates="replies", remote_side=[id])


class BlogRating(Base):
    __tablename__ = "blog_ratings"
    id          = Column(Integer, primary_key=True, index=True)
    post_id     = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=True)
    email       = Column(String(255), nullable=True)
    rating      = Column(Integer, nullable=False)  # 1-5
    review      = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    post        = relationship("BlogPost", back_populates="ratings")


class BlogReaction(Base):
    __tablename__ = "blog_reactions"
    id          = Column(Integer, primary_key=True, index=True)
    post_id     = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(String(20), nullable=False, default="clap")  # clap, like, love, fire
    ip_hash     = Column(String(64), nullable=True)  # deduplication
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    post        = relationship("BlogPost", back_populates="reactions")


class StudentTestimonial(Base):
    __tablename__ = "student_testimonials"
    id                = Column(Integer, primary_key=True, index=True)
    student_name      = Column(String(255), nullable=False)
    course_name       = Column(String(255), nullable=False)
    designation       = Column(String(255), nullable=True)
    feedback_text     = Column(Text, nullable=True)
    youtube_video_url = Column(Text, nullable=False)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())


# ══════════════════════════════════════════════════════
#  CONTACT US — Settings, Banners, Inquiries
# ══════════════════════════════════════════════════════

class ContactSettings(Base):
    __tablename__ = "contact_settings"
    id              = Column(Integer, primary_key=True, index=True)
    # Contact Info
    phone1          = Column(String(50), nullable=True)
    phone2          = Column(String(50), nullable=True)
    whatsapp        = Column(String(50), nullable=True)
    email1          = Column(String(255), nullable=True)
    email2          = Column(String(255), nullable=True)
    # Address
    address_line1   = Column(String(255), nullable=True)
    address_line2   = Column(String(255), nullable=True)
    city            = Column(String(100), nullable=True)
    state           = Column(String(100), nullable=True)
    pin_code        = Column(String(20), nullable=True)
    country         = Column(String(100), nullable=True)
    # Office Hours
    weekday_hours   = Column(String(100), nullable=True)
    weekend_hours   = Column(String(100), nullable=True)
    # Map
    map_embed_url   = Column(Text, nullable=True)
    # Social Links
    facebook_url    = Column(String(500), nullable=True)
    instagram_url   = Column(String(500), nullable=True)
    linkedin_url    = Column(String(500), nullable=True)
    youtube_url     = Column(String(500), nullable=True)
    twitter_url     = Column(String(500), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())


class ContactBanner(Base):
    __tablename__ = "contact_banners"
    id          = Column(Integer, primary_key=True, index=True)
    image_url   = Column(Text, nullable=False)
    caption     = Column(String(255), nullable=True)
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    email      = Column(String(255), nullable=False)
    phone      = Column(String(50), nullable=True)
    interest   = Column(String(100), nullable=True)
    message    = Column(Text, nullable=True)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ══════════════════════════════════════════════════════
#  ABOUT US — Settings, Banners, Core Values
# ══════════════════════════════════════════════════════

class AboutSettings(Base):
    __tablename__ = "about_settings"
    id                 = Column(Integer, primary_key=True, index=True)
    mission_statement  = Column(Text, nullable=True)
    vision_statement   = Column(Text, nullable=True)
    story_title        = Column(String(255), nullable=True)
    story_text         = Column(Text, nullable=True)
    stats_years        = Column(String(50), nullable=True)
    stats_students     = Column(String(50), nullable=True)
    stats_courses      = Column(String(50), nullable=True)
    director_name      = Column(String(255), nullable=True)
    director_title     = Column(String(255), nullable=True)
    director_message   = Column(Text, nullable=True)
    director_image_url = Column(Text, nullable=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())


class AboutBanner(Base):
    __tablename__ = "about_banners"
    id          = Column(Integer, primary_key=True, index=True)
    image_url   = Column(Text, nullable=False)
    caption     = Column(String(255), nullable=True)
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class AboutCoreValue(Base):
    __tablename__ = "about_core_values"
    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_name   = Column(String(50), nullable=True)
    order_index = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


# ══════════════════════════════════════════════════════
#  FAQ
# ══════════════════════════════════════════════════════

class FAQ(Base):
    __tablename__ = "faqs"
    id          = Column(Integer, primary_key=True, index=True)
    question    = Column(Text, nullable=False)
    answer      = Column(Text, nullable=False)
    is_active   = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())


# ══════════════════════════════════════════════════════
#  LEADERSHIP TEAM
# ══════════════════════════════════════════════════════

class LeadershipTeam(Base):
    __tablename__ = "leadership_team"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=True)
    bio         = Column(Text, nullable=True)
    image_url   = Column(String(512), nullable=True)
    video_url   = Column(String(512), nullable=True)
    order_index = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())


class NavbarItem(Base):
    __tablename__ = "navbar_item"
    id             = Column(Integer, primary_key=True, index=True)
    parent_id      = Column(Integer, ForeignKey("navbar_item.id", ondelete="CASCADE"), nullable=True)
    title          = Column(String(255), nullable=False)
    link           = Column(String(255), nullable=True)
    badge          = Column(String(50), nullable=True)
    description    = Column(Text, nullable=True)
    item_type      = Column(String(50), default="main")  # "main", "dropdown", "sidebar_item", "content_item", "footer_cta"
    order_position = Column(Integer, default=0, server_default=text('0'))
    icon           = Column(String(50), nullable=True)
    meta_data      = Column(Text, nullable=True)  # custom styles e.g. gradients
    
    # Self-referential relationship
    sub_items      = relationship("NavbarItem", back_populates="parent", cascade="all, delete-orphan", order_by="NavbarItem.order_position")
    parent         = relationship("NavbarItem", remote_side=[id], back_populates="sub_items")


class FooterMenuGroup(Base):
    __tablename__ = "footer_menu_groups"
    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String(100), nullable=False)
    order_position = Column(Integer, default=0, server_default=text('0'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("FooterMenuItem", back_populates="group", cascade="all, delete-orphan", order_by="FooterMenuItem.order_position")


class FooterMenuItem(Base):
    __tablename__ = "footer_menu_items"
    id             = Column(Integer, primary_key=True, index=True)
    group_id       = Column(Integer, ForeignKey("footer_menu_groups.id", ondelete="CASCADE"), nullable=False)
    title          = Column(String(100), nullable=False)
    link           = Column(String(255), nullable=True)
    order_position = Column(Integer, default=0, server_default=text('0'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())

    group = relationship("FooterMenuGroup", back_populates="items")


class FooterBottomLink(Base):
    __tablename__ = "footer_bottom_links"
    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String(100), nullable=False)
    link           = Column(String(255), nullable=True)
    order_position = Column(Integer, default=0, server_default=text('0'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class HomeHeroContent(Base):
    __tablename__ = "home_hero_content"
    id            = Column(Integer, primary_key=True, index=True)
    content_json  = Column(Text, nullable=True)  # stores full hero slider JSON
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())


class HomePartnerSection(Base):
    __tablename__ = "home_partner_section"
    id            = Column(Integer, primary_key=True, index=True)
    content_json  = Column(Text, nullable=True)  # stores full partner/trust section JSON
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())


class HomeCourseCategory(Base):
    __tablename__ = "home_course_categories"
    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String(255), nullable=False)
    icon_url       = Column(Text, nullable=True) # Category's main icon Url
    tools_text     = Column(Text, nullable=True) # comma-separated tools list, e.g. "React, Node"
    tool_icons     = Column(Text, nullable=True) # JSON array of tool icon Url strings
    link_url       = Column(String(512), nullable=True) # clicking takes here
    bg_image_url   = Column(Text, nullable=True) # Custom abstract background image Url
    order_position = Column(Integer, default=0, server_default=text('0'))
    is_active      = Column(Boolean, default=True, server_default=text('true'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class HomeJourneySection(Base):
    __tablename__ = "home_journey_sections"
    id            = Column(Integer, primary_key=True, index=True)
    content_json  = Column(Text, nullable=True)  # stores badge, heading, subheading JSON
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())


class HomeJourneyMilestone(Base):
    __tablename__ = "home_journey_milestones"
    id             = Column(Integer, primary_key=True, index=True)
    tag            = Column(String(50), nullable=False)
    title          = Column(String(255), nullable=False)
    description    = Column(Text, nullable=False)
    accent_color   = Column(String(20), nullable=False, default="#00f0ff")
    scene_type     = Column(String(50), nullable=False, default="doubt_portal")
    order_position = Column(Integer, default=0, server_default=text('0'))
    is_active      = Column(Boolean, default=True, server_default=text('true'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class HomeRecentCoursesSection(Base):
    __tablename__ = "home_recent_courses_sections"
    id                   = Column(Integer, primary_key=True, index=True)
    title                = Column(String(255), nullable=False, default="Get job-ready for an in-demand career")
    subtitle             = Column(String(500), nullable=True, default="No prior experience needed to get started.")
    cta_text             = Column(String(100), nullable=True, default="Explore programs")
    cta_link             = Column(String(512), nullable=True, default="/courses")
    background_image_url = Column(Text, nullable=True)
    course_ids_json      = Column(Text, nullable=True)  # JSON array of course IDs in display order
    is_active            = Column(Boolean, default=True, server_default=text('true'))
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), onupdate=func.now())


class HomeRecentCourseCard(Base):
    __tablename__ = "home_recent_course_cards"
    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String(255), nullable=False)
    slug           = Column(String(255), nullable=False, default="")
    description    = Column(Text, nullable=True)
    thumbnail_url  = Column(Text, nullable=True)
    instructor_name = Column(String(255), nullable=True)
    skill_level    = Column(String(50), nullable=True)
    price          = Column(Float, nullable=True)
    discount_price = Column(Float, nullable=True)
    price_usd      = Column(Float, nullable=True)
    discount_price_usd = Column(Float, nullable=True)
    currency       = Column(String(10), nullable=True, default="INR")
    is_free        = Column(Boolean, default=False, server_default=text('false'))
    has_certificate = Column(Boolean, default=True, server_default=text('true'))
    rating         = Column(Float, nullable=True)
    order_position = Column(Integer, default=0, server_default=text('0'))
    is_active      = Column(Boolean, default=True, server_default=text('true'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class HomeFounderDesk(Base):
    __tablename__ = "home_founder_desk"
    id                = Column(Integer, primary_key=True, index=True)
    badge_text        = Column(String(255), nullable=True, default="Industry Insights")
    title             = Column(String(500), nullable=False, default="Industry Updates by Founder")
    typewriter_words_json = Column(Text, nullable=True)  # JSON array of words for typewriter effect
    description       = Column(Text, nullable=True)
    cta_text          = Column(String(100), nullable=True, default="Read All Updates")
    cta_link          = Column(String(512), nullable=True, default="/blog")
    secondary_cta_text = Column(String(100), nullable=True, default="Contact Us")
    secondary_cta_link = Column(String(512), nullable=True, default="/contact-us")
    founder_image_url = Column(Text, nullable=True)
    founder_name      = Column(String(255), nullable=True)
    founder_role      = Column(String(255), nullable=True)
    founder_quote     = Column(Text, nullable=True)
    right_card_title  = Column(String(255), nullable=True, default="Latest from the Founder")
    right_card_body   = Column(Text, nullable=True)
    background_image_url = Column(Text, nullable=True)
    video_youtube_id  = Column(String(20), nullable=True)
    is_active         = Column(Boolean, default=True, server_default=text('true'))
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())


class HomeStudentReelsSection(Base):
    __tablename__ = "home_student_reels_sections"
    id        = Column(Integer, primary_key=True, index=True)
    title     = Column(String(255), nullable=False, default="Students POV")
    subtitle  = Column(String(500), nullable=True, default="Real stories from real students")
    is_active = Column(Boolean, default=True, server_default=text('true'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class HomeStudentReel(Base):
    __tablename__ = "home_student_reels"
    id               = Column(Integer, primary_key=True, index=True)
    youtube_video_id = Column(String(20), nullable=False)
    title            = Column(String(255), nullable=True)
    student_name     = Column(String(255), nullable=True)
    description      = Column(Text, nullable=True)
    thumbnail_url    = Column(Text, nullable=True)
    order_position   = Column(Integer, default=0, server_default=text('0'))
    is_active        = Column(Boolean, default=True, server_default=text('true'))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())


class HomeLearnerReviewsSection(Base):
    __tablename__ = "home_learner_reviews_sections"
    id        = Column(Integer, primary_key=True, index=True)
    title     = Column(String(255), nullable=False, default="Trusted by Thousands AI Skill Learners")
    subtitle  = Column(String(500), nullable=True, default="Discover why learners choose IINM for their AI journey and career growth.")
    label     = Column(String(100), nullable=False, default="Wall of Love")
    is_active = Column(Boolean, default=True, server_default=text('true'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class HomeLearnerReview(Base):
    __tablename__ = "home_learner_reviews"
    id               = Column(Integer, primary_key=True, index=True)
    student_name     = Column(String(255), nullable=False)
    role_title       = Column(String(255), nullable=True)
    company_name     = Column(String(255), nullable=True)
    feedback_text    = Column(Text, nullable=False)
    avatar_url       = Column(Text, nullable=True)
    star_rating      = Column(Integer, default=5, server_default=text('5'))
    order_position   = Column(Integer, default=0, server_default=text('0'))
    is_active        = Column(Boolean, default=True, server_default=text('true'))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())


class HomeAIEcosystemSection(Base):
    __tablename__ = "home_ai_ecosystem_sections"
    id            = Column(Integer, primary_key=True, index=True)
    content_json  = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())


class HomeCTASection(Base):
    __tablename__ = "home_cta_sections"
    id            = Column(Integer, primary_key=True, index=True)
    content_json  = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())


class HomeAIEcosystemCard(Base):
    __tablename__ = "home_ai_ecosystem_cards"
    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String(255), nullable=False)
    description    = Column(Text, nullable=False)
    accent_color   = Column(String(20), nullable=False, default="#4facfe")
    order_position = Column(Integer, default=0, server_default=text('0'))
    is_active      = Column(Boolean, default=True, server_default=text('true'))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


