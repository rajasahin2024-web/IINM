"""Upload HLS output (master.m3u8 + per-rendition playlists + .ts segments)
to Cloudflare R2, then delete the local temp directory.

Always stores in R2 — local temp files are cleaned up after upload.
"""
import os
import shutil
import logging
from typing import Optional


def upload_hls_to_r2(
    s3_client,
    bucket_name: str,
    public_url: str,
    local_dir: str,
    r2_prefix: str,
) -> Optional[str]:
    """Upload all HLS files from local_dir to R2 under r2_prefix.

    Args:
        s3_client:  boto3 S3 client configured for R2.
        bucket_name: R2 bucket name.
        public_url: R2 public URL (for constructing the master.m3u8 URL).
        local_dir:  Local directory containing master.m3u8 + rendition dirs.
        r2_prefix:  R2 key prefix (e.g. "course-materials/hls/{uuid}").

    Returns:
        Full URL to master.m3u8 on R2, or None on failure.
        Local temp directory is always deleted after upload (or on error).
    """
    master_url: Optional[str] = None
    pub = (public_url or "").rstrip("/")

    try:
        for root, _, files in os.walk(local_dir):
            for filename in files:
                local_path = os.path.join(root, filename)
                rel_path = os.path.relpath(local_path, local_dir).replace(os.sep, "/")
                r2_key = f"{r2_prefix}/{rel_path}"

                # Determine content type
                if filename.endswith(".m3u8"):
                    content_type = "application/vnd.apple.mpegurl"
                elif filename.endswith(".ts"):
                    content_type = "video/mp2t"
                else:
                    content_type = "application/octet-stream"

                with open(local_path, "rb") as f:
                    body = f.read()

                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=r2_key,
                    Body=body,
                    ContentType=content_type,
                )

                if filename == "master.m3u8" and pub:
                    master_url = f"{pub}/{r2_key}"

        if master_url:
            logging.info(f"HLS uploaded to R2: {master_url}")
        else:
            logging.error("HLS upload completed but master_url is empty (public_url missing?)")

    except Exception as e:
        logging.error(f"HLS upload to R2 failed: {e}")
        master_url = None
    finally:
        # Always delete local temp directory
        shutil.rmtree(local_dir, ignore_errors=True)
        logging.info(f"Cleaned up local HLS temp: {local_dir}")

    return master_url
