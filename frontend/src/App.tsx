import { useState } from 'react'
import GameBoard from './components/GameBoard'
import GameLobby from './components/GameLobby'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [role, setRole] = useState<'director' | 'explorer'>('explorer')
  const [difficulty, setDifficulty] = useState<number>(5)

  const handleGameStart = (session: string, user: string, userRole: 'director' | 'explorer', gameDifficulty: number = 5) => {
    setSessionId(session)
    setUsername(user)
    setRole(userRole)
    setDifficulty(gameDifficulty)
    setGameStarted(true)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⛏️ Orapa Mine</h1>
        <p className="text-dim">Discover hidden minerals through deduction and logic</p>
      </header>

      <main className="container">
        {!gameStarted ? (
          <GameLobby onGameStart={handleGameStart} />
        ) : (
          <GameBoard
            sessionId={sessionId}
            username={username}
            role={role}
            difficulty={difficulty}
          />
        )}
      </main>
    </div>
  )
}

export default App
