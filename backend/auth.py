from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash


SECRET_KEY = "development-secret-key-change-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

password_hash = PasswordHash.recommended()


# Demo users
users_db = {
    "litigant@example.com": {
        "email": "litigant@example.com",
        "password": password_hash.hash("password123"),
        "role": "Litigant",
    },
    "lawyer@example.com": {
        "email": "lawyer@example.com",
        "password": password_hash.hash("password123"),
        "role": "Lawyer",
    },
    "judge@example.com": {
        "email": "judge@example.com",
        "password": password_hash.hash("password123"),
        "role": "Judge",
    },
    "registrar@example.com": {
        "email": "registrar@example.com",
        "password": password_hash.hash("password123"),
        "role": "Registrar",
    },
}


def authenticate_user(email: str, password: str):
    user = users_db.get(email)

    if not user:
        return None

    if not password_hash.verify(password, user["password"]):
        return None

    return user


def create_access_token(email: str, role: str):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": email,
        "role": role,
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)