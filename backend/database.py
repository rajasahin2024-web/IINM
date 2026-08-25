from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Please add it to your .env file before starting the server."
    )

# Pool tuning: With the in-memory response cache (backend/cache.py), most
# public GET requests never touch the database, so the pool pressure is much
# lower. A pool of 10 + 20 overflow = 30 total connections is a safe ceiling
# that stays well under PostgreSQL's default max_connections (100).
# pool_recycle prevents stale connections from accumulating.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,  # recycle connections every 30 minutes
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
