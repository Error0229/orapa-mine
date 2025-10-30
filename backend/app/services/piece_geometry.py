"""
Piece geometry definitions for Orapa Mine tangram pieces.

Each piece is defined by its vertices in a coordinate system where:
- Origin (0, 0) is at the top-left corner of the piece's bounding box
- X-axis increases to the right
- Y-axis increases downward
- Each unit represents one grid cell
"""

import math
from dataclasses import dataclass
from enum import Enum


class PieceType(str, Enum):
    """Types of tangram pieces."""

    LARGE_TRIANGLE_1 = "large_triangle_1"
    LARGE_TRIANGLE_2 = "large_triangle_2"
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


@dataclass
class Edge:
    """
    Represents an edge of a piece.

    Attributes:
        start: Starting point (x, y)
        end: Ending point (x, y)
        angle: Angle of the edge in degrees (0=horizontal right, 90=down, 180=left, 270=up)
        is_diagonal: True if edge is at 45° or 135°, False if 0°, 90°, 180°, or 270°
    """

    start: tuple[float, float]
    end: tuple[float, float]
    angle: float
    is_diagonal: bool


@dataclass
class PieceGeometry:
    """
    Geometry definition for a tangram piece.

    Attributes:
        piece_type: Type identifier
        piece_color: Color of the piece
        vertices: List of (x, y) coordinates defining the piece shape
        area: Number of grid cells the piece occupies
        edges: List of edges with reflection properties
        rotation: Current rotation in degrees (0, 90, 180, 270)
    """

    piece_type: PieceType
    piece_color: PieceColor
    vertices: list[tuple[float, float]]
    area: int
    edges: list[Edge]
    rotation: int = 0

    def get_occupied_cells(self, position: tuple[int, int]) -> list[tuple[int, int]]:
        """
        Calculate which grid cells this piece occupies when placed at position.

        Args:
            position: (x, y) grid position where piece is placed

        Returns:
            List of (x, y) cell coordinates occupied by this piece
        """
        occupied = []
        # Get bounding box
        min_x = min(v[0] for v in self.vertices)
        max_x = max(v[0] for v in self.vertices)
        min_y = min(v[1] for v in self.vertices)
        max_y = max(v[1] for v in self.vertices)

        # Check each cell in bounding box
        for y in range(int(min_y), int(math.ceil(max_y))):
            for x in range(int(min_x), int(math.ceil(max_x))):
                # Check if cell center is inside polygon
                cell_center = (x + 0.5, y + 0.5)
                if self._point_in_polygon(cell_center):
                    occupied.append((position[0] + x, position[1] + y))

        return occupied

    def _point_in_polygon(self, point: tuple[float, float]) -> bool:
        """Check if a point is inside the polygon using ray casting algorithm."""
        x, y = point
        n = len(self.vertices)
        inside = False

        p1x, p1y = self.vertices[0]
        for i in range(1, n + 1):
            p2x, p2y = self.vertices[i % n]
            if y > min(p1y, p2y) and y <= max(p1y, p2y) and x <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or x <= xinters:
                    inside = not inside
            p1x, p1y = p2x, p2y

        return inside

    def rotate(self, degrees: int) -> "PieceGeometry":
        """
        Rotate the piece by specified degrees (90, 180, 270).

        Returns:
            New PieceGeometry with rotated coordinates
        """
        rad = math.radians(degrees)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)

        # Rotate vertices around origin
        rotated_vertices = []
        for x, y in self.vertices:
            new_x = x * cos_a - y * sin_a
            new_y = x * sin_a + y * cos_a
            rotated_vertices.append((new_x, new_y))

        # Rotate edges
        rotated_edges = []
        for edge in self.edges:
            start_x = edge.start[0] * cos_a - edge.start[1] * sin_a
            start_y = edge.start[0] * sin_a + edge.start[1] * cos_a
            end_x = edge.end[0] * cos_a - edge.end[1] * sin_a
            end_y = edge.end[0] * sin_a + edge.end[1] * cos_a

            new_angle = (edge.angle + degrees) % 360

            rotated_edges.append(
                Edge(
                    start=(start_x, start_y),
                    end=(end_x, end_y),
                    angle=new_angle,
                    is_diagonal=edge.is_diagonal,
                )
            )

        return PieceGeometry(
            piece_type=self.piece_type,
            piece_color=self.piece_color,
            vertices=rotated_vertices,
            area=self.area,
            edges=rotated_edges,
            rotation=(self.rotation + degrees) % 360,
        )


def create_large_triangle(color: PieceColor) -> PieceGeometry:
    """
    Create a large isosceles right triangle.
    - Hypotenuse (long side): 4 cells, aligned with grid
    - Two equal legs: 2√2 ≈ 2.828 cells each
    - Height: 2 cells
    - Area: 4 cells
    - Right angle at top-left, hypotenuse along bottom

    Shape (hypotenuse aligned horizontally):
        |\
        | \
        |__\
        4 cells wide, 2 cells tall
    """
    vertices = [
        (0.0, 0.0),  # Top-left (right angle)
        (0.0, 2.0),  # Bottom-left
        (4.0, 0.0),  # Top-right (hypotenuse along bottom when rotated)
    ]

    edges = [
        Edge((0.0, 0.0), (0.0, 2.0), angle=270, is_diagonal=False),  # Left vertical leg
        Edge((0.0, 2.0), (4.0, 0.0), angle=45, is_diagonal=True),  # Hypotenuse (45°)
        Edge((4.0, 0.0), (0.0, 0.0), angle=180, is_diagonal=False),  # Top horizontal leg
    ]

    return PieceGeometry(
        piece_type=PieceType.LARGE_TRIANGLE_1
        if color == PieceColor.WHITE
        else PieceType.LARGE_TRIANGLE_2,
        piece_color=color,
        vertices=vertices,
        area=4,
        edges=edges,
    )


def create_medium_triangle() -> PieceGeometry:
    """
    Create a medium isosceles right triangle.
    - Two equal legs: 2 cells each
    - Hypotenuse: 2√2 ≈ 2.828 cells
    - Area: 2 cells
    - Right angle at origin

    Shape (isosceles right triangle):
        |\
        | \
        |__\
        2 × 2 cells
    """
    vertices = [
        (0.0, 0.0),  # Right angle corner
        (0.0, 2.0),  # Top of vertical leg
        (2.0, 0.0),  # End of horizontal leg
    ]

    edges = [
        Edge((0.0, 0.0), (0.0, 2.0), angle=270, is_diagonal=False),  # Left vertical leg
        Edge((0.0, 2.0), (2.0, 0.0), angle=135, is_diagonal=True),  # Hypotenuse (45°)
        Edge((2.0, 0.0), (0.0, 0.0), angle=180, is_diagonal=False),  # Bottom horizontal leg
    ]

    return PieceGeometry(
        piece_type=PieceType.MEDIUM_TRIANGLE,
        piece_color=PieceColor.YELLOW,
        vertices=vertices,
        area=2,
        edges=edges,
    )


def create_small_triangle() -> PieceGeometry:
    """
    Create a small isosceles right triangle.
    - Hypotenuse (long side): 2 cells, aligned with grid
    - Two equal legs: √2 ≈ 1.414 cells each
    - Height: 1 cell
    - Area: 1 cell
    - Right angle at top-left, hypotenuse along bottom

    Shape (hypotenuse aligned horizontally):
        |\
        |_\
        2 cells wide, 1 cell tall
    """
    vertices = [
        (0.0, 0.0),  # Top-left (right angle)
        (0.0, 1.0),  # Bottom-left
        (2.0, 0.0),  # Top-right (hypotenuse along bottom when rotated)
    ]

    edges = [
        Edge((0.0, 0.0), (0.0, 1.0), angle=270, is_diagonal=False),  # Left vertical leg
        Edge((0.0, 1.0), (2.0, 0.0), angle=45, is_diagonal=True),  # Hypotenuse (45°)
        Edge((2.0, 0.0), (0.0, 0.0), angle=180, is_diagonal=False),  # Top horizontal leg
    ]

    return PieceGeometry(
        piece_type=PieceType.SMALL_TRIANGLE,
        piece_color=PieceColor.TRANSPARENT,
        vertices=vertices,
        area=1,
        edges=edges,
    )


def create_square() -> PieceGeometry:
    r"""
    Create a square rotated 45° (appears as diamond).
    - Each side: √2 cells
    - Area: 2 cells
    - Center-aligned on grid

    Shape (rotated 45°):
         /\
        <  >
         \/
    """
    # Square with side √2 rotated 45° fits in 2x2 grid, centered
    # Vertices form a diamond
    math.sqrt(2)  # Side length
    vertices = [
        (1.0, 0.0),  # Top
        (2.0, 1.0),  # Right
        (1.0, 2.0),  # Bottom
        (0.0, 1.0),  # Left
    ]

    edges = [
        Edge((1.0, 0.0), (2.0, 1.0), angle=45, is_diagonal=True),  # Top-right
        Edge((2.0, 1.0), (1.0, 2.0), angle=135, is_diagonal=True),  # Bottom-right
        Edge((1.0, 2.0), (0.0, 1.0), angle=225, is_diagonal=True),  # Bottom-left
        Edge((0.0, 1.0), (1.0, 0.0), angle=315, is_diagonal=True),  # Top-left
    ]

    return PieceGeometry(
        piece_type=PieceType.SQUARE,
        piece_color=PieceColor.WHITE,
        vertices=vertices,
        area=2,
        edges=edges,
    )


def create_parallelogram() -> PieceGeometry:
    """
    Create a parallelogram.
    - Base: 2 cells
    - Height: 1 cell
    - Area: 2 cells
    - Bottom aligns with grid

    Shape:
         __
        /__/
    """
    vertices = [
        (0.0, 0.0),  # Top-left
        (1.0, 0.0),  # Top-right (shifted)
        (2.0, 1.0),  # Bottom-right
        (1.0, 1.0),  # Bottom-left
    ]

    edges = [
        Edge((0.0, 0.0), (1.0, 0.0), angle=0, is_diagonal=False),  # Top horizontal
        Edge((1.0, 0.0), (2.0, 1.0), angle=45, is_diagonal=True),  # Right diagonal
        Edge((2.0, 1.0), (1.0, 1.0), angle=180, is_diagonal=False),  # Bottom horizontal
        Edge((1.0, 1.0), (0.0, 0.0), angle=135, is_diagonal=True),  # Left diagonal
    ]

    return PieceGeometry(
        piece_type=PieceType.PARALLELOGRAM,
        piece_color=PieceColor.RED,
        vertices=vertices,
        area=2,
        edges=edges,
    )


def create_petroleum() -> PieceGeometry:
    """
    Create petroleum block (rectangle).
    - Dimensions: 1 cell × 2 cells
    - Area: 2 cells
    - Absorbs all light

    Shape:
        __
        ||
        ||
    """
    vertices = [
        (0.0, 0.0),  # Top-left
        (1.0, 0.0),  # Top-right
        (1.0, 2.0),  # Bottom-right
        (0.0, 2.0),  # Bottom-left
    ]

    edges = [
        Edge((0.0, 0.0), (1.0, 0.0), angle=0, is_diagonal=False),  # Top
        Edge((1.0, 0.0), (1.0, 2.0), angle=90, is_diagonal=False),  # Right
        Edge((1.0, 2.0), (0.0, 2.0), angle=180, is_diagonal=False),  # Bottom
        Edge((0.0, 2.0), (0.0, 0.0), angle=270, is_diagonal=False),  # Left
    ]

    return PieceGeometry(
        piece_type=PieceType.PETROLEUM,
        piece_color=PieceColor.BLACK,
        vertices=vertices,
        area=2,
        edges=edges,
    )


def get_piece_geometry(piece_type: PieceType) -> PieceGeometry:
    """Get the geometry definition for a specific piece type."""
    pieces_map = {
        PieceType.LARGE_TRIANGLE_1: create_large_triangle(PieceColor.WHITE),
        PieceType.LARGE_TRIANGLE_2: create_large_triangle(PieceColor.BLUE),
        PieceType.MEDIUM_TRIANGLE: create_medium_triangle(),
        PieceType.SMALL_TRIANGLE: create_small_triangle(),
        PieceType.SQUARE: create_square(),
        PieceType.PARALLELOGRAM: create_parallelogram(),
        PieceType.PETROLEUM: create_petroleum(),
    }
    return pieces_map[piece_type]


def get_all_pieces() -> list[PieceGeometry]:
    """Get all available piece geometries."""
    return [
        create_large_triangle(PieceColor.WHITE),
        create_large_triangle(PieceColor.BLUE),
        create_medium_triangle(),
        create_small_triangle(),
        create_square(),
        create_parallelogram(),
        create_petroleum(),
    ]
