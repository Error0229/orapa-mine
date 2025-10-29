"""
Game API endpoints.
"""

import secrets
from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.schemas.game import (
    GameCreate,
    GameResponse,
    GameState,
    PlacedPieceInfo,
    PlacePieceRequest,
    PlayerInfo,
    ShootWaveRequest,
    ShootWaveResponse,
    WavePathSegment,
)
from app.services.piece_geometry import PieceType, get_piece_geometry
from app.services.ray_tracer import RayTracer

router = APIRouter()


# In-memory storage for demo (replace with database queries in production)
games_store: dict = {}
game_pieces_store: dict = {}
game_shots_store: dict = {}


@router.post("/", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(game_data: GameCreate) -> GameResponse:
    """Create a new game session."""
    session_id = secrets.token_urlsafe(16)
    created_at = datetime.utcnow()

    game: dict[str, object] = {
        "session_id": session_id,
        "status": "waiting",
        "current_turn_player": None,
        "director_username": None,
        "max_players": game_data.max_players,
        "difficulty": game_data.difficulty,
        "created_at": created_at,
        "started_at": None,
        "completed_at": None,
        "winner_username": None,
        "players": [],
    }

    games_store[session_id] = game
    game_pieces_store[session_id] = []
    game_shots_store[session_id] = []

    return GameResponse(
        session_id=session_id,
        status="waiting",
        current_turn_player=None,
        director_username=None,
        max_players=game_data.max_players,
        difficulty=game_data.difficulty,
        players=[],
        created_at=created_at,
        started_at=None,
        completed_at=None,
        winner_username=None,
    )


@router.get("/{session_id}", response_model=GameResponse)
async def get_game(session_id: str) -> GameResponse:
    """Get game information by session ID."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    return GameResponse(**games_store[session_id])


@router.get("/", response_model=list[GameResponse])
async def list_games() -> list[GameResponse]:
    """List all available games."""
    return [GameResponse(**game) for game in games_store.values()]


@router.post("/{session_id}/join")
async def join_game(session_id: str, username: str, role: str = "explorer") -> dict:
    """Join a game session."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games_store[session_id]

    if game["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")

    if len(game["players"]) >= game["max_players"]:
        raise HTTPException(status_code=400, detail="Game is full")

    # Check if director role is available
    if role == "director":
        if game["director_username"] is not None:
            raise HTTPException(status_code=400, detail="Director role already taken")
        game["director_username"] = username

    player = PlayerInfo(username=username, role=role, is_ready=False, turn_order=None)

    game["players"].append(player.model_dump())

    return {"message": f"Joined game as {role}", "session_id": session_id}


@router.post("/{session_id}/start")
async def start_game(session_id: str) -> dict:
    """Start the game (director places pieces)."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games_store[session_id]

    if game["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")

    if game["director_username"] is None:
        raise HTTPException(status_code=400, detail="No director assigned")

    game["status"] = "setup"
    game["started_at"] = datetime.utcnow()

    return {"message": "Game started - director can now place pieces"}


@router.post("/{session_id}/pieces", status_code=status.HTTP_201_CREATED)
async def place_piece(session_id: str, username: str, piece_data: PlacePieceRequest) -> dict:
    """Place a piece on the board (director only)."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games_store[session_id]

    # Verify director
    if game["director_username"] != username:
        raise HTTPException(status_code=403, detail="Only director can place pieces")

    if game["status"] not in ["setup", "in_progress"]:
        raise HTTPException(status_code=400, detail="Cannot place pieces in current game state")

    # Validate piece type
    try:
        piece_type = PieceType(piece_data.piece_type)
    except ValueError as err:
        # Chain the original ValueError so it's clear this HTTPException was raised
        # because of an invalid piece type input, not an error while handling the
        # exception itself.
        raise HTTPException(
            status_code=400, detail=f"Invalid piece type: {piece_data.piece_type}"
        ) from err

    # Get piece geometry
    piece_geom = get_piece_geometry(piece_type)

    # Check if position is valid
    if piece_data.rotation not in [0, 90, 180, 270]:
        raise HTTPException(status_code=400, detail="Rotation must be 0, 90, 180, or 270")

    # Rotate piece if needed
    if piece_data.rotation > 0:
        piece_geom = piece_geom.rotate(piece_data.rotation)

    # Calculate occupied cells
    occupied_cells = piece_geom.get_occupied_cells((piece_data.position_x, piece_data.position_y))

    # Validate all cells are within grid
    for cell_x, cell_y in occupied_cells:
        if not (0 <= cell_x < 10 and 0 <= cell_y < 8):
            raise HTTPException(status_code=400, detail="Piece extends outside grid")

    # Check for overlaps with existing pieces
    existing_pieces = game_pieces_store[session_id]
    for existing in existing_pieces:
        for cell in occupied_cells:
            if cell in existing["occupied_cells"]:
                raise HTTPException(status_code=400, detail="Piece overlaps with existing piece")

    # Add piece
    placed_piece = {
        "piece_type": piece_data.piece_type,
        "piece_color": piece_data.piece_color,
        "position_x": piece_data.position_x,
        "position_y": piece_data.position_y,
        "rotation": piece_data.rotation,
        "occupied_cells": occupied_cells,
    }

    existing_pieces.append(placed_piece)

    return {"message": "Piece placed successfully", "occupied_cells": occupied_cells}


@router.post("/{session_id}/begin")
async def begin_gameplay(session_id: str) -> dict:
    """Begin gameplay after director finishes placing pieces."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games_store[session_id]

    if game["status"] != "setup":
        raise HTTPException(status_code=400, detail="Game is not in setup phase")

    # Verify required number of pieces are placed
    placed_count = len(game_pieces_store[session_id])
    if placed_count < game["difficulty"]:
        raise HTTPException(
            status_code=400,
            detail=f"Must place {game['difficulty']} pieces (currently {placed_count})",
        )

    game["status"] = "in_progress"

    # Set first turn
    explorers = [p for p in game["players"] if p["role"] == "explorer"]
    if explorers:
        game["current_turn_player"] = explorers[0]["username"]

    return {"message": "Gameplay started - explorers can now shoot waves"}


@router.post("/{session_id}/shoot", response_model=ShootWaveResponse)
async def shoot_wave(
    session_id: str, username: str, wave_data: ShootWaveRequest
) -> ShootWaveResponse:
    """Shoot an elastic wave."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games_store[session_id]

    if game["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Game is not in progress")

    # Build ray tracer with placed pieces
    pieces_data = game_pieces_store[session_id]
    placed_pieces_for_tracer = []

    for piece_data in pieces_data:
        piece_type = PieceType(piece_data["piece_type"])
        piece_geom = get_piece_geometry(piece_type)

        if piece_data["rotation"] > 0:
            piece_geom = piece_geom.rotate(piece_data["rotation"])

        placed_pieces_for_tracer.append(
            (piece_geom, (piece_data["position_x"], piece_data["position_y"]))
        )

    # Trace wave
    tracer = RayTracer(placed_pieces_for_tracer)
    result = tracer.shoot_wave(wave_data.entry_position)

    # Convert path segments
    path_segments = []
    for segment in result.path:
        path_segments.append(
            WavePathSegment(
                start_x=segment.start[0],
                start_y=segment.start[1],
                end_x=segment.end[0],
                end_y=segment.end[1],
                color=str(segment.color.value) if segment.color else "white",
            )
        )

    response = ShootWaveResponse(
        entry_position=result.entry_position,
        exit_position=result.exit_position,
        exit_color=str(result.exit_color.value) if result.exit_color else None,
        path=path_segments,
        reflections=result.reflections,
    )

    # Store shot
    game_shots_store[session_id].append({"username": username, "shot": response.model_dump()})

    return response


@router.get("/{session_id}/state", response_model=GameState)
async def get_game_state(session_id: str, username: str) -> GameState:
    """Get complete game state."""
    if session_id not in games_store:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games_store[session_id]
    is_director = game["director_username"] == username

    # Only director can see placed pieces
    placed_pieces = []
    if is_director:
        for piece_data in game_pieces_store[session_id]:
            placed_pieces.append(PlacedPieceInfo(**piece_data))

    # Get wave shots
    wave_shots = []
    for shot_data in game_shots_store[session_id]:
        wave_shots.append(ShootWaveResponse(**shot_data["shot"]))

    return GameState(
        game_info=GameResponse(**game),
        placed_pieces=placed_pieces,
        wave_shots=wave_shots,
        is_director=is_director,
    )
