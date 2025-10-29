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

    created_at = datetime.utcnow()
    user = {
        "username": user_data.username,
        "email": user_data.email,
        "display_name": user_data.display_name or user_data.username,
        "games_played": 0,
        "games_won": 0,
        "created_at": created_at,
    }

    users_store[user_data.username] = user

    return UserResponse(
        username=user_data.username,
        email=user_data.email,
        display_name=user_data.display_name or user_data.username,
        games_played=0,
        games_won=0,
        created_at=created_at,
    )


@router.get("/{username}", response_model=UserResponse)
async def get_user(username: str) -> UserResponse:
    """Get user information."""
    if username not in users_store:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = users_store[username]
    return UserResponse(
        username=user_data["username"],
        email=user_data["email"],
        display_name=user_data["display_name"],
        games_played=user_data["games_played"],
        games_won=user_data["games_won"],
        created_at=user_data["created_at"],
    )
