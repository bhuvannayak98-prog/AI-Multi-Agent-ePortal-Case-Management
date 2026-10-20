import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / "portal.db"
case_id = "CASE-2026-D5F84A58"

with sqlite3.connect(db_path) as conn:
    conn.row_factory = sqlite3.Row

    case = conn.execute(
        """
        SELECT case_id, owner_user_id, status
        FROM cases
        WHERE case_id = ?
        """,
        (case_id,)
    ).fetchone()

    print("CASE:", dict(case) if case else "NOT FOUND")

    assignments = conn.execute(
        """
        SELECT case_id, lawyer_user_id, assignment_status,
               assignment_method
        FROM case_assignments
        WHERE case_id = ?
        """,
        (case_id,)
    ).fetchall()

    print("ASSIGNMENTS:")
    for row in assignments:
        print(dict(row))

    workflow = conn.execute(
        """
        SELECT case_id, representation_type, workflow_stage
        FROM case_workflows
        WHERE case_id = ?
        """,
        (case_id,)
    ).fetchone()

    print("WORKFLOW:", dict(workflow) if workflow else "NOT FOUND")