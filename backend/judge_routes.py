from datetime import date, time, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.database import get_connection


router = APIRouter(prefix="/judge", tags=["Judge Availability"])

IST = ZoneInfo("Asia/Kolkata")


def get_ist_now() -> datetime:
    return datetime.now(IST)


def get_ist_today() -> date:
    return get_ist_now().date()


def require_judge(user: dict):
    if str(user.get("role", "")).strip().lower() != "judge":
        raise HTTPException(
            status_code=403,
            detail="Only judges can access these judge endpoints.",
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

    import re

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


def format_hearing_range(start: time, end: time) -> str:
    return (
        start.strftime("%I:%M %p")
        + " - "
        + end.strftime("%I:%M %p")
    )


def normalize_id(value):
    return str(value).strip() if value is not None else None


class AvailabilityRequest(BaseModel):
    available_date: date
    start_time: time
    end_time: time


class HearingDecisionRequest(BaseModel):
    decision: str = Field(min_length=1, max_length=20)
    comments: str = Field(default="", max_length=5000)
    modifiedDate: str = ""
    modifiedTime: str = ""


@router.post("/availability")
def add_availability(
    request: AvailabilityRequest,
    current_user: dict = Depends(get_current_user),
):
    require_judge(current_user)

    now = get_ist_now()

    if request.available_date < now.date():
        raise HTTPException(
            status_code=400,
            detail="Availability date cannot be in the past.",
        )

    if request.start_time >= request.end_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be later than start time.",
        )

    if request.available_date == now.date():
        now_time = now.time().replace(tzinfo=None)

        if request.end_time <= now_time:
            raise HTTPException(
                status_code=400,
                detail="Today's availability must end in the future.",
            )

    available_date = request.available_date.isoformat()
    start_time = request.start_time.strftime("%H:%M")
    end_time = request.end_time.strftime("%H:%M")
    user_id = current_user["id"]

    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")

        overlap = connection.execute(
            """
            SELECT id
            FROM judge_availability
            WHERE judge_user_id = ?
              AND available_date = ?
              AND is_active = 1
              AND start_time < ?
              AND end_time > ?
            LIMIT 1
            """,
            (user_id, available_date, end_time, start_time),
        ).fetchone()

        if overlap:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This slot overlaps an existing active "
                    "availability slot."
                ),
            )

        try:
            cursor = connection.execute(
                """
                INSERT INTO judge_availability (
                    judge_user_id,
                    available_date,
                    start_time,
                    end_time,
                    is_active
                )
                VALUES (?, ?, ?, ?, 1)
                """,
                (
                    user_id,
                    available_date,
                    start_time,
                    end_time,
                ),
            )
        except Exception as exc:
            if "UNIQUE constraint failed" in str(exc):
                raise HTTPException(
                    status_code=409,
                    detail="This availability slot already exists.",
                ) from exc
            raise

        return {
            "message": "Availability added successfully.",
            "availability": {
                "id": cursor.lastrowid,
                "available_date": available_date,
                "start_time": start_time,
                "end_time": end_time,
                "is_active": 1,
            },
        }


@router.get("/availability")
def list_availability(
    current_user: dict = Depends(get_current_user),
):
    require_judge(current_user)

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                available_date,
                start_time,
                end_time,
                is_active,
                created_at
            FROM judge_availability
            WHERE judge_user_id = ?
            ORDER BY available_date, start_time
            """,
            (current_user["id"],),
        ).fetchall()

    return {"availability": [dict(row) for row in rows]}


@router.delete("/availability/{availability_id}")
def deactivate_availability(
    availability_id: int,
    current_user: dict = Depends(get_current_user),
):
    require_judge(current_user)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE judge_availability
            SET is_active = 0
            WHERE id = ?
              AND judge_user_id = ?
              AND is_active = 1
            """,
            (availability_id, current_user["id"]),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Active availability slot not found.",
            )

    return {"message": "Availability deactivated successfully."}


@router.post("/cases/{case_id}/hearing-decision")
def submit_hearing_decision(
    case_id: str,
    request: HearingDecisionRequest,
    current_user: dict = Depends(get_current_user),
):
    require_judge(current_user)

    decision_map = {
        "approved": "approved",
        "rejected": "rejected",
        "modified": "modified",
    }

    decision_input = request.decision.strip().lower()

    if decision_input not in decision_map:
        raise HTTPException(
            status_code=400,
            detail="Decision must be Approved, Rejected, or Modified.",
        )

    decision = decision_map[decision_input]
    user_id = current_user["id"]

    modified_date = None
    modified_start = None
    modified_end = None

    # Validate the requested modification before starting a transaction.
    if decision == "modified":
        raw_date = request.modifiedDate.strip()
        raw_time = request.modifiedTime.strip()

        if not raw_date or not raw_time:
            raise HTTPException(
                status_code=400,
                detail=(
                    "A modified hearing date and start time are required."
                ),
            )

        try:
            modified_date = date.fromisoformat(raw_date)

            if modified_date.isoformat() != raw_date:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid modified date. Use YYYY-MM-DD.",
            )

        try:
            if (
                len(raw_time) != 5
                or raw_time[2] != ":"
                or not raw_time[:2].isdigit()
                or not raw_time[3:].isdigit()
            ):
                raise ValueError

            modified_start = time.fromisoformat(raw_time)

            if modified_start.strftime("%H:%M") != raw_time:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid modified time. Use HH:MM, for example 10:30.",
            )

        modified_end_datetime = (
            datetime.combine(modified_date, modified_start)
            + timedelta(hours=1)
        )

        # This prototype supports one-hour hearing slots only.
        if modified_end_datetime.date() != modified_date:
            raise HTTPException(
                status_code=400,
                detail="A one-hour hearing must end on the same date.",
            )

        modified_end = modified_end_datetime.time()

        now = get_ist_now()

        if datetime.combine(
            modified_date, modified_start
        ) <= now.replace(tzinfo=None):
            raise HTTPException(
                status_code=400,
                detail="The modified hearing slot must be in the future.",
            )

    with get_connection() as connection:
        # Serialize decisions and conflict checks before updating a case.
        connection.execute("BEGIN IMMEDIATE")

        case = connection.execute(
            """
            SELECT
                case_id,
                owner_user_id,
                assigned_judge_user_id,
                proposed_hearing_date,
                proposed_hearing_time,
                hearing_decision
            FROM cases
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        if not case:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        if normalize_id(
            case["assigned_judge_user_id"]
        ) != normalize_id(user_id):
            raise HTTPException(
                status_code=403,
                detail="You are not the assigned judge for this case.",
            )

        if (
            not case["proposed_hearing_date"]
            or not case["proposed_hearing_time"]
        ):
            raise HTTPException(
                status_code=400,
                detail="This case does not have a proposed hearing slot.",
            )

        current_decision = str(
            case["hearing_decision"] or "Pending"
        ).strip().lower()

        if current_decision != "pending":
            raise HTTPException(
                status_code=409,
                detail=(
                    "This hearing already has a decision. "
                    "A separate authorized rescheduling workflow "
                    "is required for further changes."
                ),
            )

        if decision == "modified":
            # Confirm that the entire one-hour slot falls within
            # this judge's registered active availability.
            availability = connection.execute(
                """
                SELECT id
                FROM judge_availability
                WHERE judge_user_id = ?
                  AND available_date = ?
                  AND is_active = 1
                  AND start_time <= ?
                  AND end_time >= ?
                LIMIT 1
                """,
                (
                    user_id,
                    modified_date.isoformat(),
                    modified_start.strftime("%H:%M"),
                    modified_end.strftime("%H:%M"),
                ),
            ).fetchone()

            if not availability:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "The modified one-hour slot must fit entirely "
                        "within your registered active availability."
                    ),
                )

            # Reject overlapping active or pending hearings belonging
            # to the same judge. Unknown ranges fail closed.
            other_hearings = connection.execute(
                """
                SELECT
                    case_id,
                    proposed_hearing_date,
                    proposed_hearing_time
                FROM cases
                WHERE assigned_judge_user_id = ?
                  AND case_id != ?
                  AND proposed_hearing_date = ?
                  AND proposed_hearing_date IS NOT NULL
                  AND TRIM(proposed_hearing_date) != ''
                  AND proposed_hearing_time IS NOT NULL
                  AND TRIM(proposed_hearing_time) != ''
                  AND LOWER(COALESCE(hearing_decision, 'pending'))
                      IN ('pending', 'approved', 'modified')
                """,
                (
                    user_id,
                    case_id,
                    modified_date.isoformat(),
                ),
            ).fetchall()

            proposed_start = datetime.combine(
                modified_date, modified_start
            )
            proposed_end = datetime.combine(
                modified_date, modified_end
            )

            for other in other_hearings:
                occupied = parse_hearing_range(
                    other["proposed_hearing_time"]
                )

                if occupied is None:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Another hearing has an unrecognized time "
                            "range. Resolve it before modifying this slot."
                        ),
                    )

                occupied_start = datetime.combine(
                    modified_date, occupied[0]
                )
                occupied_end = datetime.combine(
                    modified_date, occupied[1]
                )

                if (
                    proposed_start < occupied_end
                    and proposed_end > occupied_start
                ):
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "This modified slot overlaps another hearing "
                            "assigned to you."
                        ),
                    )

            final_date = modified_date.isoformat()
            final_time = format_hearing_range(
                modified_start, modified_end
            )
        else:
            final_date = str(case["proposed_hearing_date"]).strip()
            final_time = str(case["proposed_hearing_time"]).strip()

        cursor = connection.execute(
            """
            UPDATE cases
            SET hearing_decision = ?,
                proposed_hearing_date = ?,
                proposed_hearing_time = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE case_id = ?
              AND assigned_judge_user_id = ?
              AND LOWER(COALESCE(hearing_decision, 'pending')) = 'pending'
            """,
            (
                decision,
                final_date,
                final_time,
                case_id,
                user_id,
            ),
        )

        if cursor.rowcount != 1:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The hearing changed while processing your decision. "
                    "Refresh the case and try again."
                ),
            )

        
        # Notify the litigant who owns this case.
        owner_user_id = case["owner_user_id"]

        notification_titles = {
            "approved": "Hearing Approved",
            "modified": "Hearing Modified",
            "rejected": "Hearing Rejected",
        }

        notification_title = notification_titles[decision]

        if decision == "approved":
            notification_message = (
                f"The hearing proposal for case {case_id} "
                f"has been approved by the assigned judge. "
                f"Hearing date: {final_date}. "
                f"Hearing time: {final_time}."
            )
        elif decision == "modified":
            notification_message = (
                f"The hearing proposal for case {case_id} "
                f"has been modified by the assigned judge. "
                f"New hearing date: {final_date}. "
                f"New hearing time: {final_time}."
            )
        else:
            notification_message = (
                f"The hearing proposal for case {case_id} "
                f"has been rejected by the assigned judge."
            )

        connection.execute(
            """
            INSERT INTO notifications (
                user_id,
                case_id,
                title,
                message
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                owner_user_id,
                case_id,
                notification_title,
                notification_message,
            ),
        )


        

    return {
        "success": True,
        "caseId": case_id,
        "decision": decision,
        "hearingDate": final_date,
        "hearingTime": final_time,
        "comments": request.comments.strip(),
        "commentsPersisted": False,
        "message": f"Hearing decision recorded as {decision}.",
    }