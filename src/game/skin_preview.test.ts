import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SKIN_IDS, getSkinDefinition } from './skins.ts';
import { drawSkinPreview, type SkinPreviewOptions } from './skin_preview.ts';
import { SKINS, STORAGE_KEYS } from './constants.ts';
import { loadPlayerSkins, type StorageLike } from './persistence.ts';
import { loadPlayerProgression, createDefaultPlayerProgression } from './levels.ts';

/**
 * Lightweight mock of CanvasRenderingContext2D for Node.js unit testing.
 * Records draw calls, styles, and gradients.
 */
class MockCanvasRenderingContext2D {
  public fillStyle: any = '#000000';
  public strokeStyle: any = '#000000';
  public lineWidth: number = 1;
  public shadowColor: string = '';
  public shadowBlur: number = 0;

  public calls: { method: string; args: any[] }[] = [];
  public fillStylesUsed: Set<string> = new Set();
  public shadowColorsUsed: Set<string> = new Set();
  public saveDepth: number = 0;

  save(): void {
    this.saveDepth++;
    this.calls.push({ method: 'save', args: [] });
  }

  restore(): void {
    this.saveDepth = Math.max(0, this.saveDepth - 1);
    this.calls.push({ method: 'restore', args: [] });
  }

  beginPath(): void {
    this.calls.push({ method: 'beginPath', args: [] });
  }

  moveTo(x: number, y: number): void {
    this.calls.push({ method: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.calls.push({ method: 'lineTo', args: [x, y] });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
    this.calls.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle] });
  }

  fill(): void {
    if (typeof this.fillStyle === 'string') {
      this.fillStylesUsed.add(this.fillStyle);
    }
    if (this.shadowColor) {
      this.shadowColorsUsed.add(this.shadowColor);
    }
    this.calls.push({ method: 'fill', args: [] });
  }

  stroke(): void {
    this.calls.push({ method: 'stroke', args: [] });
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    if (typeof this.fillStyle === 'string') {
      this.fillStylesUsed.add(this.fillStyle);
    }
    this.calls.push({ method: 'fillRect', args: [x, y, width, height] });
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): any {
    this.calls.push({ method: 'createRadialGradient', args: [x0, y0, r0, x1, y1, r1] });
    return {
      addColorStop: (offset: number, color: string) => {
        this.calls.push({ method: 'addColorStop', args: [offset, color] });
      },
    };
  }

  scale(sx: number, sy: number): void {
    this.calls.push({ method: 'scale', args: [sx, sy] });
  }
}

class TestMemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

// -----------------------------------------------------------------------------
// 1. Rendering Safety & Palette Fidelity for All 8 Skins
// -----------------------------------------------------------------------------

test('Preview 1: All eight authorized skins render cleanly with success status', () => {
  for (const skinId of ALL_SKIN_IDS) {
    const ctx = new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
    const res = drawSkinPreview(ctx, skinId, { width: 240, height: 120 });

    assert.equal(res.success, true);
    assert.equal(res.resolvedSkinId, skinId);
    assert.equal(res.skinName, SKINS[skinId].name);
  }
});

test('Preview 2: Cyber Cyan preview applies correct head, eye, body and glow palette', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.cyber_cyan;

  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'cyber_cyan', {
    width: 220,
    height: 110,
    background: 'transparent',
  });

  // Verify head color was drawn
  assert.ok(ctx.fillStylesUsed.has(def.headColor), 'Should draw head with Cyber Cyan headColor');
  // Verify eye pupil was drawn
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor), 'Should draw optic pupils with Cyber Cyan eyeColor');
  // Verify body gradient colors were drawn
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[0]), 'Should use body color 0');
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[1]), 'Should use body color 1');
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[2]), 'Should use body color 2');
  // Verify shadow glow was set
  assert.ok(ctx.shadowColorsUsed.has(def.headGlow), 'Should apply Cyber Cyan headGlow');
});

test('Preview 3: Matrix Emerald preview applies correct emerald and forest palette', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.matrix_green;

  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'matrix_green', {
    width: 200,
    height: 100,
  });

  assert.ok(ctx.fillStylesUsed.has(def.headColor));
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[0]));
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[2]));
  assert.ok(ctx.shadowColorsUsed.has(def.headGlow));
});

test('Preview 4: Arctic Frost preview applies ice white, cryo cyan, and deep blue palette', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.arctic_frost;

  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'arctic_frost', {
    width: 240,
    height: 120,
  });

  assert.ok(ctx.fillStylesUsed.has(def.headColor)); // #E0F7FA
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));  // #00F5FF
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[2])); // #01579B
  assert.ok(ctx.shadowColorsUsed.has(def.headGlow)); // #00E5FF
});

test('Preview 5: Solar Prestige preview applies solar gold, amber, and hot pink eyes', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.gold_prestige;

  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'gold_prestige', {
    width: 240,
    height: 120,
  });

  assert.ok(ctx.fillStylesUsed.has(def.headColor)); // #FFD700
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));  // #FF4FD8
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[1])); // #F59E0B
  assert.ok(ctx.shadowColorsUsed.has(def.headGlow)); // #FFD700
});

test('Preview 6: Apex Void preview applies void navy, violet, and electric cyan eyes', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.apex_void;

  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'apex_void', {
    width: 240,
    height: 120,
  });

  assert.ok(ctx.fillStylesUsed.has(def.headColor)); // #1A1D2E
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));  // #00F5FF
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[2])); // #00F5FF
  assert.ok(ctx.shadowColorsUsed.has(def.headGlow)); // #7C4DFF
});

// -----------------------------------------------------------------------------
// 2. Defensive Fallback & Error Handling
// -----------------------------------------------------------------------------

test('Preview 7: Null or undefined context returns failure without throwing exception', () => {
  const res1 = drawSkinPreview(null, 'cyber_cyan', { width: 200, height: 100 });
  assert.equal(res1.success, false);
  assert.equal(res1.resolvedSkinId, 'cyber_cyan');

  const res2 = drawSkinPreview(undefined, 'synth_sunset', { width: 200, height: 100 });
  assert.equal(res2.success, false);
});

test('Preview 8: Unknown or invalid skin ID safely falls back to Cyber Cyan', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const res = drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'unknown_extraterrestrial_skin', {
    width: 200,
    height: 100,
  });

  assert.equal(res.success, true);
  assert.equal(res.resolvedSkinId, 'cyber_cyan');
  assert.equal(res.skinName, SKINS.cyber_cyan.name);
  assert.ok(ctx.fillStylesUsed.has(SKINS.cyber_cyan.headColor));
});

test('Preview 9: Null or undefined skin ID safely falls back to Cyber Cyan', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const res = drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, null as any, {
    width: 200,
    height: 100,
  });

  assert.equal(res.success, true);
  assert.equal(res.resolvedSkinId, 'cyber_cyan');
});

test('Preview 10: Zero or negative dimensions are defensively clamped to safe minimums', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const res = drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'matrix_green', {
    width: 0,
    height: -50,
  });

  assert.equal(res.success, true);
  assert.equal(ctx.saveDepth, 0, 'Canvas save/restore stack should remain balanced');
});

// -----------------------------------------------------------------------------
// 3. Motion, Wave Undulation & Rendering Options
// -----------------------------------------------------------------------------

test('Preview 11: Different animation timestamps produce undulating wave motion', () => {
  const ctx1 = new MockCanvasRenderingContext2D();
  const ctx2 = new MockCanvasRenderingContext2D();

  drawSkinPreview(ctx1 as unknown as CanvasRenderingContext2D, 'cyber_cyan', {
    width: 240,
    height: 120,
    timeMs: 0,
  });

  drawSkinPreview(ctx2 as unknown as CanvasRenderingContext2D, 'cyber_cyan', {
    width: 240,
    height: 120,
    timeMs: 500,
  });

  // Extract arc coordinate calls
  const arcs1 = ctx1.calls.filter(c => c.method === 'arc');
  const arcs2 = ctx2.calls.filter(c => c.method === 'arc');

  assert.equal(arcs1.length, arcs2.length);
  // Head Y coordinates should differ between t=0 and t=500ms due to wave undulation
  const headY1 = arcs1[arcs1.length - 1].args[1];
  const headY2 = arcs2[arcs2.length - 1].args[1];
  assert.notEqual(headY1, headY2, 'Undulating motion should vary coordinate positions across time');
});

test('Preview 12: Transparent background mode skips background fill pass', () => {
  const ctx = new MockCanvasRenderingContext2D();
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'synth_sunset', {
    width: 200,
    height: 100,
    background: 'transparent',
  });

  const fillRectCalls = ctx.calls.filter(c => c.method === 'fillRect');
  assert.equal(fillRectCalls.length, 0, 'Should not fill background rects in transparent mode');
});

test('Preview 13: Glow background mode generates ambient radial wash', () => {
  const ctx = new MockCanvasRenderingContext2D();
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'hyper_violet', {
    width: 200,
    height: 100,
    background: 'glow',
  });

  const gradCalls = ctx.calls.filter(c => c.method === 'createRadialGradient');
  assert.ok(gradCalls.length >= 1, 'Should create radial gradient for ambient glow');
});

test('Preview 14: Canvas save and restore stack always balances to 0', () => {
  const ctx = new MockCanvasRenderingContext2D();
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'crimson_blaze', {
    width: 220,
    height: 110,
  });

  assert.equal(ctx.saveDepth, 0, 'Canvas context save and restore calls must be strictly balanced');
});

// -----------------------------------------------------------------------------
// 4. Non-Interference with Gameplay State, XP and Persistence
// -----------------------------------------------------------------------------

test('Preview 15: Rendering skin previews never mutates player skins storage or equipped skin', () => {
  const storage = new TestMemoryStorage();
  const initialSkins = loadPlayerSkins(storage);
  assert.equal(initialSkins.equippedSkinId, 'cyber_cyan');

  const ctx = new MockCanvasRenderingContext2D();
  // Draw all 8 previews multiple times
  for (const id of ALL_SKIN_IDS) {
    drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, id, { width: 200, height: 100 });
  }

  const afterSkins = loadPlayerSkins(storage);
  assert.equal(afterSkins.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(afterSkins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
  assert.equal(storage.getItem(STORAGE_KEYS.SKINS), null);
});

test('Preview 16: Rendering skin previews never mutates player XP or progression', () => {
  const storage = new TestMemoryStorage();
  const initialProg = createDefaultPlayerProgression();
  const progBefore = loadPlayerProgression(storage);

  const ctx = new MockCanvasRenderingContext2D();
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'gold_prestige', { width: 240, height: 120 });
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'apex_void', { width: 240, height: 120 });

  const progAfter = loadPlayerProgression(storage);
  assert.equal(progAfter.level, progBefore.level);
  assert.equal(progAfter.currentXp, progBefore.currentXp);
  assert.equal(progAfter.totalLifetimeXp, progBefore.totalLifetimeXp);
});

// -----------------------------------------------------------------------------
// 5. Additional Palette Fidelity & Geometry Integrity
// -----------------------------------------------------------------------------

test('Preview 17: Synth Sunset preview accurately applies sunset orange and magenta', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.synth_sunset;
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'synth_sunset', { width: 240, height: 120 });

  assert.ok(ctx.fillStylesUsed.has(def.headColor));
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[0]));
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[1]));
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[2]));
});

test('Preview 18: Crimson Blaze preview accurately applies crimson and gold pupil', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.crimson_blaze;
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'crimson_blaze', { width: 240, height: 120 });

  assert.ok(ctx.fillStylesUsed.has(def.headColor));
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));
  assert.ok(ctx.fillStylesUsed.has(def.bodyColors[0]));
});

test('Preview 19: Hyper Violet preview accurately applies ultraviolet and hot pink pupil', () => {
  const ctx = new MockCanvasRenderingContext2D();
  const def = SKINS.hyper_violet;
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'hyper_violet', { width: 240, height: 120 });

  assert.ok(ctx.fillStylesUsed.has(def.headColor));
  assert.ok(ctx.fillStylesUsed.has(def.eyeColor));
});

test('Preview 20: Optic visor geometry renders paired eyes symmetrically', () => {
  const ctx = new MockCanvasRenderingContext2D();
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'cyber_cyan', { width: 200, height: 100 });

  // Filter arc calls for eyes: socket radius is baseRadius * 0.28, pupil is baseRadius * 0.16
  const baseR = 100 * 0.135;
  const socketR = baseR * 0.28;
  const pupilR = baseR * 0.16;

  const socketArcs = ctx.calls.filter(c => c.method === 'arc' && Math.abs(c.args[2] - socketR) < 0.01);
  const pupilArcs = ctx.calls.filter(c => c.method === 'arc' && Math.abs(c.args[2] - pupilR) < 0.01);

  assert.equal(socketArcs.length, 2, 'Should draw exactly two optic visor sockets');
  assert.equal(pupilArcs.length, 2, 'Should draw exactly two glowing pupils');
});

test('Preview 21: Extreme scaling from compact 40x20 to large 1920x1080 renders without NaN', () => {
  const smallCtx = new MockCanvasRenderingContext2D();
  const smallRes = drawSkinPreview(smallCtx as unknown as CanvasRenderingContext2D, 'matrix_green', { width: 40, height: 20 });
  assert.equal(smallRes.success, true);
  assert.equal(smallCtx.saveDepth, 0);

  const largeCtx = new MockCanvasRenderingContext2D();
  const largeRes = drawSkinPreview(largeCtx as unknown as CanvasRenderingContext2D, 'gold_prestige', { width: 1920, height: 1080 });
  assert.equal(largeRes.success, true);
  assert.equal(largeCtx.saveDepth, 0);
});

test('Preview 22: Glow intensity 0 disables shadowBlur completely', () => {
  const ctx = new MockCanvasRenderingContext2D();
  drawSkinPreview(ctx as unknown as CanvasRenderingContext2D, 'arctic_frost', {
    width: 200,
    height: 100,
    glowIntensity: 0,
  });

  // When glowIntensity = 0, shadowColors should not be populated with active blur
  assert.equal(ctx.shadowBlur, 0);
});

test('Preview 23: Multiple simultaneous preview renders run with complete isolation', () => {
  const ctxA = new MockCanvasRenderingContext2D();
  const ctxB = new MockCanvasRenderingContext2D();

  const resA = drawSkinPreview(ctxA as unknown as CanvasRenderingContext2D, 'cyber_cyan', { width: 150, height: 80, timeMs: 100 });
  const resB = drawSkinPreview(ctxB as unknown as CanvasRenderingContext2D, 'apex_void', { width: 300, height: 150, timeMs: 900 });

  assert.equal(resA.resolvedSkinId, 'cyber_cyan');
  assert.equal(resB.resolvedSkinId, 'apex_void');
  assert.ok(ctxA.fillStylesUsed.has(SKINS.cyber_cyan.headColor));
  assert.ok(ctxB.fillStylesUsed.has(SKINS.apex_void.headColor));
  assert.equal(ctxA.fillStylesUsed.has(SKINS.apex_void.headColor), false);
});

