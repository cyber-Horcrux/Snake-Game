/**
 * Canvas 2D Neon Renderer and Pooled Particle System
 * Designed for 60fps performance with smooth visual interpolation,
 * zero-GC particle ring buffer, and headless software rendering compatibility.
 */
import type { GameEngineState, GridCoord, FoodItem } from './types.ts';

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

  public triggerScreenShake(magnitude: number = 8, duration: number = 0.25): void {
    this.shakeMagnitude = magnitude;
    this.shakeTime = duration;
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
    settings: { visualEffects: 'high' | 'performance' | 'reduced' }
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

    // 1. Cyber Grid
    this.drawGrid(ctx, width, height, state.gridWidth, state.gridHeight, cellW, cellH, allowGlow);

    // 2. Food & Power-ups
    const now = Date.now();
    for (const item of state.food) {
      this.drawFoodItem(ctx, item, cellW, cellH, now, allowGlow);
    }

    // 3. Snake Body & Head (Smoothly Interpolated)
    this.drawSnake(ctx, state, alpha, cellW, cellH, allowGlow, settings.visualEffects);

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
    visualEffects: string
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
    if (state.powerUps.slowMoUntil > Date.now() && visualEffects !== 'reduced') {
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

    // 2. Body Segments (Gradient from Cyan to Electric Purple to Magenta)
    const radius = (Math.min(cellW, cellH) / 2) * 0.78;

    for (let i = interpolatedPoints.length - 1; i >= 1; i--) {
      const pt = interpolatedPoints[i];
      const t = i / interpolatedPoints.length; // 0 near head, 1 near tail
      const segRadius = radius * (1 - t * 0.25); // Gentle taper towards tail

      ctx.save();
      if (allowGlow && i < 6) {
        ctx.shadowColor = t < 0.5 ? '#43F5FF' : '#9865FF';
        ctx.shadowBlur = 8;
      }

      // Segment color interpolation
      let fill = '#43F5FF';
      if (t > 0.6) {
        fill = '#FF4FD8';
      } else if (t > 0.25) {
        fill = '#9865FF';
      }

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, segRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner energy core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, segRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3. Snake Head
    const headPt = interpolatedPoints[0];
    ctx.save();
    if (allowGlow) {
      ctx.shadowColor = '#43F5FF';
      ctx.shadowBlur = 18;
    }

    // Head base circle
    ctx.fillStyle = '#43F5FF';
    ctx.beginPath();
    ctx.arc(headPt.x, headPt.y, radius * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright center
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headPt.x, headPt.y, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Directional Optic Visor / Eyes
    const eyeOffset = radius * 0.55;
    let eye1: { x: number; y: number };
    let eye2: { x: number; y: number };

    switch (state.direction) {
      case 'UP':
        eye1 = { x: headPt.x - eyeOffset * 0.6, y: headPt.y - eyeOffset };
        eye2 = { x: headPt.x + eyeOffset * 0.6, y: headPt.y - eyeOffset };
        break;
      case 'DOWN':
        eye1 = { x: headPt.x - eyeOffset * 0.6, y: headPt.y + eyeOffset };
        eye2 = { x: headPt.x + eyeOffset * 0.6, y: headPt.y + eyeOffset };
        break;
      case 'LEFT':
        eye1 = { x: headPt.x - eyeOffset, y: headPt.y - eyeOffset * 0.6 };
        eye2 = { x: headPt.x - eyeOffset, y: headPt.y + eyeOffset * 0.6 };
        break;
      case 'RIGHT':
      default:
        eye1 = { x: headPt.x + eyeOffset, y: headPt.y - eyeOffset * 0.6 };
        eye2 = { x: headPt.x + eyeOffset, y: headPt.y + eyeOffset * 0.6 };
        break;
    }

    ctx.fillStyle = '#080A12';
    ctx.beginPath();
    ctx.arc(eye1.x, eye1.y, radius * 0.28, 0, Math.PI * 2);
    ctx.arc(eye2.x, eye2.y, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#39FF14';
    ctx.beginPath();
    ctx.arc(eye1.x, eye1.y, radius * 0.16, 0, Math.PI * 2);
    ctx.arc(eye2.x, eye2.y, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // 4. Active Shield Aura around head
    if (state.powerUps.hasShield) {
      const shieldPulse = Math.sin(Date.now() * 0.01) * 0.15 + 1;
      const shieldR = radius * 1.85 * shieldPulse;
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
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = 'rgba(152, 101, 255, 0.18)';
      ctx.fill();
    }

    ctx.restore();
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
}
