"""
API routes for Orapa Mine.
"""

from fastapi import APIRouter

from app.api import game, user

api_router = APIRouter()

api_router.include_router(game.router, prefix="/games", tags=["games"])
api_router.include_router(user.router, prefix="/users", tags=["users"])

__all__ = ["api_router"]
