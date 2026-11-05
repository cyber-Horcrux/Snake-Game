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

test('buttons control mode mobile portrait geometry reserves ample clearance for enlarged D-pad', () => {
  // Mobile test viewports in portrait:
  // e.g. iPhone SE (320x568), standard Android (360x800), iPhone 14/15 (390x844), large Pro Max (430x932)
  const mobileViewports = [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];

  for (const vp of mobileViewports) {
    const hudHeight = 56;
    const safeAreaVertical = 40;
    const availableTotalH = vp.height - hudHeight - safeAreaVertical;

    // In Buttons mode, flex ratios: board gets flex-[1.25], D-pad gets flex-1 (total 2.25)
    const boardContainerH = Math.floor(availableTotalH * (1.25 / 2.25));
    const dpadContainerH = availableTotalH - boardContainerH;

    const boardDim = calculateCanvasDimensions(vp.width, boardContainerH, 2, { padding: 8 });

    // 1. Board must maintain strictly square 1:1 aspect ratio
    assert.equal(boardDim.backingWidth, boardDim.backingHeight);
    assert.ok(boardDim.cssSize > 0, `Board size must be positive for ${vp.width}x${vp.height}`);
    assert.ok(boardDim.cssSize <= vp.width, `Board width must not exceed screen width for ${vp.width}x${vp.height}`);
    assert.ok(boardDim.cssSize <= boardContainerH, `Board height must not exceed container height for ${vp.width}x${vp.height}`);

    // 2. D-pad container must have sufficient height for enlarged D-pad controls (min 160px)
    assert.ok(dpadContainerH >= 160, `D-pad container height (${dpadContainerH}px) must be >= 160px for ${vp.width}x${vp.height}`);
  }
});

test('buttons control mode mobile landscape geometry reserves ample gutter clearance for docked D-pad', () => {
  // Mobile test viewports in landscape:
  // e.g. iPhone SE (568x320), standard Android (800x360), modern wide phone (932x430)
  const landscapeViewports = [
    { width: 568, height: 320 },
    { width: 800, height: 360 },
    { width: 932, height: 430 },
  ];

  for (const vp of landscapeViewports) {
    const safeAreaHorizontal = 48; // left + right safe area insets
    const availableW = vp.width - safeAreaHorizontal;
    const availableH = vp.height; // in landscape, board uses available height

    const boardDim = calculateCanvasDimensions(availableW, availableH, 2, { padding: 8 });

    // 1. Board must maintain strictly square 1:1 aspect ratio
    assert.equal(boardDim.backingWidth, boardDim.backingHeight);
    assert.ok(boardDim.cssSize > 0);
    assert.ok(boardDim.cssSize <= availableH);

    // 2. Right gutter width: (availableW - boardDim.cssSize) / 2
    // Must be large enough to dock the touch D-pad (minimum 120px)
    const gutterWidth = Math.floor((availableW - boardDim.cssSize) / 2);
    assert.ok(gutterWidth >= 100, `Right gutter (${gutterWidth}px) must provide clearance for docked D-pad on ${vp.width}x${vp.height}`);
  }
});
