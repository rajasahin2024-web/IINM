"""Migration: Add live_class_id column to batch_content_drips (per-batch live class scheduling)"""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE batch_content_drips
        ADD COLUMN IF NOT EXISTS live_class_id INTEGER
        REFERENCES chapter_live_classes(id) ON DELETE CASCADE;
    """))
    conn.execute(text("""
        ALTER TABLE batch_content_drips
        ALTER COLUMN chapter_id DROP NOT NULL;
    """))
    conn.commit()
    print("OK: live_class_id column added to batch_content_drips.")
