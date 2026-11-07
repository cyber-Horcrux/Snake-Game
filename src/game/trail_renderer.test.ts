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

// =============================================================================
// CORRECTION A: Adaptive Distance Estimator Edge Cases
// =============================================================================

test('Correction A1: Two observed strides with one normal and one extreme jump splits the jump', () => {
  const manager = new TrailHistoryManager(2000);
  // A = 100, B = 120, C = 920. Strides: 20px and 800px.
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  manager.addPoint(920, 100, 1100, 0, false);

  const chains = manager.getChains(1150);
  // Must NOT select 800px as median and connect! Jump must be split.
  assert.equal(chains.length, 2, 'Two strides with an extreme outlier must split into 2 chains');
  // Newest point C(920) is in chain 0 (length 1), B(120) and A(100) are in chain 1 (length 2)
  assert.equal(chains[0].length, 1);
  assert.equal(chains[0][0].x, 920);
  assert.equal(chains[1].length, 2);
  assert.equal(chains[1][0].x, 120);
  assert.equal(chains[1][1].x, 100);

  // Also verify reversed stride order: extreme jump first, then normal stride
  const manager2 = new TrailHistoryManager(2000);
  manager2.addPoint(100, 100, 1000, 0, false);
  manager2.addPoint(900, 100, 1050, 0, false); // 800px jump
  manager2.addPoint(920, 100, 1100, 0, false); // 20px normal stride

  const chains2 = manager2.getChains(1150);
  assert.equal(chains2.length, 2, 'Jump followed by normal stride must split into 2 chains');
  assert.equal(chains2[0].length, 2, 'Recent 20px stride remains connected');
  assert.equal(chains2[1].length, 1, 'Older point before jump is isolated');
});

test('Correction A2: Three normal strides followed by a teleport splits the teleport', () => {
  const manager = new TrailHistoryManager(2000);
  // P0, P1, P2, P3 have 20px normal strides, P4 is an 800px teleport
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  manager.addPoint(140, 100, 1100, 0, false);
  manager.addPoint(160, 100, 1150, 0, false);
  manager.addPoint(960, 100, 1200, 0, false); // teleport

  const chains = manager.getChains(1250);
  assert.equal(chains.length, 2, 'Teleport after three normal strides must split');
  assert.equal(chains[0].length, 1, 'Teleported point is isolated');
  assert.equal(chains[0][0].x, 960);
  assert.equal(chains[1].length, 4, 'Four normal points remain connected');
  assert.equal(chains[1][0].x, 160);
  assert.equal(chains[1][3].x, 100);
});

test('Correction A3: Very short histories with one, two, or three usable strides behave safely', () => {
  // A. One stride normal: 20px in 50ms (0.4 px/ms)
  const manager1Normal = new TrailHistoryManager(2000);
  manager1Normal.addPoint(100, 100, 1000, 0, false);
  manager1Normal.addPoint(120, 100, 1050, 0, false);
  const chains1Normal = manager1Normal.getChains(1100);
  assert.equal(chains1Normal.length, 1, 'Single normal stride remains connected');
  assert.equal(chains1Normal[0].length, 2);

  // B. One stride teleport: 800px in 50ms (16 px/ms)
  const manager1Jump = new TrailHistoryManager(2000);
  manager1Jump.addPoint(100, 100, 1000, 0, false);
  manager1Jump.addPoint(900, 100, 1050, 0, false);
  const chains1Jump = manager1Jump.getChains(1100);
  assert.equal(chains1Jump.length, 2, 'Single extreme jump is split');

  // C. Two strides normal: 20px and 22px
  const manager2Normal = new TrailHistoryManager(2000);
  manager2Normal.addPoint(100, 100, 1000, 0, false);
  manager2Normal.addPoint(120, 100, 1050, 0, false);
  manager2Normal.addPoint(142, 100, 1100, 0, false);
  const chains2Normal = manager2Normal.getChains(1150);
  assert.equal(chains2Normal.length, 1, 'Two normal strides remain connected');
  assert.equal(chains2Normal[0].length, 3);

  // D. Three strides normal: 20px, 20px, 20px
  const manager3Normal = new TrailHistoryManager(2000);
  manager3Normal.addPoint(100, 100, 1000, 0, false);
  manager3Normal.addPoint(120, 100, 1050, 0, false);
  manager3Normal.addPoint(140, 100, 1100, 0, false);
  manager3Normal.addPoint(160, 100, 1150, 0, false);
  const chains3Normal = manager3Normal.getChains(1200);
  assert.equal(chains3Normal.length, 1, 'Three normal strides remain connected');
  assert.equal(chains3Normal[0].length, 4);
});

test('Correction A4: Consistent normal movement remains fully connected', () => {
  const manager = new TrailHistoryManager(2000);
  for (let i = 0; i < 10; i++) {
    manager.addPoint(100 + i * 20, 200, 1000 + i * 50, 0, false);
  }
  const chains = manager.getChains(1600);
  assert.equal(chains.length, 1, 'Ten normal strides must produce a single continuous chain');
  assert.equal(chains[0].length, 10);
});

test('Correction A5: Legitimate gradual speed increases remain connected without trail fragmentation', () => {
  const manager = new TrailHistoryManager(2000);
  // Strides increasing from 18px to 42px (e.g. speed boost or rush acceleration)
  const strides = [18, 22, 27, 34, 42];
  let currentX = 100;
  let currentTime = 1000;
  manager.addPoint(currentX, 200, currentTime, 0, false);

  for (const s of strides) {
    currentX += s;
    currentTime += 45;
    manager.addPoint(currentX, 200, currentTime, 0, false);
  }

  const chains = manager.getChains(currentTime + 50);
  assert.equal(chains.length, 1, 'Gradual speed increases must not fragment into multiple chains');
  assert.equal(chains[0].length, 6);
});

test('Correction A6: Explicit caller-provided threshold takes priority over adaptive estimator', () => {
  const manager = new TrailHistoryManager(2000);
  // Normal strides around 20px
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  manager.addPoint(140, 100, 1100, 0, false);

  // Caller specifies an artificially strict threshold of 15px (smaller than 20px stride)
  const strictChains = manager.getChains(1150, 15);
  assert.equal(strictChains.length, 3, 'Caller threshold of 15px must split 20px steps');

  // Caller specifies generous threshold of 50px
  const generousChains = manager.getChains(1150, 50);
  assert.equal(generousChains.length, 1, 'Caller threshold of 50px must connect 20px steps');
});

test('Correction A7: Discontinuity markers always split chains even with small strides', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(110, 100, 1050, 0, true); // marked discontinuous with 10px step
  manager.addPoint(120, 100, 1100, 0, false);

  const chains = manager.getChains(1150);
  assert.equal(chains.length, 2, 'Explicit discontinuity flag must split chains');
  assert.equal(chains[0].length, 2);
  assert.equal(chains[1].length, 1);
});

// =============================================================================
// CORRECTION B: Distance Overflow & Numerical Safety
// =============================================================================

test('Correction B1: Very large finite coordinates calculate distance accurately without overflow', () => {
  const manager = new TrailHistoryManager(2000);
  const largeBase = 1e12;
  manager.addPoint(largeBase, largeBase, 1000, 0, false);
  manager.addPoint(largeBase + 25, largeBase, 1050, 0, false);
  manager.addPoint(largeBase + 50, largeBase, 1100, 0, false);

  const chains = manager.getChains(1150, 100);
  assert.equal(chains.length, 1, 'Large finite coordinates with small displacement must stay connected');
  assert.equal(chains[0].length, 3);
});

test('Correction B2: Coordinates whose subtraction overflows to Infinity are treated as discontinuities', () => {
  const manager = new TrailHistoryManager(2000);
  // dx = 1e308 - (-1e308) = Infinity
  manager.addPoint(1e308, 0, 1000, 0, false);
  manager.addPoint(-1e308, 0, 1050, 0, false);

  const chains = manager.getChains(1100, 1000);
  assert.equal(chains.length, 2, 'Overflow to Infinity must split into separate chains');
  assert.equal(chains[0].length, 1);
  assert.equal(chains[1].length, 1);
});

test('Correction B3: Very large finite distance thresholds do not mask infinite distance jumps', () => {
  const manager = new TrailHistoryManager(2000);
  // Normal points connected with large threshold 1e308
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(200, 100, 1050, 0, false);
  const normalChains = manager.getChains(1100, 1e308);
  assert.equal(normalChains.length, 1, 'Finite distance connects under large finite threshold');

  // Infinite distance jump with 1e308 threshold
  const managerOverflow = new TrailHistoryManager(2000);
  managerOverflow.addPoint(1e308, 0, 1000, 0, false);
  managerOverflow.addPoint(-1e308, 0, 1050, 0, false);
  const overflowChains = managerOverflow.getChains(1100, 1e308);
  assert.equal(overflowChains.length, 2, 'Infinite distance must split even if threshold is 1e308');
});

test('Correction B4: Invalid thresholds are handled safely and fall back without throwing', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);

  const invalidThresholds = [NaN, Infinity, -Infinity, 0, -50];
  for (const t of invalidThresholds) {
    assert.doesNotThrow(() => {
      const chains = manager.getChains(1100, t);
      assert.equal(chains.length, 1, `Invalid threshold ${t} must safely fall back and connect normal points`);
    }, `getChains threw on invalid threshold: ${t}`);
  }

  // setDefaultMaxLinkDistance validation
  for (const t of invalidThresholds) {
    manager.setDefaultMaxLinkDistance(t);
    assert.equal(manager.getDefaultMaxLinkDistance(), undefined, `Invalid default threshold ${t} must reset to undefined`);
  }
});

test('Correction B5: Normal gameplay-scale distances compute without distortion', () => {
  const manager = new TrailHistoryManager(2000);
  // Typical cell step (32px) and diagonal step (Math.hypot(32, 32) ~= 45.25px)
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(132, 100, 1050, 0, false);
  manager.addPoint(164, 132, 1100, 0, false);

  const chains = manager.getChains(1150, 60);
  assert.equal(chains.length, 1, 'Standard gameplay distances must connect cleanly');
  assert.equal(chains[0].length, 3);
});

// =============================================================================
// CORRECTION C: Timestamp Ordering & History Integrity
// =============================================================================

test('Correction C1: Equal timestamps with negligible displacement are deduplicated', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  assert.equal(manager.getPointCount(), 1);

  // Duplicate sample at exact same timestamp and position
  manager.addPoint(100, 100, 1000, 0, false);
  assert.equal(manager.getPointCount(), 1, 'Identical sample at same timestamp must be deduplicated');

  // Sub-pixel displacement (< 0.25px) at same timestamp
  manager.addPoint(100.1, 100.1, 1000, 0, false);
  assert.equal(manager.getPointCount(), 1, 'Negligible displacement at same timestamp must be deduplicated');
});

test('Correction C2: Equal timestamps with non-zero displacement are split into separate chains', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  // Displacement of 80px at exact same millisecond
  manager.addPoint(180, 100, 1000, 0, false);
  assert.equal(manager.getPointCount(), 2, 'Non-zero displacement at same timestamp is recorded');

  const chains = manager.getChains(1050);
  assert.equal(chains.length, 2, 'Points at same timestamp with displacement must split (never link)');
  assert.equal(chains[0].length, 1);
  assert.equal(chains[1].length, 1);
});

test('Correction C3: Decreasing timestamps are rejected to prevent ring buffer corruption', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  assert.equal(manager.getPointCount(), 2);

  // Attempt to add a sample with a backward timestamp (900 < 1050)
  manager.addPoint(140, 100, 900, 0, false);
  assert.equal(manager.getPointCount(), 2, 'Backward timestamp sample must be rejected');

  // Add next valid forward sample
  manager.addPoint(140, 100, 1100, 0, false);
  assert.equal(manager.getPointCount(), 3, 'Valid forward sample must be accepted');

  const chains = manager.getChains(1150);
  assert.equal(chains.length, 1, 'Valid samples must form a continuous chain without buffer corruption');
  assert.equal(chains[0].length, 3);
});

test('Correction C4: Very small positive timestamp differences are handled safely', () => {
  const manager = new TrailHistoryManager(2000);
  // Sub-millisecond continuous interpolation: dt = 0.05ms, dist = 0.05px (velocity 1 px/ms <= 3.5)
  manager.addPoint(100.0, 100, 1000.0, 0, false);
  manager.addPoint(100.05, 100, 1000.05, 0, false);

  const chains = manager.getChains(1050);
  assert.equal(chains.length, 1, 'Micro-step with valid velocity remains connected');

  // Large displacement with tiny dt: dt = 0.05ms, dist = 50px (velocity 1000 px/ms > 3.5)
  manager.addPoint(150.0, 100, 1000.1, 0, false);
  const chainsJump = manager.getChains(1050);
  assert.equal(chainsJump.length, 2, 'Tiny positive dt with extreme velocity must split');
});

test('Correction C5: Non-finite timestamps are rejected defensively', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, NaN, 0, false);
  manager.addPoint(100, 100, Infinity, 0, false);
  manager.addPoint(100, 100, -Infinity, 0, false);
  assert.equal(manager.getPointCount(), 0, 'Non-finite timestamps must be rejected');
});

test('Correction C6: History remains fully usable after rejected samples', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);

  // Rejected samples of various types
  manager.addPoint(110, 100, NaN, 0, false);
  manager.addPoint(110, 100, 500, 0, false);
  manager.addPoint(NaN, 100, 1050, 0, false);
  manager.addPoint(110, Infinity, 1050, 0, false);

  assert.equal(manager.getPointCount(), 1, 'Invalid samples must not modify buffer');

  // Subsequent valid sample
  manager.addPoint(120, 100, 1050, 0, false);
  assert.equal(manager.getPointCount(), 2);

  const chains = manager.getChains(1100);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].length, 2);
});

test('Correction C7: History pruning functions accurately after unusual timestamp inputs', () => {
  const manager = new TrailHistoryManager(500); // 500ms lifetime
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1100, 0, false);
  manager.addPoint(140, 100, 1200, 0, false);
  assert.equal(manager.getPointCount(), 3);

  // Attempted backward insertion
  manager.addPoint(150, 100, 950, 0, false);
  assert.equal(manager.getPointCount(), 3);

  // At time 1550 (minTime = 1050): point 1000 is expired, points 1100 and 1200 are active
  const chains = manager.getChains(1550);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].length, 2);
  assert.equal(manager.getPointCount(), 2, 'Buffer count pruned to 2 active points');

  // At time 1800 (minTime = 1300): all points are expired
  const expiredChains = manager.getChains(1800);
  assert.equal(expiredChains.length, 0);
  assert.equal(manager.getPointCount(), 0, 'Buffer count pruned to 0');
});

test('Correction C8: High-frequency chronological input remains unbroken', () => {
  const manager = new TrailHistoryManager(2000);
  // Simulate 15 consecutive 60fps frames (16.6ms intervals, 8px steps)
  for (let i = 0; i < 15; i++) {
    manager.addPoint(100 + i * 8, 100, 1000 + i * 16.6, 0, false);
  }
  const chains = manager.getChains(1300);
  assert.equal(chains.length, 1, 'Chronological 60fps movement must form 1 unbroken chain');
  assert.equal(chains[0].length, 15);
});

// =============================================================================
// ADAPTIVE ESTIMATOR MULTI-JUMP INTEGRITY TESTS
// =============================================================================

test('Adaptive Multi-Jump 1: One normal stride followed by two 800px jumps over 300ms splits both jumps', () => {
  const manager = new TrailHistoryManager(3000);
  // Stride 1: 20px over 50ms (0.4 px/ms)
  // Jump 1: 800px over 300ms (2.67 px/ms <= 3.5 px/ms velocity limit)
  // Jump 2: 800px over 300ms (2.67 px/ms <= 3.5 px/ms velocity limit)
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  manager.addPoint(920, 100, 1350, 0, false);
  manager.addPoint(1720, 100, 1650, 0, false);

  const chains = manager.getChains(1700);
  assert.equal(chains.length, 3, 'Must split into 3 chains: normal stride and 2 isolated jump points');
  // Newest point (1720) in chain 0 (length 1)
  assert.equal(chains[0].length, 1);
  assert.equal(chains[0][0].x, 1720);
  // Middle point (920) in chain 1 (length 1)
  assert.equal(chains[1].length, 1);
  assert.equal(chains[1][0].x, 920);
  // Normal stride points (120, 100) in chain 2 (length 2)
  assert.equal(chains[2].length, 2);
  assert.equal(chains[2][0].x, 120);
  assert.equal(chains[2][1].x, 100);
});

test('Adaptive Multi-Jump 2: One normal stride followed by three consecutive large jumps splits all jumps', () => {
  const manager = new TrailHistoryManager(3000);
  // Normal: 20px over 50ms
  // Three consecutive jumps: 750px over 250ms each (3.0 px/ms <= 3.5 px/ms)
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  manager.addPoint(870, 100, 1300, 0, false);
  manager.addPoint(1620, 100, 1550, 0, false);
  manager.addPoint(2370, 100, 1800, 0, false);

  const chains = manager.getChains(1900);
  assert.equal(chains.length, 4, 'All three consecutive jumps must be separated into isolated chains');
  assert.equal(chains[0].length, 1);
  assert.equal(chains[0][0].x, 2370);
  assert.equal(chains[1].length, 1);
  assert.equal(chains[1][0].x, 1620);
  assert.equal(chains[2].length, 1);
  assert.equal(chains[2][0].x, 870);
  assert.equal(chains[3].length, 2);
  assert.equal(chains[3][0].x, 120);
  assert.equal(chains[3][1].x, 100);
});

test('Adaptive Multi-Jump 3: Reversed ordering with abnormal jumps first followed by normal movement', () => {
  const manager = new TrailHistoryManager(3000);
  // Two large jumps first: 800px over 300ms each (velocity 2.67 px/ms <= 3.5 px/ms)
  // Followed by two normal strides: 20px over 50ms each
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(900, 100, 1300, 0, false);  // 800px jump
  manager.addPoint(1700, 100, 1600, 0, false); // 800px jump
  manager.addPoint(1720, 100, 1650, 0, false); // 20px normal
  manager.addPoint(1740, 100, 1700, 0, false); // 20px normal

  const chains = manager.getChains(1750);
  assert.equal(chains.length, 3, 'Abnormal jumps must not link to each other, and normal movement must link');
  // Newest chain contains the normal movement (1740, 1720, 1700)
  assert.equal(chains[0].length, 3);
  assert.equal(chains[0][0].x, 1740);
  assert.equal(chains[0][1].x, 1720);
  assert.equal(chains[0][2].x, 1700);
  // Older jumps are isolated
  assert.equal(chains[1].length, 1);
  assert.equal(chains[1][0].x, 900);
  assert.equal(chains[2].length, 1);
  assert.equal(chains[2][0].x, 100);
});

test('Adaptive Multi-Jump 4: A rejected jump does not influence the threshold for the next candidate', () => {
  const manager = new TrailHistoryManager(3000);
  // Normal stride: 20px over 50ms
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  // Rejected jump: 800px over 300ms (2.67 px/ms)
  manager.addPoint(920, 100, 1350, 0, false);
  // Candidate stride: 150px over 50ms (3.0 px/ms <= 3.5 px/ms).
  // If the 800px jump had inflated the threshold (800 * 4.5 = 3600px), 150px would be accepted!
  // With baseline 20px, maxAllowed is 90px, so 150px must be rejected.
  manager.addPoint(1070, 100, 1400, 0, false);

  const chains = manager.getChains(1450);
  assert.equal(chains.length, 3, 'The rejected jump must not inflate threshold to accept the 150px step');
  assert.equal(chains[0].length, 1);
  assert.equal(chains[0][0].x, 1070);
  assert.equal(chains[1].length, 1);
  assert.equal(chains[1][0].x, 920);
  assert.equal(chains[2].length, 2);
  assert.equal(chains[2][0].x, 120);
  assert.equal(chains[2][1].x, 100);
});

test('Adaptive Multi-Jump 5: Normal consistent movement remains connected', () => {
  const manager = new TrailHistoryManager(3000);
  for (let i = 0; i < 12; i++) {
    manager.addPoint(100 + i * 22, 200, 1000 + i * 50, 0, false);
  }
  const chains = manager.getChains(1650);
  assert.equal(chains.length, 1, 'Consistent normal strides must form 1 unbroken chain');
  assert.equal(chains[0].length, 12);
});

test('Adaptive Multi-Jump 6: Gradual acceleration remains connected across multiple speed tiers', () => {
  const manager = new TrailHistoryManager(3000);
  // Strides accelerating from 16px to 56px
  const strides = [16, 20, 26, 34, 44, 56];
  let currentX = 100;
  let currentTime = 1000;
  manager.addPoint(currentX, 200, currentTime, 0, false);

  for (const s of strides) {
    currentX += s;
    currentTime += 45;
    manager.addPoint(currentX, 200, currentTime, 0, false);
  }

  const chains = manager.getChains(currentTime + 50);
  assert.equal(chains.length, 1, 'Gradual acceleration must not fragment into multiple chains');
  assert.equal(chains[0].length, strides.length + 1);
});

test('Adaptive Multi-Jump 7: Existing short-history behavior remains sensible', () => {
  // A. Single normal stride remains 1 chain of 2 points
  const manager1 = new TrailHistoryManager(2000);
  manager1.addPoint(100, 100, 1000, 0, false);
  manager1.addPoint(120, 100, 1050, 0, false);
  const chains1 = manager1.getChains(1100);
  assert.equal(chains1.length, 1);
  assert.equal(chains1[0].length, 2);

  // B. Single extreme velocity jump splits
  const managerJump = new TrailHistoryManager(2000);
  managerJump.addPoint(100, 100, 1000, 0, false);
  managerJump.addPoint(900, 100, 1050, 0, false); // 800px in 50ms = 16 px/ms
  const chainsJump = managerJump.getChains(1100);
  assert.equal(chainsJump.length, 2);

  // C. Two normal strides remain 1 chain of 3 points
  const manager2 = new TrailHistoryManager(2000);
  manager2.addPoint(100, 100, 1000, 0, false);
  manager2.addPoint(120, 100, 1050, 0, false);
  manager2.addPoint(142, 100, 1100, 0, false);
  const chains2 = manager2.getChains(1150);
  assert.equal(chains2.length, 1);
  assert.equal(chains2[0].length, 3);
});

test('Adaptive Multi-Jump 8: Velocity protection independently splits excessive speed even with small strides', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  // 50px displacement in 5ms = 10 px/ms > 3.5 px/ms
  manager.addPoint(150, 100, 1005, 0, false);
  const chains = manager.getChains(1050);
  assert.equal(chains.length, 2, 'Velocity exceeding 3.5 px/ms must split as physical impossibility');
});

test('Adaptive Multi-Jump 9: Explicit caller thresholds still take absolute priority', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false); // 20px stride

  // Stricter explicit threshold of 15px splits 20px stride
  const strictChains = manager.getChains(1100, 15);
  assert.equal(strictChains.length, 2, 'Explicit 15px threshold must split 20px stride');

  // Generous explicit threshold of 1000px connects large stride
  manager.addPoint(400, 100, 1100, 0, false); // 280px step
  const generousChains = manager.getChains(1150, 1000);
  assert.equal(generousChains.length, 1, 'Explicit 1000px threshold must connect points within threshold');
});

test('Adaptive Multi-Jump 10: Explicit discontinuity markers still split chains regardless of adaptive baseline', () => {
  const manager = new TrailHistoryManager(2000);
  manager.addPoint(100, 100, 1000, 0, false);
  manager.addPoint(120, 100, 1050, 0, false);
  // Small 15px stride explicitly marked discontinuous (e.g. wrapped boundary)
  manager.addPoint(135, 100, 1100, 0, true);
  manager.addPoint(155, 100, 1150, 0, false);

  const chains = manager.getChains(1200);
  assert.equal(chains.length, 2, 'Discontinuity marker must split chains despite small strides');
  assert.equal(chains[0].length, 2);
  assert.equal(chains[1].length, 2);
});



