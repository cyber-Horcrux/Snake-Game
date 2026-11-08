# Changelog

All notable changes to the NEON SNAKE project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-11-08

### Added
- **Snake Trails System (8 Total)**:
  - Added full energy slipstream trail rendering engine decoupled from game logic with fixed-capacity (360 samples) zero-GC ring buffer.
  - Implemented 8 distinct trail effects: `none` (Stealth / None), `cyber_pulse` (Dual Cyan Neon Pulse), `matrix_stream` (Matrix Green Code Pips), `plasma_fire` (Magenta & Amber Plasma Flame), `frost_vapor` (Sub-Zero Cryo Wisps), `solar_radiance` (Golden Solar Corona & 8-Vertex Star Glints), `void_singularity` (Deep Ultraviolet Gravitational Nodes), and `hyper_streak` (Continuous Dual Neon Speed Rails).
  - Added dedicated `TrailHistoryManager` with adaptive stride distance estimation, multi-speed support, jump-ratio detection, and isolated boundary splitting for seamless rendering during high-speed turns and boosts.
  - Implemented `TrailPreviewCanvas` and headless preview renderer `drawTrailPreview` with dynamic curve tangent calculations (`Math.atan2`), aligning directional trail particles with snake motion.
  - Added persistent trail selection in `localStorage` (`neonsnake_player_trails`) with corruption recovery, migration, and progression-aware unlock validation.
  - Added unlock conditions for trails: starter availability (`none`, `cyber_pulse`), level milestones (`matrix_stream` at Level 5, `plasma_fire` at Level 12, `solar_radiance` at Level 25), single-run food milestones (`hyper_streak` at 25 food in a single run), Zen boundary wraps (`frost_vapor` at 30 wraps), and Maze Campaign progression (`void_singularity` at Stage 3 clear).
- **Customization Suite (Chassis Skins & Board Themes)**:
  - Expanded snake chassis customization to 8 unique skins (`cyber_cyan`, `matrix_green`, `synth_sunset`, `hyper_violet`, `crimson_blaze`, `arctic_frost`, `gold_prestige`, `apex_void`).
  - Added 6 tactical board themes with distinctive material shaders and ambient grid acoustics (`obsidian_grid`, `industrial_foundry`, `arctic_research`, `bio_dome`, `solar_array`, `void_observatory`).
  - Added interactive multi-tab `SkinCollectionModal` (Skins, Trails, Boards) featuring animated canvas previews, unlock requirement badges, and responsive equip controls.
- **Maze Campaign Mode (6 Tactical Stages)**:
  - Curated 6 tactical campaign stages: Stage 1 (The Initiation), Stage 2 (Twin Chambers), Stage 3 (The Crossfire), Stage 4 (Quantum Core), Stage 5 (The Labyrinth), and Stage 6 (Apex Gauntlet).
  - Integrated Warp Gate extraction portal mechanics: collect 10 Neon Cores to activate perimeter extraction gate with excess length score bonuses.
  - Dedicated stage selection drawer (`MazeStageSelectModal`), mid-campaign clear summaries (`StageClearModal`), and full campaign victory ceremonies (`CampaignVictoryModal`).
- **XP Progression & Pilot Leveling (Level 1–50)**:
  - Deterministic XP engine calculating run experience from food gathered, survival duration, max combo multiplier, and maze completions.
  - Level titles, milestone reward celebrations (`LevelUpCelebration`), and career progression card (`PlayerLevelCard`).
- **Daily Challenges Economy**:
  - Deterministic UTC-based challenge generator creating 3 balanced objectives daily across Easy, Medium, and Hard tiers.
  - Trophy Stars reward currency, consecutive daily completion streaks, and milestone claim tracking (3, 7, 14, 30 days).
- **Automated Test Coverage**:
  - Comprehensive 20-suite test harness executed via native Node.js test runner (`node:test`), scaling automated coverage to 543 passing tests.

### Changed
- **Renderer Performance & Quality**:
  - Upgraded main Canvas 2D render loop to support multi-layer rendering order: tactical board floor, trail slipstreams, snake body segments, glowing optics, food nodes, particles, and HUD overlay.
  - Improved Zen mode edge wrapping to calculate modular coordinate deltas across boundaries, eliminating momentary 180-degree angle flips when the snake tail crosses screen perimeters.
  - Added adaptive graphics mode toggle (`high`, `reduced`) allowing lower-end mobile devices to bypass additive glow multi-pass blending for locked 60 FPS performance.
- **Navigation & Mobile HUD**:
  - Enhanced Title Screen with Apex Cyber-Viper vector branding, 2x3 secondary action grid, and direct callback routing to Daily Challenges, Campaign Stages, Customization Suite, Pilot Dossier, Settings, and Tactical Manual.
  - Refined mobile touch handling with unified virtual D-pad clearance in both portrait and landscape orientations, preventing HUD button interference.
  - Updated responsive canvas scaling to maintain a strict 1:1 playfield aspect ratio across diverse mobile display aspect ratios.

### Fixed
- **Discontinuity Sample Drop**: Fixed an issue in `TrailHistoryManager.addPoint` where high-frequency sub-pixel updates could prematurely discard boundary markers; discontinuity points now bypass deduplication checks unconditionally.
- **Solar Radiance Star Glint Geometry**: Corrected an errant `moveTo` operation in the star glint path rendering within `drawSolarTrail`, restoring a single continuous 8-vertex closed polygon contour.
- **Preview Motion Realism**: Resolved static angle rendering in `drawTrailPreview` by calculating instantaneous spline tangents from the animated snake body wave.
- **Customization Modal Deep-Linking**: Resolved tab desynchronization in `SkinCollectionModal` when opened from external notifications by adding an immediate `initialTab` synchronization effect.
- **Touch Event Deduplication**: Enforced submission guards and button disabled states during cosmetic equipping, preventing duplicated write operations from mobile touch/click event bubbling.
- **Title Screen Callback Signatures**: Resolved TypeScript type mismatch between DOM mouse events and tab parameter strings on the primary customization action button.

### Technical Validation Summary (November 8, 2026)
- **Unit & Integration Tests**: 543 passed, 0 failed across 20 test files in `src/game/*.test.ts` (execution time: ~3.5s).
- **Type Safety**: Clean compilation with `tsc --noEmit` (0 errors).
- **Production Web Bundle**: Built via Vite 8 in <1.0s (`dist/index.html`: 3.58 kB, `dist/assets/index.js`: 818 kB, gzip 210 kB).
- **Capacitor Android Synchronization**: Verified `npx cap sync android` with Android API 24–36 compatibility.
- **Android Release APK Build**: Assembled release binary via Gradle with signing configuration verified.
- **Physical Device Validation**: Installed and confirmed running at 60 FPS on physical Samsung Galaxy A14 hardware with responsive touch and audio synthesis.
