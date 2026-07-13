"""Migration: Create chapter_live_classes table"""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS chapter_live_classes (
            id SERIAL PRIMARY KEY,
            chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            meeting_url TEXT NOT NULL,
            scheduled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """))
    conn.commit()
    print("OK: chapter_live_classes table created successfully.")
