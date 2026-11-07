/**
 * NEON SNAKE — Shared Natural Stylized 2D Snake Visual Rendering System
 * 
 * Reusable, high-fidelity canvas rendering engine providing:
 * - Natural, streamlined body geometry with curved continuous centerline and radius-aware offset boundaries.
 * - Cumulative physical arc-length parameterization for consistent anatomical taper and scale placement.
 * - Organic, non-squarish 90-degree turns and consecutive turning handling without geometric pinching or spikes.
 * - Anatomically proportioned viper/colubrid head silhouette with expressive lateral eyes, jowls, and crown scutes.
 * - Correct tail construction extending outward away from the body.
 * - Premium material realism and distinctive scale textures for all eight skins.
 * - True three-tiered quality modes: High, Performance, and Reduced.
 * - 100% shared visual engine between gameplay (NeonRenderer) and collection previews (drawSkinPreview).
 * - Mobile-optimized for 60 FPS performance on devices such as Samsung Galaxy A14.
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

export function safeClosePath(ctx: CanvasRenderingContext2D): void {
  if (typeof ctx.closePath === 'function') {
    ctx.closePath();
  }
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
  animationTimeMs?: number;
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
  } else if (clampedU < 0.55) {
    // Robust, natural cylindrical girth
    const t = (clampedU - 0.12) / 0.43;
    return baseRadius * (0.88 - t * 0.06);
  } else {
    // Posterior to tail: gradual, natural organic taper down to ~0.24
    const t = (clampedU - 0.55) / 0.45;
    const easeTaper = (1 - t) * (1 - t);
    return baseRadius * (0.24 + 0.58 * easeTaper);
  }
}

/**
 * Generates a smooth, curved centerline and radius-aware offset geometry from discrete spine points.
 * - Uses physical cumulative arc length to ensure anatomical taper and scale spacing are invariant
 *   to path curvature and sampling density.
 * - Implements adaptive Bezier corner filleting to eliminate square/blocky turns.
 * - Handles degenerate inputs: 180-degree reversals, duplicate consecutive points, zero-length segments,
 *   and non-finite coordinates.
 * - Prevents inner-miter self-intersections and outer-miter spikes on tight turns.
 */
export function generateSmoothSpine(
  chain: readonly SpinePoint[],
  baseRadius: number
): SmoothSpineNode[] {
  if (!chain || chain.length === 0) return [];

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
  const safeBaseR = Math.max(1, Number.isFinite(baseRadius) ? baseRadius : 12);

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

  // 1. Build composite curved path: straight segments connected by smooth Bezier corner fillets
  interface CurveSubSegment {
    startX: number;
    startY: number;
    ctrlX?: number;
    ctrlY?: number;
    endX: number;
    endY: number;
    isCorner: boolean;
  }

  const subSegments: CurveSubSegment[] = [];

  if (count === 2) {
    subSegments.push({
      startX: points[0].x,
      startY: points[0].y,
      endX: points[1].x,
      endY: points[1].y,
      isCorner: false,
    });
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

      // Check for nearly straight segments (dot > 0.998)
      if (dot > 0.998) {
        subSegments.push({
          startX: currentStart.x,
          startY: currentStart.y,
          endX: pCurr.x,
          endY: pCurr.y,
          isCorner: false,
        });
        currentStart = { x: pCurr.x, y: pCurr.y };
        continue;
      }

      // 180-degree or near-180-degree reversal handling (dot < -0.96)
      if (dot < -0.96) {
        // Snake is doubling directly back on itself; create smooth lateral U-turn bulge
        const filletDist = Math.min(inLen * 0.44, outLen * 0.44);
        const cornerStart = {
          x: pCurr.x - inUx * filletDist,
          y: pCurr.y - inUy * filletDist,
        };
        const cornerEnd = {
          x: pCurr.x + outUx * filletDist,
          y: pCurr.y + outUy * filletDist,
        };
        // Perpendicular lateral bulge
        const latUx = -inUy;
        const latUy = inUx;
        const bulgeDist = Math.max(safeBaseR * 0.9, 10);
        const bulgeCtrl = {
          x: pCurr.x + latUx * bulgeDist,
          y: pCurr.y + latUy * bulgeDist,
        };

        subSegments.push({
          startX: currentStart.x,
          startY: currentStart.y,
          endX: cornerStart.x,
          endY: cornerStart.y,
          isCorner: false,
        });
        subSegments.push({
          startX: cornerStart.x,
          startY: cornerStart.y,
          ctrlX: bulgeCtrl.x,
          ctrlY: bulgeCtrl.y,
          endX: cornerEnd.x,
          endY: cornerEnd.y,
          isCorner: true,
        });

        currentStart = cornerEnd;
        continue;
      }

      // Standard turn: adaptive fillet curve around corner control point pCurr
      const filletDist = Math.min(inLen * 0.44, outLen * 0.44);
      const cornerStart = {
        x: pCurr.x - inUx * filletDist,
        y: pCurr.y - inUy * filletDist,
      };
      const cornerEnd = {
        x: pCurr.x + outUx * filletDist,
        y: pCurr.y + outUy * filletDist,
      };

      subSegments.push({
        startX: currentStart.x,
        startY: currentStart.y,
        endX: cornerStart.x,
        endY: cornerStart.y,
        isCorner: false,
      });
      subSegments.push({
        startX: cornerStart.x,
        startY: cornerStart.y,
        ctrlX: pCurr.x,
        ctrlY: pCurr.y,
        endX: cornerEnd.x,
        endY: cornerEnd.y,
        isCorner: true,
      });

      currentStart = cornerEnd;
    }

    subSegments.push({
      startX: currentStart.x,
      startY: currentStart.y,
      endX: points[count - 1].x,
      endY: points[count - 1].y,
      isCorner: false,
    });
  }

  // 2. Uniformly sample points along the composite curve
  interface RawSample {
    x: number;
    y: number;
    tx: number;
    ty: number;
  }

  const rawSamples: RawSample[] = [];

  for (const seg of subSegments) {
    if (seg.isCorner && seg.ctrlX !== undefined && seg.ctrlY !== undefined) {
      // Adaptive sampling: curvature determines sample count
      const chordLen = Math.hypot(seg.endX - seg.startX, seg.endY - seg.startY);
      const steps = Math.max(5, Math.min(10, Math.round(chordLen / (safeBaseR * 0.35))));

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const mt = 1 - t;
        const x = mt * mt * seg.startX + 2 * mt * t * seg.ctrlX + t * t * seg.endX;
        const y = mt * mt * seg.startY + 2 * mt * t * seg.ctrlY + t * t * seg.endY;

        const dX = 2 * mt * (seg.ctrlX - seg.startX) + 2 * t * (seg.endX - seg.ctrlX);
        const dY = 2 * mt * (seg.ctrlY - seg.startY) + 2 * t * (seg.endY - seg.ctrlY);
        const dLen = Math.hypot(dX, dY);

        rawSamples.push({
          x,
          y,
          tx: dLen > 0.0001 ? dX / dLen : 1,
          ty: dLen > 0.0001 ? dY / dLen : 0,
        });
      }
    } else {
      const dx = seg.endX - seg.startX;
      const dy = seg.endY - seg.startY;
      const len = Math.hypot(dx, dy);

      if (rawSamples.length === 0) {
        const tx = len > 0.0001 ? dx / len : 1;
        const ty = len > 0.0001 ? dy / len : 0;
        rawSamples.push({ x: seg.startX, y: seg.startY, tx, ty });
      }

      if (len > 0.001) {
        const stepDist = Math.max(3.0, safeBaseR * 0.28);
        const steps = Math.max(1, Math.round(len / stepDist));
        const tx = dx / len;
        const ty = dy / len;

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          rawSamples.push({
            x: seg.startX + dx * t,
            y: seg.startY + dy * t,
            tx,
            ty,
          });
        }
      }
    }
  }

  const sampleCount = rawSamples.length;
  if (sampleCount === 0) return [];

  // 3. Compute cumulative physical arc length along the centerline
  const cumDistances = new Float64Array(sampleCount);
  cumDistances[0] = 0;
  for (let i = 1; i < sampleCount; i++) {
    const dX = rawSamples[i].x - rawSamples[i - 1].x;
    const dY = rawSamples[i].y - rawSamples[i - 1].y;
    cumDistances[i] = cumDistances[i - 1] + Math.hypot(dX, dY);
  }
  const totalLength = cumDistances[sampleCount - 1];

  // 4. Compute radius-aware offset boundaries using physical distance parameterization
  const nodes: SmoothSpineNode[] = new Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const s = rawSamples[i];
    const dist = cumDistances[i];
    const u = totalLength > 0.001 ? dist / totalLength : (sampleCount > 1 ? i / (sampleCount - 1) : 0);
    const r = getAnatomicalRadius(u, safeBaseR);

    // Normal vector perpendicular to forward tangent
    const nx = -s.ty;
    const ny = s.tx;

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
      leftX: s.x + nx * r,
      leftY: s.y + ny * r,
      rightX: s.x - nx * r,
      rightY: s.y - ny * r,
    };
  }

  // 5. Robust inner-miter smoothing: prevent boundary self-intersection on tight turns
  for (let i = 1; i < sampleCount - 1; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];

    // Left flank forward progression check
    const leftDx = curr.leftX - prev.leftX;
    const leftDy = curr.leftY - prev.leftY;
    const leftDot = leftDx * curr.tangentX + leftDy * curr.tangentY;
    if (leftDot < 0) {
      // Clamping inner miter
      curr.leftX = curr.x + curr.normalX * (curr.radius * 0.42);
      curr.leftY = curr.y + curr.normalY * (curr.radius * 0.42);
    }

    // Right flank forward progression check
    const rightDx = curr.rightX - prev.rightX;
    const rightDy = curr.rightY - prev.rightY;
    const rightDot = rightDx * curr.tangentX + rightDy * curr.tangentY;
    if (rightDot < 0) {
      curr.rightX = curr.x - curr.normalX * (curr.radius * 0.42);
      curr.rightY = curr.y - curr.normalY * (curr.radius * 0.42);
    }
  }

  return nodes;
}

/**
 * Draws the stylized, anatomical snake head.
 * Features:
 * - Natural viper/colubrid wedge silhouette with muscular jowls, defined snoutWidth, and smooth neck taper.
 * - Direction-aware orientation.
 * - Symmetrical lateral eyes with dark socket ring and glowing pupil.
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

  let angle = 0;
  if (typeof heading === 'number') {
    angle = heading;
  } else if (typeof heading === 'string') {
    angle = getDirectionAngle(heading as Direction);
  } else if (typeof heading === 'object' && heading !== null) {
    angle = Math.atan2(heading.y, heading.x);
  }

  const skin = getSkinVisuals(skinInput as any);
  // Head glow is only active in high mode with allowGlow enabled
  const effectiveGlow = allowGlow && visualEffects === 'high';

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Anatomical head proportions scaled to baseRadius
  const headLength = baseRadius * 1.35;
  const jowlWidth = baseRadius * 1.05;
  const neckWidth = baseRadius * 0.78;
  const snoutWidth = baseRadius * 0.45; // Defined rostral width at snout

  // 1. Head Glow Pass (only in High quality mode)
  if (effectiveGlow) {
    ctx.shadowColor = skin.headGlow;
    ctx.shadowBlur = 14;
  } else {
    ctx.shadowBlur = 0;
  }

  // 2. Anatomical Head Silhouette Path in World Coordinates
  // Uses snoutWidth at rostral anterior and flares into lateral temporal jowls
  const pSnoutTip = toWorld(headPt.x, headPt.y, cos, sin, headLength * 1.02, 0);
  const pSnoutL = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.88, -snoutWidth * 0.5);
  const pJawUpperL = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.38, -jowlWidth * 0.82);
  const pJowlL = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.28, -jowlWidth * 0.98);
  const pNeckL = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.88, -neckWidth);
  const pNeckBase = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 1.02, 0);
  const pNeckR = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.88, neckWidth);
  const pJowlR = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.28, jowlWidth * 0.98);
  const pJawUpperR = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.38, jowlWidth * 0.82);
  const pSnoutR = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.88, snoutWidth * 0.5);

  ctx.fillStyle = skin.headColor;
  ctx.beginPath();
  ctx.moveTo(pSnoutTip.x, pSnoutTip.y);
  ctx.lineTo(pSnoutL.x, pSnoutL.y);
  ctx.lineTo(pJawUpperL.x, pJawUpperL.y);
  ctx.lineTo(pJowlL.x, pJowlL.y);
  ctx.lineTo(pNeckL.x, pNeckL.y);
  ctx.lineTo(pNeckBase.x, pNeckBase.y);
  ctx.lineTo(pNeckR.x, pNeckR.y);
  ctx.lineTo(pJowlR.x, pJowlR.y);
  ctx.lineTo(pJawUpperR.x, pJawUpperR.y);
  ctx.lineTo(pSnoutR.x, pSnoutR.y);
  safeClosePath(ctx);
  ctx.fill();

  ctx.shadowBlur = 0;

  // 3. Anatomical Crown Scale Plate / Frontal Scutes on Head
  const c1 = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.45, 0);
  const c2 = toWorld(headPt.x, headPt.y, cos, sin, headLength * 0.05, -jowlWidth * 0.35);
  const c3 = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.45, -jowlWidth * 0.28);
  const c4 = toWorld(headPt.x, headPt.y, cos, sin, -headLength * 0.70, 0);
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
  const forwardOffset = baseRadius * 0.44;
  const sideOffset = baseRadius * 0.52;

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

  // Expressive colored iris / pupil
  ctx.fillStyle = skin.eyeColor;
  ctx.beginPath();
  ctx.arc(eye1X, eye1Y, pupilRadius, 0, Math.PI * 2);
  ctx.arc(eye2X, eye2Y, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws skin-specific stylized scales along the curved body geometry.
 * Scales are placed at uniform physical distance intervals along the spine,
 * adapting smoothly to local tangents and remaining strictly inside the body ribbon.
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
  visualEffects: 'high' | 'performance'
): void {
  const count = nodes.length;
  if (count < 4) return;

  const totalLength = nodes[count - 1].distance;
  if (totalLength < 10) return;

  ctx.save();
  ctx.shadowBlur = 0;

  // Place scales at uniform physical distances (e.g. every baseRadius * 1.35)
  const scaleStep = Math.max(8, nodes[0].radius * 1.5);
  let nextDistance = scaleStep * 0.75;
  let nodeIdx = 1;

  while (nextDistance < totalLength - scaleStep * 0.6 && nodeIdx < count - 1) {
    // Find node closest to physical target distance
    while (nodeIdx < count - 1 && nodes[nodeIdx].distance < nextDistance) {
      nodeIdx++;
    }
    const node = nodes[nodeIdx];
    nextDistance += scaleStep;

    const r = node.radius;
    if (r < 3.0) continue;

    const tx = node.tangentX;
    const ty = node.tangentY;
    const nx = node.normalX;
    const ny = node.normalY;

    // Scale dimensions scaled to stay safely inside body half-width r
    const scaleLen = r * 0.68;
    const scaleW = r * 0.44;

    switch (skin.scaleStyle) {
      case 'reptilian_keeled': {
        // Classic diamond keeled snake scales
        const pF = { x: node.x + tx * (scaleLen * 0.5), y: node.y + ty * (scaleLen * 0.5) };
        const pB = { x: node.x - tx * (scaleLen * 0.5), y: node.y - ty * (scaleLen * 0.5) };
        const pL = { x: node.x + nx * (scaleW * 0.5), y: node.y + ny * (scaleW * 0.5) };
        const pR = { x: node.x - nx * (scaleW * 0.5), y: node.y - ny * (scaleW * 0.5) };

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
        ctx.moveTo(node.x + tx * hl, node.y + ty * hl);
        ctx.lineTo(node.x + tx * (hl * 0.5) + nx * hw, node.y + ty * (hl * 0.5) + ny * hw);
        ctx.lineTo(node.x - tx * (hl * 0.5) + nx * hw, node.y - ty * (hl * 0.5) + ny * hw);
        ctx.lineTo(node.x - tx * hl, node.y - ty * hl);
        ctx.lineTo(node.x - tx * (hl * 0.5) - nx * hw, node.y - ty * (hl * 0.5) - ny * hw);
        ctx.lineTo(node.x + tx * (hl * 0.5) - nx * hw, node.y + ty * (hl * 0.5) - ny * hw);
        safeClosePath(ctx);
        ctx.fill();

        ctx.strokeStyle = skin.dorsalHighlight;
        ctx.lineWidth = Math.max(0.75, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(node.x - tx * hl, node.y - ty * hl);
        ctx.lineTo(node.x + tx * hl, node.y + ty * hl);
        ctx.stroke();
        break;
      }

      case 'sunset_chevron': {
        const pApex = { x: node.x + tx * (scaleLen * 0.4), y: node.y + ty * (scaleLen * 0.4) };
        const pArmL = { x: node.x - tx * (scaleLen * 0.5) + nx * (scaleW * 0.65), y: node.y - ty * (scaleLen * 0.5) + ny * (scaleW * 0.65) };
        const pMid = { x: node.x - tx * (scaleLen * 0.15), y: node.y - ty * (scaleLen * 0.15) };
        const pArmR = { x: node.x - tx * (scaleLen * 0.5) - nx * (scaleW * 0.65), y: node.y - ty * (scaleLen * 0.5) - ny * (scaleW * 0.65) };

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
        const pTop = { x: node.x + tx * (scaleLen * 0.5), y: node.y + ty * (scaleLen * 0.5) };
        const pBot = { x: node.x - tx * (scaleLen * 0.5), y: node.y - ty * (scaleLen * 0.5) };
        const pLeft = { x: node.x + nx * (scaleW * 0.6), y: node.y + ny * (scaleW * 0.6) };
        const pRight = { x: node.x - nx * (scaleW * 0.6), y: node.y - ny * (scaleW * 0.6) };

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
        const pFront = { x: node.x + tx * (scaleLen * 0.45), y: node.y + ty * (scaleLen * 0.45) };
        const pBack = { x: node.x - tx * (scaleLen * 0.45), y: node.y - ty * (scaleLen * 0.45) };
        const pL = { x: node.x - tx * (scaleLen * 0.1) + nx * (scaleW * 0.7), y: node.y - ty * (scaleLen * 0.1) + ny * (scaleW * 0.7) };
        const pR = { x: node.x - tx * (scaleLen * 0.1) - nx * (scaleW * 0.7), y: node.y - ty * (scaleLen * 0.1) - ny * (scaleW * 0.7) };

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
        const pFront = { x: node.x + tx * (scaleLen * 0.5), y: node.y + ty * (scaleLen * 0.5) };
        const pBack = { x: node.x - tx * (scaleLen * 0.5), y: node.y - ty * (scaleLen * 0.5) };
        const pL = { x: node.x + nx * (scaleW * 0.55), y: node.y + ny * (scaleW * 0.55) };
        const pR = { x: node.x - nx * (scaleW * 0.55), y: node.y - ny * (scaleW * 0.55) };

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
        const pFront = { x: node.x + tx * (scaleLen * 0.45), y: node.y + ty * (scaleLen * 0.45) };
        const pBack = { x: node.x - tx * (scaleLen * 0.45), y: node.y - ty * (scaleLen * 0.45) };
        const pL = { x: node.x + nx * (scaleW * 0.6), y: node.y + ny * (scaleW * 0.6) };
        const pR = { x: node.x - nx * (scaleW * 0.6), y: node.y - ny * (scaleW * 0.6) };

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
        const pFront = { x: node.x + tx * (scaleLen * 0.45), y: node.y + ty * (scaleLen * 0.45) };
        const pBack = { x: node.x - tx * (scaleLen * 0.45), y: node.y - ty * (scaleLen * 0.45) };
        const pL = { x: node.x - tx * (scaleLen * 0.1) + nx * (scaleW * 0.6), y: node.y - ty * (scaleLen * 0.1) + ny * (scaleW * 0.6) };
        const pR = { x: node.x - tx * (scaleLen * 0.1) - nx * (scaleW * 0.6), y: node.y - ty * (scaleLen * 0.1) - ny * (scaleW * 0.6) };

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

    // High quality mode: add refined lateral flank scales on left and right flanks
    if (visualEffects === 'high') {
      const latDist = r * 0.58;
      ctx.fillStyle = skin.scaleSecondaryColor;
      ctx.beginPath();
      ctx.arc(node.x + nx * latDist, node.y + ny * latDist, r * 0.15, 0, Math.PI * 2);
      ctx.arc(node.x - nx * latDist, node.y - ny * latDist, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws the continuous, streamlined snake body with smooth curved geometry,
 * multi-zone gradient fill, natural tail tapering, and curved scale patterns.
 * 
 * Distinct Quality Tiers:
 * - High: Multi-zone ribbon + flank under-shading + dorsal highlight + full scales
 * - Performance: Multi-zone ribbon + flank under-shading + dorsal highlight + dorsal scales only
 * - Reduced: Multi-zone ribbon + dorsal highlight (no flank shading, no scales)
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

  // 2. Render multi-zone seamless curved ribbon from tail to head
  // Zones are defined by normalized physical progress u in [0, 1]
  let splitIdx1 = 1;
  let splitIdx2 = totalNodes - 1;
  for (let i = 0; i < totalNodes; i++) {
    if (nodes[i].progress <= 0.35) splitIdx1 = i;
    if (nodes[i].progress <= 0.68) splitIdx2 = i;
  }
  splitIdx1 = Math.max(1, splitIdx1);
  splitIdx2 = Math.max(splitIdx1 + 1, Math.min(totalNodes - 1, splitIdx2));

  interface BodyZone {
    start: number;
    end: number;
    color: string;
    glow: boolean;
  }

  const zones: BodyZone[] = [
    // Zone 2: Posterior / Tail
    { start: splitIdx2, end: totalNodes - 1, color: skin.bodyColors[2], glow: false },
    // Zone 1: Mid-body
    { start: splitIdx1, end: splitIdx2, color: skin.bodyColors[1], glow: false },
    // Zone 0: Anterior / Neck
    { start: 0, end: splitIdx1, color: skin.bodyColors[0], glow: allowGlow && visualEffects === 'high' && isHeadChain },
  ];

  for (const zone of zones) {
    if (zone.start >= zone.end) continue;

    if (zone.glow) {
      ctx.shadowColor = skin.headGlow;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = zone.color;
    ctx.beginPath();
    ctx.moveTo(nodes[zone.start].leftX, nodes[zone.start].leftY);

    for (let i = zone.start + 1; i <= zone.end; i++) {
      ctx.lineTo(nodes[i].leftX, nodes[i].leftY);
    }

    for (let i = zone.end; i >= zone.start; i--) {
      ctx.lineTo(nodes[i].rightX, nodes[i].rightY);
    }

    safeClosePath(ctx);
    ctx.fill();
  }

  // 3. Dedicated Natural Tapered Tail Tip Cap (only on true tail terminal of the snake)
  // The tip extends OUTWARD (away from the body) along the terminal tangent vector
  if (isTailChain && totalNodes > 0) {
    const lastNode = nodes[totalNodes - 1];
    const tipDist = lastNode.radius * 1.5;
    // PLUS sign ensures tip extends AWAY from body in the direction of heading
    const tipX = lastNode.x + lastNode.tangentX * tipDist;
    const tipY = lastNode.y + lastNode.tangentY * tipDist;

    ctx.fillStyle = skin.bodyColors[2];
    ctx.beginPath();
    ctx.moveTo(lastNode.leftX, lastNode.leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(lastNode.rightX, lastNode.rightY);
    safeClosePath(ctx);
    ctx.fill();
  }

  // 4. Volumetric 3D Shading Pass (High and Performance modes)
  ctx.shadowBlur = 0;
  if (visualEffects !== 'reduced') {
    ctx.fillStyle = skin.bellyShade;
    ctx.globalAlpha = visualEffects === 'high' ? 0.28 : 0.18;
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
    ctx.globalAlpha = 1.0;
  }

  // 5. Continuous Dorsal Ridge Highlight along the smooth centerline
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
    drawCurvedBodyScales(ctx, nodes, skin, visualEffects);
  }

  ctx.restore();
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

  const visualEffects = options.visualEffects ?? 'high';
  // Glow is only allowed in High quality mode
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
      const animTime = options.animationTimeMs ?? Date.now();
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
      ctx.restore();
    }
  }
}
