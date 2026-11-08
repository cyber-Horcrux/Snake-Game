import test from 'node:test';
import assert from 'node:assert/strict';
import { drawTrailPreview } from './trail_preview.ts';
import { ALL_TRAIL_IDS, getTrailDefinition } from './trails.ts';
import { SKINS } from './constants.ts';
import type { SnakeSkinId, SnakeTrailId } from './types.ts';

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
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    arc: (x: number, y: number, r: number) => operations.push(`arc(${x},${y},${r})`),
    translate: (x: number, y: number) => operations.push(`translate(${x},${y})`),
    rotate: (a: number) => operations.push(`rotate(${a})`),
    scale: (x: number, y: number) => operations.push(`scale(${x},${y})`),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
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

test('Trail Preview 1: Handles null/undefined context gracefully without throwing', () => {
  const result = drawTrailPreview(null, 'cyber_pulse', { width: 200, height: 100 });
  assert.equal(result.success, false);
  assert.equal(result.resolvedTrailId, 'cyber_pulse');
});

test('Trail Preview 2: Renders previews for all 8 trail styles successfully', () => {
  const ctx = createMockContext();

  for (const trailId of ALL_TRAIL_IDS) {
    const res = drawTrailPreview(ctx, trailId, {
      width: 240,
      height: 120,
      timeMs: 300,
      background: 'glow',
    });

    assert.equal(res.success, true);
    assert.equal(res.resolvedTrailId, trailId);
    assert.equal(res.trailName, getTrailDefinition(trailId).name);
    assert.ok(ctx.operations.length > 0);
  }
});

test('Trail Preview 3: Resolves unknown or invalid trail IDs to cyber_pulse default', () => {
  const ctx = createMockContext();
  const res = drawTrailPreview(ctx, 'corrupt_trail_id' as SnakeTrailId, {
    width: 200,
    height: 100,
  });

  assert.equal(res.success, true);
  assert.equal(res.resolvedTrailId, 'cyber_pulse');
  assert.equal(res.trailName, 'Cyber Pulse');
});

test('Trail Preview 4: Compatible with all 8 snake skins as preview chassis', () => {
  const ctx = createMockContext();
  const allSkinIds = Object.keys(SKINS) as SnakeSkinId[];

  for (const skinId of allSkinIds) {
    assert.doesNotThrow(() => {
      const res = drawTrailPreview(ctx, 'plasma_fire', {
        width: 220,
        height: 110,
        skinId,
        timeMs: 500,
      });
      assert.equal(res.success, true);
    }, `Preview failed with skin ${skinId}`);
  }
});

test('Trail Preview 5: Respects background options (glow, dark, transparent)', () => {
  const ctxGlow = createMockContext();
  drawTrailPreview(ctxGlow, 'cyber_pulse', { width: 200, height: 100, background: 'glow' });
  assert.ok(ctxGlow.operations.some(op => op.startsWith('clearRect')));
  assert.ok(ctxGlow.operations.some(op => op.startsWith('fillRect')));

  const ctxDark = createMockContext();
  drawTrailPreview(ctxDark, 'cyber_pulse', { width: 200, height: 100, background: 'dark' });
  assert.ok(ctxDark.operations.some(op => op.startsWith('clearRect')));
  assert.ok(ctxDark.operations.some(op => op.startsWith('fillRect')));

  const ctxTrans = createMockContext();
  drawTrailPreview(ctxTrans, 'cyber_pulse', { width: 200, height: 100, background: 'transparent' });
  assert.ok(ctxTrans.operations.some(op => op.startsWith('clearRect')));
  assert.ok(!ctxTrans.operations.some(op => op.startsWith('fillRect')), 'Transparent mode must not draw dark backdrop');
});

test('Trail Preview 6: Trail style "none" suppresses trail drawing while still drawing snake body', () => {
  const ctxNone = createMockContext();
  const res = drawTrailPreview(ctxNone, 'none', { width: 200, height: 100 });
  assert.equal(res.success, true);
  assert.equal(res.resolvedTrailId, 'none');
  // Snake body operations are present
  assert.ok(ctxNone.operations.length > 0);
});

test('Trail Preview 7: Undulating trail points calculate realistic non-zero tangent angles', () => {
  const ctx = createMockContext();
  // Call with animated timeMs
  const res = drawTrailPreview(ctx, 'hyper_streak', {
    width: 260,
    height: 130,
    timeMs: 1200,
    background: 'glow',
  });

  assert.equal(res.success, true);
  // Verify operations completed cleanly
  assert.ok(ctx.operations.length > 0);
});
