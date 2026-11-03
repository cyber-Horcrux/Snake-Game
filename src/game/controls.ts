/**
 * Mobile & Touch Movement Controls Module
 * Reliable swipe gesture detection, dominant-axis calculation,
 * consecutive gesture tracking, and control mode helpers.
 */
import type { ControlMode, Direction } from './types.ts';

export const DEFAULT_MIN_SWIPE_DISTANCE = 24;

/**
 * Calculates directional intent based on horizontal (dx) and vertical (dy) delta.
 * Dominant axis is evaluated, and movements below minDistance or perfect diagonals are rejected.
 */
export function calculateSwipeDirection(
  dx: number,
  dy: number,
  minDistance: number = DEFAULT_MIN_SWIPE_DISTANCE
): Direction | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  // Small accidental movements are ignored
  if (absX < minDistance && absY < minDistance) {
    return null;
  }

  // Exact 45-degree diagonal is ambiguous
  if (absX === absY) {
    return null;
  }

  // Dominant axis detection
  if (absX > absY) {
    return dx > 0 ? 'RIGHT' : 'LEFT';
  } else {
    return dy > 0 ? 'DOWN' : 'UP';
  }
}

/**
 * Reliable swipe tracker that handles:
 * - Minimum distance thresholds
 * - Dominant axis resolution
 * - Flick-and-release gestures
 * - Consecutive continuous drag gestures (without lifting finger)
 * - Prevention of duplicate gesture registration
 * - Touch & pointer cancellations
 */
export class SwipeTracker {
  private startX: number = 0;
  private startY: number = 0;
  private lastX: number = 0;
  private lastY: number = 0;
  private active: boolean = false;
  private hasTriggered: boolean = false;
  private readonly minDistance: number;

  constructor(minDistance: number = DEFAULT_MIN_SWIPE_DISTANCE) {
    this.minDistance = minDistance;
  }

  public isTracking(): boolean {
    return this.active;
  }

  public getCoordinates(): { startX: number; startY: number; lastX: number; lastY: number } {
    return {
      startX: this.startX,
      startY: this.startY,
      lastX: this.lastX,
      lastY: this.lastY,
    };
  }

  /**
   * Initializes a new gesture sequence at (x, y).
   */
  public start(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    this.lastX = x;
    this.lastY = y;
    this.active = true;
    this.hasTriggered = false;
  }

  /**
   * Evaluates active drag movement.
   * If a swipe threshold is met, returns the direction and resets the anchor
   * to enable consecutive directional inputs without lifting the finger.
   */
  public move(x: number, y: number): Direction | null {
    if (!this.active) return null;
    this.lastX = x;
    this.lastY = y;

    const dx = x - this.startX;
    const dy = y - this.startY;
    const dir = calculateSwipeDirection(dx, dy, this.minDistance);

    if (dir) {
      this.hasTriggered = true;
      // Re-anchor to current point to allow consecutive chained inputs
      this.startX = x;
      this.startY = y;
      return dir;
    }

    return null;
  }

  /**
   * Concludes the gesture.
   * If no direction was triggered during the move phase (e.g. quick flick & release),
   * evaluates the overall trajectory. Avoids registering duplicate gestures if already triggered.
   */
  public end(x: number, y: number): Direction | null {
    if (!this.active) return null;
    this.lastX = x;
    this.lastY = y;

    let dir: Direction | null = null;
    if (!this.hasTriggered) {
      const dx = x - this.startX;
      const dy = y - this.startY;
      dir = calculateSwipeDirection(dx, dy, this.minDistance);
    }

    this.active = false;
    this.hasTriggered = false;
    return dir;
  }

  /**
   * Safely cancels any active gesture tracking without firing a direction.
   */
  public cancel(): void {
    this.active = false;
    this.hasTriggered = false;
  }
}

/**
 * Determines whether on-screen directional buttons (D-Pad) should be displayed.
 */
export function shouldShowDirectionalControls(controlMode: ControlMode): boolean {
  return controlMode === 'buttons' || controlMode === 'both';
}

/**
 * Determines whether touch and pointer swipe gestures on the board should be processed.
 */
export function shouldAcceptSwipeControls(controlMode: ControlMode): boolean {
  return controlMode === 'swipe' || controlMode === 'both';
}
