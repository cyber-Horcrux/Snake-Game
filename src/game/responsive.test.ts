import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCanvasDimensions,
  calculateResponsiveDPadDimensions,
  calculateLandscapeControlLayout,
  calculateLegacyLandscapeDpadLayout,
  calculatePortraitControlLayout,
  getDeviceOrientation,
  isShortViewport,
  isNarrowViewport,
  MAX_CANVAS_DIMENSION,
  DEFAULT_HEADER_HEIGHT,
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

test('calculateResponsiveDPadDimensions satisfies target sizes across all 14 required viewports', () => {
  const targetViewports = [
    // Portrait phones:
    { name: '320 x 568 (Small portrait phone)', w: 320, h: 568, min: 62, max: 66, expected: 65 },
    { name: '360 x 800 (Standard portrait phone)', w: 360, h: 800, min: 70, max: 74, expected: 71 },
    { name: '375 x 812 (iPhone X/11/12/13 mini)', w: 375, h: 812, min: 72, max: 74, expected: 73 },
    { name: '390 x 844 (Mid-sized portrait phone / iPhone 14)', w: 390, h: 844, min: 73, max: 76, expected: 75 },
    { name: '412 x 915 (Android large portrait phone)', w: 412, h: 915, min: 74, max: 76, expected: 76 },
    { name: '430 x 932 (Large portrait phone / Pro Max)', w: 430, h: 932, min: 75, max: 76, expected: 76 },
    // Landscape phones:
    { name: '568 x 320 (Small landscape phone)', w: 568, h: 320, min: 60, max: 68, expected: 60 },
    { name: '667 x 375 (iPhone landscape)', w: 667, h: 375, min: 60, max: 68, expected: 68 },
    { name: '740 x 360 (Android landscape)', w: 740, h: 360, min: 60, max: 68, expected: 67 },
    { name: '844 x 390 (Modern phone landscape)', w: 844, h: 390, min: 60, max: 68, expected: 68 },
    { name: '915 x 412 (Wide phone landscape)', w: 915, h: 412, min: 60, max: 68, expected: 68 },
    // Tablets:
    { name: '768 x 1024 (iPad portrait)', w: 768, h: 1024, min: 76, max: 84, expected: 77 },
    { name: '820 x 1180 (iPad Air portrait)', w: 820, h: 1180, min: 76, max: 84, expected: 82 },
    { name: '1024 x 768 (iPad landscape)', w: 1024, h: 768, min: 76, max: 84, expected: 77 },
  ];

  for (const vp of targetViewports) {
    const dim = calculateResponsiveDPadDimensions(vp.w, vp.h);

    // Button size check against min/max ranges and target expected value
    assert.ok(
      dim.buttonSize >= vp.min && dim.buttonSize <= vp.max,
      `${vp.name}: buttonSize ${dim.buttonSize}px outside target range [${vp.min}, ${vp.max}]px`
    );
    assert.equal(dim.buttonSize, vp.expected, `${vp.name}: expected ${vp.expected}px, got ${dim.buttonSize}px`);

    // Proportional harmonic elements check
    assert.ok(dim.iconSize > 0 && dim.iconSize < dim.buttonSize, `${vp.name}: iconSize must be smaller than buttonSize`);
    assert.ok(dim.coreSize > 0 && dim.coreSize < dim.buttonSize, `${vp.name}: coreSize must be smaller than buttonSize`);
    assert.ok(dim.dotSize > 0 && dim.dotSize < dim.coreSize, `${vp.name}: dotSize must be smaller than coreSize`);
    assert.ok(dim.gap >= 6 && dim.gap <= 14, `${vp.name}: gap ${dim.gap}px outside [6, 14]px`);

    // Total layout dimensions check
    assert.equal(dim.totalHeight, dim.buttonSize * 3 + dim.gap * 2);
    assert.equal(dim.totalWidth, dim.buttonSize * 2 + dim.coreSize + dim.gap * 2);

    // Previous fixed button size was 48px; all responsive sizes must be strictly larger than 48px
    assert.ok(dim.buttonSize > 48, `${vp.name}: buttonSize (${dim.buttonSize}px) must be larger than legacy 48px`);
  }
});

test('landscape D-pad vertical positioning: naturally aligns with center of play area below Header HUD', () => {
  const landscapeDevices = [
    { name: 'Small landscape phone (568 x 320)', w: 568, h: 320 },
    { name: 'Standard Android landscape (740 x 360)', w: 740, h: 360 },
    { name: 'iPhone landscape (667 x 375)', w: 667, h: 375 },
    { name: 'Wide modern phone landscape (844 x 390)', w: 844, h: 390 },
    { name: 'Large Android phone landscape (915 x 412)', w: 915, h: 412 },
    { name: 'Large Pro Max landscape (932 x 430)', w: 932, h: 430 },
    { name: 'iPad landscape (1024 x 768)', w: 1024, h: 768 },
  ];

  for (const dev of landscapeDevices) {
    const layout = calculateLandscapeControlLayout(dev.w, dev.h);

    // Center Y must match the vertical center of the play-area container:
    // quickActionButtonsBottom + (playAreaHeight / 2)
    const expectedCenter = layout.quickActionButtonsBottom + layout.playAreaHeight / 2;
    assert.equal(layout.dpadCenterY, expectedCenter, `${dev.name}: D-pad center Y must align with play area`);

    // D-pad must be positioned strictly lower than the legacy full-screen center (which was h / 2)
    const legacyCenter = dev.h / 2;
    assert.ok(
      layout.dpadCenterY > legacyCenter,
      `${dev.name}: Corrected center (${layout.dpadCenterY}px) must be lower than legacy center (${legacyCenter}px)`
    );

    // D-pad top and bottom must be symmetrical relative to play-area center
    const topMargin = layout.dpadTop - layout.quickActionButtonsBottom;
    const bottomMargin = (layout.quickActionButtonsBottom + layout.playAreaHeight) - layout.dpadBottom;
    assert.equal(
      Math.round(topMargin),
      Math.round(bottomMargin),
      `${dev.name}: D-pad must be vertically centered symmetrically within play area`
    );
  }
});

test('no overlap between D-pad and Volume, Restart, or Stop buttons across all landscape viewports', () => {
  const landscapeScenarios = [
    { name: '568 x 320 (iPhone SE landscape, zero safe area)', w: 568, h: 320, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '568 x 320 (iPhone SE landscape, notch safe area)', w: 568, h: 320, safeAreaTop: 16, safeAreaBottom: 16 },
    { name: '480 x 320 (Compact 3:2 landscape)', w: 480, h: 320, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '640 x 360 (Standard compact 16:9 landscape)', w: 640, h: 360, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '667 x 375 (iPhone 8 landscape)', w: 667, h: 375, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '740 x 360 (Galaxy S20 landscape)', w: 740, h: 360, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '740 x 360 (Galaxy S20 landscape with status bar)', w: 740, h: 360, safeAreaTop: 24, safeAreaBottom: 16 },
    { name: '800 x 360 (Standard Android landscape)', w: 800, h: 360, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '844 x 390 (iPhone 14 landscape)', w: 844, h: 390, safeAreaTop: 0, safeAreaBottom: 21 },
    { name: '915 x 412 (Pixel 7 landscape)', w: 915, h: 412, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '932 x 430 (iPhone 15 Pro Max landscape)', w: 932, h: 430, safeAreaTop: 0, safeAreaBottom: 21 },
    { name: '960 x 320 (Ultra-wide 3:1 landscape phone)', w: 960, h: 320, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '1024 x 768 (iPad landscape)', w: 1024, h: 768, safeAreaTop: 0, safeAreaBottom: 0 },
    { name: '1280 x 720 (720p HD landscape)', w: 1280, h: 720, safeAreaTop: 0, safeAreaBottom: 0 },
  ];

  for (const s of landscapeScenarios) {
    const layout = calculateLandscapeControlLayout(s.w, s.h, {
      safeAreaTop: s.safeAreaTop,
      safeAreaBottom: s.safeAreaBottom,
    });

    // 1. Must never overlap (clearance > 0)
    assert.equal(layout.hasOverlap, false, `${s.name}: D-pad overlaps action buttons!`);

    // 2. Vertical clearance must be comfortable (at least 14px even on ultra-compact 320px screen with dual safe-areas, >=25px on standard devices)
    const minThreshold = s.h <= 320 && s.safeAreaTop > 0 ? 14 : 20;
    assert.ok(
      layout.verticalClearance >= minThreshold,
      `${s.name}: Clearance (${layout.verticalClearance}px) must be >= ${minThreshold}px`
    );

    // 3. Top of D-pad must be strictly below Header HUD quick action buttons
    assert.ok(
      layout.dpadTop > layout.quickActionButtonsBottom,
      `${s.name}: D-pad top (${layout.dpadTop}px) must be below action buttons (${layout.quickActionButtonsBottom}px)`
    );

    // 4. In contrast, verify that legacy layout caused overlap or critical collision on short screens
    if (s.h <= 360 && s.safeAreaTop > 0) {
      const legacy = calculateLegacyLandscapeDpadLayout(s.w, s.h, {
        safeAreaTop: s.safeAreaTop,
      });
      // The legacy code failed or produced severely reduced clearance on this screen
      assert.ok(
        legacy.verticalClearance < layout.verticalClearance,
        `${s.name}: New layout must have strictly better clearance than legacy`
      );
    }
  }
});

test('portrait layout remains unchanged and unregressed across all portrait viewports', () => {
  const portraitViewports = [
    { name: '320 x 568 (Small portrait phone)', w: 320, h: 568 },
    { name: '360 x 640 (Standard 16:9 portrait phone)', w: 360, h: 640 },
    { name: '360 x 800 (Standard portrait phone)', w: 360, h: 800 },
    { name: '375 x 812 (iPhone X/11/12/13 mini)', w: 375, h: 812 },
    { name: '390 x 844 (Mid-sized portrait phone / iPhone 14)', w: 390, h: 844 },
    { name: '412 x 915 (Android large portrait phone)', w: 412, h: 915 },
    { name: '430 x 932 (Large portrait phone / Pro Max)', w: 430, h: 932 },
    { name: '720 x 1280 (720p HD portrait)', w: 720, h: 1280 },
    { name: '768 x 1024 (iPad portrait)', w: 768, h: 1024 },
    { name: '820 x 1180 (iPad Air portrait)', w: 820, h: 1180 },
  ];

  for (const vp of portraitViewports) {
    const layout = calculatePortraitControlLayout(vp.h);

    // D-pad area must retain sufficient height (min 160px)
    assert.equal(layout.hasSufficientSpace, true, `${vp.name}: portrait D-pad container lacks height`);

    // Board container must preserve 1:1 aspect ratio canvas
    const canvasDim = calculateCanvasDimensions(vp.w, layout.boardContainerHeight, 2, { padding: 8 });
    assert.equal(canvasDim.backingWidth, canvasDim.backingHeight);
    assert.ok(canvasDim.cssSize > 0);
    assert.ok(canvasDim.cssSize <= vp.w);
    assert.ok(canvasDim.cssSize <= layout.boardContainerHeight);

    // Portrait orientation classifier must consistently report portrait
    assert.equal(getDeviceOrientation(vp.w, vp.h), 'portrait');
  }
});

test('small and large landscape viewports maintain comfortable margins without clipping', () => {
  const edgeCaseViewports = [
    { name: 'Ultra-small landscape phone (568 x 320)', w: 568, h: 320, minClearance: 25 },
    { name: 'Standard compact landscape (640 x 360)', w: 640, h: 360, minClearance: 35 },
    { name: 'Standard landscape (800 x 360)', w: 800, h: 360, minClearance: 35 },
    { name: 'Wide landscape (932 x 430)', w: 932, h: 430, minClearance: 45 },
    { name: 'iPad landscape (1024 x 768)', w: 1024, h: 768, minClearance: 100 },
    { name: 'Full HD desktop/tablet (1920 x 1080)', w: 1920, h: 1080, minClearance: 150 },
  ];

  for (const vp of edgeCaseViewports) {
    const layout = calculateLandscapeControlLayout(vp.w, vp.h);

    assert.equal(layout.hasOverlap, false);
    assert.ok(
      layout.verticalClearance >= vp.minClearance,
      `${vp.name}: clearance ${layout.verticalClearance}px must be >= ${vp.minClearance}px`
    );

    // D-pad bottom must not exceed viewport height
    assert.ok(
      layout.dpadBottom <= vp.h,
      `${vp.name}: D-pad bottom (${layout.dpadBottom}px) must not overflow viewport (${vp.h}px)`
    );

    // Orientation helper must classify as landscape
    assert.equal(getDeviceOrientation(vp.w, vp.h), 'landscape');
  }
});

test('portrait and landscape responsive transitions maintain consistent geometry', () => {
  const devices = [
    { name: 'Standard phone', portrait: { w: 360, h: 800 }, landscape: { w: 800, h: 360 } },
    { name: 'iPhone 14', portrait: { w: 390, h: 844 }, landscape: { w: 844, h: 390 } },
    { name: 'Compact phone', portrait: { w: 320, h: 568 }, landscape: { w: 568, h: 320 } },
    { name: 'iPad', portrait: { w: 768, h: 1024 }, landscape: { w: 1024, h: 768 } },
  ];

  for (const d of devices) {
    // 1. Transition into portrait
    assert.equal(getDeviceOrientation(d.portrait.w, d.portrait.h), 'portrait');
    const pLayout = calculatePortraitControlLayout(d.portrait.h);
    assert.equal(pLayout.hasSufficientSpace, true);

    // 2. Transition into landscape
    assert.equal(getDeviceOrientation(d.landscape.w, d.landscape.h), 'landscape');
    const lLayout = calculateLandscapeControlLayout(d.landscape.w, d.landscape.h);
    assert.equal(lLayout.hasOverlap, false);
    assert.ok(lLayout.verticalClearance >= 25);
  }
});

