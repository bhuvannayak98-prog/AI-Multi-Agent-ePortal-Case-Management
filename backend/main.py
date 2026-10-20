
import io
import uuid
from datetime import date, datetime, timedelta, time
import re
from zoneinfo import ZoneInfo
from pathlib import Path
from fastapi import status

from dotenv import load_dotenv

# Load environment variables before importing authentication modules.
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

import pytesseract
import pymupdf
from PIL import Image
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.admin_routes import router as admin_router
from backend.judge_routes import router as judge_router
from backend.auth import get_current_user
from backend.auth_routes import router as auth_router
from backend.database import initialize_database, get_connection
from backend.lawyer_routes import router as lawyer_router
# ============================================================
# INDIA STANDARD TIME (IST)
# ============================================================

IST = ZoneInfo("Asia/Kolkata")


def get_ist_now() -> datetime:
    """Return the current date and time in Indian Standard Time."""
    return datetime.now(IST)


def get_ist_today() -> date:
    """Return today's date in Indian Standard Time."""
    return get_ist_now().date()

def is_hearing_expired(case: dict) -> bool:
    """Check whether a scheduled hearing's end time has passed in IST."""
    hearing_date = (
        case.get("proposedHearingDate")
        or case.get("proposed_hearing_date")
        or ""
    )
    hearing_time = (
        case.get("proposedHearingTime")
        or case.get("proposed_hearing_time")
        or ""
    )

    if not hearing_date or not hearing_time:
        return False

    try:
        hearing_day = date.fromisoformat(str(hearing_date).strip())
    except (TypeError, ValueError):
        return False

    match = re.fullmatch(
        r"\s*(.+?)\s*(?:-|–|—|\bto\b)\s*(.+?)\s*",
        str(hearing_time),
        flags=re.IGNORECASE,
    )

    if not match:
        return False

    def parse_clock(value: str) -> time:
        value = value.strip().upper()

        for fmt in ("%I:%M %p", "%I %p", "%H:%M", "%H:%M:%S"):
            try:
                return datetime.strptime(value, fmt).time()
            except ValueError:
                continue

        raise ValueError("Unsupported hearing time")

    try:
        end_time = parse_clock(match.group(2))
    except ValueError:
        return False

    hearing_end = datetime.combine(
        hearing_day,
        end_time,
        tzinfo=IST,
    )

    return get_ist_now() >= hearing_end


# ============================================================
# TESSERACT OCR
# ============================================================

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

initialize_database()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI Multi-Agent e-Portal API",
    description="Backend API for case management and hearing prioritization",
    version="1.2.0",
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(lawyer_router)
app.include_router(judge_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODELS
# ============================================================
def get_case_agent_access(case_id: str, current_user: dict):
    """Return the case and verify the user's access to its AI agents."""
    with get_connection() as connection:
        case = connection.execute(
            """
            SELECT
                c.*,
                u.role AS owner_role,
                w.representation_type,
                w.workflow_stage
            FROM cases c
            JOIN users u ON u.id = c.owner_user_id
            LEFT JOIN case_workflows w ON w.case_id = c.case_id
            WHERE c.case_id = ?
            """,
            (case_id,),
        ).fetchone()

        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        role = str(current_user.get("role", "")).strip().lower()
        user_id = current_user.get("id")
        is_owner = case["owner_user_id"] == user_id

        is_assigned_lawyer = False
        if role == "lawyer":
            assignment = connection.execute(
                """
                SELECT 1
                FROM case_assignments
                WHERE case_id = ?
                  AND lawyer_user_id = ?
                  AND assignment_status = 'Active'
                LIMIT 1
                """,
                (case_id, user_id),
            ).fetchone()
            is_assigned_lawyer = assignment is not None

        representation = str(case["representation_type"] or "Pending")
        stage = str(case["workflow_stage"] or "Registered")
        owner_role = str(case["owner_role"] or "").strip().lower()

        if role == "litigant" and is_owner:
            if representation == "Self-Representation":
                return dict(case), {"ocr", "precedents", "priority", "schedule"}
            raise HTTPException(
                status_code=403,
                detail="AI agents are unavailable when you request a lawyer.",
            )

        if role == "lawyer" and is_owner and owner_role == "lawyer":
            return dict(case), {"ocr", "precedents", "priority", "schedule"}

        if (
            role == "lawyer"
            and is_assigned_lawyer
            and representation == "Recommend a Lawyer"
            and stage == "Lawyer Assigned"
        ):
            return dict(case), {"precedents", "priority", "schedule"}

        raise HTTPException(
            status_code=403,
            detail="You are not authorized to use AI agents for this case.",
        )
class CaseCreate(BaseModel):
    caseType: str
    petitioner: str
    respondent: str
    description: str
    lawSection: str = ""
    filingDate: str = ""
    urgency: str = "Medium"
    documentName: str = ""
    ocrText: str = ""


class PriorityRequest(BaseModel):
    caseId: str
    caseType: str
    description: str
    lawSection: str = ""
    filingDate: str = ""
    urgency: str = "Medium"


class HearingRequest(BaseModel):
    caseId: str
    priority: str


class JudgeHearingDecisionRequest(BaseModel):
    decision: str
    comments: str = ""
    modifiedDate: str = ""
    modifiedTime: str = ""


class PrecedentRequest(BaseModel):
    caseId: str
    caseType: str = ""
    description: str = ""
    lawSection: str = ""


# FIX: This model was missing from the original code.
class RepresentationChoiceRequest(BaseModel):
    representation_type: str


# ============================================================
# CASE RESPONSE HELPER
# ============================================================

def case_row_to_dict(row):
    item = dict(row)

    return {
        "id": item["case_id"],
        "caseId": item["case_id"],
        "caseType": item["case_type"],
        "petitioner": item["petitioner"],
        "respondent": item["respondent"],
        "description": item["description"],
        "lawSection": item["law_section"],
        "filingDate": item["filing_date"],
        "urgency": item["urgency"],
        "documentName": item["document_name"],
        "ocrText": item.get("ocr_text", ""),
        "status": item["status"],
        "createdAt": item["created_at"],
        "updatedAt": item["updated_at"],
        "proposedHearingDate": item.get("proposed_hearing_date", ""),
        "proposedHearingTime": item.get("proposed_hearing_time", ""),
        "hearingDecision": item.get("hearing_decision", "Pending"),
        "assignedJudgeId": item.get("assigned_judge_user_id"),
    }


# ============================================================
# PUBLIC ENDPOINTS
# ============================================================

@app.get("/")
def home():
    return {
        "message": "AI Multi-Agent e-Portal Backend is running",
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ============================================================
# CASE REGISTRATION — AUTHENTICATED AND PERSISTENT
# ============================================================

@app.post("/cases", status_code=201)
def create_case(
    case: CaseCreate,
    current_user: dict = Depends(get_current_user),
):
    for field_name, value in {
        "caseType": case.caseType,
        "petitioner": case.petitioner,
        "respondent": case.respondent,
        "description": case.description,
    }.items():
        if not value.strip():
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} cannot be empty.",
            )

    urgency = case.urgency.strip().capitalize()

    if urgency not in {"Low", "Medium", "High", "Critical"}:
        raise HTTPException(
            status_code=422,
            detail="Urgency must be Low, Medium, High, or Critical.",
        )

    if case.filingDate:
        try:
            date.fromisoformat(case.filingDate)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail="filingDate must use YYYY-MM-DD format.",
            ) from exc

    case_id = (
        f"CASE-{date.today().year}-{uuid.uuid4().hex[:8].upper()}"
    )

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO cases (
                    case_id,
                    owner_user_id,
                    case_type,
                    petitioner,
                    respondent,
                    description,
                    law_section,
                    filing_date,
                    urgency,
                    document_name,
                    status,
                    ocr_text
                )
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    case_id,
                    current_user["id"],
                    case.caseType.strip(),
                    case.petitioner.strip(),
                    case.respondent.strip(),
                    case.description.strip(),
                    case.lawSection.strip(),
                    case.filingDate.strip(),
                    urgency,
                    case.documentName.strip(),
                    "Registered",
                    case.ocrText,
                ),
            )

            row = connection.execute(
                "SELECT * FROM cases WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()

            saved_case = case_row_to_dict(row)

    except Exception as exc:
        print(f"Case registration database error: {exc}")
        raise HTTPException(
            status_code=500,
            detail="The case could not be saved. Please try again.",
        ) from exc

    return {
        "message": "Case registered successfully",
        "case": saved_case,
        "registeredBy": current_user["email"],
    }


# ============================================================
# LIST CASES — ROLE-BASED ACCESS
# ============================================================


@app.get("/cases")
def list_cases(current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role", "")).strip().casefold()
    user_id = current_user["id"]

    with get_connection() as connection:
        if role == "litigant":
            rows = connection.execute(
                """
                SELECT c.*, w.representation_type, w.workflow_stage
                FROM cases c
                LEFT JOIN case_workflows w ON w.case_id = c.case_id
                WHERE c.owner_user_id = ?
                ORDER BY c.created_at DESC, c.id DESC
                """,
                (user_id,),
            ).fetchall()

        
        elif role == "lawyer":
            rows = connection.execute(
                """
                SELECT DISTINCT
                    c.*,
                    w.representation_type,
                    w.workflow_stage
                FROM cases c
                INNER JOIN case_assignments a
                    ON a.case_id = c.case_id
                    AND a.lawyer_user_id = ?
                    AND LOWER(a.assignment_status) = 'active'
                LEFT JOIN case_workflows w
                    ON w.case_id = c.case_id
                WHERE
                    LOWER(COALESCE(w.representation_type, ''))
                        = 'recommend a lawyer'
                    AND LOWER(COALESCE(w.workflow_stage, ''))
                        IN ('awaiting lawyer approval', 'lawyer assigned')
                ORDER BY c.created_at DESC, c.id DESC
                """,
                (user_id,),
            ).fetchall()


        
        elif role == "judge":
            rows = connection.execute(
                """
                SELECT c.*, w.representation_type, w.workflow_stage
                FROM cases c
                LEFT JOIN case_workflows w ON w.case_id = c.case_id
                WHERE c.assigned_judge_user_id = ?
                ORDER BY c.judge_assigned_at DESC, c.id DESC
                """,
                (user_id,),
            ).fetchall()


        else:
            raise HTTPException(
                status_code=403,
                detail="Your role is not permitted to list cases.",
            )

    cases = []

    for row in rows:
        item = case_row_to_dict(row)
        item["representationType"] = row["representation_type"]
        item["workflowStage"] = row["workflow_stage"]
        cases.append(item)

    # Hide expired hearings from active dashboard lists.
    # Database records and documents remain untouched.
    cases = [
        case for case in cases
        if not is_hearing_expired(case)
    ]

    return {"cases": cases, "count": len(cases)}


# ============================================================
# IN-APP NOTIFICATIONS
# ============================================================

# ============================================================
# IN-APP NOTIFICATIONS — PERSISTENT REMINDERS
# ============================================================

@app.get("/notifications")
def list_notifications(
    current_user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, case_id, title, message, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 100
            """,
            (current_user["id"],),
        ).fetchall()

    notifications = [
        {
            "id": row["id"],
            "caseId": row["case_id"],
            "title": row["title"],
            "message": row["message"],
            "createdAt": (
    datetime.fromisoformat(row["created_at"])
    .replace(tzinfo=ZoneInfo("UTC"))
    .astimezone(IST)
    .isoformat()
    if row["created_at"]
    else None
),}
        for row in rows
    ]

    return {
        "notifications": notifications,
        "count": len(notifications),
    }


@app.delete("/notifications")
def clear_notifications(
    current_user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM notifications WHERE user_id = ?",
            (current_user["id"],),
        )

    return {
        "success": True,
        "deletedCount": cursor.rowcount,
        "message": "Notifications cleared successfully.",
    }
# ============================================================
# GET ONE CASE — ROLE-BASED ACCESS
# ============================================================


@app.get("/cases/{case_id}")
def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    role = str(current_user.get("role", "")).strip().casefold()
    user_id = current_user["id"]

    with get_connection() as connection:
        if role == "litigant":
            row = connection.execute(
                """
                SELECT *
                FROM cases
                WHERE case_id = ? AND owner_user_id = ?
                """,
                (case_id, user_id),
            ).fetchone()

        elif role == "lawyer":
            row = connection.execute(
                """
                SELECT DISTINCT c.*
                FROM cases c
                LEFT JOIN case_assignments a
                    ON a.case_id = c.case_id
                    AND a.lawyer_user_id = ?
                    AND a.assignment_status = 'Active'
                WHERE c.case_id = ?
                  AND (c.owner_user_id = ? OR a.id IS NOT NULL)
                """,
                (user_id, case_id, user_id),
            ).fetchone()

        elif role == "judge":
            row = connection.execute(
                """
                SELECT *
                FROM cases
                WHERE case_id = ?
                """,
                (case_id,),
            ).fetchone()

        else:
            raise HTTPException(
                status_code=403,
                detail="Your role is not permitted to access this case.",
            )

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        case_data = case_row_to_dict(row)

        # Confirm ownership using the authenticated user's ID.
        case_data["isCaseOwner"] = (
            str(row["owner_user_id"]) == str(user_id)
        )

        workflow = connection.execute(
            """
            SELECT representation_type, workflow_stage
            FROM case_workflows
            WHERE case_id = ?
            """,
            (case_data["caseId"],),
        ).fetchone()

        case_data["representationType"] = (
            workflow["representation_type"] if workflow else None
        )
        case_data["workflowStage"] = (
            workflow["workflow_stage"] if workflow else None
        )

    return {"case": case_data}



# ============================================================
# REPRESENTATION CHOICE
# ============================================================

@app.post("/cases/{case_id}/representation")
def choose_representation(
    case_id: str,
    request: RepresentationChoiceRequest,
    current_user: dict = Depends(get_current_user),
):
    role = str(current_user.get("role", "")).strip().casefold()

    if role != "litigant":
        raise HTTPException(
            status_code=403,
            detail="Only litigants can choose their representation option.",
        )

    representation = request.representation_type.strip()

    allowed_choices = {
        "Recommend a Lawyer",
        "Self-Representation",
    }

    if representation not in allowed_choices:
        raise HTTPException(
            status_code=400,
            detail=(
                "Choose either 'Recommend a Lawyer' "
                "or 'Self-Representation'."
            ),
        )

    with get_connection() as connection:
        case_row = connection.execute(
            """
            SELECT case_id
            FROM cases
            WHERE case_id = ? AND owner_user_id = ?
            """,
            (case_id, current_user["id"]),
        ).fetchone()

        if case_row is None:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        workflow_stage = (
            "Awaiting Lawyer Selection"
            if representation == "Recommend a Lawyer"
            else "Self-Representation Selected"
        )

        connection.execute(
            """
            INSERT INTO case_workflows (
                case_id,
                representation_type,
                workflow_stage,
                updated_at
            )
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(case_id) DO UPDATE SET
                representation_type = excluded.representation_type,
                workflow_stage = excluded.workflow_stage,
                updated_at = CURRENT_TIMESTAMP
            """,
            (case_id, representation, workflow_stage),
        )

    return {
        "success": True,
        "caseId": case_id,
        "representationType": representation,
        "message": "Representation choice saved successfully.",
    }


# ============================================================
# OCR — AUTHENTICATED
# ============================================================

@app.post("/ai/ocr")
async def extract_text(
    caseId: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _, allowed_agents = get_case_agent_access(caseId, current_user)

    if "ocr" not in allowed_agents:
        raise HTTPException(
            status_code=403,
            detail="OCR is unavailable for this case.",
        )

    allowed_types = {
        "image/png",
        "image/jpeg",
        "image/tiff",
        "image/bmp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Upload a PNG, JPEG, TIFF, or BMP image for OCR.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="The image must be 10 MB or smaller.",
        )

    try:
        with Image.open(io.BytesIO(contents)) as source_image:
            image = source_image.convert("RGB")
            extracted_text = pytesseract.image_to_string(image)

        with get_connection() as connection:
            connection.execute(
                "UPDATE cases SET ocr_text = ?, updated_at = CURRENT_TIMESTAMP WHERE case_id = ?",
                (extracted_text, caseId),
            )

        return {
            "filename": file.filename,
            "text": extracted_text,
            "message": "OCR text extracted and saved successfully",
            "humanReviewRequired": True,
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"OCR processing error: {exc}")
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not process or save the uploaded image. "
                "Check that it is a valid supported image."
            ),
        ) from exc
    


# ============================================================
# PRE-REGISTRATION OCR — AUTHENTICATED CASE INTAKE
# ============================================================


@app.post("/ai/ocr/intake")
async def extract_intake_text(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    role = str(current_user.get("role", "")).strip().lower()

    if role not in {"litigant", "lawyer"}:
        raise HTTPException(
            status_code=403,
            detail="Only litigants and lawyers can process intake documents.",
        )

    filename = file.filename or "uploaded_document"
    extension = Path(filename).suffix.lower()

    allowed_extensions = {
        ".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail="Upload a PDF, PNG, JPEG, TIFF, or BMP document.",
        )

    is_pdf = extension == ".pdf"
    allowed_image_types = {
        "image/png", "image/jpeg", "image/tiff", "image/bmp"
    }

    if not is_pdf and file.content_type not in allowed_image_types:
        raise HTTPException(
            status_code=415,
            detail="The uploaded image format is not supported.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="The document must be 10 MB or smaller.",
        )

    try:
        if is_pdf:
            extracted_pages = []

            with pymupdf.open(stream=contents, filetype="pdf") as pdf:
                if pdf.needs_pass:
                    raise HTTPException(
                        status_code=422,
                        detail="Password-protected PDFs are not supported.",
                    )

                if pdf.page_count == 0:
                    raise HTTPException(
                        status_code=422,
                        detail="The PDF contains no pages.",
                    )

                if pdf.page_count > 30:
                    raise HTTPException(
                        status_code=413,
                        detail="PDFs are limited to 30 pages per upload.",
                    )

                for page_number, page in enumerate(pdf, start=1):
                    page_text = page.get_text().strip()

                    if not page_text:
                        pixmap = page.get_pixmap(
                            matrix=pymupdf.Matrix(2, 2),
                            alpha=False,
                        )
                        image = Image.open(
                            io.BytesIO(pixmap.tobytes("png"))
                        ).convert("RGB")
                        page_text = pytesseract.image_to_string(image).strip()

                    extracted_pages.append(
                        f"--- Page {page_number} ---\n{page_text}"
                    )

            extracted_text = "\n\n".join(extracted_pages).strip()

        else:
            with Image.open(io.BytesIO(contents)) as source_image:
                image = source_image.convert("RGB")
                extracted_text = pytesseract.image_to_string(image).strip()

        if not extracted_text:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No readable text was detected. Upload a clearer document "
                    "or correct the document manually."
                ),
            )

        return {
            "filename": filename,
            "text": extracted_text,
            "message": "Intake document text extraction completed.",
            "humanReviewRequired": True,
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Intake OCR processing error: {exc}")
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not process this document. Check that it is a valid "
                "PDF or supported image and try again."
            ),
        ) from exc

# ============================================================
# PRIORITY SCORING — AUTHENTICATED
# ============================================================




@app.post("/ai/priority")
def calculate_priority(
    request: PriorityRequest,
    current_user: dict = Depends(get_current_user),
):
    
    

    # 1. Authorize access to the registered case.
    case, allowed_agents = get_case_agent_access(
        request.caseId,
        current_user,
    )

    if "priority" not in allowed_agents:
        raise HTTPException(
            status_code=403,
            detail="Priority Agent access denied.",
        )

    # 2. Read authoritative values from the database.
    case_type = str(case.get("case_type") or "").strip()
    description = str(case.get("description") or "").strip()
    law_section = str(case.get("law_section") or "").strip()
    filing_date_text = str(case.get("filing_date") or "").strip()
    ocr_text = str(case.get("ocr_text") or "").strip()
    urgency = str(case.get("urgency") or "").strip().lower()

    urgency_points_map = {
        "low": 0,
        "medium": 15,
        "high": 30,
        "critical": 40,
    }

    if urgency not in urgency_points_map:
        raise HTTPException(
            status_code=422,
            detail=(
                "The registered case has an invalid urgency value. "
                "Update the case urgency before calculating priority."
            ),
        )

    review_flags = []
    reasons = []
    factors = []

    # 3. Flag differences between submitted and registered information.
    supplied_fields = (
        ("case type", request.caseType, case_type),
        ("description", request.description, description),
        ("law section", request.lawSection, law_section),
        ("filing date", request.filingDate, filing_date_text),
    )

    for field_name, supplied, registered in supplied_fields:
        supplied = str(supplied or "").strip()

        if supplied and supplied != registered:
            review_flags.append(
                f"Submitted {field_name} differs from registered data; "
                "registered data was used."
            )

    submitted_urgency = str(request.urgency or "").strip().lower()

    if submitted_urgency and submitted_urgency != urgency:
        review_flags.append(
            "Submitted urgency differs from registered urgency; "
            "registered urgency was used."
        )

    # Maximum score: base 10 + urgency 40 + indicators 30 + age 20.
    raw_score = 10

    factors.append({
        "factor": "Base score",
        "value": "Default starting score",
        "points": 10,
        "explanation": (
            "Every registered case starts at 10 points under this "
            "prototype scoring convention."
        ),
    })

    def add_factor(name, value, points, explanation):
        nonlocal raw_score

        raw_score += points

        factors.append({
            "factor": name,
            "value": value,
            "points": points,
            "explanation": explanation,
        })

        if points > 0:
            reasons.append(explanation)

    # 4. Registered urgency.
    urgency_points = urgency_points_map[urgency]

    add_factor(
        "Registered case urgency",
        urgency.capitalize(),
        urgency_points,
        (
            f"Registered urgency contributes {urgency_points} points. "
            "Authorized human verification is required."
        ),
    )

    # 5. Detect configured indicators in the case description and OCR text.
    # These keyword rules are illustrative, not a legal assessment.
    indicator_groups = {
        "Immediate danger": (
            ("immediate danger", "imminent danger"),
            30,
        ),
        "Life-threatening situation": (
            ("life threatening", "life-threatening"),
            30,
        ),
        "Physical violence": (
            ("physical violence",),
            24,
        ),
        "Serious injury": (
            ("serious injury",),
            24,
        ),
        "Child safety concern": (
            ("child at risk", "child in danger"),
            24,
        ),
        "Medical emergency": (
            ("medical emergency",),
            24,
        ),
        "Imminent eviction": (
            ("imminent eviction",),
            20,
        ),
        "Approaching deadline": (
            ("approaching deadline",),
            16,
        ),
        "Evidence destruction risk": (
            ("risk of evidence destruction",),
            16,
        ),
    }

    source_text = re.sub(
        r"\s+",
        " ",
        f"{description}\n{ocr_text}".casefold(),
    )

    # Ignore phrases inside straight or curly quotation marks.
    quote_pattern = r'“[^”]*”|‘[^’]*’|"[^"]*"|\'[^\']*\''
    unquoted_text = re.sub(quote_pattern, " ", source_text)

    def phrase_is_negated(text, position):
        prefix = text[max(0, position - 100):position]
        context_words = prefix.split()[-10:]
        context = " ".join(context_words)

        negation_terms = (
            "no",
            "not",
            "never",
            "without",
            "denies",
            "denied",
            "ruled out",
            "no evidence of",
            "not experiencing",
        )

        return any(
            context == term or context.endswith(" " + term)
            for term in negation_terms
        )

    detected = []
    uncertain_context = []

    for group_name, (phrases, points) in indicator_groups.items():
        positive_match = False
        negated_match = False

        for phrase in phrases:
            start = 0

            while True:
                position = unquoted_text.find(phrase, start)

                if position == -1:
                    break

                if phrase_is_negated(unquoted_text, position):
                    negated_match = True
                else:
                    positive_match = True

                start = position + len(phrase)

        # Each indicator group contributes at most once.
        if positive_match:
            detected.append((group_name, points))
        elif negated_match:
            uncertain_context.append(group_name)

    indicator_points = min(
        sum(points for _, points in detected),
        30,
    )

    add_factor(
        "Potential urgency indicators",
        [name for name, _ in detected] if detected else "None detected",
        indicator_points,
        (
            f"Configured indicators contribute {indicator_points} points "
            "and require human verification."
            if detected
            else "No configured, unquoted urgency indicators were detected."
        ),
    )

    if detected:
        review_flags.append(
            "Keyword matches may misinterpret meaning, timing, or "
            "legal context and require human review."
        )

    if uncertain_context:
        review_flags.append(
            "Potentially negated indicators require human review: "
            + ", ".join(uncertain_context)
        )

    if ocr_text:
        review_flags.append(
            "OCR-derived text may contain recognition errors; verify "
            "it against the original document."
        )

    if not description and not ocr_text:
        review_flags.append(
            "No case description or OCR text is available for assessment."
        )

    # 6. Filing-age contribution.
    age_points = 0
    age_value = "Filing date unavailable"

    if filing_date_text:
        try:
            filing_day = date.fromisoformat(filing_date_text[:10])
        except (ValueError, TypeError):
            age_value = "Invalid filing date"
            review_flags.append(
                "Registered filing date is invalid; filing age was not scored."
            )
        else:
            today = get_ist_today()

            if filing_day > today:
                age_value = "Future filing date"
                review_flags.append(
                    "Registered filing date is in the future; "
                    "filing age was not scored."
                )
            else:
                pending_days = (today - filing_day).days
                age_value = f"{pending_days} days"

                if pending_days >= 365:
                    age_points = 20
                elif pending_days >= 180:
                    age_points = 16
                elif pending_days >= 90:
                    age_points = 12
                elif pending_days >= 30:
                    age_points = 8
                elif pending_days >= 14:
                    age_points = 4

    add_factor(
        "Time since filing",
        age_value,
        age_points,
        (
            f"Filing-age contribution: {age_points} points. "
            "Age is a scheduling consideration, not proof of urgency."
        ),
    )

    # 7. Calculate the final score and classification.
    score = min(max(int(round(raw_score)), 10), 100)

    # Ensure registered urgency cannot be classified below its floor.
    if urgency == "critical":
        score = max(score, 80)
    elif urgency == "high":
        score = max(score, 60)
    elif urgency == "medium":
        score = max(score, 35)

    score = min(score, 100)

    if score >= 80:
        priority = "CRITICAL"
    elif score >= 60:
        priority = "HIGH"
    elif score >= 35:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    recommendations = {
        "CRITICAL": (
            "Request urgent authorized human review and consideration "
            "of an earlier hearing under applicable rules."
        ),
        "HIGH": (
            "Request authorized review for possible earlier-hearing "
            "consideration under applicable rules."
        ),
        "MEDIUM": (
            "Review alongside applicable deadlines, waiting time, "
            "precedent context, and the authorized hearing queue."
        ),
        "LOW": (
            "Retain in the hearing queue. A low score must not be used "
            "to deny or indefinitely delay a case."
        ),
    }

    reasons.insert(
        0,
        f"Calculated preliminary priority classification: {priority}.",
    )

    # 8. Preserve the response structure expected by the frontend.
    # Precedent retrieval remains in its separate existing endpoint.
    return {
        "caseId": request.caseId,
        "score": score,
        "priority": priority,
        "reasons": reasons,
        "factors": factors,
        "recommendation": recommendations[priority],
        "urgency": urgency.capitalize(),
        "reviewFlags": list(dict.fromkeys(review_flags)),
        "precedents": [],
        "precedentCount": 0,
        "humanReviewRequired": True,
        "agent": "Priority Scoring Agent",
        "scoringVersion": "5.1-prototype",
        "disclaimer": (
            "Experimental rule-based prototype, not a validated legal "
            "priority model. Keyword detection is limited and does not "
            "replace legal reasoning. Results require authorized human "
            "review."
        ),
    }





# ============================================================
# HEARING SCHEDULING — ROUND-ROBIN + PRIORITY-AWARE SLOTS
# ============================================================


@app.post("/ai/schedule")
def recommend_hearing(
    request: HearingRequest,
    current_user: dict = Depends(get_current_user),
):
    # 1. Authorize scheduling access and retrieve registered case data.
    case, allowed_agents = get_case_agent_access(
        request.caseId, current_user
    )

    if "schedule" not in allowed_agents:
        raise HTTPException(
            status_code=403,
            detail="Hearing Scheduling Agent access denied.",
        )

    # Calculate priority from registered data using the existing scorer.
    # Never use request.priority as the authoritative classification.
    priority_request = PriorityRequest(
        caseId=request.caseId,
        caseType=str(case.get("case_type") or ""),
        description=str(case.get("description") or ""),
        lawSection=str(case.get("law_section") or ""),
        filingDate=str(case.get("filing_date") or ""),
        urgency=str(case.get("urgency") or ""),
    )

    priority_result = calculate_priority(
        priority_request,
        current_user,
    )
    priority = str(priority_result["priority"]).strip().upper()

    priority_order = {
        "CRITICAL": 0,
        "HIGH": 1,
        "MEDIUM": 2,
        "LOW": 3,
    }

    if priority not in priority_order:
        raise HTTPException(
            status_code=422,
            detail="Registered case priority could not be determined.",
        )

    def parse_clock(value):
        if not value:
            return None

        value = str(value).strip()

        for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I %p"):
            try:
                return datetime.strptime(value, fmt).time()
            except ValueError:
                continue

        return None

    def parse_hearing_range(value):
        if not value:
            return None

        parts = re.split(
            r"\s*(?:-|–|—|\bto\b)\s*",
            str(value).strip(),
            maxsplit=1,
            flags=re.IGNORECASE,
        )

        if len(parts) != 2:
            return None

        start = parse_clock(parts[0])
        end = parse_clock(parts[1])

        if start is None or end is None or start >= end:
            return None

        return start, end

    def format_range(start, end):
        return (
            start.strftime("%I:%M %p")
            + " - "
            + end.strftime("%I:%M %p")
        )

    def id_key(value):
        return str(value).strip() if value is not None else None

    now = get_ist_now()
    today = now.date()
    now_naive = now.replace(tzinfo=None)

    with get_connection() as connection:
        # Serialize writes before checking and reserving a slot.
        connection.execute("BEGIN IMMEDIATE")

        case_row = connection.execute(
            """
            SELECT case_id,
                   proposed_hearing_date,
                   proposed_hearing_time,
                   hearing_decision,
                   assigned_judge_user_id
            FROM cases
            WHERE case_id = ?
            """,
            (request.caseId,),
        ).fetchone()

        if not case_row:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        existing_date = str(
            case_row["proposed_hearing_date"] or ""
        ).strip()
        existing_time = str(
            case_row["proposed_hearing_time"] or ""
        ).strip()
        existing_decision = str(
            case_row["hearing_decision"] or "Pending"
        ).strip()

        # Preserve existing proposals; do not silently overwrite them.
        if existing_date and existing_time:
            if existing_decision.casefold() == "rejected":
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "This proposal was rejected. Use the explicit "
                        "rescheduling workflow to create another proposal."
                    ),
                )

            return {
                "recommendedDate": existing_date,
                "recommendedTime": existing_time,
                "priority": priority,
                "score": priority_result["score"],
                "reason": "Existing hearing proposal preserved.",
                "availableSlots": [],
                "prototypeSlots": False,
                "humanApprovalRequired": (
                    existing_decision.casefold() == "pending"
                ),
                "decision": existing_decision,
                "assignedJudgeId": case_row[
                    "assigned_judge_user_id"
                ],
                "assignmentStatus": (
                    "Assigned"
                    if case_row["assigned_judge_user_id"] is not None
                    else "Awaiting Judge Assignment"
                ),
                "alreadyScheduled": True,
            }

        if existing_date or existing_time:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The case has an incomplete hearing proposal. "
                    "Resolve its current state before scheduling again."
                ),
            )

        # 2. Load active availability belonging to eligible judges.
        availability_rows = connection.execute(
            """
            SELECT a.id AS availability_id,
                   a.judge_user_id,
                   a.available_date,
                   a.start_time,
                   a.end_time,
                   u.full_name
            FROM judge_availability AS a
            JOIN users AS u ON u.id = a.judge_user_id
            WHERE a.is_active = 1
              AND LOWER(u.role) = 'judge'
              AND u.is_active = 1
              AND u.email_verified = 1
              AND u.is_approved = 1
            ORDER BY a.available_date, a.start_time, u.id
            """
        ).fetchall()

        if not availability_rows:
            raise HTTPException(
                status_code=409,
                detail=(
                    "No eligible judge availability is registered. "
                    "Ask approved judges to register future availability."
                ),
            )

        # 3. Load other hearings that occupy slots.
        existing_hearings = connection.execute(
            """
            SELECT case_id,
                   proposed_hearing_date,
                   proposed_hearing_time,
                   hearing_decision,
                   assigned_judge_user_id
            FROM cases
            WHERE assigned_judge_user_id IS NOT NULL
              AND case_id != ?
              AND proposed_hearing_date IS NOT NULL
              AND TRIM(proposed_hearing_date) != ''
              AND proposed_hearing_time IS NOT NULL
              AND TRIM(proposed_hearing_time) != ''
              AND LOWER(COALESCE(hearing_decision, 'pending'))
                  IN ('pending', 'approved', 'modified')
            """,
            (request.caseId,),
        ).fetchall()

        # 4. Build valid future one-hour slots for each judge.
        slots_by_judge = {}
        judge_names = {}
        judge_original_ids = {}

        for availability in availability_rows:
            judge_id = availability["judge_user_id"]
            key = id_key(judge_id)

            if key is None:
                continue

            judge_original_ids[key] = judge_id
            judge_names[key] = availability["full_name"]

            try:
                slot_date = date.fromisoformat(
                    str(availability["available_date"]).strip()
                )
            except (ValueError, TypeError):
                continue

            available_start = parse_clock(
                availability["start_time"]
            )
            available_end = parse_clock(
                availability["end_time"]
            )

            if (
                available_start is None
                or available_end is None
                or available_start >= available_end
                or slot_date < today
            ):
                continue

            start_minutes = (
                available_start.hour * 60
                + available_start.minute
            )
            end_minutes = (
                available_end.hour * 60
                + available_end.minute
            )

            # Generate one-hour slots aligned to availability start.
            for minute in range(
                start_minutes,
                end_minutes - 60 + 1,
                60,
            ):
                candidate_start = datetime.combine(
                    slot_date,
                    time(minute // 60, minute % 60),
                )
                candidate_end = candidate_start + timedelta(hours=1)

                if candidate_start <= now_naive:
                    continue

                conflict = False

                for hearing in existing_hearings:
                    if (
                        id_key(
                            hearing["assigned_judge_user_id"]
                        ) != key
                        or str(
                            hearing["proposed_hearing_date"]
                        ).strip() != slot_date.isoformat()
                    ):
                        continue

                    occupied = parse_hearing_range(
                        hearing["proposed_hearing_time"]
                    )

                    # Fail closed if an occupied time cannot be parsed.
                    if occupied is None:
                        conflict = True
                        break

                    occupied_start = datetime.combine(
                        slot_date, occupied[0]
                    )
                    occupied_end = datetime.combine(
                        slot_date, occupied[1]
                    )

                    if (
                        candidate_start < occupied_end
                        and candidate_end > occupied_start
                    ):
                        conflict = True
                        break

                if conflict:
                    continue

                slots_by_judge.setdefault(key, []).append({
                    "date": slot_date.isoformat(),
                    "start": candidate_start,
                    "end": candidate_end,
                    "judgeId": judge_original_ids[key],
                    "judgeName": judge_names[key],
                })

        # 5. Identify judges who have usable future slots.
        def sort_id(value):
            return (
                (0, int(value))
                if value.isdigit()
                else (1, value.casefold())
            )

        eligible_judge_keys = sorted(
            (
                key for key, slots in slots_by_judge.items()
                if slots
            ),
            key=sort_id,
        )

        if not eligible_judge_keys:
            raise HTTPException(
                status_code=409,
                detail=(
                    "No suitable future one-hour slot was found in "
                    "registered judge availability. Check future "
                    "availability and conflicting hearings."
                ),
            )

        # 6. Find the most recent judge assignment.
        last_assignment = connection.execute(
            """
            SELECT assigned_judge_user_id
            FROM cases
            WHERE assigned_judge_user_id IS NOT NULL
              AND judge_assigned_at IS NOT NULL
            ORDER BY judge_assigned_at DESC, id DESC
            LIMIT 1
            """
        ).fetchone()

        last_judge_key = (
            id_key(last_assignment["assigned_judge_user_id"])
            if last_assignment
            else None
        )

        # 7. Rotate through all eligible judges, skipping those without
        # usable slots while preserving the round-robin order.
        all_eligible_judges = connection.execute(
            """
            SELECT id
            FROM users
            WHERE LOWER(role) = 'judge'
              AND is_active = 1
              AND email_verified = 1
              AND is_approved = 1
            """
        ).fetchall()

        all_eligible_keys = sorted(
            {
                id_key(row["id"])
                for row in all_eligible_judges
                if id_key(row["id"]) is not None
            },
            key=sort_id,
        )

        if last_judge_key in all_eligible_keys:
            last_index = all_eligible_keys.index(last_judge_key)
            rotated_keys = (
                all_eligible_keys[last_index + 1:]
                + all_eligible_keys[:last_index + 1]
            )
        else:
            rotated_keys = all_eligible_keys

        round_robin_order = [
            key for key in rotated_keys
            if key in slots_by_judge and slots_by_judge[key]
        ]

        for key in eligible_judge_keys:
            if key not in round_robin_order:
                round_robin_order.append(key)

        if not round_robin_order:
            raise HTTPException(
                status_code=409,
                detail=(
                    "No eligible judge and hearing slot could be selected."
                ),
            )

        # 8. Select the judge first, then select the slot according to
        # the authoritative priority classification.
        assigned_judge_key = round_robin_order[0]
        judge_slots = sorted(
            slots_by_judge[assigned_judge_key],
            key=lambda item: (item["start"], item["end"]),
        )

        if priority in ("CRITICAL", "HIGH"):
            recommended_slot = judge_slots[0]

        elif priority == "MEDIUM":
            recommended_slot = judge_slots[len(judge_slots) // 2]

        else:
            recommended_slot = judge_slots[-1]

        assigned_judge_id = judge_original_ids[assigned_judge_key]
        recommended_time = format_range(
            recommended_slot["start"],
            recommended_slot["end"],
        )

        reason = (
            f"{priority} priority case (score {priority_result['score']}) "
            f"assigned to Judge "
            f"{recommended_slot['judgeName'] or assigned_judge_id} "
            "using round-robin selection. The proposed one-hour slot "
            "fits registered availability and avoids known overlapping "
            "hearings. Judge approval is required."
        )

        # 9. Persist only if the case remains unscheduled.
        cursor = connection.execute(
            """
            UPDATE cases
            SET proposed_hearing_date = ?,
                proposed_hearing_time = ?,
                hearing_decision = 'Pending',
                assigned_judge_user_id = ?,
                judge_assigned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE case_id = ?
              AND (
                    proposed_hearing_date IS NULL
                    OR TRIM(proposed_hearing_date) = ''
              )
              AND (
                    proposed_hearing_time IS NULL
                    OR TRIM(proposed_hearing_time) = ''
              )
              AND assigned_judge_user_id IS NULL
            """,
            (
                recommended_slot["date"],
                recommended_time,
                assigned_judge_id,
                request.caseId,
            ),
        )

        if cursor.rowcount != 1:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The case changed while scheduling. Refresh the case "
                    "and review its current state before retrying."
                ),
            )

        # 10. Notify the assigned judge in the same transaction.
        connection.execute(
            """
            INSERT INTO notifications (user_id, case_id, title, message)
            VALUES (?, ?, ?, ?)
            """,
            (
                assigned_judge_id,
                request.caseId,
                "New hearing proposal assigned",
                (
                    f"Case {request.caseId} ({priority} priority, "
                    f"score {priority_result['score']}) has a proposed "
                    f"hearing on {recommended_slot['date']} at "
                    f"{recommended_time}. Please review the proposal."
                ),
            ),
        )

        # 11. Return alternative slots for the assigned judge only.
        available_slots = [
            {
                "date": item["date"],
                "time": format_range(item["start"], item["end"]),
                "judgeId": item["judgeId"],
                "judgeName": item["judgeName"],
            }
            for item in judge_slots
            if (
                item["date"] != recommended_slot["date"]
                or item["start"] != recommended_slot["start"]
            )
        ][:10]

    return {
        "recommendedDate": recommended_slot["date"],
        "recommendedTime": recommended_time,
        "priority": priority,
        "score": priority_result["score"],
        "reason": reason,
        "availableSlots": available_slots,
        "prototypeSlots": False,
        "humanApprovalRequired": True,
        "decision": "Pending",
        "assignedJudgeId": assigned_judge_id,
        "assignedJudgeName": recommended_slot["judgeName"],
        "assignmentStatus": "Assigned",
        "alreadyScheduled": False,
        "disclaimer": (
            "This is a proposed schedule based on registered portal "
            "availability, not a verified official court calendar. "
            "A judge must approve the proposal."
        ),
    }


# ============================================================
# PROTOTYPE PRECEDENT KNOWLEDGE SOURCE
# These records are examples, not verified court judgments.
# ============================================================

PRECEDENTS = [
    {
        "id": "PRE-001",
        "title": "Property Dispute and Ownership Rights",
        "caseType": "Property Dispute",
        "keywords": [
            "property", "ownership", "land", "possession", "dispute",
        ],
        "summary": (
            "Sample record concerning property ownership, possession "
            "and legal rights."
        ),
        "relevance": "High",
    },
    {
        "id": "PRE-002",
        "title": "Contractual Dispute and Breach of Agreement",
        "caseType": "Contract Dispute",
        "keywords": [
            "contract", "agreement", "breach", "payment", "contractual",
        ],
        "summary": (
            "Sample record concerning contractual obligations and "
            "breach of agreement."
        ),
        "relevance": "High",
    },
    {
        "id": "PRE-003",
        "title": "Civil Appeal and Procedural Review",
        "caseType": "Civil Appeal",
        "keywords": [
            "appeal", "civil", "judgment", "review", "procedure",
        ],
        "summary": (
            "Sample record concerning civil appeals and procedural matters."
        ),
        "relevance": "Medium",
    },
    {
        "id": "PRE-004",
        "title": "Family Dispute and Legal Rights",
        "caseType": "Family Dispute",
        "keywords": [
            "family", "marriage", "divorce", "maintenance", "custody",
        ],
        "summary": (
            "Sample record concerning family disputes and related rights."
        ),
        "relevance": "High",
    },
    {
        "id": "PRE-005",
        "title": "Criminal Offence and Legal Proceedings",
        "caseType": "Criminal",
        "keywords": [
            "criminal", "offence", "crime", "accused", "penalty", "ipc",
        ],
        "summary": (
            "Sample record concerning criminal offences and proceedings."
        ),
        "relevance": "High",
    },
]


# ============================================================
# PRECEDENT RETRIEVAL — AUTHENTICATED
# ============================================================

@app.post("/ai/precedents")
def retrieve_precedents(
    request: PrecedentRequest,
    current_user: dict = Depends(get_current_user),
):
    # Preserve existing case-level authorization.
    _, allowed_agents = get_case_agent_access(
        request.caseId, current_user
    )

    if "precedents" not in allowed_agents:
        raise HTTPException(
            status_code=403,
            detail="Precedent Retrieval Agent access denied.",
        )

    case_type = request.caseType.strip().lower()
    description = request.description.strip().lower()
    law_section = request.lawSection.strip().lower()
    query_text = f"{case_type} {description} {law_section}".strip()

    query_words = set(
        query_text.replace(",", " ")
        .replace(".", " ")
        .replace("(", " ")
        .replace(")", " ")
        .split()
    )

    # Search only the separate precedent knowledge table.
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT
                id,
                title,
                citation,
                court,
                decision_date,
                case_type,
                law_sections,
                summary,
                full_text,
                source_url,
                verification_status,
                keywords
            FROM precedent_documents
            WHERE is_active = 1
              AND verification_status IN ('sample', 'verified')
        """).fetchall()

 
    results = []

    # Ignore common words that can cause unrelated records to match.
    generic_terms = {
        "dispute", "case", "legal", "rights", "regarding",
        "and", "the", "of", "in", "for", "with", "about",
        "related", "concerning", "matter", "matters",
    }

    for row in rows:
        precedent = dict(row)

        keywords = [
            word.strip().lower()
            for word in precedent["keywords"].split(",")
            if word.strip()
        ]

        score = 0
        matched_keywords = []

        # Exact case-type matches receive the strongest boost.
        if case_type and case_type == precedent["case_type"].lower():
            score += 5

        # Match meaningful stored keywords against the query.
        for keyword in keywords:
            if keyword in generic_terms:
                continue

            if keyword in query_words:
                score += 2
                matched_keywords.append(keyword)
            elif keyword in query_text:
                score += 1
                matched_keywords.append(keyword)

        # Search document text, excluding generic words.
        searchable_text = (
            precedent["title"] + " "
            + precedent["summary"] + " "
            + precedent["full_text"] + " "
            + precedent["law_sections"]
        ).lower()

        for word in query_words:
            if len(word) < 4 or word in generic_terms:
                continue

            if word in searchable_text:
                score += 1

        # Return only records with meaningful relevance.
        if score > 0:
            results.append({
                "id": f"PRE-{precedent['id']:03d}",
                "title": precedent["title"],
                "caseType": precedent["case_type"],
                "summary": precedent["summary"],
                "relevance": (
                    "High" if score >= 5
                    else "Medium" if score >= 2
                    else "Low"
                ),
                "matchScore": score,
                "matchedKeywords": sorted(set(matched_keywords)),
                "citation": precedent["citation"],
                "court": precedent["court"],
                "decisionDate": precedent["decision_date"],
                "sourceUrl": precedent["source_url"],
                "verificationStatus": precedent["verification_status"],
            })

    results.sort(
        key=lambda item: item["matchScore"],
        reverse=True,
    )
    results = results[:3]

    return {
        "query": query_text,
        "agent": "Precedent Retrieval Agent",
        "resultsFound": len(results),
        "results": results,
        "message": (
            "Matching database records retrieved."
            if results
            else "No matching precedent records found."
        ),
        "humanReviewRequired": True,
        "disclaimer": (
            "The knowledge source may contain sample records, not verified "
            "legal precedents. Verify legal authorities independently."
        ),
    }