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
  const rawGlow = typeof options.glowIntensity === 'number' && Number.isFinite(options.glowIntensity)
    ? options.glowIntensity
    : 1.0;
  const glow = Math.max(0, Math.min(1, rawGlow));

  let renderSuccess = false;
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
    drawThemeMaterialSurface(ctx, safeThemeId, width, height, cols, rows, cellW, cellH, timeMs, 'high');

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

    // Emissive Containment Perimeter with Bounded Glow Intensity
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.border.emissivePerimeter;
    if (glow > 0) {
      ctx.shadowColor = theme.border.emissivePerimeter;
      ctx.shadowBlur = Math.round(5 * glow);
    }
    ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.shadowBlur = 0;

    // 8. Precision Corner Reticles
    const corner = Math.min(cellW, cellH) * 0.9;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.border.cornerReticle;
    if (glow > 0) {
      ctx.shadowColor = theme.border.cornerReticle;
      ctx.shadowBlur = Math.round(4 * glow);
    }

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
    ctx.shadowBlur = 0;

    // 9. Coherent Miniature Specimen & Realistic Collectible
    if (showSpecimen) {
      drawMiniatureSpecimen(ctx, cellW, cellH, timeMs);
    }

    renderSuccess = true;
  } catch {
    renderSuccess = false;
  } finally {
    ctx.restore();
  }

  return {
    success: renderSuccess,
    resolvedThemeId: safeThemeId,
    themeName: theme.name,
  };
}

/**
 * Draws the unique material surface texture and architectural markings for each theme.
 * Exported so gameplay renderer and preview canvas maintain 100% material consistency.
 */
export function drawThemeMaterialSurface(
  ctx: CanvasRenderingContext2D,
  themeId: BoardThemeId,
  width: number,
  height: number,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  timeMs: number,
  visualEffects: 'high' | 'performance' | 'reduced' = 'high'
): void {
  const isHigh = visualEffects === 'high';

  switch (themeId) {
    case 'obsidian_grid': {
      // Carbon-graphite diagonal weave on alternating panels
      ctx.strokeStyle = 'rgba(67, 245, 255, 0.022)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const step = isHigh ? Math.max(3, cellW * 0.25) : Math.max(5, cellW * 0.45);
      for (let c = 0; c < cols; c += 2) {
        for (let r = 0; r < rows; r += 2) {
          const x0 = c * cellW;
          const y0 = r * cellH;
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
      const midX = Math.floor(cols / 2) * cellW;
      ctx.beginPath();
      for (let c = 1; c < cols; c += 2) {
        const x = c * cellW;
        ctx.moveTo(x, midY - 2.5);
        ctx.lineTo(x, midY + 2.5);
      }
      for (let r = 1; r < rows; r += 2) {
        const y = r * cellH;
        ctx.moveTo(midX - 2.5, y);
        ctx.lineTo(midX + 2.5, y);
      }
      ctx.stroke();
      break;
    }

    case 'industrial_foundry': {
      // Heavy industrial floor plates with recessed expansion seams
      const slabStep = cols > 12 ? 3 : 2;
      for (let c = 0; c < cols; c += slabStep) {
        for (let r = 0; r < rows; r += slabStep) {
          const px = c * cellW;
          const py = r * cellH;
          const pw = Math.min(slabStep * cellW, width - px);
          const ph = Math.min(slabStep * cellH, height - py);

          // Plate surface subtle metallic tint
          ctx.fillStyle = ((c / slabStep) + (r / slabStep)) % 2 === 0 ? 'rgba(255, 158, 11, 0.018)' : 'rgba(0, 0, 0, 0.12)';
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

          // Brushed steel striation lines (horizontal micro-machining grain) on high mode
          if (isHigh) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.022)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            const grainStep = Math.max(3, cellH * 0.32);
            for (let gy = py + grainStep; gy < py + ph - 2; gy += grainStep) {
              ctx.moveTo(px + 2, gy);
              ctx.lineTo(px + pw - 2, gy);
            }
            ctx.stroke();
          }

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
            if (isHigh) {
              ctx.moveTo(x, y + cellH * 0.3);
              ctx.lineTo(x + cellW, y + cellH * 0.7);
            }
          }
        }
      }
      ctx.stroke();

      // 2. Diamond cryo-sensor nodes at key intersections
      ctx.fillStyle = 'rgba(224, 247, 250, 0.24)';
      const nodeStep = cols > 12 ? 3 : 2;
      for (let c = nodeStep; c < cols; c += nodeStep) {
        for (let r = nodeStep; r < rows; r += nodeStep) {
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

      // 3. Perimeter frost condensation glaze (subtle cool gradient near borders)
      ctx.strokeStyle = 'rgba(56, 225, 255, 0.06)';
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, width - 6, height - 6);
      break;
    }

    case 'bio_dome': {
      // 1. Dark organic vascular reticulum / hexagonal cellular mesh
      ctx.strokeStyle = 'rgba(16, 255, 160, 0.03)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      const meshStep = isHigh ? 1 : 2;
      for (let c = 0; c < cols; c += meshStep) {
        for (let r = 0; r < rows; r += meshStep) {
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
      const bioStep = cols > 12 ? 3 : 2;
      for (let c = bioStep; c < cols; c += bioStep) {
        for (let r = bioStep; r < rows; r += bioStep) {
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
      // 1. Photovoltaic silicon wafer divisions
      const panelStep = cols > 12 ? 3 : 2;
      for (let c = 0; c < cols; c += panelStep) {
        for (let r = 0; r < rows; r += panelStep) {
          const px = c * cellW;
          const py = r * cellH;
          const pw = Math.min(panelStep * cellW, width - px);
          const ph = Math.min(panelStep * cellH, height - py);

          // Silicon cell antireflective tint
          ctx.fillStyle = 'rgba(255, 215, 0, 0.016)';
          ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

          // Fine conductive busbar traces across panels
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          const traceStep = pw * 0.33;
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
      for (let r = 0; r <= rows; r += 2) {
        const y = r * cellH;
        ctx.moveTo(midX - 2.5, y);
        ctx.lineTo(midX + 2.5, y);
      }
      for (let c = 0; c <= cols; c += 2) {
        const x = c * cellW;
        ctx.moveTo(x, midY - 2.5);
        ctx.lineTo(x, midY + 2.5);
      }
      ctx.stroke();

      // 2. Orbital focus boundary rings at board center
      ctx.strokeStyle = 'rgba(124, 77, 255, 0.045)';
      ctx.lineWidth = 0.75;
      const quadX = width * 0.5;
      const quadY = height * 0.5;
      ctx.beginPath();
      ctx.arc(quadX, quadY, Math.min(width, height) * 0.2, 0, Math.PI * 2);
      if (isHigh) {
        ctx.arc(quadX, quadY, Math.min(width, height) * 0.35, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Quantum cyan reticle node at center
      ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
      ctx.fillRect(midX - 1.5, midY - 1.5, 3, 3);
      break;
    }
  }
}

/**
 * Draws a recognizable, stylized, continuous miniature cybernetic snake specimen and collectible.
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
  if (typeof ctx.ellipse === 'function') {
    ctx.ellipse(foodX + 0.5, foodY + foodR * 0.85, foodR * 0.85, foodR * 0.35, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(foodX + 0.5, foodY + foodR * 0.85, foodR * 0.6, 0, Math.PI * 2);
  }
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
      foodX - foodR * 0.32,
      foodY - foodR * 0.35,
      foodR * 0.08,
      foodX,
      foodY,
      foodR
    );
    foodGrad.addColorStop(0, '#FFFFFF');
    foodGrad.addColorStop(0.25, '#6EE7B7');
    foodGrad.addColorStop(0.65, '#10B981');
    foodGrad.addColorStop(0.9, '#047857');
    foodGrad.addColorStop(1, '#022C22');
    ctx.fillStyle = foodGrad;
  } else {
    ctx.fillStyle = '#10B981';
  }
  ctx.beginPath();
  ctx.arc(foodX, foodY, foodR, 0, Math.PI * 2);
  ctx.fill();

  // Specular reflection glint on top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(foodX - foodR * 0.35, foodY - foodR * 0.35, foodR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // ----------------------------------------------------
  // Miniature Cybernetic Snake Specimen at (3,3) -> (4,3) -> (5,3)
  // Continuous connected body silhouette facing right (+X)
  // ----------------------------------------------------
  const tailX = 3 * cellW + cellW * 0.5;
  const bodyX = 4 * cellW + cellW * 0.5;
  const headX = 5 * cellW + cellW * 0.5;
  const cy = 3 * cellH + cellH * 0.5;

  const tailR = unit * 0.26;
  const bodyR = unit * 0.32;
  const headR = unit * 0.36;

  // 1. Continuous Ground Contact Shadow beneath the entire connected silhouette
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  const shadowY = cy + bodyR * 0.88;
  const shadowStart = tailX - tailR * 0.8;
  const shadowEnd = headX + headR * 0.9;
  ctx.fillRect(shadowStart, shadowY - bodyR * 0.25, shadowEnd - shadowStart, bodyR * 0.55);

  // 2. Visually Connected, Continuous Snake Hull (Unifying tail, mid-body, and head)
  ctx.beginPath();
  // Nose apex at front of head
  ctx.moveTo(headX + headR * 1.05, cy);
  // Upper head taper to back-top of head
  ctx.lineTo(headX + headR * 0.2, cy - headR * 0.9);
  ctx.lineTo(headX - headR * 0.4, cy - headR * 0.75);
  // Smooth continuous upper flank across body and tail
  ctx.lineTo(bodyX, cy - bodyR);
  ctx.lineTo(tailX, cy - tailR);
  // Rounded tail apex cap
  ctx.arc(tailX, cy, tailR, -Math.PI / 2, Math.PI / 2, true);
  // Smooth continuous lower flank across tail and body
  ctx.lineTo(bodyX, cy + bodyR);
  ctx.lineTo(headX - headR * 0.4, cy + headR * 0.75);
  ctx.lineTo(headX + headR * 0.2, cy + headR * 0.9);
  ctx.closePath();

  // Continuous cybernetic gradient along body length (specular top-left light)
  if (typeof ctx.createLinearGradient === 'function') {
    const hullGrad = ctx.createLinearGradient(tailX, cy - bodyR, headX + headR, cy + bodyR);
    hullGrad.addColorStop(0, '#5B25C6');
    hullGrad.addColorStop(0.35, '#7C3AED');
    hullGrad.addColorStop(0.65, '#0284C7');
    hullGrad.addColorStop(1, '#00F5FF');
    ctx.fillStyle = hullGrad;
  } else {
    ctx.fillStyle = '#00F5FF';
  }
  ctx.fill();

  // Hull perimeter key-light stroke
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // 3. Articulated Armor Plates (Interlocking transverse segment cowl seams)
  // Tail-to-body articulation seam
  ctx.strokeStyle = 'rgba(10, 15, 30, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const seam1X = (tailX + bodyX) * 0.5;
  ctx.moveTo(seam1X, cy - bodyR * 0.95);
  ctx.lineTo(seam1X + unit * 0.08, cy);
  ctx.lineTo(seam1X, cy + bodyR * 0.95);
  ctx.stroke();

  // Body-to-head articulation seam
  ctx.beginPath();
  const seam2X = (bodyX + headX) * 0.5;
  ctx.moveTo(seam2X, cy - headR * 0.85);
  ctx.lineTo(seam2X + unit * 0.1, cy);
  ctx.lineTo(seam2X, cy + headR * 0.85);
  ctx.stroke();

  // Specular chamfer on articulation plates
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(seam1X + 1, cy - bodyR * 0.8);
  ctx.lineTo(seam1X + unit * 0.08 + 1, cy);
  ctx.moveTo(seam2X + 1, cy - headR * 0.7);
  ctx.lineTo(seam2X + unit * 0.1 + 1, cy);
  ctx.stroke();

  // 4. Continuous Dorsal Spine Runner Line (Unifying all segments along center line)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tailX - tailR * 0.4, cy);
  ctx.lineTo(headX + headR * 0.35, cy);
  ctx.stroke();

  // 5. Head Visor & Sensor Optics (Slit visor facing forward)
  // Visor slot
  ctx.fillStyle = '#020617';
  ctx.fillRect(headX + headR * 0.05, cy - headR * 0.48, headR * 0.45, headR * 0.22);
  ctx.fillRect(headX + headR * 0.05, cy + headR * 0.26, headR * 0.45, headR * 0.22);

  // Active optical sensor bars
  ctx.fillStyle = '#43F5FF';
  ctx.fillRect(headX + headR * 0.15, cy - headR * 0.42, headR * 0.3, headR * 0.11);
  ctx.fillRect(headX + headR * 0.15, cy + headR * 0.31, headR * 0.3, headR * 0.11);

  // Visor specular glint
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(headX + headR * 0.28, cy - headR * 0.42, headR * 0.12, headR * 0.11);
  ctx.fillRect(headX + headR * 0.28, cy + headR * 0.31, headR * 0.12, headR * 0.11);
}
