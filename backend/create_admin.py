from pathlib import Path
from getpass import getpass
import sqlite3
import sys

from dotenv import load_dotenv

# Load the backend's existing environment settings.
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")

# Import only after loading the environment.
sys.path.insert(0, str(PROJECT_DIR))

from backend.auth import password_hash
from backend.database import (
    DATABASE_PATH,
    create_user,
    get_user_by_email,
    get_connection,
    list_users,
)


def main():
    # Refuse to create a second Admin through this setup script.
    users = list_users(limit=500)
    if any(str(u["role"]).casefold() == "admin" for u in users):
        print("An Admin account already exists. No changes made.")
        return

    email = input("Enter the Admin email address: ").strip().lower()
    if not email or "@" not in email:
        print("Please enter a valid email address.")
        return

    if get_user_by_email(email):
        print("That email is already registered. No changes made.")
        print("Use a new email address for the initial Admin account.")
        return

    password = getpass("Create an Admin password (12+ characters): ")
    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return

    confirm = getpass("Confirm Admin password: ")
    if password != confirm:
        print("Passwords do not match. No account created.")
        return

    # Hash the password; never store it in plain text.
    hashed_password = password_hash.hash(password)

    try:
        user_id = create_user(
            email=email,
            password_hash=hashed_password,
            role="Admin",
            email_verified=True,
            is_approved=True,
        )
    except sqlite3.IntegrityError:
        print("Account creation failed because the email already exists.")
        return

    print("\nAdmin account created successfully.")
    print(f"Account ID: {user_id}")
    print("Email verification and Admin approval are enabled.")
    print("Sign in only after the Admin login page is implemented.")


if __name__ == "__main__":
    main()