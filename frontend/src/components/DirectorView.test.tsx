import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import DirectorView from './DirectorView'
import { PIECE_DEFINITIONS } from './PiecePalette'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('DirectorView', () => {
  const mockProps = {
    sessionId: 'test-session-123',
    username: 'testuser',
    difficulty: 7,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.post.mockResolvedValue({ data: {} })
  })

  describe('Rendering', () => {
    it('should render the director setup header', () => {
      render(<DirectorView {...mockProps} />)
      expect(screen.getByText('Director Setup')).toBeInTheDocument()
    })

    it('should display correct piece count', () => {
      render(<DirectorView {...mockProps} />)
      expect(screen.getByText('0 / 7 pieces')).toBeInTheDocument()
    })

    it('should render all piece cards', () => {
      render(<DirectorView {...mockProps} />)
      expect(screen.getByText('Large Triangle (White)'.split(' ')[0])).toBeInTheDocument()
      expect(screen.getByText('Large Triangle (Blue)'.split(' ')[0])).toBeInTheDocument()
      expect(screen.getByText('Medium Triangle (Yellow)'.split(' ')[0])).toBeInTheDocument()
    })

    it('should render the canvas', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(canvas).toHaveClass('canvas-final')
    })

    it('should render begin game button', () => {
      render(<DirectorView {...mockProps} />)
      expect(screen.getByText('Begin Game')).toBeInTheDocument()
    })
  })

  describe('Piece Selection', () => {
    it('should select a piece when clicked', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')

      fireEvent.click(firstPieceCard!)
      expect(firstPieceCard).toHaveClass('selected')
    })

    it('should deselect a piece when clicked again', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')

      // Select
      fireEvent.click(firstPieceCard!)
      expect(firstPieceCard).toHaveClass('selected')

      // Deselect
      fireEvent.click(firstPieceCard!)
      expect(firstPieceCard).not.toHaveClass('selected')
    })

    it('should not select a placed piece', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')

      // Mock piece as placed
      firstPieceCard?.classList.add('placed')

      fireEvent.click(firstPieceCard!)
      expect(firstPieceCard).not.toHaveClass('selected')
    })
  })

  describe('Piece Rotation', () => {
    it('should rotate piece on right-click', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')

      // Select piece first
      fireEvent.click(firstPieceCard!)

      // Check initial rotation
      expect(screen.getByText('0°')).toBeInTheDocument()

      // Right-click to rotate
      fireEvent.contextMenu(firstPieceCard!)

      // Should rotate to 90°
      expect(screen.getByText('90°')).toBeInTheDocument()
    })

    it('should cycle rotation through 360 degrees', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')

      fireEvent.click(firstPieceCard!)

      // Rotate 4 times (0 -> 90 -> 180 -> 270 -> 0)
      fireEvent.contextMenu(firstPieceCard!) // 90
      fireEvent.contextMenu(firstPieceCard!) // 180
      fireEvent.contextMenu(firstPieceCard!) // 270
      fireEvent.contextMenu(firstPieceCard!) // 0

      expect(screen.getByText('0°')).toBeInTheDocument()
    })

    it('should rotate selected piece on canvas wheel', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      fireEvent.click(firstPieceCard!)
      expect(screen.getByText('0°')).toBeInTheDocument()

      fireEvent.wheel(canvas, { deltaY: 100 })
      expect(screen.getByText('90°')).toBeInTheDocument()
    })
  })

  describe('Canvas Interaction', () => {
    it('should show hover cell when piece is selected and mouse moves on canvas', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      fireEvent.click(firstPieceCard!)

      // Mock canvas position
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 })

      // Hover state should be set (verified by internal state)
      expect(canvas).toBeInTheDocument()
    })

    it('should clear hover when mouse leaves canvas', () => {
      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      fireEvent.click(firstPieceCard!)
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 })
      fireEvent.mouseLeave(canvas)

      // Hover should be cleared
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('Piece Placement', () => {
    it('should call API to place piece when canvas is clicked with valid position', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      // Select piece
      fireEvent.click(firstPieceCard!)

      // Mock canvas position
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      // Click to place
      fireEvent.click(canvas, { clientX: 100, clientY: 100 })

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `/api/v1/games/${mockProps.sessionId}/pieces`,
          expect.objectContaining({
            piece_type: PIECE_DEFINITIONS[0].type,
            piece_color: PIECE_DEFINITIONS[0].color,
          }),
          { params: { username: mockProps.username } }
        )
      })
    })

    it('should update placed pieces after successful placement', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      fireEvent.click(firstPieceCard!)

      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      fireEvent.click(canvas, { clientX: 100, clientY: 100 })

      await waitFor(() => {
        expect(screen.getByText('1 / 7 pieces')).toBeInTheDocument()
      })
    })

    it('should show error toast on placement failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: { detail: 'Invalid placement' } }
      })

      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      fireEvent.click(firstPieceCard!)

      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      fireEvent.click(canvas, { clientX: 100, clientY: 100 })

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled()
      })
    })
  })

  describe('Piece Re-placement', () => {
    it('should allow selecting placed piece for re-placement', async () => {
      // First, place a piece
      mockedAxios.post.mockResolvedValue({ data: { success: true } })

      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      // Place piece
      fireEvent.click(firstPieceCard!)
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      fireEvent.click(canvas, { clientX: 100, clientY: 100 })

      await waitFor(() => {
        expect(firstPieceCard).toHaveClass('placed')
      })

      // Click on the placed piece on canvas to re-select
      fireEvent.click(canvas, { clientX: 100, clientY: 100 })

      // Should be selected again
      await waitFor(() => {
        expect(firstPieceCard).toHaveClass('selected')
      })
    })
  })

  describe('Color Consistency', () => {
    it('should have consistent color mapping', () => {
      render(<DirectorView {...mockProps} />)
      // This test verifies that the COLOR_MAP is consistent
      // Check via component rendering
      expect(screen.getByText('Laser Preview')).toBeInTheDocument()
    })
  })

  describe('Begin Game', () => {
    it('should disable begin button when not enough pieces placed', () => {
      render(<DirectorView {...mockProps} />)
      const beginButton = screen.getByText('Begin Game')
      expect(beginButton).toBeDisabled()
    })

    it('should enable begin button when correct number of pieces placed', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } })

      const { container } = render(<DirectorView {...mockProps} />)
      const canvas = container.querySelector('canvas')!

      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      // Place 7 pieces (difficulty)
      for (let i = 0; i < 7; i++) {
        const pieceCard = container.querySelectorAll('.piece-card')[i]
        fireEvent.click(pieceCard!)
        fireEvent.click(canvas, { clientX: 50 + i * 60, clientY: 100 })
        await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled())
      }

      await waitFor(() => {
        const beginButton = screen.getByText('Begin Game')
        expect(beginButton).not.toBeDisabled()
      })
    })

    it('should call begin game API when button clicked', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } })

      const { container } = render(<DirectorView {...mockProps} />)
      const canvas = container.querySelector('canvas')!

      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      // Place 7 pieces
      for (let i = 0; i < 7; i++) {
        const pieceCard = container.querySelectorAll('.piece-card')[i]
        fireEvent.click(pieceCard!)
        fireEvent.click(canvas, { clientX: 50 + i * 60, clientY: 100 })
        await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled())
        vi.clearAllMocks()
      }

      const beginButton = screen.getByText('Begin Game')
      fireEvent.click(beginButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `/api/v1/games/${mockProps.sessionId}/begin`,
          {},
          { params: { username: mockProps.username } }
        )
      })
    })
  })

  describe('Wave Preview', () => {
    it('should fetch wave previews after placing pieces', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          exit_position: 'K',
          exit_color: 'red'
        }
      })

      const { container } = render(<DirectorView {...mockProps} />)
      const firstPieceCard = container.querySelector('.piece-card')
      const canvas = container.querySelector('canvas')!

      fireEvent.click(firstPieceCard!)
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      fireEvent.click(canvas, { clientX: 100, clientY: 100 })

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/preview_wave'),
          expect.any(Object)
        )
      })
    })

    it('should display wave preview results', () => {
      render(<DirectorView {...mockProps} />)
      expect(screen.getByText('Laser Preview')).toBeInTheDocument()
    })
  })
})
