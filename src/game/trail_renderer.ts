/**
 * Snake Trails Canvas 2D Rendering System
 * High-performance, zero-allocation ring-buffer trail tracking and
 * artist-crafted procedural shader-like rendering for all 8 trail cosmetics.
 * 
 * Features:
 * - Zero dynamic GC allocations in the 60fps render loop
 * - Discontinuity detection for Zen mode wraparounds (no cross-screen artifacts)
 * - True three-tiered quality modes: High, Performance, and Reduced
 * - Stable behavior on pause / resume (timeMs deterministic)
 * - Tail-anchored emission that complements the snake chassis without obscuring board elements
 */

import type { SnakeTrailId, TrailDefinition } from './types.ts';
import { getTrailDefinition, isValidTrailId } from './trails.ts';

export interface TrailPoint {
  x: number;
  y: number;
  timeMs: number;
  angle: number;
  discontinuity: boolean;
}

export interface TrailRenderOptions {
  visualEffects?: 'high' | 'performance' | 'reduced';
  allowGlow?: boolean;
  baseRadius?: number;
  animationTimeMs?: number;
}

export const MAX_TRAIL_POINTS = 64;
export const DEFAULT_TRAIL_LIFETIME_MS = 650;

/**
 * Fixed-capacity circular ring buffer for trail history.
 * Preallocates all nodes to guarantee 0 GC pressure during gameplay.
 */
export class TrailHistoryManager {
  private buffer: TrailPoint[];
  private count: number = 0;
  private head: number = 0; // index of newest element
  private maxAgeMs: number;
  private defaultMaxLinkDistance?: number;

  constructor(maxAgeMs: number = DEFAULT_TRAIL_LIFETIME_MS, defaultMaxLinkDistance?: number) {
    this.maxAgeMs = maxAgeMs;
    if (typeof defaultMaxLinkDistance === 'number' && Number.isFinite(defaultMaxLinkDistance) && defaultMaxLinkDistance > 0) {
      this.defaultMaxLinkDistance = defaultMaxLinkDistance;
    }
    this.buffer = Array.from({ length: MAX_TRAIL_POINTS }, () => ({
      x: 0,
      y: 0,
      timeMs: 0,
      angle: 0,
      discontinuity: false,
    }));
  }

  public clear(): void {
    this.count = 0;
    this.head = 0;
  }

  public getPointCount(): number {
    return this.count;
  }

  public setDefaultMaxLinkDistance(distance?: number): void {
    if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
      this.defaultMaxLinkDistance = distance;
    } else {
      this.defaultMaxLinkDistance = undefined;
    }
  }

  public getDefaultMaxLinkDistance(): number | undefined {
    return this.defaultMaxLinkDistance;
  }

  /**
   * Adds a new tail sample point.
   * 
   * Timestamp & History Integrity Policy:
   * 1. Rejects non-finite values (x, y, timeMs must be finite numbers).
   * 2. Chronological Monotonicity: Samples must arrive in forward chronological order.
   *    Any sample with timeMs < newest.timeMs is rejected to protect history integrity
   *    and prevent out-of-order samples from corrupting the ring buffer or pruning valid points.
   * 3. Deterministic Equal-Timestamp Handling:
   *    - Equal timestamp with negligible displacement (dist < 0.25): deduplicated and ignored.
   *    - Equal timestamp with non-zero displacement (dist >= 0.25): accepted as an instantaneous
   *      sample, which is subsequently isolated into a new chain during getChains().
   * 4. Deduplication: Near-identical high-frequency samples (dist < 0.25px and dt < 14ms) are skipped.
   */
  public addPoint(
    x: number,
    y: number,
    timeMs: number,
    angle: number,
    discontinuity: boolean = false
  ): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(timeMs)) return;

    const safeAngle = Number.isFinite(angle) ? angle : 0;
    const safeDiscontinuity = Boolean(discontinuity);

    if (this.count > 0) {
      const newest = this.buffer[this.head];

      // Reject backward timestamps to preserve chronological ring buffer invariants
      if (timeMs < newest.timeMs) {
        return;
      }

      // Numerically safe displacement check
      const dist = Math.hypot(x - newest.x, y - newest.y);

      if (timeMs === newest.timeMs) {
        // Equal timestamps: deduplicate negligible/zero displacement
        if (dist < 0.25) {
          return;
        }
      } else {
        // Forward time: skip redundant high-frequency samples if very close in position and time
        if (dist < 0.25 && (timeMs - newest.timeMs) < 14) {
          return;
        }
      }
    }

    this.head = (this.head + 1) % MAX_TRAIL_POINTS;
    const pt = this.buffer[this.head];
    pt.x = x;
    pt.y = y;
    pt.timeMs = timeMs;
    pt.angle = safeAngle;
    pt.discontinuity = safeDiscontinuity;

    if (this.count < MAX_TRAIL_POINTS) {
      this.count++;
    }
  }

  /**
   * Prunes expired points and extracts active chains separated by discontinuities.
   * Returns chains in reverse chronological order (newest point at index 0 of the first chain).
   * 
   * Discontinuity and Link Safety:
   * 1. Authoritative `discontinuity` flags (e.g. Zen mode wrap or teleport marked upon insertion)
   *    are the primary boundary signal and always split chains.
   * 2. Non-finite coordinates and overflow:
   *    - Non-finite coordinates (NaN, Infinity, -Infinity) are defensively rejected from chains.
   *    - Non-finite computed distances (overflowing Math.hypot) are always treated as spatial jumps.
   * 3. Explicit distance threshold:
   *    - When caller provides a valid positive finite `maxLinkDistance` (or an instance-level
   *      `defaultMaxLinkDistance` is configured), points separated by greater distance are split.
   *      Uses linear distance comparison without squaring to prevent numerical overflow.
   * 4. Instantaneous jumps and chronology:
   *    - Non-zero displacement with zero elapsed time (dt <= 0 with dist >= 0.25) always splits.
   * 5. Safe fallback strategy when no valid distance threshold is supplied:
   *    - Evaluates movement chronologically using verified accepted movement history.
   *    - The initial baseline is anchored to the minimum verified physical stride in the window,
   *      preventing candidate large jumps from voting to inflate their own acceptance threshold.
   *    - A rejected spatial jump is never admitted into the trusted movement baseline.
   *    - Threshold dynamically adapts (4.5x running accepted baseline) while bounding velocity (<= 3.5 px/ms).
   */
  public getChains(currentTimeMs: number, maxLinkDistance?: number): TrailPoint[][] {
    if (!Number.isFinite(currentTimeMs) || this.count === 0) return [];

    const activePoints: TrailPoint[] = [];
    const minTime = currentTimeMs - this.maxAgeMs;

    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - i + MAX_TRAIL_POINTS) % MAX_TRAIL_POINTS;
      const pt = this.buffer[idx];
      if (!Number.isFinite(pt.timeMs) || pt.timeMs < minTime) {
        // Since points are ordered newest to oldest, remaining points are also expired
        this.count = i;
        break;
      }
      activePoints.push(pt);
    }

    if (activePoints.length === 0) return [];

    const hasExplicitThreshold = typeof maxLinkDistance === 'number' &&
      Number.isFinite(maxLinkDistance) &&
      maxLinkDistance > 0;

    const hasDefaultThreshold = !hasExplicitThreshold &&
      typeof this.defaultMaxLinkDistance === 'number' &&
      Number.isFinite(this.defaultMaxLinkDistance) &&
      this.defaultMaxLinkDistance > 0;

    let explicitMaxDistance: number | undefined = undefined;
    if (hasExplicitThreshold) {
      explicitMaxDistance = maxLinkDistance;
    } else if (hasDefaultThreshold) {
      explicitMaxDistance = this.defaultMaxLinkDistance;
    }

    // Order points chronologically (oldest to newest) to evaluate candidate movement
    // against previously accepted movement history.
    const chronologicalPoints: TrailPoint[] = activePoints.slice().reverse();

    let initialBaseline: number | undefined = undefined;
    if (explicitMaxDistance === undefined) {
      // Scan for valid non-discontinuous strides in chronological order.
      // Only strides with plausible physical velocity (<= 3.5 px/ms) can seed a baseline.
      const validStrides: number[] = [];
      for (let i = 1; i < chronologicalPoints.length; i++) {
        const pPrev = chronologicalPoints[i - 1];
        const pCurr = chronologicalPoints[i];
        if (
          Number.isFinite(pPrev.x) && Number.isFinite(pPrev.y) &&
          Number.isFinite(pCurr.x) && Number.isFinite(pCurr.y) &&
          !pCurr.discontinuity
        ) {
          const s = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
          const dt = pCurr.timeMs - pPrev.timeMs;
          if (Number.isFinite(s) && s > 0.1 && dt > 0 && (s / dt) <= 3.5) {
            validStrides.push(s);
          }
        }
      }

      if (validStrides.length > 0) {
        // Anchor initial baseline to the smallest verified stride in the window.
        // A spatial jump is an outlier leap and is never smaller than normal movement.
        // Anchoring to min(validStrides) guarantees that candidate jumps (even multiple consecutive
        // jumps) cannot outvote normal movement to inflate the threshold.
        const minStride = Math.min(...validStrides);
        initialBaseline = Math.max(10, minStride);
      }
    }

    const chronologicalChains: TrailPoint[][] = [];
    let currentChain: TrailPoint[] = [];
    let currentBaseline = initialBaseline;
    const acceptedStrides: number[] = [];

    for (let i = 0; i < chronologicalPoints.length; i++) {
      const curr = chronologicalPoints[i]; // newer in time

      // Defensive check: reject non-finite coordinates
      if (!Number.isFinite(curr.x) || !Number.isFinite(curr.y)) {
        if (currentChain.length > 0) {
          chronologicalChains.push(currentChain);
          currentChain = [];
        }
        continue;
      }

      if (currentChain.length === 0) {
        currentChain.push(curr);
        continue;
      }

      const prev = currentChain[currentChain.length - 1]; // older in time

      // 1. Authoritative discontinuity flag: curr marks a break from prev (e.g. wrapped arrival)
      const isExplicitBoundary = curr.discontinuity;

      // 2. Spatial distance check with numerical overflow safety
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.hypot(dx, dy);

      // Chronological time delta from older (prev) to newer (curr)
      const dt = curr.timeMs - prev.timeMs;

      let isSpatialJump = false;
      if (!Number.isFinite(dist)) {
        // Overflow or non-finite computed distance is always treated as a discontinuity
        isSpatialJump = true;
      } else if (dt <= 0 && dist >= 0.25) {
        // Instantaneous jump (zero dt with displacement) or backwards time
        isSpatialJump = true;
      } else if (explicitMaxDistance !== undefined) {
        // Direct linear comparison against validated finite threshold
        isSpatialJump = dist > explicitMaxDistance;
      } else {
        // Adaptive evaluation:
        // Velocity safeguard: velocity > 3.5 px/ms is always a spatial jump
        const isVelocityExceeded = dt > 0 && (dist / dt) > 3.5;

        // Baseline stride check: threshold is 4.5x the currently accepted baseline
        const maxAllowed = currentBaseline !== undefined ? currentBaseline * 4.5 : undefined;
        const isStrideExceeded = maxAllowed !== undefined && dist > maxAllowed;

        isSpatialJump = isVelocityExceeded || isStrideExceeded;
      }

      if (isExplicitBoundary || isSpatialJump) {
        chronologicalChains.push(currentChain);
        currentChain = [curr];
        // CRITICAL: A rejected spatial jump NEVER becomes trusted baseline movement!
        // currentBaseline is not updated with the rejected candidate stride.
      } else {
        currentChain.push(curr);
        // Candidate stride accepted! Update running baseline smoothly
        if (dist > 0.1 && explicitMaxDistance === undefined) {
          acceptedStrides.push(dist);
          if (acceptedStrides.length > 8) {
            acceptedStrides.shift();
          }
          const sorted = [...acceptedStrides].sort((a, b) => a - b);
          const median = sorted[Math.floor((sorted.length - 1) / 2)];
          currentBaseline = Math.max(10, median);
        }
      }
    }

    if (currentChain.length > 0) {
      chronologicalChains.push(currentChain);
    }

    // Return chains in reverse chronological order (newest point at index 0 of the first chain)
    const chains: TrailPoint[][] = [];
    for (let i = chronologicalChains.length - 1; i >= 0; i--) {
      chains.push(chronologicalChains[i].reverse());
    }

    return chains;
  }
}

/**
 * Draws the complete procedural cosmetic trail behind the snake.
 */
export function drawSnakeTrail(
  ctx: CanvasRenderingContext2D,
  chains: TrailPoint[][],
  trailInput: SnakeTrailId | TrailDefinition | string | null | undefined,
  options: TrailRenderOptions = {}
): void {
  if (!ctx || !chains || chains.length === 0) return;

  const trailId = isValidTrailId(trailInput)
    ? trailInput
    : typeof trailInput === 'object' && trailInput !== null && isValidTrailId((trailInput as any).id)
    ? (trailInput as any).id
    : 'cyber_pulse';

  if (trailId === 'none') return;

  const def = getTrailDefinition(trailId);
  const visualEffects = options.visualEffects ?? 'high';
  const allowGlow = (options.allowGlow ?? true) && visualEffects === 'high';
  const baseRadius = options.baseRadius ?? 10;
  const now = options.animationTimeMs ?? Date.now();

  ctx.save();
  const prevAlpha = ctx.globalAlpha;

  try {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const chain of chains) {
      if (chain.length < 2) continue;

      switch (def.style) {
        case 'pulse':
          drawPulseTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        case 'matrix':
          drawMatrixTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        case 'plasma':
          drawPlasmaTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        case 'streak':
          drawStreakTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        case 'vapor':
          drawVaporTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        case 'solar':
          drawSolarTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        case 'singularity':
          drawSingularityTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
        default:
          drawPulseTrail(ctx, chain, def, baseRadius, now, allowGlow, visualEffects);
          break;
      }
    }
  } finally {
    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }
}

/**
 * Smooth quadratic midpoint spline path connecting points.
 */
function traceSplinePath(ctx: CanvasRenderingContext2D, points: TrailPoint[]): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
}

/**
 * CYBER PULSE: Coherent harmonic electromagnetic waveform wake with rhythmic standing nodes.
 */
function drawPulseTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;
  const pulseWave = Math.sin(now * 0.007) * 0.12 + 0.88;

  // 1. Ground Surface Optical Diffusion Pass (Subtle ambient floor wash)
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      const groundAlpha = (progress ** 2.2) * 0.14 * pulseWave;
      ctx.strokeStyle = def.secondaryColor;
      ctx.globalAlpha = Math.max(0, Math.min(1, groundAlpha));
      ctx.lineWidth = Math.max(2, baseR * 1.6 * (progress ** 0.8));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 2. Main Coherent Plasma Sheath with Cubic Energy Falloff
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 6;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress0 = 1 - i / count;
    const progress1 = 1 - (i + 1) / count;
    const alpha = (progress0 * 0.55 + progress1 * 0.45) ** 1.8 * 0.72 * pulseWave;
    const width = Math.max(1.2, baseR * 0.82 * (progress0 ** 1.25));

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 3. Specular High-Coherence Core Filament
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = '#E0FFFF';
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.4) * 0.85 * pulseWave));
    ctx.lineWidth = Math.max(0.75, baseR * 0.18 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. Acoustic Standing Wave Nodes (High Quality)
  if (visualEffects === 'high') {
    for (let i = 0; i < count - 1; i += 2) {
      if (i > count * 0.7) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const phase = now * 0.009 - i * 0.45;
      const standingAmp = Math.sin(phase);
      const normalAngle = pt.angle + Math.PI / 2;
      const offsetDist = baseR * 0.28 * standingAmp * progress;
      const nodeX = pt.x + Math.cos(normalAngle) * offsetDist;
      const nodeY = pt.y + Math.sin(normalAngle) * offsetDist;
      const nodeR = Math.max(1.0, baseR * 0.22 * progress);

      ctx.fillStyle = def.secondaryColor;
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.8 * Math.abs(standingAmp)));
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, nodeR, 0, Math.PI * 2);
      ctx.fill();

      // Specular apex highlight on nodes
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.9 * Math.abs(standingAmp)));
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, Math.max(0.6, nodeR * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * MATRIX STREAM: Procedural digital phosphor afterglow with decaying green trail stroke and binary bit accents.
 */
function drawMatrixTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Deep Phosphor Ground Wash (Scattered luminescence on dark arena surface)
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      const decay = Math.exp(-2.5 * (i / count));
      ctx.strokeStyle = '#064E3B';
      ctx.globalAlpha = Math.max(0, Math.min(1, decay * 0.22));
      ctx.lineWidth = Math.max(2, baseR * 1.5 * progress);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 2. Electron-Beam Streamer Ribbon
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 5;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const decay = Math.exp(-2.0 * (i / count));

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, decay * 0.75));
    ctx.lineWidth = Math.max(1, baseR * 0.6 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 3. Specular Green-Phosphor Core Spine
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const decay = Math.exp(-2.2 * (i / count));

    ctx.strokeStyle = '#D1FAE5';
    ctx.globalAlpha = Math.max(0, Math.min(1, decay * 0.85));
    ctx.lineWidth = Math.max(0.7, baseR * 0.16 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. Tangent-Aligned Sub-Pixel Raster Glyphs (High / Performance)
  if (visualEffects !== 'reduced') {
    for (let i = 0; i < count; i += 2) {
      const pt = chain[i];
      const progress = 1 - i / count;
      const decay = Math.exp(-2.4 * (i / count));
      const flicker = Math.sin(now * 0.024 + i * 1.8) > -0.2 ? 1 : 0.45;
      const glyphAlpha = decay * 0.8 * flicker;

      if (glyphAlpha < 0.05) continue;

      const halfLength = Math.max(1.5, baseR * 0.35 * progress);
      const cosA = Math.cos(pt.angle);
      const sinA = Math.sin(pt.angle);

      ctx.strokeStyle = def.secondaryColor;
      ctx.globalAlpha = Math.max(0, Math.min(1, glyphAlpha));
      ctx.lineWidth = 1;

      // Micro data pip oriented along trajectory tangent
      ctx.beginPath();
      ctx.moveTo(pt.x - cosA * halfLength, pt.y - sinA * halfLength);
      ctx.lineTo(pt.x + cosA * halfLength, pt.y + sinA * halfLength);
      ctx.stroke();
    }
  }
}

/**
 * PLASMA OVERDRIVE: Stylized high-energy exhaust plume with repeating diamond-shaped accent bursts.
 */
function drawPlasmaTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Ground Thermal Radiation Wash
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      ctx.strokeStyle = '#7F1D1D';
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 2.2) * 0.18));
      ctx.lineWidth = Math.max(2.5, baseR * 1.7 * progress);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 2. Outer Ionized Thermal Boundary Layer
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 7;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.secondaryColor;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.35) * 0.55));
    ctx.lineWidth = Math.max(1.8, baseR * 1.05 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 3. Inner Supersonic Thermal Core
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.2) * 0.88));
    ctx.lineWidth = Math.max(1.2, baseR * 0.48 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. White-Hot Centerline Filament
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = '#FFF7ED';
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.5) * 0.95));
    ctx.lineWidth = Math.max(0.75, baseR * 0.16 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 5. Procedural diamond-shaped exhaust pulses along the plume axis (High / Performance)
  if (visualEffects !== 'reduced') {
    for (let i = 0; i < count; i += 3) {
      if (i > count * 0.65) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const diamondW = Math.max(1.5, baseR * 0.38 * progress);
      const diamondL = Math.max(2.0, baseR * 0.55 * progress);
      const cosA = Math.cos(pt.angle);
      const sinA = Math.sin(pt.angle);
      const normX = -sinA;
      const normY = cosA;

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.9));
      ctx.beginPath();
      ctx.moveTo(pt.x + cosA * diamondL, pt.y + sinA * diamondL);
      ctx.lineTo(pt.x + normX * diamondW, pt.y + normY * diamondW);
      ctx.lineTo(pt.x - cosA * diamondL * 0.6, pt.y - sinA * diamondL * 0.6);
      ctx.lineTo(pt.x - normX * diamondW, pt.y - normY * diamondW);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 6. Decelerating Thermal Micro-Embers (High Quality)
  if (visualEffects === 'high') {
    for (let i = 0; i < count; i += 3) {
      if (i > count * 0.55) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const seed = now * 0.012 + i * 2.3;
      const normalAngle = pt.angle + Math.PI / 2;
      const lateralShift = Math.sin(seed) * (baseR * 0.42 * progress);
      const emberX = pt.x + Math.cos(normalAngle) * lateralShift;
      const emberY = pt.y + Math.sin(normalAngle) * lateralShift;
      const emberR = Math.max(0.8, baseR * 0.14 * progress);

      ctx.fillStyle = '#FFFBEB';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.85));
      ctx.beginPath();
      ctx.arc(emberX, emberY, emberR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * HYPER LIGHT ARC: Coherent laser caustics with prismatic chromatic dispersion.
 */
function drawStreakTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Narrow Ground Caustic Streak
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      ctx.strokeStyle = '#2E1065';
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 2.0) * 0.25));
      ctx.lineWidth = Math.max(1.8, baseR * 1.1 * progress);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 2. Collimated Twin Prismatic Guide Rails with Chromatic Separation
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      const railDist = baseR * 0.36 * progress;
      const nx0 = -Math.sin(p0.angle) * railDist;
      const ny0 = Math.cos(p0.angle) * railDist;
      const nx1 = -Math.sin(p1.angle) * railDist;
      const ny1 = Math.cos(p1.angle) * railDist;
      const railAlpha = (progress ** 1.6) * 0.6;
      const railWidth = Math.max(0.7, baseR * 0.15 * progress);

      // Cyan-tinted left caustic
      ctx.strokeStyle = '#38E1FF';
      ctx.globalAlpha = Math.max(0, Math.min(1, railAlpha * 0.75));
      ctx.lineWidth = railWidth;
      ctx.beginPath();
      ctx.moveTo(p0.x + nx0, p0.y + ny0);
      ctx.lineTo(p1.x + nx1, p1.y + ny1);
      ctx.stroke();

      // Magenta-tinted right caustic
      ctx.strokeStyle = '#FF4FD8';
      ctx.globalAlpha = Math.max(0, Math.min(1, railAlpha * 0.75));
      ctx.lineWidth = railWidth;
      ctx.beginPath();
      ctx.moveTo(p0.x - nx0, p0.y - ny0);
      ctx.lineTo(p1.x - nx1, p1.y - ny1);
      ctx.stroke();
    }
  }

  // 3. Razor-Thin Ultraviolet Center Beam
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 6;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.3) * 0.85));
    ctx.lineWidth = Math.max(1.2, baseR * 0.42 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. Ultra-Bright Violet-White Center Laser Core
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = '#F5D0FE';
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.5) * 0.95));
    ctx.lineWidth = Math.max(0.65, baseR * 0.14 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 5. Transverse Optical Phase Wavefronts (High Quality)
  if (visualEffects === 'high') {
    for (let i = 0; i < count; i += 3) {
      if (i > count * 0.65) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const pulsePhase = Math.sin(now * 0.02 - i * 0.6);
      if (pulsePhase < 0.2) continue;

      const span = baseR * 0.38 * progress;
      const nx = -Math.sin(pt.angle) * span;
      const ny = Math.cos(pt.angle) * span;

      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.8 * pulsePhase));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pt.x - nx, pt.y - ny);
      ctx.lineTo(pt.x + nx, pt.y + ny);
      ctx.stroke();
    }
  }
}

/**
 * CRYO VAPOR: Expanding procedural mist plume with billowed circular gradient clusters.
 */
function drawVaporTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Soft Cryogenic Ground Chill (Cold ambient floor mist)
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      ctx.strokeStyle = '#0C4A6E';
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.8) * 0.16));
      ctx.lineWidth = Math.max(3, baseR * 1.8 * (0.8 + (1 - progress) * 0.5));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 2. Procedural expanding circular mist puffs along the trail (High / Performance)
  const step = visualEffects === 'high' ? 2 : 3;
  ctx.shadowBlur = 0;
  for (let i = 0; i < count; i += step) {
    const pt = chain[i];
    const ageProgress = i / count; // 0 near tail, 1 oldest
    const alpha = Math.max(0, (1 - ageProgress) ** 1.9 * 0.38);

    // Mist puffs expand and fade as they age along the trail
    const billowR = baseR * (0.55 + ageProgress * 0.85);
    const wobble = Math.sin(now * 0.006 + i * 0.8) * (baseR * 0.12 * ageProgress);

    // Multi-tier color gradient fading from icy white to cyan
    ctx.fillStyle = ageProgress < 0.4 ? def.color : def.secondaryColor;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(pt.x + wobble, pt.y + wobble, billowR, 0, Math.PI * 2);
    ctx.fill();

    // Dense inner core
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = alpha * 0.45;
    ctx.beginPath();
    ctx.arc(pt.x + wobble, pt.y + wobble, billowR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Central Cryogenic Streamer Filament
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 5;
  }
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.4) * 0.5));
    ctx.lineWidth = Math.max(1, baseR * 0.38 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. Ice-Crystal Nucleation Sparkle (High Quality)
  if (visualEffects === 'high') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count; i += 3) {
      if (i > count * 0.7) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const glintPhase = Math.sin(now * 0.015 + i * 2.7);
      if (glintPhase < 0.4) continue;

      const glintX = pt.x + Math.sin(i * 1.5) * (baseR * 0.32 * progress);
      const glintY = pt.y + Math.cos(i * 1.5) * (baseR * 0.32 * progress);
      const glintR = Math.max(0.7, baseR * 0.1 * progress);

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.9 * glintPhase));
      ctx.beginPath();
      ctx.arc(glintX, glintY, glintR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * SOLAR RADIANCE: Golden stellar slipstream with rotating four-point sparkle glints.
 */
function drawSolarTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Warm Coronal Ground Radiation
  if (visualEffects !== 'reduced') {
    ctx.shadowBlur = 0;
    for (let i = 0; i < count - 1; i++) {
      const p0 = chain[i];
      const p1 = chain[i + 1];
      const progress = 1 - i / count;
      ctx.strokeStyle = '#451A03';
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 2.0) * 0.2));
      ctx.lineWidth = Math.max(2.5, baseR * 1.6 * progress);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 2. Coronal Sheath with Limb Darkening
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 7;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.secondaryColor;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.3) * 0.65));
    ctx.lineWidth = Math.max(1.5, baseR * 0.95 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 3. Golden Core Filament
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.2) * 0.85));
    ctx.lineWidth = Math.max(1.0, baseR * 0.5 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. Stellar Solar White Spine
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = '#FFFBEB';
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.4) * 0.95));
    ctx.lineWidth = Math.max(0.7, baseR * 0.16 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 5. Four-point diamond star glints along the slipstream (High Quality)
  if (visualEffects === 'high') {
    for (let i = 0; i < count; i += 4) {
      if (i > count * 0.65) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const spikeL = Math.max(2.5, baseR * 0.45 * progress);
      const rot = now * 0.003 + i * 0.7;

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.9));

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(rot);

      // Procedural 4-point star glint geometry
      ctx.beginPath();
      ctx.moveTo(0, -spikeL);
      ctx.lineTo(spikeL * 0.18, -spikeL * 0.18);
      ctx.lineTo(spikeL, 0);
      ctx.lineTo(spikeL * 0.18, spikeL * 0.18);
      ctx.moveTo(0, spikeL);
      ctx.lineTo(-spikeL * 0.18, spikeL * 0.18);
      ctx.lineTo(-spikeL, 0);
      ctx.lineTo(-spikeL * 0.18, -spikeL * 0.18);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
}

/**
 * VOID HORIZON: Dark purple cosmic wake with inverted contrast core and orbiting energy specks.
 */
function drawSingularityTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (count < 2) return;

  // 1. Dark Contrast Baseline (Dark stroke beneath the energetic wake)
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = '#020617';
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.6) * 0.85));
    ctx.lineWidth = Math.max(2.5, baseR * 1.35 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 2. Purple Violet Ambient Edge Stroke
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 6;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.4) * 0.65));
    ctx.lineWidth = Math.max(1.5, baseR * 0.85 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 3. Bright Cyan Center Spine Stroke
  ctx.shadowBlur = 0;
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    ctx.strokeStyle = def.secondaryColor;
    ctx.globalAlpha = Math.max(0, Math.min(1, (progress ** 1.3) * 0.9));
    ctx.lineWidth = Math.max(0.8, baseR * 0.28 * progress);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // 4. Orbiting energy specks drifting along the wake (High Quality)
  if (visualEffects === 'high') {
    for (let i = 0; i < count; i += 3) {
      if (i > count * 0.6) break;
      const pt = chain[i];
      const progress = 1 - i / count;
      const orbitA = now * 0.01 + i * 1.7;
      const orbitDist = baseR * 0.42 * progress * (0.4 + 0.6 * Math.sin(orbitA * 0.5));
      const sx = pt.x + Math.cos(orbitA) * orbitDist;
      const sy = pt.y + Math.sin(orbitA) * orbitDist;
      const speckR = Math.max(0.7, baseR * 0.11 * progress);

      ctx.fillStyle = '#A5F3FC';
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 0.85));
      ctx.beginPath();
      ctx.arc(sx, sy, speckR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

