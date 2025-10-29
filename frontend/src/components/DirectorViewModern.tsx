import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import axios from 'axios'
import { Check, RotateCw, Sparkles, Zap } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { PIECE_DEFINITIONS, PieceDefinition } from './PiecePalette'
import './DirectorViewModern.css'

interface DirectorViewModernProps {
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
const CELL_SIZE = 60

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  white: '#f1f5f9',
  transparent: 'rgba(148, 163, 184, 0.3)',
  black: '#0f172a'
}

// Draggable Piece Component
function DraggablePiece({ piece, isPlaced }: { piece: PieceDefinition; isPlaced: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${piece.type}-${piece.color}`,
    data: piece,
    disabled: isPlaced
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1
  } : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`draggable-piece ${isPlaced ? 'placed' : ''} ${isDragging ? 'dragging' : ''}`}
      whileHover={!isPlaced ? { scale: 1.05, rotate: 2 } : {}}
      whileTap={!isPlaced ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="piece-icon-wrapper">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <PieceSVG piece={piece} scale={20} />
        </svg>
      </div>
      <div className="piece-label">
        <div className="piece-name-short">{piece.displayName.split(' ')[0]}</div>
        <div className="piece-area-badge">{piece.area}</div>
      </div>
      {isPlaced && (
        <motion.div
          className="placed-check"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <Check size={20} />
        </motion.div>
      )}
    </motion.div>
  )
}

// SVG Piece Renderer
function PieceSVG({ piece, scale = 15 }: { piece: PieceDefinition; scale?: number }) {
  const vertices = piece.vertices
  const minX = Math.min(...vertices.map(v => v[0]))
  const maxX = Math.max(...vertices.map(v => v[0]))
  const minY = Math.min(...vertices.map(v => v[1]))
  const maxY = Math.max(...vertices.map(v => v[1]))

  const offsetX = -minX * scale
  const offsetY = -minY * scale

  const pathData = vertices.map((v, i) => {
    const x = v[0] * scale + offsetX
    const y = v[1] * scale + offsetY
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ') + ' Z'

  return (
    <path
      d={pathData}
      fill={COLOR_MAP[piece.color]}
      stroke="#64748b"
      strokeWidth="2"
      opacity={piece.color === 'transparent' ? 0.5 : 0.95}
      filter="url(#glow)"
    />
  )
}

function DirectorViewModern({ sessionId, username, difficulty }: DirectorViewModernProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [placedPieces, setPlacedPieces] = useState<PlacedPiece[]>([])
  const [rotation, setRotation] = useState(0)
  const [draggedPiece, setDraggedPiece] = useState<PieceDefinition | null>(null)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  const { setNodeRef: setGridRef } = useDroppable({ id: 'grid' })

  useEffect(() => {
    drawCanvas()
  }, [placedPieces, hoverCell, draggedPiece, rotation])

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

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(1, '#1e293b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid with glow effect
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.shadowBlur = 5
    ctx.shadowColor = '#3b82f6'

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

    ctx.shadowBlur = 0

    // Draw edge labels with glow
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 14px Inter'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 3
    ctx.shadowColor = '#60a5fa'

    for (let i = 0; i < GRID_WIDTH; i++) {
      ctx.fillText(String(i + 1), (i + 0.5) * CELL_SIZE, -20)
      ctx.fillText(String.fromCharCode(65 + i), (i + 0.5) * CELL_SIZE, GRID_HEIGHT * CELL_SIZE + 20)
    }

    for (let i = 0; i < GRID_HEIGHT; i++) {
      ctx.fillText(String(i + 11), -20, (i + 0.5) * CELL_SIZE)
      ctx.fillText(String.fromCharCode(75 + i), GRID_WIDTH * CELL_SIZE + 20, (i + 0.5) * CELL_SIZE)
    }

    ctx.shadowBlur = 0

    // Draw hover cell highlight
    if (hoverCell && draggedPiece) {
      const isValid = isValidPlacement(draggedPiece, hoverCell, rotation)
      ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
      ctx.fillRect(hoverCell.x * CELL_SIZE, hoverCell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    }

    // Draw placed pieces with glow
    placedPieces.forEach((placed) => {
      const pieceDef = PIECE_DEFINITIONS.find(p => p.type === placed.type && p.color === placed.color)
      if (pieceDef) {
        drawPiece(ctx, pieceDef, { x: placed.position_x, y: placed.position_y }, placed.rotation, 1.0)
      }
    })

    // Draw preview piece
    if (draggedPiece && hoverCell) {
      const isValid = isValidPlacement(draggedPiece, hoverCell, rotation)
      drawPiece(ctx, draggedPiece, hoverCell, rotation, 0.6, isValid)
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

    ctx.globalAlpha = opacity
    ctx.fillStyle = isValid ? COLOR_MAP[piece.color] : '#ef4444'
    ctx.shadowBlur = 15
    ctx.shadowColor = isValid ? COLOR_MAP[piece.color] : '#dc2626'
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.strokeStyle = isValid ? '#64748b' : '#dc2626'
    ctx.lineWidth = 3
    ctx.shadowBlur = 0
    ctx.stroke()

    ctx.restore()
  }

  const handleDragStart = (event: DragStartEvent) => {
    const piece = event.active.data.current as PieceDefinition
    setDraggedPiece(piece)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!draggedPiece || !hoverCell) {
      setDraggedPiece(null)
      return
    }

    if (!isValidPlacement(draggedPiece, hoverCell, rotation)) {
      toast.error('Invalid placement!', { icon: '⚠️' })
      setDraggedPiece(null)
      return
    }

    await placePiece(hoverCell)
    setDraggedPiece(null)
    setHoverCell(null)
  }

  const placePiece = async (position: { x: number; y: number }) => {
    if (!draggedPiece) return

    setLoading(true)

    try {
      await axios.post(
        `/api/v1/games/${sessionId}/pieces`,
        {
          piece_type: draggedPiece.type,
          piece_color: draggedPiece.color,
          position_x: position.x,
          position_y: position.y,
          rotation: rotation
        },
        { params: { username } }
      )

      const newPiece: PlacedPiece = {
        type: draggedPiece.type,
        color: draggedPiece.color,
        position_x: position.x,
        position_y: position.y,
        rotation: rotation
      }

      setPlacedPieces(prev => {
        const filtered = prev.filter(p => !(p.type === newPiece.type && p.color === newPiece.color))
        return [...filtered, newPiece]
      })

      toast.success(`Placed ${draggedPiece.displayName}!`, { icon: '✨' })
      setRotation(0)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to place piece')
    } finally {
      setLoading(false)
    }
  }

  const handleBeginGame = async () => {
    if (placedPieces.length !== difficulty) {
      toast.error(`Place exactly ${difficulty} pieces before starting!`)
      return
    }

    setLoading(true)

    try {
      await axios.post(`/api/v1/games/${sessionId}/begin`, {}, { params: { username } })
      setGameStarted(true)
      toast.success('Game started! Explorers can now shoot waves.', { icon: '🚀' })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start game')
    } finally {
      setLoading(false)
    }
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!draggedPiece) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = Math.floor((clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((clientY - rect.top) / CELL_SIZE)

    setHoverCell({ x, y })
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="director-view-modern">
        <motion.div
          className="modern-header"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className="header-glow"></div>
          <Sparkles className="header-icon" size={32} />
          <h1>Director Setup</h1>
          <div className="progress-indicator">
            <motion.div
              className="progress-bar"
              initial={{ width: 0 }}
              animate={{ width: `${(placedPieces.length / difficulty) * 100}%` }}
              transition={{ type: 'spring' }}
            />
            <span className="progress-text">{placedPieces.length} / {difficulty}</span>
          </div>
        </motion.div>

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="modern-content">
            {/* Left Panel - Piece Palette */}
            <motion.div
              className="piece-palette-modern"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="palette-title">
                <Zap size={20} />
                <span>Mineral Pieces</span>
              </div>
              <div className="pieces-grid-modern">
                {PIECE_DEFINITIONS.map((piece) => (
                  <DraggablePiece
                    key={`${piece.type}-${piece.color}`}
                    piece={piece}
                    isPlaced={isPiecePlaced(piece)}
                  />
                ))}
              </div>
            </motion.div>

            {/* Center - Game Grid */}
            <motion.div
              className="grid-container-modern"
              ref={setGridRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <canvas
                ref={canvasRef}
                width={GRID_WIDTH * CELL_SIZE}
                height={GRID_HEIGHT * CELL_SIZE}
                onMouseMove={handleCanvasMove}
                onTouchMove={handleCanvasMove}
                onMouseLeave={() => setHoverCell(null)}
                className="game-canvas"
              />

              {draggedPiece && (
                <motion.div
                  className="rotation-control"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button onClick={() => setRotation((r) => (r + 90) % 360)}>
                    <RotateCw size={20} />
                    <span>{rotation}°</span>
                  </button>
                </motion.div>
              )}
            </motion.div>

            {/* Right Panel - Preview */}
            <motion.div
              className="preview-panel"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="preview-title">Live Preview</div>
              <div className="preview-content">
                {placedPieces.length > 0 ? (
                  <div className="placed-pieces-list">
                    {placedPieces.map((piece, idx) => {
                      const def = PIECE_DEFINITIONS.find(p => p.type === piece.type && p.color === piece.color)
                      return (
                        <motion.div
                          key={idx}
                          className="placed-piece-item"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <div className="piece-mini-icon" style={{ backgroundColor: def ? COLOR_MAP[def.color] : '#fff' }}></div>
                          <div className="piece-details">
                            <div className="piece-name-preview">{def?.displayName}</div>
                            <div className="piece-position">({piece.position_x}, {piece.position_y}) • {piece.rotation}°</div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-preview">
                    <Sparkles size={48} opacity={0.3} />
                    <p>Drag pieces to the grid</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </DndContext>

        {/* Begin Game Button */}
        <motion.div
          className="begin-game-container"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {!gameStarted ? (
              <motion.button
                key="begin"
                className="begin-game-btn-modern"
                onClick={handleBeginGame}
                disabled={loading || placedPieces.length !== difficulty}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Zap size={24} />
                <span>Begin Game</span>
              </motion.button>
            ) : (
              <motion.div
                key="started"
                className="game-started-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Check size={24} />
                <span>Game Started!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}

export default DirectorViewModern
