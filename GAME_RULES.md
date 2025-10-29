# Orapa Mine - Game Rules & Documentation

## Game Information
- **Designer**: Junghee Choi (Wanjin Gill)
- **Publisher**: Playte
- **Players**: 2-5 players
- **Age**: 8+
- **Duration**: 20-30 minutes
- **Type**: Deduction game with spatial reasoning

## Game Overview
Orapa Mine is a deduction board game where one player acts as the **Director** of the mine, secretly placing colored mineral pieces on a grid. The other players are **Explorers** who must deduce the positions and colors of all minerals by shooting "elastic waves" through the mine and observing where they exit and what color they become.

## Components

### Physical Components
1. **2 Mine Boards** - 10 cells wide × 8 cells tall grid
2. **5 Screens** - Used by the Director to hide their mineral placement
3. **2 Sets of Minerals** - Tangram-shaped pieces in different colors
4. **Solution Sheets** - Grid with numbered/lettered edges for tracking waves

### Mineral Pieces (Tangram Shapes)
The game uses **7 standard tangram shapes** per set, available in different colors:

1. **2 Large Triangles**
2. **1 Medium Triangle**
3. **2 Small Triangles**
4. **1 Square**
5. **1 Parallelogram**

### Mineral Colors
- **Red** - Reflects and adds red to the wave color
- **Blue** - Reflects and adds blue to the wave color
- **Yellow** - Reflects and adds yellow to the wave color
- **Transparent/White** - Reflects without changing wave color
- **Black (Petroleum)** - Absorbs the wave (wave dissipates, no exit)

## Grid Setup

### Grid Dimensions
- **Width**: 10 cells
- **Height**: 8 cells

### Edge Numbering/Lettering
**TODO - VERIFY WITH USER:**
- Top edge: Numbers 1-10 (10 positions)?
- Left edge: Numbers 11-18 (8 positions)?
- Bottom edge: Letters A-J (10 positions)?
- Right edge: Letters K-R (8 positions)?

### Tangram Piece Placement
- Pieces align with grid cells
- Each piece occupies multiple grid cells based on its shape
- **TODO - VERIFY CELL COUNTS:**
  - Large triangles: ? cells each
  - Medium triangle: ? cells
  - Small triangles: ? cells each
  - Square: ? cells
  - Parallelogram: ? cells

## Game Setup

1. **Choose Roles**: One player becomes the **Director**, all others become **Explorers**
2. **Set Difficulty**: Players agree on how many mineral pieces the Director will place (more pieces = higher difficulty)
3. **Director Placement**:
   - Director takes a screen and places it to hide their mine board
   - Director selects mineral pieces and places them on the 10×8 grid
   - Pieces can be rotated to any orientation
   - Pieces must align with grid cells
4. **Explorers Prepare**: Each explorer takes a solution sheet to track their deductions

## Gameplay

### Turn Order
- Play proceeds clockwise, starting with the player to the left of the Director
- **Players can make guesses even when it's not their turn!**

### Shooting Elastic Waves

On their turn, an explorer:

1. **Chooses an entry point** - Selects a number (1-18) or letter (A-R) from the grid edge
2. **Announces the shot** - "I'm shooting from position [X]"
3. **Director traces the wave path**:
   - Wave enters the grid horizontally or vertically from the chosen edge position
   - Wave travels in a straight line until it hits a mineral or exits the grid
   - When hitting a mineral, the wave:
     - **Bounces at a right angle** (90°) based on the mineral's edge orientation
     - **Changes color** based on the mineral type (see Color Mixing below)
   - Wave continues bouncing and changing colors until it exits or dissipates
4. **Director announces result**:
   - Exit position (number or letter)
   - Final color of the wave
5. **Explorer records**: Notes the entry point, exit point, and color on their solution sheet

### Wave Reflection Rules

**TODO - VERIFY EXACT MECHANICS:**
- Tangram pieces have both **45° diagonal edges** and **180° straight edges**
- Reflection direction depends on:
  - Which edge of the piece the wave hits
  - The orientation/rotation of the piece
- **45° edges**: Wave bounces 90° perpendicular
- **180° edges**: Wave bounces straight back?

### Wave Entry Points

**TODO - VERIFY:**
- When shooting from position "5", does the wave enter:
  - Between cells 4 and 5?
  - At cell 5?
  - Other?

## Color Mixing System

The elastic wave starts as **white**. When it passes through or reflects off colored minerals, the colors mix according to these rules:

### Basic Color Changes
- White + **Red** = Red
- White + **Blue** = Blue
- White + **Yellow** = Yellow
- White + **Transparent** = White (no change)
- Any color + **Black (Petroleum)** = Wave dissipates (no exit reported)

### Color Mixing (Additive)
When a wave reflects off multiple colored minerals:

- **Red + Blue** = Violet
- **Red + Yellow** = Orange
- **Blue + Yellow** = Green
- **Red + Blue + Yellow** = Black

### Special Cases
- **Transparent/White mineral**: Reflects the wave without changing its color
- **Black (Petroleum)**: The wave is absorbed and dissipates - Director reports "no exit"

## Making a Guess

At any time (even on another player's turn), an explorer can:

1. Announce they want to make a guess
2. Mark on their solution sheet:
   - The position of each mineral piece
   - The color of each mineral piece
   - The orientation of each piece
3. The Director verifies the guess
4. If **completely correct** → That player **wins the game**!
5. If incorrect → Play continues (that explorer cannot guess again?)

**TODO - VERIFY:** What happens after a failed guess? Can they guess again?

## Winning the Game

The **first player to correctly identify the positions, colors, and orientations of ALL mineral pieces wins** the game.

## Strategy Tips

1. **Map the grid systematically** - Shoot waves from different angles to triangulate positions
2. **Track color changes** - Use color mixing clues to deduce which minerals are present
3. **Deduce shapes** - Different bounce patterns reveal different tangram shapes and orientations
4. **Count cells** - Keep track of how many cells are "occupied" based on wave behavior
5. **Use process of elimination** - Rule out impossible configurations

## Variants & Difficulty Adjustments

### Easy Mode
- Director places fewer pieces (e.g., 3-4 pieces)
- Use only one or two colors

### Standard Mode
- Director places 5-7 pieces
- Mix of different colors

### Hard Mode
- Director places all or most pieces (up to 14 pieces total if using 2 sets)
- Multiple colors including transparent pieces
- Can include symmetrical white pieces (note: original rules had issues with perfect symmetry - see Revised Rules)

## Known Issues & Revised Rules

The original game had a flaw when **two white/transparent tiles are placed in perfect symmetry**, which could make the puzzle unsolvable.

**Revised rulebooks** address this issue:
- BoardGameGeek has updated rulebook PDFs (2nd version)
- Check for "Orapa Mine Revised Rulebook" for the official fix

## Implementation Notes

**TODO - Technology decisions:**
- What platform? (Web-based, Python, etc.)
- UI framework?
- Multiplayer support?

**Key Implementation Challenges:**
1. Ray-tracing algorithm for wave bouncing
2. Tangram piece rotation and cell occupation
3. Color mixing logic
4. Grid coordinate system
5. User interface for both Director and Explorer views

---

## Questions to Resolve

1. ✓ Tangram shapes - Confirmed: 7 standard tangram pieces
2. ✓ Number of pieces - Confirmed: Variable, player-determined for difficulty
3. ✓ Grid size - Confirmed: 10×8 cells
4. Edge numbering exact layout - NEEDS VERIFICATION
5. Piece area/cell counts - NEEDS VERIFICATION
6. Reflection mechanics details - NEEDS VERIFICATION
7. Wave entry point mechanics - NEEDS VERIFICATION
8. Technology stack preference - NEEDS USER INPUT
9. Failed guess consequences - NEEDS VERIFICATION

---

*This document will be updated as we verify details and implement the game.*
