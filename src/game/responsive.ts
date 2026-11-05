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
