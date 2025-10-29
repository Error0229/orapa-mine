"""
Color mixing logic for Orapa Mine elastic waves.

Implements additive color mixing when waves reflect off colored minerals.
"""

from enum import Enum


class WaveColor(str, Enum):
    """Colors that elastic waves can have."""

    WHITE = "white"
    RED = "red"
    BLUE = "blue"
    YELLOW = "yellow"
    VIOLET = "violet"  # Red + Blue
    ORANGE = "orange"  # Red + Yellow
    GREEN = "green"  # Blue + Yellow
    BLACK = "black"  # Red + Blue + Yellow or absorbed
    TRANSPARENT = "transparent"  # No color change


class MineralColor(str, Enum):
    """Colors of mineral pieces."""

    RED = "red"
    BLUE = "blue"
    YELLOW = "yellow"
    WHITE = "white"
    TRANSPARENT = "transparent"
    BLACK = "black"  # Petroleum - absorbs light


class ColorMixer:
    """Handles color mixing logic for elastic waves."""

    @staticmethod
    def mix_colors(wave_color: WaveColor, mineral_color: MineralColor) -> WaveColor | None:
        """
        Mix wave color with mineral color.

        Args:
            wave_color: Current color of the wave
            mineral_color: Color of the mineral the wave hits

        Returns:
            New wave color after mixing, or None if wave is absorbed
        """
        # Black petroleum absorbs all light
        if mineral_color == MineralColor.BLACK:
            return None

        # Transparent/white minerals don't change color
        if mineral_color in (MineralColor.TRANSPARENT, MineralColor.WHITE):
            return wave_color

        # Break down current wave color into primary components
        components = ColorMixer._get_color_components(wave_color)

        # Add the mineral color component
        if mineral_color == MineralColor.RED:
            components.add("red")
        elif mineral_color == MineralColor.BLUE:
            components.add("blue")
        elif mineral_color == MineralColor.YELLOW:
            components.add("yellow")

        # Determine resulting color from components
        return ColorMixer._components_to_color(components)

    @staticmethod
    def _get_color_components(color: WaveColor) -> set[str]:
        """
        Break down a color into its primary components (red, blue, yellow).

        Returns:
            Set of primary color component strings
        """
        # Use a dictionary mapping to avoid long if/elif chains (SIM116).
        mapping: dict[WaveColor, set[str]] = {
            WaveColor.WHITE: set(),
            WaveColor.RED: {"red"},
            WaveColor.BLUE: {"blue"},
            WaveColor.YELLOW: {"yellow"},
            WaveColor.VIOLET: {"red", "blue"},
            WaveColor.ORANGE: {"red", "yellow"},
            WaveColor.GREEN: {"blue", "yellow"},
            WaveColor.BLACK: {"red", "blue", "yellow"},
        }

        return mapping.get(color, set())

    @staticmethod
    def _components_to_color(components: set[str]) -> WaveColor:
        """
        Convert primary color components to a wave color.

        Args:
            components: Set of primary colors (red, blue, yellow)

        Returns:
            Resulting wave color
        """
        # Map frozenset of primary components to resulting WaveColor to avoid
        # multiple conditional checks (SIM116).
        mapping: dict[frozenset, WaveColor] = {
            frozenset(): WaveColor.WHITE,
            frozenset({"red"}): WaveColor.RED,
            frozenset({"blue"}): WaveColor.BLUE,
            frozenset({"yellow"}): WaveColor.YELLOW,
            frozenset({"red", "blue"}): WaveColor.VIOLET,
            frozenset({"red", "yellow"}): WaveColor.ORANGE,
            frozenset({"blue", "yellow"}): WaveColor.GREEN,
            frozenset({"red", "blue", "yellow"}): WaveColor.BLACK,
        }

        return mapping.get(frozenset(components), WaveColor.WHITE)

    @staticmethod
    def get_hex_color(color: WaveColor) -> str:
        """
        Get hex color code for display.

        Returns:
            Hex color string (e.g., "#FF0000")
        """
        color_map = {
            WaveColor.WHITE: "#FFFFFF",
            WaveColor.RED: "#FF0000",
            WaveColor.BLUE: "#0000FF",
            WaveColor.YELLOW: "#FFFF00",
            WaveColor.VIOLET: "#8B00FF",
            WaveColor.ORANGE: "#FFA500",
            WaveColor.GREEN: "#00FF00",
            WaveColor.BLACK: "#000000",
            WaveColor.TRANSPARENT: "#FFFFFF00",  # Transparent white
        }
        return color_map.get(color, "#FFFFFF")
