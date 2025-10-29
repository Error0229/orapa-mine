"""
Pydantic schemas for user-related API models.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Request model for user registration."""
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None


class UserResponse(BaseModel):
    """Response model for user information."""
    username: str
    email: Optional[str]
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
    username: Optional[str] = None
