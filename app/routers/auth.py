from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from fastapi import APIRouter, HTTPException, status
from jose import jwt

from app.config import settings
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
    )

    if body.username != settings.auth_username:
        raise invalid

    if not _bcrypt.checkpw(body.password.encode(), settings.auth_password_hash.encode()):
        raise invalid

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiry_minutes)
    token = jwt.encode(
        {"sub": body.username, "exp": expire},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return TokenResponse(access_token=token)
