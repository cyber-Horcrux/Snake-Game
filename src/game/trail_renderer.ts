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

  constructor(maxAgeMs: number = DEFAULT_TRAIL_LIFETIME_MS) {
    this.maxAgeMs = maxAgeMs;
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

  /**
   * Adds a new tail sample point.
   */
  public addPoint(
    x: number,
    y: number,
    timeMs: number,
    angle: number,
    discontinuity: boolean = false
  ): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    if (this.count > 0) {
      const newest = this.buffer[this.head];
      // Skip redundant samples if very close in position and time
      const distSq = (x - newest.x) ** 2 + (y - newest.y) ** 2;
      if (distSq < 0.25 && timeMs - newest.timeMs < 14) {
        return;
      }
    }

    this.head = (this.head + 1) % MAX_TRAIL_POINTS;
    const pt = this.buffer[this.head];
    pt.x = x;
    pt.y = y;
    pt.timeMs = timeMs;
    pt.angle = angle;
    pt.discontinuity = discontinuity;

    if (this.count < MAX_TRAIL_POINTS) {
      this.count++;
    }
  }

  /**
  /**
   * Prunes expired points and extracts active chains separated by discontinuities.
   * Returns chains in chronological order (newest point at index 0 of the first chain).
   * 
   * Discontinuity handling:
   * - Authoritative `discontinuity` flag (e.g. Zen mode wrap supplied by renderer) is primary.
   * - An optional `maxLinkDistance` may be supplied by the caller (appropriate to current coordinate system/cell size).
   * - If no `maxLinkDistance` is provided, a safe coordinate fallback is used so normal continuous movement
   *   is never fragmented across large canvases.
   */
  public getChains(currentTimeMs: number, maxLinkDistance?: number): TrailPoint[][] {
    if (this.count === 0) return [];

    const activePoints: TrailPoint[] = [];
    const minTime = currentTimeMs - this.maxAgeMs;

    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - i + MAX_TRAIL_POINTS) % MAX_TRAIL_POINTS;
      const pt = this.buffer[idx];
      if (pt.timeMs < minTime) {
        // Since points are ordered newest to oldest, remaining points are also expired
        this.count = i;
        break;
      }
      activePoints.push(pt);
    }

    if (activePoints.length === 0) return [];

    // Split into continuous chains on authoritative discontinuity flags or genuine spatial jumps
    const chains: TrailPoint[][] = [];
    let currentChain: TrailPoint[] = [activePoints[0]];

    const maxDistSq = maxLinkDistance !== undefined && maxLinkDistance > 0
      ? maxLinkDistance * maxLinkDistance
      : undefined;

    for (let i = 1; i < activePoints.length; i++) {
      const prev = activePoints[i - 1];
      const curr = activePoints[i];

      // Since activePoints is newest-to-oldest, if prev was flagged discontinuous upon insertion,
      // it marks the boundary between the wrapped point and its older predecessor.
      const distSq = (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2;
      const isDiscontinuous = prev.discontinuity || (maxDistSq !== undefined ? distSq > maxDistSq : distSq > 250000);

      if (isDiscontinuous) {
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

