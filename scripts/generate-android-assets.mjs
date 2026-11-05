import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const RES_DIR = path.join(ROOT, 'android/app/src/main/res');
const TMP_DIR = path.join(ROOT, 'node_modules/.cache/android-branding');

fs.mkdirSync(TMP_DIR, { recursive: true });

// 1. Adaptive Foreground SVG (108x108 with safe zone 72x72 in center)
// Center is (54, 54). Scale emblem down to 60px height, centered at (54, 54).
const adaptiveForegroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108" fill="none">
  <defs>
    <linearGradient id="afCyberCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#43F5FF" />
      <stop offset="50%" stop-color="#00E5FF" />
      <stop offset="100%" stop-color="#00A3FF" />
    </linearGradient>
    <linearGradient id="afMagentaLaser" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF007A" />
      <stop offset="50%" stop-color="#FF2E93" />
      <stop offset="100%" stop-color="#FF70BA" />
    </linearGradient>
    <linearGradient id="afPlateDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#141C36" />
      <stop offset="100%" stop-color="#080C1A" />
    </linearGradient>
    <linearGradient id="afPlateMid" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1D2A4E" />
      <stop offset="100%" stop-color="#0E1528" />
    </linearGradient>
  </defs>

  <!-- The Apex Viper Emblem centered in 72dp safe zone: width ~50, height ~58, offset (29, 25) -->
  <g transform="translate(26, 22) scale(0.11)">
    <!-- Outer Glow -->
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      stroke="#00F5FF" stroke-width="12" stroke-opacity="0.5" fill="none" />

    <!-- Armor Shell -->
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      fill="url(#afPlateDark)" stroke="#223156" stroke-width="4" stroke-linejoin="round" />

    <!-- Temple Shields -->
    <polygon points="194,106 242,126 226,176 150,154" fill="url(#afPlateMid)" stroke="#2E4172" stroke-width="3" />
    <polygon points="318,106 270,126 286,176 362,154" fill="url(#afPlateMid)" stroke="#2E4172" stroke-width="3" />

    <!-- Hood Flairs -->
    <polygon points="138,168 212,188 194,244 112,230" fill="url(#afPlateMid)" stroke="#2E4172" stroke-width="3" />
    <polygon points="374,168 300,188 318,244 400,230" fill="url(#afPlateMid)" stroke="#2E4172" stroke-width="3" />

    <!-- Lower Jaw Flanks & Body Arcs -->
    <polygon points="112,256 160,268 144,324 100,286" fill="url(#afPlateDark)" stroke="#223156" stroke-width="2.5" />
    <polygon points="400,256 352,268 368,324 412,286" fill="url(#afPlateDark)" stroke="#223156" stroke-width="2.5" />
    <path d="M 126,334 L 160,378 L 198,414 L 182,428 L 138,390 L 112,348 Z" fill="url(#afPlateMid)" stroke="#2E4172" stroke-width="3" />
    <path d="M 386,334 L 352,378 L 314,414 L 330,428 L 374,390 L 400,348 Z" fill="url(#afPlateMid)" stroke="#2E4172" stroke-width="3" />
    <polygon points="256,488 226,456 242,442 256,454 270,442 286,456" fill="#7928CA" stroke="#A779E9" stroke-width="3" stroke-linejoin="round" />

    <!-- Kinetic Spine Chevrons -->
    <polygon points="256,76 226,124 244,132 256,114 268,132 286,124" fill="url(#afCyberCyan)" stroke="#A5F9FF" stroke-width="2.5" />
    <polygon points="240,146 272,146 278,172 234,172" fill="#0C1326" stroke="url(#afCyberCyan)" stroke-width="3" />
    <line x1="256" y1="146" x2="256" y2="172" stroke="#43F5FF" stroke-width="3" />
    <polygon points="232,184 280,184 286,210 226,210" fill="#0C1326" stroke="url(#afCyberCyan)" stroke-width="3" />
    <line x1="256" y1="184" x2="256" y2="210" stroke="#43F5FF" stroke-width="3" />

    <!-- Snout Hexagon Plate -->
    <polygon points="256,222 282,256 278,312 256,338 234,312 230,256" fill="#090E1D" stroke="url(#afCyberCyan)" stroke-width="3.5" />
    <line x1="256" y1="230" x2="256" y2="330" stroke="#A5F9FF" stroke-width="3" />
    <circle cx="256" cy="330" r="4" fill="#43F5FF" />

    <!-- Optical Eyes -->
    <polygon points="164,238 226,252 208,276 150,260" fill="#060812" stroke="#FF007A" stroke-width="3" />
    <polygon points="172,246 218,256 204,270 160,258" fill="url(#afMagentaLaser)" />
    <polygon points="186,250 200,254 192,264 182,260" fill="#FFFFFF" />

    <polygon points="348,238 286,252 304,276 362,260" fill="#060812" stroke="#FF007A" stroke-width="3" />
    <polygon points="340,246 294,256 308,270 352,258" fill="url(#afMagentaLaser)" />
    <polygon points="326,250 312,254 320,264 330,260" fill="#FFFFFF" />

    <!-- Fangs -->
    <polygon points="202,382 228,384 218,446" fill="#F0F8FF" stroke="url(#afCyberCyan)" stroke-width="3" />
    <line x1="216" y1="384" x2="218" y2="440" stroke="#00F5FF" stroke-width="3" stroke-linecap="round" />
    <polygon points="310,382 284,384 294,446" fill="#F0F8FF" stroke="url(#afCyberCyan)" stroke-width="3" />
    <line x1="296" y1="384" x2="294" y2="440" stroke="#00F5FF" stroke-width="3" stroke-linecap="round" />

    <!-- Neon Rim Strokes -->
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310" stroke="url(#afCyberCyan)" stroke-width="4" stroke-linecap="round" />
    <path d="M 256,44 L 328,96 L 372,150 L 406,218 L 420,252 L 386,310" stroke="url(#afCyberCyan)" stroke-width="4" stroke-linecap="round" />
    <path d="M 228,386 L 256,348 L 284,386" stroke="#9865FF" stroke-width="3.5" fill="none" />
  </g>
</svg>`;

// 2. Standard Legacy Launcher Icon (192x192 with rounded squircle canvas #05070E)
const standardIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192" fill="none">
  <defs>
    <linearGradient id="stdBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0E162B" />
      <stop offset="100%" stop-color="#05070E" />
    </linearGradient>
    <linearGradient id="stdCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#43F5FF" />
      <stop offset="100%" stop-color="#00A3FF" />
    </linearGradient>
    <linearGradient id="stdMagenta" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF007A" />
      <stop offset="100%" stop-color="#FF70BA" />
    </linearGradient>
  </defs>

  <rect width="192" height="192" rx="40" fill="url(#stdBg)" />
  <rect x="3" y="3" width="186" height="186" rx="37" stroke="#1E2B4E" stroke-width="2" fill="none" />

  <!-- Centered Apex Viper Emblem -->
  <g transform="translate(32, 24) scale(0.25)">
    <!-- Outer Glow -->
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      stroke="#00F5FF" stroke-width="10" stroke-opacity="0.5" fill="none" />
    <!-- Armor Shell -->
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      fill="#0C1326" stroke="#223156" stroke-width="3" stroke-linejoin="round" />
    <!-- Shields & Flairs -->
    <polygon points="194,106 242,126 226,176 150,154" fill="#182342" stroke="#2E4172" stroke-width="2" />
    <polygon points="318,106 270,126 286,176 362,154" fill="#182342" stroke="#2E4172" stroke-width="2" />
    <polygon points="138,168 212,188 194,244 112,230" fill="#182342" stroke="#2E4172" stroke-width="2" />
    <polygon points="374,168 300,188 318,244 400,230" fill="#182342" stroke="#2E4172" stroke-width="2" />
    <polygon points="256,76 226,124 244,132 256,114 268,132 286,124" fill="url(#stdCyan)" stroke="#A5F9FF" stroke-width="2" />
    <polygon points="240,146 272,146 278,172 234,172" fill="#0C1326" stroke="url(#stdCyan)" stroke-width="2" />
    <line x1="256" y1="146" x2="256" y2="172" stroke="#43F5FF" stroke-width="2" />
    <polygon points="232,184 280,184 286,210 226,210" fill="#0C1326" stroke="url(#stdCyan)" stroke-width="2" />
    <line x1="256" y1="184" x2="256" y2="210" stroke="#43F5FF" stroke-width="2" />
    <polygon points="256,222 282,256 278,312 256,338 234,312 230,256" fill="#090E1D" stroke="url(#stdCyan)" stroke-width="2.5" />
    <line x1="256" y1="230" x2="256" y2="330" stroke="#A5F9FF" stroke-width="2" />
    <circle cx="256" cy="330" r="3" fill="#43F5FF" />
    <polygon points="164,238 226,252 208,276 150,260" fill="#060812" stroke="#FF007A" stroke-width="2" />
    <polygon points="172,246 218,256 204,270 160,258" fill="url(#stdMagenta)" />
    <polygon points="186,250 200,254 192,264 182,260" fill="#FFFFFF" />
    <polygon points="348,238 286,252 304,276 362,260" fill="#060812" stroke="#FF007A" stroke-width="2" />
    <polygon points="340,246 294,256 308,270 352,258" fill="url(#stdMagenta)" />
    <polygon points="326,250 312,254 320,264 330,260" fill="#FFFFFF" />
    <polygon points="202,382 228,384 218,446" fill="#F0F8FF" stroke="url(#stdCyan)" stroke-width="2" />
    <polygon points="310,382 284,384 294,446" fill="#F0F8FF" stroke="url(#stdCyan)" stroke-width="2" />
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310" stroke="url(#stdCyan)" stroke-width="3" stroke-linecap="round" />
    <path d="M 256,44 L 328,96 L 372,150 L 406,218 L 420,252 L 386,310" stroke="url(#stdCyan)" stroke-width="3" stroke-linecap="round" />
    <path d="M 228,386 L 256,348 L 284,386" stroke="#9865FF" stroke-width="2.5" fill="none" />
  </g>
</svg>`;

// 3. Round Legacy Launcher Icon (192x192 circular mask)
const roundIconSvg = standardIconSvg
  .replace('rx="40"', 'rx="96"')
  .replace('rx="37"', 'rx="93"');

// 4. Master Portrait Splash (1280x1920)
const splashPortSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 1920" width="1280" height="1920" fill="none">
  <defs>
    <radialGradient id="spGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#141E3C" />
      <stop offset="50%" stop-color="#080C1A" />
      <stop offset="100%" stop-color="#04060C" />
    </radialGradient>
    <linearGradient id="spCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#55F7FF" />
      <stop offset="50%" stop-color="#00E5FF" />
      <stop offset="100%" stop-color="#0088FF" />
    </linearGradient>
    <linearGradient id="spMagenta" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF007A" />
      <stop offset="100%" stop-color="#FF70BA" />
    </linearGradient>
  </defs>

  <!-- Deep Obsidian Void Canvas -->
  <rect width="1280" height="1920" fill="url(#spGlow)" />

  <!-- Cyber Matrix Grid Lines -->
  <g opacity="0.06" stroke="#43F5FF" stroke-width="1.5">
    <line x1="0" y1="320" x2="1280" y2="320" />
    <line x1="0" y1="640" x2="1280" y2="640" />
    <line x1="0" y1="960" x2="1280" y2="960" />
    <line x1="0" y1="1280" x2="1280" y2="1280" />
    <line x1="0" y1="1600" x2="1280" y2="1600" />
    <line x1="320" y1="0" x2="320" y2="1920" />
    <line x1="640" y1="0" x2="640" y2="1920" />
    <line x1="960" y1="0" x2="960" y2="1920" />
  </g>

  <!-- Corner Tactical Notches -->
  <path d="M 40,120 L 120,40 M 1160,40 L 1240,120 M 40,1800 L 120,1880 M 1160,1880 L 1240,1800" stroke="#00F5FF" stroke-width="3" opacity="0.5" />

  <!-- Centered Emblem (Hero Apex Viper ~560x560px) -->
  <g transform="translate(360, 480) scale(1.1)">
    <!-- Outer Glow -->
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      stroke="#00F5FF" stroke-width="12" stroke-opacity="0.5" fill="none" />
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      fill="#0B1124" stroke="#223156" stroke-width="4" stroke-linejoin="round" />
    <polygon points="194,106 242,126 226,176 150,154" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="318,106 270,126 286,176 362,154" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="138,168 212,188 194,244 112,230" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="374,168 300,188 318,244 400,230" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="256,76 226,124 244,132 256,114 268,132 286,124" fill="url(#spCyan)" stroke="#A5F9FF" stroke-width="2.5" />
    <polygon points="240,146 272,146 278,172 234,172" fill="#0C1326" stroke="url(#spCyan)" stroke-width="2.5" />
    <line x1="256" y1="146" x2="256" y2="172" stroke="#43F5FF" stroke-width="3" />
    <polygon points="232,184 280,184 286,210 226,210" fill="#0C1326" stroke="url(#spCyan)" stroke-width="2.5" />
    <line x1="256" y1="184" x2="256" y2="210" stroke="#43F5FF" stroke-width="3" />
    <polygon points="256,222 282,256 278,312 256,338 234,312 230,256" fill="#090E1D" stroke="url(#spCyan)" stroke-width="3" />
    <line x1="256" y1="230" x2="256" y2="330" stroke="#A5F9FF" stroke-width="2.5" />
    <circle cx="256" cy="330" r="4" fill="#43F5FF" />
    <polygon points="164,238 226,252 208,276 150,260" fill="#060812" stroke="#FF007A" stroke-width="2.5" />
    <polygon points="172,246 218,256 204,270 160,258" fill="url(#spMagenta)" />
    <polygon points="186,250 200,254 192,264 182,260" fill="#FFFFFF" />
    <polygon points="348,238 286,252 304,276 362,260" fill="#060812" stroke="#FF007A" stroke-width="2.5" />
    <polygon points="340,246 294,256 308,270 352,258" fill="url(#spMagenta)" />
    <polygon points="326,250 312,254 320,264 330,260" fill="#FFFFFF" />
    <polygon points="202,382 228,384 218,446" fill="#F0F8FF" stroke="url(#spCyan)" stroke-width="2.5" />
    <polygon points="310,382 284,384 294,446" fill="#F0F8FF" stroke="url(#spCyan)" stroke-width="2.5" />
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310" stroke="url(#spCyan)" stroke-width="4" stroke-linecap="round" />
    <path d="M 256,44 L 328,96 L 372,150 L 406,218 L 420,252 L 386,310" stroke="url(#spCyan)" stroke-width="4" stroke-linecap="round" />
    <path d="M 228,386 L 256,348 L 284,386" stroke="#9865FF" stroke-width="3" fill="none" />
  </g>

  <!-- Typography Block: NEON SNAKE + ONE MORE RUN -->
  <g transform="translate(640, 1180)">
    <text x="0" y="0" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="80" letter-spacing="0.22em" fill="#FFFFFF">
      <tspan fill="url(#spCyan)">NEON</tspan> <tspan fill="#F8FAFC">SNAKE</tspan>
    </text>

    <!-- Rail -->
    <line x1="-240" y1="40" x2="240" y2="40" stroke="#1D2A4C" stroke-width="2.5" />
    <line x1="-80" y1="40" x2="80" y2="40" stroke="url(#spCyan)" stroke-width="3.5" />
    <polygon points="0,35 6,40 0,45 -6,40" fill="#43F5FF" />

    <!-- Tagline: [ ── ONE MORE RUN ── ] -->
    <g transform="translate(0, 110)">
      <path d="M -220,-16 L -236,-16 L -236,16 L -220,16" stroke="#43F5FF" stroke-width="3" fill="none" />
      <circle cx="-236" cy="0" r="3" fill="#43F5FF" />
      <text x="0" y="8" text-anchor="middle" font-family="'Rajdhani', sans-serif" font-weight="700" font-size="36" letter-spacing="0.38em" fill="#C7D2FE">
        ONE MORE RUN
      </text>
      <path d="M 220,-16 L 236,-16 L 236,16 L 220,16" stroke="#43F5FF" stroke-width="3" fill="none" />
      <circle cx="236" cy="0" r="3" fill="#43F5FF" />
    </g>

    <!-- Micro Tech Subline -->
    <text x="0" y="220" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="16" letter-spacing="0.45em" fill="#475569">
      ARCADE ENGINE // V2.0 INITIALIZED
    </text>
  </g>
</svg>`;

// 5. Master Landscape Splash (1920x1280)
const splashLandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1280" width="1920" height="1280" fill="none">
  <defs>
    <radialGradient id="slGlow" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#141E3C" />
      <stop offset="50%" stop-color="#080C1A" />
      <stop offset="100%" stop-color="#04060C" />
    </radialGradient>
    <linearGradient id="slCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#55F7FF" />
      <stop offset="50%" stop-color="#00E5FF" />
      <stop offset="100%" stop-color="#0088FF" />
    </linearGradient>
    <linearGradient id="slMagenta" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF007A" />
      <stop offset="100%" stop-color="#FF70BA" />
    </linearGradient>
  </defs>

  <rect width="1920" height="1280" fill="url(#slGlow)" />

  <g opacity="0.06" stroke="#43F5FF" stroke-width="1.5">
    <line x1="0" y1="320" x2="1920" y2="320" />
    <line x1="0" y1="640" x2="1920" y2="640" />
    <line x1="0" y1="960" x2="1920" y2="960" />
    <line x1="320" y1="0" x2="320" y2="1280" />
    <line x1="640" y1="0" x2="640" y2="1280" />
    <line x1="960" y1="0" x2="960" y2="1280" />
    <line x1="1280" y1="0" x2="1280" y2="1280" />
    <line x1="1600" y1="0" x2="1600" y2="1280" />
  </g>

  <!-- Corner Tactical Notches -->
  <path d="M 40,120 L 120,40 M 1800,40 L 1880,120 M 40,1160 L 120,1240 M 1800,1240 L 1880,1160" stroke="#00F5FF" stroke-width="3" opacity="0.5" />

  <!-- Centered Emblem (Hero Apex Viper ~460x460px) -->
  <g transform="translate(710, 220) scale(0.98)">
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      stroke="#00F5FF" stroke-width="12" stroke-opacity="0.5" fill="none" />
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310 L 168,362 L 204,396 L 218,446 L 228,386 L 256,348 L 284,386 L 294,446 L 308,396 L 344,362 L 386,310 L 420,252 L 406,218 L 372,150 L 328,96 Z"
      fill="#0B1124" stroke="#223156" stroke-width="4" stroke-linejoin="round" />
    <polygon points="194,106 242,126 226,176 150,154" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="318,106 270,126 286,176 362,154" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="138,168 212,188 194,244 112,230" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="374,168 300,188 318,244 400,230" fill="#182342" stroke="#2E4172" stroke-width="2.5" />
    <polygon points="256,76 226,124 244,132 256,114 268,132 286,124" fill="url(#slCyan)" stroke="#A5F9FF" stroke-width="2.5" />
    <polygon points="240,146 272,146 278,172 234,172" fill="#0C1326" stroke="url(#slCyan)" stroke-width="2.5" />
    <line x1="256" y1="146" x2="256" y2="172" stroke="#43F5FF" stroke-width="3" />
    <polygon points="232,184 280,184 286,210 226,210" fill="#0C1326" stroke="url(#slCyan)" stroke-width="2.5" />
    <line x1="256" y1="184" x2="256" y2="210" stroke="#43F5FF" stroke-width="3" />
    <polygon points="256,222 282,256 278,312 256,338 234,312 230,256" fill="#090E1D" stroke="url(#slCyan)" stroke-width="3" />
    <line x1="256" y1="230" x2="256" y2="330" stroke="#A5F9FF" stroke-width="2.5" />
    <circle cx="256" cy="330" r="4" fill="#43F5FF" />
    <polygon points="164,238 226,252 208,276 150,260" fill="#060812" stroke="#FF007A" stroke-width="2.5" />
    <polygon points="172,246 218,256 204,270 160,258" fill="url(#slMagenta)" />
    <polygon points="186,250 200,254 192,264 182,260" fill="#FFFFFF" />
    <polygon points="348,238 286,252 304,276 362,260" fill="#060812" stroke="#FF007A" stroke-width="2.5" />
    <polygon points="340,246 294,256 308,270 352,258" fill="url(#slMagenta)" />
    <polygon points="326,250 312,254 320,264 330,260" fill="#FFFFFF" />
    <polygon points="202,382 228,384 218,446" fill="#F0F8FF" stroke="url(#slCyan)" stroke-width="2.5" />
    <polygon points="310,382 284,384 294,446" fill="#F0F8FF" stroke="url(#slCyan)" stroke-width="2.5" />
    <path d="M 256,44 L 184,96 L 140,150 L 106,218 L 92,252 L 126,310" stroke="url(#slCyan)" stroke-width="4" stroke-linecap="round" />
    <path d="M 256,44 L 328,96 L 372,150 L 406,218 L 420,252 L 386,310" stroke="url(#slCyan)" stroke-width="4" stroke-linecap="round" />
    <path d="M 228,386 L 256,348 L 284,386" stroke="#9865FF" stroke-width="3" fill="none" />
  </g>

  <!-- Typography Block -->
  <g transform="translate(960, 830)">
    <text x="0" y="0" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="76" letter-spacing="0.22em" fill="#FFFFFF">
      <tspan fill="url(#slCyan)">NEON</tspan> <tspan fill="#F8FAFC">SNAKE</tspan>
    </text>

    <line x1="-240" y1="36" x2="240" y2="36" stroke="#1D2A4C" stroke-width="2.5" />
    <line x1="-80" y1="36" x2="80" y2="36" stroke="url(#slCyan)" stroke-width="3.5" />
    <polygon points="0,31 6,36 0,41 -6,36" fill="#43F5FF" />

    <g transform="translate(0, 96)">
      <path d="M -200,-14 L -216,-14 L -216,14 L -200,14" stroke="#43F5FF" stroke-width="2.5" fill="none" />
      <circle cx="-216" cy="0" r="2.5" fill="#43F5FF" />
      <text x="0" y="7" text-anchor="middle" font-family="'Rajdhani', sans-serif" font-weight="700" font-size="32" letter-spacing="0.38em" fill="#C7D2FE">
        ONE MORE RUN
      </text>
      <path d="M 200,-14 L 216,-14 L 216,14 L 220,14" stroke="#43F5FF" stroke-width="2.5" fill="none" />
      <circle cx="216" cy="0" r="2.5" fill="#43F5FF" />
    </g>

    <text x="0" y="190" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="15" letter-spacing="0.4em" fill="#475569">
      ARCADE ENGINE // V2.0 INITIALIZED
    </text>
  </g>
</svg>`;

// Write templates
fs.writeFileSync(path.join(TMP_DIR, 'adaptive-foreground.svg'), adaptiveForegroundSvg);
fs.writeFileSync(path.join(TMP_DIR, 'standard-icon.svg'), standardIconSvg);
fs.writeFileSync(path.join(TMP_DIR, 'round-icon.svg'), roundIconSvg);
fs.writeFileSync(path.join(TMP_DIR, 'splash-port.svg'), splashPortSvg);
fs.writeFileSync(path.join(TMP_DIR, 'splash-land.svg'), splashLandSvg);

console.log('Vector templates created in ' + TMP_DIR);

// Define raster targets
const ICON_TARGETS = [
  // density, icon_size, fg_size
  { density: 'mdpi', iconSize: 48, fgSize: 108 },
  { density: 'hdpi', iconSize: 72, fgSize: 162 },
  { density: 'xhdpi', iconSize: 96, fgSize: 216 },
  { density: 'xxhdpi', iconSize: 144, fgSize: 324 },
  { density: 'xxxhdpi', iconSize: 192, fgSize: 432 },
];

for (const t of ICON_TARGETS) {
  const dir = path.join(RES_DIR, `mipmap-${t.density}`);
  fs.mkdirSync(dir, { recursive: true });

  const stdPath = path.join(dir, 'ic_launcher.png');
  const roundPath = path.join(dir, 'ic_launcher_round.png');
  const fgPath = path.join(dir, 'ic_launcher_foreground.png');

  execSync(`rsvg-convert -w ${t.iconSize} -h ${t.iconSize} "${path.join(TMP_DIR, 'standard-icon.svg')}" -o "${stdPath}"`);
  execSync(`rsvg-convert -w ${t.iconSize} -h ${t.iconSize} "${path.join(TMP_DIR, 'round-icon.svg')}" -o "${roundPath}"`);
  execSync(`rsvg-convert -w ${t.fgSize} -h ${t.fgSize} "${path.join(TMP_DIR, 'adaptive-foreground.svg')}" -o "${fgPath}"`);

  console.log(`Rendered icons for mipmap-${t.density}: icon=${t.iconSize}px, fg=${t.fgSize}px`);
}

// Define Splash targets
const SPLASH_TARGETS = [
  // Port
  { dir: 'drawable-port-mdpi', w: 320, h: 480, src: 'splash-port.svg' },
  { dir: 'drawable-port-hdpi', w: 480, h: 800, src: 'splash-port.svg' },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280, src: 'splash-port.svg' },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, src: 'splash-port.svg' },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, src: 'splash-port.svg' },
  // Land
  { dir: 'drawable', w: 480, h: 320, src: 'splash-land.svg' },
  { dir: 'drawable-land-mdpi', w: 480, h: 320, src: 'splash-land.svg' },
  { dir: 'drawable-land-hdpi', w: 800, h: 480, src: 'splash-land.svg' },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720, src: 'splash-land.svg' },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960, src: 'splash-land.svg' },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280, src: 'splash-land.svg' },
];

for (const s of SPLASH_TARGETS) {
  const dir = path.join(RES_DIR, s.dir);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'splash.png');
  execSync(`rsvg-convert -w ${s.w} -h ${s.h} "${path.join(TMP_DIR, s.src)}" -o "${outPath}"`);
  console.log(`Rendered splash for ${s.dir}: ${s.w}x${s.h}`);
}

console.log('All Android assets generated successfully!');
