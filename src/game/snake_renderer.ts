/**
 * NEON SNAKE — Shared Natural Stylized 2D Snake Visual Rendering System
 * 
 * Reusable, high-fidelity canvas rendering engine providing:
 * - Natural, streamlined body geometry with curved continuous centerline and radius-aware offset boundaries.
 * - Cumulative physical arc-length parameterization for consistent anatomical taper and scale placement.
 * - Geometrically sound, C1-continuous 180-degree turnarounds supporting both left and right turn directions.
 * - Continuous organic 90-degree turns and consecutive S-curves without geometric pinching or spikes.
 * - Smooth, curved anatomical viper/colubrid head silhouette with rounded snout, temporal jowls, and symmetrical lateral eyes.
 * - Outward-extending tail construction aligned with terminal tangent vector.
 * - Premium material realism and distinctive scale textures for all eight skins.
 * - Genuine scale confinement via interpolated physical placement and ribbon clipping.
 * - Seamless multi-zone body color transitions and volumetric 3D cylindrical shading.
 * - True three-tiered quality modes: High, Performance, and Reduced.
 * - Deterministic, injected frame animation timing.
 * - 100% shared visual engine between gameplay (NeonRenderer) and collection previews (drawSkinPreview).
 */

import type { Direction, SkinDefinition, SnakeSkinId } from './types.ts';
import { SKINS } from './constants.ts';

export interface SpinePoint {
  x: number;
  y: number;
}

export type ScaleStyle =
  | 'cyber_hex'
  | 'reptilian_keeled'
  | 'sunset_chevron'
  | 'geometric_facet'
  | 'viper_scutes'
  | 'frost_crystalline'
  | 'gold_metallic'
  | 'void_chitin';

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
  // Enhanced material realism properties
  scaleStyle: ScaleStyle;
  scaleSecondaryColor: string;
  interstitialColor: string;
  specularGleam: string;
}

export interface SmoothSpineNode {
  x: number;
  y: number;
  tangentX: number;
  tangentY: number;
  normalX: number;
  normalY: number;
  radius: number;
  progress: number; // 0 at head / neck, 1 at tail (normalized physical arc-length)
  distance: number; // cumulative physical distance from head (px)
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

export interface SmoothSpineOptions {
  baseRadius?: number;
  lateralTurnSign?: 1 | -1;
}

export function safeClosePath(ctx: CanvasRenderingContext2D): void {
  if (typeof ctx.closePath === 'function') {
    ctx.closePath();
  }
}

export function safeClip(ctx: CanvasRenderingContext2D): void {
  if (typeof ctx.clip === 'function') {
    ctx.clip();
  }
}

export function safeBezierCurveTo(
  ctx: CanvasRenderingContext2D,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  x: number,
  y: number
): void {
  if (typeof ctx.bezierCurveTo === 'function') {
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  } else {
    ctx.lineTo(x, y);
  }
}

export function safeQuadraticCurveTo(
  ctx: CanvasRenderingContext2D,
  cpx: number,
  cpy: number,
  x: number,
  y: number
): void {
  if (typeof ctx.quadraticCurveTo === 'function') {
    ctx.quadraticCurveTo(cpx, cpy, x, y);
  } else {
    ctx.lineTo(x, y);
  }
}

/**
 * Fast RGB color interpolation for seamless multi-zone transitions.
 */
function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function interpolateRgb(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = parseHexColor(c1);
  const [r2, g2, b2] = parseHexColor(c2);
  const clampedT = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Authoritative Visual Themes for All Eight Skins.
 * Preserves exact color tokens from constants.ts for compatibility while introducing
 * tailored scale textures, material highlights, and organic shading.
 */
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
    bellyShade: '#06182E',
    scaleStyle: 'cyber_hex',
    scaleSecondaryColor: '#1E3A5F',
    interstitialColor: '#041020',
    specularGleam: '#E0FFFF',
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
    scaleStyle: 'reptilian_keeled',
    scaleSecondaryColor: '#047857',
    interstitialColor: '#011710',
    specularGleam: '#D1FAE5',
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
    scaleStyle: 'sunset_chevron',
    scaleSecondaryColor: '#C2410C',
    interstitialColor: '#1E0436',
    specularGleam: '#FEF08A',
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
    scaleStyle: 'geometric_facet',
    scaleSecondaryColor: '#7E22CE',
    interstitialColor: '#180838',
    specularGleam: '#F5D0FE',
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
    scaleStyle: 'viper_scutes',
    scaleSecondaryColor: '#991B1B',
    interstitialColor: '#260505',
    specularGleam: '#FEE2E2',
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
    scaleStyle: 'frost_crystalline',
    scaleSecondaryColor: '#0284C7',
    interstitialColor: '#052438',
    specularGleam: '#FFFFFF',
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
    scaleStyle: 'gold_metallic',
    scaleSecondaryColor: '#D97706',
    interstitialColor: '#260E01',
    specularGleam: '#FFFBEB',
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
    scaleStyle: 'void_chitin',
    scaleSecondaryColor: '#2E1065',
    interstitialColor: '#01030A',
    specularGleam: '#A5F3FC',
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
  animationTimeMs?: number;
  lateralTurnSign?: 1 | -1;
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
 * Calculates the natural anatomical body radius based on physical cumulative progress u in [0, 1].
 * - Natural head-to-neck transition (0.78 matching head base).
 * - Muscular neck expansion (widening to 0.88).
 * - Consistent cylindrical mid-body girth (0.88 to 0.82).
 * - Smooth, gradual organic taper toward the tail down to 0.24.
 */
export function getAnatomicalRadius(u: number, baseRadius: number): number {
  if (baseRadius <= 0 || !Number.isFinite(baseRadius)) return 0;
  const clampedU = Math.max(0, Math.min(1, Number.isFinite(u) ? u : 0));

  if (clampedU < 0.12) {
    // Smooth transition from head neck base (0.78) to full body girth (0.88)
    const t = clampedU / 0.12;
    const ease = t * t * (3 - 2 * t);
    return baseRadius * (0.78 + ease * 0.10);
  } else if (clampedU < 0.65) {
    // Robust, natural cylindrical girth
    const t = (clampedU - 0.12) / 0.53;
    return baseRadius * (0.88 - t * 0.06);
  } else {
    // Posterior to tail: gradual, natural organic taper down to ~0.24
    const t = (clampedU - 0.65) / 0.35;
    const easeTaper = (1 - t) * (1 - t);
    return baseRadius * (0.24 + 0.58 * easeTaper);
  }
}

/**
 * Generates a smooth, curved centerline and radius-aware offset geometry from discrete spine points.
 * - Uses physical cumulative arc length to ensure anatomical taper and scale spacing are invariant
 *   to path curvature and sampling density.
 * - Geometrically sound turnaround solution with C1 tangent continuity at joins,
 *   supporting both left (+1) and right (-1) turn directions without needle collapse or kinks.
 * - Curvature-aware adaptive sampling for smooth 90-degree turns and consecutive S-curves.
 * - Radius-aware offset boundary construction preventing inner-side collapse and outer spikes.
 * - Strictly finite coordinates and non-collapsing body thickness.
 */
export function generateSmoothSpine(
  chain: readonly SpinePoint[],
  baseRadiusOrOptions: number | SmoothSpineOptions = 12,
  legacyLateralSign?: 1 | -1
): SmoothSpineNode[] {
  if (!chain || chain.length === 0) return [];

  // Parse options
  let safeBaseR = 12;
  let forcedTurnSign: 1 | -1 | undefined = legacyLateralSign;

  if (typeof baseRadiusOrOptions === 'number') {
    safeBaseR = Math.max(1, Number.isFinite(baseRadiusOrOptions) ? baseRadiusOrOptions : 12);
  } else if (baseRadiusOrOptions && typeof baseRadiusOrOptions === 'object') {
    if (Number.isFinite(baseRadiusOrOptions.baseRadius)) {
      safeBaseR = Math.max(1, baseRadiusOrOptions.baseRadius!);
    }
    if (baseRadiusOrOptions.lateralTurnSign === 1 || baseRadiusOrOptions.lateralTurnSign === -1) {
      forcedTurnSign = baseRadiusOrOptions.lateralTurnSign;
    }
  }

  // Defensive sanitization: filter out non-finite coordinates
  const cleanPoints: SpinePoint[] = [];
  for (const pt of chain) {
    if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
      cleanPoints.push({ x: pt.x, y: pt.y });
    }
  }
  if (cleanPoints.length === 0) return [];

  // Deduplicate consecutive zero-distance points
  const points: SpinePoint[] = [cleanPoints[0]];
  for (let i = 1; i < cleanPoints.length; i++) {
    const prev = points[points.length - 1];
    const curr = cleanPoints[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 0.001) {
      points.push(curr);
    }
  }

  const count = points.length;

  if (count === 1) {
    const pt = points[0];
    const r = getAnatomicalRadius(0, safeBaseR);
    return [{
      x: pt.x,
      y: pt.y,
      tangentX: 1,
      tangentY: 0,
      normalX: 0,
      normalY: 1,
      radius: r,
      progress: 0,
      distance: 0,
      leftX: pt.x,
      leftY: pt.y + r,
      rightX: pt.x,
      rightY: pt.y - r,
    }];
  }

  // 1. Build composite curved path: straight segments connected by smooth fillets and C1 turnarounds
  interface RawSample {
    x: number;
    y: number;
    tx: number;
    ty: number;
  }

  const rawSamples: RawSample[] = [];

  function addSample(x: number, y: number, tx: number, ty: number): void {
    const len = Math.hypot(tx, ty);
    const nTx = len > 0.0001 ? tx / len : 1;
    const nTy = len > 0.0001 ? ty / len : 0;
    if (rawSamples.length > 0) {
      const prev = rawSamples[rawSamples.length - 1];
      if (Math.hypot(x - prev.x, y - prev.y) < 0.001) {
        // Update tangent if coincident
        prev.tx = nTx;
        prev.ty = nTy;
        return;
      }
    }
    rawSamples.push({ x, y, tx: nTx, ty: nTy });
  }

  function emitStraight(startX: number, startY: number, endX: number, endY: number, stepDist: number): void {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    const tx = dx / len;
    const ty = dy / len;

    if (rawSamples.length === 0) {
      addSample(startX, startY, tx, ty);
    }

    const steps = Math.max(1, Math.round(len / stepDist));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      addSample(startX + dx * t, startY + dy * t, tx, ty);
    }
  }

  const stepDist = Math.max(3.0, safeBaseR * 0.30);

  if (count === 2) {
    emitStraight(points[0].x, points[0].y, points[1].x, points[1].y, stepDist);
  } else {
    let currentStart = { x: points[0].x, y: points[0].y };

    for (let i = 1; i < count - 1; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const pNext = points[i + 1];

      const inDx = pCurr.x - pPrev.x;
      const inDy = pCurr.y - pPrev.y;
      const inLen = Math.hypot(inDx, inDy);
      if (inLen < 0.001) continue;
      const inUx = inDx / inLen;
      const inUy = inDy / inLen;

      const outDx = pNext.x - pCurr.x;
      const outDy = pNext.y - pCurr.y;
      const outLen = Math.hypot(outDx, outDy);
      if (outLen < 0.001) continue;
      const outUx = outDx / outLen;
      const outUy = outDy / outLen;

      const dot = inUx * outUx + inUy * outUy;
      const cross = inUx * outUy - inUy * outUx;

      // Check for straight segments
      if (dot > 0.998) {
        emitStraight(currentStart.x, currentStart.y, pCurr.x, pCurr.y, stepDist);
        currentStart = { x: pCurr.x, y: pCurr.y };
        continue;
      }

      // Reversal and sharp-turn handling (dot <= -0.98, deflection >= 168.5° up to exact 180° reversal)
      if (dot <= -0.98) {
        const filletDist = Math.min(inLen * 0.44, outLen * 0.44, safeBaseR * 1.5);
        const turnStartX = pCurr.x - inUx * filletDist;
        const turnStartY = pCurr.y - inUy * filletDist;

        // Emit incoming straight lead-in
        emitStraight(currentStart.x, currentStart.y, turnStartX, turnStartY, stepDist);

        // Determine lateral turn sign (+1 for left, -1 for right)
        let sign: 1 | -1 = 1;
        if (forcedTurnSign === 1 || forcedTurnSign === -1) {
          sign = forcedTurnSign;
        } else if (Math.abs(cross) > 0.001) {
          sign = cross > 0 ? 1 : -1;
        }

        const latUx = -inUy * sign;
        const latUy = inUx * sign;
        const turnR = Math.max(safeBaseR * 0.95, 10);
        const fwdDist = Math.max(safeBaseR * 0.85, filletDist * 0.8);

        // Semicircular / elliptical C1 turnaround loop around corner pCurr
        const approxChord = Math.PI * Math.sqrt((fwdDist * fwdDist + turnR * turnR) / 2);
        const turnSteps = Math.max(8, Math.min(14, Math.round(approxChord / (safeBaseR * 0.35))));

        const cx = turnStartX + latUx * turnR;
        const cy = turnStartY + latUy * turnR;

        for (let s = 1; s <= turnSteps; s++) {
          const theta = (Math.PI * s) / turnSteps;
          const sinTheta = Math.sin(theta);
          const cosTheta = Math.cos(theta);

          const px = cx + inUx * (fwdDist * sinTheta) - latUx * (turnR * cosTheta);
          const py = cy + inUy * (fwdDist * sinTheta) - latUy * (turnR * cosTheta);

          const dPx = inUx * (fwdDist * cosTheta) + latUx * (turnR * sinTheta);
          const dPy = inUy * (fwdDist * cosTheta) + latUy * (turnR * sinTheta);

          addSample(px, py, dPx, dPy);
        }

        // Connect turnaround exit point (pExit) smoothly to the outgoing line (pTarget)
        // using cubic Hermite interpolation. Guarantees zero positional discontinuity,
        // exact tangent continuity (C1), and seamless alignment with the outgoing trajectory.
        const pExitX = turnStartX + latUx * (2 * turnR);
        const pExitY = turnStartY + latUy * (2 * turnR);
        const tExitX = -inUx;
        const tExitY = -inUy;

        const transDist = Math.min(outLen * 0.45, turnR * 2.0);
        const pTargetX = pCurr.x + outUx * (filletDist + transDist);
        const pTargetY = pCurr.y + outUy * (filletDist + transDist);
        const tTargetX = outUx;
        const tTargetY = outUy;

        const chord = Math.hypot(pTargetX - pExitX, pTargetY - pExitY);
        const v0x = tExitX * chord;
        const v0y = tExitY * chord;
        const v1x = tTargetX * chord;
        const v1y = tTargetY * chord;

        const transSteps = Math.max(6, Math.min(14, Math.round(chord / (safeBaseR * 0.35))));

        for (let s = 1; s <= transSteps; s++) {
          const u = s / transSteps;
          const u2 = u * u;
          const u3 = u2 * u;

          // Cubic Hermite basis functions
          const h00 = 2 * u3 - 3 * u2 + 1;
          const h10 = u3 - 2 * u2 + u;
          const h01 = -2 * u3 + 3 * u2;
          const h11 = u3 - u2;

          const px = h00 * pExitX + h10 * v0x + h01 * pTargetX + h11 * v1x;
          const py = h00 * pExitY + h10 * v0y + h01 * pTargetY + h11 * v1y;

          const dh00 = 6 * u2 - 6 * u;
          const dh10 = 3 * u2 - 4 * u + 1;
          const dh01 = -6 * u2 + 6 * u;
          const dh11 = 3 * u2 - 2 * u;

          const dpx = dh00 * pExitX + dh10 * v0x + dh01 * pTargetX + dh11 * v1x;
          const dpy = dh00 * pExitY + dh10 * v0y + dh01 * pTargetY + dh11 * v1y;

          addSample(px, py, dpx, dpy);
        }

        // Continue straight along the actual outgoing line with zero lateral offset and zero angular kink
        currentStart = { x: pTargetX, y: pTargetY };
        continue;
      }

      // Non-parallel turns: analytical circular arc fillet connecting A to B
      // with analytical center C from the normal line intersection.
      // Guarantees zero positional error at A and B, zero tangent error,
      // and uniform constant curvature without spikes or kinks across all angles.
      const filletDist = Math.min(inLen * 0.44, outLen * 0.44, safeBaseR * 1.5);
      const cornerStartX = pCurr.x - inUx * filletDist;
      const cornerStartY = pCurr.y - inUy * filletDist;
      const cornerEndX = pCurr.x + outUx * filletDist;
      const cornerEndY = pCurr.y + outUy * filletDist;

      emitStraight(currentStart.x, currentStart.y, cornerStartX, cornerStartY, stepDist);

      const sign = cross >= 0 ? 1 : -1;
      const nAx = -inUy * sign;
      const nAy = inUx * sign;
      const nBx = -outUy * sign;
      const nBy = outUx * sign;

      const dx = cornerEndX - cornerStartX;
      const dy = cornerEndY - cornerStartY;
      const det = -nAx * nBy + nAy * nBx;

      if (Math.abs(det) > 1e-6) {
        const r = (dx * (-nBy) - dy * (-nBx)) / det;
        const cx = cornerStartX + nAx * r;
        const cy = cornerStartY + nAy * r;
        const R = Math.hypot(cornerStartX - cx, cornerStartY - cy);

        const thetaA = Math.atan2(cornerStartY - cy, cornerStartX - cx);
        const thetaB = Math.atan2(cornerEndY - cy, cornerEndX - cx);

        let dTheta = thetaB - thetaA;
        if (sign > 0) {
          while (dTheta < 0) dTheta += 2 * Math.PI;
          while (dTheta >= 2 * Math.PI) dTheta -= 2 * Math.PI;
        } else {
          while (dTheta > 0) dTheta -= 2 * Math.PI;
          while (dTheta <= -2 * Math.PI) dTheta += 2 * Math.PI;
        }

        const arcLen = R * Math.abs(dTheta);
        const steps = Math.max(5, Math.min(16, Math.round(arcLen / (safeBaseR * 0.35))));

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const th = thetaA + t * dTheta;
          const px = cx + R * Math.cos(th);
          const py = cy + R * Math.sin(th);
          const tx = -Math.sin(th) * sign;
          const ty = Math.cos(th) * sign;
          addSample(px, py, tx, ty);
        }
      } else {
        addSample(cornerEndX, cornerEndY, outUx, outUy);
      }

      currentStart = { x: cornerEndX, y: cornerEndY };
    }

    emitStraight(currentStart.x, currentStart.y, points[count - 1].x, points[count - 1].y, stepDist);
  }

  const sampleCount = rawSamples.length;
  if (sampleCount === 0) return [];

  // 2. Compute cumulative physical arc length along the centerline
  const cumDistances = new Float64Array(sampleCount);
  cumDistances[0] = 0;
  for (let i = 1; i < sampleCount; i++) {
    const dX = rawSamples[i].x - rawSamples[i - 1].x;
    const dY = rawSamples[i].y - rawSamples[i - 1].y;
    cumDistances[i] = cumDistances[i - 1] + Math.hypot(dX, dY);
  }
  const totalLength = cumDistances[sampleCount - 1];

  // 3. Compute radius-aware offset boundaries using physical distance parameterization
  const nodes: SmoothSpineNode[] = new Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const s = rawSamples[i];
    const dist = cumDistances[i];
    const u = totalLength > 0.001 ? dist / totalLength : (sampleCount > 1 ? i / (sampleCount - 1) : 0);
    const r = getAnatomicalRadius(u, safeBaseR);

    // Normal vector perpendicular to forward tangent
    const nx = -s.ty;
    const ny = s.tx;

    // Radius-aware curvature clamping on inner turns
    let rLeft = r;
    let rRight = r;

    if (i > 0 && i < sampleCount - 1) {
      const pPrev = rawSamples[i - 1];
      const pNext = rawSamples[i + 1];
      const dTx = pNext.tx - pPrev.tx;
      const dTy = pNext.ty - pPrev.ty;
      const segArc = Math.max(0.1, cumDistances[i + 1] - cumDistances[i - 1]);
      // Mathematically centered curvature with consistent sign convention
      const kappa = (s.tx * dTy - s.ty * dTx) / segArc;

      if (kappa > 0.01) {
        // Curve to the left: left flank is inner
        const rho = 1 / kappa;
        rLeft = Math.min(r, Math.max(r * 0.45, rho * 0.85));
      } else if (kappa < -0.01) {
        // Curve to the right: right flank is inner
        const rho = 1 / Math.abs(kappa);
        rRight = Math.min(r, Math.max(r * 0.45, rho * 0.85));
      }
    }

    nodes[i] = {
      x: s.x,
      y: s.y,
      tangentX: s.tx,
      tangentY: s.ty,
      normalX: nx,
      normalY: ny,
      radius: r,
      progress: u,
      distance: dist,
      leftX: s.x + nx * rLeft,
      leftY: s.y + ny * rLeft,
      rightX: s.x - nx * rRight,
      rightY: s.y - ny * rRight,
    };
  }

  // 4. Robust boundary smoothing: guarantee forward progression and non-inversion without width kinks
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < sampleCount - 1; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const next = nodes[i + 1];

      // Left flank forward progression check
      const leftDx = curr.leftX - prev.leftX;
      const leftDy = curr.leftY - prev.leftY;
      const leftDot = leftDx * curr.tangentX + leftDy * curr.tangentY;
      if (leftDot <= 0) {
        curr.leftX = 0.5 * (prev.leftX + next.leftX);
        curr.leftY = 0.5 * (prev.leftY + next.leftY);
      }

      // Right flank forward progression check
      const rightDx = curr.rightX - prev.rightX;
      const rightDy = curr.rightY - prev.rightY;
      const rightDot = rightDx * curr.tangentX + rightDy * curr.tangentY;
      if (rightDot <= 0) {
        curr.rightX = 0.5 * (prev.rightX + next.rightX);
        curr.rightY = 0.5 * (prev.rightY + next.rightY);
      }

      // Enforce left boundary is strictly on left and right on right with smooth minimum clearance
      const minClearance = curr.radius * 0.40;
      const leftCheck = (curr.leftX - curr.x) * curr.normalX + (curr.leftY - curr.y) * curr.normalY;
      if (leftCheck < minClearance) {
        curr.leftX = curr.x + curr.normalX * minClearance;
        curr.leftY = curr.y + curr.normalY * minClearance;
      }

      const rightCheck = (curr.rightX - curr.x) * (-curr.normalX) + (curr.rightY - curr.y) * (-curr.normalY);
      if (rightCheck < minClearance) {
        curr.rightX = curr.x - curr.normalX * minClearance;
        curr.rightY = curr.y - curr.normalY * minClearance;
      }
    }
  }

  return nodes;
}

/**
 * Draws the stylized, anatomical snake head.
 * Features:
 * - Natural viper/colubrid wedge silhouette with muscular jowls, rounded snout, and smooth neck taper.
 * - Direction-aware orientation.
 * - Symmetrical lateral eyes with dark socket ring, luminous pupil, and specular gleam.
 * - Crown scale plates and dorsal crest light.
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
  try {

  let angle = 0;
  if (typeof heading === 'number') {
    angle = heading;
  } else if (typeof heading === 'string') {
    angle = getDirectionAngle(heading as Direction);
  } else if (typeof heading === 'object' && heading !== null) {
    angle = Math.atan2(heading.y, heading.x);
  }

  const skin = getSkinVisuals(skinInput as any);
  const effectiveGlow = allowGlow && visualEffects === 'high';

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Anatomical head proportions scaled to baseRadius
  const headLength = baseRadius * 1.35;
  const jowlWidth = baseRadius * 1.05;
  const neckWidth = baseRadius * 0.78;
  const snoutWidth = baseRadius * 0.48; // Rounded rostral width

  // 1. Head Glow Pass (only in High quality mode)
  if (effectiveGlow) {
    ctx.shadowColor = skin.headGlow;
    ctx.shadowBlur = 14;
  } else {
    ctx.shadowBlur = 0;
  }

  // 2. Smooth Anatomical Head Silhouette
  // Curved anatomical viper/colubrid head silhouette with rounded snout, temporal jowls, and smooth neck taper
  ctx.fillStyle = skin.headColor;
  ctx.beginPath();

  const snoutApex = toWorld(headPt.x, headPt.y, cos, sin, headLength * 1.16, 0);
  const rightSnout = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.90, snoutWidth * 0.90);
  const rightUpperJaw = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.40, jowlWidth * 1.05);
  const rightJowl = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.10, jowlWidth * 1.05);
  const rightJowlLower = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.55, jowlWidth * 0.85);
  const rightNeck = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.95, neckWidth);
  const neckBase = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 1.15, 0);
  const leftNeck = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.95, -neckWidth);
  const leftJowlLower = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.55, -jowlWidth * 0.85);
  const leftJowl = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.10, -jowlWidth * 1.05);
  const leftUpperJaw = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.40, -jowlWidth * 1.05);
  const leftSnout = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.90, -snoutWidth * 0.90);

  ctx.moveTo(snoutApex.x, snoutApex.y);
  // Curve down along right canthus rostralis to right temporal jowl
  safeBezierCurveTo(ctx, rightSnout.x, rightSnout.y, rightUpperJaw.x, rightUpperJaw.y, rightJowl.x, rightJowl.y);
  // Curve from right temporal jowl into occipital neck
  safeQuadraticCurveTo(ctx, rightJowlLower.x, rightJowlLower.y, rightNeck.x, rightNeck.y);
  // Curved occipital neck base across midline
  safeQuadraticCurveTo(ctx, neckBase.x, neckBase.y, leftNeck.x, leftNeck.y);
  // Curve from left occipital neck to left temporal jowl
  safeQuadraticCurveTo(ctx, leftJowlLower.x, leftJowlLower.y, leftJowl.x, leftJowl.y);
  // Curve along left canthus rostralis back to rounded snout apex
  safeBezierCurveTo(ctx, leftUpperJaw.x, leftUpperJaw.y, leftSnout.x, leftSnout.y, snoutApex.x, snoutApex.y);

  safeClosePath(ctx);
  ctx.fill();

  ctx.shadowBlur = 0;

  // 3. Anatomical Crown Scale Plate / Frontal Scutes on Head
  const crownLocal: [number, number][] = [
    [headLength * 0.60, 0],
    [headLength * 0.25, -jowlWidth * 0.38],
    [-headLength * 0.25, -jowlWidth * 0.32],
    [-headLength * 0.65, 0],
    [-headLength * 0.25, jowlWidth * 0.32],
    [headLength * 0.25, jowlWidth * 0.38],
  ];

  ctx.fillStyle = skin.scaleAccentColor;
  ctx.beginPath();
  const crownFirst = toWorld(headPt.x, headPt.y, cos, sin, crownLocal[0][0], crownLocal[0][1]);
  ctx.moveTo(crownFirst.x, crownFirst.y);
  for (let i = 1; i < crownLocal.length; i++) {
    const wp = toWorld(headPt.x, headPt.y, cos, sin, crownLocal[i][0], crownLocal[i][1]);
    ctx.lineTo(wp.x, wp.y);
  }
  safeClosePath(ctx);
  ctx.fill();

  // Subtle midline crest highlight
  const crestStart = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.55, 0);
  const crestEnd = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.50, 0);
  ctx.strokeStyle = skin.dorsalHighlight;
  ctx.lineWidth = Math.max(1, baseRadius * 0.08);
  ctx.beginPath();
  ctx.moveTo(crestStart.x, crestStart.y);
  ctx.lineTo(crestEnd.x, crestEnd.y);
  ctx.stroke();

  // 4. Directional Symmetrical Eyes in World Coordinates
  const forwardOffset = baseRadius * 0.38;
  const sideOffset = baseRadius * 0.54;

  const eye1X = headPt.x + cos * forwardOffset - sin * sideOffset;
  const eye1Y = headPt.y + sin * forwardOffset + cos * sideOffset;

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

  // Expressive colored iris
  ctx.fillStyle = skin.eyeColor;
  ctx.beginPath();
  ctx.arc(eye1X, eye1Y, pupilRadius, 0, Math.PI * 2);
  ctx.arc(eye2X, eye2Y, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // High quality specular gleam
  if (visualEffects === 'high') {
    const glintOffX = cos * (baseRadius * 0.08) - sin * (baseRadius * 0.06);
    const glintOffY = sin * (baseRadius * 0.08) + cos * (baseRadius * 0.06);
    const glintR = Math.max(0.75, baseRadius * 0.05);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eye1X + glintOffX, eye1Y + glintOffY, glintR, 0, Math.PI * 2);
    ctx.arc(eye2X + glintOffX, eye2Y - glintOffY, glintR, 0, Math.PI * 2);
    ctx.fill();
  }

  } finally {
    ctx.restore();
  }
}

/**
 * Draws skin-specific stylized scales along the curved body geometry.
 * Scales are placed at uniform physical distance intervals via linear interpolation
 * along the spine, clipped cleanly to the body ribbon so they never protrude.
 * 
 * Level Differentiation:
 * - High: Central dorsal scales + lateral flank scutes + specular highlights
 * - Performance: Central dorsal scales only (streamlined path operations)
 * - Reduced: Scales suppressed entirely (handled upstream)
 */
function drawCurvedBodyScales(
  ctx: CanvasRenderingContext2D,
  nodes: SmoothSpineNode[],
  skin: SkinVisualTheme,
  visualEffects: 'high' | 'performance',
  isTailChain: boolean
): void {
  const count = nodes.length;
  if (count < 4) return;

  const totalLength = nodes[count - 1].distance;
  if (totalLength < 10) return;

  ctx.save();
  try {
    ctx.shadowBlur = 0;

  // 1. Clip scales strictly to the body ribbon polygon
  ctx.beginPath();
  ctx.moveTo(nodes[0].leftX, nodes[0].leftY);
  for (let i = 1; i < count; i++) {
    ctx.lineTo(nodes[i].leftX, nodes[i].leftY);
  }
  if (isTailChain) {
    const last = nodes[count - 1];
    const tipDist = last.radius * 1.5;
    ctx.lineTo(last.x + last.tangentX * tipDist, last.y + last.tangentY * tipDist);
  }
  for (let i = count - 1; i >= 0; i--) {
    ctx.lineTo(nodes[i].rightX, nodes[i].rightY);
  }
  safeClosePath(ctx);
  safeClip(ctx);

  // 2. Uniform physical distance scale placement
  const scaleStep = Math.max(8, nodes[0].radius * 1.45);
  let targetDist = scaleStep * 0.75;
  let segIdx = 0;

  while (targetDist < totalLength - scaleStep * 0.8 && segIdx < count - 1) {
    while (segIdx < count - 2 && nodes[segIdx + 1].distance < targetDist) {
      segIdx++;
    }

    const n0 = nodes[segIdx];
    const n1 = nodes[segIdx + 1];
    const segDist = Math.max(0.0001, n1.distance - n0.distance);
    const t = Math.max(0, Math.min(1, (targetDist - n0.distance) / segDist));

    const posX = n0.x + (n1.x - n0.x) * t;
    const posY = n0.y + (n1.y - n0.y) * t;
    const tx = n0.tangentX + (n1.tangentX - n0.tangentX) * t;
    const ty = n0.tangentY + (n1.tangentY - n0.tangentY) * t;
    const tLen = Math.hypot(tx, ty);
    const normTx = tLen > 0.0001 ? tx / tLen : n0.tangentX;
    const normTy = tLen > 0.0001 ? ty / tLen : n0.tangentY;
    const normNx = -normTy;
    const normNy = normTx;
    const r = n0.radius + (n1.radius - n0.radius) * t;

    targetDist += scaleStep;

    if (r < 3.2) continue;

    // Scale dimensions scaled safely inside body half-width r
    const scaleLen = r * 0.65;
    const scaleW = r * 0.42;

    switch (skin.scaleStyle) {
      case 'reptilian_keeled': {
        // Classic diamond keeled snake scales
        const pF = { x: posX + normTx * (scaleLen * 0.5), y: posY + normTy * (scaleLen * 0.5) };
        const pB = { x: posX - normTx * (scaleLen * 0.5), y: posY - normTy * (scaleLen * 0.5) };
        const pL = { x: posX + normNx * (scaleW * 0.5), y: posY + normNy * (scaleW * 0.5) };
        const pR = { x: posX - normNx * (scaleW * 0.5), y: posY - normNy * (scaleW * 0.5) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pF.x, pF.y);
        ctx.lineTo(pL.x, pL.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.lineTo(pR.x, pR.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(pB.x, pB.y);
        ctx.lineTo(pF.x, pF.y);
        ctx.stroke();
        break;
      }

      case 'cyber_hex': {
        const hl = scaleLen * 0.45;
        const hw = scaleW * 0.55;
        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(posX + normTx * hl, posY + normTy * hl);
        ctx.lineTo(posX + normTx * (hl * 0.5) + normNx * hw, posY + normTy * (hl * 0.5) + normNy * hw);
        ctx.lineTo(posX - normTx * (hl * 0.5) + normNx * hw, posY - normTy * (hl * 0.5) + normNy * hw);
        ctx.lineTo(posX - normTx * hl, posY - normTy * hl);
        ctx.lineTo(posX - normTx * (hl * 0.5) - normNx * hw, posY - normTy * (hl * 0.5) - normNy * hw);
        ctx.lineTo(posX + normTx * (hl * 0.5) - normNx * hw, posY + normTy * (hl * 0.5) - normNy * hw);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(posX - normTx * hl, posY - normTy * hl);
        ctx.lineTo(posX + normTx * hl, posY + normTy * hl);
        ctx.stroke();
        break;
      }

      case 'sunset_chevron': {
        const pApex = { x: posX + normTx * (scaleLen * 0.4), y: posY + normTy * (scaleLen * 0.4) };
        const pArmL = { x: posX - normTx * (scaleLen * 0.5) + normNx * (scaleW * 0.65), y: posY - normTy * (scaleLen * 0.5) + normNy * (scaleW * 0.65) };
        const pMid = { x: posX - normTx * (scaleLen * 0.15), y: posY - normTy * (scaleLen * 0.15) };
        const pArmR = { x: posX - normTx * (scaleLen * 0.5) - normNx * (scaleW * 0.65), y: posY - normTy * (scaleLen * 0.5) - normNy * (scaleW * 0.65) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pApex.x, pApex.y);
        ctx.lineTo(pArmL.x, pArmL.y);
        ctx.lineTo(pMid.x, pMid.y);
        ctx.lineTo(pArmR.x, pArmR.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(pMid.x, pMid.y);
        ctx.lineTo(pApex.x, pApex.y);
        ctx.stroke();
        break;
      }

      case 'geometric_facet': {
        const pTop = { x: posX + normTx * (scaleLen * 0.5), y: posY + normTy * (scaleLen * 0.5) };
        const pBot = { x: posX - normTx * (scaleLen * 0.5), y: posY - normTy * (scaleLen * 0.5) };
        const pLeft = { x: posX + normNx * (scaleW * 0.6), y: posY + normNy * (scaleW * 0.6) };
        const pRight = { x: posX - normNx * (scaleW * 0.6), y: posY - normNy * (scaleW * 0.6) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pTop.x, pTop.y);
        ctx.lineTo(pLeft.x, pLeft.y);
        ctx.lineTo(pBot.x, pBot.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.fillStyle = skin.scaleSecondaryColor;
        ctx.beginPath();
        ctx.moveTo(pTop.x, pTop.y);
        ctx.lineTo(pRight.x, pRight.y);
        ctx.lineTo(pBot.x, pBot.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(pBot.x, pBot.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.stroke();
        break;
      }

      case 'viper_scutes': {
        const pFront = { x: posX + normTx * (scaleLen * 0.45), y: posY + normTy * (scaleLen * 0.45) };
        const pBack = { x: posX - normTx * (scaleLen * 0.45), y: posY - normTy * (scaleLen * 0.45) };
        const pL = { x: posX - normTx * (scaleLen * 0.1) + normNx * (scaleW * 0.7), y: posY - normTy * (scaleLen * 0.1) + normNy * (scaleW * 0.7) };
        const pR = { x: posX - normTx * (scaleLen * 0.1) - normNx * (scaleW * 0.7), y: posY - normTy * (scaleLen * 0.1) - normNy * (scaleW * 0.7) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pFront.x, pFront.y);
        ctx.lineTo(pL.x, pL.y);
        ctx.lineTo(pBack.x, pBack.y);
        ctx.lineTo(pR.x, pR.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(pBack.x, pBack.y);
        ctx.lineTo(pFront.x, pFront.y);
        ctx.stroke();
        break;
      }

      case 'frost_crystalline': {
        const pFront = { x: posX + normTx * (scaleLen * 0.5), y: posY + normTy * (scaleLen * 0.5) };
        const pBack = { x: posX - normTx * (scaleLen * 0.5), y: posY - normTy * (scaleLen * 0.5) };
        const pL = { x: posX + normNx * (scaleW * 0.55), y: posY + normNy * (scaleW * 0.55) };
        const pR = { x: posX - normNx * (scaleW * 0.55), y: posY - normNy * (scaleW * 0.55) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pFront.x, pFront.y);
        ctx.lineTo(pL.x, pL.y);
        ctx.lineTo(pBack.x, pBack.y);
        ctx.lineTo(pR.x, pR.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(pBack.x, pBack.y);
        ctx.lineTo(pFront.x, pFront.y);
        ctx.stroke();
        break;
      }

      case 'gold_metallic': {
        const pFront = { x: posX + normTx * (scaleLen * 0.45), y: posY + normTy * (scaleLen * 0.45) };
        const pBack = { x: posX - normTx * (scaleLen * 0.45), y: posY - normTy * (scaleLen * 0.45) };
        const pL = { x: posX + normNx * (scaleW * 0.6), y: posY + normNy * (scaleW * 0.6) };
        const pR = { x: posX - normNx * (scaleW * 0.6), y: posY - normNy * (scaleW * 0.6) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pFront.x, pFront.y);
        ctx.lineTo(pL.x, pL.y);
        ctx.lineTo(pBack.x, pBack.y);
        ctx.lineTo(pR.x, pR.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(pBack.x, pBack.y);
        ctx.lineTo(pFront.x, pFront.y);
        ctx.stroke();
        break;
      }

      case 'void_chitin':
      default: {
        const pFront = { x: posX + normTx * (scaleLen * 0.45), y: posY + normTy * (scaleLen * 0.45) };
        const pBack = { x: posX - normTx * (scaleLen * 0.45), y: posY - normTy * (scaleLen * 0.45) };
        const pL = { x: posX - normTx * (scaleLen * 0.1) + normNx * (scaleW * 0.6), y: posY - normTy * (scaleLen * 0.1) + normNy * (scaleW * 0.6) };
        const pR = { x: posX - normTx * (scaleLen * 0.1) - normNx * (scaleW * 0.6), y: posY - normTy * (scaleLen * 0.1) - normNy * (scaleW * 0.6) };

        ctx.fillStyle = skin.scaleAccentColor;
        ctx.beginPath();
        ctx.moveTo(pFront.x, pFront.y);
        ctx.lineTo(pL.x, pL.y);
        ctx.lineTo(pBack.x, pBack.y);
        ctx.lineTo(pR.x, pR.y);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(pBack.x, pBack.y);
        ctx.lineTo(pFront.x, pFront.y);
        ctx.stroke();
        break;
      }
    }

    // High quality mode: add lateral flank scales styled to match the skin's anatomy
    if (visualEffects === 'high') {
      const latDist = r * 0.58;
      const flankR = r * 0.16;
      ctx.fillStyle = skin.scaleSecondaryColor;

      for (const flankSign of [1, -1] as const) {
        const fx = posX + normNx * (latDist * flankSign);
        const fy = posY + normNy * (latDist * flankSign);

        ctx.beginPath();
        if (skin.scaleStyle === 'cyber_hex') {
          // Hexagonal chip
          for (let k = 0; k < 6; k++) {
            const ha = (k * Math.PI) / 3;
            const hx = fx + Math.cos(ha) * flankR;
            const hy = fy + Math.sin(ha) * flankR;
            if (k === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          safeClosePath(ctx);
        } else if (skin.scaleStyle === 'reptilian_keeled' || skin.scaleStyle === 'sunset_chevron') {
          // Small elongated rhomboid scute
          ctx.moveTo(fx + normTx * flankR, fy + normTy * flankR);
          ctx.lineTo(fx + normNx * (flankR * 0.6 * flankSign), fy + normNy * (flankR * 0.6 * flankSign));
          ctx.lineTo(fx - normTx * flankR, fy - normTy * flankR);
          ctx.lineTo(fx - normNx * (flankR * 0.6 * flankSign), fy - normNy * (flankR * 0.6 * flankSign));
          safeClosePath(ctx);
        } else if (skin.scaleStyle === 'frost_crystalline' || skin.scaleStyle === 'geometric_facet') {
          // Angular facet
          ctx.moveTo(fx + normTx * flankR, fy + normTy * flankR);
          ctx.lineTo(fx + normNx * (flankR * 0.7 * flankSign), fy + normNy * (flankR * 0.7 * flankSign));
          ctx.lineTo(fx - normTx * (flankR * 0.5), fy - normTy * (flankR * 0.5));
          safeClosePath(ctx);
        } else {
          // Smooth lateral circular scute
          ctx.arc(fx, fy, flankR, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
  }
  } finally {
    ctx.restore();
  }
}

/**
 * Draws the continuous, streamlined snake body with smooth curved geometry,
 * seamless multi-zone color blending, volumetric 3D shading, and curved scale patterns.
 * 
 * Distinct Quality Tiers:
 * - High: Seamless blended ribbon + flank under-shading + dorsal carina + full scales
 * - Performance: Seamless blended ribbon + flank under-shading + dorsal carina + dorsal scales only
 * - Reduced: Continuous blended ribbon + dorsal carina (no flank shading, no scales)
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

  // 1. Generate smooth, curved spine and radius-aware offset geometry
  const nodes = generateSmoothSpine(chain, baseRadius);
  const totalNodes = nodes.length;
  if (totalNodes < 2) return;

  ctx.save();
  const prevAlpha = ctx.globalAlpha;
  try {

  // 2. Render seamless multi-zone curved ribbon from head to tail
  // Fill the complete base ribbon first so there are zero subpixel hairline cracks
  ctx.fillStyle = skin.bodyColors[1];
  if (allowGlow && visualEffects === 'high' && isHeadChain) {
    ctx.shadowColor = skin.headGlow;
    ctx.shadowBlur = 8;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  ctx.moveTo(nodes[0].leftX, nodes[0].leftY);
  for (let i = 1; i < totalNodes; i++) {
    ctx.lineTo(nodes[i].leftX, nodes[i].leftY);
  }
  if (isTailChain) {
    const last = nodes[totalNodes - 1];
    const tipDist = last.radius * 1.5;
    const tipX = last.x + last.tangentX * tipDist;
    const tipY = last.y + last.tangentY * tipDist;
    // Naturally tapered, smoothly rounded tail dome
    ctx.quadraticCurveTo(
      last.leftX + last.tangentX * (tipDist * 0.75),
      last.leftY + last.tangentY * (tipDist * 0.75),
      tipX,
      tipY
    );
    ctx.quadraticCurveTo(
      last.rightX + last.tangentX * (tipDist * 0.75),
      last.rightY + last.tangentY * (tipDist * 0.75),
      last.rightX,
      last.rightY
    );
  }
  for (let i = totalNodes - (isTailChain ? 2 : 1); i >= 0; i--) {
    ctx.lineTo(nodes[i].rightX, nodes[i].rightY);
  }
  safeClosePath(ctx);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Smooth color interpolation between Zone 0 (head/neck), Zone 1 (midbody), and Zone 2 (tail)
  for (let i = 0; i < totalNodes - 1; i++) {
    const u = nodes[i].progress;
    let segColor: string;
    if (u <= 0.45) {
      const t = u / 0.45;
      const ease = t * t * (3 - 2 * t);
      segColor = interpolateRgb(skin.bodyColors[0], skin.bodyColors[1], ease);
    } else {
      const t = (u - 0.45) / 0.55;
      const ease = t * t * (3 - 2 * t);
      segColor = interpolateRgb(skin.bodyColors[1], skin.bodyColors[2], ease);
    }

    ctx.fillStyle = segColor;
    ctx.beginPath();
    ctx.moveTo(nodes[i].leftX, nodes[i].leftY);
    ctx.lineTo(nodes[i + 1].leftX, nodes[i + 1].leftY);
    ctx.lineTo(nodes[i + 1].rightX, nodes[i + 1].rightY);
    ctx.lineTo(nodes[i].rightX, nodes[i].rightY);
    safeClosePath(ctx);
    ctx.fill();
  }

  // 3. Dedicated Natural Tapered Tail Tip Cap (only on true tail terminal of the snake)
  // The tip extends OUTWARD (away from the body) along the terminal tangent vector with a smooth curved finish
  if (isTailChain && totalNodes > 0) {
    const lastNode = nodes[totalNodes - 1];
    const tipDist = lastNode.radius * 1.5;
    const tipX = lastNode.x + lastNode.tangentX * tipDist;
    const tipY = lastNode.y + lastNode.tangentY * tipDist;

    ctx.fillStyle = skin.bodyColors[2];
    ctx.beginPath();
    ctx.moveTo(lastNode.leftX, lastNode.leftY);
    ctx.quadraticCurveTo(
      lastNode.leftX + lastNode.tangentX * (tipDist * 0.75),
      lastNode.leftY + lastNode.tangentY * (tipDist * 0.75),
      tipX,
      tipY
    );
    ctx.quadraticCurveTo(
      lastNode.rightX + lastNode.tangentX * (tipDist * 0.75),
      lastNode.rightY + lastNode.tangentY * (tipDist * 0.75),
      lastNode.rightX,
      lastNode.rightY
    );
    safeClosePath(ctx);
    ctx.fill();
  }

  // 4. Volumetric 3D Shading Pass (High and Performance modes)
  if (visualEffects !== 'reduced') {
    ctx.fillStyle = skin.bellyShade;
    ctx.globalAlpha = (visualEffects === 'high' ? 0.28 : 0.18) * prevAlpha;
    ctx.beginPath();
    ctx.moveTo(nodes[0].rightX, nodes[0].rightY);
    for (let i = 1; i < totalNodes; i++) {
      ctx.lineTo(nodes[i].rightX, nodes[i].rightY);
    }
    for (let i = totalNodes - 1; i >= 0; i--) {
      ctx.lineTo(
        nodes[i].x - nodes[i].normalX * (nodes[i].radius * 0.42),
        nodes[i].y - nodes[i].normalY * (nodes[i].radius * 0.42)
      );
    }
    safeClosePath(ctx);
    ctx.fill();
    ctx.globalAlpha = prevAlpha;
  }

  // 5. Continuous Dorsal Ridge Carina Highlight along the smooth centerline
  ctx.strokeStyle = skin.dorsalHighlight;
  ctx.lineWidth = Math.max(0.75, baseRadius * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  for (let i = 1; i < totalNodes; i++) {
    ctx.lineTo(nodes[i].x, nodes[i].y);
  }
  ctx.stroke();

  // 6. Stylized Scales along the curved spine (High and Performance modes)
  if (visualEffects !== 'reduced') {
    drawCurvedBodyScales(ctx, nodes, skin, visualEffects, isTailChain);
  }

  } finally {
    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }
}

/**
 * Primary shared snake visual-rendering entrypoint.
 * Renders the complete snake (streamlined continuous body, curved scale patterns,
 * and direction-aware stylized head) onto the target canvas context.
 */
export function drawNaturalStylizedSnake(
  ctx: CanvasRenderingContext2D,
  points: readonly SpinePoint[],
  options: SnakeRenderOptions & { skin?: SkinDefinition | SnakeSkinId | string | null }
): void {
  if (!ctx || !points || points.length === 0) return;

  ctx.save();
  const prevAlpha = ctx.globalAlpha;
  try {
    const visualEffects = options.visualEffects ?? 'high';
    const allowGlow = (options.allowGlow ?? true) && (visualEffects === 'high');
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

  // 1. Draw continuous streamlined body for all chains (from tailmost chain forward)
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
      try {
        const animTime = Number.isFinite(options.animationTimeMs) ? (options.animationTimeMs as number) : 0;
        const shieldPulse = Math.sin(animTime * 0.008) * 0.15 + 1;
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
      } finally {
        ctx.restore();
      }
    }
  }
  } finally {
    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }
}
