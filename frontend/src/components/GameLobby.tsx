import { useState } from 'react'
import axios from 'axios'
import './GameLobby.css'

interface GameLobbyProps {
  onGameStart: (sessionId: string, username: string, role: 'director' | 'explorer') => void
}

function GameLobby({ onGameStart }: GameLobbyProps) {
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'director' | 'explorer'>('explorer')
  const [difficulty, setDifficulty] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateGame = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create game
      const gameResponse = await axios.post('/api/v1/games', {
        max_players: 5,
        difficulty: difficulty
      })

      const sessionId = gameResponse.data.session_id

      // Join game
      await axios.post(`/api/v1/games/${sessionId}/join`, null, {
        params: { username, role }
      })

      // If director, start the game immediately
      if (role === 'director') {
        await axios.post(`/api/v1/games/${sessionId}/start`)
      }

      onGameStart(sessionId, username, role)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lobby-container">
      <div className="lobby-card card">
        <h2>Create New Game</h2>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'director' | 'explorer')}
            disabled={loading}
          >
            <option value="explorer">Explorer (Deducer)</option>
            <option value="director">Director (Puzzle Setter)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="difficulty">
            Difficulty (Pieces to place: {difficulty})
          </label>
          <input
            id="difficulty"
            type="range"
            min="3"
            max="7"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            disabled={loading}
          />
          <div className="difficulty-labels">
            <span>Easy (3)</span>
            <span>Medium (5)</span>
            <span>Hard (7)</span>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          className="primary"
          onClick={handleCreateGame}
          disabled={loading}
        >
          {loading ? 'Creating Game...' : 'Create & Start Game'}
        </button>

        <div className="info-box mt-4">
          <h3>How to Play</h3>
          <p><strong>Director:</strong> Place colored tangram pieces on the grid</p>
          <p><strong>Explorer:</strong> Shoot elastic waves to discover piece locations</p>
          <p>Waves bounce off pieces and mix colors, giving you clues!</p>
        </div>
      </div>
    </div>
  )
}

export default GameLobby
