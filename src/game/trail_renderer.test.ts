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
  } as unknown as CanvasRenderingContext2D & { operations: string[] };
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

// =============================================================================
// AUDIT REGRESSION TESTS: Finding 2 — Trail Chain Safety Corrections
// =============================================================================

test('Finding 2 Safety 1: A valid caller-supplied threshold correctly splits genuinely distant points', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(260, 100, 1050, 0, false); // 160px step

  // Caller supplies threshold of 100px: distance 160px > 100px must split into 2 chains
  const chains = manager.getChains(1100, 100);
  assert.equal(chains.length, 2, 'Distant points exceeding caller threshold must split into separate chains');
  assert.equal(chains[0].length, 1);
  assert.equal(chains[1].length, 1);

  // If caller threshold is 200px: distance 160px <= 200px remains connected
  const connectedChains = manager.getChains(1100, 200);
  assert.equal(connectedChains.length, 1, 'Points within caller threshold must remain connected');
  assert.equal(connectedChains[0].length, 2);
});

test('Finding 2 Safety 2: Normal high-speed movement remains connected', () => {
  const manager = new TrailHistoryManager(2000);
  // High-frequency sub-tick interpolated movement (e.g. 15px step at 60fps = ~900px/s)
  for (let i = 0; i < 15; i++) {
    manager.addPoint(50 + i * 15, 100 + Math.sin(i * 0.5) * 8, 1000 + i * 16, 0, false);
  }

  const chains = manager.getChains(1250, 150);
  assert.equal(chains.length, 1, 'Normal high-speed interpolated samples must remain a single unbroken chain');
  assert.equal(chains[0].length, 15);
});

test('Finding 2 Safety 3: Large-cell boards remain connected under the actual production threshold', () => {
  const manager = new TrailHistoryManager(2000);
  const cellSize = 80;
  // Step across large cells (e.g. 70-80px per step on a 4K or tablet display)
  for (let i = 0; i < 6; i++) {
    manager.addPoint(100 + i * cellSize, 200, 1000 + i * 50, 0, false);
  }

  // Actual production formula from renderer.ts: Math.max(cellW, cellH) * 3.5 = 280px
  const productionThreshold = cellSize * 3.5;
  const chains = manager.getChains(1300, productionThreshold);

  assert.equal(chains.length, 1, 'Large-cell boards must remain in a single continuous chain under production threshold');
  assert.equal(chains[0].length, 6);
});

test('Finding 2 Safety 4: Explicit wrap/discontinuity flags always split chains correctly', () => {
  const manager = new TrailHistoryManager(2000);
  // Points that are spatially close (only 10px apart) but explicitly flagged as discontinuous (e.g. wrapped boundary)
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(110, 100, 1050, 0, true); // marked discontinuous

  // Even with a very large caller threshold of 500px, explicit discontinuity flag MUST split
  const chains = manager.getChains(1100, 500);
  assert.equal(chains.length, 2, 'Authoritative discontinuity flag must split chains regardless of distance');
  assert.equal(chains[0].length, 1);
  assert.equal(chains[1].length, 1);
});

test('Finding 2 Safety 5: Invalid coordinates cannot create misleading connections', () => {
  const manager = new TrailHistoryManager(2000);
  // 1. addPoint defensively rejects NaN, Infinity, -Infinity
  manager.addPoint(NaN, 100, 1000, 0, false);
  manager.addPoint(100, Infinity, 1050, 0, false);
  manager.addPoint(-Infinity, 100, 1100, 0, false);
  assert.equal(manager.getPointCount(), 0, 'addPoint must reject non-finite coordinates');

  // 2. Even if non-finite coordinates exist in buffer, getChains must never include them or use them to connect points
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);

  // Directly inject a non-finite point into buffer to test defensive getChains isolation
  const internalBuffer = (manager as any).buffer;
  manager.addPoint(140, 100, 1100, 0, false);
  // Corrupt the newest element with NaN
  internalBuffer[(manager as any).head].x = NaN;

  // Add another valid point after the corrupted point
  manager.addPoint(500, 500, 1150, 0, false);

  const chains = manager.getChains(1200, 1000);
  // Invalid point must not be in any chain
  for (const chain of chains) {
    for (const pt of chain) {
      assert.ok(Number.isFinite(pt.x), 'No chain may contain non-finite x');
      assert.ok(Number.isFinite(pt.y), 'No chain may contain non-finite y');
    }
  }

  // The NaN point must have acted as a boundary, splitting (120, 100) and (500, 500)
  assert.ok(chains.length >= 2, 'Invalid point must break continuity and prevent misleading connection');
});

test('Finding 2 Safety 6: Invalid points do not crash the renderer or contaminate subsequent valid chains', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);

  // Inject corrupted points (Infinity, -Infinity)
  const internalBuffer = (manager as any).buffer;
  manager.addPoint(140, 100, 1100, 0, false);
  internalBuffer[(manager as any).head].x = Infinity;

  manager.addPoint(200, 200, 1150, 0, false);
  manager.addPoint(220, 200, 1200, 0, false);

  const chains = manager.getChains(1250, 200);
  // Subsequent valid points (200, 200) and (220, 200) must form a clean valid chain
  const validChain = chains.find(c => c.length === 2 && c.some(p => p.x === 220));
  assert.ok(validChain, 'Subsequent valid points must form a valid chain without contamination');

  // Verify drawSnakeTrail does not crash with these chains
  const ctx = createMockContext();
  assert.doesNotThrow(() => {
    drawSnakeTrail(ctx as unknown as CanvasRenderingContext2D, chains, 'cyber_pulse');
  }, 'Renderer must not crash when rendering chains extracted around invalid points');
});

test('Finding 2 Safety 7: Omitting the optional threshold follows the newly documented safe behavior', () => {
  // A. Adaptive stride: normal movement with established stride stays connected
  const manager = new TrailHistoryManager(2000);
  for (let i = 0; i < 5; i++) {
    manager.addPoint(100 + i * 20, 100, 1000 + i * 50, 0, false);
  }
  const continuousChains = manager.getChains(1300); // no threshold supplied
  assert.equal(continuousChains.length, 1, 'Normal movement with empirical stride must remain unbroken without threshold');
  assert.equal(continuousChains[0].length, 5);

  // B. Adaptive stride: unexpected spatial outlier (teleport of 800px) in a 20px stride trajectory splits
  manager.addPoint(920, 100, 1250, 0, false);
  const splitChains = manager.getChains(1300); // no threshold supplied
  assert.equal(splitChains.length, 2, 'Unexpected spatial leap exceeding adaptive stride must be split');

  // C. Velocity safety limit: 2 points with extreme velocity (> 3.5 px/ms) are split
  const managerVelocity = new TrailHistoryManager(2000);
  managerVelocity.addPoint(100, 100, 1000, 0, false);
  managerVelocity.addPoint(900, 900, 1050, 0, false); // 1131px in 50ms = 22.6 px/ms
  const velocityChains = managerVelocity.getChains(1100);
  assert.equal(velocityChains.length, 2, 'Two points with extreme velocity must be split as spatially unrelated');

  // D. Instantaneous jump: 2 points with dt = 0 and spatial displacement are split
  const managerInstant = new TrailHistoryManager(2000);
  managerInstant.addPoint(100, 100, 1000, 0, false);
  managerInstant.addPoint(400, 100, 1000, 0, false); // dt = 0, displacement = 300px
  const instantChains = managerInstant.getChains(1050);
  assert.equal(instantChains.length, 2, 'Instantaneous displacement with zero time delta must be split');

  // E. Instance-level defaultMaxLinkDistance is respected when configured
  const managerDefault = new TrailHistoryManager(2000, 150);
  managerDefault.addPoint(100, 100, 1000, 0, false);
  managerDefault.addPoint(300, 100, 1050, 0, false); // 200px step > 150px default
  const defaultChains = managerDefault.getChains(1100);
  assert.equal(defaultChains.length, 2, 'Configured defaultMaxLinkDistance must be used when threshold is omitted');
});

test('Finding 2 Safety 8: Existing trail behavior remains unchanged for valid normal inputs', () => {
  const manager = new TrailHistoryManager(650);
  const baseTime = 2000;
  // Typical snake movement in normal gameplay (e.g. 25px per tick at 100ms ticks)
  for (let i = 0; i < 5; i++) {
    manager.addPoint(200 + i * 25, 300, baseTime + i * 100, 0, false);
  }

  // 1. With production threshold
  const prodChains = manager.getChains(baseTime + 450, 100);
  assert.equal(prodChains.length, 1, 'Valid normal input must produce 1 continuous chain with caller threshold');
  assert.equal(prodChains[0].length, 5);

  // 2. Without threshold
  const noThreshChains = manager.getChains(baseTime + 450);
  assert.equal(noThreshChains.length, 1, 'Valid normal input must produce 1 continuous chain without threshold');
  assert.equal(noThreshChains[0].length, 5);

  // 3. Render check
  const ctx = createMockContext();
  drawSnakeTrail(ctx as unknown as CanvasRenderingContext2D, prodChains, 'matrix_stream');
  assert.ok(ctx.operations.length > 0, 'drawSnakeTrail must render valid operations for standard inputs');
});

test('Finding 4 Regression: drawTrailPreview clears canvas on transparent background to prevent frame accumulation', () => {
  const ctx = createMockContext();

  const result = drawTrailPreview(ctx as unknown as CanvasRenderingContext2D, 'cyber_pulse', {
    width: 200,
    height: 100,
    timeMs: 200,
    background: 'transparent',
  });

  assert.equal(result.success, true);
  // Must call clearRect first to clean up previous frame pixels
  const hasClearRect = ctx.operations.some(op => op.startsWith('clearRect(0,0,200,100)'));
  assert.ok(hasClearRect, 'clearRect must be called to purge previous frame in transparent mode');

  // Must NOT draw the opaque background rect in transparent mode
  const hasBackgroundFill = ctx.operations.some(op => op.startsWith('fillRect(0,0,200,100)'));
  assert.equal(hasBackgroundFill, false, 'Opaque background fillRect must not be called in transparent mode');
});

test('Finding 4 Regression: drawTrailPreview draws background fill and clearRect in non-transparent mode', () => {
  const ctx = createMockContext();

  const result = drawTrailPreview(ctx as unknown as CanvasRenderingContext2D, 'cyber_pulse', {
    width: 200,
    height: 100,
    timeMs: 200,
    background: 'glow',
  });

  assert.equal(result.success, true);
  // Must call clearRect before drawing
  const hasClearRect = ctx.operations.some(op => op.startsWith('clearRect(0,0,200,100)'));
  assert.ok(hasClearRect, 'clearRect must be called first');

  // Must draw the background fill in glow mode
  const hasBackgroundFill = ctx.operations.some(op => op.startsWith('fillRect(0,0,200,100)'));
  assert.ok(hasBackgroundFill, 'fillRect must be called for background in glow mode');
});

