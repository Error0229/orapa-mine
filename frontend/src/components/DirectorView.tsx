import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import PiecePalette, { PieceDefinition, PIECE_DEFINITIONS } from './PiecePalette'
import './DirectorView.css'

interface DirectorViewProps {
  sessionId: string
  username: string
  difficulty: number
}

interface PlacedPiece {
  type: string
  color: string
  position_x: number
  position_y: number
  rotation: number
}

const GRID_WIDTH = 10
const GRID_HEIGHT = 8
const CELL_SIZE = 50

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  white: '#f1f5f9',
  transparent: 'rgba(148, 163, 184, 0.3)',
  black: '#0f172a'
}

function DirectorView({ sessionId, username, difficulty }: DirectorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedPiece, setSelectedPiece] = useState<PieceDefinition | null>(null)
  const [rotation, setRotation] = useState(0)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [placedPieces, setPlacedPieces] = useState<PlacedPiece[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  // Draw the grid and placed pieces
  useEffect(() => {
    drawCanvas()
  }, [placedPieces, hoverPosition, selectedPiece, rotation])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setRotation((r) => (r + 90) % 360)
      } else if (e.key === 'Escape') {
        setSelectedPiece(null)
        setRotation(0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const rotateVertices = (vertices: [number, number][], degrees: number): [number, number][] => {
    if (degrees === 0) return vertices

    const rad = (degrees * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    return vertices.map(([x, y]) => {
      const newX = x * cos - y * sin
      const newY = x * sin + y * cos
      return [newX, newY]
    })
  }

  const getOccupiedCells = (piece: PieceDefinition, position: { x: number; y: number }, rot: number): [number, number][] => {
    const rotated = rotateVertices(piece.vertices, rot)

    // Get bounding box
    const xs = rotated.map(v => v[0])
    const ys = rotated.map(v => v[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // Check cells using point-in-polygon
    const occupied: [number, number][] = []
    for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
      for (let x = Math.floor(minX); x < Math.ceil(maxX); x++) {
        const cellCenter: [number, number] = [x + 0.5, y + 0.5]
        if (pointInPolygon(cellCenter, rotated)) {
          occupied.push([position.x + x, position.y + y])
        }
      }
    }

    return occupied
  }

  const pointInPolygon = (point: [number, number], vertices: [number, number][]): boolean => {
    const [x, y] = point
    let inside = false

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i]
      const [xj, yj] = vertices[j]

      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }

    return inside
  }

  const isValidPlacement = (piece: PieceDefinition, position: { x: number; y: number }, rot: number): boolean => {
    const occupied = getOccupiedCells(piece, position, rot)

    // Check bounds
    for (const [x, y] of occupied) {
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
        return false
      }
    }

    // Check collisions with placed pieces (allowing replacement of same piece)
    const existingCells = new Set<string>()
    for (const placed of placedPieces) {
      // Skip if this is the same piece type and color (we're replacing it)
      if (placed.type === piece.type && placed.color === piece.color) continue

      const placedPieceDef = PIECE_DEFINITIONS.find(p => p.type === placed.type && p.color === placed.color)
      if (placedPieceDef) {
        const cells = getOccupiedCells(placedPieceDef, { x: placed.position_x, y: placed.position_y }, placed.rotation)
        cells.forEach(([x, y]) => existingCells.add(`${x},${y}`))
      }
    }

    for (const [x, y] of occupied) {
      if (existingCells.has(`${x},${y}`)) {
        return false
      }
    }

    return true
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1

    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE, 0)
      ctx.lineTo(x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE)
      ctx.stroke()
    }

    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE)
      ctx.lineTo(GRID_WIDTH * CELL_SIZE, y * CELL_SIZE)
      ctx.stroke()
    }

    // Draw edge labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Inter'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < GRID_WIDTH; i++) {
      ctx.fillText(String(i + 1), (i + 0.5) * CELL_SIZE, -15)
      ctx.fillText(String.fromCharCode(65 + i), (i + 0.5) * CELL_SIZE, GRID_HEIGHT * CELL_SIZE + 15)
    }

    for (let i = 0; i < GRID_HEIGHT; i++) {
      ctx.fillText(String(i + 11), -15, (i + 0.5) * CELL_SIZE)
      ctx.fillText(String.fromCharCode(75 + i), GRID_WIDTH * CELL_SIZE + 15, (i + 0.5) * CELL_SIZE)
    }

    // Draw placed pieces
    placedPieces.forEach((placed) => {
      const pieceDef = PIECE_DEFINITIONS.find(p => p.type === placed.type && p.color === placed.color)
      if (pieceDef) {
        drawPiece(ctx, pieceDef, { x: placed.position_x, y: placed.position_y }, placed.rotation, 1.0)
      }
    })

    // Draw hover preview
    if (selectedPiece && hoverPosition) {
      const isValid = isValidPlacement(selectedPiece, hoverPosition, rotation)
      drawPiece(ctx, selectedPiece, hoverPosition, rotation, 0.5, isValid)
    }
  }

  const drawPiece = (
    ctx: CanvasRenderingContext2D,
    piece: PieceDefinition,
    position: { x: number; y: number },
    rot: number,
    opacity: number,
    isValid: boolean = true
  ) => {
    const rotated = rotateVertices(piece.vertices, rot)

    ctx.save()
    ctx.translate(position.x * CELL_SIZE, position.y * CELL_SIZE)

    ctx.beginPath()
    rotated.forEach(([x, y], i) => {
      const px = x * CELL_SIZE
      const py = y * CELL_SIZE
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    })
    ctx.closePath()

    // Fill
    ctx.globalAlpha = opacity
    ctx.fillStyle = isValid ? COLOR_MAP[piece.color] : '#ef4444'
    ctx.fill()

    // Stroke
    ctx.globalAlpha = 1
    ctx.strokeStyle = isValid ? '#64748b' : '#dc2626'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedPiece) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

    const position = { x, y }

    if (!isValidPlacement(selectedPiece, position, rotation)) {
      setMessage('Invalid placement: Piece overlaps or is out of bounds')
      return
    }

    await placePiece(position)
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedPiece) {
      setHoverPosition(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

    setHoverPosition({ x, y })
  }

  const placePiece = async (position: { x: number; y: number }) => {
    if (!selectedPiece) return

    setLoading(true)
    setMessage('')

    try {
      await axios.post(
        `/api/v1/games/${sessionId}/pieces`,
        {
          piece_type: selectedPiece.type,
          piece_color: selectedPiece.color,
          position_x: position.x,
          position_y: position.y,
          rotation: rotation
        },
        { params: { username } }
      )

      // Update local state
      const newPiece: PlacedPiece = {
        type: selectedPiece.type,
        color: selectedPiece.color,
        position_x: position.x,
        position_y: position.y,
        rotation: rotation
      }

      // Replace if exists, otherwise add
      setPlacedPieces(prev => {
        const filtered = prev.filter(p => !(p.type === newPiece.type && p.color === newPiece.color))
        return [...filtered, newPiece]
      })

      setMessage(`Placed ${selectedPiece.displayName}!`)
      setSelectedPiece(null)
      setRotation(0)
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to place piece')
    } finally {
      setLoading(false)
    }
  }

  const handleBeginGame = async () => {
    if (placedPieces.length !== difficulty) {
      setMessage(`Please place exactly ${difficulty} pieces before starting`)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await axios.post(`/api/v1/games/${sessionId}/begin`, {}, { params: { username } })
      setGameStarted(true)
      setMessage('Game started! Explorers can now shoot waves.')
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to start game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="director-view">
      <div className="director-header">
        <h2>Director Setup</h2>
        <p>Place {difficulty} pieces on the grid to begin the game</p>
      </div>

      <div className="director-content">
        <div className="director-left">
          <PiecePalette
            difficulty={difficulty}
            onPieceSelect={setSelectedPiece}
            selectedPiece={selectedPiece}
            placedPieces={placedPieces.map(p => ({ type: p.type, color: p.color }))}
          />

          <div className="director-actions">
            <button
              className="begin-game-btn"
              onClick={handleBeginGame}
              disabled={loading || gameStarted || placedPieces.length !== difficulty}
            >
              {gameStarted ? 'Game Started ✓' : `Begin Game (${placedPieces.length}/${difficulty})`}
            </button>

            {message && (
              <div className={`director-message ${message.includes('Failed') || message.includes('Invalid') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="director-right">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={GRID_WIDTH * CELL_SIZE}
              height={GRID_HEIGHT * CELL_SIZE}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setHoverPosition(null)}
              style={{ cursor: selectedPiece ? 'crosshair' : 'default' }}
            />
          </div>

          {selectedPiece && (
            <div className="rotation-indicator">
              Current rotation: <strong>{rotation}°</strong>
              <span className="rotation-hint">Press R to rotate</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DirectorView
