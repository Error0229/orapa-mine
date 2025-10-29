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

    # Light versions (when white mixes with colors)
    LIGHT_RED = "light_red"
    LIGHT_BLUE = "light_blue"
    LIGHT_YELLOW = "light_yellow"
    LIGHT_VIOLET = "light_violet"
    LIGHT_ORANGE = "light_orange"
    LIGHT_GREEN = "light_green"


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

        # Transparent minerals don't change color
        if mineral_color == MineralColor.TRANSPARENT:
            return wave_color

        # White mineral lightens the color
        if mineral_color == MineralColor.WHITE:
            return ColorMixer._lighten_color(wave_color)

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
    def _lighten_color(color: WaveColor) -> WaveColor:
        """
        Lighten a color when it hits a white mineral.

        Args:
            color: Current wave color

        Returns:
            Lightened version of the color
        """
        lightening_map: dict[WaveColor, WaveColor] = {
            WaveColor.WHITE: WaveColor.WHITE,  # Already light
            WaveColor.RED: WaveColor.LIGHT_RED,
            WaveColor.BLUE: WaveColor.LIGHT_BLUE,
            WaveColor.YELLOW: WaveColor.LIGHT_YELLOW,
            WaveColor.VIOLET: WaveColor.LIGHT_VIOLET,
            WaveColor.ORANGE: WaveColor.LIGHT_ORANGE,
            WaveColor.GREEN: WaveColor.LIGHT_GREEN,
            WaveColor.BLACK: WaveColor.WHITE,  # Black + white = white
            # Light colors stay light
            WaveColor.LIGHT_RED: WaveColor.LIGHT_RED,
            WaveColor.LIGHT_BLUE: WaveColor.LIGHT_BLUE,
            WaveColor.LIGHT_YELLOW: WaveColor.LIGHT_YELLOW,
            WaveColor.LIGHT_VIOLET: WaveColor.LIGHT_VIOLET,
            WaveColor.LIGHT_ORANGE: WaveColor.LIGHT_ORANGE,
            WaveColor.LIGHT_GREEN: WaveColor.LIGHT_GREEN,
        }
        return lightening_map.get(color, color)

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
            # Light colors have the same components as regular colors
            WaveColor.LIGHT_RED: {"red"},
            WaveColor.LIGHT_BLUE: {"blue"},
            WaveColor.LIGHT_YELLOW: {"yellow"},
            WaveColor.LIGHT_VIOLET: {"red", "blue"},
            WaveColor.LIGHT_ORANGE: {"red", "yellow"},
            WaveColor.LIGHT_GREEN: {"blue", "yellow"},
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
            # Light colors (pastel versions)
            WaveColor.LIGHT_RED: "#FFB3B3",
            WaveColor.LIGHT_BLUE: "#B3B3FF",
            WaveColor.LIGHT_YELLOW: "#FFFFB3",
            WaveColor.LIGHT_VIOLET: "#E0B3FF",
            WaveColor.LIGHT_ORANGE: "#FFD9B3",
            WaveColor.LIGHT_GREEN: "#B3FFB3",
        }
        return color_map.get(color, "#FFFFFF")
