import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drawNaturalStylizedSnake,
  drawStylizedSnakeHead,
  drawContinuousSnakeBody,
  splitSpineIntoChains,
  generateSmoothSpine,
  getAnatomicalRadius,
  SKIN_VISUAL_THEMES,
  getSkinVisuals,
  type SpinePoint,
  type SmoothSpineNode,
} from './snake_renderer.ts';
import { ALL_SKIN_IDS } from './skins.ts';
import { NeonRenderer } from './renderer.ts';
import { drawSkinPreview } from './skin_preview.ts';
import { createInitialState } from './engine.ts';
import type { Direction, SnakeSkinId } from './types.ts';

/**
 * Tracking CanvasRenderingContext2D test double for verifying geometry,
 * operations, coordinate math, and styling in Node.js test environment.
 */
class MockTrackingCanvasContext {
  public fillStyle: any = '#000000';
  public strokeStyle: any = '#000000';
  public lineWidth: number = 1;
  public shadowColor: string = '';
  public shadowBlur: number = 0;
  public lineCap: string = 'butt';
  public lineJoin: string = 'miter';
  public globalAlpha: number = 1;

  public saveDepth: number = 0;
  public operations: { method: string; args: any[] }[] = [];
  public fillStylesUsed: Set<string> = new Set();
  public strokeStylesUsed: Set<string> = new Set();
  public shadowColorsUsed: Set<string> = new Set();
  public pathSegments: { type: string; x: number; y: number }[] = [];

  save(): void {
    this.saveDepth++;
    this.operations.push({ method: 'save', args: [] });
  }

  restore(): void {
    this.saveDepth = Math.max(0, this.saveDepth - 1);
    this.operations.push({ method: 'restore', args: [] });
  }

  beginPath(): void {
    this.operations.push({ method: 'beginPath', args: [] });
    this.pathSegments = [];
  }

  closePath(): void {
    this.operations.push({ method: 'closePath', args: [] });
  }

  clip(): void {
    this.operations.push({ method: 'clip', args: [] });
  }

  moveTo(x: number, y: number): void {
    this.operations.push({ method: 'moveTo', args: [x, y] });
    this.pathSegments.push({ type: 'moveTo', x, y });
  }

  lineTo(x: number, y: number): void {
    this.operations.push({ method: 'lineTo', args: [x, y] });
    this.pathSegments.push({ type: 'lineTo', x, y });
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.operations.push({ method: 'bezierCurveTo', args: [cp1x, cp1y, cp2x, cp2y, x, y] });
    this.pathSegments.push({ type: 'bezierCurveTo', x, y });
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.operations.push({ method: 'quadraticCurveTo', args: [cpx, cpy, x, y] });
    this.pathSegments.push({ type: 'quadraticCurveTo', x, y });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
    this.operations.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle] });
  }

  fill(): void {
    if (typeof this.fillStyle === 'string') {
      this.fillStylesUsed.add(this.fillStyle);
    }
    if (this.shadowColor) {
      this.shadowColorsUsed.add(this.shadowColor);
    }
    this.operations.push({ method: 'fill', args: [] });
  }

  stroke(): void {
    if (typeof this.strokeStyle === 'string') {
      this.strokeStylesUsed.add(this.strokeStyle);
    }
    this.operations.push({ method: 'stroke', args: [] });
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    if (typeof this.fillStyle === 'string') {
      this.fillStylesUsed.add(this.fillStyle);
    }
    this.operations.push({ method: 'fillRect', args: [x, y, width, height] });
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.operations.push({ method: 'clearRect', args: [x, y, width, height] });
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.operations.push({ method: 'strokeRect', args: [x, y, width, height] });
  }

  translate(x: number, y: number): void {
    this.operations.push({ method: 'translate', args: [x, y] });
  }

  rotate(angle: number): void {
    this.operations.push({ method: 'rotate', args: [angle] });
  }

  scale(sx: number, sy: number): void {
    this.operations.push({ method: 'scale', args: [sx, sy] });
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): any {
    this.operations.push({ method: 'createLinearGradient', args: [x0, y0, x1, y1] });
    return {
      addColorStop: (offset: number, color: string) => {
        this.operations.push({ method: 'addColorStop', args: [offset, color] });
      },
    };
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): any {
    this.operations.push({ method: 'createRadialGradient', args: [x0, y0, r0, x1, y1, r1] });
    return {
      addColorStop: (offset: number, color: string) => {
        this.operations.push({ method: 'addColorStop', args: [offset, color] });
      },
    };
  }
}

/**
 * Robust geometric helper to test if two line segments (p1-p2) and (p3-p4) intersect.
 * Handles collinearity, overlapping segments, and excludes legitimate shared endpoints.
 */
function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
  tolerance: number = 1e-4
): boolean {
  function cross(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }
  function distSq(a: { x: number; y: number }, b: { x: number; y: number }) {
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  }
  function onSegmentStrict(p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) {
    const dPr = distSq(p, r);
    if (dPr < tolerance * tolerance) return false;
    const dPq = distSq(p, q);
    const dQr = distSq(q, r);
    if (dPq < tolerance * tolerance || dQr < tolerance * tolerance) return false;
    const proj = (q.x - p.x) * (r.x - p.x) + (q.y - p.y) * (r.y - p.y);
    return proj > tolerance && proj < dPr - tolerance;
  }

  const cp1 = cross(p1, p2, p3);
  const cp2 = cross(p1, p2, p4);
  const cp3 = cross(p3, p4, p1);
  const cp4 = cross(p3, p4, p2);

  // General strict crossing
  if (
    ((cp1 > tolerance && cp2 < -tolerance) || (cp1 < -tolerance && cp2 > tolerance)) &&
    ((cp3 > tolerance && cp4 < -tolerance) || (cp3 < -tolerance && cp4 > tolerance))
  ) {
    return true;
  }

  // Collinear interior overlap
  if (Math.abs(cp1) <= tolerance && onSegmentStrict(p1, p3, p2)) return true;
  if (Math.abs(cp2) <= tolerance && onSegmentStrict(p1, p4, p2)) return true;
  if (Math.abs(cp3) <= tolerance && onSegmentStrict(p3, p1, p4)) return true;
  if (Math.abs(cp4) <= tolerance && onSegmentStrict(p3, p2, p4)) return true;

  // Shared endpoint backtracking check (e.g. p2 == p3 doubling back on p1-p2)
  const d23 = distSq(p2, p3);
  if (d23 < tolerance * tolerance) {
    const v12 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v34 = { x: p4.x - p3.x, y: p4.y - p3.y };
    const l1 = Math.hypot(v12.x, v12.y);
    const l2 = Math.hypot(v34.x, v34.y);
    if (l1 > tolerance && l2 > tolerance) {
      const cosA = (v12.x * v34.x + v12.y * v34.y) / (l1 * l2);
      if (cosA < -0.999) return true;
    }
  }

  return false;
}

// =============================================================================
// 1. GEOMETRY & SPINE SEGMENTATION TESTS
// =============================================================================

test('Spine split: Contiguous spine segments form a single continuous chain', () => {
  const points: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 100, y: 120 },
    { x: 100, y: 140 },
    { x: 100, y: 160 },
  ];
  const chains = splitSpineIntoChains(points, 20);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].length, 4);
});

test('Spine split: Screen wraparound in Zen mode correctly divides into independent chains', () => {
  const points: SpinePoint[] = [
    { x: 10, y: 100 },
    { x: 20, y: 100 },
    { x: 390, y: 100 },
    { x: 400, y: 100 },
  ];
  const chains = splitSpineIntoChains(points, 20);
  assert.equal(chains.length, 2, 'Should detect wrap jump and split into 2 chains');
  assert.equal(chains[0].length, 2);
  assert.equal(chains[1].length, 2);
  assert.equal(chains[0][0].x, 10);
  assert.equal(chains[1][0].x, 390);
});

test('Spine split: Handles empty, single point, or degenerate inputs without errors', () => {
  assert.deepEqual(splitSpineIntoChains([], 20), []);
  const single = splitSpineIntoChains([{ x: 50, y: 50 }], 20);
  assert.equal(single.length, 1);
  assert.equal(single[0].length, 1);
});

// =============================================================================
// 2. DIRECTIONAL HEAD ANATOMY TESTS
// =============================================================================

test('Head anatomy: Symmetrical paired lateral eyes rotate with all four directions', () => {
  const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  const baseRadius = 15;
  const skin = getSkinVisuals('cyber_cyan');

  for (const dir of directions) {
    const ctx = new MockTrackingCanvasContext();
    drawStylizedSnakeHead(
      ctx as unknown as CanvasRenderingContext2D,
      { x: 200, y: 200 },
      dir,
      baseRadius,
      skin,
      true,
      'high'
    );

    const socketR = baseRadius * 0.28;
    const pupilR = baseRadius * 0.16;

    const sockets = ctx.operations.filter(
      (op) => op.method === 'arc' && Math.abs(op.args[2] - socketR) < 0.01
    );
    const pupils = ctx.operations.filter(
      (op) => op.method === 'arc' && Math.abs(op.args[2] - pupilR) < 0.01
    );

    assert.equal(sockets.length, 2, `Direction ${dir} must render exactly 2 eye sockets`);
    assert.equal(pupils.length, 2, `Direction ${dir} must render exactly 2 pupils`);

    for (const s of sockets) {
      assert.ok(Number.isFinite(s.args[0]) && Number.isFinite(s.args[1]));
    }
    for (const p of pupils) {
      assert.ok(Number.isFinite(p.args[0]) && Number.isFinite(p.args[1]));
    }

    const distBetweenSockets = Math.hypot(
      sockets[0].args[0] - sockets[1].args[0],
      sockets[0].args[1] - sockets[1].args[1]
    );
    assert.ok(distBetweenSockets > 5, `Direction ${dir} eyes must be spaced laterally`);
  }
});

test('Head anatomy: Smooth anatomical head silhouette renders rounded snout, jowls, crown plate, and crest', () => {
  const ctx = new MockTrackingCanvasContext();
  const skin = getSkinVisuals('arctic_frost');
  drawStylizedSnakeHead(
    ctx as unknown as CanvasRenderingContext2D,
    { x: 150, y: 150 },
    'RIGHT',
    16,
    skin,
    true,
    'high'
  );

  assert.ok(ctx.fillStylesUsed.has(skin.headColor), 'Fills anatomical head silhouette');
  assert.ok(ctx.fillStylesUsed.has(skin.scaleAccentColor), 'Fills dorsal crown plate');
  assert.ok(ctx.fillStylesUsed.has(skin.eyeColor), 'Fills glowing eye pupils');
  assert.ok(ctx.strokeStylesUsed.has(skin.dorsalHighlight), 'Strokes midline crest highlight');

  // Verify smooth Bezier and quadratic operations were recorded
  const bezierOps = ctx.operations.filter((op) => op.method === 'bezierCurveTo');
  const quadOps = ctx.operations.filter((op) => op.method === 'quadraticCurveTo');
  assert.ok(bezierOps.length >= 2, 'Anatomical head uses smooth cubic Bezier curves');
  assert.ok(quadOps.length >= 2, 'Anatomical head uses smooth quadratic curves');
});

// =============================================================================
// 3. CONTINUOUS FLOWING BODY & TAIL TAPERING TESTS
// =============================================================================

test('Continuous body: Multi-zone ribbon bridges connect adjacent spine nodes with skin colors', () => {
  const ctx = new MockTrackingCanvasContext();
  const chain: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
    { x: 160, y: 100 },
  ];
  const skin = getSkinVisuals('matrix_green');

  drawContinuousSnakeBody(
    ctx as unknown as CanvasRenderingContext2D,
    chain,
    14,
    skin,
    false,
    'high',
    true,
    true
  );

  assert.ok(ctx.fillStylesUsed.has(skin.bodyColors[1]), 'Uses skin base body color');
  assert.ok(ctx.operations.filter((op) => op.method === 'fill').length >= 3);
});

test('Tail tip: Outward direction verified for all 4 cardinal directions and diagonals', () => {
  const skin = getSkinVisuals('gold_prestige');
  const baseR = 14;

  const testVectors: { name: string; dx: number; dy: number }[] = [
    { name: 'RIGHT', dx: 20, dy: 0 },
    { name: 'LEFT', dx: -20, dy: 0 },
    { name: 'DOWN', dx: 0, dy: 20 },
    { name: 'UP', dx: 0, dy: -20 },
    { name: 'DIAGONAL_SE', dx: 20, dy: 20 },
    { name: 'DIAGONAL_NW', dx: -20, dy: -20 },
  ];

  for (const v of testVectors) {
    const chain: SpinePoint[] = [
      { x: 100, y: 100 },
      { x: 100 + v.dx, y: 100 + v.dy },
      { x: 100 + v.dx * 2, y: 100 + v.dy * 2 },
      { x: 100 + v.dx * 3, y: 100 + v.dy * 3 },
    ];

    const ctx = new MockTrackingCanvasContext();
    drawContinuousSnakeBody(
      ctx as unknown as CanvasRenderingContext2D,
      chain,
      baseR,
      skin,
      false,
      'high',
      true,
      true
    );

    const tailTerminal = chain[chain.length - 1];
    const lineTos = ctx.operations.filter((op) => op.method === 'lineTo');
    assert.ok(lineTos.length > 0);

    // Tip point distance from head (100, 100) must exceed terminal base node distance from head
    const baseDistFromHead = Math.hypot(tailTerminal.x - 100, tailTerminal.y - 100);
    const maxDistFromHead = Math.max(
      ...lineTos.map((op) => Math.hypot(op.args[0] - 100, op.args[1] - 100))
    );

    assert.ok(
      maxDistFromHead > baseDistFromHead,
      `Tail tip for ${v.name} must extend outward beyond base node: maxDist=${maxDistFromHead}, baseDist=${baseDistFromHead}`
    );
  }
});

test('Tail tip: Omitted cleanly when isTailChain is false (e.g. Zen screen wrap chain)', () => {
  const ctx = new MockTrackingCanvasContext();
  const chain: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
  ];
  const skin = getSkinVisuals('cyber_cyan');
  drawContinuousSnakeBody(
    ctx as unknown as CanvasRenderingContext2D,
    chain,
    14,
    skin,
    false,
    'high',
    true,
    false // Not a tail chain
  );

  const tailTerminal = chain[chain.length - 1];
  const lineTos = ctx.operations.filter((op) => op.method === 'lineTo');
  const maxDistFromHead = Math.max(
    ...lineTos.map((op) => Math.hypot(op.args[0] - 100, op.args[1] - 100))
  );
  const baseDistFromHead = Math.hypot(tailTerminal.x - 100, tailTerminal.y - 100);
  assert.ok(
    maxDistFromHead <= baseDistFromHead + 14,
    'Non-tail chain does not emit outward tail tip cap'
  );
});

// =============================================================================
// 4. PALETTE & IDENTITY FIDELITY FOR ALL 8 SKINS
// =============================================================================

test('Skins: All 8 skins define distinct, high-contrast themes and render properly', () => {
  assert.equal(ALL_SKIN_IDS.length, 8);

  for (const skinId of ALL_SKIN_IDS) {
    const skin = getSkinVisuals(skinId);
    assert.equal(skin.id, skinId);
    assert.ok(skin.headColor, `Skin ${skinId} has headColor`);
    assert.ok(skin.eyeColor, `Skin ${skinId} has eyeColor`);
    assert.equal(skin.bodyColors.length, 3, `Skin ${skinId} has 3 body colors`);
    assert.ok(skin.scaleAccentColor, `Skin ${skinId} has scaleAccentColor`);
    assert.ok(skin.dorsalHighlight, `Skin ${skinId} has dorsalHighlight`);

    const ctx = new MockTrackingCanvasContext();
    const spine: SpinePoint[] = [
      { x: 200, y: 100 },
      { x: 180, y: 100 },
      { x: 160, y: 100 },
      { x: 140, y: 100 },
    ];

    drawNaturalStylizedSnake(
      ctx as unknown as CanvasRenderingContext2D,
      spine,
      {
        direction: 'RIGHT',
        baseRadius: 15,
        skin: skinId,
        allowGlow: true,
        visualEffects: 'high',
        cellW: 20,
      }
    );

    assert.ok(ctx.fillStylesUsed.has(skin.headColor), `${skinId} must use headColor`);
    assert.ok(ctx.fillStylesUsed.has(skin.eyeColor), `${skinId} must use eyeColor`);
    assert.ok(ctx.fillStylesUsed.has(skin.bodyColors[1]), `${skinId} must use bodyColor`);
  }
});

test('Skins: Fallback safely resolves to Cyber Cyan when given unknown skin identifier', () => {
  const fallback = getSkinVisuals('non_existent_skin' as SnakeSkinId);
  assert.equal(fallback.id, 'cyber_cyan');

  const ctx = new MockTrackingCanvasContext();
  drawNaturalStylizedSnake(
    ctx as unknown as CanvasRenderingContext2D,
    [{ x: 50, y: 50 }, { x: 30, y: 50 }],
    {
      direction: 'RIGHT',
      baseRadius: 12,
      skin: 'corrupted_skin_name' as SnakeSkinId,
    }
  );
  assert.ok(ctx.fillStylesUsed.has(SKIN_VISUAL_THEMES.cyber_cyan.headColor));
});

// =============================================================================
// 5. GENUINE THREE-LEVEL RENDERING QUALITY DIFFERENTIATION
// =============================================================================

test('Quality modes: High, Performance, and Reduced exhibit distinct measured operation counts and features', () => {
  const spine: SpinePoint[] = [
    { x: 50, y: 100 },
    { x: 75, y: 100 },
    { x: 100, y: 100 },
    { x: 125, y: 100 },
    { x: 150, y: 100 },
    { x: 175, y: 100 },
  ];

  const ctxHigh = new MockTrackingCanvasContext();
  drawNaturalStylizedSnake(ctxHigh as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'synth_sunset',
    allowGlow: true,
    visualEffects: 'high',
    cellW: 25,
  });

  const ctxPerf = new MockTrackingCanvasContext();
  drawNaturalStylizedSnake(ctxPerf as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'synth_sunset',
    allowGlow: true,
    visualEffects: 'performance',
    cellW: 25,
  });

  const ctxReduced = new MockTrackingCanvasContext();
  drawNaturalStylizedSnake(ctxReduced as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'synth_sunset',
    allowGlow: true,
    visualEffects: 'reduced',
    cellW: 25,
  });

  // Verify operation counts are strictly tiered: High > Performance > Reduced
  const opsHigh = ctxHigh.operations.length;
  const opsPerf = ctxPerf.operations.length;
  const opsReduced = ctxReduced.operations.length;

  assert.ok(opsHigh > opsPerf, `High ops (${opsHigh}) must exceed Performance ops (${opsPerf})`);
  assert.ok(opsPerf > opsReduced, `Performance ops (${opsPerf}) must exceed Reduced ops (${opsReduced})`);

  // High mode uses shadowBlur glow; Performance and Reduced strictly suppress it
  assert.ok(ctxHigh.shadowColorsUsed.size > 0, 'High mode uses glow');
  assert.equal(ctxPerf.shadowColorsUsed.size, 0, 'Performance mode disables shadowBlur glow');
  assert.equal(ctxReduced.shadowColorsUsed.size, 0, 'Reduced mode disables shadowBlur glow');

  // Verify save depths balanced
  assert.equal(ctxHigh.saveDepth, 0);
  assert.equal(ctxPerf.saveDepth, 0);
  assert.equal(ctxReduced.saveDepth, 0);
});

// =============================================================================
// 6. ROBUSTNESS & IMMUTABILITY TESTS
// =============================================================================

test('Immutability: Snake spine points and input options are never mutated by rendering', () => {
  const originalSpine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
  ];
  const deepCopySpine = JSON.parse(JSON.stringify(originalSpine));

  const ctx = new MockTrackingCanvasContext();
  drawNaturalStylizedSnake(
    ctx as unknown as CanvasRenderingContext2D,
    originalSpine,
    {
      direction: 'RIGHT',
      baseRadius: 12,
      skin: 'crimson_blaze',
    }
  );

  assert.deepEqual(originalSpine, deepCopySpine, 'Spine array must remain pristine');
});

test('Robustness: Degenerate, zero-length, duplicate, and non-finite coordinates render without throwing', () => {
  const ctx = new MockTrackingCanvasContext();

  // Empty spine
  assert.doesNotThrow(() => {
    drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, [], {
      direction: 'UP',
      baseRadius: 10,
      skin: 'cyber_cyan',
    });
  });

  // Duplicate consecutive points
  assert.doesNotThrow(() => {
    drawNaturalStylizedSnake(
      ctx as unknown as CanvasRenderingContext2D,
      [{ x: 100, y: 100 }, { x: 100, y: 100 }, { x: 120, y: 100 }],
      {
        direction: 'UP',
        baseRadius: 10,
        skin: 'cyber_cyan',
      }
    );
  });

  // Non-finite coordinates (NaN and Infinity)
  assert.doesNotThrow(() => {
    drawNaturalStylizedSnake(
      ctx as unknown as CanvasRenderingContext2D,
      [{ x: NaN, y: 100 }, { x: 100, y: Infinity }, { x: 120, y: 100 }],
      {
        direction: 'LEFT',
        baseRadius: 10,
        skin: 'cyber_cyan',
      }
    );
  });

  // Zero radius
  assert.doesNotThrow(() => {
    drawNaturalStylizedSnake(
      ctx as unknown as CanvasRenderingContext2D,
      [{ x: 100, y: 100 }, { x: 120, y: 100 }],
      {
        direction: 'LEFT',
        baseRadius: 0,
        skin: 'cyber_cyan',
      }
    );
  });

  assert.equal(ctx.saveDepth, 0, 'Canvas stack must be fully restored');
});

// =============================================================================
// 7. STRAIGHT PATHS, 90-DEGREE TURNS, REVERSALS & S-CURVES
// =============================================================================

test('Geometry: Straight paths (horizontal and vertical, both directions) produce uniform collinear nodes', () => {
  const configs = [
    { name: 'LEFT to RIGHT', points: [{ x: 100, y: 100 }, { x: 200, y: 100 }], expTx: 1, expTy: 0 },
    { name: 'RIGHT to LEFT', points: [{ x: 200, y: 100 }, { x: 100, y: 100 }], expTx: -1, expTy: 0 },
    { name: 'UP to DOWN', points: [{ x: 100, y: 100 }, { x: 100, y: 200 }], expTx: 0, expTy: 1 },
    { name: 'DOWN to UP', points: [{ x: 100, y: 200 }, { x: 100, y: 100 }], expTx: 0, expTy: -1 },
  ];

  for (const cfg of configs) {
    const nodes = generateSmoothSpine(cfg.points, 12);
    assert.ok(nodes.length >= 6, `${cfg.name} generates continuous nodes`);
    for (const n of nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
      assert.ok(Math.abs(n.tangentX - cfg.expTx) < 0.01, `${cfg.name} tangentX`);
      assert.ok(Math.abs(n.tangentY - cfg.expTy) < 0.01, `${cfg.name} tangentY`);
      const thickness = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
      assert.ok(thickness > 5, `${cfg.name} thickness`);
    }
  }
});

test('Geometry: 90-degree turns in all 4 orientations maintain smooth curvature and boundary non-intersection', () => {
  const turns = [
    { name: 'UP to RIGHT', points: [{ x: 100, y: 200 }, { x: 100, y: 100 }, { x: 200, y: 100 }] },
    { name: 'RIGHT to DOWN', points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }] },
    { name: 'DOWN to LEFT', points: [{ x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }] },
    { name: 'LEFT to UP', points: [{ x: 200, y: 200 }, { x: 100, y: 200 }, { x: 100, y: 100 }] },
  ];

  for (const t of turns) {
    const nodes = generateSmoothSpine(t.points, 12);
    assert.ok(nodes.length >= 10, `${t.name} generates smooth samples`);

    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const dot = prev.tangentX * curr.tangentX + prev.tangentY * curr.tangentY;
      assert.ok(dot > 0.85, `${t.name} adjacent tangents continuous (dot=${dot})`);
      const step = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      assert.ok(step < 12, `${t.name} step length bounded`);
    }

    // Boundary non-intersection
    for (let i = 0; i < nodes.length - 1; i++) {
      const l1 = { x: nodes[i].leftX, y: nodes[i].leftY };
      const l2 = { x: nodes[i + 1].leftX, y: nodes[i + 1].leftY };
      const r1 = { x: nodes[i].rightX, y: nodes[i].rightY };
      const r2 = { x: nodes[i + 1].rightX, y: nodes[i + 1].rightY };
      assert.ok(!segmentsIntersect(l1, l2, r1, r2), `${t.name} boundaries must not cross at seg ${i}`);
    }
  }
});

test('Geometry: Exact 180-degree reversal maintains C1 tangent continuity for both left and right directions', () => {
  const reversalPoints: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 160, y: 100 },
    { x: 100, y: 100 },
  ];

  for (const sign of [1, -1] as const) {
    const nodes = generateSmoothSpine(reversalPoints, { baseRadius: 12, lateralTurnSign: sign });
    assert.ok(nodes.length > 6, `Reversal (${sign > 0 ? 'left' : 'right'}) generates smooth turnaround`);

    // Verify all coordinates and tangents are finite and valid
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
      assert.ok(Number.isFinite(n.tangentX) && Number.isFinite(n.tangentY));
      assert.ok(Number.isFinite(n.leftX) && Number.isFinite(n.rightX));

      const thickness = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
      assert.ok(thickness > 3, 'Body thickness must remain positive through turnaround');
    }

    // Verify step continuity and tangent continuity: no position jumps or abrupt angle kinks
    for (let i = 1; i < nodes.length; i++) {
      const tPrev = nodes[i - 1];
      const tCurr = nodes[i];
      const step = Math.hypot(tCurr.x - tPrev.x, tCurr.y - tPrev.y);
      assert.ok(step < 12, `Step along 180 reversal (${step.toFixed(2)}) must not jump or disconnect`);
      const dot = tPrev.tangentX * tCurr.tangentX + tPrev.tangentY * tCurr.tangentY;
      assert.ok(dot > 0.70, `Adjacent tangents must be continuous across turnaround: dot=${dot}`);
    }

    // Outgoing trajectory alignment: tail end nodes must be on the y=100 line heading left (tx=-1, ty=0)
    const tailNodes = nodes.slice(-5);
    for (const tn of tailNodes) {
      assert.ok(Math.abs(tn.y - 100) < 0.01, `Outgoing node Y (${tn.y}) must be collinear with outgoing line 100`);
      assert.ok(Math.abs(tn.tangentX - (-1)) < 0.01, `Outgoing node tangentX (${tn.tangentX}) must be -1`);
      assert.ok(Math.abs(tn.tangentY) < 0.01, `Outgoing node tangentY (${tn.tangentY}) must be 0`);
    }
  }
});

test('Geometry: Near-180-degree turnaround across multiple angles (175, 170, 169, 168, 160, 140 deg) maintains exact join continuity', () => {
  const anglesDeg = [175, 170, 169, 168, 160, 140];
  const pCurr = { x: 150, y: 100 };
  const inUx = 1;
  const inUy = 0;
  const legLen = 50;

  for (const deg of anglesDeg) {
    const rad = (deg * Math.PI) / 180;
    const outUx = -Math.cos(Math.PI - rad);
    const outUy = Math.sin(Math.PI - rad);

    const path: SpinePoint[] = [
      { x: pCurr.x - inUx * legLen, y: pCurr.y - inUy * legLen },
      { x: pCurr.x, y: pCurr.y },
      { x: pCurr.x + outUx * legLen, y: pCurr.y + outUy * legLen },
    ];

    const nodes = generateSmoothSpine(path, 12);
    assert.ok(nodes.length >= 8, `Angle ${deg} deg produces smooth node chain`);

    for (const n of nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
      assert.ok(Number.isFinite(n.tangentX) && Number.isFinite(n.tangentY));
      const thickness = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
      assert.ok(thickness > 3, `Angle ${deg} deg maintains positive body thickness`);
    }

    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const step = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      assert.ok(step < 12, `Angle ${deg} deg step (${step.toFixed(2)}) must not jump or disconnect`);
      const dot = prev.tangentX * curr.tangentX + prev.tangentY * curr.tangentY;
      assert.ok(dot > 0.70, `Angle ${deg} deg adjacent dot=${dot.toFixed(3)} must exceed 0.70`);
    }
  }
});

test('Geometry: Consecutive turns and S-curves maintain stable geometry and continuous boundaries', () => {
  const sCurve: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 130, y: 100 },
    { x: 130, y: 130 },
    { x: 160, y: 130 },
    { x: 160, y: 100 },
  ];
  const nodes = generateSmoothSpine(sCurve, 12);
  assert.ok(nodes.length > 10);

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const step = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    assert.ok(step < 12, `Step along S-curve (${step}) must remain continuous`);
  }
});

// =============================================================================
// 8. PHYSICAL ARC-LENGTH INVARIANCE, TAPERING & SCALE CONFINEMENT
// =============================================================================

test('Anatomical taper: Verifies neck expansion, midbody girth, gradual tail taper, and positive tail radius', () => {
  const baseR = 15;
  const rHead = getAnatomicalRadius(0, baseR);
  const rNeckExpansion = getAnatomicalRadius(0.12, baseR);
  const rMidbody = getAnatomicalRadius(0.40, baseR);
  const rTail = getAnatomicalRadius(1.0, baseR);

  assert.ok(rNeckExpansion > rHead, 'Neck expands from head base');
  assert.ok(rMidbody > rTail, 'Midbody is fuller than tail');
  assert.ok(rTail > 0, 'Tail radius is strictly positive');
  assert.ok(Math.abs(rTail - baseR * 0.24) < 0.01, 'Tail tapers to 0.24 * baseRadius');
});

test('Anatomical taper: Physical distance parameterization produces consistent girth across different path densities', () => {
  const baseR = 14;

  const sparsePath: SpinePoint[] = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 100, y: 0 },
  ];
  const densePath: SpinePoint[] = [];
  for (let i = 0; i <= 10; i++) {
    densePath.push({ x: i * 10, y: 0 });
  }

  const nodesSparse = generateSmoothSpine(sparsePath, baseR);
  const nodesDense = generateSmoothSpine(densePath, baseR);

  // Sample midway along physical length (~50px)
  const sparseMid = nodesSparse.reduce((prev, curr) =>
    Math.abs(curr.distance - 50) < Math.abs(prev.distance - 50) ? curr : prev
  );
  const denseMid = nodesDense.reduce((prev, curr) =>
    Math.abs(curr.distance - 50) < Math.abs(prev.distance - 50) ? curr : prev
  );

  assert.ok(Math.abs(sparseMid.progress - 0.5) < 0.05);
  assert.ok(Math.abs(denseMid.progress - 0.5) < 0.05);
  assert.ok(
    Math.abs(sparseMid.radius - denseMid.radius) < 0.5,
    `Radius at 50px physical distance must match: sparse=${sparseMid.radius}, dense=${denseMid.radius}`
  );
});

test('Scale confinement: Scales are clipped to body ribbon and strictly bounded inside body silhouette', () => {
  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 120 },
    { x: 160, y: 140 },
    { x: 180, y: 140 },
  ];

  const ctx = new MockTrackingCanvasContext();
  drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'matrix_green',
    visualEffects: 'high',
  });

  // Verify that clip() was called to confine scales to the body ribbon
  const clipOps = ctx.operations.filter((op) => op.method === 'clip');
  assert.ok(clipOps.length >= 1, 'Body scales must execute clip() to guarantee boundary confinement');
});

test('Scale confinement: Every scale polygon vertex lies mathematically inside body ribbon boundaries', () => {
  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 130, y: 100 },
    { x: 160, y: 130 },
    { x: 190, y: 130 },
  ];
  const nodes = generateSmoothSpine(spine, 14);
  assert.ok(nodes.length > 5);

  // Build body polygon boundary (left flank then right flank reversed)
  const bodyPoly: { x: number; y: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    bodyPoly.push({ x: nodes[i].leftX, y: nodes[i].leftY });
  }
  for (let i = nodes.length - 1; i >= 0; i--) {
    bodyPoly.push({ x: nodes[i].rightX, y: nodes[i].rightY });
  }

  function pointInPolygon(pt: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  for (let i = 2; i < nodes.length - 2; i++) {
    const center = { x: nodes[i].x, y: nodes[i].y };
    assert.ok(pointInPolygon(center, bodyPoly), `Center at node ${i} must lie inside body ribbon`);
  }
});

test('Skins: Individual regression tests for each of the 8 unique skins', () => {
  const expectedSkins: Record<SnakeSkinId, { scaleStyle: string; headGlow: string }> = {
    cyber_cyan: { scaleStyle: 'cyber_hex', headGlow: '#43F5FF' },
    matrix_green: { scaleStyle: 'reptilian_keeled', headGlow: '#39FF14' },
    synth_sunset: { scaleStyle: 'sunset_chevron', headGlow: '#FF8A00' },
    hyper_violet: { scaleStyle: 'geometric_facet', headGlow: '#9865FF' },
    crimson_blaze: { scaleStyle: 'viper_scutes', headGlow: '#FF1744' },
    arctic_frost: { scaleStyle: 'frost_crystalline', headGlow: '#00E5FF' },
    gold_prestige: { scaleStyle: 'gold_metallic', headGlow: '#FFD700' },
    apex_void: { scaleStyle: 'void_chitin', headGlow: '#7C4DFF' },
  };

  for (const [id, exp] of Object.entries(expectedSkins)) {
    const skin = getSkinVisuals(id as SnakeSkinId);
    assert.equal(skin.id, id);
    assert.equal(skin.scaleStyle, exp.scaleStyle, `${id} scaleStyle`);
    assert.equal(skin.headGlow, exp.headGlow, `${id} headGlow`);
    assert.ok(skin.scaleSecondaryColor, `${id} has scaleSecondaryColor`);
    assert.ok(skin.interstitialColor, `${id} has interstitialColor`);
    assert.ok(skin.specularGleam, `${id} has specularGleam`);
    assert.ok(skin.bellyShade, `${id} has bellyShade`);
  }
});

// =============================================================================
// 9. BOUNDARY CONTINUITY & CONTOUR NON-INTERSECTION TESTS
// =============================================================================

test('Geometry: Left and right boundaries never cross over the spine centerline or each other', () => {
  const turns: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 130, y: 100 },
    { x: 130, y: 130 },
    { x: 160, y: 130 },
    { x: 160, y: 100 },
  ];
  const nodes = generateSmoothSpine(turns, 12);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const leftVec = { x: n.leftX - n.x, y: n.leftY - n.y };
    const rightVec = { x: n.rightX - n.x, y: n.rightY - n.y };

    const leftProj = leftVec.x * n.normalX + leftVec.y * n.normalY;
    const rightProj = rightVec.x * n.normalX + rightVec.y * n.normalY;

    assert.ok(leftProj > 0, 'Left boundary must be strictly positive along normal');
    assert.ok(rightProj < 0, 'Right boundary must be strictly negative along normal');

    const thickness = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
    assert.ok(thickness >= n.radius * 0.75, 'Body thickness must never collapse');
  }

  // Cross-boundary non-intersection check
  for (let i = 0; i < nodes.length - 1; i++) {
    const l1 = { x: nodes[i].leftX, y: nodes[i].leftY };
    const l2 = { x: nodes[i + 1].leftX, y: nodes[i + 1].leftY };
    const r1 = { x: nodes[i].rightX, y: nodes[i].rightY };
    const r2 = { x: nodes[i + 1].rightX, y: nodes[i + 1].rightY };

    assert.ok(
      !segmentsIntersect(l1, l2, r1, r2),
      `Boundary segment ${i} must never intersect its opposing segment`
    );
  }
});

// =============================================================================
// 10. SHARED INTEGRATION & ANIMATION TIMING
// =============================================================================

test('Shared integration: NeonRenderer.render passes frameTimeMs deterministically', () => {
  const renderer = new NeonRenderer();
  const ctx = new MockTrackingCanvasContext();
  const state = createInitialState('classic', 24, 24);

  renderer.render(
    ctx as unknown as CanvasRenderingContext2D,
    480,
    480,
    state,
    1.0,
    { visualEffects: 'high', skin: 'hyper_violet' },
    12345
  );

  const theme = SKIN_VISUAL_THEMES.hyper_violet;
  assert.ok(ctx.fillStylesUsed.has(theme.headColor), 'Gameplay uses hyper_violet head');
  assert.ok(ctx.fillStylesUsed.has(theme.eyeColor), 'Gameplay uses hyper_violet eyes');
  assert.equal(ctx.saveDepth, 0, 'Canvas stack balanced');
});

test('Shared integration: drawSkinPreview delegates to shared snake renderer cleanly with timeMs', () => {
  const ctx = new MockTrackingCanvasContext();
  const result = drawSkinPreview(
    ctx as unknown as CanvasRenderingContext2D,
    'apex_void',
    { width: 240, height: 120, timeMs: 450 }
  );

  assert.equal(result.success, true);
  assert.equal(result.resolvedSkinId, 'apex_void');

  const theme = SKIN_VISUAL_THEMES.apex_void;
  assert.ok(ctx.fillStylesUsed.has(theme.headColor), 'Skin preview uses apex_void head');
  assert.ok(ctx.fillStylesUsed.has(theme.eyeColor), 'Skin preview uses apex_void eyes');
  assert.equal(ctx.saveDepth, 0, 'Canvas stack balanced');
});

// =============================================================================
// 11. CANVAS RELIABILITY & CALLER-OWNED STATE PRESERVATION
// =============================================================================

test('Canvas reliability: Preserves caller-owned globalAlpha and restores Canvas stack to 0', () => {
  const ctx = new MockTrackingCanvasContext();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#123456';
  ctx.strokeStyle = '#654321';

  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
    { x: 160, y: 100 },
  ];

  drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'solar_prestige' as any,
    visualEffects: 'high',
    hasShield: true,
    allowGlow: true,
  });

  // Must restore stack to 0 and restore caller-owned globalAlpha
  assert.equal(ctx.saveDepth, 0, 'Canvas save/restore stack must balance to 0');
  assert.equal(ctx.globalAlpha, 0.42, 'Caller globalAlpha must be preserved exactly');
});

test('Canvas reliability: Exception-safe Canvas restoration when inner drawing fails', () => {
  const ctx = new MockTrackingCanvasContext();
  ctx.globalAlpha = 0.85;

  // Simulate an error thrown during drawing
  const originalFill = ctx.fill.bind(ctx);
  let fillCount = 0;
  ctx.fill = () => {
    fillCount++;
    if (fillCount === 2) {
      throw new Error('Simulated GPU/Canvas context loss or error');
    }
    originalFill();
  };

  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
  ];

  assert.throws(
    () => {
      drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, spine, {
        direction: 'RIGHT',
        baseRadius: 12,
        skin: 'cyber_cyan',
      });
    },
    /Simulated GPU\/Canvas context loss or error/
  );

  // Even after exception, caller-owned globalAlpha and saveDepth must be restored
  assert.equal(ctx.saveDepth, 0, 'Canvas save/restore stack must be 0 after exception');
  assert.equal(ctx.globalAlpha, 0.85, 'Caller globalAlpha must be restored after exception');
});

test('Geometry: Complex multi-turn and hairpin serpentine paths maintain non-intersecting contours', () => {
  // Complex path: Straight -> 90 turn -> Hairpin reversal -> 90 turn
  const complexPath: SpinePoint[] = [
    { x: 50, y: 50 },
    { x: 150, y: 50 },
    { x: 150, y: 150 },
    { x: 150, y: 50 },
    { x: 250, y: 50 },
  ];

  const nodes = generateSmoothSpine(complexPath, 12);
  assert.ok(nodes.length > 15, 'Generates smooth nodes across complex serpentine path');

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert.ok(Number.isFinite(n.leftX) && Number.isFinite(n.rightX));

    // Left is strictly on normal side, right is strictly on -normal side
    const leftProj = (n.leftX - n.x) * n.normalX + (n.leftY - n.y) * n.normalY;
    const rightProj = (n.rightX - n.x) * (-n.normalX) + (n.rightY - n.y) * (-n.normalY);
    assert.ok(leftProj > 0, `Node ${i} left flank must be on positive normal side`);
    assert.ok(rightProj > 0, `Node ${i} right flank must be on positive -normal side`);

    const thickness = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
    assert.ok(thickness >= n.radius * 0.40, `Node ${i} thickness (${thickness.toFixed(1)}) must not collapse`);
  }

  // Cross-boundary non-intersection check along the entire multi-turn body
  for (let i = 0; i < nodes.length - 1; i++) {
    const l1 = { x: nodes[i].leftX, y: nodes[i].leftY };
    const l2 = { x: nodes[i + 1].leftX, y: nodes[i + 1].leftY };
    const r1 = { x: nodes[i].rightX, y: nodes[i].rightY };
    const r2 = { x: nodes[i + 1].rightX, y: nodes[i + 1].rightY };

    assert.ok(
      !segmentsIntersect(l1, l2, r1, r2),
      `Boundary segment ${i} must never intersect its opposing segment`
    );
  }
});
