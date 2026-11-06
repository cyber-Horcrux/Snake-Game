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

  // 3. Body Segments with theme skin gradient & white energy cores
  // Rendered from tail (last index) down to segment 1 so head overlaps on top
  for (let i = totalSegments - 1; i >= 1; i--) {
    const pt = points[i];
    const progress = i / (totalSegments - 1); // 0 at head, 1 at tail
    const segRadius = baseRadius * (1 - progress * 0.28); // Taper towards tail

    // Segment color selection using the authoritative skin bodyColors palette
    let fill = skin.bodyColors[0];
    if (progress > 0.6) {
      fill = skin.bodyColors[2] || skin.bodyColors[0];
    } else if (progress > 0.25) {
      fill = skin.bodyColors[1] || skin.bodyColors[0];
    }

    if (glow > 0 && i <= 3) {
      ctx.shadowColor = skin.headGlow;
      ctx.shadowBlur = 8 * glow;
    } else {
      ctx.shadowBlur = 0;
    }

    // Outer segment body
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, segRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright energy core
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, segRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Snake Head
  if (glow > 0) {
    ctx.shadowColor = skin.headGlow;
    ctx.shadowBlur = 14 * glow;
  } else {
    ctx.shadowBlur = 0;
  }

  // Head base circle
  ctx.fillStyle = skin.headColor;
  ctx.beginPath();
  ctx.arc(headPt.x, headPt.y, baseRadius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Head inner bright core
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(headPt.x, headPt.y, baseRadius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // 5. Directional Optic Visor / Eyes
  // Positioned symmetrically relative to the head heading angle
  const forwardOffset = baseRadius * 0.44;
  const sideOffset = baseRadius * 0.52;
  const cos = Math.cos(headAngle);
  const sin = Math.sin(headAngle);

  // Eye 1 (left of heading)
  const eye1X = headPt.x + cos * forwardOffset - sin * sideOffset;
  const eye1Y = headPt.y + sin * forwardOffset + cos * sideOffset;

  // Eye 2 (right of heading)
  const eye2X = headPt.x + cos * forwardOffset + sin * sideOffset;
  const eye2Y = headPt.y + sin * forwardOffset - cos * sideOffset;

  // Dark eye socket housing
  ctx.fillStyle = '#080A12';
  ctx.beginPath();
  ctx.arc(eye1X, eye1Y, baseRadius * 0.28, 0, Math.PI * 2);
  ctx.arc(eye2X, eye2Y, baseRadius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Glowing neon pupil from skin.eyeColor
  ctx.fillStyle = skin.eyeColor;
  ctx.beginPath();
  ctx.arc(eye1X, eye1Y, baseRadius * 0.16, 0, Math.PI * 2);
  ctx.arc(eye2X, eye2Y, baseRadius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  return {
    success: true,
    resolvedSkinId: safeId,
    skinName: skin.name,
  };
}
