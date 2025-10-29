"""
Ray tracing algorithm for elastic wave reflections in Orapa Mine.

Handles wave propagation, reflections, and color mixing.
"""

import math
from dataclasses import dataclass

from app.services.color_mixer import ColorMixer, MineralColor, WaveColor
from app.services.piece_geometry import Edge, PieceColor, PieceGeometry


@dataclass
class Vector2D:
    """2D vector for ray direction."""

    x: float
    y: float

    def normalize(self) -> "Vector2D":
        """Return normalized (unit) vector."""
        length = math.sqrt(self.x**2 + self.y**2)
        if length == 0:
            return Vector2D(0, 0)
        return Vector2D(self.x / length, self.y / length)

    def dot(self, other: "Vector2D") -> float:
        """Dot product with another vector."""
        return self.x * other.x + self.y * other.y

    def reflect(self, normal: "Vector2D") -> "Vector2D":
        """Reflect this vector across a normal."""
        # r = d - 2(d·n)n
        dot_product = self.dot(normal)
        return Vector2D(self.x - 2 * dot_product * normal.x, self.y - 2 * dot_product * normal.y)


@dataclass
class Ray:
    """Represents an elastic wave ray."""

    origin: tuple[float, float]  # (x, y) starting point
    direction: Vector2D  # Direction vector (normalized)
    color: WaveColor  # Current color of the wave


@dataclass
class Intersection:
    """Intersection between ray and edge."""

    point: tuple[float, float]  # Intersection point (x, y)
    distance: float  # Distance from ray origin
    edge: Edge  # The edge that was hit
    piece: PieceGeometry  # The piece this edge belongs to


@dataclass
class WavePathSegment:
    """A segment of the wave's path."""

    start: tuple[float, float]
    end: tuple[float, float]
    color: WaveColor


@dataclass
class WaveResult:
    """Result of shooting an elastic wave."""

    entry_position: str  # Where wave entered (e.g., "5", "A")
    exit_position: str | None  # Where wave exited (or None if absorbed)
    exit_color: WaveColor | None  # Final color (or None if absorbed)
    path: list[WavePathSegment]  # Complete path for visualization
    reflections: int  # Number of reflections


class RayTracer:
    """Handles ray tracing for elastic waves in the mine grid."""

    GRID_WIDTH = 10
    GRID_HEIGHT = 8
    MAX_REFLECTIONS = 100  # Prevent infinite loops

    def __init__(self, placed_pieces: list[tuple[PieceGeometry, tuple[int, int]]]):
        """
        Initialize ray tracer with placed pieces.

        Args:
            placed_pieces: List of (piece_geometry, (x, y) position) tuples
        """
        self.placed_pieces = placed_pieces

    def shoot_wave(self, entry_position: str) -> WaveResult:
        """
        Shoot an elastic wave from an edge position.

        Args:
            entry_position: Entry point (1-18 for numbers, A-R for letters)

        Returns:
            WaveResult with path and exit information
        """
        # Parse entry position and create initial ray
        ray = self._create_entry_ray(entry_position)
        if ray is None:
            raise ValueError(f"Invalid entry position: {entry_position}")

        path_segments: list[WavePathSegment] = []
        current_ray = ray
        reflections = 0

        for _ in range(self.MAX_REFLECTIONS):
            # Find next intersection
            intersection = self._find_nearest_intersection(current_ray)

            if intersection is None:
                # No intersection - ray exits the grid
                exit_point = self._find_grid_exit(current_ray)
                if exit_point:
                    path_segments.append(
                        WavePathSegment(
                            start=current_ray.origin, end=exit_point, color=current_ray.color
                        )
                    )
                    exit_pos = self._point_to_edge_position(exit_point)
                    return WaveResult(
                        entry_position=entry_position,
                        exit_position=exit_pos,
                        exit_color=current_ray.color,
                        path=path_segments,
                        reflections=reflections,
                    )
                break

            # Add path segment to intersection point
            path_segments.append(
                WavePathSegment(
                    start=current_ray.origin, end=intersection.point, color=current_ray.color
                )
            )

            # Mix color with piece
            mineral_color = self._piece_color_to_mineral(intersection.piece.piece_color)
            new_color = ColorMixer.mix_colors(current_ray.color, mineral_color)

            # If absorbed (black petroleum), stop
            if new_color is None:
                return WaveResult(
                    entry_position=entry_position,
                    exit_position=None,
                    exit_color=None,
                    path=path_segments,
                    reflections=reflections,
                )

            # Calculate reflection
            reflected_direction = self._calculate_reflection(
                current_ray.direction, intersection.edge
            )

            # Create new ray from intersection point
            # Offset slightly to avoid re-intersecting the same edge
            epsilon = 0.001
            new_origin = (
                intersection.point[0] + reflected_direction.x * epsilon,
                intersection.point[1] + reflected_direction.y * epsilon,
            )

            current_ray = Ray(origin=new_origin, direction=reflected_direction, color=new_color)
            reflections += 1

        # Max reflections reached - assume absorbed
        return WaveResult(
            entry_position=entry_position,
            exit_position=None,
            exit_color=None,
            path=path_segments,
            reflections=reflections,
        )

    def _create_entry_ray(self, position: str) -> Ray | None:
        """Create initial ray from entry position."""
        position = position.upper()

        # Numbers 1-10: top edge
        if position.isdigit() and 1 <= int(position) <= 10:
            col = int(position) - 1
            return Ray(
                origin=(col + 0.5, 0.0),  # Center of cell at top
                direction=Vector2D(0, 1),  # Downward
                color=WaveColor.WHITE,
            )

        # Numbers 11-18: left edge
        if position.isdigit() and 11 <= int(position) <= 18:
            row = int(position) - 11
            return Ray(
                origin=(0.0, row + 0.5),  # Center of cell at left
                direction=Vector2D(1, 0),  # Rightward
                color=WaveColor.WHITE,
            )

        # Letters A-J: bottom edge
        if position.isalpha() and "A" <= position <= "J":
            col = ord(position) - ord("A")
            return Ray(
                origin=(col + 0.5, self.GRID_HEIGHT),  # Center of cell at bottom
                direction=Vector2D(0, -1),  # Upward
                color=WaveColor.WHITE,
            )

        # Letters K-R: right edge
        if position.isalpha() and "K" <= position <= "R":
            row = ord(position) - ord("K")
            return Ray(
                origin=(self.GRID_WIDTH, row + 0.5),  # Center of cell at right
                direction=Vector2D(-1, 0),  # Leftward
                color=WaveColor.WHITE,
            )

        return None

    def _find_nearest_intersection(self, ray: Ray) -> Intersection | None:
        """Find the nearest intersection between ray and any piece edge."""
        nearest: Intersection | None = None
        min_distance = float("inf")

        for piece, (px, py) in self.placed_pieces:
            for edge in piece.edges:
                # Transform edge coordinates to grid coordinates
                edge_start = (edge.start[0] + px, edge.start[1] + py)
                edge_end = (edge.end[0] + px, edge.end[1] + py)

                # Calculate intersection
                intersection_point = self._ray_edge_intersection(
                    ray.origin, ray.direction, edge_start, edge_end
                )

                if intersection_point:
                    distance = math.sqrt(
                        (intersection_point[0] - ray.origin[0]) ** 2
                        + (intersection_point[1] - ray.origin[1]) ** 2
                    )

                    if distance < min_distance and distance > 0.0001:  # Avoid self-intersection
                        min_distance = distance
                        nearest = Intersection(
                            point=intersection_point, distance=distance, edge=edge, piece=piece
                        )

        return nearest

    def _ray_edge_intersection(
        self,
        ray_origin: tuple[float, float],
        ray_direction: Vector2D,
        edge_start: tuple[float, float],
        edge_end: tuple[float, float],
    ) -> tuple[float, float] | None:
        """
        Calculate intersection between ray and line segment.

        Returns intersection point or None if no intersection.
        """
        x1, y1 = ray_origin
        dx, dy = ray_direction.x, ray_direction.y
        x3, y3 = edge_start
        x4, y4 = edge_end

        # Ray: (x1, y1) + t * (dx, dy)
        # Segment: (x3, y3) + s * (x4-x3, y4-y3)

        denom = dx * (y4 - y3) - dy * (x4 - x3)
        if abs(denom) < 1e-10:  # Parallel
            return None

        t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / denom
        s = ((x3 - x1) * dy - (y3 - y1) * dx) / denom

        if t > 0 and 0 <= s <= 1:  # Intersection ahead on ray and within segment
            return (x1 + t * dx, y1 + t * dy)

        return None

    def _calculate_reflection(self, incident: Vector2D, edge: Edge) -> Vector2D:
        """Calculate reflected ray direction based on edge angle."""
        # Get edge normal vector
        normal = self._edge_normal(edge)

        # Reflect incident direction across normal
        reflected = incident.reflect(normal)
        return reflected.normalize()

    def _edge_normal(self, edge: Edge) -> Vector2D:
        """Calculate normal vector for an edge."""
        # Edge direction
        dx = edge.end[0] - edge.start[0]
        dy = edge.end[1] - edge.start[1]

        # Normal is perpendicular (rotate 90°)
        # For correct reflection, normal should point "outward" from piece
        normal = Vector2D(-dy, dx).normalize()

        return normal

    def _find_grid_exit(self, ray: Ray) -> tuple[float, float] | None:
        """Find where ray exits the grid bounds."""
        x, y = ray.origin
        dx, dy = ray.direction.x, ray.direction.y

        candidates = []

        # Check intersection with each grid boundary
        # Top (y = 0)
        if dy < 0:
            t = -y / dy
            exit_x = x + t * dx
            if 0 <= exit_x <= self.GRID_WIDTH:
                candidates.append((exit_x, 0.0, t))

        # Bottom (y = GRID_HEIGHT)
        if dy > 0:
            t = (self.GRID_HEIGHT - y) / dy
            exit_x = x + t * dx
            if 0 <= exit_x <= self.GRID_WIDTH:
                candidates.append((exit_x, float(self.GRID_HEIGHT), t))

        # Left (x = 0)
        if dx < 0:
            t = -x / dx
            exit_y = y + t * dy
            if 0 <= exit_y <= self.GRID_HEIGHT:
                candidates.append((0.0, exit_y, t))

        # Right (x = GRID_WIDTH)
        if dx > 0:
            t = (self.GRID_WIDTH - x) / dx
            exit_y = y + t * dy
            if 0 <= exit_y <= self.GRID_HEIGHT:
                candidates.append((float(self.GRID_WIDTH), exit_y, t))

        # Return nearest exit
        if candidates:
            candidates.sort(key=lambda c: c[2])  # Sort by t value
            return (candidates[0][0], candidates[0][1])

        return None

    def _point_to_edge_position(self, point: tuple[float, float]) -> str:
        """Convert exit point to edge position label."""
        x, y = point
        epsilon = 0.01

        # Top edge
        if abs(y) < epsilon:
            col = int(x) + 1
            if 1 <= col <= 10:
                return str(col)

        # Bottom edge
        if abs(y - self.GRID_HEIGHT) < epsilon:
            col = int(x)
            if 0 <= col < 10:
                return chr(ord("A") + col)

        # Left edge
        if abs(x) < epsilon:
            row = int(y)
            if 0 <= row < 8:
                return str(11 + row)

        # Right edge
        if abs(x - self.GRID_WIDTH) < epsilon:
            row = int(y)
            if 0 <= row < 8:
                return chr(ord("K") + row)

        return "?"

    def _piece_color_to_mineral(self, piece_color: PieceColor) -> MineralColor:
        """Convert piece color to mineral color enum."""
        color_map = {
            "red": MineralColor.RED,
            "blue": MineralColor.BLUE,
            "yellow": MineralColor.YELLOW,
            "white": MineralColor.WHITE,
            "transparent": MineralColor.TRANSPARENT,
            "black": MineralColor.BLACK,
        }
        return color_map.get(str(piece_color).lower(), MineralColor.TRANSPARENT)
