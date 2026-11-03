# NEON SNAKE — ONE MORE RUN

A modern, futuristic, addictive cyberpunk Snake arcade game built with React, TypeScript, HTML5 Canvas 2D, and procedural Web Audio API.

## Features

- **Cyberpunk Visual System**: Custom neon color palette (`#080A12`, `#43F5FF`, `#9865FF`, `#FF4FD8`, `#39FF14`, `#FFD700`), glowing multi-segment snake with directional optic eyes, cyber grid arena, and responsive DPR-aware canvas rendering.
- **Customizable Neon Chassis Skins**:
  - **Cyber Cyan (Default)**: Cyan neural core with purple-magenta energy gradient.
  - **Matrix Emerald**: Phosphor green terminal cascade with emerald core.
  - **Synth Sunset**: Outrun dusk neon aesthetic with orange, pink, and violet tones.
  - **Hyper Violet**: Ultraviolet laser arc with vivid radiant magenta optics.
  - **Solar Prestige**: Hyper-conductive pure gold alloy with solar flare accents.
- **Three Distinct Game Modes**:
  - **CLASSIC**: Solid walls, fatal self-collision, steady difficulty curve.
  - **ZEN**: Infinite toroidal wraparound borders, relaxed speed progression for endless flow state.
  - **RUSH**: High initial speed, rapid difficulty scaling, 1.5x bonus score multipliers.
- **Power-Ups & Energy Nodes**:
  - **Neon Core**: Standard food (+10 PTS, grows snake, advances level every 5 eaten).
  - **Bonus Star**: Timed high-value energy node (+30 PTS, with countdown ring indicator).
  - **Chrono Shift**: Temporarily slows simulation speed by ~45% for 7.5s for precise cornering.
  - **Aegis Shield**: Quantum-wraps the snake and absorbs one fatal wall collision or self-collision without ending the run.
- **Dynamic Combo Multiplier System**:
  - Consuming energy nodes in quick succession (within 3.2s) activates escalating combo multipliers (1x, 2x, 3x, 4x MAX).
  - Real-time animated combo badge and synthesized harmonic audio feedback.
- **Pilot Dossier & Career Telemetry**:
  - Comprehensive telemetry tracking lifetime runs, cumulative score, highest score, food consumed, bonus stars, max combo, shields utilized, and wraparounds.
  - 10 Unlocked/Progressive Achievements (First Bite, Centurion, High Roller, Cyber Anaconda, Aegis Master, Warp Runner, Rush Hour, Speed Demon, Combo Matrix, Neon Legend).
- **Procedural Web Audio Synth**: Custom synthesized sound effects (synthesized plucks, harmonic chimes, combo pings, sci-fi sweeps, shield shatter, level-up fanfares, game-over descent, achievement fanfares) with zero external assets and full master mute & volume control.
- **Responsive Controls**:
  - Desktop: WASD / Arrow keys, Space/Esc (Pause/Resume), R (Restart), M (Mute).
  - Mobile & Tablet: Custom on-screen cyber D-Pad, touch swipe gestures on arena.
- **State Machine & Modals**:
  - Main Menu Launcher with bespoke inline SVG emblem, mode selector, and personal best tracking.
  - Minimal In-Game Perimeter HUD (low-occlusion, zero backdrop-filter over active canvas).
  - System Pause Modal with run stats.
  - Game Over Modal with run summary, record celebration, and one-click clipboard sharing.
  - Pilot Dossier modal for telemetry and achievements.
  - Tactical Manual (How to Play) and Settings Configuration.
- **Safe Persistence**:
  - LocalStorage integration with schema validation and fallback defaults.
  - Separate high score tracking per mode.
  - Two-step confirmation for resetting records or dossier.

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── HeaderHUD.tsx         # Minimal perimeter in-game HUD with combo indicator
│   │   ├── TitleScreen.tsx       # Title screen with SVG lockup, mode select & dossier link
│   │   ├── PauseModal.tsx        # Pause modal with live run statistics
│   │   ├── GameOverModal.tsx     # Game Over modal with score breakdown, dossier & share
│   │   ├── StatsModal.tsx        # Career telemetry & achievement badges dossier
│   │   ├── HowToPlayModal.tsx    # Tactical manual & game guide
│   │   ├── SettingsModal.tsx     # Audio, skins, graphics & D-pad configuration
│   │   └── TouchDPad.tsx         # On-screen directional pad for mobile
│   ├── game/
│   │   ├── types.ts              # TypeScript interfaces, skins, achievements, and game types
│   │   ├── constants.ts          # Centralized game tuning constants & skin palettes
│   │   ├── engine.ts             # Pure, deterministic Snake engine with combo & wraparound
│   │   ├── engine.test.ts        # Unit test suite for engine mechanics & combo system
│   │   ├── renderer.ts           # Canvas 2D neon renderer & particle pool with skin theming
│   │   ├── audio.ts              # Procedural Web Audio API sound synthesizer
│   │   ├── persistence.ts        # LocalStorage persistence & settings validation
│   │   ├── persistence.test.ts   # Unit test suite for persistence & skin validation
│   │   ├── stats.ts              # Lifetime statistics & achievement progression engine
│   │   └── stats.test.ts         # Unit test suite for dossier telemetry & achievements
│   ├── App.tsx                   # Main game orchestrator & 60fps loop
│   ├── index.css                 # Global Tailwind CSS & neon styling
│   └── main.tsx                  # React entry point
├── index.html                    # Entry HTML with typography & SEO metadata
├── metadata.json                 # AI Studio applet metadata
└── package.json
```


### Game Engine Mechanics (`src/game/engine.test.ts`)
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
18. `combo multiplier`: Increments multiplier on rapid consecutive food consumption.
19. `combo reset`: Resets to 1x when time window elapses without food.
20. `food expiration`: Expired timed items are safely removed from the board.
21. `zen wraparounds`: Toroidal boundary crossings increment the telemetry counter.

### Storage & Persistence (`src/game/persistence.test.ts`)
22. `loadBestScores`: Returns defaults when storage is empty or null.
23. `corrupt JSON handling`: Sanitizes malformed or corrupted localStorage data.
24. `updateBestScore`: Updates high score per mode independently.
25. `resetBestScores`: Clears all scores back to 0.
26. `loadSettings sanitization`: Sanitizes invalid settings, clamps volumes, and falls back to default skin.
27. `storage exception resilience`: Failsafes prevent storage errors from crashing gameplay.

### Dossier Telemetry & Achievements (`src/game/stats.test.ts`)
28. `loadStats`: Returns default stats on null or empty storage.
29. `loadStats sanitization`: Gracefully handles corrupt or malformed stats data.
30. `saveStats`: Persists valid statistics accurately.
31. `loadAchievements`: Initializes all 10 badges with locked state.
32. `first_bite achievement`: Unlocks automatically upon first food eaten.
33. `centurion achievement`: Unlocks when run score reaches 100+.
34. `rush_hour achievement`: Unlocks in Rush mode with score >= 250.
35. `warp_runner achievement`: Unlocks when Zen wraparounds reach 20+.
36. `resetStatsAndAchievements`: Cleans all records back to default factory state.


