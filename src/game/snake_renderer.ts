/**
 * Shared Natural Stylized 2D Snake Visual Rendering System
 * 
 * Reusable canvas rendering engine providing consistent, high-fidelity snake anatomy,
 * continuous flowing body geometry, direction-aware head silhouettes, natural tail tapering,
 * and readable scale patterns across both gameplay and skin previews.
 * 
 * Target audience: Android mobile players (optimized for 60fps on devices like Galaxy A14).
 */

import type { Direction, SkinDefinition, SnakeSkinId } from './types.ts';
import { SKINS } from './constants.ts';

export interface SpinePoint {
  x: number;
  y: number;
}

export interface SkinVisualTheme {
  id: SnakeSkinId;
  name: string;
  headColor: string;
  headGlow: string;
  eyeColor: string;
  bodyColors: [string, string, string];
  scaleAccentColor: string;
  dorsalHighlight: string;
  bellyShade: string;
}

function safeClosePath(ctx: CanvasRenderingContext2D): void {
  if (typeof ctx.closePath === 'function') {
    ctx.closePath();
  }
}

export const SKIN_VISUAL_THEMES: Record<SnakeSkinId, SkinVisualTheme> = {
  cyber_cyan: {
    id: 'cyber_cyan',
    name: 'Cyber Cyan',
    headColor: '#43F5FF',
    headGlow: '#43F5FF',
    eyeColor: '#39FF14',
    bodyColors: ['#43F5FF', '#9865FF', '#FF4FD8'],
    scaleAccentColor: '#087F8C',
    dorsalHighlight: '#A5F8FF',
    bellyShade: '#0B2545',
  },
  matrix_green: {
    id: 'matrix_green',
    name: 'Matrix Emerald',
    headColor: '#39FF14',
    headGlow: '#39FF14',
    eyeColor: '#43F5FF',
    bodyColors: ['#39FF14', '#10B981', '#065F46'],
    scaleAccentColor: '#064E3B',
    dorsalHighlight: '#86EFAC',
    bellyShade: '#022C22',
  },
  synth_sunset: {
    id: 'synth_sunset',
    name: 'Synth Sunset',
    headColor: '#FF8A00',
    headGlow: '#FF8A00',
    eyeColor: '#43F5FF',
    bodyColors: ['#FF8A00', '#FF2E93', '#8A2BE2'],
    scaleAccentColor: '#B91C1C',
    dorsalHighlight: '#FDE047',
    bellyShade: '#3B0764',
  },
  hyper_violet: {
    id: 'hyper_violet',
    name: 'Hyper Violet',
    headColor: '#9865FF',
    headGlow: '#9865FF',
    eyeColor: '#FF4FD8',
    bodyColors: ['#9865FF', '#C084FC', '#FF4FD8'],
    scaleAccentColor: '#581C87',
    dorsalHighlight: '#E9D5FF',
    bellyShade: '#2E1065',
  },
  crimson_blaze: {
    id: 'crimson_blaze',
    name: 'Crimson Blaze',
    headColor: '#FF1744',
    headGlow: '#FF1744',
    eyeColor: '#FFD700',
    bodyColors: ['#FF1744', '#FF5252', '#880E4F'],
    scaleAccentColor: '#7F1D1D',
    dorsalHighlight: '#FCA5A5',
    bellyShade: '#450A0A',
  },
  arctic_frost: {
    id: 'arctic_frost',
    name: 'Arctic Frost',
    headColor: '#E0F7FA',
    headGlow: '#00E5FF',
    eyeColor: '#00F5FF',
    bodyColors: ['#E0F7FA', '#00E5FF', '#01579B'],
    scaleAccentColor: '#4DD0E1',
    dorsalHighlight: '#FFFFFF',
    bellyShade: '#0C4A6E',
  },
  gold_prestige: {
    id: 'gold_prestige',
    name: 'Solar Prestige',
    headColor: '#FFD700',
    headGlow: '#FFD700',
    eyeColor: '#FF4FD8',
    bodyColors: ['#FFD700', '#F59E0B', '#B45309'],
    scaleAccentColor: '#92400E',
    dorsalHighlight: '#FEF9C3',
    bellyShade: '#451A03',
  },
  apex_void: {
    id: 'apex_void',
    name: 'Apex Void',
    headColor: '#1A1D2E',
    headGlow: '#7C4DFF',
    eyeColor: '#00F5FF',
    bodyColors: ['#1A1D2E', '#4A148C', '#00F5FF'],
    scaleAccentColor: '#4C1D95',
    dorsalHighlight: '#64748B',
    bellyShade: '#020617',
  },
};

/**
 * Resolves a full visual theme from any skin definition or ID string, falling back safely.
 */
export function getSkinVisuals(skin: SkinDefinition | SnakeSkinId | string | null | undefined): SkinVisualTheme {
  let skinId: SnakeSkinId = 'cyber_cyan';
  let skinDef: SkinDefinition | undefined;

  if (typeof skin === 'string') {
    skinId = (SKIN_VISUAL_THEMES[skin as SnakeSkinId] ? skin : 'cyber_cyan') as SnakeSkinId;
    skinDef = SKINS[skinId];
  } else if (skin && typeof skin === 'object') {
    skinId = (skin.id && SKIN_VISUAL_THEMES[skin.id] ? skin.id : 'cyber_cyan') as SnakeSkinId;
    skinDef = skin;
  }

  const baseTheme = SKIN_VISUAL_THEMES[skinId] || SKIN_VISUAL_THEMES.cyber_cyan;

  if (!skinDef) return baseTheme;

  // Use authoritative skin colors if provided on custom skin definitions
  return {
    ...baseTheme,
    headColor: skinDef.headColor || baseTheme.headColor,
    headGlow: skinDef.headGlow || baseTheme.headGlow,
    eyeColor: skinDef.eyeColor || baseTheme.eyeColor,
    bodyColors: (Array.isArray(skinDef.bodyColors) && skinDef.bodyColors.length === 3)
      ? skinDef.bodyColors
      : baseTheme.bodyColors,
  };
}

/**
 * Calculates direction angle in radians from discrete Direction or vector.
 */
export function getDirectionAngle(dir?: Direction | null, dx: number = 0, dy: number = 0): number {
  if (dx !== 0 || dy !== 0) {
    return Math.atan2(dy, dx);
  }
  switch (dir) {
    case 'UP':
      return -Math.PI / 2;
    case 'DOWN':
      return Math.PI / 2;
    case 'LEFT':
      return Math.PI;
    case 'RIGHT':
    default:
      return 0;
  }
}

export interface SnakeRenderOptions {
  direction?: Direction | null;
  headingAngle?: number;
  baseRadius?: number;
  cellW?: number;
  cellH?: number;
  allowGlow?: boolean;
  visualEffects?: 'high' | 'performance' | 'reduced';
  hasShield?: boolean;
  maxWraparoundGap?: number;
}

/**
 * Detects Zen mode border wraparounds and splits points into continuous chains.
 */
export function splitSpineIntoChains(
  points: readonly SpinePoint[],
  maxGap: number
): SpinePoint[][] {
  if (!points || points.length === 0) return [];
  if (points.length === 1) return [[points[0]]];

  const chains: SpinePoint[][] = [];
  let currentChain: SpinePoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distSq = (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2;

    if (distSq > maxGap * maxGap) {
      // Discontinuity detected: complete current chain and start fresh chain
      if (currentChain.length > 0) {
        chains.push(currentChain);
      }
      currentChain = [curr];
    } else {
      currentChain.push(curr);
    }
  }

  if (currentChain.length > 0) {
    chains.push(currentChain);
  }

  return chains;
}

/**
 * Transforms local 2D coordinates into world coordinates given origin and rotation angle.
 */
function toWorld(ox: number, oy: number, cos: number, sin: number, lx: number, ly: number): SpinePoint {
  return {
    x: ox + cos * lx - sin * ly,
    y: oy + sin * lx + cos * ly,
  };
}

/**
 * Draws the stylized, anatomical snake head.
 * Features:
 * - Natural wedge/colubrid silhouette with distinct jowls, rounded snout, and smooth neck taper.
 * - Direction-aware orientation.
 * - Expressive lateral eyes with dark socket ring and glowing pupil.
 * - Subtle dorsal crown plate markings.
 */
export function drawStylizedSnakeHead(
  ctx: CanvasRenderingContext2D,
  headPt: SpinePoint,
  heading: number | Direction | SpinePoint,
  baseRadius: number,
  skinInput: SkinVisualTheme | SkinDefinition | SnakeSkinId | string,
  allowGlow: boolean = true,
  visualEffects: 'high' | 'performance' | 'reduced' = 'high'
): void {
  ctx.save();

  let angle = 0;
  if (typeof heading === 'number') {
    angle = heading;
  } else if (typeof heading === 'string') {
    angle = getDirectionAngle(heading as Direction);
  } else if (typeof heading === 'object' && heading !== null) {
    angle = Math.atan2(heading.y, heading.x);
  }

  const skin = getSkinVisuals(skinInput as any);
  const effectiveGlow = allowGlow && visualEffects !== 'reduced';

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Proportions scaled to baseRadius
  const headLength = baseRadius * 1.35;
  const jowlWidth = baseRadius * 1.05;
  const neckWidth = baseRadius * 0.78;
  const snoutWidth = baseRadius * 0.42;

  // 1. Head Glow Pass (if enabled)
  if (effectiveGlow) {
    ctx.shadowColor = skin.headGlow;
    ctx.shadowBlur = 14;
  } else {
    ctx.shadowBlur = 0;
  }

  // 2. Anatomical Head Silhouette Path in World Coordinates
  const pSnout = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.95, 0);
  const pJawUpperL = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.35, -jowlWidth * 0.75);
  const pJowlL = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.35, -jowlWidth * 0.95);
  const pNeckL = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.95, -neckWidth);
  const pNeckBase = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 1.05, 0);
  const pNeckR = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.95, neckWidth);
  const pJowlR = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.35, jowlWidth * 0.95);
  const pJawUpperR = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.35, jowlWidth * 0.75);

  ctx.fillStyle = skin.headColor;
  ctx.beginPath();
  ctx.moveTo(pSnout.x, pSnout.y);
  ctx.lineTo(pJawUpperL.x, pJawUpperL.y);
  ctx.lineTo(pJowlL.x, pJowlL.y);
  ctx.lineTo(pNeckL.x, pNeckL.y);
  ctx.lineTo(pNeckBase.x, pNeckBase.y);
  ctx.lineTo(pNeckR.x, pNeckR.y);
  ctx.lineTo(pJowlR.x, pJowlR.y);
  ctx.lineTo(pJawUpperR.x, pJawUpperR.y);
  safeClosePath(ctx);
  ctx.fill();

  // Reset shadow for crisp inner facial and scale markings
  ctx.shadowBlur = 0;

  // 3. Subtle Dorsal Crown Plate / Scale Pattern on Top of Head
  const c1 = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.45, 0);
  const c2 = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.05, -jowlWidth * 0.35);
  const c3 = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.45, -jowlWidth * 0.28);
  const c4 = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.7, 0);
  const c5 = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.45, jowlWidth * 0.28);
  const c6 = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.05, jowlWidth * 0.35);

  ctx.fillStyle = skin.scaleAccentColor;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y);
  ctx.lineTo(c4.x, c4.y);
  ctx.lineTo(c5.x, c5.y);
  ctx.lineTo(c6.x, c6.y);
  safeClosePath(ctx);
  ctx.fill();

  // Subtle midline crest highlight
  const crestStart = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.55, 0);
  const crestEnd = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.35, 0);
  ctx.strokeStyle = skin.dorsalHighlight;
  ctx.lineWidth = Math.max(1, baseRadius * 0.08);
  ctx.beginPath();
  ctx.moveTo(crestStart.x, crestStart.y);
  ctx.lineTo(crestEnd.x, crestEnd.y);
  ctx.stroke();

  // 4. Directional Symmetrical Eyes in World Coordinates
  // Positioned symmetrically relative to the forward heading
  const forwardOffset = baseRadius * 0.44;
  const sideOffset = baseRadius * 0.52;

  // Eye 1 (left of heading)
  const eye1X = headPt.x + cos * forwardOffset - sin * sideOffset;
  const eye1Y = headPt.y + sin * forwardOffset + cos * sideOffset;

  // Eye 2 (right of heading)
  const eye2X = headPt.x + cos * forwardOffset + sin * sideOffset;
  const eye2Y = headPt.y + sin * forwardOffset - cos * sideOffset;

  const socketRadius = baseRadius * 0.28;
  const pupilRadius = baseRadius * 0.16;

  // Dark eye socket housing
  ctx.fillStyle = '#080A12';
  ctx.beginPath();
  ctx.arc(eye1X, eye1Y, socketRadius, 0, Math.PI * 2);
  ctx.arc(eye2X, eye2Y, socketRadius, 0, Math.PI * 2);
  ctx.fill();

  // Expressive colored iris / pupil
  ctx.fillStyle = skin.eyeColor;
  ctx.beginPath();
  ctx.arc(eye1X, eye1Y, pupilRadius, 0, Math.PI * 2);
  ctx.arc(eye2X, eye2Y, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the continuous, flowing stylized body with smooth width transitions,
 * natural tail taper, and directional scale patterns.
 */
export function drawContinuousSnakeBody(
  ctx: CanvasRenderingContext2D,
  chain: readonly SpinePoint[],
  baseRadius: number,
  skin: SkinVisualTheme,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced',
  isHeadChain: boolean,
  isTailChain: boolean
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Precalculate widths and normal vectors for continuous contour
  const radii: number[] = new Array(count);
  const tangents: SpinePoint[] = new Array(count);
  const lefts: SpinePoint[] = new Array(count);
  const rights: SpinePoint[] = new Array(count);

  for (let i = 0; i < count; i++) {
    // Normal progress along chain: 0 at head, 1 at tail
    const t = i / (count - 1);
    // Smooth natural taper: thick near neck (~0.84), narrowing toward tail (~0.35)
    radii[i] = baseRadius * (0.84 - t * 0.49);

    // Tangent calculation
    let dx = 0;
    let dy = 0;
    if (i === 0) {
      dx = chain[0].x - chain[1].x;
      dy = chain[0].y - chain[1].y;
    } else if (i === count - 1) {
      dx = chain[count - 2].x - chain[count - 1].x;
      dy = chain[count - 2].y - chain[count - 1].y;
    } else {
      dx = chain[i - 1].x - chain[i + 1].x;
      dy = chain[i - 1].y - chain[i + 1].y;
    }

    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    tangents[i] = { x: tx, y: ty };

    // Perpendicular normal vector
    const nx = -ty;
    const ny = tx;

    const r = radii[i];
    lefts[i] = { x: chain[i].x + nx * r, y: chain[i].y + ny * r };
    rights[i] = { x: chain[i].x - nx * r, y: chain[i].y - ny * r };
  }

  // 2. Draw continuous body segments from tail to head
  // Each segment smoothly bridges chain[i] to chain[i-1] with aligned boundary contours
  ctx.save();

  for (let i = count - 1; i >= 1; i--) {
    const t = i / (count - 1);

    // Color gradient across body
    let fillColor = skin.bodyColors[0];
    if (t > 0.65) {
      fillColor = skin.bodyColors[2];
    } else if (t > 0.35) {
      fillColor = skin.bodyColors[1];
    }

    if (allowGlow && i <= 3) {
      ctx.shadowColor = skin.headGlow;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = fillColor;

    // Continuous trapezoidal capsule connecting adjacent spine nodes
    ctx.beginPath();
    ctx.moveTo(lefts[i].x, lefts[i].y);
    ctx.lineTo(lefts[i - 1].x, lefts[i - 1].y);
    ctx.lineTo(rights[i - 1].x, rights[i - 1].y);
    ctx.lineTo(rights[i].x, rights[i].y);
    safeClosePath(ctx);
    ctx.fill();

    // 3. Natural Tapered Tail Tip (only at the true tail end of the snake)
    if (isTailChain && i === count - 1) {
      const tailPt = chain[count - 1];
      const tailTan = tangents[count - 1];
      const tipDist = radii[count - 1] * 1.5;
      const tipPt = {
        x: tailPt.x - tailTan.x * tipDist,
        y: tailPt.y - tailTan.y * tipDist,
      };

      ctx.beginPath();
      ctx.moveTo(lefts[count - 1].x, lefts[count - 1].y);
      ctx.lineTo(tipPt.x, tipPt.y);
      ctx.lineTo(rights[count - 1].x, rights[count - 1].y);
      safeClosePath(ctx);
      ctx.fill();
    }

    // 4. Directional Scales along the dorsal ridge
    // Skip micro-scales in reduced mode or for tiny segment dimensions to optimize 60fps
    if (visualEffects !== 'reduced' && radii[i] >= 4) {
      ctx.shadowBlur = 0;
      const midX = (chain[i].x + chain[i - 1].x) * 0.5;
      const midY = (chain[i].y + chain[i - 1].y) * 0.5;
      const tan = tangents[i];
      const scaleLen = radii[i] * 0.65;
      const scaleW = radii[i] * 0.45;

      const snx = -tan.y;
      const sny = tan.x;

      const pFront = { x: midX + tan.x * (scaleLen * 0.5), y: midY + tan.y * (scaleLen * 0.5) };
      const pSideL = { x: midX - tan.x * (scaleLen * 0.25) + snx * (scaleW * 0.65), y: midY - tan.y * (scaleLen * 0.25) + sny * (scaleW * 0.65) };
      const pBack = { x: midX - tan.x * (scaleLen * 0.5), y: midY - tan.y * (scaleLen * 0.5) };
      const pSideR = { x: midX - tan.x * (scaleLen * 0.25) - snx * (scaleW * 0.65), y: midY - tan.y * (scaleLen * 0.25) - sny * (scaleW * 0.65) };

      ctx.fillStyle = skin.scaleAccentColor;
      ctx.beginPath();
      ctx.moveTo(pFront.x, pFront.y);
      ctx.lineTo(pSideL.x, pSideL.y);
      ctx.lineTo(pBack.x, pBack.y);
      ctx.lineTo(pSideR.x, pSideR.y);
      safeClosePath(ctx);
      ctx.fill();

      // Subtle midline crest light
      ctx.strokeStyle = skin.dorsalHighlight;
      ctx.lineWidth = Math.max(0.75, radii[i] * 0.08);
      ctx.beginPath();
      ctx.moveTo(pBack.x, pBack.y);
      ctx.lineTo(pFront.x, pFront.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Primary shared snake visual-rendering entrypoint.
 * Renders the complete snake (continuous body, scale patterns, and direction-aware stylized head)
 * onto the target canvas context.
 */
export function drawNaturalStylizedSnake(
  ctx: CanvasRenderingContext2D,
  points: readonly SpinePoint[],
  options: SnakeRenderOptions & { skin?: SkinDefinition | SnakeSkinId | string | null }
): void {
  if (!ctx || !points || points.length === 0) return;

  const visualEffects = options.visualEffects ?? 'high';
  const allowGlow = (options.allowGlow ?? true) && (visualEffects !== 'reduced');
  const skinTheme = getSkinVisuals(options.skin);

  // Base radius determination
  let baseRadius = options.baseRadius;
  if (!baseRadius || baseRadius <= 0) {
    if (options.cellW && options.cellH) {
      baseRadius = (Math.min(options.cellW, options.cellH) / 2) * 0.78;
    } else {
      baseRadius = 12;
    }
  }

  // Wraparound detection gap (Zen mode protection)
  const maxGap = options.maxWraparoundGap ?? ((options.cellW ?? baseRadius * 2) * 1.8);
  const chains = splitSpineIntoChains(points, maxGap);

  // 1. Draw continuous body for all chains (from tailmost chain forward)
  for (let c = chains.length - 1; c >= 0; c--) {
    const chain = chains[c];
    const isHeadChain = (c === 0);
    const isTailChain = (c === chains.length - 1);

    drawContinuousSnakeBody(
      ctx,
      chain,
      baseRadius,
      skinTheme,
      allowGlow,
      visualEffects,
      isHeadChain,
      isTailChain
    );
  }

  // 2. Draw Anatomical Stylized Head on chain 0 (head chain)
  const headChain = chains[0];
  if (headChain && headChain.length > 0) {
    const headPt = headChain[0];

    // Determine heading angle
    let angle = options.headingAngle;
    if (angle === undefined) {
      let dx = 0;
      let dy = 0;
      if (headChain.length > 1) {
        dx = headChain[0].x - headChain[1].x;
        dy = headChain[0].y - headChain[1].y;
      }
      angle = getDirectionAngle(options.direction, dx, dy);
    }

    drawStylizedSnakeHead(ctx, headPt, angle, baseRadius, skinTheme, allowGlow, visualEffects);

    // 3. Active Shield Aura around head (if powerup is active)
    if (options.hasShield) {
      ctx.save();
      const shieldPulse = Math.sin(Date.now() * 0.01) * 0.15 + 1;
      const shieldR = baseRadius * 1.85 * shieldPulse;
      if (allowGlow) {
        ctx.shadowColor = '#9865FF';
        ctx.shadowBlur = 22;
      }
      ctx.strokeStyle = '#9865FF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = headPt.x + Math.cos(a) * shieldR;
        const hy = headPt.y + Math.sin(a) * shieldR;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      safeClosePath(ctx);
      ctx.stroke();

      ctx.fillStyle = 'rgba(152, 101, 255, 0.18)';
      ctx.fill();
      ctx.restore();
    }
  }
}
