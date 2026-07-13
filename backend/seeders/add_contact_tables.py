"""
Seeder: Create contact_settings, contact_banners, contact_inquiries tables
Converted from SQLite to PostgreSQL (SQLAlchemy engine).
Run with: python seeders/add_contact_tables.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

engine = create_engine(os.environ["DATABASE_URL"])

SQL = """
-- 1. contact_settings
CREATE TABLE IF NOT EXISTS contact_settings (
    id              SERIAL PRIMARY KEY,
    phone1          VARCHAR(50),
    phone2          VARCHAR(50),
    whatsapp        VARCHAR(50),
    email1          VARCHAR(255),
    email2          VARCHAR(255),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    pin_code        VARCHAR(20),
    country         VARCHAR(100),
    weekday_hours   VARCHAR(100),
    weekend_hours   VARCHAR(100),
    map_embed_url   TEXT,
    facebook_url    VARCHAR(500),
    instagram_url   VARCHAR(500),
    linkedin_url    VARCHAR(500),
    youtube_url     VARCHAR(500),
    twitter_url     VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP
);

-- 2. contact_banners
CREATE TABLE IF NOT EXISTS contact_banners (
    id          SERIAL PRIMARY KEY,
    image_url   TEXT NOT NULL,
    caption     VARCHAR(255),
    order_index INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. contact_inquiries
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    phone      VARCHAR(50),
    interest   VARCHAR(100),
    message    TEXT,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

with engine.begin() as conn:
    for stmt in [s.strip() for s in SQL.split(";") if s.strip()]:
        conn.execute(text(stmt))

print("OK: contact_settings, contact_banners, contact_inquiries — PostgreSQL tables ready.")
