/**
 * Canvas 2D Neon Renderer and Pooled Particle System
 * Designed for 60fps performance with smooth visual interpolation,
 * zero-GC particle ring buffer, and headless software rendering compatibility.
 */
import type { GameEngineState, GridCoord, FoodItem, SnakeSkinId, SnakeSkin, SnakeTrailId, BoardThemeId, Obstacle, WarpGate } from './types.ts';
import { SKINS } from './constants.ts';
import { drawNaturalStylizedSnake } from './snake_renderer.ts';
import { TrailHistoryManager, drawSnakeTrail } from './trail_renderer.ts';
import { getThemeDefinition, isValidThemeId } from './themes.ts';

function safeEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number = 0,
  start: number = 0,
  end: number = Math.PI * 2
): void {
  if (typeof (ctx as any).ellipse === 'function') {
    (ctx as any).ellipse(x, y, rx, ry, rot, start, end);
  } else if (typeof ctx.arc === 'function') {
    ctx.save();
    ctx.translate(x, y);
    if (rot !== 0) ctx.rotate(rot);
    if (rx > 0 && ry > 0) ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, start, end);
    ctx.restore();
  }
}

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
  public trailHistory = new TrailHistoryManager();
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
    this.trailHistory.clear();
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
    settings: {
      visualEffects: 'high' | 'performance' | 'reduced';
      skin?: SnakeSkinId;
      trail?: SnakeTrailId;
      boardTheme?: BoardThemeId;
      isPlaying?: boolean;
    },
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

    // 1. Board Surface, Grid & Boundaries (Theme-Driven)
    this.drawGrid(
      ctx,
      width,
      height,
      state.gridWidth,
      state.gridHeight,
      cellW,
      cellH,
      allowGlow,
      settings.boardTheme,
      settings.visualEffects,
      now
    );

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

    // 3. Snake Body & Head (Smoothly Interpolated using selected skin & cosmetic trail)
    const skinConfig = SKINS[settings.skin || 'cyber_cyan'] || SKINS.cyber_cyan;
    this.drawSnake(ctx, state, alpha, cellW, cellH, allowGlow, settings.visualEffects, skinConfig, settings.trail, now, settings.isPlaying ?? true);

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
    allowGlow: boolean,
    themeId?: BoardThemeId,
    visualEffects?: 'high' | 'performance' | 'reduced',
    now: number = 0
  ): void {
    const safeThemeId: BoardThemeId = isValidThemeId(themeId) ? themeId : 'obsidian_grid';
    const theme = getThemeDefinition(safeThemeId);
    const effects = visualEffects || 'high';

    ctx.save();
    try {
      // 0. Base Floor Material & Atmospheric Radial Depth
      ctx.fillStyle = theme.floorBg;
      ctx.fillRect(0, 0, w, h);

      if (typeof ctx.createRadialGradient === 'function') {
        const grad = ctx.createRadialGradient(
          w * 0.5,
          h * 0.5,
          Math.min(w, h) * 0.1,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.72
        );
        grad.addColorStop(0, theme.floorGradient.center);
        grad.addColorStop(1, theme.floorGradient.edge);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 1. Subtle Architectural Floor Grid
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = theme.grid.lineColor;
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

      // Theme-specific distinct material surface structures (omitted on reduced mode for pure contrast & battery)
      if (effects !== 'reduced') {
        this.drawThemeGameplayMaterialSurface(ctx, safeThemeId, w, h, gridW, gridH, cellW, cellH, effects, now);
      }

      // Micro tactical crosshairs / node markers at intersections
      ctx.fillStyle = theme.grid.crosshairColor;
      const freq = theme.grid.accentFrequency || 4;
      for (let x = freq; x < gridW; x += freq) {
        for (let y = freq; y < gridH; y += freq) {
          const px = x * cellW;
          const py = y * cellH;
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }

      // 2. Precision Outer Containment Frame (Directional Beveling & Materials)
      // Dark base bezel
      ctx.strokeStyle = theme.border.outerBase;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

      // Bottom and Right Ambient Occlusion Bevel (Shadow - Light from top-left)
      ctx.strokeStyle = theme.border.shadowOcclusion;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w - 1, 1);
      ctx.lineTo(w - 1, h - 1);
      ctx.lineTo(1, h - 1);
      ctx.stroke();

      // Top and Left Directional Key-Light Specular Chamfer
      ctx.strokeStyle = theme.border.specularChamfer;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(1, h - 1);
      ctx.lineTo(1, 1);
      ctx.lineTo(w - 1, 1);
      ctx.stroke();

      // Emissive Containment Perimeter (Restrained and Controlled)
      ctx.strokeStyle = theme.border.emissivePerimeter;
      ctx.lineWidth = 1;
      if (allowGlow) {
        ctx.shadowColor = theme.border.emissivePerimeter;
        ctx.shadowBlur = 6;
      }
      ctx.strokeRect(2.5, 2.5, w - 5, h - 5);
      ctx.shadowBlur = 0;

      // 3. Precision Machined Corner Reticles
      const cornerSize = Math.min(cellW, cellH) * 1.4;
      ctx.strokeStyle = theme.border.cornerReticle;
      ctx.lineWidth = 2;
      if (allowGlow) {
        ctx.shadowColor = theme.border.cornerReticle;
        ctx.shadowBlur = 5;
      }

      // Top-Left Reticle
      ctx.beginPath();
      ctx.moveTo(1.5, cornerSize);
      ctx.lineTo(1.5, 1.5);
      ctx.lineTo(cornerSize, 1.5);
      ctx.stroke();

      // Top-Right Reticle
      ctx.beginPath();
      ctx.moveTo(w - cornerSize, 1.5);
      ctx.lineTo(w - 1.5, 1.5);
      ctx.lineTo(w - 1.5, cornerSize);
      ctx.stroke();

      // Bottom-Left Reticle
      ctx.beginPath();
      ctx.moveTo(1.5, h - cornerSize);
      ctx.lineTo(1.5, h - 1.5);
      ctx.lineTo(cornerSize, h - 1.5);
      ctx.stroke();

      // Bottom-Right Reticle
      ctx.beginPath();
      ctx.moveTo(w - cornerSize, h - 1.5);
      ctx.lineTo(w - 1.5, h - 1.5);
      ctx.lineTo(w - 1.5, h - cornerSize);
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Industrial notch details on corners if industrial theme
      if (safeThemeId === 'industrial_foundry') {
        ctx.fillStyle = theme.border.cornerReticle;
        ctx.fillRect(4, 4, 3, 3);
        ctx.fillRect(w - 7, 4, 3, 3);
        ctx.fillRect(4, h - 7, 3, 3);
        ctx.fillRect(w - 7, h - 7, 3, 3);
      }
    } finally {
      ctx.restore();
    }
  }

  private drawThemeGameplayMaterialSurface(
    ctx: CanvasRenderingContext2D,
    themeId: BoardThemeId,
    w: number,
    h: number,
    gridW: number,
    gridH: number,
    cellW: number,
    cellH: number,
    effects: 'high' | 'performance' | 'reduced',
    now: number
  ): void {
    const isHigh = effects === 'high';

    switch (themeId) {
      case 'obsidian_grid': {
        // Carbon-graphite diagonal weave on alternating panels
        ctx.strokeStyle = 'rgba(67, 245, 255, 0.022)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const step = isHigh ? Math.max(4, cellW * 0.25) : Math.max(6, cellW * 0.5);
        for (let c = 0; c < gridW; c += 2) {
          for (let r = 0; r < gridH; r += 2) {
            const x0 = c * cellW;
            const y0 = r * cellH;
            for (let offset = step; offset < cellW + cellH; offset += step) {
              const sx = x0 + Math.min(offset, cellW);
              const sy = y0 + Math.max(0, offset - cellW);
              const ex = x0 + Math.max(0, offset - cellH);
              const ey = y0 + Math.min(offset, cellH);
              ctx.moveTo(sx, sy);
              ctx.lineTo(ex, ey);
            }
          }
        }
        ctx.stroke();

        // Precision cyan vernier alignment ticks along horizontal and vertical mid-axes
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.16)';
        ctx.lineWidth = 1;
        const midY = Math.floor(gridH / 2) * cellH;
        const midX = Math.floor(gridW / 2) * cellW;
        ctx.beginPath();
        for (let c = 1; c < gridW; c += 2) {
          const x = c * cellW;
          ctx.moveTo(x, midY - 2.5);
          ctx.lineTo(x, midY + 2.5);
        }
        for (let r = 1; r < gridH; r += 2) {
          const y = r * cellH;
          ctx.moveTo(midX - 2.5, y);
          ctx.lineTo(midX + 2.5, y);
        }
        ctx.stroke();
        break;
      }

      case 'industrial_foundry': {
        // Heavy dark iron plates in 3x3 modular slabs with recessed expansion seams
        const slabSize = 3;
        for (let c = 0; c < gridW; c += slabSize) {
          for (let r = 0; r < gridH; r += slabSize) {
            const px = c * cellW;
            const py = r * cellH;
            const pw = Math.min(slabSize * cellW, w - px);
            const ph = Math.min(slabSize * cellH, h - py);

            // Plate surface subtle metallic tint
            ctx.fillStyle = ((c / slabSize) + (r / slabSize)) % 2 === 0 ? 'rgba(255, 158, 11, 0.016)' : 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

            // Recessed joint groove: shadow bottom-right, highlight top-left
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + pw, py);
            ctx.lineTo(px + pw, py + ph);
            ctx.lineTo(px, py + ph);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 170, 50, 0.12)';
            ctx.beginPath();
            ctx.moveTo(px, py + 1);
            ctx.lineTo(px + pw - 1, py + 1);
            ctx.stroke();

            // Brushed steel grain on high setting
            if (isHigh) {
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.02)';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              const grainStep = Math.max(4, cellH * 0.35);
              for (let gy = py + grainStep; gy < py + ph - 2; gy += grainStep) {
                ctx.moveTo(px + 2, gy);
                ctx.lineTo(px + pw - 2, gy);
              }
              ctx.stroke();
            }

            // Countersunk corner rivets with specular glints
            ctx.fillStyle = 'rgba(245, 158, 11, 0.32)';
            ctx.fillRect(px + 2, py + 2, 1.5, 1.5);
            ctx.fillRect(px + pw - 3.5, py + 2, 1.5, 1.5);
            ctx.fillRect(px + 2, py + ph - 3.5, 1.5, 1.5);
            ctx.fillRect(px + pw - 3.5, py + ph - 3.5, 1.5, 1.5);
          }
        }
        break;
      }

      case 'arctic_research': {
        // Crystalline fracture facets & sub-zero cryo-ceramic tiles
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.03)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let c = 0; c < gridW; c++) {
          for (let r = 0; r < gridH; r++) {
            if ((c + r) % 2 === 0) {
              const x = c * cellW;
              const y = r * cellH;
              ctx.moveTo(x + cellW * 0.2, y);
              ctx.lineTo(x + cellW * 0.8, y + cellH);
              if (isHigh) {
                ctx.moveTo(x, y + cellH * 0.3);
                ctx.lineTo(x + cellW, y + cellH * 0.7);
              }
            }
          }
        }
        ctx.stroke();

        // Diamond cryo-sensor nodes at key intersections
        ctx.fillStyle = 'rgba(224, 247, 250, 0.22)';
        for (let c = 2; c < gridW; c += 3) {
          for (let r = 2; r < gridH; r += 3) {
            const px = c * cellW;
            const py = r * cellH;
            ctx.beginPath();
            ctx.moveTo(px, py - 2.5);
            ctx.lineTo(px + 2, py);
            ctx.lineTo(px, py + 2.5);
            ctx.lineTo(px - 2, py);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Perimeter frost condensation glaze
        ctx.strokeStyle = 'rgba(56, 225, 255, 0.06)';
        ctx.lineWidth = 3;
        ctx.strokeRect(3, 3, w - 6, h - 6);
        break;
      }

      case 'bio_dome': {
        // Dark organic vascular reticulum / hexagonal cellular mesh
        ctx.strokeStyle = 'rgba(16, 255, 160, 0.028)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        const step = isHigh ? 1 : 2;
        for (let c = 0; c < gridW; c += step) {
          for (let r = 0; r < gridH; r += step) {
            const cx = c * cellW + cellW * 0.5;
            const cy = r * cellH + cellH * 0.5;
            const rad = Math.min(cellW, cellH) * 0.35;
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3;
              const nx = cx + Math.cos(angle) * rad;
              const ny = cy + Math.sin(angle) * rad;
              if (i === 0) ctx.moveTo(nx, ny);
              else ctx.lineTo(nx, ny);
            }
            ctx.closePath();
          }
        }
        ctx.stroke();

        // Living bioluminescent node respiration
        const bioPulse = Math.sin(now * 0.003) * 0.06 + 0.18;
        ctx.fillStyle = `rgba(16, 255, 160, ${bioPulse.toFixed(3)})`;
        for (let c = 2; c < gridW; c += 3) {
          for (let r = 2; r < gridH; r += 3) {
            const px = c * cellW;
            const py = r * cellH;
            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'solar_array': {
        // Photovoltaic silicon wafer divisions in 3x3 module blocks
        const panelSize = 3;
        for (let c = 0; c < gridW; c += panelSize) {
          for (let r = 0; r < gridH; r += panelSize) {
            const px = c * cellW;
            const py = r * cellH;
            const pw = Math.min(panelSize * cellW, w - px);
            const ph = Math.min(panelSize * cellH, h - py);

            // Antireflective coating tint
            ctx.fillStyle = 'rgba(255, 215, 0, 0.015)';
            ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

            // Conductive busbar micro-traces across panels
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            const traceStep = pw * 0.33;
            for (let tx = px + traceStep; tx < px + pw - 1; tx += traceStep) {
              ctx.moveTo(tx, py + 1);
              ctx.lineTo(tx, py + ph - 1);
            }
            ctx.stroke();

            // Solder contact tabs at wafer junction points
            ctx.fillStyle = 'rgba(255, 215, 0, 0.28)';
            ctx.fillRect(px + 2, py + 2, 2, 2);
            ctx.fillRect(px + pw - 4, py + 2, 2, 2);
            ctx.fillRect(px + 2, py + ph - 4, 2, 2);
            ctx.fillRect(px + pw - 4, py + ph - 4, 2, 2);
          }
        }
        break;
      }

      case 'void_observatory': {
        // Celestial coordinate ticks along center cross-axes
        ctx.strokeStyle = 'rgba(124, 77, 255, 0.18)';
        ctx.lineWidth = 1;
        const midX = Math.floor(gridW / 2) * cellW;
        const midY = Math.floor(gridH / 2) * cellH;

        ctx.beginPath();
        for (let r = 0; r <= gridH; r += 2) {
          const y = r * cellH;
          ctx.moveTo(midX - 2.5, y);
          ctx.lineTo(midX + 2.5, y);
        }
        for (let c = 0; c <= gridW; c += 2) {
          const x = c * cellW;
          ctx.moveTo(x, midY - 2.5);
          ctx.lineTo(x, midY + 2.5);
        }
        ctx.stroke();

        // Concentric astronomical observatory focus rings around the board center
        ctx.strokeStyle = 'rgba(124, 77, 255, 0.04)';
        ctx.lineWidth = 0.75;
        const centerX = w * 0.5;
        const centerY = h * 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.min(w, h) * 0.2, 0, Math.PI * 2);
        if (isHigh) {
          ctx.arc(centerX, centerY, Math.min(w, h) * 0.35, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Precision quantum reticle node at center
        ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
        ctx.fillRect(midX - 1.5, midY - 1.5, 3, 3);
        break;
      }
    }
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
    const pulse = Math.sin(now * 0.007) * 0.08 + 0.96;
    const baseRadius = (Math.min(cellW, cellH) / 2) * 0.72;
    const r = baseRadius * pulse;

    ctx.save();

    if (item.type === 'normal') {
      // ----------------------------------------
      // NORMAL FOOD: Volumetric Emerald Power Sphere with Mechanical Gimbal Ring
      // ----------------------------------------

      // 1. Soft Ground Contact Shadow (directional, beneath and slightly right)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      safeEllipse(ctx, cx + 0.5, cy + r * 0.88, r * 0.72, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Precision Counter-Rotating Gyroscopic Gimbal Rings
      const ringAngle = now * 0.0016;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringAngle);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      safeEllipse(ctx, 0, 0, r * 1.35, r * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Specular pin on gimbal ring
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(r * 1.35, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Volumetric Spherical Shading (Top-left key light source at -45°)
      const lightX = cx - r * 0.32;
      const lightY = cy - r * 0.35;
      const sphereGrad = ctx.createRadialGradient(lightX, lightY, r * 0.06, cx, cy, r);
      sphereGrad.addColorStop(0, '#FFFFFF');
      sphereGrad.addColorStop(0.2, '#6EE7B7');
      sphereGrad.addColorStop(0.55, '#10B981');
      sphereGrad.addColorStop(0.85, '#047857');
      sphereGrad.addColorStop(1, '#022C22');

      if (allowGlow) {
        ctx.shadowColor = 'rgba(52, 211, 153, 0.5)';
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. Subtle Specular Highlight Glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      safeEllipse(ctx, lightX, lightY, r * 0.22, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (item.type === 'bonus') {
      // ----------------------------------------
      // BONUS FOOD: 3D Faceted Synthetic Octahedron Hyper-Gem with Chronometer
      // ----------------------------------------

      // 1. Soft Ground Contact Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      safeEllipse(ctx, cx + 0.5, cy + r * 1.05, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Sleek Calibrated Radial Chronometer Countdown Bezel
      if (item.expiresAt && item.totalDurationMs) {
        const remaining = Math.max(0, item.expiresAt - now);
        const fraction = remaining / item.totalDurationMs;
        const bezelR = r * 1.45;

        // Track background
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.18)';
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(cx, cy, bezelR, 0, Math.PI * 2);
        ctx.stroke();

        // Active countdown arc
        if (fraction > 0) {
          ctx.strokeStyle = fraction > 0.25 ? '#FB7185' : '#EF4444';
          ctx.lineWidth = 2.2;
          if (allowGlow) {
            ctx.shadowColor = 'rgba(251, 113, 133, 0.5)';
            ctx.shadowBlur = 6;
          }
          ctx.beginPath();
          ctx.arc(cx, cy, bezelR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Countdown leading edge needle indicator
          const tipA = -Math.PI / 2 + Math.PI * 2 * fraction;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx + Math.cos(tipA) * bezelR, cy + Math.sin(tipA) * bezelR, 1.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. 3D Faceted Octahedron Geometry with Directional Lighting
      // Slow rotation for dynamic facet glints
      const gemRot = now * 0.0012;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(gemRot);

      const gemW = r * 1.05;
      const gemH = r * 1.35;
      const topPt = { x: 0, y: -gemH };
      const botPt = { x: 0, y: gemH };
      const leftPt = { x: -gemW, y: 0 };
      const rightPt = { x: gemW, y: 0 };
      const centerPt = { x: 0, y: r * 0.15 };

      // Top-Left Facet (Facing key light: brightest ruby-rose specular)
      ctx.fillStyle = '#FECDD3';
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(leftPt.x, leftPt.y);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.closePath();
      ctx.fill();

      // Top-Right Facet (Vivid magenta-crimson)
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.closePath();
      ctx.fill();

      // Bottom-Left Facet (Mid-tone ruby)
      ctx.fillStyle = '#BE123C';
      ctx.beginPath();
      ctx.moveTo(botPt.x, botPt.y);
      ctx.lineTo(leftPt.x, leftPt.y);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.closePath();
      ctx.fill();

      // Bottom-Right Facet (Deep shadow crimson)
      ctx.fillStyle = '#4C0519';
      ctx.beginPath();
      ctx.moveTo(botPt.x, botPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.closePath();
      ctx.fill();

      // Facet Seam Chamfers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.lineTo(botPt.x, botPt.y);
      ctx.moveTo(leftPt.x, leftPt.y);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.stroke();

      // Center Core Specular Point
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(centerPt.x, centerPt.y, r * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

    } else if (item.type === 'powerup_slow') {
      // ----------------------------------------
      // POWERUP SLOW: Chrono-Shift Sapphire Chronometer Lens
      // ----------------------------------------

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      safeEllipse(ctx, cx + 0.5, cy + r * 0.95, r * 0.75, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chronometer Rhombus Casing with Directional Beveling
      const rw = r * 1.25;
      const rh = r * 1.25;

      // Dark glass body
      const chronoGrad = ctx.createLinearGradient(cx - rw, cy - rh, cx + rw, cy + rh);
      chronoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      chronoGrad.addColorStop(0.5, 'rgba(14, 116, 144, 0.25)');
      chronoGrad.addColorStop(1, 'rgba(8, 47, 73, 0.4)');
      ctx.fillStyle = chronoGrad;

      ctx.beginPath();
      ctx.moveTo(cx, cy - rh);
      ctx.lineTo(cx + rw, cy);
      ctx.lineTo(cx, cy + rh);
      ctx.lineTo(cx - rw, cy);
      ctx.closePath();
      ctx.fill();

      // Directional Bevel Chamfer (top-left specular highlight, bottom-right shadow)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - rw, cy);
      ctx.lineTo(cx, cy - rh);
      ctx.lineTo(cx + rw, cy);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(3, 105, 161, 0.55)';
      ctx.beginPath();
      ctx.moveTo(cx + rw, cy);
      ctx.lineTo(cx, cy + rh);
      ctx.lineTo(cx - rw, cy);
      ctx.stroke();

      // Concentric Chronometer Dial Ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Precision Machined Chronometer Hands
      const handAngle = now * 0.003;
      ctx.save();
      ctx.translate(cx, cy);

      // Hour hand
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1.75;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(handAngle) * (r * 0.5), Math.sin(handAngle) * (r * 0.5));
      ctx.stroke();

      // Minute hand
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(handAngle * 2.5) * (r * 0.72), Math.sin(handAngle * 2.5) * (r * 0.72));
      ctx.stroke();

      // Pivot center bearing
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (item.type === 'powerup_shield') {
      // ----------------------------------------
      // POWERUP SHIELD: Aegis Nanotech Hexagonal Plate with Energy Matrix
      // ----------------------------------------

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      safeEllipse(ctx, cx + 0.5, cy + r * 0.95, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hexagonal chassis with directional beveling
      const hexR = r * 1.25;
      const hexPoints: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        hexPoints.push({
          x: cx + Math.cos(a) * hexR,
          y: cy + Math.sin(a) * hexR,
        });
      }

      // Base Nanotech Chitin fill
      const aegisGrad = ctx.createLinearGradient(cx - hexR, cy - hexR, cx + hexR, cy + hexR);
      aegisGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
      aegisGrad.addColorStop(0.5, 'rgba(107, 33, 168, 0.25)');
      aegisGrad.addColorStop(1, 'rgba(59, 7, 100, 0.4)');
      ctx.fillStyle = aegisGrad;

      ctx.beginPath();
      ctx.moveTo(hexPoints[0].x, hexPoints[0].y);
      for (let i = 1; i < 6; i++) {
        ctx.lineTo(hexPoints[i].x, hexPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Directional Specular Chamfers on Hexagon Rim
      // Top facets (0-1, 1-2, 2-3)
      ctx.strokeStyle = 'rgba(233, 213, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hexPoints[3].x, hexPoints[3].y);
      ctx.lineTo(hexPoints[4].x, hexPoints[4].y);
      ctx.lineTo(hexPoints[5].x, hexPoints[5].y);
      ctx.lineTo(hexPoints[0].x, hexPoints[0].y);
      ctx.stroke();

      // Bottom facets (shadow)
      ctx.strokeStyle = 'rgba(88, 28, 135, 0.6)';
      ctx.beginPath();
      ctx.moveTo(hexPoints[0].x, hexPoints[0].y);
      ctx.lineTo(hexPoints[1].x, hexPoints[1].y);
      ctx.lineTo(hexPoints[2].x, hexPoints[2].y);
      ctx.lineTo(hexPoints[3].x, hexPoints[3].y);
      ctx.stroke();

      // Internal Aegis Chevron / Force-field Glyph
      const pulseInner = Math.sin(now * 0.008) * 0.1 + 0.9;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.45 * pulseInner, cy - r * 0.2);
      ctx.lineTo(cx, cy + r * 0.45 * pulseInner);
      ctx.lineTo(cx + r * 0.45 * pulseInner, cy - r * 0.2);
      ctx.stroke();

      // Aegis center pearl
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.1, r * 0.18, 0, Math.PI * 2);
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
    trail?: SnakeTrailId,
    now: number = Date.now(),
    isPlaying: boolean = true
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

    // Deterministic simulation time: advances when playing, freezes when paused
    const trailTimeMs = (state.gameTimeMs || 0) + (isPlaying ? clampedAlpha * (state.tickIntervalMs || 100) : 0);

    // Record tail point for cosmetic trail ONLY while actively playing
    if (interpolatedPoints.length > 0) {
      const tailIdx = interpolatedPoints.length - 1;
      const tailPt = interpolatedPoints[tailIdx];
      let tailAngle = 0;
      if (interpolatedPoints.length > 1) {
        const prevTailPt = interpolatedPoints[tailIdx - 1];
        tailAngle = Math.atan2(tailPt.y - prevTailPt.y, tailPt.x - prevTailPt.x);
      }
      const currTailGrid = state.snake[tailIdx];
      const prevTailGrid = state.prevSnake[tailIdx] || currTailGrid;
      const isWrap = Math.abs(currTailGrid.x - prevTailGrid.x) > 1 || Math.abs(currTailGrid.y - prevTailGrid.y) > 1;

      if (state.isAlive && isPlaying) {
        this.trailHistory.addPoint(tailPt.x, tailPt.y, trailTimeMs, tailAngle, isWrap);
      }
    }

    // 1. Draw Cosmetic Snake Trail if equipped
    if (trail && trail !== 'none') {
      const maxAllowedGap = Math.max(cellW, cellH) * 3.5;
      const trailChains = this.trailHistory.getChains(trailTimeMs, maxAllowedGap);
      drawSnakeTrail(ctx, trailChains, trail, {
        visualEffects: (visualEffects as any) || 'high',
        allowGlow,
        baseRadius: (Math.min(cellW, cellH) / 2) * 0.78,
        animationTimeMs: now,
      });
    }

    // 2. Draw Slow-Mo Trail if active
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

    // 3. Draw Natural Stylized Snake using shared renderer
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
        // INDESTRUCTIBLE WALL: Industrial Carbon-Titanium Composite with Directional Bevels
        // ----------------------------------------
        // 1. Ground Drop Shadow (cast to bottom-right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(rx + 2, ry + 2, rw, rh);

        // 2. Base Composite Block Gradient
        const wallGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
        wallGrad.addColorStop(0, '#1E293B');
        wallGrad.addColorStop(0.4, '#0F172A');
        wallGrad.addColorStop(1, '#020617');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(rx, ry, rw, rh);

        // 3. Directional Key-Light Bevel (Top & Left Specular)
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(rx, ry + rh);
        ctx.lineTo(rx, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.stroke();

        // 4. Directional Shadow Bevel (Bottom & Right Ambient Occlusion)
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(rx + rw, ry);
        ctx.lineTo(rx + rw, ry + rh);
        ctx.lineTo(rx, ry + rh);
        ctx.stroke();

        // 5. Inset Machined Face Plate
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(rx + 2.5, ry + 2.5, rw - 5, rh - 5);

        // 6. Micro Alloy Fastener Studs at Corners
        ctx.fillStyle = 'rgba(224, 242, 254, 0.65)';
        const studInset = Math.min(rw, rh) * 0.18;
        ctx.fillRect(rx + studInset, ry + studInset, 1.5, 1.5);
        ctx.fillRect(rx + rw - studInset - 1.5, ry + studInset, 1.5, 1.5);
        ctx.fillRect(rx + studInset, ry + rh - studInset - 1.5, 1.5, 1.5);
        ctx.fillRect(rx + rw - studInset - 1.5, ry + rh - studInset - 1.5, 1.5, 1.5);

        // 7. Tactical Micro Core Slot
        const slotW = rw * 0.35;
        const slotH = 1.5;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.fillRect(cx - slotW / 2, cy - slotH / 2, slotW, slotH);

      } else if (ob.type === 'barrier') {
        // ----------------------------------------
        // DESTRUCTIBLE BARRIER: Polarized Quantum Flux Barrier with Stress Lattice
        // ----------------------------------------
        const pulse = Math.sin(now * 0.006 + ob.x * 0.8 + ob.y * 0.8) * 0.12 + 0.88;

        // Ground contact shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(rx + 1.5, ry + 1.5, rw, rh);

        // Translucent Energy Field Fill
        const barrierGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
        barrierGrad.addColorStop(0, `rgba(168, 85, 247, ${0.28 * pulse})`);
        barrierGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.16 * pulse})`);
        barrierGrad.addColorStop(1, `rgba(126, 34, 206, ${0.32 * pulse})`);
        ctx.fillStyle = barrierGrad;
        ctx.fillRect(rx, ry, rw, rh);

        // Directional Frame Chamfer
        ctx.strokeStyle = `rgba(192, 132, 252, ${0.85 * pulse})`;
        ctx.lineWidth = 1.5;
        if (allowGlow) {
          ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
          ctx.shadowBlur = 6;
        }
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.shadowBlur = 0;

        // Nano-mesh Energy Fracture Lattice
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 * pulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Diagonal cross
        ctx.moveTo(rx, ry + rh * 0.5);
        ctx.lineTo(rx + rw * 0.5, ry);
        ctx.moveTo(rx + rw * 0.5, ry + rh);
        ctx.lineTo(rx + rw, ry + rh * 0.5);
        // Breakable central diamond
        ctx.moveTo(cx, ry + rh * 0.25);
        ctx.lineTo(rx + rw * 0.75, cy);
        ctx.lineTo(cx, ry + rh * 0.75);
        ctx.lineTo(rx + rw * 0.25, cy);
        ctx.closePath();
        ctx.stroke();

        // Pulsing Quantum Core Node
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.1 * pulse, 0, Math.PI * 2);
        ctx.fill();

      } else if (ob.type === 'hazard') {
        // ----------------------------------------
        // HAZARD: Directionally Lit Industrial Warning Beacon
        // ----------------------------------------
        const pulse = Math.sin(now * 0.009 + (ob.x * 3 + ob.y * 5)) * 0.12 + 0.88;
        const baseR = (Math.min(cellW, cellH) / 2) * 0.78;
        const r = baseR * pulse;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        safeEllipse(ctx, cx + 0.5, cy + r * 0.95, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rotating directional warning turbine
        const rot = (now * 0.0025 + ob.x) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(190, 18, 60, 0.25)';
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

        // Thermal Warning Core with Volumetric Radial Gradient
        const coreGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.05, cx, cy, r * 0.55);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.3, '#FB7185');
        coreGrad.addColorStop(0.7, '#E11D48');
        coreGrad.addColorStop(1, '#881337');

        if (allowGlow) {
          ctx.shadowColor = 'rgba(244, 63, 94, 0.5)';
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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

    // Ground Contact Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    safeEllipse(ctx, cx + 1, cy + r * 0.95, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!warpGate.active) {
      // ----------------------------------------
      // INACTIVE GATE: Sealed Machined Alloy Aperture Collar
      // ----------------------------------------
      // Machined outer stator ring with directional lighting
      const statorGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      statorGrad.addColorStop(0, '#1E293B');
      statorGrad.addColorStop(0.5, '#0F172A');
      statorGrad.addColorStop(1, '#020617');
      ctx.fillStyle = statorGrad;
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top-Left directional bevel
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 1.75);
      ctx.stroke();

      // Interlocking sealed aperture blade seams
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.25;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * (r * 0.9), cy + Math.sin(a) * (r * 0.9));
        ctx.stroke();
      }

      // Sealed center key node
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else {
      // ----------------------------------------
      // ACTIVE GATE: Relativistic Event Horizon Aperture with Frame Dragging
      // ----------------------------------------
      const pulse = Math.sin(now * 0.008) * 0.1 + 0.95;
      const gateR = r * pulse;

      // Concentric expanding shockwave
      if (visualEffects !== 'reduced') {
        const wave = (now * 0.002) % 1;
        const waveR = r + wave * r * 0.8;
        ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - wave) * 0.4})`;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Directionally lit machined aperture collar
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2.5;
      if (allowGlow) {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
        ctx.shadowBlur = 12;
      }

      // Rotating aperture hexagonal iris
      const rot = (now * 0.004) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

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

      // Relativistic Event Horizon Accretion Disk (Deep Core to Intense Luminous Ring)
      const vortex = ctx.createRadialGradient(cx, cy, 0, cx, cy, gateR);
      vortex.addColorStop(0, '#FFFFFF');
      vortex.addColorStop(0.25, '#38BDF8');
      vortex.addColorStop(0.6, '#818CF8');
      vortex.addColorStop(0.85, '#1E1B4B');
      vortex.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
      ctx.fillStyle = vortex;
      ctx.beginPath();
      ctx.arc(cx, cy, gateR * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Singularity core beacon
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, gateR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
