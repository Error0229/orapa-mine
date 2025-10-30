import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { PIECE_DEFINITIONS, PieceDefinition } from './PiecePalette'
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

interface WavePreview {
  entry: string
  exit: string | null
  color: string | null
}

const GRID_WIDTH = 10
const GRID_HEIGHT = 8
const CELL_SIZE = 50

// Fixed: Consistent color mapping across the component
const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  white: '#f1f5f9',
  transparent: '#94a3b8', // Fixed: consistent non-rgba color
  black: '#1f2937'
}

// Helper to get rgba version for canvas transparency
const getCanvasColor = (color: string, opacity: number = 1): string => {
  if (color === '#94a3b8') {
    // transparent color
    return `rgba(148, 163, 184, ${opacity * 0.4})`
  }
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function DraggablePieceCard({ piece, isPl aced, isSelected, rotation, onClick, onRotate }: {
  piece: PieceDefinition
  isPlaced: boolean
  isSelected: boolean
  rotation: number
  onClick: () => void
  onRotate: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${piece.type}-${piece.color}`,
    disabled: isPlaced,
    data: { piece }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`piece-card ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      onContextMenu={onRotate}
      whileHover={{ scale: isPlaced ? 1 : 1.05 }}
      whileTap={{ scale: isPlaced ? 1 : 0.95 }}
    >
      <svg width="60" height="60" viewBox="0 0 80 80">
        <PieceSVG piece={piece} scale={15} rotation={rotation} />
      </svg>
      <div className="piece-info">
        <span>{piece.displayName.split(' ')[0]}</span>
        <span className="rotation-badge">{rotation}°</span>
      </div>
      {isPlaced && <div className="placed-overlay">✓</div>}
    </motion.div>
  )
}

function DirectorView({ sessionId, username, difficulty }: DirectorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [placedPieces, setPlacedPieces] = useState<PlacedPiece[]>([])
  const [selectedPiece, setSelectedPiece] = useState<PieceDefinition | null>(null)
  const [activeDragPiece, setActiveDragPiece] = useState<PieceDefinition | null>(null)
  const [pieceRotations, setPieceRotations] = useState<Record<string, number>>({})
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wavePreviews, setWavePreviews] = useState<WavePreview[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    drawCanvas()
  }, [placedPieces, hoverCell, selectedPiece, pieceRotations, activeDragPiece])

  useEffect(() => {
    if (placedPieces.length > 0) {
      fetchWavePreviews()
    } else {
      setWavePreviews([])
    }
  }, [placedPieces])

  const getPieceKey = (piece: PieceDefinition) => `${piece.type}-${piece.color}`

  const getPieceRotation = (piece: PieceDefinition) => {
    return pieceRotations[getPieceKey(piece)] || 0
  }

  const rotatePiece = (piece: PieceDefinition) => {
    const key = getPieceKey(piece)
    const currentRotation = pieceRotations[key] || 0
    setPieceRotations(prev => ({
      ...prev,
      [key]: (currentRotation + 90) % 360
    }))
  }

  const isPiecePlaced = (piece: PieceDefinition) => {
    return placedPieces.some(p => p.type === piece.type && p.color === piece.color)
  }

  const rotateVertices = (vertices: [number, number][], degrees: number): [number, number][] => {
    if (degrees === 0) return vertices
    const rad = (degrees * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return vertices.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
  }

  const getOccupiedCells = (piece: PieceDefinition, position: { x: number; y: number }, rot: number): [number, number][] => {
    const rotated = rotateVertices(piece.vertices, rot)
    const xs = rotated.map(v => v[0])
    const ys = rotated.map(v => v[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

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

    for (const [x, y] of occupied) {
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false
    }

    const existingCells = new Set<string>()
    for (const placed of placedPieces) {
      // Allow overlapping with same piece (for re-placement)
      if (placed.type === piece.type && placed.color === piece.color) continue
      const placedPieceDef = PIECE_DEFINITIONS.find(p => p.type === placed.type && p.color === placed.color)
      if (placedPieceDef) {
        const cells = getOccupiedCells(placedPieceDef, { x: placed.position_x, y: placed.position_y }, placed.rotation)
        cells.forEach(([x, y]) => existingCells.add(`${x},${y}`))
      }
    }

    for (const [x, y] of occupied) {
      if (existingCells.has(`${x},${y}`)) return false
    }
    return true
  }

  const fetchWavePreviews = async () => {
    const positions = ['1', '5', '10', 'A', 'E', 'J', '11', '14', '18', 'K', 'N', 'R']
    const previews: WavePreview[] = []

    for (const pos of positions) {
      try {
        const response = await axios.post(
          `/api/v1/games/${sessionId}/preview_wave`,
          { entry_position: pos }
        )
        previews.push({
          entry: pos,
          exit: response.data.exit_position,
          color: response.data.exit_color
        })
      } catch {
        // Skip on error
      }
    }

    setWavePreviews(previews)
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with better background
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid with better styling
    ctx.strokeStyle = '#e2e8f0'
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
    ctx.fillStyle = '#64748b'
    ctx.font = '12px system-ui'
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

    // Draw hover cell
    if (hoverCell && (selectedPiece || activeDragPiece)) {
      const piece = selectedPiece || activeDragPiece
      if (piece) {
        const rotation = getPieceRotation(piece)
        const isValid = isValidPlacement(piece, hoverCell, rotation)
        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
        ctx.fillRect(hoverCell.x * CELL_SIZE, hoverCell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    // Draw placed pieces
    placedPieces.forEach((placed) => {
      const pieceDef = PIECE_DEFINITIONS.find(p => p.type === placed.type && p.color === placed.color)
      if (pieceDef) {
        drawPiece(ctx, pieceDef, { x: placed.position_x, y: placed.position_y }, placed.rotation, 0.9)
      }
    })

    // Draw preview piece
    if (hoverCell && (selectedPiece || activeDragPiece)) {
      const piece = selectedPiece || activeDragPiece
      if (piece) {
        const rotation = getPieceRotation(piece)
        const isValid = isValidPlacement(piece, hoverCell, rotation)
        drawPiece(ctx, piece, hoverCell, rotation, 0.5, isValid)
      }
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
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()

    ctx.globalAlpha = opacity
    const baseColor = COLOR_MAP[piece.color]
    ctx.fillStyle = isValid ? getCanvasColor(baseColor, opacity) : getCanvasColor('#ef4444', opacity)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.strokeStyle = isValid ? '#475569' : '#dc2626'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }

  const handleDragStart = (event: DragStartEvent) => {
    const piece = event.active.data.current?.piece as PieceDefinition
    if (piece && !isPiecePlaced(piece)) {
      setActiveDragPiece(piece)
      setSelectedPiece(piece)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragPiece(null)

    const canvas = canvasRef.current
    if (!canvas || !selectedPiece) return

    // Get canvas position and calculate grid cell from drop coordinates
    const rect = canvas.getBoundingClientRect()
    const dropX = event.delta.x + event.active.rect.current.translated?.left || 0
    const dropY = event.delta.y + event.active.rect.current.translated?.top || 0

    const x = Math.floor((dropX - rect.left) / CELL_SIZE)
    const y = Math.floor((dropY - rect.top) / CELL_SIZE)

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const position = { x, y }
      const rotation = getPieceRotation(selectedPiece)

      if (isValidPlacement(selectedPiece, position, rotation)) {
        await placePiece(position, rotation)
      } else {
        toast.error('Invalid placement - piece overlaps or out of bounds')
      }
    }
  }

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

    // Right-click rotates
    if (e.button === 2) {
      e.preventDefault()
      if (selectedPiece) {
        rotatePiece(selectedPiece)
      }
      return
    }

    // If no piece selected, check if clicking on an existing piece to select it
    if (!selectedPiece) {
      for (const placedPiece of placedPieces) {
        const pieceDef = PIECE_DEFINITIONS.find(p => p.type === placedPiece.type && p.color === placedPiece.color)
        if (pieceDef) {
          const cells = getOccupiedCells(pieceDef, { x: placedPiece.position_x, y: placedPiece.position_y }, placedPiece.rotation)
          if (cells.some(([cx, cy]) => cx === x && cy === y)) {
            // Fixed: Remove piece from placed state to allow re-placement
            setPlacedPieces(prev => prev.filter(p => !(p.type === pieceDef.type && p.color === pieceDef.color)))
            setSelectedPiece(pieceDef)
            toast.info(`Selected ${pieceDef.displayName} for re-placement`, {
              icon: '🔄',
            })
            return
          }
        }
      }
      return
    }

    const position = { x, y }
    const rotation = getPieceRotation(selectedPiece)

    if (!isValidPlacement(selectedPiece, position, rotation)) {
      toast.error('Invalid placement')
      return
    }

    await placePiece(position, rotation)
  }

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!selectedPiece) return
    e.preventDefault()
    rotatePiece(selectedPiece)
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedPiece && !activeDragPiece) {
      setHoverCell(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      setHoverCell({ x, y })
    } else {
      setHoverCell(null)
    }
  }

  const placePiece = async (position: { x: number; y: number }, rotation: number) => {
    if (!selectedPiece) return

    setLoading(true)

    try {
      // Fixed: Better API call with proper error handling
      const response = await axios.post(
        `/api/v1/games/${sessionId}/pieces`,
        {
          piece_type: selectedPiece.type,
          piece_color: selectedPiece.color,
          position_x: position.x,
          position_y: position.y,
          rotation: rotation
        },
        {
          params: { username },
          timeout: 10000 // 10 second timeout
        }
      )

      const newPiece: PlacedPiece = {
        type: selectedPiece.type,
        color: selectedPiece.color,
        position_x: position.x,
        position_y: position.y,
        rotation: rotation
      }

      // Update placed pieces (replace if already exists)
      setPlacedPieces(prev => {
        const filtered = prev.filter(p => !(p.type === newPiece.type && p.color === newPiece.color))
        return [...filtered, newPiece]
      })

      toast.success('Piece placed successfully!')
      setSelectedPiece(null)
      setActiveDragPiece(null)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to place piece'
      toast.error(`Error: ${errorMessage}`)
      console.error('Placement error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBeginGame = async () => {
    if (placedPieces.length !== difficulty) {
      toast.error(`Place exactly ${difficulty} pieces (currently ${placedPieces.length})`)
      return
    }

    setLoading(true)

    try {
      await axios.post(`/api/v1/games/${sessionId}/begin`, {}, { params: { username } })
      setGameStarted(true)
      toast.success('Game started! 🎮')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="director-view">
          {/* Header */}
          <div className="director-header">
            <h1>Director Setup</h1>
            <div className="director-progress">
              <span>{placedPieces.length} / {difficulty} pieces</span>
              <div
                className="progress-bar"
                style={{
                  width: `${(placedPieces.length / difficulty) * 100}%`,
                  backgroundColor: placedPieces.length === difficulty ? '#22c55e' : '#3b82f6'
                }}
              />
            </div>
          </div>

          <div className="director-content">
            {/* Left - Pieces with Drag & Drop */}
            <div className="pieces-panel">
              <h3>Pieces (Drag or Click)</h3>
              <div className="pieces-grid">
                {PIECE_DEFINITIONS.map((piece) => {
                  const isPlaced = isPiecePlaced(piece)
                  const isSelected = selectedPiece?.type === piece.type && selectedPiece?.color === piece.color
                  const rotation = getPieceRotation(piece)

                  return (
                    <DraggablePieceCard
                      key={getPieceKey(piece)}
                      piece={piece}
                      isPlaced={isPlaced}
                      isSelected={isSelected}
                      rotation={rotation}
                      onClick={() => {
                        if (!isPlaced) {
                          setSelectedPiece(isSelected ? null : piece)
                        }
                      }}
                      onRotate={(e) => {
                        e.preventDefault()
                        if (!isPlaced) rotatePiece(piece)
                      }}
                    />
                  )
                })}
              </div>
              <div className="hint-text">
                🖱️ Drag pieces to grid or click to select<br/>
                🔄 Right-click or scroll on grid to rotate<br/>
                ♻️ Click placed pieces to re-position
              </div>
            </div>

            {/* Center - Grid */}
            <div className="grid-panel">
              <canvas
                ref={canvasRef}
                width={GRID_WIDTH * CELL_SIZE}
                height={GRID_HEIGHT * CELL_SIZE}
                onClick={handleCanvasClick}
                onContextMenu={handleCanvasClick}
                onWheel={handleCanvasWheel}
                onMouseMove={handleCanvasMove}
                onMouseLeave={() => setHoverCell(null)}
                className="canvas-final"
                style={{ cursor: selectedPiece || activeDragPiece ? 'crosshair' : 'default' }}
              />
            </div>

            {/* Right - Wave Preview */}
            <div className="preview-panel-final">
              <h3>Laser Preview</h3>
              <div className="wave-previews">
                {wavePreviews.length > 0 ? (
                  wavePreviews.map((wave, idx) => (
                    <div key={idx} className="wave-preview-item">
                      <span className="wave-entry">{wave.entry}</span>
                      <span className="wave-arrow">→</span>
                      <span
                        className="wave-exit"
                        style={{
                          color: wave.color ? COLOR_MAP[wave.color] : '#94a3b8',
                          fontWeight: wave.exit ? 'bold' : 'normal'
                        }}
                      >
                        {wave.exit || '✕'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="preview-empty">
                    📊 Place pieces to see laser paths
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Begin Button */}
          <button
            className="btn primary begin-btn"
            onClick={handleBeginGame}
            disabled={loading || gameStarted || placedPieces.length !== difficulty}
          >
            {loading ? '⏳ Loading...' : gameStarted ? '✓ Game Started' : 'Begin Game'}
          </button>
        </div>

        <DragOverlay>
          {activeDragPiece ? (
            <div className="drag-overlay-piece">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <PieceSVG piece={activeDragPiece} scale={15} rotation={getPieceRotation(activeDragPiece)} />
              </svg>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}

function PieceSVG({ piece, scale = 15, rotation = 0 }: { piece: PieceDefinition; scale?: number; rotation?: number }) {
  const rotated = piece.vertices.map(([x, y]): [number, number] => {
    if (rotation === 0) return [x, y]
    const rad = (rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return [x * cos - y * sin, x * sin + y * cos]
  })

  const minX = Math.min(...rotated.map(v => v[0]))
  const maxX = Math.max(...rotated.map(v => v[0]))
  const minY = Math.min(...rotated.map(v => v[1]))
  const maxY = Math.max(...rotated.map(v => v[1]))

  const offsetX = -minX * scale + (80 - (maxX - minX) * scale) / 2
  const offsetY = -minY * scale + (80 - (maxY - minY) * scale) / 2

  const pathData = rotated.map((v, i) => {
    const x = v[0] * scale + offsetX
    const y = v[1] * scale + offsetY
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ') + ' Z'

  return (
    <path
      d={pathData}
      fill={COLOR_MAP[piece.color]}
      stroke="#475569"
      strokeWidth="2"
      opacity={piece.color === 'transparent' ? 0.5 : 0.9}
    />
  )
}

export default DirectorView
