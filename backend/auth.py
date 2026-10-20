
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from backend.database import get_user_by_email


SECRET_KEY = os.getenv("PORTAL_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

if not SECRET_KEY:
    raise RuntimeError(
        "PORTAL_SECRET_KEY is missing. Set it before starting the backend."
    )

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        return password_hash.verify(plain_password, stored_hash)
    except Exception:
        return False


def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)

    if not user or not user.get("is_active"):
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    # Every account must verify its email first.
    if not user.get("email_verified", 0):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before logging in.",
        )

    role = str(user.get("role", "")).strip().casefold()

    # Litigants do not require admin approval.
    # Every other role requires approval.
    if role != "litigant" and not user.get("is_approved", 0):
        raise HTTPException(
            status_code=403,
            detail="Your account is awaiting administrator approval.",
        )

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
    }


def create_access_token(email: str, role: str = ""):
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": email.strip().lower(),
        "exp": expires_at,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if not isinstance(payload.get("sub"), str):
            return None

        return payload

    except (InvalidTokenError, TypeError, ValueError):
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    unauthorized = HTTPException(
        status_code=401,
        detail="Valid login required. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    payload = decode_access_token(credentials.credentials)

    if not payload:
        raise unauthorized

    user = get_user_by_email(payload["sub"])

    if not user:
        raise unauthorized

    if not user.get("is_active") or not user.get("email_verified", 0):
        raise unauthorized

    role = str(user.get("role", "")).strip().casefold()

    # Recheck approval on every protected API request.
    if role != "litigant" and not user.get("is_approved", 0):
        raise unauthorized

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
    }


def require_roles(*allowed_roles):
    permitted = {role.casefold() for role in allowed_roles}

    def role_checker(current_user=Depends(get_current_user)):
        if current_user["role"].casefold() not in permitted:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_checker
