<div align="center">

<img src="./src/assets/branding/logo-horizontal.svg" alt="NEON SNAKE — ONE MORE RUN" width="640" />

# NEON SNAKE — ONE MORE RUN

**A high-performance cybernetic arcade snake game engineered for modern desktop browsers and Android mobile devices.**

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.6-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Android API](https://img.shields.io/badge/Android-API%2024%2B%20%7C%20Target%2036-3DDC84?style=flat-square&logo=android&logoColor=white)](https://developer.android.com/)
[![Unit Tests](https://img.shields.io/badge/Tests-543%20Passing-10FFA0?style=flat-square&logo=node.js&logoColor=black)](#testing-and-quality-assurance)

[Overview](#overview) • [Core Features](#core-features) • [Game Modes](#game-modes) • [Cosmetic Customization](#cosmetic-customization) • [Progression & Economy](#progression--economy) • [Controls](#controls) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Android Build Guide](#android-development--release-builds) • [Roadmap](#project-roadmap)

</div>

---

## Overview

**NEON SNAKE: ONE MORE RUN** (Release v1.3.0) is a precision arcade snake simulation built with an unapologetic cybernetic aesthetic. Rooted in the official **Apex Cyber-Viper** brand identity, NEON SNAKE combines hardware-accelerated 60 FPS HTML5 Canvas 2D rendering, procedural Web Audio synthesis, multi-mode tactical gameplay, and deep cosmetic customization with zero microtransactions or grinding walls.

Powered by a modern full-stack mobile web architecture featuring **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS 4**, and **Capacitor 8**, NEON SNAKE is built from the ground up for instantaneous response times, fluid swipe navigation, and native Android packaging (`com.cyberhorcrux.neonsnake`).

---

## Visual Showcase

<div align="center">

<img src="./public/og-image.png" alt="NEON SNAKE Gameplay Preview Banner" width="760" />

</div>

> **Authentic Screenshot Asset Standards**:
> All visual assets in this repository reflect genuine, unedited gameplay from running production builds. View capture requirements and catalog definitions in the [`docs/screenshots/`](./docs/screenshots/) directory.

---

## Core Features

- **Apex Cyber-Viper Brand Identity**: Original geometric kinetic vector branding suite designed across 7 official SVG assets, custom density-scaled Android launcher icons (`mipmap-anydpi-v26`, `hdpi`–`xxxhdpi`), and branded native splash screens.
- **Deterministic 60 FPS Canvas 2D Engine**: High-performance game loop completely decoupled from React render triggers, featuring DPR-aware scaling, sub-pixel position interpolation, dynamic body curves, additive glow passes, and particle recycling pools.
- **Snake Trails Slipstream Engine**: An energy wake system with a fixed-capacity (360 samples) zero-GC ring buffer, adaptive stride distance estimation, and isolated boundary splitting for seamless cornering and edge-wrapping.
- **Curated Multi-Stage Maze Campaign**: 6 handcrafted tactical architectural maze levels with perimeter barrier blocks, progressive obstacle density, and Warp Gate extraction portals.
- **Level 1–50 Pilot XP Progression**: Deterministic career experience engine rewarding food consumption, survival time, combo chains, and stage victories with unlockable titles and cosmetic gear.
- **UTC-Synchronized Daily Challenges**: Three procedural daily missions across Easy, Medium, and Hard tiers rewarding Trophy Stars, tracking streaks, and unlocking milestone awards.
- **Dynamic Combo Multiplier**: Eating energy nodes within a rapid 3.2-second window escalates score multipliers (1x, 2x, 3x, 4x MAX) accompanied by synthesized harmonic chords.
- **Procedural Web Audio Synthesizer**: 100% code-driven procedural audio synthesizer utilizing the Web Audio API with zero external audio files. Generates interactive oscillators, harmonic chimes, shield shatter resonances, and combo sweeps.
- **Adaptive Mobile & Desktop Controls**: Multi-modal control system supporting desktop keyboards, directional swipe gestures, and non-obstructive virtual D-pads in both portrait and landscape orientations.
- **Resilient Offline Local Storage**: Fault-tolerant `localStorage` persistence with defensive schema validation, corruption recovery, legacy key migration, and independent high-score tracking per mode.

---

## Game Modes

| Mode | Border Physics | Speed Progression | Score Multiplier | Gameplay Focus |
|---|---|---|---|---|
| **CLASSIC** | Solid Walls | Incremental ramp (+7ms per food level) | 1.0x Base | Authentic arcade reflex test. Collisions with perimeter walls or your own body are fatal. |
| **ZEN** | Toroidal Wraparound | Smooth, relaxed tempo (+5ms per food level) | 1.0x Base | Flow-state meditation. Crossing any border wraps the snake infinitely to the opposing side. Tail angles compute continuously across seams. |
| **RUSH** | Solid Walls | Extreme initial tick rate + steep scaling | 1.5x Bonus | High-octane reflex challenge. Hyper-accelerated tick rate (down to 48ms) rewarding aggressive risk-taking. |
| **MAZE** | Architectural Obstacles | Variable tactical pace (+6ms per food level) | Dynamic Bonus | 6-stage campaign. Navigate tight corridors, collect 10 Neon Cores, and extract via the active perimeter Warp Gate for bonus score points. |

### Maze Campaign Stages

1. **Stage 1: The Initiation** (Max Ingress Capacity: 22) — Introductory perimeter baffles and foundational cornering.
2. **Stage 2: Twin Chambers** (Max Ingress Capacity: 20) — Symmetrical center divide requiring precise vertical navigation.
3. **Stage 3: The Crossfire** (Max Ingress Capacity: 18) — Interlocking quadrant barriers with tight turning pockets.
4. **Stage 4: Quantum Core** (Max Ingress Capacity: 22) — Concentric inner obstacle ring surrounding the core energy nodes.
5. **Stage 5: The Labyrinth** (Max Ingress Capacity: 16) — Dense serpentine corridors demanding rapid turn buffering.
6. **Stage 6: Apex Gauntlet** (Max Ingress Capacity: 14) — The ultimate tactical campaign challenge with high-density obstacle matrices.

---

## Cosmetic Customization

Cosmetics are unlocked entirely through gameplay milestones, level progression, and challenge completion—**no paid currencies, microtransactions, or randomized loot boxes**.

### 1. Snake Chassis Skins (8 Total)

| Skin ID | Name | Primary Optics | Body Gradient & Aesthetic | Unlock Condition |
|---|---|---|---|---|
| `cyber_cyan` | **Cyber Cyan** | #43F5FF (Cyan) | Cyan neural core into deep ultraviolet | Starter (Default) |
| `matrix_green` | **Matrix Emerald** | #00FF66 (Emerald) | Phosphor-green terminal cascade | Starter |
| `synth_sunset` | **Synth Sunset** | #FF7700 (Amber) | Outrun dusk gradient with magenta & violet | Reach Level 3 |
| `hyper_violet` | **Hyper Violet** | #D946EF (Violet) | High-frequency ultraviolet laser arc | Reach Level 8 |
| `crimson_blaze` | **Crimson Blaze** | #FF2A4B (Crimson) | Incandescent volcanic plasma glow | Reach Level 15 |
| `arctic_frost` | **Arctic Frost** | #70E1FF (Cryo Ice) | Sub-zero crystalline cyan weave | 50 Zen Mode Wraps |
| `gold_prestige` | **Solar Prestige** | #FFD700 (Gold) | Conductive auric alloy with amber corona | Reach Level 30 |
| `apex_void` | **Apex Void** | #A855F7 (Purple) | Dark singularity core with deep purple halo | Complete Maze Campaign |

### 2. Snake Trails (8 Total)

| Trail ID | Name | Visual Particle Signature | Unlock Condition |
|---|---|---|---|
| `none` | **Stealth (None)** | Clean snake body without slipstream emission | Starter |
| `cyber_pulse` | **Cyber Pulse** | Dual pulsing cyan energy particles | Starter (Equipped) |
| `matrix_stream` | **Matrix Stream** | Digital phosphor green data pips | Reach Level 5 |
| `plasma_fire` | **Plasma Fire** | Incandescent magenta and amber exhaust flames | Reach Level 12 |
| `frost_vapor` | **Frost Vapor** | Cryogenic sub-zero vapor wisps | 30 Zen Screen Wraps |
| `solar_radiance` | **Solar Radiance** | Golden solar corona with 8-vertex closed star glints | Reach Level 25 |
| `void_singularity` | **Void Singularity** | Gravitational distortion nodes with ultraviolet rings | Clear Maze Stage 3 |
| `hyper_streak` | **Hyper Streak** | Continuous high-velocity dual neon speed rails | Eat 25 Food in a Single Run |

### 3. Board Themes (6 Total)

| Theme ID | Name | Floor Material & Lighting | Accent Palette | Unlock Condition |
|---|---|---|---|---|
| `obsidian_grid` | **Obsidian Grid** | Graphite weave with fine cyan laser lines | #00F5FF / #9865FF | Starter (Default) |
| `industrial_foundry` | **Industrial Foundry** | Riveted alloy plates with amber hazard accents | #FF9900 / #FF3300 | Starter |
| `arctic_research` | **Arctic Research** | Frosted cryo-deck with crystalline illumination | #00E5FF / #70A0FF | Reach Level 10 |
| `bio_dome` | **Bio Dome** | Subterranean neural moss with emerald bio-glow | #00FF66 / #10FFA0 | Reach Level 18 |
| `solar_array` | **Solar Array** | Golden photovoltaic tiles with radiant solar beams | #FFD700 / #FF8800 | 25 Campaign Victories |
| `void_observatory` | **Void Observatory** | Deep-space carbon floor with ultraviolet starlight | #9865FF / #D946EF | Reach Level 35 |

---

## Progression & Economy

### Pilot Leveling System (Levels 1–50)
Players earn career XP at the conclusion of every run based on deterministic in-game performance:
- **Food Consumed**: 10 XP per standard core.
- **Bonus Stars**: 25 XP per timed bonus core.
- **Survival Time**: 1 XP per second survived.
- **Max Combo**: Up to 40 XP bonus for maintaining 4x combo multipliers.
- **Maze Campaign Victories**: 150 XP per completed stage.

Cumulative XP requirements scale progressively from Level 1 (0 XP) to Level 50, rewarding dedicated pilots with milestone titles (*Cadet*, *Neon Viper*, *Grid Runner*, *Apex Predator*, *Cyber Legend*).

### Daily Challenges & Trophy Stars
The deterministic UTC challenge generator provisions 3 targeted missions each day:
- **Easy Mission**: 25 Trophy Stars (e.g., consume 15 Neon Cores in any mode).
- **Medium Mission**: 25 Trophy Stars (e.g., wrap 12 boundaries in Zen Mode).
- **Hard Mission**: 25 Trophy Stars (e.g., score 300+ points in Rush Mode).
- **All-Three Bonus**: Additional 50 Trophy Stars for sweeping the daily roster.
- **Consecutive Streaks**: Tracks current streak and lifetime best streak with milestone claims at 3, 7, 14, and 30 days.

### Career Telemetry & Achievements (10 Total)
The **Pilot Dossier** aggregates career telemetry and tracks 10 verifiable achievements:
1. `first_bite` — **First Bite**: Consume your first Neon Core energy node.
2. `centurion` — **Centurion**: Reach a score of 100 in any single run.
3. `high_roller` — **High Roller**: Achieve a score of 500 in a single run.
4. `cyber_anaconda` — **Cyber Anaconda**: Grow your snake to 25 segments in length.
5. `aegis_master` — **Aegis Master**: Absorb a fatal wall or body impact using an Aegis Shield.
6. `warp_runner` — **Warp Runner**: Pass through the screen perimeter 20 times in Zen Mode.
7. `rush_hour` — **Rush Hour**: Score 250 or more points in high-speed Rush Mode.
8. `speed_demon` — **Speed Demon**: Reach speed Level 5 in any active run.
9. `combo_king` — **Combo Matrix**: Achieve a 3x or higher combo multiplier.
10. `neon_legend` — **Neon Legend**: Accumulate 1,000+ total career points across all runs.

---

## Energy Nodes & Tactical Power-Ups

- 🟢 **Neon Core (+10 PTS)**: Foundational energy node. Extends snake length by 1 segment and advances the simulation speed level every 5 cores consumed.
- 🌟 **Bonus Star (+30 PTS Base)**: Rare, timed high-value energy core with an animated radial countdown ring (9-second expiration).
- ⏱️ **Chrono Shift (+15 PTS)**: Temporarily decelerates simulation speed by ~45% for 7.5 seconds, providing precision steering through narrow corridors.
- 🛡️ **Aegis Shield (+15 PTS)**: Deploys a quantum energy barrier around the snake head that absorbs exactly one fatal wall or body collision, keeping the run alive.

---

## Controls

The input system automatically detects your interaction medium and dynamically adjusts HUD layouts and gesture thresholds.

### Desktop Keyboard Controls

| Action | Primary Key | Secondary Key |
|---|---|---|
| **Steer Up** | `W` | `Up Arrow` (`↑`) |
| **Steer Down** | `S` | `Down Arrow` (`↓`) |
| **Steer Left** | `A` | `Left Arrow` (`←`) |
| **Steer Right** | `D` | `Right Arrow` (`→`) |
| **Pause / Resume** | `Spacebar` | `Escape` |
| **Instant Restart** | `R` | — |
| **Toggle Audio Mute** | `M` | — |
| **Confirm / Start** | `Enter` | — |

### Mobile & Touch Controls

Configurable anytime via the **Settings Modal**:
1. **Swipe Gestures (`swipe`)**: Intuitive drag or flick gestures anywhere across the arena canvas with an optimized 24-pixel threshold and angle disambiguation.
2. **Virtual D-Pad (`buttons`)**: Responsive on-screen directional controls engineered for ergonomic clearance:
   - *Portrait Mode*: Docked beneath the 1:1 square arena, safely outside the playfield.
   - *Landscape Mode*: Docked in the right-side gutter clearance zone, ensuring zero overlap with HUD telemetry or top-level controls.
3. **Hybrid Mode (`both`)**: Simultaneously accepts both direct arena swipe gestures and virtual D-pad button taps.

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    NEON SNAKE v1.3.0                        │
├────────────────────────────────┬────────────────────────────┤
│ Application Shell & UI State   │ React 19.0.1, TypeScript 7 │
│ Styling & Responsive Layout    │ Tailwind CSS 4.3.3         │
│ Build Tooling & Bundler        │ Vite 8.3.0                 │
│ Rendering & Visual FX          │ HTML5 Canvas 2D (60 FPS)   │
│ Sound Engine                   │ Procedural Web Audio API   │
│ Mobile Native Bridge           │ Capacitor 8.6.0 (Android)  │
│ Automated Test Suite           │ Node.js Native Test Runner │
└────────────────────────────────┴────────────────────────────┘
```

- **React 19 (`^19.0.1`)**: Component-based application shell, reactive modal orchestration, accessible dialog management, and HUD state synchronization.
- **TypeScript (`^7.0.2` / ES2022)**: Strict type safety across physics calculation loops, skin and trail definitions, event buses, and storage schemas.
- **Vite 8 (`^8.3.0`)**: Near-instant local development server and optimized Rollup client production bundler.
- **Tailwind CSS 4 (`^4.3.3`)**: Cybernetic UI theming, custom CSS variables, and safe-area inset constraints (`env(safe-area-inset-*)`).
- **HTML5 Canvas 2D**: Hardware-accelerated pixel pipeline managing multi-layer rendering, trail history buffers, glow compositing, and particle pooling.
- **Procedural Web Audio API**: 100% programmatic sound synthesis generating square, triangle, and sine wave oscillators with custom ADSR envelopes and zero external WAV/MP3 files.
- **Capacitor 8 (`^8.6.0`)**: Mobile runtime bridging the web application into a native Android APK package (`com.cyberhorcrux.neonsnake`).
- **Node.js Native Test Runner (`node:test`)**: Zero-dependency automated test runner executing 543 unit and integration tests in ~3.5 seconds.

---

## Architecture

The project maintains a strict separation of concerns between presentation, game physics, audio synthesis, and persistence:

```
src/
├── assets/
│   └── branding/            # 7 approved Apex Cyber-Viper vector SVG variants
├── components/
│   ├── branding/            # BrandLogo vector component & asset exports
│   ├── progression/         # Progression drawers & interactive canvas previews
│   │   ├── BoardThemePreviewCanvas.tsx
│   │   ├── LevelUpCelebration.tsx
│   │   ├── PlayerLevelCard.tsx
│   │   ├── SkinCollectionModal.tsx
│   │   ├── SkinPreviewCanvas.tsx
│   │   ├── TrailPreviewCanvas.tsx
│   │   └── XpBreakdownList.tsx
│   ├── CampaignVictoryModal.tsx # Full 6-stage campaign victory modal
│   ├── DailyChallengesModal.tsx # UTC daily missions & streak tracking
│   ├── GameOverModal.tsx    # Run termination summary & record celebrations
│   ├── HeaderHUD.tsx        # Minimal perimeter HUD (score, combo, active buffs)
│   ├── HowToPlayModal.tsx   # Tactical manual explaining mechanics & items
│   ├── MazeStageSelectModal.tsx # Campaign stage selection drawer
│   ├── PauseModal.tsx       # System pause dialog with real-time run telemetry
│   ├── SettingsModal.tsx    # Audio volume, skin chassis, graphics & controls
│   ├── StageClearModal.tsx  # Campaign mid-stage Warp Gate extraction modal
│   ├── StatsModal.tsx       # Pilot Dossier career telemetry & 10 achievements
│   ├── TitleScreen.tsx      # Main launcher with mode selector & 2x3 action grid
│   └── TouchDPad.tsx        # Responsive on-screen virtual directional buttons
├── game/
│   ├── audio.ts             # Procedural sound synthesizer (Web Audio API)
│   ├── challenges.ts        # UTC Daily Challenges generator & streak tracker
│   ├── constants.ts         # Speed intervals, tuning parameters & palettes
│   ├── controls.ts          # Swipe tracking & gesture-acceptance logic
│   ├── engine.ts            # Pure deterministic snake physics & collisions
│   ├── levels.ts            # Level 1–50 XP progression & reward economy
│   ├── mazes.ts             # 6 curated tactical maze campaign stage layouts
│   ├── persistence.ts       # LocalStorage validation & corruption recovery
│   ├── renderer.ts          # Main Canvas 2D renderer & particle pool
│   ├── responsive.ts        # 1:1 canvas aspect ratio & D-pad geometry math
│   ├── skin_preview.ts      # Headless canvas renderer for skin chassis previews
│   ├── skins.ts             # 8 snake chassis definitions & ownership guards
│   ├── snake_renderer.ts    # Multi-pass snake body curve & optics renderer
│   ├── stats.ts             # Lifetime statistics accumulator & 10 achievements
│   ├── theme_preview.ts     # Headless canvas renderer for board theme previews
│   ├── themes.ts            # 6 board theme definitions & material shaders
│   ├── trail_preview.ts     # Headless canvas renderer for trail previews
│   ├── trail_renderer.ts    # 8 trail particle slipstreams & ring buffer
│   ├── trails.ts            # 8 trail definitions & unlock criteria
│   ├── types.ts             # TypeScript interfaces & domain data models
│   └── *.test.ts            # 20 automated unit and integration test suites
├── App.tsx                  # Root orchestrator managing game loop & screens
├── index.css                # Tailwind CSS imports & cyber scrollbar styling
└── main.tsx                 # React application entry point
```

---

## Getting Started

### Prerequisites

- **Node.js**: Version 20.x or 22.x (Node.js 22 LTS recommended)
- **npm**: Version 10.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cyber-Horcrux/Snake-Game.git
   cd Snake-Game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize environment variables:
   ```bash
   cp .env.example .env
   ```

### Local Development

Start the local Vite development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Type Checking & Linting

Validate TypeScript types across all source modules:

```bash
npm run lint
```

*(Executes `tsc --noEmit` with zero errors).*

### Production Web Build

Compile and bundle the web application for production:

```bash
npm run build
```

This compiles optimized bundles into `dist/` with minified JavaScript, scoped CSS, and optimized vector branding.

To preview the production build locally:

```bash
npm run preview
```

---

## Android Development & Release Builds

NEON SNAKE includes an integrated native Android project wrapper powered by Capacitor 8.

### Android Application Specifications

- **Application ID / Package**: `com.cyberhorcrux.neonsnake`
- **Release Version Name**: `1.3`
- **Release Version Code**: `4`
- **Minimum SDK**: API 24 (Android 7.0 Nougat)
- **Target SDK**: API 36 (Android 16)
- **Compile SDK**: API 36
- **Adaptive Launcher Icons**: Full density support (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`)
- **Splash Screens**: Branded portrait and landscape splash screens across all five densities

### Android Prerequisites

- **Android Studio**: Ladybug (2024.2.1+) or newer
- **Java Development Kit**: JDK 21+
- **Android SDK**: Android API Platform 36 and Android SDK Build-Tools 36.x installed via the SDK Manager

### Build & Synchronization Workflow

1. Build the production web distribution:
   ```bash
   npm run build
   ```

2. Synchronize web assets with the native Android project:
   ```bash
   npx cap sync android
   ```

3. Assemble the release APK:

   - **Windows PowerShell**:
     ```powershell
     cd android
     .\gradlew.bat assembleRelease
     ```

   - **macOS / Linux / POSIX**:
     ```bash
     cd android
     ./gradlew assembleRelease
     ```

> **Release Signing Notice**:
> Assembling a signed, release-ready APK or Android App Bundle (AAB) requires a valid keystore, JDK 21+, and properly configured signing properties (`android/keystore.properties`). Never commit signing keystores, store passwords, or private key credentials to public source repositories.

---

## Testing and Quality Assurance

NEON SNAKE maintains a zero-dependency automated test suite executed via the native Node.js test runner (`node:test` and `node:assert/strict`):

```bash
npm test
```

### Verified Test Results (November 8, 2026)

- **Total Test Suites**: 20 files (`src/game/*.test.ts`)
- **Total Tests Executed**: **543**
- **Passed**: **543** (100%)
- **Failed**: **0**
- **Skipped / Todo**: **0**
- **Execution Duration**: ~3.5 seconds

### Test Suite Distribution

- `engine.test.ts` (46 tests): Turn queues, 180° direction reversal guards, tail vacating, wall impacts, and victory states.
- `trails.test.ts` (24 tests): 8 trail configurations, unlock criteria, sanitizers, and persistence.
- `trail_renderer.test.ts` (57 tests): Ring buffer history, multi-speed adaptive baselines, discontinuity retention, and 8-vertex closed star contour geometry.
- `trail_preview.test.ts` (7 tests): Dynamic wave tangents, context fallbacks, and preview rendering for all 8 trail effects.
- `skins.test.ts` (70 tests): 8 chassis definitions, ownership guards, and progression unlock criteria.
- `themes.test.ts` (51 tests): 6 board themes, material shaders, and unlock reconciliation.
- `levels.test.ts` (74 tests): XP calculations, Level 1–50 thresholds, and milestone rewards.
- `mazes.test.ts` (17 tests): 6 tactical campaign layouts, ingress capacities, and Warp Gate portals.
- `campaign_flow.test.ts` (16 tests): Stage transitions, score accumulation, and victory flows.
- `daily_challenges.test.ts` (19 tests): Deterministic UTC generation, streak counters, and Trophy Star rewards.
- `persistence.test.ts` (20 tests): LocalStorage schema validation, corruption recovery, and key migration.
- `stats.test.ts` (11 tests): Career telemetry calculations and 10 unlockable achievements.
- `snake_renderer.test.ts` (29 tests): Curve interpolation, optic glow passes, and DPR scaling.
- `renderer.test.ts` (10 tests): Multi-layer canvas orchestration and Zen mode edge wrapping.
- `skin_preview.test.ts` (23 tests): Canvas preview rendering across all 8 skin chassis.
- `controls.test.ts` (13 tests): Swipe thresholds, direction calculations, and touch/keyboard coexistence.
- `responsive.test.ts` (13 tests): 1:1 canvas aspect ratio clamping and virtual D-pad clearance across 14 viewports.
- `branding.test.ts` (10 tests): SVG XML validation, Android asset density scaling, and PWA manifest compliance.
- `progression_ui.test.ts` (25 tests): Modal tab switching, celebration triggers, and card rendering.
- `title_screen.test.ts` (8 tests): 2x3 secondary action grid, accessibility attributes, and callback routing.

*(Note: Automated testing provides rigorous regression detection across game logic and math, but does not substitute for ongoing physical device testing).*

---

## Project Roadmap

### Completed in v1.3.0
- [x] **Apex Cyber-Viper Master Brand Identity**: 7 official vector SVG assets, custom Android icons, and branded splash screens.
- [x] **Snake Trails Slipstream Engine**: 8 distinct particle trail styles, zero-GC circular buffer, and dynamic tangent previews.
- [x] **Cosmetic Customization Suite**: 8 snake chassis skins, 6 board themes, and tabbed preview drawers.
- [x] **Maze Campaign Mode**: 6 tactical architectural stages, obstacle collision routing, and Warp Gate extraction.
- [x] **Pilot Progression System**: Level 1–50 XP leveling, milestone title badges, and career progression cards.
- [x] **Daily Challenges System**: Deterministic UTC 3-tier missions, Trophy Stars economy, and streak tracking.
- [x] **Multi-Modal Controls**: Swipe gesture tracking and non-overlapping virtual D-pads for mobile portrait and landscape.
- [x] **Full Test Harness**: 543 automated unit and integration tests passing in ~3.5 seconds.

### Realistic Future Roadmap
The following features are under active technical evaluation for future releases:
1. **Custom Maze Stage Editor**: In-browser obstacle layout builder allowing players to design and test custom tactical stages.
2. **Ghost Run Replays**: Export and replay high-score runs using compact deterministic input logs.
3. **Advanced Sound Synthesizer Presets**: User-selectable audio profiles (e.g. 8-Bit Chiptune, Dark Synth, Ambient Minimal).
4. **Haptic Feedback Integration**: Native vibration patterns for food consumption, power-up activation, and shield breaks on supported mobile hardware.

---

## Contributing

Contributions that align with NEON SNAKE's architecture and performance standards are welcome:

1. Fork the repository (`https://github.com/cyber-Horcrux/Snake-Game`).
2. Create a feature branch:
   ```bash
   git checkout -b feature/tactical-enhancement
   ```
3. Commit your changes with clear, descriptive commit messages.
4. Verify that linting, testing, and production building succeed:
   ```bash
   npm run lint && npm test && npm run build
   ```
5. Open a Pull Request against the `main` branch.

---

## License & Intellectual Property

This repository currently operates **without a formal open-source license**. All visual branding assets, vector logos, game designs, audio algorithms, and source code are the proprietary intellectual property of the project maintainers. 

No license to copy, redistribute, modify, or commercially exploit this software is granted or implied by its presence in this repository. A formal open-source or commercial license may be designated in a future release at the sole discretion of the project maintainers.
