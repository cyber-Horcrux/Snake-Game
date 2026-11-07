/**
 * Canvas 2D Neon Renderer and Pooled Particle System
 * Designed for 60fps performance with smooth visual interpolation,
 * zero-GC particle ring buffer, and headless software rendering compatibility.
 */
import type { GameEngineState, GridCoord, FoodItem, SnakeSkinId, SnakeSkin, Obstacle, WarpGate } from './types.ts';
import { SKINS } from './constants.ts';
import { drawNaturalStylizedSnake } from './snake_renderer.ts';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 150;

export class ParticlePool {
  public particles: Particle[];

  constructor() {
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#43F5FF',
    }));
  }

  public spawn(
    x: number,
    y: number,
    color: string,
    count: number = 8,
    speed: number = 120,
    size: number = 3
  ): void {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const velocity = (Math.random() * 0.7 + 0.3) * speed;
        p.vx = Math.cos(angle) * velocity;
        p.vy = Math.sin(angle) * velocity;
        p.maxLife = Math.random() * 0.4 + 0.3;
        p.life = p.maxLife;
        p.size = Math.random() * size + 1.5;
        p.color = color;
        spawned++;
      }
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94; // friction
          p.vy *= 0.94;
        }
      }
    }
  }

  public reset(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
    }
  }
}

export class NeonRenderer {
  public particles = new ParticlePool();
  private shakeTime = 0;
  private shakeMagnitude = 0;
  private lastObstacleMap = new Map<string, { x: number; y: number; type: string }>();
  private lastWarpGateActive = false;

  public triggerScreenShake(magnitude: number = 8, duration: number = 0.25): void {
    this.shakeMagnitude = magnitude;
    this.shakeTime = duration;
  }

  public reset(): void {
    this.particles.reset();
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.lastObstacleMap.clear();
    this.lastWarpGateActive = false;
  }

  public spawnBarrierShatter(x: number, y: number): void {
    this.particles.spawn(x, y, '#43F5FF', 14, 180, 3.5);
    this.particles.spawn(x, y, '#9865FF', 10, 160, 3.0);
    this.particles.spawn(x, y, '#FFFFFF', 6, 200, 2.5);
  }

  public spawnHazardAbsorb(x: number, y: number): void {
    this.particles.spawn(x, y, '#FF2E93', 14, 170, 3.5);
    this.particles.spawn(x, y, '#FFFFFF', 6, 190, 2.5);
  }

  public spawnShieldFlash(x: number, y: number): void {
    this.particles.spawn(x, y, '#9865FF', 16, 200, 4.0);
    this.particles.spawn(x, y, '#FFFFFF', 8, 220, 3.0);
  }

  public spawnWarpGateActivation(x: number, y: number): void {
    this.particles.spawn(x, y, '#43F5FF', 18, 190, 4.0);
    this.particles.spawn(x, y, '#9865FF', 14, 150, 3.5);
    this.particles.spawn(x, y, '#FFFFFF', 8, 220, 3.0);
  }

  public spawnWarpEntry(x: number, y: number): void {
    this.particles.spawn(x, y, '#43F5FF', 24, 240, 4.5);
    this.particles.spawn(x, y, '#9865FF', 18, 210, 4.0);
    this.particles.spawn(x, y, '#39FF14', 12, 180, 3.5);
    this.triggerScreenShake(10, 0.35);
  }

  public update(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }
    this.particles.update(dt);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameEngineState,
    alpha: number,
    settings: { visualEffects: 'high' | 'performance' | 'reduced'; skin?: SnakeSkinId },
    frameTimeMs?: number
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Headless / Software rendering detection
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
    const allowGlow = settings.visualEffects === 'high' && !isHeadless;
    const allowShake = settings.visualEffects !== 'reduced';

    // Screen Shake Offset
    if (allowShake && this.shakeTime > 0) {
      const trauma = this.shakeTime / 0.25;
      const offsetX = (Math.random() * 2 - 1) * this.shakeMagnitude * trauma;
      const offsetY = (Math.random() * 2 - 1) * this.shakeMagnitude * trauma;
      ctx.translate(offsetX, offsetY);
    }

    const cellW = width / state.gridWidth;
    const cellH = height / state.gridHeight;
    const now = Number.isFinite(frameTimeMs) ? (frameTimeMs as number) : Date.now();

    // 1. Cyber Grid
    this.drawGrid(ctx, width, height, state.gridWidth, state.gridHeight, cellW, cellH, allowGlow);

    // 1.5 Maze Mode Rendering: Obstacles & Warp Gate (only in Maze mode)
    if (state.mode === 'maze') {
      this.detectObstacleTransitions(state, cellW, cellH);

      if (state.obstacles && state.obstacles.length > 0) {
        this.drawObstacles(ctx, state.obstacles, cellW, cellH, now, allowGlow, settings.visualEffects);
      }

      if (state.warpGate) {
        this.drawWarpGate(ctx, state.warpGate, cellW, cellH, now, allowGlow, settings.visualEffects);
      }
    } else {
      if (this.lastObstacleMap.size > 0) {
        this.lastObstacleMap.clear();
      }
      this.lastWarpGateActive = false;
    }

    // 2. Food & Power-ups
    for (const item of state.food) {
      this.drawFoodItem(ctx, item, cellW, cellH, now, allowGlow);
    }

    // 3. Snake Body & Head (Smoothly Interpolated using selected skin)
    const skinConfig = SKINS[settings.skin || 'cyber_cyan'] || SKINS.cyber_cyan;
    this.drawSnake(ctx, state, alpha, cellW, cellH, allowGlow, settings.visualEffects, skinConfig, now);

    // 4. Particles
    this.drawParticles(ctx, allowGlow);

    ctx.restore();
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    gridW: number,
    gridH: number,
    cellW: number,
    cellH: number,
    allowGlow: boolean
  ): void {
    // Arena Border
    ctx.strokeStyle = '#43F5FF';
    ctx.lineWidth = 2;
    if (allowGlow) {
      ctx.shadowColor = '#43F5FF';
      ctx.shadowBlur = 12;
    }
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Corner Accents
    const cornerSize = Math.min(cellW, cellH) * 1.5;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9865FF';
    if (allowGlow) {
      ctx.shadowColor = '#9865FF';
      ctx.shadowBlur = 10;
    }

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(0, cornerSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - cornerSize, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, cornerSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(0, h - cornerSize);
    ctx.lineTo(0, h);
    ctx.lineTo(cornerSize, h);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - cornerSize, h);
    ctx.lineTo(w, h);
    ctx.lineTo(w, h - cornerSize);
    ctx.stroke();

    // Inner Subtle Grid Lines
    ctx.shadowBlur = 0;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(67, 245, 255, 0.05)';
    ctx.beginPath();
    for (let x = 1; x < gridW; x++) {
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, h);
    }
    for (let y = 1; y < gridH; y++) {
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(w, y * cellH);
    }
    ctx.stroke();
  }

  private drawFoodItem(
    ctx: CanvasRenderingContext2D,
    item: FoodItem,
    cellW: number,
    cellH: number,
    now: number,
    allowGlow: boolean
  ): void {
    const cx = item.position.x * cellW + cellW / 2;
    const cy = item.position.y * cellH + cellH / 2;
    const pulse = Math.sin(now * 0.008) * 0.15 + 0.85;
    const baseRadius = (Math.min(cellW, cellH) / 2) * 0.72;
    const r = baseRadius * pulse;

    ctx.save();

    if (item.type === 'normal') {
      // Glowing Neon Cyber Core
      if (allowGlow) {
        ctx.shadowColor = '#39FF14';
        ctx.shadowBlur = 16;
      }

      // Outer ring
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();

      // Core orb
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.4, '#39FF14');
      grad.addColorStop(1, '#1A8A0B');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'bonus') {
      // Pulsing Star / Super Food
      if (allowGlow) {
        ctx.shadowColor = '#FF4FD8';
        ctx.shadowBlur = 20;
      }

      // Countdown Ring
      if (item.expiresAt && item.totalDurationMs) {
        const remaining = Math.max(0, item.expiresAt - now);
        const fraction = remaining / item.totalDurationMs;
        ctx.strokeStyle = '#FF4FD8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
        ctx.stroke();
      }

      // Star Core
      ctx.fillStyle = '#FF4FD8';
      this.drawStar(ctx, cx, cy, 5, r * 1.1, r * 0.55);
      ctx.fill();

      // Inner sparkle
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'powerup_slow') {
      // Chrono Shift Power-Up (Cyan Diamond Clock)
      if (allowGlow) {
        ctx.shadowColor = '#43F5FF';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = 'rgba(67, 245, 255, 0.2)';
      ctx.strokeStyle = '#43F5FF';
      ctx.lineWidth = 2;

      // Diamond
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.2);
      ctx.lineTo(cx + r * 1.2, cy);
      ctx.lineTo(cx, cy + r * 1.2);
      ctx.lineTo(cx - r * 1.2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Clock hands
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - r * 0.65);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * 0.5, cy);
      ctx.stroke();
    } else if (item.type === 'powerup_shield') {
      // Aegis Shield Power-Up (Purple Hexagon)
      if (allowGlow) {
        ctx.shadowColor = '#9865FF';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = 'rgba(152, 101, 255, 0.25)';
      ctx.strokeStyle = '#9865FF';
      ctx.lineWidth = 2;

      // Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = cx + Math.cos(a) * r * 1.2;
        const hy = cy + Math.sin(a) * r * 1.2;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner shield icon
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawSnake(
    ctx: CanvasRenderingContext2D,
    state: GameEngineState,
    alpha: number,
    cellW: number,
    cellH: number,
    allowGlow: boolean,
    visualEffects: string,
    skin: SnakeSkin,
    now: number = Date.now()
  ): void {
    if (state.snake.length === 0) return;

    const interpolatedPoints: { x: number; y: number }[] = [];
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    for (let i = 0; i < state.snake.length; i++) {
      const curr = state.snake[i];
      const prev = state.prevSnake[i] || curr;

      // Check for wraparound discontinuity in Zen mode
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;

      let ix = curr.x;
      let iy = curr.y;

      // Only interpolate if within normal neighbor distance (not wrapped)
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        ix = prev.x + dx * clampedAlpha;
        iy = prev.y + dy * clampedAlpha;
      }

      interpolatedPoints.push({
        x: ix * cellW + cellW / 2,
        y: iy * cellH + cellH / 2,
      });
    }

    // 1. Draw Slow-Mo Trail if active
    if (state.powerUps.slowMoUntil > now && visualEffects !== 'reduced') {
      ctx.save();
      ctx.strokeStyle = 'rgba(67, 245, 255, 0.2)';
      ctx.lineWidth = Math.min(cellW, cellH) * 0.9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < interpolatedPoints.length; i++) {
        const pt = interpolatedPoints[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Natural Stylized Snake using shared renderer
    drawNaturalStylizedSnake(ctx, interpolatedPoints, {
      direction: state.direction,
      skin,
      cellW,
      cellH,
      allowGlow,
      visualEffects: (visualEffects as 'high' | 'performance' | 'reduced') || 'high',
      hasShield: state.powerUps.hasShield,
      animationTimeMs: now,
    });
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerR: number,
    innerR: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, allowGlow: boolean): void {
    ctx.save();
    for (const p of this.particles.particles) {
      if (p.active) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (allowGlow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private detectObstacleTransitions(state: GameEngineState, cellW: number, cellH: number): void {
    if (!state.obstacles) return;

    const currentMap = new Map<string, { x: number; y: number; type: string }>();
    for (const ob of state.obstacles) {
      currentMap.set(ob.id, { x: ob.x, y: ob.y, type: ob.type });
    }

    // Check if any obstacle that was in lastObstacleMap has disappeared (e.g. shattered or absorbed)
    if (this.lastObstacleMap.size > 0 && currentMap.size < this.lastObstacleMap.size) {
      for (const [id, oldOb] of this.lastObstacleMap.entries()) {
        if (!currentMap.has(id)) {
          const px = oldOb.x * cellW + cellW / 2;
          const py = oldOb.y * cellH + cellH / 2;
          if (oldOb.type === 'barrier') {
            this.spawnBarrierShatter(px, py);
            this.triggerScreenShake(7, 0.22);
          } else if (oldOb.type === 'hazard') {
            this.spawnHazardAbsorb(px, py);
            this.triggerScreenShake(6, 0.2);
          }
        }
      }
    }

    // Check Warp Gate activation
    if (state.warpGate) {
      if (state.warpGate.active && !this.lastWarpGateActive) {
        const gx = state.warpGate.x * cellW + cellW / 2;
        const gy = state.warpGate.y * cellH + cellH / 2;
        this.spawnWarpGateActivation(gx, gy);
        this.triggerScreenShake(6, 0.25);
      }
      this.lastWarpGateActive = state.warpGate.active;
    }

    this.lastObstacleMap = currentMap;
  }

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    obstacles: Obstacle[],
    cellW: number,
    cellH: number,
    now: number,
    allowGlow: boolean,
    visualEffects: string
  ): void {
    ctx.save();

    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const pad = Math.max(1, Math.min(cellW, cellH) * 0.05);
      const rx = ob.x * cellW + pad;
      const ry = ob.y * cellH + pad;
      const rw = cellW - pad * 2;
      const rh = cellH - pad * 2;
      const cx = ob.x * cellW + cellW / 2;
      const cy = ob.y * cellH + cellH / 2;

      if (ob.type === 'wall') {
        // ----------------------------------------
        // INDESTRUCTIBLE WALL: Solid dark obsidian with cyan edge illumination & depth bevel
        // ----------------------------------------
        const wallGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
        wallGrad.addColorStop(0, '#151E30');
        wallGrad.addColorStop(0.5, '#0C1322');
        wallGrad.addColorStop(1, '#060A14');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(rx, ry, rw, rh);

        // Dimensional depth: Top & Left bright bevel
        ctx.strokeStyle = 'rgba(67, 245, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx, ry + rh);
        ctx.lineTo(rx, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.stroke();

        // Bottom & Right dark shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.moveTo(rx + rw, ry);
        ctx.lineTo(rx + rw, ry + rh);
        ctx.lineTo(rx, ry + rh);
        ctx.stroke();

        // Perimeter neon cyan illumination
        ctx.strokeStyle = '#43F5FF';
        ctx.lineWidth = 1.5;
        if (allowGlow) {
          ctx.shadowColor = '#43F5FF';
          ctx.shadowBlur = 6;
        }
        ctx.strokeRect(rx, ry, rw, rh);

        // Cybernetic micro-core accent in wall center
        const dotSize = Math.max(2, Math.min(cellW, cellH) * 0.14);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(67, 245, 255, 0.35)';
        ctx.fillRect(cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize);
      } else if (ob.type === 'barrier') {
        // ----------------------------------------
        // DESTRUCTIBLE BARRIER: Luminous cyan/purple energy field with fracture lattice
        // ----------------------------------------
        const pulse = Math.sin(now * 0.006 + ob.x * 0.8 + ob.y * 0.8) * 0.15 + 0.85;

        // Translucent energy field fill
        ctx.fillStyle = `rgba(152, 101, 255, ${0.22 * pulse})`;
        ctx.fillRect(rx, ry, rw, rh);

        // Glowing boundary stroke
        ctx.strokeStyle = '#9865FF';
        ctx.lineWidth = 2;
        if (allowGlow) {
          ctx.shadowColor = '#43F5FF';
          ctx.shadowBlur = 10;
        }
        ctx.strokeRect(rx, ry, rw, rh);

        // Energy fracture lattice
        ctx.strokeStyle = `rgba(67, 245, 255, ${0.75 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Diagonal cross
        ctx.moveTo(rx, ry + rh * 0.5);
        ctx.lineTo(rx + rw * 0.5, ry);
        ctx.moveTo(rx + rw * 0.5, ry + rh);
        ctx.lineTo(rx + rw, ry + rh * 0.5);
        // Inner breakable diamond
        ctx.moveTo(cx, ry + rh * 0.25);
        ctx.lineTo(rx + rw * 0.75, cy);
        ctx.lineTo(cx, ry + rh * 0.75);
        ctx.lineTo(rx + rw * 0.25, cy);
        ctx.closePath();
        ctx.stroke();

        // Pulsing white center core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.12 * pulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (ob.type === 'hazard') {
        // ----------------------------------------
        // HAZARD: Dangerous pulsing magenta/red energy warning node
        // ----------------------------------------
        const pulse = Math.sin(now * 0.009 + (ob.x * 3 + ob.y * 5)) * 0.15 + 0.85;
        const baseR = (Math.min(cellW, cellH) / 2) * 0.78;
        const r = baseR * pulse;

        if (allowGlow) {
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 14;
        }

        // Rotating 4-point warning hazard star
        const rot = (now * 0.0025 + ob.x) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        ctx.strokeStyle = '#FF2E93';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
        ctx.beginPath();
        const outer = r * 1.15;
        const inner = r * 0.45;
        for (let s = 0; s < 4; s++) {
          const a = (s * Math.PI) / 2;
          const aMid = a + Math.PI / 4;
          if (s === 0) ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
          else ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
          ctx.lineTo(Math.cos(aMid) * inner, Math.sin(aMid) * inner);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Glowing danger warning core
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, '#FF2E93');
        coreGrad.addColorStop(1, '#990033');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawWarpGate(
    ctx: CanvasRenderingContext2D,
    warpGate: WarpGate,
    cellW: number,
    cellH: number,
    now: number,
    allowGlow: boolean,
    visualEffects: string
  ): void {
    const cx = warpGate.x * cellW + cellW / 2;
    const cy = warpGate.y * cellH + cellH / 2;
    const r = Math.min(cellW, cellH) * 0.78;

    ctx.save();

    if (!warpGate.active) {
      // ----------------------------------------
      // INACTIVE GATE: Dim, sealed metallic portal
      // ----------------------------------------
      ctx.fillStyle = '#080C16';
      ctx.strokeStyle = '#26344E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Faint offline crossbars
      ctx.strokeStyle = 'rgba(67, 245, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy);
      ctx.lineTo(cx + r * 0.65, cy);
      ctx.moveTo(cx, cy - r * 0.65);
      ctx.lineTo(cx, cy + r * 0.65);
      ctx.stroke();

      // Sealed center glyph
      ctx.fillStyle = '#1A2338';
      ctx.strokeStyle = 'rgba(152, 101, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // ----------------------------------------
      // ACTIVE GATE: Brilliant pulsing exit portal with energy aura
      // ----------------------------------------
      const pulse = Math.sin(now * 0.008) * 0.12 + 0.95;
      const gateR = r * pulse;

      // Concentric expanding shockwave
      if (visualEffects !== 'reduced') {
        const wave = (now * 0.002) % 1;
        const waveR = r + wave * r * 0.8;
        ctx.strokeStyle = `rgba(67, 245, 255, ${(1 - wave) * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Neon Portal Glow
      if (allowGlow) {
        ctx.shadowColor = '#43F5FF';
        ctx.shadowBlur = 22;
      }

      // Rotating aperture ring
      const rot = (now * 0.004) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      ctx.strokeStyle = '#43F5FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const ax = Math.cos(a) * gateR;
        const ay = Math.sin(a) * gateR;
        if (i === 0) ctx.moveTo(ax, ay);
        else ctx.lineTo(ax, ay);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Radiant vortex core
      const vortex = ctx.createRadialGradient(cx, cy, 0, cx, cy, gateR);
      vortex.addColorStop(0, '#FFFFFF');
      vortex.addColorStop(0.35, '#43F5FF');
      vortex.addColorStop(0.7, '#9865FF');
      vortex.addColorStop(1, 'rgba(8, 12, 22, 0.85)');
      ctx.fillStyle = vortex;
      ctx.beginPath();
      ctx.arc(cx, cy, gateR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Center bright exit beacon
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, gateR * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
