from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
import pytesseract
from PIL import Image
import io


# ============================================================
# TESSERACT OCR PATH
# ============================================================

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI Multi-Agent e-Portal API",
    description="Backend API for case management and hearing prioritization",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CASE MODEL
# ============================================================

class CaseCreate(BaseModel):
    caseType: str
    petitioner: str
    respondent: str
    description: str
    lawSection: str = ""
    filingDate: str = ""
    urgency: str = "Medium"
    documentName: str = ""


# ============================================================
# PRIORITY MODEL
# ============================================================

class PriorityRequest(BaseModel):
    caseType: str
    description: str
    lawSection: str = ""
    filingDate: str = ""
    urgency: str = "Medium"


# ============================================================
# HEARING MODEL
# ============================================================

class HearingRequest(BaseModel):
    priority: str
    preferredDate: str = ""


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "AI Multi-Agent e-Portal Backend is running",
        "status": "success"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ============================================================
# REGISTER CASE
# ============================================================

@app.post("/cases")
def create_case(case: CaseCreate):
    return {
        "message": "Case registered successfully",
        "case": case.model_dump()
    }


# ============================================================
# OCR DOCUMENT EXTRACTION
# ============================================================

@app.post("/ai/ocr")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        image = Image.open(
            io.BytesIO(contents)
        )

        # Convert image to RGB for reliable OCR
        image = image.convert("RGB")

        extracted_text = pytesseract.image_to_string(
            image
        )

        return {
            "filename": file.filename,
            "text": extracted_text,
            "message": "OCR text extracted successfully"
        }

    except Exception as e:
        return {
            "error": str(e)
        }


# ============================================================
# AI PRIORITY SCORING
# ============================================================

@app.post("/ai/priority")
def calculate_priority(request: PriorityRequest):

    # --------------------------------------------------------
    # NORMALIZE INPUT
    # --------------------------------------------------------

    urgency = request.urgency.strip().lower()
    case_type = request.caseType.strip().lower()
    description = request.description.strip().lower()
    law_section = request.lawSection.strip().lower()

    score = 0
    reasons = []
    factors = []

    # --------------------------------------------------------
    # URGENCY SCORE
    #
    # Urgency is the strongest factor.
    # --------------------------------------------------------

    urgency_scores = {
        "low": 25,
        "medium": 50,
        "high": 75,
        "critical": 90
    }

    urgency_score = urgency_scores.get(
        urgency,
        50
    )

    score += urgency_score

    factors.append({
        "factor": "User-selected urgency",
        "value": request.urgency,
        "points": urgency_score
    })

    if urgency == "critical":

        reasons.append(
            "Critical urgency was selected by the user."
        )

    elif urgency == "high":

        reasons.append(
            "High urgency was selected by the user."
        )

    elif urgency == "medium":

        reasons.append(
            "Medium urgency was selected by the user."
        )

    else:

        reasons.append(
            "Low urgency was selected by the user."
        )

    # --------------------------------------------------------
    # CASE TYPE
    # --------------------------------------------------------

    case_type_scores = {
        "criminal": 8,
        "constitutional": 7,
        "family dispute": 6,
        "property dispute": 5,
        "civil appeal": 5,
        "contract dispute": 4,
        "civil": 3
    }

    case_type_score = case_type_scores.get(
        case_type,
        2
    )

    score += case_type_score

    factors.append({
        "factor": "Case type",
        "value": request.caseType,
        "points": case_type_score
    })

    # --------------------------------------------------------
    # KEYWORD ANALYSIS
    # --------------------------------------------------------

    important_keywords = [
        "emergency",
        "urgent",
        "injury",
        "threat",
        "violence",
        "minor",
        "fraud",
        "death",
        "immediate",
        "life threatening",
        "danger",
        "abuse"
    ]

    detected_keywords = []

    for keyword in important_keywords:

        if keyword in description:

            detected_keywords.append(
                keyword
            )

    keyword_score = min(
        len(detected_keywords) * 3,
        12
    )

    score += keyword_score

    if detected_keywords:

        reasons.append(
            "Important case indicators detected: "
            + ", ".join(detected_keywords)
        )

    factors.append({
        "factor": "Important case indicators",
        "value": (
            ", ".join(detected_keywords)
            if detected_keywords
            else "None detected"
        ),
        "points": keyword_score
    })

    # --------------------------------------------------------
    # LEGAL SECTION
    # --------------------------------------------------------

    legal_score = 0

    if law_section:

        legal_score = 3

        score += legal_score

        reasons.append(
            "Applicable legal provision has been provided."
        )

    factors.append({
        "factor": "Applicable law / section",
        "value": (
            request.lawSection
            if request.lawSection
            else "Not provided"
        ),
        "points": legal_score
    })

    # --------------------------------------------------------
    # CASE AGE
    # --------------------------------------------------------

    age_score = 0

    if request.filingDate:

        try:

            filing_date = date.fromisoformat(
                request.filingDate
            )

            today = date.today()

            pending_days = (
                today - filing_date
            ).days

            # Future dates should not produce negative points
            pending_days = max(
                pending_days,
                0
            )

            if pending_days >= 365:

                age_score = 8

                reasons.append(
                    "Case has been pending for more than one year."
                )

            elif pending_days >= 180:

                age_score = 6

                reasons.append(
                    "Case has been pending for more than six months."
                )

            elif pending_days >= 90:

                age_score = 4

                reasons.append(
                    "Case has been pending for more than three months."
                )

            elif pending_days >= 30:

                age_score = 2

                reasons.append(
                    "Case has been pending for more than one month."
                )

            factors.append({
                "factor": "Case age",
                "value": f"{pending_days} days",
                "points": age_score
            })

            score += age_score

        except ValueError:

            factors.append({
                "factor": "Case age",
                "value": "Invalid filing date",
                "points": 0
            })

    else:

        factors.append({
            "factor": "Case age",
            "value": "Filing date not provided",
            "points": 0
        })

    # --------------------------------------------------------
    # LIMIT SCORE
    # --------------------------------------------------------

    score = min(
        score,
        100
    )

    # --------------------------------------------------------
    # PRIORITY LEVEL
    #
    # IMPORTANT:
    # Selected High/Critical urgency cannot become Medium/Low.
    # --------------------------------------------------------

    if urgency == "critical":

        priority = "CRITICAL"

        # Critical should always remain at least 90
        score = max(
            score,
            90
        )

        recommendation = (
            "Immediate priority handling is recommended. "
            "An early hearing slot should be considered."
        )

    elif urgency == "high":

        priority = "HIGH"

        # High should always remain at least 75
        score = max(
            score,
            75
        )

        recommendation = (
            "High-priority handling is recommended. "
            "An early hearing slot should be considered."
        )

    elif urgency == "medium":

        if score >= 70:

            priority = "HIGH"

            recommendation = (
                "Additional case factors have increased "
                "the priority above the regular queue."
            )

        else:

            priority = "MEDIUM"

            recommendation = (
                "Consider scheduling within the "
                "regular hearing queue."
            )

    else:

        if score >= 70:

            priority = "HIGH"

            recommendation = (
                "Additional case factors have increased "
                "the priority."
            )

        elif score >= 45:

            priority = "MEDIUM"

            recommendation = (
                "Consider scheduling within the "
                "regular hearing queue."
            )

        else:

            priority = "LOW"

            recommendation = (
                "Regular scheduling may be appropriate."
            )

    # --------------------------------------------------------
    # FINAL EXPLANATION
    # --------------------------------------------------------

    reasons.insert(
        0,
        f"Final AI priority classification: {priority}."
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "score": score,
        "priority": priority,
        "reasons": reasons,
        "factors": factors,
        "recommendation": recommendation,
        "urgency": request.urgency,
        "agent": "Priority Scoring Agent",
        "humanReviewRequired": True,
        "disclaimer": (
            "AI-generated recommendation. "
            "Final scheduling and judicial decisions "
            "require authorized human review."
        )
    }


# ============================================================
# HEARING SLOT RECOMMENDATION
# ============================================================

@app.post("/ai/schedule")
def recommend_hearing(
    request: HearingRequest
):

    available_slots = [

        {
            "date": "2026-09-28",
            "time": "10:00 AM - 11:00 AM"
        },

        {
            "date": "2026-09-28",
            "time": "02:00 PM - 03:00 PM"
        },

        {
            "date": "2026-09-29",
            "time": "11:00 AM - 12:00 PM"
        },

        {
            "date": "2026-09-30",
            "time": "03:00 PM - 04:00 PM"
        }

    ]

    priority = request.priority.upper()

    # --------------------------------------------------------
    # CRITICAL / HIGH PRIORITY
    # --------------------------------------------------------

    if priority in ["CRITICAL", "HIGH"]:

        recommended_slot = available_slots[0]

        if priority == "CRITICAL":

            reason = (
                "Critical-priority case. "
                "The earliest available hearing slot "
                "is recommended."
            )

        else:

            reason = (
                "High-priority case. "
                "An earlier available hearing slot "
                "is recommended."
            )

    # --------------------------------------------------------
    # MEDIUM PRIORITY
    # --------------------------------------------------------

    elif priority == "MEDIUM":

        recommended_slot = available_slots[1]

        reason = (
            "Medium-priority case. "
            "A regular hearing slot is recommended."
        )

    # --------------------------------------------------------
    # LOW PRIORITY
    # --------------------------------------------------------

    else:

        recommended_slot = available_slots[2]

        reason = (
            "Low-priority case. "
            "A later available hearing slot is recommended."
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "recommendedDate":
            recommended_slot["date"],

        "recommendedTime":
            recommended_slot["time"],

        "priority":
            priority,

        "reason":
            reason,

        "availableSlots":
            available_slots,

        "humanApprovalRequired":
            True

    }


# ============================================================
# PRECEDENT RETRIEVAL AGENT
# ============================================================

PRECEDENTS = [

    {
        "id": "PRE-001",

        "title":
            "Property Dispute and Ownership Rights",

        "caseType":
            "Property Dispute",

        "keywords": [
            "property",
            "ownership",
            "land",
            "possession",
            "dispute",
        ],

        "summary":
            (
                "Precedent related to disputes involving "
                "property ownership, possession and legal rights."
            ),

        "relevance":
            "High",
    },

    {
        "id": "PRE-002",

        "title":
            "Contractual Dispute and Breach of Agreement",

        "caseType":
            "Contract Dispute",

        "keywords": [
            "contract",
            "agreement",
            "breach",
            "payment",
            "contractual",
        ],

        "summary":
            (
                "Precedent concerning contractual obligations, "
                "breach of agreement and disputes between parties."
            ),

        "relevance":
            "High",
    },

    {
        "id": "PRE-003",

        "title":
            "Civil Appeal and Procedural Review",

        "caseType":
            "Civil Appeal",

        "keywords": [
            "appeal",
            "civil",
            "judgment",
            "review",
            "procedure",
        ],

        "summary":
            (
                "Precedent related to civil appeals, review of "
                "lower-court decisions and procedural matters."
            ),

        "relevance":
            "Medium",
    },

    {
        "id": "PRE-004",

        "title":
            "Family Dispute and Legal Rights",

        "caseType":
            "Family Dispute",

        "keywords": [
            "family",
            "marriage",
            "divorce",
            "maintenance",
            "custody",
        ],

        "summary":
            (
                "Precedent concerning family disputes, maintenance, "
                "custody and related legal rights."
            ),

        "relevance":
            "High",
    },

    {
        "id": "PRE-005",

        "title":
            "Criminal Offence and Legal Proceedings",

        "caseType":
            "Criminal",

        "keywords": [
            "criminal",
            "offence",
            "crime",
            "accused",
            "penalty",
            "ipc",
        ],

        "summary":
            (
                "Precedent related to criminal offences, accused "
                "persons and criminal legal proceedings."
            ),

        "relevance":
            "High",
    },

]


# ============================================================
# PRECEDENT RETRIEVAL ENDPOINT
# ============================================================

@app.post("/ai/precedents")
def retrieve_precedents(request: dict):

    case_type = str(
        request.get("caseType", "")
    ).lower()

    description = str(
        request.get("description", "")
    ).lower()

    law_section = str(
        request.get("lawSection", "")
    ).lower()

    query_text = (
        case_type
        + " "
        + description
        + " "
        + law_section
    )

    query_words = set(
        query_text
        .replace(",", " ")
        .replace(".", " ")
        .replace("(", " ")
        .replace(")", " ")
        .split()
    )

    results = []

    for precedent in PRECEDENTS:

        score = 0

        # ----------------------------------------------------
        # CASE TYPE MATCH
        # ----------------------------------------------------

        if (
            case_type
            and case_type
            == precedent["caseType"].lower()
        ):

            score += 5

        # ----------------------------------------------------
        # KEYWORD MATCHING
        # ----------------------------------------------------

        matched_keywords = []

        for keyword in precedent["keywords"]:

            if keyword.lower() in query_words:

                score += 2

                matched_keywords.append(
                    keyword
                )

        # ----------------------------------------------------
        # PHRASE PRESENCE
        # ----------------------------------------------------

        for keyword in precedent["keywords"]:

            if keyword.lower() in query_text:

                if keyword not in matched_keywords:

                    score += 1

                    matched_keywords.append(
                        keyword
                    )

        # ----------------------------------------------------
        # ADD RESULT
        # ----------------------------------------------------

        if score > 0:

            results.append(
                {
                    "id":
                        precedent["id"],

                    "title":
                        precedent["title"],

                    "caseType":
                        precedent["caseType"],

                    "summary":
                        precedent["summary"],

                    "relevance":
                        precedent["relevance"],

                    "matchScore":
                        score,

                    "matchedKeywords":
                        matched_keywords,
                }
            )

    # --------------------------------------------------------
    # SORT RESULTS
    # --------------------------------------------------------

    results.sort(
        key=lambda item: item["matchScore"],
        reverse=True,
    )

    # --------------------------------------------------------
    # TOP 3
    # --------------------------------------------------------

    results = results[:3]

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "query":
            query_text.strip(),

        "agent":
            "Precedent Retrieval Agent",

        "resultsFound":
            len(results),

        "results":
            results,

        "message":
            (
                "Relevant precedents retrieved successfully."
                if results
                else "No matching precedents found."
            ),

        "humanReviewRequired":
            True,

    }