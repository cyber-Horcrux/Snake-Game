/**
 * Snake Skin Canvas Preview Drawing Engine
 * Pure 2D canvas drawing helper for generating lightweight, high-fidelity visual
 * previews of collectible Apex Cyber-Viper snake skins.
 * 
 * Reuses the visual identity, gradients, optic visor eyes, and neon glows from NeonRenderer.
 */

import type { SnakeSkinId } from './types.ts';
import { SKINS } from './constants.ts';
import { getSkinDefinition, isValidSkinId } from './skins.ts';
import { drawNaturalStylizedSnake } from './snake_renderer.ts';

export interface SkinPreviewOptions {
  /** Width in logical CSS pixels */
  width: number;
  /** Height in logical CSS pixels */
  height: number;
  /** Current animation timestamp in milliseconds */
  timeMs?: number;
  /** Background styling mode: glow ambient, dark, or transparent */
  background?: 'glow' | 'dark' | 'transparent';
  /** Number of snake segments to draw (default: 7) */
  segmentCount?: number;
  /** Intensity multiplier for shadows and neon glows (0.0 to 1.0, default: 1.0) */
  glowIntensity?: number;
  /** Optional direction override or wave amplitude multiplier */
  waveSpeed?: number;
}

export interface DrawSkinPreviewResult {
  success: boolean;
  resolvedSkinId: SnakeSkinId;
  skinName: string;
}

/**
 * Draws a stylized, futuristic snake preview onto the provided 2D canvas context.
 * Pure and deterministic given the inputs.
 */
export function drawSkinPreview(
  ctx: CanvasRenderingContext2D | null | undefined,
  skinId: SnakeSkinId | string | undefined | null,
  options: SkinPreviewOptions
): DrawSkinPreviewResult {
  // Defensive validation against null / missing context
  if (!ctx) {
    return {
      success: false,
      resolvedSkinId: 'cyber_cyan',
      skinName: SKINS.cyber_cyan.name,
    };
  }

  // Authoritatively resolve skin, falling back cleanly to Cyber Cyan if unknown
  const safeId: SnakeSkinId = isValidSkinId(skinId) ? skinId : 'cyber_cyan';
  const skin = getSkinDefinition(safeId);

  const width = Math.max(10, Math.floor(options.width || 200));
  const height = Math.max(10, Math.floor(options.height || 100));
  const timeMs = Number.isFinite(options.timeMs) ? (options.timeMs || 0) : 0;
  const backgroundMode = options.background ?? 'glow';
  const totalSegments = Math.max(4, Math.min(12, options.segmentCount ?? 7));
  const glow = Math.max(0, Math.min(1, options.glowIntensity ?? 1.0));
  const speed = options.waveSpeed ?? 1.0;

  ctx.save();

  // 1. Background Pass
  if (backgroundMode !== 'transparent') {
    ctx.fillStyle = '#080A12';
    ctx.fillRect(0, 0, width, height);

    if (backgroundMode === 'glow' && glow > 0) {
      // Ambient radial neon wash centered behind snake
      const glowGrad = ctx.createRadialGradient(
        width * 0.52,
        height * 0.5,
        4,
        width * 0.52,
        height * 0.5,
        Math.max(width, height) * 0.58
      );
      glowGrad.addColorStop(0, `${skin.headGlow}2E`); // ~18% alpha glow
      glowGrad.addColorStop(0.55, `${skin.headGlow}0C`); // ~5% alpha glow
      glowGrad.addColorStop(1, 'rgba(8, 10, 18, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle futuristic runway grid line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.5);
    ctx.lineTo(width * 0.92, height * 0.5);
    ctx.stroke();
  }

  // 2. Snake Geometry & Slither Wave Calculation
  // Head is positioned forward on the right, tail slithers towards the left in an S-curve
  const timeSec = (timeMs / 1000) * speed;
  const waveFreq = 2.5; // Undulation frequency in rad/s
  const waveAmp = height * 0.16; // Vertical sinusoidal displacement
  const headX = width * 0.74;
  const tailX = width * 0.22;
  const spanX = headX - tailX;
  const stepX = spanX / (totalSegments - 1);
  const centerY = height * 0.5;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < totalSegments; i++) {
    const x = headX - i * stepX;
    // Spatial wave phase delay per segment creates authentic slithering
    const phase = i * 0.72;
    const y = centerY + Math.sin(timeSec * waveFreq - phase) * waveAmp;
    points.push({ x, y });
  }

  // Calculate tangent angle at head for directional visor placement
  const headPt = points[0];
  const neckPt = points[1] || { x: headPt.x - 10, y: headPt.y };
  const headDx = headPt.x - neckPt.x;
  const headDy = headPt.y - neckPt.y;
  const headAngle = Math.atan2(headDy, headDx);

  const baseRadius = Math.min(width, height) * 0.135;

  // 3. Draw Natural Stylized Snake using shared renderer
  drawNaturalStylizedSnake(ctx, points, {
    headingAngle: headAngle,
    skin,
    baseRadius,
    allowGlow: glow > 0,
    visualEffects: glow > 0 ? 'high' : 'reduced',
    animationTimeMs: timeMs,
  });

  ctx.restore();

  return {
    success: true,
    resolvedSkinId: safeId,
    skinName: skin.name,
  };
}
