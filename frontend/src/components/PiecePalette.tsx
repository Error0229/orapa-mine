import { useState } from "react";
import "./PiecePalette.css";

export interface PieceDefinition {
  type: string;
  color: string;
  displayName: string;
  vertices: [number, number][];
  area: number;
}

interface PiecePaletteProps {
  difficulty: number;
  onPieceSelect: (piece: PieceDefinition | null) => void;
  selectedPiece: PieceDefinition | null;
  placedPieces: Array<{ type: string; color: string }>;
}

// Piece definitions matching backend geometry
export const PIECE_DEFINITIONS: PieceDefinition[] = [
  {
    type: "large_triangle_1",
    color: "white",
    displayName: "Large Triangle (White)",
    vertices: [
      [0, 0],
      [2, 2],
      [4, 0],
    ], // Hypotenuse along bottom (4 cells wide, 2 cells tall)
    area: 4,
  },
  {
    type: "large_triangle_2",
    color: "blue",
    displayName: "Large Triangle (Blue)",
    vertices: [
      [0, 0],
      [2, 2],
      [4, 0],
    ], // Hypotenuse along bottom (4 cells wide, 2 cells tall)
    area: 4,
  },
  {
    type: "medium_triangle",
    color: "yellow",
    displayName: "Medium Triangle (Yellow)",
    vertices: [
      [0, 0],
      [0, 2],
      [2, 0],
    ], // Legs aligned with grid (2x2 cells)
    area: 2,
  },
  {
    type: "small_triangle",
    color: "transparent",
    displayName: "Small Triangle (Transparent)",
    vertices: [
      [0, 0],
      [1, 1],
      [2, 0],
    ], // Hypotenuse along bottom (2 cells wide, 1 cell tall)
    area: 1,
  },
  {
    type: "square",
    color: "white",
    displayName: "Square (White)",
    vertices: [
      [1, 0],
      [2, 1],
      [1, 2],
      [0, 1],
    ],
    area: 2,
  },
  {
    type: "parallelogram",
    color: "red",
    displayName: "Parallelogram (Red)",
    vertices: [
      [0, 0],
      [2, 0],
      [1, 1],
      [-1, 1],
    ],
    area: 2,
  },
  {
    type: "petroleum",
    color: "black",
    displayName: "Petroleum Block (Black)",
    vertices: [
      [0, 0],
      [1, 0],
      [1, 2],
      [0, 2],
    ],
    area: 2,
  },
];

const COLOR_MAP: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
  white: "#f1f5f9",
  transparent: "#94a3b8",
  black: "#0f172a",
};

function PiecePalette({
  difficulty,
  onPieceSelect,
  selectedPiece,
  placedPieces,
}: PiecePaletteProps) {
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);

  const isPiecePlaced = (piece: PieceDefinition) => {
    return placedPieces.some(
      (p) => p.type === piece.type && p.color === piece.color
    );
  };

  const canPlaceMorePieces = placedPieces.length < difficulty;

  const renderPiecePreview = (piece: PieceDefinition, scale: number = 15) => {
    const vertices = piece.vertices;
    const minX = Math.min(...vertices.map((v) => v[0]));
    const maxX = Math.max(...vertices.map((v) => v[0]));
    const minY = Math.min(...vertices.map((v) => v[1]));
    const maxY = Math.max(...vertices.map((v) => v[1]));

    const width = (maxX - minX) * scale;
    const height = (maxY - minY) * scale;
    const offsetX = -minX * scale;
    const offsetY = -minY * scale;

    const pathData =
      vertices
        .map((v, i) => {
          const x = v[0] * scale + offsetX;
          const y = v[1] * scale + offsetY;
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ") + " Z";

    return (
      <svg
        width={width + 10}
        height={height + 10}
        style={{ display: "block", margin: "0 auto" }}
      >
        <path
          d={pathData}
          fill={COLOR_MAP[piece.color]}
          stroke="#64748b"
          strokeWidth="2"
          opacity={piece.color === "transparent" ? 0.3 : 0.9}
        />
      </svg>
    );
  };

  return (
    <div className="piece-palette">
      <div className="palette-header">
        <h3>Piece Palette</h3>
        <div className="piece-counter">
          {placedPieces.length} / {difficulty} pieces placed
        </div>
      </div>

      <div className="pieces-grid">
        {PIECE_DEFINITIONS.map((piece) => {
          const isPlaced = isPiecePlaced(piece);
          const isSelected =
            selectedPiece?.type === piece.type &&
            selectedPiece?.color === piece.color;
          const isHovered = hoveredPiece === `${piece.type}-${piece.color}`;

          return (
            <div
              key={`${piece.type}-${piece.color}`}
              className={`piece-card ${isPlaced ? "placed" : ""} ${
                isSelected ? "selected" : ""
              } ${isHovered ? "hovered" : ""}`}
              onClick={() => {
                if (!isPlaced && canPlaceMorePieces) {
                  onPieceSelect(isSelected ? null : piece);
                }
              }}
              onMouseEnter={() =>
                setHoveredPiece(`${piece.type}-${piece.color}`)
              }
              onMouseLeave={() => setHoveredPiece(null)}
              style={{ cursor: isPlaced ? "not-allowed" : "pointer" }}
            >
              <div className="piece-preview">{renderPiecePreview(piece)}</div>
              <div className="piece-info">
                <div className="piece-name">{piece.displayName}</div>
                <div className="piece-area">{piece.area} cells</div>
              </div>
              {isPlaced && <div className="placed-badge">✓ Placed</div>}
              {isSelected && !isPlaced && (
                <div className="selected-badge">Selected</div>
              )}
            </div>
          );
        })}
      </div>

      {!canPlaceMorePieces && (
        <div className="palette-message">
          All {difficulty} pieces placed! You can replace by selecting and
          placing again.
        </div>
      )}

      {selectedPiece && (
        <div className="palette-instructions">
          <strong>Instructions:</strong>
          <ul>
            <li>Click on the grid to place the piece</li>
            <li>
              Press <kbd>R</kbd> to rotate 90°
            </li>
            <li>
              Press <kbd>ESC</kbd> to cancel
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default PiecePalette;
