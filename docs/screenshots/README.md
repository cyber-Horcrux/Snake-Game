# NEON SNAKE — Screenshot Asset Guidelines & Capture Guide

This directory contains capture specifications and standardized catalog requirements for visual assets showcasing **NEON SNAKE: ONE MORE RUN** (v1.3.0).

---

## Current Status & Asset Transparency

> **Asset Transparency Notice**:
> This directory currently houses screenshot capture guidelines and target catalog specifications. **No in-game screenshots are pre-bundled in this repository directory.**
>
> Repository headers or social previews (such as `public/og-image.png`) represent promotional marketing graphics rather than raw, unedited gameplay captures. Any in-game screenshots contributed to this directory must be authentic, unedited captures exported directly from running web builds or physical Android hardware.

---

## Recommended Screenshot Catalog (Target Specifications)

When capturing visual assets for promotional documentation or distribution showcases, use the following standardized filenames and target views:

| # | Recommended Filename | Screen / Feature | Orientation | Description & Highlighted Elements |
|:---:|---|---|---|---|
| **01** | `01-title-screen.png` | **Main Title Screen** | Portrait (Native Device Resolution) | Apex Cyber-Viper vector branding emblem, primary "PLAY RUN" action card, mode selector carousel, pilot XP level badge, and 2×3 secondary utility grid. |
| **02** | `02-gameplay-classic.png` | **Classic Mode Gameplay** | Portrait (Native Device Resolution) | Active Classic run showing solid wall boundaries, dynamic combo multiplier (2x–4x), active energy slipstream trail, and timed bonus food countdown ring when active. |
| **03** | `03-gameplay-maze.png` | **Maze Campaign Gameplay** | Portrait (Native Device Resolution) | Tactical architectural maze layout showing obstacle walls, collected Neon Cores counter (e.g. 7/10), and the illuminated perimeter Warp Gate extraction portal. |
| **04** | `04-mobile-portrait-gameplay.png` | **Mobile Portrait Controls** | Portrait (Native Device Resolution) | Full in-game view highlighting the bottom-docked virtual D-pad clearance, responsive 1:1 canvas containment, and touch control ergonomics. |
| **05** | `05-mobile-landscape-gameplay.png` | **Mobile Landscape Controls** | Landscape (Native Device Resolution) | Horizontal gameplay run showcasing right-gutter D-pad docking with complete separation from top-left HUD telemetry and top-right pause controls. |
| **06** | `06-customization-skins.png` | **Snake Chassis Suite** | Portrait (Native Device Resolution) | `SkinCollectionModal` (Skins tab) showing the 8-chassis collection grid, interactive canvas previews, unlock requirement badges, and equipped status. |
| **07** | `07-customization-trails.png` | **Snake Trails Slipstream** | Portrait (Native Device Resolution) | `SkinCollectionModal` (Trails tab) showing all 8 particle trail options, real-time animated preview canvases, and unlock criteria. |
| **08** | `08-customization-themes.png` | **Board Themes / Appearance** | Portrait (Native Device Resolution) | `SkinCollectionModal` (Boards tab) showing the 6 environmental surfaces (Obsidian Grid, Industrial Foundry, Bio Dome, Solar Array), showing materials and lighting. |
| **09** | `09-pause-screen.png` | **Tactical Pause Screen** | Portrait (Native Device Resolution) | Paused run state showing semi-transparent backdrop, active run duration, telemetry metrics, and primary navigation buttons (Resume, Restart, Quit). |
| **10** | `10-game-over-screen.png` | **Run Terminated Screen** | Portrait (Native Device Resolution) | End-of-run summary highlighting final score, high-score banner, cause of death (wall impact or self-collision), XP earned breakdown, and level progression card. |

---

## Technical Capture Requirements

To maintain publication-ready visual fidelity:

1. **Source Authenticity**: 
   - Captures must originate from a running Web build (`npm run dev` / `npm run preview`) or an installed Android release build (`.\gradlew.bat assembleRelease` / `./gradlew assembleRelease`).
   - Mockups created in graphic design tools (e.g., Photoshop, Figma) or simulated gameplay states are strictly prohibited.
2. **Display Resolution & Density**:
   - Use the native resolution of the capture device (e.g., 1080×2400, 1080×2340 for modern mobile portrait displays, or 1920×1080 for desktop) at full device pixel ratio (DPR ≥ 2.0).
3. **Aspect Ratio Preservation**:
   - Preserve native viewport scaling without stretching, artificial cropping, or distortion. The playfield maintains its intended 1:1 square canvas geometry.
4. **File Format & Compression**:
   - Save assets as standard lossless **PNG** or high-quality **WebP**.
   - Lossless compression (such as `pngquant` or `oxipng`) is encouraged to maintain reasonable repository size without degrading pixel clarity.
5. **Clean Status Presentation (Optional)**:
   - When capturing on Android hardware, enabling Android Developer Options **Demo Mode** (or ensuring a clean notification bar with full battery and consistent clock) is recommended for presentation consistency.
