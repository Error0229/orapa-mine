"""
User API endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.schemas.user import UserCreate, UserResponse

router = APIRouter()


# In-memory storage for demo
users_store: dict = {}


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate) -> UserResponse:
    """Register a new user."""
    if user_data.username in users_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )

    user = {
        "username": user_data.username,
        "email": user_data.email,
        "display_name": user_data.display_name or user_data.username,
        "games_played": 0,
        "games_won": 0,
        "created_at": datetime.utcnow(),
    }

    users_store[user_data.username] = user

    return UserResponse(**user)


@router.get("/{username}", response_model=UserResponse)
async def get_user(username: str) -> UserResponse:
    """Get user information."""
    if username not in users_store:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(**users_store[username])
