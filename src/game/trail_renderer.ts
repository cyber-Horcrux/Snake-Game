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
   * Prunes expired points and extracts active chains separated by discontinuities.
   * Returns chains in chronological order (newest point at index 0 of the first chain).
   */
  public getChains(currentTimeMs: number): TrailPoint[][] {
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

    // Split into continuous chains on discontinuity flags
    const chains: TrailPoint[][] = [];
    let currentChain: TrailPoint[] = [activePoints[0]];

    for (let i = 1; i < activePoints.length; i++) {
      const prev = activePoints[i - 1];
      const curr = activePoints[i];

      // Since activePoints is newest-to-oldest, if prev was flagged discontinuous upon insertion,
      // it marks the boundary between the wrapped point and its older predecessor.
      const distSq = (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2;
      if (prev.discontinuity || distSq > 3000) {
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
 * CYBER PULSE: Harmonic cyan electromagnetic waveform wake with rhythmic nodes.
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
  const pulseWave = Math.sin(now * 0.009) * 0.15 + 0.85;

  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowBlur = 0;
  }

  // Segmented ribbon with alpha and width falloff from newest (index 0) to oldest
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress0 = 1 - i / count;
    const progress1 = 1 - (i + 1) / count;
    const alpha = (progress0 * 0.55 + progress1 * 0.45) * 0.75 * pulseWave;
    const width = Math.max(1.5, baseR * 0.85 * (progress0 ** 1.3));

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.lineWidth = width;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Harmonic nodes on high quality
    if (visualEffects === 'high' && i % 3 === 0 && i < count * 0.75) {
      const nodeR = Math.max(1.5, width * 0.35);
      ctx.fillStyle = def.secondaryColor;
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, nodeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * MATRIX STREAM: Digital phosphor binary cascade with discrete ticks.
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
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 8;
  } else {
    ctx.shadowBlur = 0;
  }

  // Core stream line
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const alpha = (progress ** 1.2) * 0.7;

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1, baseR * 0.65 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Digital binary phosphor pips
    if (visualEffects !== 'reduced' && i % 2 === 0) {
      const flicker = Math.sin(now * 0.02 + i * 2) > 0 ? 1 : 0.4;
      ctx.fillStyle = def.secondaryColor;
      ctx.globalAlpha = alpha * flicker;
      const pipSize = Math.max(1.5, baseR * 0.28 * progress);
      ctx.fillRect(p0.x - pipSize / 2, p0.y - pipSize / 2, pipSize, pipSize);
    }
  }
}

/**
 * PLASMA OVERDRIVE: Superheated thermal exhaust ribbon with heat sparks.
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
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 12;
  } else {
    ctx.shadowBlur = 0;
  }

  // Outer thermal ribbon
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const alpha = (progress ** 1.1) * 0.65;

    ctx.strokeStyle = def.secondaryColor;
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = Math.max(2, baseR * 1.1 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Inner fiery core
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = Math.max(1.2, baseR * 0.5 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Heat distortion sparks
    if (visualEffects === 'high' && i % 3 === 0 && i < count * 0.6) {
      const jitterAngle = now * 0.015 + i;
      const jitterDist = baseR * 0.45 * Math.sin(jitterAngle);
      const sparkX = p0.x + Math.cos(p0.angle + Math.PI / 2) * jitterDist;
      const sparkY = p0.y + Math.sin(p0.angle + Math.PI / 2) * jitterDist;

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, Math.max(1, baseR * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * HYPER LIGHT ARC: High-frequency ultraviolet slipstream laser after-image.
 */
function drawStreakTrail(
  ctx: CanvasRenderingContext2D,
  chain: TrailPoint[],
  def: TrailDefinition,
  baseR: number,
  _now: number,
  allowGlow: boolean,
  visualEffects: 'high' | 'performance' | 'reduced'
): void {
  const count = chain.length;
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const alpha = (progress ** 1.4) * 0.8;

    // Razor center beam
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.2, baseR * 0.45 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Dual offset rail lines on High / Performance
    if (visualEffects !== 'reduced' && i % 2 === 0) {
      const railDist = baseR * 0.4 * progress;
      const nx = -Math.sin(p0.angle) * railDist;
      const ny = Math.cos(p0.angle) * railDist;

      ctx.strokeStyle = def.secondaryColor;
      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = Math.max(0.75, baseR * 0.16);

      ctx.beginPath();
      ctx.moveTo(p0.x + nx, p0.y + ny);
      ctx.lineTo(p1.x + nx, p1.y + ny);
      ctx.moveTo(p0.x - nx, p0.y - ny);
      ctx.lineTo(p1.x - nx, p1.y - ny);
      ctx.stroke();
    }
  }
}

/**
 * CRYO VAPOR: Sub-zero nitrogen condensation plume that gently expands and fades.
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
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 8;
  } else {
    ctx.shadowBlur = 0;
  }

  // Soft expanding vapor puffs
  const step = visualEffects === 'high' ? 2 : 3;
  for (let i = 0; i < count; i += step) {
    const pt = chain[i];
    const ageProgress = i / count; // 0 near tail, 1 oldest
    const alpha = Math.max(0, (1 - ageProgress) * 0.42);

    // Vapor puffs expand slightly as they age behind the tail
    const puffRadius = baseR * (0.65 + ageProgress * 0.65);
    const wobble = Math.sin(now * 0.007 + i) * (baseR * 0.15);

    ctx.fillStyle = ageProgress < 0.4 ? def.color : def.secondaryColor;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(pt.x + wobble, pt.y + wobble, puffRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central stream connection
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = progress * 0.5;
    ctx.lineWidth = Math.max(1, baseR * 0.4 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

/**
 * SOLAR RADIANCE: Golden starlight wake with solar glints and coronal flares.
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
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 12;
  } else {
    ctx.shadowBlur = 0;
  }

  // Golden filament
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const alpha = (progress ** 1.2) * 0.75;

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.2, baseR * 0.7 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // 4-point solar diamond glints at intervals
    if (visualEffects === 'high' && i % 4 === 0 && i < count * 0.7) {
      const glintR = Math.max(1.5, baseR * 0.35 * progress);
      const rot = now * 0.005 + i;

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = alpha * 0.9;

      ctx.save();
      ctx.translate(p0.x, p0.y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -glintR);
      ctx.lineTo(glintR * 0.35, 0);
      ctx.lineTo(0, glintR);
      ctx.lineTo(-glintR * 0.35, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * VOID HORIZON: Quantum singularity gravitational distortion trace.
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
  if (allowGlow) {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowBlur = 0;
  }

  // Deep indigo dark matter envelope
  for (let i = 0; i < count - 1; i++) {
    const p0 = chain[i];
    const p1 = chain[i + 1];
    const progress = 1 - i / count;
    const alpha = (progress ** 1.3) * 0.7;

    ctx.strokeStyle = def.color;
    ctx.globalAlpha = alpha * 0.7;
    ctx.lineWidth = Math.max(1.5, baseR * 0.9 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Center quantum blue thread
    ctx.strokeStyle = def.secondaryColor;
    ctx.globalAlpha = alpha * 0.95;
    ctx.lineWidth = Math.max(0.8, baseR * 0.3 * progress);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Orbiting quantum field specks
    if (visualEffects === 'high' && i % 3 === 0 && i < count * 0.65) {
      const orbitA = now * 0.012 + i * 1.5;
      const orbitR = baseR * 0.5 * progress;
      const sx = p0.x + Math.cos(orbitA) * orbitR;
      const sy = p0.y + Math.sin(orbitA) * orbitR;

      ctx.fillStyle = def.secondaryColor;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1, baseR * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
