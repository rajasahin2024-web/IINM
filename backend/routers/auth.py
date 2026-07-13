"""
Shared authentication dependencies for all API routers.
Import `require_device` into any router that needs protection.
"""
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import DeviceSession


def require_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db),
) -> str:
    """
    FastAPI dependency: validates that the request carries an approved device
    token in the 'X-Device-Token' header.

    Usage in a router:
        @router.get("/something")
        def my_endpoint(device: str = Depends(require_device), db: Session = Depends(get_db)):
            ...
    """
    if not x_device_token:
        raise HTTPException(
            status_code=401,
            detail="X-Device-Token header is required",
        )
    session = db.query(DeviceSession).filter(
        DeviceSession.device_token == x_device_token,
        DeviceSession.is_approved == True,
    ).first()
    if not session:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: device token is invalid or not approved",
        )
    return x_device_token
