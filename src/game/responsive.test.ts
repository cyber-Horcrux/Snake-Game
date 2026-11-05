import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCanvasDimensions,
  getDeviceOrientation,
  isShortViewport,
  isNarrowViewport,
  MAX_CANVAS_DIMENSION,
} from './responsive.ts';

test('calculateCanvasDimensions maintains perfectly square 1:1 ratio across standard test viewports', () => {
  const scenarios = [
    { name: 'Small phone portrait (320 x 568)', w: 320, h: 568, dpr: 2 },
    { name: 'Standard phone portrait (360 x 800)', w: 360, h: 800, dpr: 2 },
    { name: 'Large phone portrait (430 x 932)', w: 430, h: 932, dpr: 3 },
    { name: 'Small phone landscape (568 x 320)', w: 568, h: 320, dpr: 2 },
    { name: 'Standard phone landscape (800 x 360)', w: 800, h: 360, dpr: 2 },
    { name: 'Tablet portrait (768 x 1024)', w: 768, h: 1024, dpr: 2 },
    { name: 'Tablet landscape (1024 x 768)', w: 1024, h: 768, dpr: 2 },
    { name: 'Desktop display (1440 x 900)', w: 1440, h: 900, dpr: 1 },
  ];

  for (const s of scenarios) {
    const dim = calculateCanvasDimensions(s.w, s.h, s.dpr);

    // Board must fit strictly inside the container
    assert.ok(dim.cssSize <= s.w, `${s.name}: CSS width exceeds container width`);
    assert.ok(dim.cssSize <= s.h, `${s.name}: CSS height exceeds container height`);

    // Backing width and height must match (1:1 square)
    assert.equal(dim.backingWidth, dim.backingHeight, `${s.name}: backing width != height`);

    // Backing size must equal cssSize * clamped DPR (capped at 2)
    const effectiveDpr = Math.min(2, s.dpr);
    assert.equal(dim.backingWidth, Math.round(dim.cssSize * effectiveDpr));
  }
});

test('calculateCanvasDimensions removes 280px minimum constraint and scales smoothly down', () => {
  // On a very small container (e.g. 200px by 180px available space)
  const smallDim = calculateCanvasDimensions(200, 180, 1, { padding: 8 });

  // With 8px padding: availW = 184, availH = 164. Min is 164.
  assert.equal(smallDim.cssSize, 164);
  assert.ok(smallDim.cssSize < 280, 'Canvas size correctly scales below legacy 280px minimum');
  assert.equal(smallDim.backingWidth, 164);
  assert.equal(smallDim.backingHeight, 164);
});

test('calculateCanvasDimensions caps at maximum 760px on large viewports', () => {
  const desktopDim = calculateCanvasDimensions(1920, 1080, 1);
  assert.equal(desktopDim.cssSize, MAX_CANVAS_DIMENSION);
  assert.equal(desktopDim.backingWidth, MAX_CANVAS_DIMENSION);

  const ultraDim = calculateCanvasDimensions(3840, 2160, 2);
  assert.equal(ultraDim.cssSize, MAX_CANVAS_DIMENSION);
  assert.equal(ultraDim.backingWidth, MAX_CANVAS_DIMENSION * 2);
});

test('calculateCanvasDimensions gracefully handles zero and negative dimensions without crash', () => {
  const zeroDim = calculateCanvasDimensions(0, 0, 1);
  assert.equal(zeroDim.cssSize, 0);
  assert.equal(zeroDim.backingWidth, 0);
  assert.equal(zeroDim.backingHeight, 0);

  const tinyDim = calculateCanvasDimensions(10, 10, 1, { padding: 12 });
  assert.equal(tinyDim.cssSize, 0);
});

test('orientation and viewport classifier helpers work accurately', () => {
  assert.equal(getDeviceOrientation(360, 800), 'portrait');
  assert.equal(getDeviceOrientation(800, 360), 'landscape');
  assert.equal(getDeviceOrientation(1024, 768), 'landscape');
  assert.equal(getDeviceOrientation(768, 1024), 'portrait');

  assert.equal(isShortViewport(320), true);
  assert.equal(isShortViewport(480), true);
  assert.equal(isShortViewport(800), false);

  assert.equal(isNarrowViewport(320), true);
  assert.equal(isNarrowViewport(360), true);
  assert.equal(isNarrowViewport(430), false);
  assert.equal(isNarrowViewport(768), false);
});
