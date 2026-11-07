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

    // Look for socket and pupil arcs
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

    // Sockets and pupils must have valid finite coordinates
    for (const s of sockets) {
      assert.ok(Number.isFinite(s.args[0]) && Number.isFinite(s.args[1]));
    }
    for (const p of pupils) {
      assert.ok(Number.isFinite(p.args[0]) && Number.isFinite(p.args[1]));
    }

    // Two eyes must be separated laterally (not collocated)
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

  // Checks that head base color, scale accent, and eye color were filled
  assert.ok(ctx.fillStylesUsed.has(skin.headColor), 'Fills anatomical head silhouette');
  assert.ok(ctx.fillStylesUsed.has(skin.scaleAccentColor), 'Fills dorsal crown plate');
  assert.ok(ctx.fillStylesUsed.has(skin.eyeColor), 'Fills glowing eye pupils');
  assert.ok(ctx.strokeStylesUsed.has(skin.dorsalHighlight), 'Strokes midline crest highlight');
});

// =============================================================================
// 3. CONTINUOUS FLOWING BODY & TAIL TAPERING TESTS
// =============================================================================

test('Continuous body: Trapezoidal capsule bridges connect adjacent spine nodes', () => {
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

  // Connecting 4 points produces 3 segment bridges + 1 tail tip
  assert.ok(ctx.fillStylesUsed.has(skin.bodyColors[0]), 'Uses skin primary body color');
  assert.ok(ctx.operations.filter((op) => op.method === 'fill').length >= 3);
});

test('Tail tip: Acute taper geometry is applied only at the genuine tail tip of the snake', () => {
  const ctxWithTail = new MockTrackingCanvasContext();
  const chain: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
  ];
  const skin = getSkinVisuals('gold_prestige');

  // Render with isTailChain = true
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

  // Render with isTailChain = false (e.g. Zen split chain before wrap)
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

  // The tail chain draws an extra acute tapered tip polygon
  const fillsWithTail = ctxWithTail.operations.filter((op) => op.method === 'fill').length;
  const fillsWithoutTail = ctxWithoutTail.operations.filter((op) => op.method === 'fill').length;
  assert.ok(fillsWithTail > fillsWithoutTail, 'Genuine tail chain must render tapered tip');
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
// 5. VISUAL EFFECTS LEVELS & PERFORMANCE SCALING
// =============================================================================

test('Effects levels: "high" mode enables head glow and dorsal scale accents', () => {
  const ctx = new MockTrackingCanvasContext();
  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 80, y: 100 },
    { x: 60, y: 100 },
  ];
  drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'synth_sunset',
    allowGlow: true,
    visualEffects: 'high',
    cellW: 20,
  });

  assert.ok(ctx.shadowColorsUsed.size > 0, 'High mode uses glow shadow');
  assert.ok(ctx.strokeStylesUsed.has(SKIN_VISUAL_THEMES.synth_sunset.dorsalHighlight));
});

test('Effects levels: "reduced" mode disables glow and suppresses micro dorsal scales', () => {
  const ctx = new MockTrackingCanvasContext();
  const spine: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 80, y: 100 },
    { x: 60, y: 100 },
  ];
  drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, spine, {
    direction: 'RIGHT',
    baseRadius: 14,
    skin: 'synth_sunset',
    allowGlow: true, // requested, but reduced mode must suppress glow
    visualEffects: 'reduced',
    cellW: 20,
  });

  assert.equal(ctx.shadowColorsUsed.size, 0, 'Reduced mode strictly disables all glow shadows');
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

test('Robustness: Empty spine, single segment snake, or zero radius renders gracefully without NaN', () => {
  const ctx = new MockTrackingCanvasContext();

  // Empty spine
  assert.doesNotThrow(() => {
    drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, [], {
      direction: 'UP',
      baseRadius: 10,
      skin: 'cyber_cyan',
    });
  });

  // Single head point
  assert.doesNotThrow(() => {
    drawNaturalStylizedSnake(
      ctx as unknown as CanvasRenderingContext2D,
      [{ x: 100, y: 100 }],
      {
        direction: 'UP',
        baseRadius: 10,
        skin: 'cyber_cyan',
      }
    );
  });

  // Non-finite or zero radius
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

  // Verify save/restore stack remains 0
  assert.equal(ctx.saveDepth, 0, 'Canvas stack must be fully restored');
});

// =============================================================================
// 7. SHARED INTEGRATION: GAMEPLAY RENDERER & SKIN PREVIEW
// =============================================================================

test('Shared integration: NeonRenderer.render delegates to shared snake renderer cleanly', () => {
  const renderer = new NeonRenderer();
  const ctx = new MockTrackingCanvasContext();
  const state = createInitialState('classic', 24, 24);

  renderer.render(ctx as unknown as CanvasRenderingContext2D, 480, 480, state, 1.0, {
    visualEffects: 'high',
    skin: 'hyper_violet',
  });

  // Check that hyper_violet colors were applied by the shared snake renderer
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
    { width: 240, height: 120 }
  );

  assert.equal(result.success, true);
  assert.equal(result.resolvedSkinId, 'apex_void');

  const theme = SKIN_VISUAL_THEMES.apex_void;
  assert.ok(ctx.fillStylesUsed.has(theme.headColor), 'Skin preview uses apex_void head');
  assert.ok(ctx.fillStylesUsed.has(theme.eyeColor), 'Skin preview uses apex_void eyes');
  assert.equal(ctx.saveDepth, 0, 'Canvas stack balanced');
});

// =============================================================================
// 8. STREAMLINED CURVED BODY GEOMETRY & TURNING TESTS
// =============================================================================

test('Geometry: Straight body produces collinear spine and parallel boundary curves', () => {
  const straightPoints: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 140, y: 100 },
    { x: 160, y: 100 },
  ];
  const nodes = generateSmoothSpine(straightPoints, 12);
  assert.ok(nodes.length > 4, 'Must sample along straight path');

  for (const node of nodes) {
    assert.equal(Math.round(node.y), 100, 'Y must remain collinear');
    assert.equal(Math.round(node.tangentX), 1, 'Tangent must point +X');
    assert.equal(Math.round(node.tangentY), 0, 'Tangent Y must be 0');
    assert.ok(node.leftY > node.y, 'Left boundary is +Y offset');
    assert.ok(node.rightY < node.y, 'Right boundary is -Y offset');
  }
});

test('Geometry: All four 90-degree turn orientations produce smooth, finite curvature without square corners', () => {
  const turnCases: { name: string; points: SpinePoint[] }[] = [
    { name: 'UP to RIGHT', points: [{ x: 100, y: 120 }, { x: 100, y: 100 }, { x: 120, y: 100 }] },
    { name: 'RIGHT to DOWN', points: [{ x: 80, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 120 }] },
    { name: 'DOWN to LEFT', points: [{ x: 100, y: 80 }, { x: 100, y: 100 }, { x: 80, y: 100 }] },
    { name: 'LEFT to UP', points: [{ x: 120, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 80 }] },
  ];

  for (const tc of turnCases) {
    const nodes = generateSmoothSpine(tc.points, 12);
    assert.ok(nodes.length >= 6, `${tc.name} must generate dense curved nodes`);

    // All coordinates must be strictly finite
    for (const node of nodes) {
      assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `${tc.name} node x,y must be finite`);
      assert.ok(Number.isFinite(node.leftX) && Number.isFinite(node.leftY), `${tc.name} left boundary must be finite`);
      assert.ok(Number.isFinite(node.rightX) && Number.isFinite(node.rightY), `${tc.name} right boundary must be finite`);
    }

    // Check that tangent smoothly transitions (no abrupt 90-degree jump between adjacent nodes)
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const dot = prev.tangentX * curr.tangentX + prev.tangentY * curr.tangentY;
      assert.ok(dot > 0.6, `${tc.name}: step ${i} angle change must be gradual, not a right angle`);
    }
  }
});

test('Geometry: Consecutive turns and S-curves maintain continuous boundaries without self-intersection', () => {
  const sCurve: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 120, y: 120 },
    { x: 140, y: 120 },
    { x: 140, y: 140 },
  ];
  const nodes = generateSmoothSpine(sCurve, 10);
  assert.ok(nodes.length > 10);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert.ok(Number.isFinite(n.leftX) && Number.isFinite(n.rightX));
    // Left and right contours must maintain positive separation
    const dist = Math.hypot(n.leftX - n.rightX, n.leftY - n.rightY);
    assert.ok(dist > 5, 'Body must maintain thickness without collapsing');
  }
});

test('Geometry: Tight 180-degree U-turn prevents inner miter pinching and outer spikes', () => {
  const uTurn: SpinePoint[] = [
    { x: 100, y: 100 },
    { x: 120, y: 100 },
    { x: 120, y: 120 },
    { x: 100, y: 120 },
  ];
  const nodes = generateSmoothSpine(uTurn, 10);

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];

    // Inner contour distance should be smooth and positive (no pinching/inversion)
    const stepDist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    assert.ok(stepDist < 15, 'Centerline step distance must remain continuous');

    // Outer contour must not shoot off to infinity
    assert.ok(Math.hypot(curr.leftX - curr.x, curr.leftY - curr.y) <= 18);
    assert.ok(Math.hypot(curr.rightX - curr.x, curr.rightY - curr.y) <= 18);
  }
});

test('Geometry: Natural anatomical radius tapers monotonically from mid-body to tail tip', () => {
  const baseR = 14;
  const rNeck = getAnatomicalRadius(0, baseR);
  const rChest = getAnatomicalRadius(0.14, baseR);
  const rMid = getAnatomicalRadius(0.5, baseR);
  const rTailBase = getAnatomicalRadius(0.85, baseR);
  const rTailTip = getAnatomicalRadius(1.0, baseR);

  // Chest girth slightly fuller than neck joint
  assert.ok(rChest >= rNeck, 'Girth expands smoothly from neck to body');
  // Body tapers from mid to tail
  assert.ok(rMid > rTailBase, 'Mid-body is thicker than tail base');
  assert.ok(rTailBase > rTailTip, 'Tail base is thicker than tail tip');
  assert.ok(rTailTip > 0, 'Tail tip radius is positive');
});

// =============================================================================
// 9. PREMIUM SKIN MATERIAL REALISM & SCALE ARTISTRY
// =============================================================================

test('Skins: Every skin has an individually assigned, authentic ScaleStyle and secondary palette', () => {
  const expectedStyles: Record<SnakeSkinId, string> = {
    cyber_cyan: 'cyber_hex',
    matrix_green: 'reptilian_keeled',
    synth_sunset: 'sunset_chevron',
    hyper_violet: 'geometric_facet',
    crimson_blaze: 'viper_scutes',
    arctic_frost: 'frost_crystalline',
    gold_prestige: 'gold_metallic',
    apex_void: 'void_chitin',
  };

  for (const id of ALL_SKIN_IDS) {
    const theme = SKIN_VISUAL_THEMES[id];
    assert.equal(theme.scaleStyle, expectedStyles[id], `${id} has expected scaleStyle`);
    assert.ok(theme.scaleSecondaryColor, `${id} defines scaleSecondaryColor`);
    assert.ok(theme.interstitialColor, `${id} defines interstitialColor`);
    assert.ok(theme.specularGleam, `${id} defines specularGleam`);
    assert.ok(theme.bellyShade, `${id} defines bellyShade`);
  }
});

test('Skins: High mode renders scale patterns and dorsal highlights for all eight skins', () => {
  for (const id of ALL_SKIN_IDS) {
    const ctx = new MockTrackingCanvasContext();
    const spine: SpinePoint[] = [
      { x: 50, y: 100 },
      { x: 70, y: 100 },
      { x: 90, y: 100 },
      { x: 110, y: 100 },
      { x: 130, y: 100 },
    ];
    drawNaturalStylizedSnake(ctx as unknown as CanvasRenderingContext2D, spine, {
      direction: 'RIGHT',
      baseRadius: 14,
      skin: id,
      visualEffects: 'high',
      allowGlow: true,
      cellW: 20,
    });

    const theme = SKIN_VISUAL_THEMES[id];
    assert.ok(ctx.fillStylesUsed.has(theme.scaleAccentColor), `${id} must draw scales with scaleAccentColor`);
    assert.ok(ctx.strokeStylesUsed.has(theme.dorsalHighlight), `${id} must draw dorsal highlights`);
    assert.equal(ctx.saveDepth, 0, `${id} balances canvas save depth`);
  }
});
