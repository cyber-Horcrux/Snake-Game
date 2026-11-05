/**
 * Responsive Canvas, Layout Math & Viewport Helpers
 * Handles orientation detection, safe-area boundary calculations,
 * and high-DPR square canvas dimension resolution without arbitrary minimum clamps.
 */

export interface CanvasDimensions {
  cssSize: number;
  backingWidth: number;
  backingHeight: number;
}

export interface CanvasSizeOptions {
  maxDimension?: number;
  padding?: number;
}

export const MAX_CANVAS_DIMENSION = 760;
export const DEFAULT_CANVAS_PADDING = 12;

/**
 * Calculates square canvas dimensions based on available container space and DPR.
 * - Removes the legacy 280px minimum clamp, enabling full accessibility on small or short viewports.
 * - Preserves the 760px maximum cap to maintain high fidelity without performance degradation.
 * - Guarantees a perfectly 1:1 square aspect ratio.
 */
export function calculateCanvasDimensions(
  containerWidth: number,
  containerHeight: number,
  dpr: number = 1,
  options: CanvasSizeOptions = {}
): CanvasDimensions {
  const maxDim = options.maxDimension ?? MAX_CANVAS_DIMENSION;
  const padding = options.padding ?? DEFAULT_CANVAS_PADDING;

  const availW = Math.max(0, containerWidth - padding * 2);
  const availH = Math.max(0, containerHeight - padding * 2);

  const rawMin = Math.min(availW, availH);
  const cssSize = Math.floor(Math.min(maxDim, Math.max(0, rawMin)));

  const clampedDpr = Math.max(1, Math.min(2, dpr));
  const backingWidth = Math.round(cssSize * clampedDpr);
  const backingHeight = Math.round(cssSize * clampedDpr);

  return {
    cssSize,
    backingWidth,
    backingHeight,
  };
}

/**
 * Determines device viewport orientation.
 */
export function getDeviceOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Checks if the screen height is considered short (e.g. landscape phone or small netbook).
 */
export function isShortViewport(height: number, threshold: number = 520): boolean {
  return height > 0 && height <= threshold;
}

/**
 * Checks if the screen width is considered narrow (e.g. small smartphone <= 360px).
 */
export function isNarrowViewport(width: number, threshold: number = 380): boolean {
  return width > 0 && width <= threshold;
}

export interface DPadDimensions {
  buttonSize: number;
  iconSize: number;
  coreSize: number;
  dotSize: number;
  gap: number;
  totalHeight: number;
  totalWidth: number;
}

/**
 * Calculates responsive D-pad button dimensions and spacing based on viewport width, height, and orientation.
 * Design targets:
 * - Small portrait phones (<360px): approximately 64px
 * - Standard portrait phones (360-400px): approximately 72px
 * - Large portrait phones (400px+): approximately 76px
 * - Landscape phones: approximately 60–68px
 * - Tablets (>=768px): approximately 76–84px
 */
export function calculateResponsiveDPadDimensions(
  viewportWidth: number,
  viewportHeight: number
): DPadDimensions {
  const isLandscape = viewportWidth > viewportHeight;
  const isTablet = Math.min(viewportWidth, viewportHeight) >= 700;

  let buttonSize: number;

  if (isTablet) {
    // Tablet (portrait or landscape): target 76px - 84px
    const raw = Math.min(viewportWidth * 0.10, viewportHeight * 0.10);
    buttonSize = Math.round(Math.max(76, Math.min(84, raw)));
  } else if (isLandscape) {
    // Landscape phone: target 60px - 68px
    const raw = Math.min(viewportHeight * 0.185, viewportWidth * 0.12);
    buttonSize = Math.round(Math.max(60, Math.min(68, raw)));
  } else {
    // Portrait phone:
    // Small phone (<360px): ~64px
    // Standard phone (360-400px): ~72px
    // Large phone (400px+): ~76px
    const widthScaled = viewportWidth * 0.13 + 24;
    const heightScaled = viewportHeight * 0.115;
    const raw = Math.min(widthScaled, heightScaled);
    buttonSize = Math.round(Math.max(62, Math.min(76, raw)));
  }

  const iconSize = Math.round(buttonSize * 0.48);
  const coreSize = Math.round(buttonSize * 0.62);
  const dotSize = Math.round(buttonSize * 0.18);
  const gap = Math.round(Math.max(6, Math.min(12, buttonSize * 0.13)));

  const totalHeight = buttonSize * 3 + gap * 2;
  const totalWidth = buttonSize * 2 + coreSize + gap * 2;

  return {
    buttonSize,
    iconSize,
    coreSize,
    dotSize,
    gap,
    totalHeight,
    totalWidth,
  };
}

export const DEFAULT_HEADER_HEIGHT = 52;

export interface LandscapeControlLayout {
  headerHeight: number;
  playAreaHeight: number;
  dpadTop: number;
  dpadBottom: number;
  dpadCenterY: number;
  quickActionButtonsBottom: number;
  verticalClearance: number;
  hasOverlap: boolean;
}

/**
 * Calculates the vertical layout, center alignment, and clearance between
 * Header HUD quick action buttons (Volume, Restart, Stop/Pause) and the docked
 * touch D-Pad in landscape orientation.
 *
 * Verifies that the D-pad is aligned within its intended control region
 * (the play-area container strictly below the Header HUD) rather than centered
 * across the entire viewport, preventing any overlap with the top action buttons.
 */
export function calculateLandscapeControlLayout(
  viewportWidth: number,
  viewportHeight: number,
  options: {
    headerHeight?: number;
    safeAreaTop?: number;
    safeAreaBottom?: number;
  } = {}
): LandscapeControlLayout {
  const safeAreaTop = options.safeAreaTop ?? 0;
  const safeAreaBottom = options.safeAreaBottom ?? 0;
  const headerHeight = options.headerHeight ?? DEFAULT_HEADER_HEIGHT;

  // The Header HUD action buttons (Volume, Restart, Stop) sit within the header
  const quickActionButtonsBottom = safeAreaTop + headerHeight;

  // Play area is the region below Header HUD down to the bottom safe area
  const playAreaHeight = Math.max(0, viewportHeight - quickActionButtonsBottom - safeAreaBottom);

  // Responsive D-Pad dimensions
  const dpadDim = calculateResponsiveDPadDimensions(viewportWidth, viewportHeight);
  // Touch D-Pad container padding (p-1 is 4px top + 4px bottom = 8px)
  const dpadTotalHeight = dpadDim.totalHeight + 8;

  // In the corrected layout:
  // The D-pad is centered within the play-area container:
  // Center is at quickActionButtonsBottom + (playAreaHeight / 2)
  const dpadCenterY = quickActionButtonsBottom + playAreaHeight / 2;
  const dpadTop = dpadCenterY - dpadTotalHeight / 2;
  const dpadBottom = dpadCenterY + dpadTotalHeight / 2;

  // Vertical clearance between the bottom of the Header HUD controls and the top of the D-pad
  const verticalClearance = dpadTop - quickActionButtonsBottom;
  const hasOverlap = verticalClearance < 0;

  return {
    headerHeight,
    playAreaHeight,
    dpadTop,
    dpadBottom,
    dpadCenterY,
    quickActionButtonsBottom,
    verticalClearance,
    hasOverlap,
  };
}

/**
 * Legacy calculation where D-pad was centered on the full screen height (50vh)
 * regardless of the Header HUD. Provided for regression verification.
 */
export function calculateLegacyLandscapeDpadLayout(
  viewportWidth: number,
  viewportHeight: number,
  options: {
    headerHeight?: number;
    safeAreaTop?: number;
  } = {}
): { dpadTop: number; quickActionButtonsBottom: number; verticalClearance: number; hasOverlap: boolean } {
  const safeAreaTop = options.safeAreaTop ?? 0;
  const headerHeight = options.headerHeight ?? DEFAULT_HEADER_HEIGHT;
  const quickActionButtonsBottom = safeAreaTop + headerHeight;

  const dpadDim = calculateResponsiveDPadDimensions(viewportWidth, viewportHeight);
  const dpadTotalHeight = dpadDim.totalHeight + 8;

  // Legacy: centered relative to 100vh of the entire screen
  const centerY = viewportHeight / 2;
  const dpadTop = centerY - dpadTotalHeight / 2;
  const verticalClearance = dpadTop - quickActionButtonsBottom;
  const hasOverlap = verticalClearance < 0;

  return {
    dpadTop,
    quickActionButtonsBottom,
    verticalClearance,
    hasOverlap,
  };
}

export interface PortraitControlLayout {
  headerHeight: number;
  availableHeight: number;
  boardContainerHeight: number;
  dpadContainerHeight: number;
  hasSufficientSpace: boolean;
}

/**
 * Calculates portrait control layout geometry to guarantee portrait dimensions,
 * flex split ratios, and clearances remain unregressed.
 */
export function calculatePortraitControlLayout(
  viewportHeight: number,
  options: {
    headerHeight?: number;
    safeAreaTop?: number;
    safeAreaBottom?: number;
  } = {}
): PortraitControlLayout {
  const safeAreaTop = options.safeAreaTop ?? 0;
  const safeAreaBottom = options.safeAreaBottom ?? 0;
  const headerHeight = options.headerHeight ?? 56;

  const availableHeight = Math.max(0, viewportHeight - headerHeight - safeAreaTop - safeAreaBottom);
  // Board container gets flex-[1.2], D-pad gets flex-1 (total 2.2)
  const boardContainerHeight = Math.floor(availableHeight * (1.2 / 2.2));
  const dpadContainerHeight = availableHeight - boardContainerHeight;
  const hasSufficientSpace = dpadContainerHeight >= 160;

  return {
    headerHeight,
    availableHeight,
    boardContainerHeight,
    dpadContainerHeight,
    hasSufficientSpace,
  };
}
