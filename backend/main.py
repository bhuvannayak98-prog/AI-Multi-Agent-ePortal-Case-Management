from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import authenticate_user, create_access_token


# Create FastAPI application
app = FastAPI(
    title="AI Multi-Agent e-Court",
    description="AI-powered case management and hearing prioritization system",
    version="1.0.0"
)


# --------------------------------------------------
# CORS Configuration
# Allows React frontend to communicate with FastAPI
# --------------------------------------------------

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


# --------------------------------------------------
# Login Request Model
# --------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


# --------------------------------------------------
# Home / Health Check
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "AI Multi-Agent e-Court API is running!"
    }


# --------------------------------------------------
# Login API
# --------------------------------------------------

@app.post("/login")
def login(request: LoginRequest):

    # Verify email and password
    user = authenticate_user(
        request.email,
        request.password
    )

    # If credentials are incorrect
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate JWT access token
    access_token = create_access_token(
        email=user["email"],
        role=user["role"]
    )

    # Return login response
    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "role": user["role"]
        }
    }