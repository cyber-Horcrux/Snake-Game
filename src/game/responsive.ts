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
