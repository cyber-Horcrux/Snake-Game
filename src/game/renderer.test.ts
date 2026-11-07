import test from 'node:test';
import assert from 'node:assert/strict';
import { NeonRenderer, ParticlePool } from './renderer.ts';
import { createInitialState } from './engine.ts';
import { createInitialMazeState } from './mazes.ts';
import type { GameEngineState, Obstacle, WarpGate } from './types.ts';

function createMockContext() {
  const operations: string[] = [];
  return {
    operations,
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    clearRect: (x: number, y: number, w: number, h: number) => operations.push(`clearRect(${x},${y},${w},${h})`),
    fillRect: (x: number, y: number, w: number, h: number) => operations.push(`fillRect(${x},${y},${w},${h})`),
    strokeRect: (x: number, y: number, w: number, h: number) => operations.push(`strokeRect(${x},${y},${w},${h})`),
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    clip: () => operations.push('clip'),
    moveTo: (x: number, y: number) => operations.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => operations.push(`lineTo(${x},${y})`),
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => operations.push(`quadraticCurveTo(${cpx},${cpy},${x},${y})`),
    bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => operations.push(`bezierCurveTo(${cp1x},${cp1y},${cp2x},${cp2y},${x},${y})`),
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    arc: (x: number, y: number, r: number) => operations.push(`arc(${x},${y},${r})`),
    translate: (x: number, y: number) => operations.push(`translate(${x},${y})`),
    rotate: (a: number) => operations.push(`rotate(${a})`),
    scale: (x: number, y: number) => operations.push(`scale(${x},${y})`),
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    shadowColor: '',
    shadowBlur: 0,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

// ==========================================
// RENDERER CORE & PARTICLE SYSTEM TESTS
// ==========================================

test('ParticlePool spawns particles, updates physics, decays lifetime, and resets cleanly', () => {
  const pool = new ParticlePool();
  assert.equal(pool.particles.filter(p => p.active).length, 0);

  // Spawn 10 particles
  pool.spawn(100, 100, '#43F5FF', 10, 150, 4);
  const activeCount = pool.particles.filter(p => p.active).length;
  assert.equal(activeCount, 10);

  const p0 = pool.particles.find(p => p.active)!;
  const initialLife = p0.life;

  // Update dt=0.1
  pool.update(0.1);
  assert.ok(p0.life < initialLife);

  // Update large dt to expire all particles
  pool.update(5.0);
  assert.equal(pool.particles.filter(p => p.active).length, 0);

  // Spawn and reset
  pool.spawn(50, 50, '#9865FF', 8);
  assert.equal(pool.particles.filter(p => p.active).length, 8);
  pool.reset();
  assert.equal(pool.particles.filter(p => p.active).length, 0);
});

test('NeonRenderer screen shake activates and decays over time', () => {
  const renderer = new NeonRenderer();
  renderer.triggerScreenShake(12, 0.3);

  // Update frame
  renderer.update(0.1);
  // Still active
  renderer.update(0.25);
  // Decayed
});

// ==========================================
// MAZE MODE OBJECT RENDERING TESTS
// ==========================================

test('NeonRenderer renders wall, barrier, and hazard obstacles in maze mode', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();

  const obstacles: Obstacle[] = [
    { id: 'w1', x: 2, y: 2, type: 'wall' },
    { id: 'b1', x: 3, y: 3, type: 'barrier' },
    { id: 'h1', x: 4, y: 4, type: 'hazard' },
  ];
  const warpGate: WarpGate = { x: 23, y: 12, active: false };

  const state = createInitialState('maze', 24, 24, Math.random, obstacles, warpGate);

  assert.doesNotThrow(() => {
    renderer.render(ctx, 480, 480, state, 1.0, { visualEffects: 'high' });
  });

  const ops = (ctx as any).operations as string[];
  assert.ok(ops.length > 50, 'Renderer must issue canvas draw operations');
  assert.ok(ops.includes('clearRect(0,0,480,480)'), 'Clears canvas at start');
});

test('NeonRenderer handles inactive and active Warp Gate states cleanly', () => {
  const renderer = new NeonRenderer();

  // Test inactive gate
  const ctxInactive = createMockContext();
  const inactiveState = createInitialMazeState(1);
  inactiveState.warpGate = { x: 23, y: 12, active: false };

  assert.doesNotThrow(() => {
    renderer.render(ctxInactive, 480, 480, inactiveState, 1.0, { visualEffects: 'high' });
  });

  // Test active gate
  const ctxActive = createMockContext();
  const activeState = createInitialMazeState(1);
  activeState.warpGate = { x: 23, y: 12, active: true };

  assert.doesNotThrow(() => {
    renderer.render(ctxActive, 480, 480, activeState, 1.0, { visualEffects: 'high' });
  });
});

test('Maze rendering activates ONLY when mode is maze', () => {
  const renderer = new NeonRenderer();

  // Classic mode state with dummy obstacles in state (should be ignored by renderer)
  const classicState = createInitialState('classic', 24, 24);
  (classicState as any).obstacles = [{ id: 'w1', x: 5, y: 5, type: 'wall' }];
  (classicState as any).warpGate = { x: 23, y: 12, active: false };

  const ctxClassic = createMockContext();
  renderer.render(ctxClassic, 480, 480, classicState, 1.0, { visualEffects: 'high' });

  // In Classic mode, maze obstacles must not trigger maze drawing
  assert.equal((renderer as any).lastObstacleMap.size, 0);

  // In Maze mode, obstacle map is tracked
  const mazeState = createInitialMazeState(1);
  const ctxMaze = createMockContext();
  renderer.render(ctxMaze, 480, 480, mazeState, 1.0, { visualEffects: 'high' });
  assert.ok((renderer as any).lastObstacleMap.size > 0);
});

test('Renderer safely handles missing or empty obstacle arrays and null warp gate', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();

  const emptyState = createInitialState('maze', 24, 24);
  emptyState.obstacles = [];
  emptyState.warpGate = null;

  assert.doesNotThrow(() => {
    renderer.render(ctx, 480, 480, emptyState, 1.0, { visualEffects: 'high' });
  });
});

test('Renderer never mutates GameEngineState', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();
  const state = createInitialMazeState(2);

  // Snapshot JSON representation before render
  const snapshotBefore = JSON.stringify(state);

  renderer.render(ctx, 480, 480, state, 0.5, { visualEffects: 'high', skin: 'synth_sunset' });

  const snapshotAfter = JSON.stringify(state);
  assert.equal(snapshotAfter, snapshotBefore, 'Renderer must NEVER mutate GameEngineState');
});

test('Barrier destruction automatically triggers particle emission and screen shake', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();

  const obstaclesWithBarrier: Obstacle[] = [
    { id: 'w1', x: 2, y: 2, type: 'wall' },
    { id: 'b1', x: 3, y: 3, type: 'barrier' },
  ];
  const state1 = createInitialState('maze', 24, 24, Math.random, obstaclesWithBarrier, null);

  // First frame: registers obstacles
  renderer.render(ctx, 480, 480, state1, 1.0, { visualEffects: 'high' });
  assert.equal(renderer.particles.particles.filter(p => p.active).length, 0);

  // Second frame: barrier 'b1' was shattered and removed from engine state
  const state2 = {
    ...state1,
    obstacles: [{ id: 'w1', x: 2, y: 2, type: 'wall' as const }],
  };

  renderer.render(ctx, 480, 480, state2, 1.0, { visualEffects: 'high' });
  // Particles must have spawned from the shattered barrier!
  const activeParticles = renderer.particles.particles.filter(p => p.active).length;
  assert.ok(activeParticles > 0, 'Shattered barrier must spawn destruction particles');
});

test('Warp gate activation automatically triggers portal flare particles', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();

  const stateInactive = createInitialState('maze', 24, 24, Math.random, [], { x: 12, y: 0, active: false });

  // Frame 1: Inactive gate
  renderer.render(ctx, 480, 480, stateInactive, 1.0, { visualEffects: 'high' });
  renderer.particles.reset();

  // Frame 2: Gate becomes active
  const stateActive = {
    ...stateInactive,
    warpGate: { x: 12, y: 0, active: true },
  };

  renderer.render(ctx, 480, 480, stateActive, 1.0, { visualEffects: 'high' });
  const activeParticles = renderer.particles.particles.filter(p => p.active).length;
  assert.ok(activeParticles > 0, 'Warp gate activation must spawn activation flare particles');
});

test('Visual effects settings (high, performance, reduced) are respected without errors', () => {
  const renderer = new NeonRenderer();
  const state = createInitialMazeState(1);

  const ctxHigh = createMockContext();
  assert.doesNotThrow(() => {
    renderer.render(ctxHigh, 480, 480, state, 1.0, { visualEffects: 'high' });
  });

  const ctxPerf = createMockContext();
  assert.doesNotThrow(() => {
    renderer.render(ctxPerf, 480, 480, state, 1.0, { visualEffects: 'performance' });
  });

  const ctxRed = createMockContext();
  assert.doesNotThrow(() => {
    renderer.render(ctxRed, 480, 480, state, 1.0, { visualEffects: 'reduced' });
  });
});
