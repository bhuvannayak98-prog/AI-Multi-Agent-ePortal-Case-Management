"""Lawyer recommendations and litigant-confirmed assignments."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.database import get_connection

router = APIRouter(prefix="/cases", tags=["Lawyer Matching"])

# Explicit mappings to the expertise labels supported by signup.
CASE_TYPE_EXPERTISE = {
    "civil dispute": ["Civil"],
    "civil appeal": ["Civil"],
    "contract dispute": ["Civil"],
    "property dispute": ["Property", "Civil"],
    "family dispute": ["Family"],
    "divorce": ["Family"],
    "criminal case": ["Criminal"],
    "criminal appeal": ["Criminal"],
    "cybercrime": ["Cybercrime"],
    "cyber crime": ["Cybercrime"],
}


class LawyerChoice(BaseModel):
    lawyerUserId: int = Field(gt=0)
class LawyerDecision(BaseModel):
    decision: str = Field(pattern="^(accept|reject)$")


def require_litigant(user):
    if str(user.get("role", "")).strip().casefold() != "litigant":
        raise HTTPException(
            status_code=403,
            detail="Only the litigant who owns this case can choose a lawyer.",
        )


def require_lawyer(user):
    if str(user.get("role", "")).strip().casefold() != "lawyer":
        raise HTTPException(
            status_code=403,
            detail="Only an authorized lawyer can accept or reject a case.",
        )


def get_owned_case(connection, case_id, user_id):
    case = connection.execute(
        """
        SELECT case_id, case_type, owner_user_id
        FROM cases
        WHERE case_id = ? AND owner_user_id = ?
        """,
        (case_id, user_id),
    ).fetchone()

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    return case


def get_matching_expertise(case_type):
    normalized = str(case_type or "").strip().casefold()
    return CASE_TYPE_EXPERTISE.get(normalized, [str(case_type or "").strip()])


@router.get("/{case_id}/lawyers")
def recommend_lawyers(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    """List active, verified, approved lawyers matching the owner's case."""

    require_litigant(current_user)

    with get_connection() as connection:
        case = get_owned_case(connection, case_id, current_user["id"])
        case_type = str(case["case_type"] or "").strip()
        expertise = get_matching_expertise(case_type)

        if not any(expertise):
            return {
                "caseId": case_id,
                "caseType": case_type,
                "alreadyAssigned": False,
                "lawyers": [],
                "message": "The case type is missing. Please update the case details.",
            }

        placeholders = ",".join("?" for _ in expertise)

        
        rows = connection.execute(
            f"""
            SELECT
                u.id,
                u.email,
                u.full_name,
                GROUP_CONCAT(DISTINCT lct.case_type) AS expertise,
                COUNT(DISTINCT CASE
                    WHEN LOWER(COALESCE(ca.assignment_status, '')) = 'active'
                     AND LOWER(COALESCE(w.representation_type, '')) = 'recommend a lawyer'
                     AND LOWER(COALESCE(w.workflow_stage, ''))
                         IN ('awaiting lawyer approval', 'lawyer assigned')
                    THEN ca.case_id
                END) AS active_cases
            FROM users AS u
            JOIN lawyer_case_types AS lct
                ON lct.lawyer_user_id = u.id
            LEFT JOIN case_assignments AS ca
                ON ca.lawyer_user_id = u.id
            LEFT JOIN case_workflows AS w
                ON w.case_id = ca.case_id
            WHERE LOWER(TRIM(u.role)) = 'lawyer'
              AND u.is_active = 1
              AND u.email_verified = 1
              AND u.is_approved = 1
              AND lct.case_type COLLATE NOCASE IN ({placeholders})
            GROUP BY u.id, u.email, u.full_name
            ORDER BY active_cases ASC, u.id ASC
            """,
            tuple(expertise),
        ).fetchall()


        active_assignment = connection.execute(
            """
            SELECT lawyer_user_id
            FROM case_assignments
            WHERE case_id = ? AND assignment_status = 'Active'
            LIMIT 1
            """,
            (case_id,),
        ).fetchone()

    return {
        "caseId": case_id,
        "caseType": case_type,
        "alreadyAssigned": active_assignment is not None,
        "lawyers": [
            {
                "userId": row["id"],
                "displayName": (
    (row["full_name"] or "").strip()
    or row["email"].split("@")[0]
),
                "expertise": (row["expertise"] or "").split(","),
                "activeCases": row["active_cases"],
            }
            for row in rows
        ],
        "message": (
            None
            if rows
            else (
                "No approved lawyer currently matches this case type. "
                "Please contact the administrator."
            )
        ),
    }


@router.post("/{case_id}/lawyer-assignment", status_code=201)
def choose_lawyer(
    case_id: str,
    choice: LawyerChoice,
    current_user: dict = Depends(get_current_user),
):
    """Assign the lawyer explicitly selected by the case-owning litigant."""

    require_litigant(current_user)

    with get_connection() as connection:
        # Verify that the logged-in litigant owns this case.
        case = get_owned_case(connection, case_id, current_user["id"])
        case_type = str(case["case_type"] or "").strip()
        expertise = get_matching_expertise(case_type)

        if not any(expertise):
            raise HTTPException(
                status_code=422,
                detail="The case type must be set before choosing a lawyer.",
            )

        placeholders = ",".join("?" for _ in expertise)

        # Verify that the selected lawyer is still eligible.
        lawyer = connection.execute(
            f"""
            SELECT u.id
            FROM users AS u
            JOIN lawyer_case_types AS lct
                ON lct.lawyer_user_id = u.id
            WHERE u.id = ?
              AND LOWER(TRIM(u.role)) = 'lawyer'
              AND u.is_active = 1
              AND u.email_verified = 1
              AND u.is_approved = 1
              AND lct.case_type COLLATE NOCASE IN ({placeholders})
            LIMIT 1
            """,
            (choice.lawyerUserId, *expertise),
        ).fetchone()

        if lawyer is None:
            raise HTTPException(
                status_code=422,
                detail="This lawyer is not approved or does not match the case type.",
            )

        # Do not silently replace an existing active assignment.
        active = connection.execute(
            """
            SELECT lawyer_user_id
            FROM case_assignments
            WHERE case_id = ? AND assignment_status = 'Active'
            LIMIT 1
            """,
            (case_id,),
        ).fetchone()

        if active:
            if active["lawyer_user_id"] == choice.lawyerUserId:
                raise HTTPException(
                    status_code=409,
                    detail="This lawyer is already assigned to the case.",
                )

            raise HTTPException(
                status_code=409,
                detail="A lawyer is already assigned. Contact the administrator for reassignment.",
            )

        # Record the assignment without changing case ownership.
        connection.execute(
            """
            INSERT INTO case_assignments (
                case_id,
                lawyer_user_id,
                assigned_by_user_id,
                assignment_method,
                assignment_status
            )
            VALUES (?, ?, ?, 'Litigant Selection', 'Active')
            """,
            (case_id, choice.lawyerUserId, current_user["id"]),
        )

        # Save the representation choice and workflow stage.
        connection.execute(
            """
            INSERT INTO case_workflows (
                case_id,
                representation_type,
                workflow_stage,
                updated_at
            )
            VALUES (
                ?, 'Recommend a Lawyer', 'Awaiting Lawyer Approval',
                CURRENT_TIMESTAMP
            )
            ON CONFLICT(case_id) DO UPDATE SET
                representation_type = 'Recommend a Lawyer',
                workflow_stage = 'Awaiting Lawyer Approval',
                updated_at = CURRENT_TIMESTAMP
            """,
            (case_id,),
        )

        # Notify the selected lawyer about the new assignment.
        connection.execute(
            """
            INSERT INTO notifications (
                user_id,
                case_id,
                title,
                message,
                created_at
            )
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                choice.lawyerUserId,
                case_id,
                "New case assignment",
                f"You have been selected to handle case {case_id}. Please review the assignment and accept or reject it.",
            ),
        )

    return {
        "message": "Lawyer selected and assigned successfully.",
        "caseId": case_id,
        "lawyerUserId": choice.lawyerUserId,
        "assignmentStatus": "Active",
    }

@router.post("/{case_id}/lawyer-decision")
def decide_lawyer_assignment(
    case_id: str,
    decision: LawyerDecision,
    current_user: dict = Depends(get_current_user),
):
    """Allow the assigned lawyer to accept or reject a case."""

    require_lawyer(current_user)

    with get_connection() as connection:
        assignment = connection.execute(
            """
            SELECT id, lawyer_user_id
            FROM case_assignments
            WHERE case_id = ?
              AND lawyer_user_id = ?
              AND assignment_status = 'Active'
            ORDER BY id DESC
            LIMIT 1
            """,
            (case_id, current_user["id"]),
        ).fetchone()

        if assignment is None:
            raise HTTPException(
                status_code=403,
                detail="You do not have an active assignment for this case.",
            )

        workflow = connection.execute(
            """
            SELECT workflow_stage
            FROM case_workflows
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        if workflow is None or workflow["workflow_stage"] not in (
            "Awaiting Lawyer Approval",
            "Lawyer Assigned",
        ):
            raise HTTPException(
                status_code=409,
                detail="This case has already been decided or is not awaiting approval.",
            )

        if decision.decision == "accept":
            new_stage = "Lawyer Assigned"
            message = "You have accepted the case."
        else:
            connection.execute(
                """
                UPDATE case_assignments
                SET assignment_status = 'Revoked'
                WHERE id = ?
                """,
                (assignment["id"],),
            )
            new_stage = "Lawyer Rejected"
            message = "You have rejected the case. The litigant can choose another lawyer."

        connection.execute(
            """
            UPDATE case_workflows
            SET workflow_stage = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE case_id = ?
            """,
            (new_stage, case_id),
        )
        # Notify the litigant when the lawyer decides on the assignment.
        case_owner = connection.execute(
            """
            SELECT owner_user_id
            FROM cases
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        if case_owner is not None:
            notification_title = (
                "Lawyer accepted your case"
                if decision.decision == "accept"
                else "Lawyer rejected your case"
            )

            lawyer_row = connection.execute(
                "SELECT full_name, email FROM users WHERE id = ?",
                (current_user["id"],),
            ).fetchone()

            lawyer_name = (
                (lawyer_row["full_name"] or "").strip()
                if lawyer_row
                else ""
            )

            if not lawyer_name and lawyer_row:
                lawyer_name = lawyer_row["email"].split("@")[0]

            if decision.decision == "accept":
                notification_message = (
                    f"Lawyer {lawyer_name} accepted case {case_id}."
                )
            else:
                notification_message = (
                    f"Lawyer {lawyer_name} rejected case {case_id}. "
                    "You can choose another lawyer."
                )

            connection.execute(
                """
                INSERT INTO notifications (
                    user_id,
                    case_id,
                    title,
                    message,
                    created_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                (
                    case_owner["owner_user_id"],
                    case_id,
                    notification_title,
                    notification_message,
                ),
            )

    return {
        "message": message,
        "caseId": case_id,
        "decision": decision.decision,
        "workflowStage": new_stage,
    }