import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import DirectorView from './DirectorView'
import './GameBoard.css'

interface GameBoardProps {
  sessionId: string
  username: string
  role: 'director' | 'explorer'
  difficulty?: number
}

interface WavePathSegment {
  start_x: number
  start_y: number
  end_x: number
  end_y: number
  color: string
}

interface WaveShot {
  entry_position: string
  exit_position: string | null
  exit_color: string | null
  path: WavePathSegment[]
  reflections: number
}

const GRID_WIDTH = 10
const GRID_HEIGHT = 8
const CELL_SIZE = 50

function GameBoard({ sessionId, username, role, difficulty = 5 }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedPosition, setSelectedPosition] = useState('')
  const [waveShots, setWaveShots] = useState<WaveShot[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // If director, show director view
  if (role === 'director') {
    return <DirectorView sessionId={sessionId} username={username} difficulty={difficulty} />
  }

  useEffect(() => {
    drawGrid()
    drawWaves()
  }, [waveShots])

  const drawGrid = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid lines
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

    // Top edge (1-10)
    for (let i = 0; i < GRID_WIDTH; i++) {
      ctx.fillText(String(i + 1), (i + 0.5) * CELL_SIZE, -15)
    }

    // Left edge (11-18)
    for (let i = 0; i < GRID_HEIGHT; i++) {
      ctx.fillText(String(i + 11), -15, (i + 0.5) * CELL_SIZE)
    }

    // Bottom edge (A-J)
    for (let i = 0; i < GRID_WIDTH; i++) {
      ctx.fillText(String.fromCharCode(65 + i), (i + 0.5) * CELL_SIZE, GRID_HEIGHT * CELL_SIZE + 15)
    }

    // Right edge (K-R)
    for (let i = 0; i < GRID_HEIGHT; i++) {
      ctx.fillText(
        String.fromCharCode(75 + i),
        GRID_WIDTH * CELL_SIZE + 15,
        (i + 0.5) * CELL_SIZE
      )
    }
  }

  const drawWaves = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw all wave paths
    waveShots.forEach((shot, index) => {
      shot.path.forEach((segment) => {
        ctx.strokeStyle = getColorHex(segment.color)
        ctx.lineWidth = 3
        ctx.lineCap = 'round'

        // Add slight transparency for older shots
        const alpha = index === waveShots.length - 1 ? 1 : 0.3
        ctx.globalAlpha = alpha

        ctx.beginPath()
        ctx.moveTo(segment.start_x * CELL_SIZE, segment.start_y * CELL_SIZE)
        ctx.lineTo(segment.end_x * CELL_SIZE, segment.end_y * CELL_SIZE)
        ctx.stroke()

        ctx.globalAlpha = 1
      })
    })
  }

  const getColorHex = (color: string): string => {
    const colorMap: Record<string, string> = {
      white: '#FFFFFF',
      red: '#FF0000',
      blue: '#0000FF',
      yellow: '#FFFF00',
      violet: '#8B00FF',
      orange: '#FFA500',
      green: '#00FF00',
      black: '#000000',
    }
    return colorMap[color.toLowerCase()] || '#FFFFFF'
  }

  const handleShootWave = async () => {
    if (!selectedPosition) {
      setMessage('Please select an entry position')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await axios.post(
        `/api/v1/games/${sessionId}/shoot`,
        { entry_position: selectedPosition },
        { params: { username } }
      )

      const shot: WaveShot = response.data
      setWaveShots([...waveShots, shot])

      if (shot.exit_position) {
        setMessage(
          `Wave exited at ${shot.exit_position} with color ${shot.exit_color} after ${shot.reflections} reflections`
        )
      } else {
        setMessage('Wave was absorbed by petroleum!')
      }
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to shoot wave')
    } finally {
      setLoading(false)
    }
  }

  const edgePositions = [
    ...Array.from({ length: 10 }, (_, i) => String(i + 1)), // 1-10 (top)
    ...Array.from({ length: 8 }, (_, i) => String(i + 11)), // 11-18 (left)
    ...Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i)), // A-J (bottom)
    ...Array.from({ length: 8 }, (_, i) => String.fromCharCode(75 + i)), // K-R (right)
  ]

  return (
    <div className="game-board-container">
      <div className="game-info">
        <h2>Game Session: {sessionId}</h2>
        <p>Playing as: <strong>Explorer</strong></p>
        <p>Username: <strong>{username}</strong></p>
      </div>

      <div className="board-wrapper">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={GRID_WIDTH * CELL_SIZE}
            height={GRID_HEIGHT * CELL_SIZE}
          />
        </div>

        {role === 'explorer' && (
          <div className="controls">
            <h3>Shoot Elastic Wave</h3>

            <div className="position-selector">
              <label htmlFor="position">Entry Position:</label>
              <select
                id="position"
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                disabled={loading}
              >
                <option value="">Select position...</option>
                {edgePositions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="primary"
              onClick={handleShootWave}
              disabled={loading || !selectedPosition}
            >
              {loading ? 'Shooting...' : 'Shoot Wave'}
            </button>

            {message && (
              <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}
          </div>
        )}

      </div>

      <div className="shot-history">
        <h3>Wave History ({waveShots.length})</h3>
        <div className="shots-list">
          {waveShots.map((shot, index) => (
            <div key={index} className="shot-item">
              <span className="shot-number">#{index + 1}</span>
              <span>Entry: <strong>{shot.entry_position}</strong></span>
              <span>Exit: <strong>{shot.exit_position || 'Absorbed'}</strong></span>
              <span>Color: <span style={{ color: getColorHex(shot.exit_color || 'white') }}>
                <strong>{shot.exit_color || 'None'}</strong>
              </span></span>
              <span>Reflections: <strong>{shot.reflections}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GameBoard
