"""
Pydantic schemas for user-related API models.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Request model for user registration."""

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr | None = None
    password: str = Field(..., min_length=6)
    display_name: str | None = None


class UserResponse(BaseModel):
    """Response model for user information."""

    username: str
    email: str | None
    display_name: str
    games_played: int
    games_won: int
    created_at: datetime


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data stored in JWT token."""

    username: str | None = None
