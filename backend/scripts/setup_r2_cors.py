"""One-time setup: configure CORS on the R2 bucket so browsers can upload
directly via presigned PUT URLs (Direct-to-R2 flow).

Usage (from the backend directory, with the venv active):
    python scripts/setup_r2_cors.py

Reads R2 credentials from the r2_settings DB table (same as the app).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import boto3
from database import SessionLocal
import models

ALLOWED_ORIGINS = [
    "https://iinmedu.com",
    "https://www.iinmedu.com",
    "http://localhost:2021",
    "http://127.0.0.1:2021",
]

CORS_RULE = {
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ALLOWED_ORIGINS,
    "AllowedHeaders": ["Content-Type", "ETag", "x-amz-content-sha256"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600,
}


def main():
    db = SessionLocal()
    try:
        r2 = db.query(models.R2Settings).first()
        if not r2 or not r2.account_id or not r2.access_key_id or not r2.bucket_name:
            print("R2 settings incomplete — nothing to do")
            return
        account = (r2.account_id or "").strip()
        endpoint = account if account.startswith("http") else f"https://{account}.r2.cloudflarestorage.com"
        s3 = boto3.client(
            service_name="s3",
            endpoint_url=endpoint,
            aws_access_key_id=r2.access_key_id,
            aws_secret_access_key=r2.secret_access_key,
            region_name="auto",
        )
        s3.put_bucket_cors(
            Bucket=r2.bucket_name,
            CORSConfiguration={"CORSRules": [CORS_RULE]},
        )
        print(f"CORS configured on bucket '{r2.bucket_name}' for origins: {', '.join(ALLOWED_ORIGINS)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
