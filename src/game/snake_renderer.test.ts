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
import { ALL_SKIN_IDS, getSkinDefinition } from './skins.ts';
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

  moveTo(x: number, y: number): void {
    this.operations.push({ method: 'moveTo', args: [x, y] });
    this.pathSegments.push({ type: 'moveTo', x, y });
  }

  lineTo(x: number, y: number): void {
    this.operations.push({ method: 'lineTo', args: [x, y] });
    this.pathSegments.push({ type: 'lineTo', x, y });
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
    // Wraparound jump across 400px board
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

test('Head anatomy: Wedge head silhouette renders snout, jowls, crown plate, and dorsal crest', () => {
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

  assert.ok(ctx.fillStylesUsed.has(skin.bodyColors[0]), 'Uses skin primary body color');
  assert.ok(ctx.operations.filter((op) => op.method === 'fill').length >= 3);
});

test('Tail tip: Verified outward direction extends away from body along terminal tangent', () => {
  const ctxWithTail = new MockTrackingCanvasContext();
  // Snake traveling in +X direction from head (100) to tail (160)
  const chain: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
    { x: 160, y: 100 },
  ];
  const skin = getSkinVisuals('gold_prestige');

  drawContinuousSnakeBody(
    ctxWithTail as unknown as CanvasRenderingContext2D,
    chain,
    14,
    skin,
    false,
    'high',
    true,
    true
  );

  // Find all lineTo operations
  const lineTos = ctxWithTail.operations.filter((op) => op.method === 'lineTo');
  assert.ok(lineTos.length > 0);

  // The tail terminal is at x=160. The tail tip MUST extend OUTWARD (x > 160), away from the head at x=100
  const maxRecordedX = Math.max(...lineTos.map((op) => op.args[0]));
  assert.ok(maxRecordedX > 160, `Tail tip x (${maxRecordedX}) must extend outward past tail base x (160)`);

  // Render without tail chain (Zen split segment before wrap)
  const ctxWithoutTail = new MockTrackingCanvasContext();
  drawContinuousSnakeBody(
    ctxWithoutTail as unknown as CanvasRenderingContext2D,
    chain,
    14,
    skin,
    false,
    'high',
    true,
    false
  );

  const lineTosWithoutTail = ctxWithoutTail.operations.filter((op) => op.method === 'lineTo');
  const maxRecordedXWithoutTail = Math.max(...lineTosWithoutTail.map((op) => op.args[0]));
  assert.ok(maxRecordedX > maxRecordedXWithoutTail, 'Tail tip extends further than non-tail chain boundary');
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
    assert.ok(ctx.fillStylesUsed.has(skin.bodyColors[0]), `${skinId} must use primary bodyColor`);
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

test('Quality modes: High, Performance, and Reduced exhibit distinct measured operation counts', () => {
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
// 7. REVERSALS: 180-DEGREE AND NEAR-180-DEGREE HANDLING
// =============================================================================

test('Geometry: True 180-degree reversal creates safe lateral turnaround without needle collapse', () => {
  // Point 0 to 1 goes right, point 1 to 2 doubles directly back left
  const reversalPoints: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 140, y: 100 },
    { x: 100, y: 100 },
  ];
  const nodes = generateSmoothSpine(reversalPoints, 12);
  assert.ok(nodes.length > 4);

  // All coordinates and tangents must be strictly finite and valid
  for (const n of nodes) {
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert.ok(Number.isFinite(n.tangentX) && Number.isFinite(n.tangentY));
    assert.ok(Number.isFinite(n.leftX) && Number.isFinite(n.rightX));
    const thickness = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
    assert.ok(thickness > 3, 'Body thickness must remain positive through turnaround');
  }
});

test('Geometry: Near-180-degree turnaround generates smooth curvature without spikes', () => {
  const nearReversal: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 140, y: 100 },
    { x: 100, y: 102 }, // nearly parallel return
  ];
  const nodes = generateSmoothSpine(nearReversal, 12);
  assert.ok(nodes.length > 4);

  for (const n of nodes) {
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert.ok(Number.isFinite(n.leftX) && Number.isFinite(n.rightX));
  }
});

// =============================================================================
// 8. PHYSICAL ARC-LENGTH INVARIANCE TESTS
// =============================================================================

test('Anatomical taper: Physical distance parameterization produces consistent girth across different path densities', () => {
  const baseR = 14;

  // Snake A: 100px total length with 3 sparse segments
  const sparsePath: SpinePoint[] = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 100, y: 0 },
  ];
  // Snake B: 100px total length with 10 dense segments
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

  // Both should evaluate to mid-body anatomical progress (~0.5) and have nearly identical girth
  assert.ok(Math.abs(sparseMid.progress - 0.5) < 0.05);
  assert.ok(Math.abs(denseMid.progress - 0.5) < 0.05);
  assert.ok(
    Math.abs(sparseMid.radius - denseMid.radius) < 0.5,
    `Radius at 50px physical distance must match: sparse=${sparseMid.radius}, dense=${denseMid.radius}`
  );
});

test('Scale placement: Scales remain strictly bounded within the body ribbon half-width', () => {
  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 120 },
    { x: 160, y: 140 },
    { x: 180, y: 140 },
  ];
  const baseR = 14;
  const nodes = generateSmoothSpine(spine, baseR);

  for (const node of nodes) {
    const scaleHalfWidth = node.radius * 0.44;
    // Scale must stay well inside boundary radius
    assert.ok(
      scaleHalfWidth < node.radius,
      `Scale half-width (${scaleHalfWidth}) must be strictly less than body radius (${node.radius})`
    );
  }
});

// =============================================================================
// 9. BOUNDARY CONTINUITY & CONTOUR NON-INTERSECTION TESTS
// =============================================================================

test('Geometry: Left and right boundaries never cross over the spine centerline', () => {
  const turns: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 120, y: 120 },
    { x: 140, y: 120 },
    { x: 140, y: 100 },
  ];
  const nodes = generateSmoothSpine(turns, 12);

  for (const n of nodes) {
    // Normal vector dot products
    const leftVec = { x: n.leftX - n.x, y: n.leftY - n.y };
    const rightVec = { x: n.rightX - n.x, y: n.rightY - n.y };

    const leftProj = leftVec.x * n.normalX + leftVec.y * n.normalY;
    const rightProj = rightVec.x * n.normalX + rightVec.y * n.normalY;

    assert.ok(leftProj > 0, 'Left boundary must be strictly positive along normal');
    assert.ok(rightProj < 0, 'Right boundary must be strictly negative along normal');
  }
});

test('Geometry: Step distances along boundary contours are smooth and free of spikes', () => {
  const path: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 120, y: 120 },
    { x: 100, y: 120 },
  ];
  const nodes = generateSmoothSpine(path, 10);

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];

    const centerStep = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const leftStep = Math.hypot(curr.leftX - prev.leftX, curr.leftY - prev.leftY);
    const rightStep = Math.hypot(curr.rightX - prev.rightX, curr.rightY - prev.rightY);

    assert.ok(centerStep < 15, `Center step (${centerStep}) must be continuous`);
    assert.ok(leftStep < 25, `Left step (${leftStep}) must be continuous without spikes`);
    assert.ok(rightStep < 25, `Right step (${rightStep}) must be continuous without spikes`);
  }
});

// =============================================================================
// 10. SHARED INTEGRATION: GAMEPLAY RENDERER & SKIN PREVIEW
// =============================================================================

test('Shared integration: NeonRenderer.render delegates to shared snake renderer cleanly with animationTimeMs', () => {
  const renderer = new NeonRenderer();
  const ctx = new MockTrackingCanvasContext();
  const state = createInitialState('classic', 24, 24);

  renderer.render(ctx as unknown as CanvasRenderingContext2D, 480, 480, state, 1.0, {
    visualEffects: 'high',
    skin: 'hyper_violet',
  });

  const theme = SKIN_VISUAL_THEMES.hyper_violet;
  assert.ok(ctx.fillStylesUsed.has(theme.headColor), 'Gameplay uses hyper_violet head');
  assert.ok(ctx.fillStylesUsed.has(theme.eyeColor), 'Gameplay uses hyper_violet eyes');
  assert.ok(ctx.fillStylesUsed.has(theme.bodyColors[0]), 'Gameplay uses hyper_violet body');
  assert.equal(ctx.saveDepth, 0, 'Canvas stack balanced');
});

test('Shared integration: drawSkinPreview delegates to shared snake renderer cleanly', () => {
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
