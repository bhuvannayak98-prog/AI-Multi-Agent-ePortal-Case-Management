import hashlib
import logging
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from backend.auth import (
    authenticate_user,
    create_access_token,
    password_hash,
)
from backend.database import (
    create_user,
    get_connection,
    get_user_by_email,
    update_user_fields,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

FRONTEND_BASE_URL = os.getenv(
    "FRONTEND_BASE_URL", "http://localhost:5173"
).rstrip("/")

VERIFICATION_EXPIRE_HOURS = 24
RESET_EXPIRE_MINUTES = 30
RESEND_COOLDOWN_SECONDS = 60

PROFESSIONAL_ROLES = {
    "lawyer": "Lawyer",
    "judge": "Judge",
    "registrar": "Registrar",
}

# These canonical values must match the frontend checkboxes.
LAWYER_EXPERTISE_OPTIONS = {
    "civil": "Civil",
    "criminal": "Criminal",
    "cybercrime": "Cybercrime",
    "property": "Property",
    "family": "Family",
}


# -------------------- REQUEST MODELS --------------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)


class ProfessionalSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    role: str
    expertise: list[str] = Field(default_factory=list, max_length=5)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class EmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


# -------------------- HELPERS --------------------

def utc_now():
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_datetime(value):
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(value)

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed
    except (TypeError, ValueError):
        return None


def normalize_lawyer_expertise(values: list[str]) -> list[str]:
    """Validate, canonicalize and deduplicate expertise selections."""
    normalized = []

    for value in values:
        if not isinstance(value, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each expertise selection must be text.",
            )

        canonical = LAWYER_EXPERTISE_OPTIONS.get(value.strip().casefold())

        if not canonical:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Unsupported expertise. Choose from: "
                    + ", ".join(LAWYER_EXPERTISE_OPTIONS.values())
                    + "."
                ),
            )

        if canonical not in normalized:
            normalized.append(canonical)

    return normalized


def save_lawyer_expertise(user_id: int, expertise: list[str]):
    """Persist validated expertise against the newly created lawyer."""
    with get_connection() as connection:
        user = connection.execute(
            "SELECT role FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

        if not user or str(user["role"]).casefold() != "lawyer":
            raise ValueError(
                "Expertise can only be saved for a Lawyer account."
            )

        connection.executemany(
            """
            INSERT INTO lawyer_case_types (lawyer_user_id, case_type)
            VALUES (?, ?)
            ON CONFLICT(lawyer_user_id, case_type) DO NOTHING
            """,
            [(user_id, area) for area in expertise],
        )


def get_lawyer_expertise(user_id: int) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT case_type
            FROM lawyer_case_types
            WHERE lawyer_user_id = ?
            ORDER BY case_type
            """,
            (user_id,),
        ).fetchall()

    return [row["case_type"] for row in rows]


def send_email(recipient: str, subject: str, body: str):
    """Send email using configured SMTP settings."""
    host = os.getenv("SMTP_HOST")
    port_value = os.getenv("SMTP_PORT", "587")
    username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM_EMAIL")

    missing = [
        name
        for name, value in (
            ("SMTP_HOST", host),
            ("SMTP_USERNAME", username),
            ("SMTP_PASSWORD", smtp_password),
            ("SMTP_FROM_EMAIL", sender),
        )
        if not value
    ]

    if missing:
        raise RuntimeError(
            "SMTP configuration missing: " + ", ".join(missing)
        )

    try:
        port = int(port_value)
    except (TypeError, ValueError) as exc:
        raise RuntimeError(
            "SMTP_PORT must be a valid port number."
        ) from exc

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(username, smtp_password)
        server.send_message(message)


def issue_verification_email(user):
    """Create a hashed, time-limited verification token and email its link."""
    token = secrets.token_urlsafe(32)
    now = utc_now()
    expiry = now + timedelta(hours=VERIFICATION_EXPIRE_HOURS)

    update_user_fields(
        user["id"],
        verification_token_hash=hash_token(token),
        verification_expires_at=expiry.isoformat(),
        updated_at=now.isoformat(),
    )

    link = (
        f"{FRONTEND_BASE_URL}/verify-email?"
        f"{urlencode({'token': token})}"
    )

    send_email(
        user["email"],
        "Verify your Case Management Portal email",
        (
            "Hello,\n\n"
            "Verify your email address using this link:\n\n"
            f"{link}\n\n"
            f"This link expires in {VERIFICATION_EXPIRE_HOURS} hours.\n"
            "If you did not create this account, ignore this email."
        ),
    )

    sent_at = utc_now().isoformat()

    update_user_fields(
        user["id"],
        last_verification_sent_at=sent_at,
        updated_at=sent_at,
    )


def issue_reset_email(user):
    """Create a hashed, time-limited password-reset token."""
    token = secrets.token_urlsafe(32)
    now = utc_now()
    expiry = now + timedelta(minutes=RESET_EXPIRE_MINUTES)

    update_user_fields(
        user["id"],
        reset_token_hash=hash_token(token),
        reset_expires_at=expiry.isoformat(),
        updated_at=now.isoformat(),
    )

    link = (
        f"{FRONTEND_BASE_URL}/reset-password?"
        f"{urlencode({'token': token})}"
    )

    send_email(
        user["email"],
        "Reset your Case Management Portal password",
        (
            "Hello,\n\n"
            "Use this link to reset your password:\n\n"
            f"{link}\n\n"
            f"This link expires in {RESET_EXPIRE_MINUTES} minutes.\n"
            "If you did not request this, ignore this email."
        ),
    )

def create_account(
    email: str,
    password: str,
    role: str,
    expertise: list[str] | None = None,
    full_name: str = "",
):
    """Create account, save expertise if applicable, then send verification."""
    try:
        user_id = create_user(
            email=email,
            password_hash=password_hash.hash(password),
            role=role,
            email_verified=False,
            is_approved=False,
            full_name=full_name,
        )
    except Exception:
        logger.exception("Account creation failed.")

        if get_user_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered.",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create account.",
        )

    user = get_user_by_email(email)

    if not user:
        logger.error("Created account could not be retrieved.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account was created but could not be retrieved.",
        )

    # Save expertise before sending email. If SMTP is unavailable, the
    # created lawyer still retains their selected expertise.
    if role == "Lawyer" and expertise:
        try:
            save_lawyer_expertise(user_id, expertise)
        except Exception:
            logger.exception("Lawyer expertise could not be saved.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Account was created, but expertise could not be saved. "
                    "Contact the administrator before registering again."
                ),
            )

    try:
        issue_verification_email(user)
    except Exception:
        logger.exception("Verification email delivery failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Account created, but verification email could not be sent. "
                "Use Resend Verification after fixing email delivery."
            ),
        )

    return user


# -------------------- LITIGANT SIGNUP --------------------

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest):
    """Public signup always creates a Litigant account."""
    email = str(data.email).strip().lower()

    if get_user_by_email(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email already registered. Try logging in "
                "or requesting a verification email."
            ),
        )

    create_account(
    email,
    data.password,
    "Litigant",
    full_name=data.full_name.strip(),
)

    return {
        "message": "Account created. Check your email to verify it.",
        "email": email,
        "role": "Litigant",
        "email_verified": False,
        "is_approved": False,
    }


# -------------------- PROFESSIONAL SIGNUP --------------------

@router.post(
    "/signup/professional",
    status_code=status.HTTP_201_CREATED,
)
def professional_signup(data: ProfessionalSignupRequest):
    """
    Register a Lawyer, Judge, or Registrar.
    Professional accounts require email verification and Admin approval.
    Only Lawyers may submit expertise selections.
    """
    email = str(data.email).strip().lower()
    requested_role = data.role.strip().casefold()
    role = PROFESSIONAL_ROLES.get(requested_role)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be Lawyer, Judge, or Registrar.",
        )

    expertise = normalize_lawyer_expertise(data.expertise)

    if role == "Lawyer" and not expertise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select at least one area of lawyer expertise.",
        )

    if role != "Lawyer" and data.expertise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Lawyer accounts can submit expertise selections.",
        )

    if get_user_by_email(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered. Try logging in instead.",
        )

    create_account(
    email,
    data.password,
    role,
    expertise,
    full_name=data.full_name.strip(),
)

    response = {
        "message": (
            "Professional account created. Verify your email and wait "
            "for administrator approval before signing in."
        ),
        "email": email,
        "role": role,
        "email_verified": False,
        "is_approved": False,
    }

    if role == "Lawyer":
        response["expertise"] = expertise

    return response


# -------------------- EMAIL VERIFICATION --------------------

@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest):
    supplied_hash = hash_token(data.token)

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, verification_expires_at, role, is_approved
            FROM users
            WHERE verification_token_hash = ?
            """,
            (supplied_hash,),
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link.",
        )

    expiry = parse_datetime(row["verification_expires_at"])

    if not expiry or expiry <= utc_now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link expired. Request a new one.",
        )

    update_user_fields(
        row["id"],
        email_verified=1,
        verification_token_hash=None,
        verification_expires_at=None,
        updated_at=utc_now().isoformat(),
    )

    role = str(row["role"]).strip().casefold()
    is_professional = role in PROFESSIONAL_ROLES

    return {
        "message": (
            "Email verified. Your account is awaiting administrator approval."
            if is_professional and not row["is_approved"]
            else "Email verified. You can now sign in."
        ),
        "email_verified": True,
        "is_approved": bool(row["is_approved"]),
    }


# -------------------- RESEND VERIFICATION --------------------

@router.post("/resend-verification")
def resend_verification(data: EmailRequest):
    email = str(data.email).strip().lower()
    user = get_user_by_email(email)

    generic = {
        "message": (
            "If the account exists and needs verification, "
            "a verification email will be sent."
        )
    }

    if (
        not user
        or user.get("email_verified", 0)
        or not user.get("is_active", 0)
    ):
        return generic

    last_sent = parse_datetime(user.get("last_verification_sent_at"))

    if (
        last_sent
        and utc_now() - last_sent
        < timedelta(seconds=RESEND_COOLDOWN_SECONDS)
    ):
        return generic

    try:
        issue_verification_email(user)
    except Exception:
        logger.exception("Verification email delivery failed.")

    return generic


# -------------------- FORGOT PASSWORD --------------------

@router.post("/forgot-password")
def forgot_password(data: EmailRequest):
    email = str(data.email).strip().lower()
    user = get_user_by_email(email)

    generic = {
        "message": (
            "If an active account exists for that email, "
            "password-reset instructions will be sent."
        )
    }

    if not user or not user.get("is_active", 0):
        return generic

    try:
        issue_reset_email(user)
    except Exception:
        logger.exception("Password reset email delivery failed.")

    return generic


# -------------------- RESET PASSWORD --------------------

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    supplied_hash = hash_token(data.token)

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, reset_expires_at
            FROM users
            WHERE reset_token_hash = ?
            """,
            (supplied_hash,),
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password-reset link.",
        )

    expiry = parse_datetime(row["reset_expires_at"])

    if not expiry or expiry <= utc_now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password-reset link.",
        )

    new_hash = password_hash.hash(data.new_password)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE users
            SET password_hash = ?,
                reset_token_hash = NULL,
                reset_expires_at = NULL,
                updated_at = ?
            WHERE id = ? AND reset_token_hash = ?
            """,
            (
                new_hash,
                utc_now().isoformat(),
                row["id"],
                supplied_hash,
            ),
        )

        if cursor.rowcount != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or already-used password-reset link.",
            )

    return {
        "message": "Password reset successfully. You can now log in."
    }


# -------------------- LOGIN --------------------

@router.post("/login")
def login(data: LoginRequest):
    user = authenticate_user(str(data.email), data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user["email"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "expires_in": 1800,
    }