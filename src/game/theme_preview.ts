/**
 * Board Theme Canvas Preview Drawing Engine
 * Pure 2D canvas drawing helper for generating high-fidelity visual previews
 * of cosmetic Board Themes, their material surfaces, grid textures, containment
 * perimeters, environmental lighting, and miniature gameplay specimens.
 */

import type { BoardThemeId } from './types.ts';
import { getThemeDefinition, isValidThemeId } from './themes.ts';

export interface ThemePreviewOptions {
  width: number;
  height: number;
  timeMs?: number;
  showSpecimen?: boolean;
  glowIntensity?: number;
}

export interface DrawThemePreviewResult {
  success: boolean;
  resolvedThemeId: BoardThemeId;
  themeName: string;
}

/**
 * Draws a complete architectural material preview of a board theme.
 */
export function drawThemePreview(
  ctx: CanvasRenderingContext2D | null | undefined,
  themeId: BoardThemeId | string | undefined | null,
  options: ThemePreviewOptions
): DrawThemePreviewResult {
  if (!ctx) {
    return {
      success: false,
      resolvedThemeId: 'obsidian_grid',
      themeName: 'Obsidian Grid',
    };
  }

  const safeThemeId: BoardThemeId = isValidThemeId(themeId) ? themeId : 'obsidian_grid';
  const theme = getThemeDefinition(safeThemeId);

  const rawWidth = typeof options.width === 'number' && Number.isFinite(options.width) ? options.width : 200;
  const rawHeight = typeof options.height === 'number' && Number.isFinite(options.height) ? options.height : 110;
  const width = Math.min(2048, Math.max(10, Math.floor(rawWidth)));
  const height = Math.min(2048, Math.max(10, Math.floor(rawHeight)));
  const timeMs = typeof options.timeMs === 'number' && Number.isFinite(options.timeMs) && options.timeMs >= 0 ? options.timeMs : 0;
  const showSpecimen = options.showSpecimen ?? true;

  ctx.save();
  try {
    // 1. Clear Canvas (mandatory baseline for fresh rendering)
    ctx.clearRect(0, 0, width, height);

    // 2. Base Floor Material & Atmospheric Radial Depth
    ctx.fillStyle = theme.floorBg;
    ctx.fillRect(0, 0, width, height);

    if (typeof ctx.createRadialGradient === 'function') {
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.48,
        width * 0.08,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.68
      );
      grad.addColorStop(0, theme.floorGradient.center);
      grad.addColorStop(1, theme.floorGradient.edge);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Precision Floor Grid Geometry
    const cols = 10;
    const rows = 6;
    const cellW = width / cols;
    const cellH = height / rows;

    // 4. Distinct Environment Material Surface Treatments
    drawThemeMaterialSurface(ctx, safeThemeId, width, height, cols, rows, cellW, cellH, timeMs);

    // 5. Architectural Floor Grid Lines
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = theme.grid.lineColor;
    ctx.beginPath();
    for (let c = 1; c < cols; c++) {
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, height);
    }
    for (let r = 1; r < rows; r++) {
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(width, r * cellH);
    }
    ctx.stroke();

    // 6. Tactical Crosshairs & Alignment Nodes
    ctx.fillStyle = theme.grid.crosshairColor;
    for (let c = 2; c < cols; c += 2) {
      for (let r = 2; r < rows; r += 2) {
        ctx.fillRect(c * cellW - 1, r * cellH - 1, 2, 2);
      }
    }

    // 7. Directional Beveling & Containment Perimeter (Top-Left Key Light, Bottom-Right Occlusion)
    // Dark outer base bezel
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = theme.border.outerBase;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Bottom and Right Ambient Occlusion Shadow (Key light from top-left)
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.border.shadowOcclusion;
    ctx.beginPath();
    ctx.moveTo(width - 1, 1);
    ctx.lineTo(width - 1, height - 1);
    ctx.lineTo(1, height - 1);
    ctx.stroke();

    // Top and Left Specular Chamfer Highlight
    ctx.strokeStyle = theme.border.specularChamfer;
    ctx.beginPath();
    ctx.moveTo(1, height - 1);
    ctx.lineTo(1, 1);
    ctx.lineTo(width - 1, 1);
    ctx.stroke();

    // Emissive Containment Perimeter
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.border.emissivePerimeter;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // 8. Precision Corner Reticles
    const corner = Math.min(cellW, cellH) * 0.9;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.border.cornerReticle;

    // Top-Left Reticle
    ctx.beginPath();
    ctx.moveTo(3, 3 + corner);
    ctx.lineTo(3, 3);
    ctx.lineTo(3 + corner, 3);
    ctx.stroke();

    // Top-Right Reticle
    ctx.beginPath();
    ctx.moveTo(width - 3 - corner, 3);
    ctx.lineTo(width - 3, 3);
    ctx.lineTo(width - 3, 3 + corner);
    ctx.stroke();

    // Bottom-Left Reticle
    ctx.beginPath();
    ctx.moveTo(3, height - 3 - corner);
    ctx.lineTo(3, height - 3);
    ctx.lineTo(3 + corner, height - 3);
    ctx.stroke();

    // Bottom-Right Reticle
    ctx.beginPath();
    ctx.moveTo(width - 3 - corner, height - 3);
    ctx.lineTo(width - 3, height - 3);
    ctx.lineTo(width - 3, height - 3 - corner);
    ctx.stroke();

    // 9. Coherent Miniature Specimen & Realistic Collectible
    if (showSpecimen) {
      drawMiniatureSpecimen(ctx, cellW, cellH, timeMs);
    }
  } catch {
    // Graceful error containment; canvas state will always be restored
  } finally {
    ctx.restore();
  }

  return {
    success: true,
    resolvedThemeId: safeThemeId,
    themeName: theme.name,
  };
}

/**
 * Draws the unique material surface texture and architectural markings for each theme.
 */
function drawThemeMaterialSurface(
  ctx: CanvasRenderingContext2D,
  themeId: BoardThemeId,
  width: number,
  height: number,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  timeMs: number
): void {
  switch (themeId) {
    case 'obsidian_grid': {
      // Carbon-graphite diagonal weave on alternating panels
      ctx.strokeStyle = 'rgba(67, 245, 255, 0.025)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let c = 0; c < cols; c += 2) {
        for (let r = 0; r < rows; r += 2) {
          const x0 = c * cellW;
          const y0 = r * cellH;
          const step = Math.max(3, cellW * 0.25);
          for (let offset = step; offset < cellW + cellH; offset += step) {
            const sx = x0 + Math.min(offset, cellW);
            const sy = y0 + Math.max(0, offset - cellW);
            const ex = x0 + Math.max(0, offset - cellH);
            const ey = y0 + Math.min(offset, cellH);
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
          }
        }
      }
      ctx.stroke();

      // Precision cyan alignment vernier ticks along mid-axes
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.16)';
      ctx.lineWidth = 1;
      const midY = Math.floor(rows / 2) * cellH;
      ctx.beginPath();
      for (let c = 1; c < cols; c++) {
        const x = c * cellW;
        ctx.moveTo(x, midY - 2);
        ctx.lineTo(x, midY + 2);
      }
      ctx.stroke();
      break;
    }

    case 'industrial_foundry': {
      // 1. Heavy industrial floor plates with recessed expansion seams (every 2x2 cells)
      for (let c = 0; c < cols; c += 2) {
        for (let r = 0; r < rows; r += 2) {
          const px = c * cellW;
          const py = r * cellH;
          const pw = cellW * 2;
          const ph = cellH * 2;

          // Plate surface subtle metallic tint
          ctx.fillStyle = (c + r) % 4 === 0 ? 'rgba(255, 158, 11, 0.018)' : 'rgba(0, 0, 0, 0.12)';
          ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

          // Recessed joint groove (shadow bottom-right, highlight top-left)
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + pw, py);
          ctx.lineTo(px + pw, py + ph);
          ctx.lineTo(px, py + ph);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 170, 50, 0.12)';
          ctx.beginPath();
          ctx.moveTo(px, py + 1);
          ctx.lineTo(px + pw - 1, py + 1);
          ctx.stroke();

          // Brushed steel striation lines (horizontal micro-machining grain)
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.025)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          const grainStep = Math.max(3, cellH * 0.3);
          for (let gy = py + grainStep; gy < py + ph - 2; gy += grainStep) {
            ctx.moveTo(px + 2, gy);
            ctx.lineTo(px + pw - 2, gy);
          }
          ctx.stroke();

          // Countersunk corner rivets with specular glint
          ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.fillRect(px + 2, py + 2, 1.5, 1.5);
          ctx.fillRect(px + pw - 3.5, py + 2, 1.5, 1.5);
          ctx.fillRect(px + 2, py + ph - 3.5, 1.5, 1.5);
          ctx.fillRect(px + pw - 3.5, py + ph - 3.5, 1.5, 1.5);
        }
      }
      break;
    }

    case 'arctic_research': {
      // 1. Crystalline fracture facets & sub-zero cryo-ceramic tiles
      ctx.strokeStyle = 'rgba(224, 247, 250, 0.035)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if ((c + r) % 2 === 0) {
            const x = c * cellW;
            const y = r * cellH;
            ctx.moveTo(x + cellW * 0.2, y);
            ctx.lineTo(x + cellW * 0.8, y + cellH);
            ctx.moveTo(x, y + cellH * 0.3);
            ctx.lineTo(x + cellW, y + cellH * 0.7);
          }
        }
      }
      ctx.stroke();

      // 2. Diamond cryo-sensor nodes at key intersections
      ctx.fillStyle = 'rgba(224, 247, 250, 0.25)';
      for (let c = 2; c < cols; c += 2) {
        for (let r = 2; r < rows; r += 2) {
          const px = c * cellW;
          const py = r * cellH;
          ctx.beginPath();
          ctx.moveTo(px, py - 2.5);
          ctx.lineTo(px + 2, py);
          ctx.lineTo(px, py + 2.5);
          ctx.lineTo(px - 2, py);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3. Perimeter frost condensation glaze (subtle cool gradient near corners)
      ctx.strokeStyle = 'rgba(56, 225, 255, 0.07)';
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, width - 6, height - 6);
      break;
    }

    case 'bio_dome': {
      // 1. Dark organic vascular reticulum / hexagonal cellular mesh
      ctx.strokeStyle = 'rgba(16, 255, 160, 0.032)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const cx = c * cellW + cellW * 0.5;
          const cy = r * cellH + cellH * 0.5;
          const rad = Math.min(cellW, cellH) * 0.35;
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const nx = cx + Math.cos(angle) * rad;
            const ny = cy + Math.sin(angle) * rad;
            if (i === 0) ctx.moveTo(nx, ny);
            else ctx.lineTo(nx, ny);
          }
          ctx.closePath();
        }
      }
      ctx.stroke();

      // 2. Living bioluminescent node respiration
      const bioPulse = Math.sin(timeMs * 0.003) * 0.06 + 0.18;
      ctx.fillStyle = `rgba(16, 255, 160, ${bioPulse.toFixed(3)})`;
      for (let c = 2; c < cols; c += 2) {
        for (let r = 2; r < rows; r += 2) {
          const px = c * cellW;
          const py = r * cellH;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'solar_array': {
      // 1. Photovoltaic silicon wafer divisions (2x2 module blocks)
      for (let c = 0; c < cols; c += 2) {
        for (let r = 0; r < rows; r += 2) {
          const px = c * cellW;
          const py = r * cellH;
          const pw = cellW * 2;
          const ph = cellH * 2;

          // Silicon cell antireflective tint
          ctx.fillStyle = 'rgba(255, 215, 0, 0.016)';
          ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

          // Fine conductive busbar traces across panels
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          const traceStep = pw * 0.25;
          for (let tx = px + traceStep; tx < px + pw - 1; tx += traceStep) {
            ctx.moveTo(tx, py + 1);
            ctx.lineTo(tx, py + ph - 1);
          }
          ctx.stroke();

          // Solder contact tabs at wafer junction points
          ctx.fillStyle = 'rgba(255, 215, 0, 0.28)';
          ctx.fillRect(px + 2, py + 2, 2, 2);
          ctx.fillRect(px + pw - 4, py + 2, 2, 2);
          ctx.fillRect(px + 2, py + ph - 4, 2, 2);
          ctx.fillRect(px + pw - 4, py + ph - 4, 2, 2);
        }
      }
      break;
    }

    case 'void_observatory': {
      // 1. Celestial coordinate ticks along center cross-axes
      ctx.strokeStyle = 'rgba(124, 77, 255, 0.18)';
      ctx.lineWidth = 1;
      const midX = Math.floor(cols / 2) * cellW;
      const midY = Math.floor(rows / 2) * cellH;

      ctx.beginPath();
      for (let r = 0; r <= rows; r++) {
        const y = r * cellH;
        ctx.moveTo(midX - 2.5, y);
        ctx.lineTo(midX + 2.5, y);
      }
      for (let c = 0; c <= cols; c++) {
        const x = c * cellW;
        ctx.moveTo(x, midY - 2.5);
        ctx.lineTo(x, midY + 2.5);
      }
      ctx.stroke();

      // 2. Orbital focus boundary rings at quadrant centers
      ctx.strokeStyle = 'rgba(124, 77, 255, 0.04)';
      ctx.lineWidth = 0.75;
      const quadX = cols * cellW * 0.5;
      const quadY = rows * cellH * 0.5;
      ctx.beginPath();
      ctx.arc(quadX, quadY, Math.min(cellW, cellH) * 1.8, 0, Math.PI * 2);
      ctx.stroke();

      // Quantum cyan reticle nodes
      ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
      ctx.fillRect(midX - 1.5, midY - 1.5, 3, 3);
      break;
    }
  }
}

/**
 * Draws a recognizable, stylized miniature cybernetic snake specimen and collectible.
 */
function drawMiniatureSpecimen(
  ctx: CanvasRenderingContext2D,
  cellW: number,
  cellH: number,
  timeMs: number
): void {
  const pulse = Math.sin(timeMs * 0.005) * 0.08 + 0.94;
  const unit = Math.min(cellW, cellH);

  // ----------------------------------------------------
  // Collectible Item: Volumetric Emerald Power Sphere at (7, 3)
  // ----------------------------------------------------
  const foodX = 7 * cellW + cellW * 0.5;
  const foodY = 3 * cellH + cellH * 0.5;
  const foodR = unit * 0.28 * pulse;

  // Soft directional ground contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(foodX + 0.5, foodY + foodR * 0.85, foodR * 0.85, foodR * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer gimbal containment ring
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(foodX, foodY, foodR * 1.15, 0, Math.PI * 2);
  ctx.stroke();

  // Emerald core sphere with directional radial lighting
  if (typeof ctx.createRadialGradient === 'function') {
    const foodGrad = ctx.createRadialGradient(
      foodX - foodR * 0.3,
      foodY - foodR * 0.3,
      foodR * 0.1,
      foodX,
      foodY,
      foodR
    );
    foodGrad.addColorStop(0, '#FFFFFF');
    foodGrad.addColorStop(0.3, '#39FF14');
    foodGrad.addColorStop(0.75, '#00C853');
    foodGrad.addColorStop(1, '#004D20');
    ctx.fillStyle = foodGrad;
  } else {
    ctx.fillStyle = '#39FF14';
  }
  ctx.beginPath();
  ctx.arc(foodX, foodY, foodR, 0, Math.PI * 2);
  ctx.fill();

  // Specular reflection glint on top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(foodX - foodR * 0.35, foodY - foodR * 0.35, foodR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // ----------------------------------------------------
  // Miniature Cybernetic Snake Specimen at (3,3) -> (4,3) -> (5,3)
  // Head at (5,3) facing right, body at (4,3), tail at (3,3)
  // ----------------------------------------------------
  const segments = [
    { x: 3 * cellW + cellW * 0.5, y: 3 * cellH + cellH * 0.5, type: 'tail' },
    { x: 4 * cellW + cellW * 0.5, y: 3 * cellH + cellH * 0.5, type: 'body' },
    { x: 5 * cellW + cellW * 0.5, y: 3 * cellH + cellH * 0.5, type: 'head' },
  ];

  // 1. Ground contact shadows for all segments
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  for (const seg of segments) {
    const r = unit * (seg.type === 'head' ? 0.36 : seg.type === 'body' ? 0.32 : 0.26);
    ctx.beginPath();
    ctx.ellipse(seg.x + 0.75, seg.y + r * 0.85, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Articulated body segments (Tail and Mid-body)
  for (let i = 0; i < 2; i++) {
    const seg = segments[i];
    const isTail = seg.type === 'tail';
    const r = unit * (isTail ? 0.28 : 0.33);

    // Segment base armor
    if (typeof ctx.createRadialGradient === 'function') {
      const bodyGrad = ctx.createRadialGradient(
        seg.x - r * 0.3,
        seg.y - r * 0.3,
        r * 0.1,
        seg.x,
        seg.y,
        r
      );
      bodyGrad.addColorStop(0, '#B388FF');
      bodyGrad.addColorStop(0.5, '#9865FF');
      bodyGrad.addColorStop(1, '#5B25C6');
      ctx.fillStyle = bodyGrad;
    } else {
      ctx.fillStyle = '#9865FF';
    }
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal spine core line
    ctx.strokeStyle = '#43F5FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(seg.x - r * 0.6, seg.y);
    ctx.lineTo(seg.x + r * 0.6, seg.y);
    ctx.stroke();

    // Top-left specular glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(seg.x - r * 0.3, seg.y - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Directional Head Segment (Aerodynamic armor facing right)
  const head = segments[2];
  const hr = unit * 0.36;

  // Head armor contour
  if (typeof ctx.createRadialGradient === 'function') {
    const headGrad = ctx.createRadialGradient(
      head.x - hr * 0.3,
      head.y - hr * 0.3,
      hr * 0.1,
      head.x,
      head.y,
      hr
    );
    headGrad.addColorStop(0, '#80F8FF');
    headGrad.addColorStop(0.5, '#43F5FF');
    headGrad.addColorStop(1, '#00838F');
    ctx.fillStyle = headGrad;
  } else {
    ctx.fillStyle = '#43F5FF';
  }

  // Tapered forward-facing cybernetic head
  ctx.beginPath();
  ctx.moveTo(head.x + hr * 1.05, head.y); // Nose apex
  ctx.lineTo(head.x - hr * 0.35, head.y - hr * 0.95); // Top-left cheek
  ctx.lineTo(head.x - hr * 0.85, head.y - hr * 0.55); // Back-top
  ctx.lineTo(head.x - hr * 0.85, head.y + hr * 0.55); // Back-bottom
  ctx.lineTo(head.x - hr * 0.35, head.y + hr * 0.95); // Bottom-left cheek
  ctx.closePath();
  ctx.fill();

  // Head armor border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // Ocular Optic Sensors (Slit visor facing right)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(head.x + hr * 0.1, head.y - hr * 0.45, hr * 0.4, hr * 0.18);
  ctx.fillRect(head.x + hr * 0.1, head.y + hr * 0.27, hr * 0.4, hr * 0.18);

  ctx.fillStyle = '#00F5FF';
  ctx.fillRect(head.x + hr * 0.2, head.y - hr * 0.4, hr * 0.25, hr * 0.1);
  ctx.fillRect(head.x + hr * 0.2, head.y + hr * 0.32, hr * 0.25, hr * 0.1);

  // Top specular armor highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(head.x - hr * 0.2, head.y - hr * 0.65);
  ctx.lineTo(head.x + hr * 0.65, head.y - hr * 0.2);
  ctx.stroke();
}
