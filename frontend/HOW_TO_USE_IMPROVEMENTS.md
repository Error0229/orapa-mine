# How to Use the Improved DirectorView

## Quick Start

### Step 1: Replace the old file (Recommended)

```bash
cd C:\Users\cato\orapa-mine\frontend\src\components

# Backup the original (optional)
copy DirectorView.tsx DirectorView.old.tsx

# Replace with the improved version
copy DirectorViewImproved.tsx DirectorView.tsx
```

### Step 2: Run the application

```bash
npm run dev
```

### Step 3: Test the improvements

1. **Drag and Drop:** Click and drag pieces from the palette onto the grid
2. **Rotation:** Right-click or scroll while hovering over a piece to rotate
3. **Re-placement:** Click on a placed piece in the grid to select it for re-placement
4. **Validation:** Try placing pieces in invalid positions - you'll see red highlighting

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm test -- --watch

# See test UI
npm run test:ui
```

---

## What's Fixed

### ✅ Drag and Drop
**Before:** Had to click piece, then click grid position
**After:** Drag piece directly onto grid - much more intuitive!

```tsx
// Now uses @dnd-kit/core for real drag and drop
<DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
  <DraggablePieceCard piece={piece} ... />
</DndContext>
```

### ✅ Color Consistency
**Before:** Transparent pieces showed as different colors in different places
**After:** Unified color system with proper opacity handling

```typescript
// Consistent color mapping
const COLOR_MAP = {
  transparent: '#94a3b8', // Same everywhere!
  // ... other colors
}

// Canvas helper for opacity
const getCanvasColor = (color: string, opacity: number) => {
  // Converts hex to rgba properly
}
```

### ✅ Re-placement Bug
**Before:** Clicking a placed piece to move it caused "game not exist" error
**After:** Removes piece from state before re-placing, preventing conflicts

```typescript
// Key fix in handleCanvasClick
if (cells.some(([cx, cy]) => cx === x && cy === y)) {
  // Remove from placed pieces FIRST
  setPlacedPieces(prev => prev.filter(p => !(p.type === pieceDef.type && p.color === pieceDef.color)))
  setSelectedPiece(pieceDef)
  toast.info(`Selected ${pieceDef.displayName} for re-placement`, { icon: '🔄' })
  return
}
```

---

## Using the Improved Component

### Import and Use

```tsx
// In your app/router file
import DirectorView from './components/DirectorView' // Will use the new one after rename

function App() {
  return (
    <DirectorView
      sessionId="your-session-id"
      username="player1"
      difficulty={7}
    />
  )
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `sessionId` | `string` | Game session ID from backend |
| `username` | `string` | Player username |
| `difficulty` | `number` | Number of pieces to place (usually 7) |

---

## New User Experience

### Drag and Drop Flow

1. **Select:** Click or start dragging a piece from the palette
2. **Preview:** See the piece follow your cursor with a ghost overlay
3. **Validate:** Hover over grid - green = valid, red = invalid
4. **Place:** Drop or click to place the piece
5. **Confirm:** See success toast and wave preview updates

### Re-placement Flow

1. **Select:** Click on any placed piece in the grid
2. **Confirm:** See toast "Selected {piece} for re-placement 🔄"
3. **Reposition:** Drag or click to place in new position
4. **Done:** Piece moves to new location

### Visual Indicators

- **🎯 Crosshair cursor:** Piece is selected
- **✓ Green checkmark:** Piece is placed
- **🔄 Blue badge:** Shows current rotation (0°, 90°, 180°, 270°)
- **📊 Laser Preview:** Updates automatically as you place pieces

---

## Troubleshooting

### Drag not working?
- Make sure you're dragging an **unplaced** piece (no green checkmark)
- Try clicking first to select, then clicking on grid

### Colors look weird?
- Clear browser cache
- Check that CSS file is loaded properly

### "Game not exist" error still happening?
- Make sure you're using `DirectorViewImproved.tsx`
- Check that API endpoint is correct: `/api/v1/games/${sessionId}/pieces`

### Tests failing?
- Run `npm install` to ensure all dependencies are installed
- Check `vitest.config.ts` exists
- Make sure `src/test/setup.ts` has canvas mocks

---

## Comparing Old vs New

Want to see the difference? Keep both files temporarily:

```tsx
// App.tsx
import DirectorViewOld from './components/DirectorView.old'
import DirectorViewNew from './components/DirectorViewImproved'

// Toggle between them
const USE_NEW_VERSION = true

function App() {
  const Component = USE_NEW_VERSION ? DirectorViewNew : DirectorViewOld

  return <Component sessionId={id} username={user} difficulty={7} />
}
```

---

## Performance Notes

- **Drag activation:** 8px threshold prevents accidental drags
- **Canvas redraws:** Only on state changes (optimized with React.useEffect)
- **API calls:** 10-second timeout prevents hanging
- **Memory:** Proper cleanup in useEffect hooks

---

## Future Enhancements (Optional)

If you want to add more features:

1. **Keyboard shortcuts:**
   - `R` key to rotate selected piece
   - `ESC` to deselect
   - Arrow keys to move piece

2. **Undo/Redo:**
   - Track placement history
   - Add undo/redo buttons

3. **Piece preview animation:**
   - Smooth rotation animation
   - Bounce effect on placement

4. **Multi-select:**
   - Select multiple pieces
   - Place them in sequence

---

## Support

If you need help:
1. Check `IMPROVEMENTS_SUMMARY.md` for detailed technical info
2. Look at test file for usage examples: `DirectorView.test.tsx`
3. Run tests to verify: `npm test`

**Happy coding! 🚀**
