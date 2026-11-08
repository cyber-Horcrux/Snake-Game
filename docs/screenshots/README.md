# NEON SNAKE — Screenshot Asset Guidelines & Capture Guide

This directory contains capture specifications and standardized catalog requirements for the official visual showcase of **NEON SNAKE: ONE MORE RUN** (v1.3.0).

---

## Current Status & Asset Transparency

> **Repository Transparency Notice**:
> This directory currently houses the official screenshot capture guide and catalog definitions. In strict adherence to our project integrity standards, **no pre-rendered mockups, simulated design concepts, or placeholder images are bundled in this directory**. 
>
> All production screenshots added here must be genuine, unedited captures exported directly from active web runs or physical Android hardware builds.

---

## Recommended Screenshot Catalog (v1.3.0 Release)

When capturing visual assets for promotional materials, GitHub release notes, or mobile store listings, use the following standardized filenames and view specifications:

| # | Recommended Filename | Screen / Feature | Orientation | Description & Highlighted Elements |
|:---:|---|---|---|---|
| **01** | `01-title-screen.png` | **Main Title Screen** | Portrait (1080×2400) | Apex Cyber-Viper vector branding emblem, primary "PLAY RUN" action card, mode selector carousel, pilot XP badge, and 2×3 secondary utility grid. |
| **02** | `02-gameplay-classic.png` | **Classic Mode Gameplay** | Portrait (1080×2400) | Active high-speed Classic run showing solid wall boundaries, dynamic combo multiplier (2x–4x), active energy slipstream trail, and food node countdowns. |
| **03** | `03-gameplay-maze.png` | **Maze Campaign Gameplay** | Portrait (1080×2400) | Tactical architectural maze layout showing obstacle walls, collected Neon Cores counter (e.g. 7/10), and the illuminated perimeter Warp Gate extraction portal. |
| **04** | `04-mobile-portrait-gameplay.png` | **Mobile Portrait Controls** | Portrait (1080×2400) | Full in-game view highlighting the bottom-docked virtual D-pad clearance, responsive 1:1 canvas containment, and zero thumb obstruction over HUD statistics. |
| **05** | `05-mobile-landscape-gameplay.png` | **Mobile Landscape Controls** | Landscape (2400×1080) | Horizontal gameplay run showcasing right-gutter D-pad docking with complete separation from top-left HUD telemetry and top-right pause controls. |
| **06** | `06-customization-skins.png` | **Snake Chassis Suite** | Portrait (1080×2400) | `SkinCollectionModal` (Skins tab) highlighting the 8 selectable snake chassis variants, real-time canvas preview, unlock requirement badges, and equip state. |
| **07** | `07-customization-trails.png` | **Snake Trails Slipstream** | Portrait (1080×2400) | `SkinCollectionModal` (Trails tab) displaying all 8 particle trail effects (e.g. Solar Radiance, Hyper Streak, Plasma Fire), animated previews, and unlock criteria. |
| **08** | `08-customization-themes.png` | **Board Themes / Appearance** | Portrait (1080×2400) | `SkinCollectionModal` (Boards tab) showing the 6 environmental surfaces (Obsidian Grid, Industrial Foundry, Bio Dome, Solar Array), showing ambient lighting and accents. |
| **09** | `09-pause-screen.png` | **Tactical Pause Screen** | Portrait (1080×2400) | Paused run state showing semi-transparent blurred backdrop, active run duration, telemetry metrics, and primary navigation buttons (Resume, Restart, Quit). |
| **10** | `10-game-over-screen.png` | **Run Terminated Screen** | Portrait (1080×2400) | End-of-run summary highlighting final score, high-score banner, cause of death (wall impact, self-collision), XP earned breakdown, and level progression bar. |

---

## Technical Capture Requirements

To maintain publication-ready visual fidelity across GitHub and mobile distribution platforms:

1. **Source Authenticity**: 
   - Captures must originate from a running Web build (`npm run dev` / `npm run preview`) or an installed Android release APK (`.\gradlew.bat assembleRelease`).
   - Mockups created in graphic design tools (e.g., Photoshop, Figma) are strictly prohibited for in-game screenshots.
2. **Display Resolution & Density**:
   - **Mobile Portrait**: Standard native 20:9 or 19.5:9 resolution (e.g., 1080×2400, 1080×2340) at full device pixel ratio (DPR ≥ 2.0).
   - **Mobile Landscape**: 2400×1080 or 2340×1080 native orientation.
   - **Desktop Web (Optional Extended)**: 1920×1080 or 2560×1440 unscaled viewport.
3. **Aspect Ratio Preservation**:
   - Do not stretch, squash, crop, or artificially pad screenshots. Maintain the game's native CSS viewport scaling and letterboxing/pillarboxing.
4. **File Format & Compression**:
   - Save assets as standard lossless **PNG** or optimized **WebP** (`quality: 95+`).
   - Run lossless compression (e.g., `pngquant` or `oxipng`) before committing to maintain minimal repository payload.
5. **System Cleanliness**:
   - When capturing from an Android device, enable Android Developer Options **Demo Mode** (or ensure status bar clock reads consistently, battery is full, and notifications are cleared).
