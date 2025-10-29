"""
Game-related models for Orapa Mine.
"""

from enum import Enum

from piccolo.columns import JSON, Boolean, ForeignKey, Integer, Text, Timestamp, Varchar
from piccolo.columns.readable import Readable
from piccolo.table import Table


class GameStatus(str, Enum):
    """Game status enum."""

    WAITING = "waiting"  # Waiting for players
    SETUP = "setup"  # Director is placing pieces
    IN_PROGRESS = "in_progress"  # Game is active
    COMPLETED = "completed"  # Game finished
    CANCELLED = "cancelled"  # Game was cancelled


class PlayerRole(str, Enum):
    """Player role in a game."""

    DIRECTOR = "director"
    EXPLORER = "explorer"


class PieceType(str, Enum):
    """Types of tangram pieces."""

    LARGE_TRIANGLE = "large_triangle"
    MEDIUM_TRIANGLE = "medium_triangle"
    SMALL_TRIANGLE = "small_triangle"
    SQUARE = "square"
    PARALLELOGRAM = "parallelogram"
    PETROLEUM = "petroleum"


class PieceColor(str, Enum):
    """Colors of pieces."""

    RED = "red"
    BLUE = "blue"
    YELLOW = "yellow"
    WHITE = "white"
    TRANSPARENT = "transparent"
    BLACK = "black"


class Game(Table, tablename="games"):
    """
    Main game session table.
    """

    session_id = Varchar(length=50, unique=True, index=True)
    status = Varchar(length=20, default=GameStatus.WAITING.value)  # GameStatus
    current_turn_player = Varchar(length=50, null=True)  # Username of current player
    director_username = Varchar(length=50, null=True)  # Username of director
    max_players = Integer(default=5)
    difficulty = Integer(default=5)  # Number of pieces to place
    created_at = Timestamp()
    started_at = Timestamp(null=True)
    completed_at = Timestamp(null=True)
    winner_username = Varchar(length=50, null=True)

    @classmethod
    def get_readable(cls):
        return Readable(template="%s", columns=[cls.session_id])


class GamePlayer(Table, tablename="game_players"):
    """
    Players in a specific game session.
    """

    game = ForeignKey(Game, on_delete="CASCADE", index=True)
    username = Varchar(length=50, index=True)
    role = Varchar(length=20)  # PlayerRole
    joined_at = Timestamp()
    is_ready = Boolean(default=False)
    turn_order = Integer(null=True)

    @classmethod
    def get_readable(cls):
        return Readable(template="%s - %s", columns=[cls.username, cls.role])


class Piece(Table, tablename="pieces"):
    """
    Available piece types (reference table).
    """

    piece_type = Varchar(length=50, unique=True)  # PieceType
    piece_color = Varchar(length=50)  # PieceColor
    area_cells = Integer()  # Number of cells the piece occupies
    geometry = JSON()  # Piece shape definition (coordinates)
    description = Text(null=True)

    @classmethod
    def get_readable(cls):
        return Readable(template="%s (%s)", columns=[cls.piece_type, cls.piece_color])


class PlacedPiece(Table, tablename="placed_pieces"):
    """
    Pieces placed by the director in a game.
    """

    game = ForeignKey(Game, on_delete="CASCADE", index=True)
    piece_type = Varchar(length=50)  # PieceType
    piece_color = Varchar(length=50)  # PieceColor
    position_x = Integer()  # Grid column (0-9)
    position_y = Integer()  # Grid row (0-7)
    rotation = Integer(default=0)  # 0, 90, 180, 270 degrees
    occupied_cells = JSON()  # List of [x, y] coordinates this piece occupies
    placed_at = Timestamp()

    @classmethod
    def get_readable(cls):
        return Readable(
            template="%s at (%s, %s)", columns=[cls.piece_type, cls.position_x, cls.position_y]
        )


class WaveShot(Table, tablename="wave_shots"):
    """
    Record of elastic wave shots by explorers.
    """

    game = ForeignKey(Game, on_delete="CASCADE", index=True)
    player_username = Varchar(length=50, index=True)
    entry_position = Varchar(length=5)  # e.g., "5", "11", "E", "K"
    exit_position = Varchar(length=5, null=True)  # Where wave exited (or null if absorbed)
    exit_color = Varchar(length=50, null=True)  # Final color of wave
    wave_path = JSON(null=True)  # Complete path the wave took (for visualization)
    shot_at = Timestamp()

    @classmethod
    def get_readable(cls):
        return Readable(
            template="%s -> %s (%s)",
            columns=[cls.entry_position, cls.exit_position, cls.exit_color],
        )
