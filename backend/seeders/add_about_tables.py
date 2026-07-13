"""
Seeder: Create about_settings, about_banners, about_core_values tables
Converted from SQLite to PostgreSQL (SQLAlchemy engine).
Run with: python seeders/add_about_tables.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

engine = create_engine(os.environ["DATABASE_URL"])

SQL = """
-- 1. about_settings
CREATE TABLE IF NOT EXISTS about_settings (
    id                  SERIAL PRIMARY KEY,
    mission_statement   TEXT,
    vision_statement    TEXT,
    story_title         VARCHAR(255),
    story_text          TEXT,
    stats_years         VARCHAR(50),
    stats_students      VARCHAR(50),
    stats_courses       VARCHAR(50),
    director_name       VARCHAR(255),
    director_title      VARCHAR(255),
    director_message    TEXT,
    director_image_url  TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP
);

-- 2. about_banners
CREATE TABLE IF NOT EXISTS about_banners (
    id          SERIAL PRIMARY KEY,
    image_url   TEXT NOT NULL,
    caption     VARCHAR(255),
    order_index INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. about_core_values
CREATE TABLE IF NOT EXISTS about_core_values (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    icon_name   VARCHAR(50),
    order_index INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

with engine.begin() as conn:
    for stmt in [s.strip() for s in SQL.split(";") if s.strip()]:
        conn.execute(text(stmt))

print("OK: about_settings, about_banners, about_core_values — PostgreSQL tables ready.")
