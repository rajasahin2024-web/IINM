import os
import sys
import mimetypes
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import boto3
from database import SessionLocal
import models

def migrate():
    db = SessionLocal()
    r2 = db.query(models.R2Settings).first()
    if not r2 or not r2.is_active or not r2.account_id or not r2.secret_access_key or not r2.bucket_name:
        print("ERROR: R2 settings not found or inactive in database!")
        return

    account = (r2.account_id or "").strip()
    endpoint = account if account.startswith("http") else f"https://{account}"
    public_url = (r2.public_url or "https://cdn.iinmedu.com").rstrip("/")

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=r2.access_key_id,
        aws_secret_access_key=r2.secret_access_key,
        region_name="auto",
    )

    print(f"Connected to R2 bucket '{r2.bucket_name}' via {endpoint}")
    print(f"Public CDN Base: {public_url}")

    # 1. Upload all files from uploads/team to R2 under team/
    team_dir = "uploads/team"
    if os.path.exists(team_dir):
        for fname in os.listdir(team_dir):
            fpath = os.path.join(team_dir, fname)
            if os.path.isfile(fpath):
                r2_key = f"team/{fname}"
                mime_type, _ = mimetypes.guess_type(fpath)
                content_type = mime_type or "image/jpeg"
                with open(fpath, "rb") as f:
                    data = f.read()
                s3.put_object(
                    Bucket=r2.bucket_name,
                    Key=r2_key,
                    Body=data,
                    ContentType=content_type
                )
                print(f"  [R2 Uploaded] {fpath} -> {public_url}/{r2_key}")

    # 2. Update OurTeamPageSettings
    team_rec = db.query(models.OurTeamPageSettings).first()
    if team_rec:
        def replace_local_urls(json_str):
            if not json_str:
                return json_str
            # Replace /uploads/team/ with https://cdn.iinmedu.com/team/
            return json_str.replace("/uploads/team/", f"{public_url}/team/")

        team_rec.executive_cards_json = replace_local_urls(team_rec.executive_cards_json)
        team_rec.team_members_json = replace_local_urls(team_rec.team_members_json)
        team_rec.affiliations_logos_json = replace_local_urls(team_rec.affiliations_logos_json)
        db.commit()
        print("Updated OurTeamPageSettings with R2 CDN URLs!")

    # 3. Update CertificationPageSettings if any local URLs remain
    cert_rec = db.query(models.CertificationPageSettings).first()
    if cert_rec and cert_rec.gallery_items_json:
        if "/uploads/certifications/" in cert_rec.gallery_items_json:
            cert_rec.gallery_items_json = cert_rec.gallery_items_json.replace(
                "/uploads/certifications/", f"{public_url}/certifications/"
            )
            db.commit()
            print("Updated CertificationPageSettings gallery_items_json with R2 CDN URLs!")

    print("\nSUCCESS: All team assets migrated to Cloudflare R2!")

if __name__ == "__main__":
    migrate()
