import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MIN_SWIPE_DISTANCE,
  calculateSwipeDirection,
  SwipeTracker,
  shouldShowDirectionalControls,
  shouldAcceptSwipeControls,
} from './controls.ts';
import {
  createInitialState,
  queueDirection,
} from './engine.ts';

test('swipe direction detection: all four cardinal directions', () => {
  // Right: positive dx > threshold
  assert.equal(calculateSwipeDirection(50, 0), 'RIGHT');
  // Left: negative dx > threshold
  assert.equal(calculateSwipeDirection(-50, 0), 'LEFT');
  // Down: positive dy > threshold
  assert.equal(calculateSwipeDirection(0, 50), 'DOWN');
  // Up: negative dy > threshold
  assert.equal(calculateSwipeDirection(0, -50), 'UP');
});

test('dominant-axis detection: resolves the primary axis correctly', () => {
  // Horizontal dominant (absX > absY)
  assert.equal(calculateSwipeDirection(60, 20), 'RIGHT');
  assert.equal(calculateSwipeDirection(-60, 20), 'LEFT');
  assert.equal(calculateSwipeDirection(60, -30), 'RIGHT');
  assert.equal(calculateSwipeDirection(-60, -30), 'LEFT');

  // Vertical dominant (absY > absX)
  assert.equal(calculateSwipeDirection(20, 60), 'DOWN');
  assert.equal(calculateSwipeDirection(20, -60), 'UP');
  assert.equal(calculateSwipeDirection(-30, 60), 'DOWN');
  assert.equal(calculateSwipeDirection(-30, -60), 'UP');
});

test('minimum swipe threshold and small movements being ignored', () => {
  const threshold = DEFAULT_MIN_SWIPE_DISTANCE; // 24

  // Small movements below threshold return null
  assert.equal(calculateSwipeDirection(10, 5), null);
  assert.equal(calculateSwipeDirection(-15, 8), null);
  assert.equal(calculateSwipeDirection(0, 0), null);
  assert.equal(calculateSwipeDirection(23, 0), null);
  assert.equal(calculateSwipeDirection(0, -23), null);

  // Exactly or above threshold returns direction
  assert.equal(calculateSwipeDirection(24, 0), 'RIGHT');
  assert.equal(calculateSwipeDirection(0, -24), 'UP');
  assert.equal(calculateSwipeDirection(25, 10), 'RIGHT');

  // Ambiguous 45-degree diagonal (|dx| === |dy|) returns null
  assert.equal(calculateSwipeDirection(40, 40), null);
  assert.equal(calculateSwipeDirection(-40, 40), null);
  assert.equal(calculateSwipeDirection(40, -40), null);
});

test('SwipeTracker: quick flick-and-release triggers direction on end', () => {
  const tracker = new SwipeTracker(24);

  tracker.start(100, 100);
  assert.equal(tracker.isTracking(), true);

  // Move a tiny amount (below threshold)
  const moveDir = tracker.move(110, 100);
  assert.equal(moveDir, null);

  // Release with total delta dx = 50 (above threshold)
  const endDir = tracker.end(150, 100);
  assert.equal(endDir, 'RIGHT');
  assert.equal(tracker.isTracking(), false);
});

test('SwipeTracker: prevention of duplicate gesture registration', () => {
  const tracker = new SwipeTracker(24);

  tracker.start(100, 100);

  // Large swipe triggered during move
  const moveDir = tracker.move(160, 100);
  assert.equal(moveDir, 'RIGHT');

  // End event at the same position MUST NOT register a second duplicate gesture
  const endDir = tracker.end(160, 100);
  assert.equal(endDir, null);
  assert.equal(tracker.isTracking(), false);
});

test('SwipeTracker: consecutive directional inputs without lifting finger', () => {
  const tracker = new SwipeTracker(24);

  tracker.start(100, 100);

  // 1. Swipe Right
  const firstDir = tracker.move(150, 100);
  assert.equal(firstDir, 'RIGHT');

  // 2. Drag Down without lifting finger (from new anchor 150, 100)
  const secondDir = tracker.move(150, 160);
  assert.equal(secondDir, 'DOWN');

  // 3. Drag Left without lifting finger (from new anchor 150, 160)
  const thirdDir = tracker.move(90, 160);
  assert.equal(thirdDir, 'LEFT');

  // Lifting finger without additional movement should be clean null
  assert.equal(tracker.end(90, 160), null);
});

test('SwipeTracker: touch cancellation safely aborts gesture without triggering', () => {
  const tracker = new SwipeTracker(24);

  tracker.start(100, 100);
  assert.equal(tracker.isTracking(), true);

  // Cancel triggered by browser/system
  tracker.cancel();
  assert.equal(tracker.isTracking(), false);

  // Post-cancel calls return null
  assert.equal(tracker.move(200, 100), null);
  assert.equal(tracker.end(200, 100), null);
});

test('direction-reversal prevention through existing engine when swiping', () => {
  // Initial state moving RIGHT
  let state = createInitialState('classic');
  assert.equal(state.direction, 'RIGHT');

  // Swiping LEFT directly is an opposite reversal -> must be safely rejected
  state = queueDirection(state, 'LEFT');
  assert.equal(state.queuedDirections.length, 0);
  assert.equal(state.direction, 'RIGHT');

  // Swiping UP is valid -> queued successfully
  state = queueDirection(state, 'UP');
  assert.equal(state.queuedDirections.length, 1);
  assert.equal(state.queuedDirections[0], 'UP');

  // Swiping DOWN while UP is queued -> opposite of queued direction, rejected
  state = queueDirection(state, 'DOWN');
  assert.equal(state.queuedDirections.length, 1);
  assert.equal(state.queuedDirections[0], 'UP');

  // Swiping LEFT while UP is queued -> valid turn, queued successfully
  state = queueDirection(state, 'LEFT');
  assert.equal(state.queuedDirections.length, 2);
  assert.deepEqual(state.queuedDirections, ['UP', 'LEFT']);
});

test('correct visibility of directional buttons in each mode', () => {
  // In swipe mode, directional buttons are hidden
  assert.equal(shouldShowDirectionalControls('swipe'), false);

  // In buttons mode, directional buttons are shown
  assert.equal(shouldShowDirectionalControls('buttons'), true);

  // In both mode, directional buttons are shown
  assert.equal(shouldShowDirectionalControls('both'), true);
});

test('correct acceptance of swipes in each mode', () => {
  // In swipe mode, swipes are accepted
  assert.equal(shouldAcceptSwipeControls('swipe'), true);

  // In buttons mode, swipes are disabled
  assert.equal(shouldAcceptSwipeControls('buttons'), false);

  // In both mode, swipes are accepted
  assert.equal(shouldAcceptSwipeControls('both'), true);
});

test('mode switching: repeated switching between swipe, buttons, and both remains consistent without stuck state', () => {
  const modes = ['swipe', 'buttons', 'both', 'buttons', 'swipe', 'both', 'swipe'] as const;

  for (const mode of modes) {
    const showDpad = shouldShowDirectionalControls(mode);
    const acceptSwipes = shouldAcceptSwipeControls(mode);

    if (mode === 'swipe') {
      assert.equal(showDpad, false);
      assert.equal(acceptSwipes, true);
    } else if (mode === 'buttons') {
      assert.equal(showDpad, true);
      assert.equal(acceptSwipes, false);
    } else if (mode === 'both') {
      assert.equal(showDpad, true);
      assert.equal(acceptSwipes, true);
    }
  }
});

test('directional input queue: max 2 turns buffered, ignores third input to prevent lag', () => {
  let state = createInitialState('classic');
  assert.equal(state.direction, 'RIGHT');

  // First turn: UP
  state = queueDirection(state, 'UP');
  assert.equal(state.queuedDirections.length, 1);
  assert.equal(state.queuedDirections[0], 'UP');

  // Second turn: LEFT
  state = queueDirection(state, 'LEFT');
  assert.equal(state.queuedDirections.length, 2);
  assert.deepEqual(state.queuedDirections, ['UP', 'LEFT']);

  // Third turn: DOWN - should be ignored because buffer limit is 2
  state = queueDirection(state, 'DOWN');
  assert.equal(state.queuedDirections.length, 2);
  assert.deepEqual(state.queuedDirections, ['UP', 'LEFT']);
});

test('input handling: ignores all direction inputs when snake is not alive or has won', () => {
  let deadState = createInitialState('classic');
  deadState.isAlive = false;

  const afterDead = queueDirection(deadState, 'UP');
  assert.equal(afterDead.queuedDirections.length, 0);

  let victoryState = createInitialState('classic');
  victoryState.isVictory = true;

  const afterVictory = queueDirection(victoryState, 'UP');
  assert.equal(afterVictory.queuedDirections.length, 0);
});
