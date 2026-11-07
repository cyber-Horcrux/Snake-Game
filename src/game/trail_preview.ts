/**
 * Snake Trail Canvas Preview Drawing Engine
 * Pure 2D canvas drawing helper for generating lightweight, high-fidelity visual
 * previews of cosmetic Snake Trails trailing an undulating cyber snake.
 */

import type { SnakeSkinId, SnakeTrailId } from './types.ts';
import { getTrailDefinition, isValidTrailId } from './trails.ts';
import { getSkinDefinition } from './skins.ts';
import { drawNaturalStylizedSnake } from './snake_renderer.ts';
import { drawSnakeTrail, type TrailPoint } from './trail_renderer.ts';

export interface TrailPreviewOptions {
  width: number;
  height: number;
  timeMs?: number;
  skinId?: SnakeSkinId;
  background?: 'glow' | 'dark' | 'transparent';
  glowIntensity?: number;
  waveSpeed?: number;
}

export interface DrawTrailPreviewResult {
  success: boolean;
  resolvedTrailId: SnakeTrailId;
  trailName: string;
}

/**
 * Draws a preview of the snake with its energetic trail streaming from the tail.
 */
export function drawTrailPreview(
  ctx: CanvasRenderingContext2D | null | undefined,
  trailId: SnakeTrailId | string | undefined | null,
  options: TrailPreviewOptions
): DrawTrailPreviewResult {
  if (!ctx) {
    return {
      success: false,
      resolvedTrailId: 'cyber_pulse',
      trailName: 'Cyber Pulse',
    };
  }

  const safeTrailId: SnakeTrailId = isValidTrailId(trailId) ? trailId : 'cyber_pulse';
  const trailDef = getTrailDefinition(safeTrailId);
  const skinDef = getSkinDefinition(options.skinId || 'cyber_cyan');

  const width = Math.max(10, Math.floor(options.width || 200));
  const height = Math.max(10, Math.floor(options.height || 100));
  const timeMs = Number.isFinite(options.timeMs) ? (options.timeMs || 0) : 0;
  const backgroundMode = options.background ?? 'glow';
  const glow = Math.max(0, Math.min(1, options.glowIntensity ?? 1.0));
  const speed = options.waveSpeed ?? 1.0;

  ctx.save();
  const prevAlpha = ctx.globalAlpha;

  try {
    // Always clear the canvas bounding box first to prevent accumulation of previous frames
    ctx.clearRect(0, 0, width, height);

    // 1. Background Pass
    if (backgroundMode !== 'transparent') {
      ctx.fillStyle = '#080A12';
      ctx.fillRect(0, 0, width, height);

      if (backgroundMode === 'glow' && glow > 0 && safeTrailId !== 'none') {
        const glowGrad = ctx.createRadialGradient(
          width * 0.38,
          height * 0.5,
          4,
          width * 0.38,
          height * 0.5,
          Math.max(width, height) * 0.6
        );
        glowGrad.addColorStop(0, `${trailDef.color}25`);
        glowGrad.addColorStop(0.6, `${trailDef.secondaryColor}0A`);
        glowGrad.addColorStop(1, 'rgba(8, 10, 18, 0)');

        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Subtle cyber grid baseline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width * 0.05, height * 0.5);
      ctx.lineTo(width * 0.95, height * 0.5);
      ctx.stroke();
    }

    // 2. Snake Geometry: 6 segments positioned toward the right
    const totalSegments = 6;
    const timeSec = (timeMs / 1000) * speed;
    const waveFreq = 2.4;
    const waveAmp = height * 0.14;
    const headX = width * 0.82;
    const tailX = width * 0.44;
    const spanX = headX - tailX;
    const stepX = spanX / (totalSegments - 1);
    const centerY = height * 0.5;

    const snakePoints: { x: number; y: number }[] = [];
    for (let i = 0; i < totalSegments; i++) {
      const x = headX - i * stepX;
      const phase = i * 0.68;
      const y = centerY + Math.sin(timeSec * waveFreq - phase) * waveAmp;
      snakePoints.push({ x, y });
    }

    // 3. Trail Points: Extending backwards to the left from the tail tip
    const trailPointCount = 14;
    const trailSpanX = tailX - width * 0.08;
    const trailStepX = trailSpanX / (trailPointCount - 1);

    const trailPoints: TrailPoint[] = [];
    // Index 0 of chain is closest to tail (newest)
    for (let i = 0; i < trailPointCount; i++) {
      const x = tailX - i * trailStepX;
      const phase = (totalSegments - 1 + i) * 0.68;
      const y = centerY + Math.sin(timeSec * waveFreq - phase) * waveAmp;
      const angle = 0;

      trailPoints.push({
        x,
        y,
        timeMs: timeMs - i * 40,
        angle,
        discontinuity: false,
      });
    }

    const baseRadius = Math.min(width, height) * 0.125;

    // 4. Draw Trail first so it emanates underneath tail
    if (safeTrailId !== 'none') {
      drawSnakeTrail(ctx, [trailPoints], safeTrailId, {
        visualEffects: glow > 0 ? 'high' : 'reduced',
        allowGlow: glow > 0,
        baseRadius: baseRadius * 0.85,
        animationTimeMs: timeMs,
      });
    }

    // 5. Draw Stylized Snake Body & Head
    const headPt = snakePoints[0];
    const neckPt = snakePoints[1] || { x: headPt.x - 10, y: headPt.y };
    const headAngle = Math.atan2(headPt.y - neckPt.y, headPt.x - neckPt.x);

    drawNaturalStylizedSnake(ctx, snakePoints, {
      headingAngle: headAngle,
      skin: skinDef,
      baseRadius,
      allowGlow: glow > 0,
      visualEffects: glow > 0 ? 'high' : 'reduced',
      animationTimeMs: timeMs,
    });
  } finally {
    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  return {
    success: true,
    resolvedTrailId: safeTrailId,
    trailName: trailDef.name,
  };
}
