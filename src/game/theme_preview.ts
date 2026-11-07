/**
 * Board Theme Canvas Preview Drawing Engine
 * Pure 2D canvas drawing helper for generating lightweight, high-fidelity visual
 * previews of cosmetic Board Themes, their material surfaces, grid textures,
 * containment perimeters, and environmental lighting.
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
 * Draws a complete architectural preview of a board theme.
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

  const width = Math.max(10, Math.floor(options.width || 200));
  const height = Math.max(10, Math.floor(options.height || 100));
  const timeMs = Number.isFinite(options.timeMs) ? (options.timeMs || 0) : 0;
  const showSpecimen = options.showSpecimen ?? true;

  ctx.save();
  try {
    // 1. Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // 2. Base Floor Material & Radial Atmosphere
    ctx.fillStyle = theme.floorBg;
    ctx.fillRect(0, 0, width, height);

    if (typeof ctx.createRadialGradient === 'function') {
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.48,
        width * 0.08,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.65
      );
      grad.addColorStop(0, theme.floorGradient.center);
      grad.addColorStop(1, theme.floorGradient.edge);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Precision Floor Grid
    const cols = 10;
    const rows = 6;
    const cellW = width / cols;
    const cellH = height / rows;

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

    // Intersection crosshairs / tactical markers
    ctx.fillStyle = theme.grid.crosshairColor;
    for (let c = 2; c < cols; c += 2) {
      for (let r = 2; r < rows; r += 2) {
        ctx.fillRect(c * cellW - 1, r * cellH - 1, 2, 2);
      }
    }

    // 4. Directional Beveling & Containment Perimeter
    // Outer base bezel
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = theme.border.outerBase;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Directional Ambient Shadow (Bottom & Right)
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.border.shadowOcclusion;
    ctx.beginPath();
    ctx.moveTo(width - 1, 1);
    ctx.lineTo(width - 1, height - 1);
    ctx.lineTo(1, height - 1);
    ctx.stroke();

    // Key-light Specular Chamfer (Top & Left)
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

    // 5. Corner Reticles
    const corner = Math.min(cellW, cellH) * 0.9;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.border.cornerReticle;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(3, 3 + corner);
    ctx.lineTo(3, 3);
    ctx.lineTo(3 + corner, 3);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(width - 3 - corner, 3);
    ctx.lineTo(width - 3, 3);
    ctx.lineTo(width - 3, 3 + corner);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(3, height - 3 - corner);
    ctx.lineTo(3, height - 3);
    ctx.lineTo(3 + corner, height - 3);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(width - 3 - corner, height - 3);
    ctx.lineTo(width - 3, height - 3);
    ctx.lineTo(width - 3, height - 3 - corner);
    ctx.stroke();

    // 6. Optional Miniature Specimen (Tiny 3-segment snake & food for gameplay context)
    if (showSpecimen) {
      const pulse = Math.sin(timeMs * 0.004) * 0.15 + 0.85;

      // Miniature Food Item (Cyan Core at (7, 3))
      const foodX = 7 * cellW + cellW * 0.5;
      const foodY = 3 * cellH + cellH * 0.5;
      const foodR = Math.min(cellW, cellH) * 0.28 * pulse;

      ctx.fillStyle = '#00F5FF';
      ctx.beginPath();
      ctx.arc(foodX, foodY, foodR, 0, Math.PI * 2);
      ctx.fill();

      // Miniature Snake Body Segments (at (3,3), (4,3), (5,3))
      const segs = [
        { x: 5 * cellW + cellW * 0.5, y: 3 * cellH + cellH * 0.5, isHead: true },
        { x: 4 * cellW + cellW * 0.5, y: 3 * cellH + cellH * 0.5, isHead: false },
        { x: 3 * cellW + cellW * 0.5, y: 3 * cellH + cellH * 0.5, isHead: false },
      ];

      for (let i = segs.length - 1; i >= 0; i--) {
        const seg = segs[i];
        const r = Math.min(cellW, cellH) * (seg.isHead ? 0.38 : 0.3);
        ctx.fillStyle = seg.isHead ? '#43F5FF' : '#9865FF';
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } finally {
    ctx.restore();
  }

  return {
    success: true,
    resolvedThemeId: safeThemeId,
    themeName: theme.name,
  };
}
