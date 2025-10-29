"""
Pydantic schemas for game-related API models.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from datetime import datetime


class GameCreate(BaseModel):
    """Request model for creating a new game."""
    max_players: int = Field(default=5, ge=2, le=5)
    difficulty: int = Field(default=5, ge=3, le=14)


class PlayerInfo(BaseModel):
    """Player information in a game."""
    username: str
    role: str  # "director" or "explorer"
    is_ready: bool
    turn_order: Optional[int] = None


class GameResponse(BaseModel):
    """Response model for game information."""
    session_id: str
    status: str
    current_turn_player: Optional[str]
    director_username: Optional[str]
    max_players: int
    difficulty: int
    players: List[PlayerInfo]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    winner_username: Optional[str]


class PlacedPieceInfo(BaseModel):
    """Information about a placed piece."""
    piece_type: str
    piece_color: str
    position_x: int
    position_y: int
    rotation: int
    occupied_cells: List[Tuple[int, int]]


class PlacePieceRequest(BaseModel):
    """Request to place a piece on the board."""
    piece_type: str
    piece_color: str
    position_x: int = Field(ge=0, lt=10)
    position_y: int = Field(ge=0, lt=8)
    rotation: int = Field(default=0, ge=0, lt=360)


class WavePathSegment(BaseModel):
    """A segment of the wave path."""
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    color: str


class ShootWaveRequest(BaseModel):
    """Request to shoot an elastic wave."""
    entry_position: str = Field(
        ...,
        pattern=r"^([1-9]|1[0-8]|[A-R])$",
        description="Entry position: 1-18 (numbers) or A-R (letters)"
    )


class ShootWaveResponse(BaseModel):
    """Response after shooting a wave."""
    entry_position: str
    exit_position: Optional[str]
    exit_color: Optional[str]
    path: List[WavePathSegment]
    reflections: int


class GameState(BaseModel):
    """Complete game state including placed pieces and wave history."""
    game_info: GameResponse
    placed_pieces: List[PlacedPieceInfo] = []
    wave_shots: List[ShootWaveResponse] = []
    is_director: bool = False  # True if requesting user is director
