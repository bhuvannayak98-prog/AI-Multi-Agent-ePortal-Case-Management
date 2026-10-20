import sqlite3
from pathlib import Path

# Keep the existing database in the backend folder.
DATABASE_PATH = Path(__file__).resolve().parent / "portal.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    """Create missing tables and safely add missing user columns."""
    with get_connection() as connection:
        # Preserve the existing users table and accounts.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'Litigant',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)


        # Store precedent knowledge records separately from private case records.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS precedent_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                citation TEXT NOT NULL DEFAULT '',
                court TEXT NOT NULL DEFAULT '',
                decision_date TEXT NOT NULL DEFAULT '',
                case_type TEXT NOT NULL DEFAULT '',
                law_sections TEXT NOT NULL DEFAULT '',
                summary TEXT NOT NULL DEFAULT '',
                full_text TEXT NOT NULL DEFAULT '',
                source_url TEXT NOT NULL DEFAULT '',
                verification_status TEXT NOT NULL DEFAULT 'sample'
                    CHECK (
                        verification_status IN (
                            'sample',
                            'pending_verification',
                            'verified',
                            'rejected'
                        )
                    ),
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Add searchable keywords to existing precedent tables safely.
        precedent_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(precedent_documents)"
            ).fetchall()
        }

        if "keywords" not in precedent_columns:
            connection.execute("""
                ALTER TABLE precedent_documents
                ADD COLUMN keywords TEXT NOT NULL DEFAULT ''
            """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_precedent_case_type
            ON precedent_documents(case_type)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_precedent_status
            ON precedent_documents(verification_status, is_active)
        """)
 

    # Add authentication columns only when missing.
        existing_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(users)"
            ).fetchall()
        }

        new_columns = {
            "full_name": "TEXT NOT NULL DEFAULT ''",
            "email_verified": "INTEGER NOT NULL DEFAULT 0",
            "is_approved": "INTEGER NOT NULL DEFAULT 0",
            "verification_token_hash": "TEXT",
            "verification_expires_at": "TEXT",
            "reset_token_hash": "TEXT",
            "reset_expires_at": "TEXT",
            "last_verification_sent_at": "TEXT",
            "updated_at": "TEXT",
        }

        for column_name, column_definition in new_columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE users ADD COLUMN "
                    f"{column_name} {column_definition}"
                )

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email
            ON users(email)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_approval
            ON users(is_approved, email_verified, is_active)
        """)

        # Persist cases under their authenticated owner.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL UNIQUE,
                owner_user_id INTEGER NOT NULL,
                case_type TEXT NOT NULL,
                petitioner TEXT NOT NULL,
                respondent TEXT NOT NULL,
                description TEXT NOT NULL,
                law_section TEXT NOT NULL DEFAULT '',
                filing_date TEXT NOT NULL DEFAULT '',
                urgency TEXT NOT NULL DEFAULT 'Medium',
                document_name TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Registered',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT,
                FOREIGN KEY (owner_user_id)
                    REFERENCES users(id)
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_cases_owner
            ON cases(owner_user_id, created_at)
        """)
         # Store extracted OCR text so authorized users can reuse it.
        existing_case_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(cases)"
            ).fetchall()
        }

        if "ocr_text" not in existing_case_columns:
            connection.execute(
                "ALTER TABLE cases ADD COLUMN ocr_text TEXT NOT NULL DEFAULT ''"
            )

                    # Store the AI-proposed hearing slot and its approval status.
        hearing_columns = {
            "proposed_hearing_date": "TEXT NOT NULL DEFAULT ''",
            "proposed_hearing_time": "TEXT NOT NULL DEFAULT ''",
            "hearing_decision": "TEXT NOT NULL DEFAULT 'Pending'",
        }

        for column_name, column_definition in hearing_columns.items():
            if column_name not in existing_case_columns:
                connection.execute(
                    f"ALTER TABLE cases ADD COLUMN "
                    f"{column_name} {column_definition}"
                )

    
        # Store the judge assigned to review each hearing proposal.
        if "assigned_judge_user_id" not in existing_case_columns:
            connection.execute(
                "ALTER TABLE cases ADD COLUMN assigned_judge_user_id INTEGER"
            )

        if "judge_assigned_at" not in existing_case_columns:
            connection.execute(
                "ALTER TABLE cases ADD COLUMN judge_assigned_at TEXT"
            )

        # Store in-app notifications for authenticated users.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                case_id TEXT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_user
            ON notifications(user_id, is_read, created_at)
        """)


        # Track representation choice and workflow progress.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS case_workflows (
                case_id TEXT PRIMARY KEY,
                representation_type TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (
                        representation_type IN (
                            'Pending',
                            'Recommend a Lawyer',
                            'Self-Representation'
                        )
                    ),
                workflow_stage TEXT NOT NULL DEFAULT 'Registered',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id)
                    REFERENCES cases(case_id)
                    ON DELETE CASCADE
            )
        """)

        # Store the case types each lawyer supports.
        # These records must be set through a validated API later.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS lawyer_case_types (
                lawyer_user_id INTEGER NOT NULL,
                case_type TEXT NOT NULL COLLATE NOCASE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (lawyer_user_id, case_type),
                FOREIGN KEY (lawyer_user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_lawyer_case_types_type
            ON lawyer_case_types(case_type, lawyer_user_id)
        """)

        # Record lawyer assignments without changing case ownership.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS case_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                lawyer_user_id INTEGER NOT NULL,
                assigned_by_user_id INTEGER,
                assignment_method TEXT NOT NULL DEFAULT 'Automatic',
                assignment_status TEXT NOT NULL DEFAULT 'Active'
                    CHECK (
                        assignment_status IN (
                            'Active',
                            'Reassigned',
                            'Revoked'
                        )
                    ),
                assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id)
                    REFERENCES cases(case_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (lawyer_user_id)
                    REFERENCES users(id),
                FOREIGN KEY (assigned_by_user_id)
                    REFERENCES users(id)
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_case_assignments_lawyer
            ON case_assignments(lawyer_user_id, assignment_status)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_case_assignments_case
            ON case_assignments(case_id, assignment_status)
        """)

        # Persist judge decisions and keep their history.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS judge_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                judge_user_id INTEGER NOT NULL,
                decision TEXT NOT NULL
                    CHECK (
                        decision IN ('Approve', 'Modify', 'Reject')
                    ),
                comments TEXT NOT NULL DEFAULT '',
                modified_recommendation TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id)
                    REFERENCES cases(case_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (judge_user_id)
                    REFERENCES users(id)
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_judge_reviews_case
            ON judge_reviews(case_id, created_at)
        """)

        
        # Store judge-entered availability for prototype scheduling.
        # These are not official court-calendar records.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS judge_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                judge_user_id INTEGER NOT NULL,
                available_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (judge_user_id)
                    REFERENCES users(id) ON DELETE CASCADE,
                CHECK (start_time < end_time),
                UNIQUE (
                    judge_user_id,
                    available_date,
                    start_time,
                    end_time
                )
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_judge_availability_lookup
            ON judge_availability (
                judge_user_id,
                available_date,
                is_active
            )
        """)



def get_user_by_email(email: str):
    normalized_email = email.strip().lower()

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE email = ?",
            (normalized_email,)
        ).fetchone()

        return dict(row) if row else None


def get_user_by_id(user_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        return dict(row) if row else None



def create_user(
    email: str,
    password_hash: str,
    role: str = "Litigant",
    email_verified: bool = False,
    is_approved: bool = False,
    full_name: str = "",
):
    """Create a user while preserving compatibility with existing callers."""
    normalized_email = email.strip().lower()
    normalized_name = full_name.strip()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (
                email,
                password_hash,
                role,
                email_verified,
                is_approved,
                full_name
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                normalized_email,
                password_hash,
                role,
                int(email_verified),
                int(is_approved),
                normalized_name,
            )
        )

        return cursor.lastrowid

    """Create a user; public signup should always use the Litigant role."""
    normalized_email = email.strip().lower()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (
                email,
                password_hash,
                role,
                email_verified,
                is_approved
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                normalized_email,
                password_hash,
                role,
                int(email_verified),
                int(is_approved),
            )
        )

        return cursor.lastrowid


def update_user_fields(user_id: int, **fields):
    """Update only explicitly permitted account fields."""
    allowed_fields = {
        "role",
        "is_active",
        "email_verified",
        "is_approved",
        "verification_token_hash",
        "verification_expires_at",
        "reset_token_hash",
        "reset_expires_at",
        "last_verification_sent_at",
        "updated_at",
    }

    if not fields:
        return False

    invalid_fields = set(fields) - allowed_fields
    if invalid_fields:
        raise ValueError(
            f"Unsupported user fields: {', '.join(sorted(invalid_fields))}"
        )

    assignments = ", ".join(
        f"{field} = ?" for field in fields
    )
    values = list(fields.values())

    with get_connection() as connection:
        cursor = connection.execute(
            f"UPDATE users SET {assignments} WHERE id = ?",
            (*values, user_id)
        )

        return cursor.rowcount > 0


def list_users(limit: int = 100, offset: int = 0):
    """Return account information without password hashes or tokens."""
    limit = max(1, min(int(limit), 500))
    offset = max(0, int(offset))

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                email,
                role,
                is_active,
                email_verified,
                is_approved,
                created_at,
                updated_at
            FROM users
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        ).fetchall()

        return [dict(row) for row in rows]

    
def seed_sample_precedents():
    """Seed prototype records once; these are not verified legal authorities."""
    samples = [
        {
            "id": "PRE-001",
            "title": "Property Dispute and Ownership Rights",
            "case_type": "Property Dispute",
            "keywords": "property, ownership, land, possession, dispute",
            "summary": "Sample record concerning property ownership, possession and legal rights.",
        },
        {
            "id": "PRE-002",
            "title": "Contractual Dispute and Breach of Agreement",
            "case_type": "Contract Dispute",
            "keywords": "contract, agreement, breach, payment, contractual",
            "summary": "Sample record concerning contractual obligations and breach of agreement.",
        },
        {
            "id": "PRE-003",
            "title": "Civil Appeal and Procedural Review",
            "case_type": "Civil Appeal",
            "keywords": "appeal, civil, judgment, review, procedure",
            "summary": "Sample record concerning civil appeals and procedural matters.",
        },
        {
            "id": "PRE-004",
            "title": "Family Dispute and Legal Rights",
            "case_type": "Family Dispute",
            "keywords": "family, marriage, divorce, maintenance, custody",
            "summary": "Sample record concerning family disputes and related rights.",
        },
        {
            "id": "PRE-005",
            "title": "Criminal Offence and Legal Proceedings",
            "case_type": "Criminal",
            "keywords": "criminal, offence, crime, accused, penalty, ipc",
            "summary": "Sample record concerning criminal offences and proceedings.",
        },
    ]

    with get_connection() as connection:
        for item in samples:
            existing = connection.execute(
                """
                SELECT id FROM precedent_documents
                WHERE title = ? AND verification_status = 'sample'
                LIMIT 1
                """,
                (item["title"],),
            ).fetchone()

            if existing:
                connection.execute(
                    """
                    UPDATE precedent_documents
                    SET case_type = ?, keywords = ?, summary = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (
                        item["case_type"],
                        item["keywords"],
                        item["summary"],
                        existing["id"],
                    ),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO precedent_documents (
                        title, case_type, keywords, summary,
                        verification_status, is_active
                    )
                    VALUES (?, ?, ?, ?, 'sample', 1)
                    """,
                    (
                        item["title"],
                        item["case_type"],
                        item["keywords"],
                        item["summary"],
                    ),
                )

            
        # Store judge availability for the prototype scheduling system.
        # Availability records are entered by judges; they are not
        # official court-calendar data.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS judge_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                judge_user_id INTEGER NOT NULL,
                available_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (judge_user_id)
                    REFERENCES users(id) ON DELETE CASCADE,
                CHECK (start_time < end_time),
                UNIQUE (
                    judge_user_id,
                    available_date,
                    start_time,
                    end_time
                )
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_judge_availability_lookup
            ON judge_availability (
                judge_user_id,
                available_date,
                is_active
            )
        """)