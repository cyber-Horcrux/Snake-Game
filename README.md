# NEON SNAKE — ONE MORE RUN

A modern, futuristic, addictive cyberpunk Snake arcade game built with React, TypeScript, HTML5 Canvas 2D, and procedural Web Audio API.

## Features

- **Cyberpunk Visual System**: Custom neon color palette (#080A12, #43F5FF, #9865FF, #FF4FD8, #39FF14), glowing multi-segment snake with directional optic eyes, cyber grid arena, and responsive DPR-aware canvas rendering.
- **Three Distinct Game Modes**:
  - **CLASSIC**: Solid walls, fatal self-collision, steady difficulty curve.
  - **ZEN**: Infinite toroidal wraparound borders, relaxed speed progression for endless flow state.
  - **RUSH**: High initial speed, rapid difficulty scaling, 1.5x bonus score multipliers.
- **Power-Ups & Energy Nodes**:
  - **Neon Core**: Standard food (+10 PTS, grows snake, advances level every 5 eaten).
  - **Bonus Star**: Timed high-value energy node (+30 PTS, with countdown ring indicator).
  - **Chrono Shift**: Temporarily slows simulation speed by ~45% for 7.5s for precise cornering.
  - **Aegis Shield**: Quantum-wraps the snake and absorbs one fatal wall collision or self-collision without ending the run.
- **Procedural Web Audio Synth**: Custom synthesized sound effects (synthesized plucks, harmonic chimes, sci-fi sweeps, shield shatter, level-up fanfares, game-over descent) with zero external assets and full master mute & volume control.
- **Responsive Controls**:
  - Desktop: WASD / Arrow keys, Space/Esc (Pause/Resume), R (Restart), M (Mute).
  - Mobile & Tablet: Custom on-screen cyber D-Pad, touch swipe gestures on arena.
- **State Machine & Modals**:
  - Main Menu Launcher with bespoke inline SVG emblem, mode selector, and personal best tracking.
  - Minimal In-Game Perimeter HUD (low-occlusion, zero backdrop-filter over active canvas).
  - System Pause Modal with run stats.
  - Game Over Modal with run summary, record celebration, and one-click clipboard sharing.
  - Tactical Manual (How to Play) and Settings Configuration.
- **Safe Persistence**:
  - LocalStorage integration with schema validation and fallback defaults.
  - Separate high score tracking per mode.
  - Two-step confirmation for resetting records.

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── HeaderHUD.tsx         # Minimal perimeter in-game HUD
│   │   ├── TitleScreen.tsx       # Title screen with SVG lockup & mode select
│   │   ├── PauseModal.tsx        # Pause modal with live run statistics
│   │   ├── GameOverModal.tsx     # Game Over modal with score breakdown & share
│   │   ├── HowToPlayModal.tsx    # Tactical manual & game guide
│   │   ├── SettingsModal.tsx     # Audio, graphics & D-pad configuration
│   │   └── TouchDPad.tsx         # On-screen directional pad for mobile
│   ├── game/
│   │   ├── types.ts              # TypeScript interfaces and game types
│   │   ├── constants.ts          # Centralized game tuning constants
│   │   ├── engine.ts             # Pure, deterministic Snake engine
│   │   ├── engine.test.ts        # Unit test suite for engine mechanics
│   │   ├── renderer.ts           # Canvas 2D neon renderer & particle pool
│   │   ├── audio.ts              # Procedural Web Audio API sound synthesizer
│   │   ├── persistence.ts        # LocalStorage persistence & validation
│   │   └── persistence.test.ts   # Unit test suite for persistence
│   ├── App.tsx                   # Main game orchestrator & 60fps loop
│   ├── index.css                 # Global Tailwind CSS & neon styling
│   └── main.tsx                  # React entry point
└── package.json
```

## Running the Application

```bash
# Start development server
npm run dev

# Run automated unit tests
npm test
# Or directly with Node's native test runner:
node --test src/game/*.test.ts

# Typecheck and lint
npm run lint

# Production build
npm run build
```

## Automated Tests Executed

23 automated unit tests executed via `node --test` with 100% pass rate:
1. `isOpposite`: Correctly detects opposite directions and non-opposites.
2. `snake initialization`: Initializes with correct length and faces RIGHT.
3. `movement`: Updates head and body coordinates accurately.
4. `180° rejection`: Rejects suicide reversals.
5. `rapid turn queue`: Buffers up to 2 rapid turns without input dropping.
6. `food eating`: Awards points once, queues growth, and increments food count.
7. `tail-vacating edge case`: Moving into the tail cell is legal when not growing.
8. `tail-vacating collision`: Moving into the tail cell is fatal when growing.
9. `self-collision`: Detects self-collision when unshielded.
10. `wall collision in classic`: Solid boundaries cause death.
11. `wall wraparound in zen`: Toroidal edges wrap coordinates cleanly.
12. `shield absorbs wall`: Shield quantum-wraps snake and absorbs collision.
13. `shield absorbs self`: Shield absorbs self-collision and preserves run.
14. `findEmptyCell on full board`: Gracefully returns null without hanging.
15. `full board victory`: Triggers victory state when grid is filled.
16. `slow-mo speed calculation`: Correctly adjusts tick interval.
17. `level progression`: Triggers level-up every 5 food items eaten.
18. `loadBestScores`: Returns defaults when storage is empty or null.
19. `corrupt JSON handling`: Sanitizes malformed or corrupted localStorage data.
20. `updateBestScore`: Updates high score per mode independently.
21. `resetBestScores`: Clears all scores back to 0.
22. `loadSettings sanitization`: Sanitizes invalid settings and clamps volumes.
23. `storage exception resilience`: Failsafes prevent storage errors from crashing gameplay.
