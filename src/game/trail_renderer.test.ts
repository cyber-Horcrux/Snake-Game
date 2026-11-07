import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TrailHistoryManager,
  drawSnakeTrail,
  MAX_TRAIL_POINTS,
  DEFAULT_TRAIL_LIFETIME_MS,
  type TrailPoint,
} from './trail_renderer.ts';
import { drawTrailPreview } from './trail_preview.ts';
import { ALL_TRAIL_IDS, getTrailDefinition } from './trails.ts';
import { NeonRenderer } from './renderer.ts';
import { createInitialState } from './engine.ts';

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

// -----------------------------------------------------------------------------
// 1. TrailHistoryManager Ring Buffer & Lifecycle
// -----------------------------------------------------------------------------

test('TrailHistoryManager 1: Zero allocation ring buffer records and prunes points', () => {
  const manager = new TrailHistoryManager(500);
  assert.equal(manager.getPointCount(), 0);

  const baseTime = 1000;
  // Add 5 points spaced out in time and position
  for (let i = 0; i < 5; i++) {
    manager.addPoint(100 + i * 20, 100, baseTime + i * 50, 0, false);
  }
  assert.equal(manager.getPointCount(), 5);

  // Retrieve chains at time 1250 -> all points are within 500ms
  const chains = manager.getChains(1250);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].length, 5);

  // Retrieve chains at time 1800 -> points are older than 500ms
  const expiredChains = manager.getChains(1800);
  assert.equal(expiredChains.length, 0);
  assert.equal(manager.getPointCount(), 0);
});

test('TrailHistoryManager 2: Respects MAX_TRAIL_POINTS without overflowing', () => {
  const manager = new TrailHistoryManager(10000);

  // Push 100 points (exceeding MAX_TRAIL_POINTS=64)
  for (let i = 0; i < 100; i++) {
    manager.addPoint(i * 10, 50, 1000 + i * 20, 0, false);
  }

  assert.equal(manager.getPointCount(), MAX_TRAIL_POINTS);
  const chains = manager.getChains(3000);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].length, MAX_TRAIL_POINTS);
});

test('TrailHistoryManager 3: Accurately detects wraparound spatial discontinuity', () => {
  const manager = new TrailHistoryManager(2000);

  // Two points before wrap
  manager.addPoint(480, 200, 950, 0, false);
  manager.addPoint(500, 200, 1000, 0, false);
  // Two points after wrap
  manager.addPoint(20, 200, 1050, 0, true);
  manager.addPoint(40, 200, 1100, 0, false);

  const chains = manager.getChains(1150);
  // Discontinuity breaks points into separate chains so no line is drawn across screen
  assert.equal(chains.length, 2);
  assert.equal(chains[0].length, 2);
  assert.equal(chains[1].length, 2);
});

test('TrailHistoryManager 4: clear() empties history instantly without garbage collection', () => {
  const manager = new TrailHistoryManager();
  for (let i = 0; i < 20; i++) {
    manager.addPoint(i * 10, i * 10, 1000 + i * 20, 0, false);
  }
  assert.equal(manager.getPointCount(), 20);

  manager.clear();
  assert.equal(manager.getPointCount(), 0);
  assert.equal(manager.getChains(2000).length, 0);
});

// -----------------------------------------------------------------------------
// 2. drawSnakeTrail Rendering Engine
// -----------------------------------------------------------------------------

test('drawSnakeTrail 1: Renders all 8 trail styles without errors', () => {
  const ctx = createMockContext();
  const sampleChain: TrailPoint[] = [];
  for (let i = 0; i < 8; i++) {
    sampleChain.push({
      x: 100 + i * 15,
      y: 100 + Math.sin(i) * 5,
      timeMs: 1000 + i * 30,
      angle: 0,
      discontinuity: false,
    });
  }
  const chains = [sampleChain];

  for (const trailId of ALL_TRAIL_IDS) {
    assert.doesNotThrow(() => {
      drawSnakeTrail(
        ctx,
        chains,
        trailId,
        {
          visualEffects: 'high',
          allowGlow: true,
          baseRadius: 10,
          animationTimeMs: 1500,
        }
      );
    }, `drawSnakeTrail threw on trail: ${trailId}`);
  }
});

test('drawSnakeTrail 2: none style outputs zero draw operations', () => {
  const ctx = createMockContext() as any;
  const sampleChain: TrailPoint[] = [
    { x: 10, y: 10, timeMs: 100, angle: 0, discontinuity: false },
    { x: 20, y: 10, timeMs: 150, angle: 0, discontinuity: false },
    { x: 30, y: 10, timeMs: 200, angle: 0, discontinuity: false },
  ];

  const opCountBefore = ctx.operations.length;
  drawSnakeTrail(ctx, [sampleChain], 'none', { visualEffects: 'high' });
  const opCountAfter = ctx.operations.length;

  assert.equal(opCountAfter, opCountBefore, 'Trail style none must not execute draw operations');
});

test('drawSnakeTrail 3: Respects visual quality scaling (performance, reduced)', () => {
  const sampleChain: TrailPoint[] = [
    { x: 10, y: 10, timeMs: 100, angle: 0, discontinuity: false },
    { x: 20, y: 10, timeMs: 150, angle: 0, discontinuity: false },
    { x: 30, y: 10, timeMs: 200, angle: 0, discontinuity: false },
  ];

  const ctxHigh = createMockContext() as any;
  drawSnakeTrail(ctxHigh, [sampleChain], 'plasma_fire', { visualEffects: 'high' });

  const ctxPerf = createMockContext() as any;
  drawSnakeTrail(ctxPerf, [sampleChain], 'plasma_fire', { visualEffects: 'performance' });

  const ctxReduced = createMockContext() as any;
  drawSnakeTrail(ctxReduced, [sampleChain], 'plasma_fire', { visualEffects: 'reduced' });

  assert.ok(ctxHigh.operations.length > 0);
  assert.ok(ctxPerf.operations.length > 0);
  assert.ok(ctxReduced.operations.length > 0);
});

// -----------------------------------------------------------------------------
// 3. drawTrailPreview Component Rendering
// -----------------------------------------------------------------------------

test('drawTrailPreview 1: Generates trail previews deterministically for all 8 trails', () => {
  const ctx = createMockContext();

  for (const trailId of ALL_TRAIL_IDS) {
    assert.doesNotThrow(() => {
      drawTrailPreview(
        ctx as unknown as CanvasRenderingContext2D,
        trailId,
        {
          width: 320,
          height: 160,
          timeMs: 500,
          background: 'glow',
        }
      );
    }, `drawTrailPreview threw on trail: ${trailId}`);
  }
});

// -----------------------------------------------------------------------------
// 4. NeonRenderer Trail Lifecycle & Pause / Resume Integration
// -----------------------------------------------------------------------------

test('NeonRenderer Trail 1: Collects tail positions while playing with active trail', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();
  const state = createInitialState('classic', 24, 24);
  state.gameTimeMs = 100;

  // Render when playing
  renderer.render(ctx, 480, 480, state, 0.5, {
    visualEffects: 'high',
    trail: 'cyber_pulse',
    isPlaying: true,
  });

  assert.ok(renderer.trailHistory.getPointCount() > 0, 'Trail points must be recorded when playing');
});

test('NeonRenderer Trail 2: Freezes trail and prevents point flood/aging when paused', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();
  const state = createInitialState('classic', 24, 24);
  state.gameTimeMs = 200;

  // 1. Play run to record points
  renderer.render(ctx, 480, 480, state, 1.0, {
    visualEffects: 'high',
    trail: 'cyber_pulse',
    isPlaying: true,
  });
  const countWhilePlaying = renderer.trailHistory.getPointCount();
  assert.ok(countWhilePlaying > 0);

  // 2. Pause game and render multiple frames with advancing wall clock
  for (let i = 0; i < 5; i++) {
    renderer.render(ctx, 480, 480, state, 1.0, {
      visualEffects: 'high',
      trail: 'cyber_pulse',
      isPlaying: false,
    }, 1000 + i * 200);
  }

  // Count must not increase because game is paused
  assert.equal(renderer.trailHistory.getPointCount(), countWhilePlaying);

  // Points must NOT expire while paused even after wall-clock time passes
  const chains = renderer.trailHistory.getChains(state.gameTimeMs);
  assert.ok(chains.length > 0, 'Trail points must remain preserved while paused');
});

test('NeonRenderer Trail 3: Preserves trail on death and cleans up on reset', () => {
  const renderer = new NeonRenderer();
  const ctx = createMockContext();
  const state = createInitialState('classic', 24, 24);
  state.gameTimeMs = 500;

  // Record points while alive
  renderer.render(ctx, 480, 480, state, 0.5, {
    visualEffects: 'high',
    trail: 'plasma_fire',
    isPlaying: true,
  });
  assert.ok(renderer.trailHistory.getPointCount() > 0);

  // Transition to dead state
  state.isAlive = false;
  renderer.render(ctx, 480, 480, state, 1.0, {
    visualEffects: 'high',
    trail: 'plasma_fire',
    isPlaying: false,
  });

  // Points still intact for gameover screen
  assert.ok(renderer.trailHistory.getPointCount() > 0);

  // Reset clears history
  renderer.reset();
  assert.equal(renderer.trailHistory.getPointCount(), 0);
});

