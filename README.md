# Orapa Mine - Digital Board Game

A web-based multiplayer implementation of the Orapa Mine board game, where players use deduction and spatial reasoning to discover hidden tangram-shaped minerals by shooting elastic waves through a mine grid.

## Game Overview

**Orapa Mine** is a deduction game where:
- One player is the **Director** who secretly places colored mineral pieces on a grid
- Other players are **Explorers** who shoot "elastic waves" to deduce piece locations
- Waves bounce off mineral edges and change colors, providing clues
- First explorer to correctly identify all pieces wins!

For detailed game rules, see [GAME_RULES.md](./GAME_RULES.md)

## Tech Stack

### Backend
- **Python 3.11+** with FastAPI
- **PostgreSQL** for data persistence
- **Piccolo ORM** for database migrations
- **uvicorn** as ASGI server
- Code quality: **uv**, **ruff**, **mypy**

### Frontend
- Modern JavaScript framework (React/Vue)
- WebSocket for real-time multiplayer
- Canvas/SVG for game board rendering

## Project Structure

```
orapa-mine/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # REST API endpoints
│   │   ├── models/       # Database models (Piccolo)
│   │   ├── services/     # Game logic (ray tracing, color mixing)
│   │   ├── schemas/      # Pydantic schemas
│   │   └── main.py       # FastAPI app
│   ├── pyproject.toml    # Python dependencies & config
│   ├── Makefile          # Development commands
│   └── requirements.txt  # Pip dependencies
├── frontend/             # Frontend application
├── docker-compose.yml    # PostgreSQL container
├── GAME_RULES.md        # Complete game rules
└── README.md            # This file
```

## Getting Started

### Prerequisites

- **Python 3.11+**
- **PostgreSQL** (or use Docker)
- **uv** (Python package manager)
- **Node.js 18+** (for frontend)

### Backend Setup

1. **Install uv** (if not already installed):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Start PostgreSQL** (using Docker):
```bash
docker-compose up -d
```

3. **Set up backend**:
```bash
cd backend

# Create virtual environment with uv
make setup

# Activate virtual environment
source .venv/bin/activate

# Create .env file
make env
# Edit .env with your configuration if needed

# Install dependencies
make dev-install
```

4. **Run database migrations**:
```bash
make migrate
```

5. **Start the backend server**:
```bash
make run
# Or: uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### Development Commands

```bash
# Show all available commands
make help

# Code quality
make format      # Format code with ruff
make lint        # Lint code with ruff
make type-check  # Type check with mypy

# Testing
make test        # Run tests with pytest

# Environment
make setup       # Create virtual environment
make env         # Create .env from .env.example
make sync        # Sync dependencies

# Cleanup
make clean       # Remove generated files
```

## API Endpoints

### Games

- `POST /api/v1/games` - Create new game
- `GET /api/v1/games` - List all games
- `GET /api/v1/games/{session_id}` - Get game details
- `POST /api/v1/games/{session_id}/join` - Join a game
- `POST /api/v1/games/{session_id}/start` - Start game (setup phase)
- `POST /api/v1/games/{session_id}/pieces` - Place a piece (director only)
- `POST /api/v1/games/{session_id}/begin` - Begin gameplay
- `POST /api/v1/games/{session_id}/shoot` - Shoot elastic wave
- `GET /api/v1/games/{session_id}/state` - Get game state

### Users

- `POST /api/v1/users` - Register user
- `GET /api/v1/users/{username}` - Get user info

## Game Architecture

### Core Components

1. **Piece Geometry** (`app/services/piece_geometry.py`)
   - Defines all 7 tangram pieces with precise coordinates
   - Handles rotation and cell occupation calculation
   - Validates piece placement

2. **Ray Tracer** (`app/services/ray_tracer.py`)
   - Simulates elastic wave propagation
   - Calculates reflections off piece edges (45° and 180° angles)
   - Tracks wave path for visualization

3. **Color Mixer** (`app/services/color_mixer.py`)
   - Implements additive color mixing
   - Red + Blue = Violet
   - Red + Yellow = Orange
   - Blue + Yellow = Green
   - Red + Blue + Yellow = Black

### Database Models

- **User** - Authentication and account management
- **Player** - Game statistics and profiles
- **Game** - Game session information
- **GamePlayer** - Players in a specific game
- **PlacedPiece** - Pieces placed by director
- **WaveShot** - History of elastic wave shots

## Game Flow

1. **Lobby Phase** (`waiting`)
   - Players join game
   - Director role assigned
   - Configure difficulty (number of pieces)

2. **Setup Phase** (`setup`)
   - Director places mineral pieces on grid
   - Pieces can be rotated and positioned
   - Must place exact number based on difficulty

3. **Gameplay Phase** (`in_progress`)
   - Explorers take turns shooting waves
   - Waves bounce and change colors
   - Players record clues on solution sheets
   - Any player can make a guess at any time

4. **Completion** (`completed`)
   - First correct guess wins
   - Game statistics updated

## Development Guidelines

### Code Quality

This project uses strict code quality tools:

- **ruff** - Fast Python linter and formatter
- **mypy** - Static type checking
- **pytest** - Testing framework

All code must pass:
```bash
make format    # Auto-format code
make lint      # Check for issues
make type-check # Verify types
make test      # Run test suite
```

### Contributing

1. Create a feature branch
2. Implement changes with tests
3. Ensure all quality checks pass
4. Submit pull request

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Replay system for completed games
- [ ] AI opponent (auto-solver)
- [ ] Tournament mode
- [ ] Leaderboards and rankings
- [ ] Game replays and analysis
- [ ] Mobile-responsive UI
- [ ] Multiple simultaneous games per user

## License

[Add license information]

## Credits

- Original game design: Junghee Choi (Wanjin Gill)
- Publisher: Playte
- Digital implementation: [Your name/team]

## Links

- [Official Orapa Mine on BoardGameGeek](https://boardgamegeek.com/boardgame/424152/orapa-mine)
- [Play on Board Game Arena](https://en.boardgamearena.com/gamepanel?game=orapamine)
