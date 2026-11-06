import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  queueDirection,
  stepGame,
  isOpposite,
  findEmptyCell,
  calculateTickInterval,
  findSafeDeflectionDirection,
  calculateClearance,
  isCellClear,
} from './engine.ts';
import { POINTS, MODE_SPEEDS } from './constants.ts';
import type { Obstacle, WarpGate } from './types.ts';

test('isOpposite correctly detects opposite directions and non-opposites', () => {
  assert.equal(isOpposite('UP', 'DOWN'), true);
  assert.equal(isOpposite('DOWN', 'UP'), true);
  assert.equal(isOpposite('LEFT', 'RIGHT'), true);
  assert.equal(isOpposite('RIGHT', 'LEFT'), true);

  assert.equal(isOpposite('UP', 'LEFT'), false);
  assert.equal(isOpposite('UP', 'RIGHT'), false);
  assert.equal(isOpposite('LEFT', 'DOWN'), false);
});

test('snake initializes with correct length and facing RIGHT', () => {
  const state = createInitialState('classic', 20, 20);
  assert.equal(state.direction, 'RIGHT');
  assert.equal(state.snake.length, 3);
  assert.equal(state.isAlive, true);
  assert.equal(state.score, 0);
  assert.equal(state.level, 1);
  assert.equal(state.food.length, 1);
  assert.equal(state.food[0].type, 'normal');
});

test('movement in current direction updates head and body coordinates', () => {
  const state = createInitialState('classic', 20, 20);
  const headBefore = state.snake[0];
  const { state: nextState } = stepGame(state, 100);

  assert.equal(nextState.snake[0].x, headBefore.x + 1);
  assert.equal(nextState.snake[0].y, headBefore.y);
  assert.equal(nextState.snake.length, 3);
});

test('rejection of direct 180-degree opposite turn', () => {
  const state = createInitialState('classic', 20, 20);
  assert.equal(state.direction, 'RIGHT');

  // Attempting to turn LEFT while moving RIGHT must be rejected
  const queued = queueDirection(state, 'LEFT');
  assert.equal(queued.queuedDirections.length, 0);

  // Valid orthogonal turn should be accepted
  const queuedUp = queueDirection(state, 'UP');
  assert.equal(queuedUp.queuedDirections.length, 1);
  assert.equal(queuedUp.queuedDirections[0], 'UP');
});

test('rapid direction changes are buffered up to limit', () => {
  const state = createInitialState('classic', 20, 20);
  // Heading RIGHT -> Queue UP -> Queue LEFT
  const q1 = queueDirection(state, 'UP');
  const q2 = queueDirection(q1, 'LEFT');
  assert.deepEqual(q2.queuedDirections, ['UP', 'LEFT']);

  // Exceeding 2 turns is ignored
  const q3 = queueDirection(q2, 'DOWN');
  assert.equal(q3.queuedDirections.length, 2);

  // Stepping advances through the queue
  const step1 = stepGame(q2, 100);
  assert.equal(step1.state.direction, 'UP');
  assert.deepEqual(step1.state.queuedDirections, ['LEFT']);

  const step2 = stepGame(step1.state, 200);
  assert.equal(step2.state.direction, 'LEFT');
  assert.deepEqual(step2.state.queuedDirections, []);
});

test('eating food awards points exactly once, grows snake, and increments counter', () => {
  const state = createInitialState('classic', 20, 20);
  const head = state.snake[0];

  // Force food directly in front of snake
  state.food = [
    {
      id: 'test-food',
      type: 'normal',
      position: { x: head.x + 1, y: head.y },
      points: POINTS.NORMAL_FOOD,
    },
  ];

  const result = stepGame(state, 100);
  assert.equal(result.state.score, POINTS.NORMAL_FOOD);
  assert.equal(result.state.foodEaten, 1);
  assert.equal(result.events.includes('eat'), true);

  // Snake length increases by 1
  assert.equal(result.state.snake.length, 4);

  // Next step without food retains score and length
  const nextStep = stepGame(result.state, 200);
  assert.equal(nextStep.state.score, POINTS.NORMAL_FOOD);
  assert.equal(nextStep.state.snake.length, 4);
});

test('tail-vacating edge case: moving into tail is legal when not growing', () => {
  // Construct a snake looped on itself where the next head position is the tail:
  // e.g. (2,1) -> (2,2) -> (1,2) -> (1,1), moving UP from (2,1) wouldn't reach (1,1),
  // let's create a 4-segment ring:
  // Head at (2, 1), body at (2, 2), (1, 2), tail at (1, 1). Heading UP would go to (2, 0).
  // If heading LEFT, head goes to (1, 1), which is the current tail position!
  const customState = createInitialState('classic', 10, 10);
  customState.snake = [
    { x: 2, y: 1 }, // head
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 1 }, // tail
  ];
  customState.direction = 'LEFT';
  customState.pendingGrowth = 0;
  customState.food = [];

  const result = stepGame(customState, 100);
  // Head moved to (1, 1) and tail vacated, so snake remains alive!
  assert.equal(result.state.isAlive, true);
  assert.equal(result.state.snake[0].x, 1);
  assert.equal(result.state.snake[0].y, 1);
});

test('tail-vacating collision: moving into tail is fatal when growing', () => {
  const customState = createInitialState('classic', 10, 10);
  customState.snake = [
    { x: 2, y: 1 },
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 1 }, // tail
  ];
  customState.direction = 'LEFT';
  customState.pendingGrowth = 1; // growing, so tail does NOT vacate
  customState.food = [];

  const result = stepGame(customState, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'self');
});

test('self-collision ends run when no shield is active', () => {
  const customState = createInitialState('classic', 10, 10);
  // Head at (3,2), body segments at (3,3), (2,3), (2,2), (2,1), (3,1)
  // Moving UP from (3,2) hits segment at (3,1)
  customState.snake = [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 2, y: 3 },
    { x: 2, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ];
  customState.direction = 'UP';
  customState.food = [];

  const result = stepGame(customState, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'self');
  assert.equal(result.events.includes('game_over'), true);
});

test('wall collision in classic mode causes death', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  state.direction = 'RIGHT';

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'wall');
});

test('wall collision in zen mode wraps around to opposite edge', () => {
  const state = createInitialState('zen', 10, 10);
  state.snake = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  state.direction = 'RIGHT';

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.state.snake[0].x, 0); // Wrapped from 9 to 0
  assert.equal(result.state.snake[0].y, 5);
});

test('shield absorbs wall collision and protects the snake', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = true;

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.powerUps.hasShield, false); // Shield was consumed
  assert.equal(result.events.includes('shield_absorb'), true);
});

test('shield absorbs self collision and protects the snake', () => {
  const customState = createInitialState('classic', 10, 10);
  customState.snake = [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 2, y: 3 },
    { x: 2, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ];
  customState.direction = 'UP';
  customState.powerUps.hasShield = true;

  const result = stepGame(customState, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.powerUps.hasShield, false);
});

test('findEmptyCell returns null on full board without infinite loop', () => {
  const W = 3;
  const H = 3;
  const occupied = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      occupied.push({ x, y });
    }
  }

  const result = findEmptyCell(W, H, occupied);
  assert.equal(result, null);
});

test('full board victory state triggers when snake fills grid', () => {
  const state = createInitialState('classic', 2, 2); // 4 cells total
  // Snake of length 3: (0,0), (1,0), (1,1). Moving to (0,1) fills the board!
  state.snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  state.direction = 'DOWN';
  state.food = [
    {
      id: 'f1',
      type: 'normal',
      position: { x: 0, y: 1 },
      points: 10,
    },
  ];

  const result = stepGame(state, 100);
  assert.equal(result.state.isVictory, true);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.snake.length, 4);
});

test('slow-mo speed calculation properly adjusts interval', () => {
  const normalSpeed = calculateTickInterval('classic', 1, false);
  const slowMoSpeed = calculateTickInterval('classic', 1, true);

  assert.equal(slowMoSpeed > normalSpeed, true);
});

test('level progression triggers every 5 foods', () => {
  const state = createInitialState('classic', 20, 20);
  state.foodEaten = 4;
  state.food = [
    {
      id: 'f-level',
      type: 'normal',
      position: { x: state.snake[0].x + 1, y: state.snake[0].y },
      points: 10,
    },
  ];

  const result = stepGame(state, 100);
  assert.equal(result.state.foodEaten, 5);
  assert.equal(result.state.level, 2);
  assert.equal(result.events.includes('level_up'), true);
});

test('combo multiplier increments on rapid consecutive food consumption', () => {
  const state = createInitialState('classic', 20, 20);
  const head = state.snake[0];

  // Food 1 directly in front
  state.food = [
    {
      id: 'f-1',
      type: 'normal',
      position: { x: head.x + 1, y: head.y },
      points: 10,
    },
  ];

  // First food eaten at t=100
  const step1 = stepGame(state, 100);
  assert.equal(step1.state.score, 10); // 10 * 1x
  assert.equal(step1.state.combo, 1);

  // Position Food 2 directly in front for next step at t=200
  step1.state.food = [
    {
      id: 'f-2',
      type: 'normal',
      position: { x: step1.state.snake[0].x + 1, y: step1.state.snake[0].y },
      points: 10,
    },
  ];

  const step2 = stepGame(step1.state, 200);
  assert.equal(step2.state.combo, 2); // Combo elevated to 2x!
  assert.equal(step2.state.score, 10 + (10 * 2)); // 30 total
  assert.equal(step2.events.includes('combo'), true);
});

test('combo resets to 1x when time window elapses without food', () => {
  const state = createInitialState('classic', 20, 20);
  state.combo = 3;
  state.comboExpiresAt = 2000;

  // Step game after combo expired (at t=3000)
  const result = stepGame(state, 3000);
  assert.equal(result.state.combo, 1);
});

test('expired timed food items are removed from the board', () => {
  const state = createInitialState('classic', 20, 20);
  state.food = [
    {
      id: 'timed-bonus',
      type: 'bonus',
      position: { x: 5, y: 5 },
      points: 30,
      expiresAt: 500, // expires at 500ms
    },
  ];

  // Step at t=600ms (item has expired)
  const result = stepGame(state, 600);
  assert.equal(result.state.food.some(f => f.id === 'timed-bonus'), false);
});

test('zen mode boundary wrapping increments wallsWrapped counter', () => {
  const state = createInitialState('zen', 10, 10);
  state.snake = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  state.direction = 'RIGHT';
  state.wallsWrapped = 0;

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.state.snake[0].x, 0);
  assert.equal(result.state.wallsWrapped, 1);
});

test('shield absorb increments shieldsUsed and keeps snake alive', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = true;
  state.shieldsUsed = 0;

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.shieldsUsed, 1);
  assert.equal(result.state.powerUps.hasShield, false);
});

test('collecting powerup items increments powerUpsCollected', () => {
  const state = createInitialState('classic', 10, 10);
  const head = state.snake[0];
  state.food = [
    {
      id: 'p-slow',
      type: 'powerup_slow',
      position: { x: head.x + 1, y: head.y },
      points: 25,
    },
  ];
  state.powerUpsCollected = 0;

  const result = stepGame(state, 100);
  assert.equal(result.state.powerUpsCollected, 1);
  assert.equal(result.events.includes('powerup'), true);
});

test('full gameplay lifecycle: initialize, move, eat food, grow, increment score, and collide', () => {
  // 1. Initial State
  let state = createInitialState('classic', 12, 12);
  assert.equal(state.isAlive, true);
  assert.equal(state.score, 0);
  assert.equal(state.level, 1);
  assert.equal(state.snake.length, 3);
  assert.equal(state.direction, 'RIGHT');

  // Place food directly ahead of head (head is at (4, 6), food at (5, 6))
  const head = state.snake[0];
  state.food = [
    {
      id: 'target-core',
      type: 'normal',
      position: { x: head.x + 1, y: head.y },
      points: 10,
    },
  ];

  // 2. Step into Food -> snake immediately grows from 3 to 4 segments
  const step1 = stepGame(state, 1000);
  state = step1.state;
  assert.equal(state.isAlive, true);
  assert.equal(state.score, 10);
  assert.equal(state.foodEaten, 1);
  assert.equal(state.snake.length, 4);
  assert.equal(state.pendingGrowth, 0);
  assert.equal(step1.events.includes('eat'), true);

  // 3. Step forward again (no pending growth) -> snake length remains 4
  const step2 = stepGame(state, 1200);
  state = step2.state;
  assert.equal(state.snake.length, 4);
  assert.equal(state.pendingGrowth, 0);

  // 4. Queue turn UP and step
  state = queueDirection(state, 'UP');
  assert.equal(state.queuedDirections[0], 'UP');
  const step3 = stepGame(state, 1400);
  state = step3.state;
  assert.equal(state.direction, 'UP');
  assert.equal(step3.events.includes('turn'), true);

  // 5. Navigate to top boundary to trigger wall collision
  // Move UP until hitting y < 0
  while (state.isAlive) {
    state = stepGame(state, 2000).state;
  }
  assert.equal(state.isAlive, false);
  assert.equal(state.deathReason, 'wall');
});

test('power-up slow-mo factor: properly resets tickInterval when duration expires', () => {
  const normalInterval = calculateTickInterval('classic', 1, false);
  const slowMoInterval = calculateTickInterval('classic', 1, true);

  // Slow-mo interval must be strictly larger (slower simulation speed)
  assert.ok(slowMoInterval > normalInterval);

  // When slowMoUntil has passed, isSlowMoActive becomes false
  const now = 10000;
  const expiredTime = now - 500;
  const isSlowMoActive = now < expiredTime;
  assert.equal(isSlowMoActive, false);
  assert.equal(calculateTickInterval('classic', 1, isSlowMoActive), normalInterval);
});

test('queueDirection safely rejects input when snake is dead or in victory', () => {
  const deadState = createInitialState('classic', 10, 10);
  deadState.isAlive = false;

  const resultDead = queueDirection(deadState, 'UP');
  assert.equal(resultDead.queuedDirections.length, 0);

  const victoryState = createInitialState('classic', 10, 10);
  victoryState.isVictory = true;

  const resultVictory = queueDirection(victoryState, 'UP');
  assert.equal(resultVictory.queuedDirections.length, 0);
});

// ==========================================
// v1.3 THE CHALLENGE UPDATE: TASK 2 UNIT TESTS
// ==========================================

test('v1.3 state initialization initializes obstacles, warpGate, stage, stageFoodEaten, and maxCombo', () => {
  const classicState = createInitialState('classic', 20, 20);
  assert.deepEqual(classicState.obstacles, []);
  assert.equal(classicState.warpGate, null);
  assert.equal(classicState.stage, 1);
  assert.equal(classicState.stageFoodEaten, 0);
  assert.equal(classicState.maxCombo, 1);

  const customObstacles: Obstacle[] = [
    { id: 'w1', x: 2, y: 2, type: 'wall' },
    { id: 'b1', x: 3, y: 3, type: 'barrier' },
    { id: 'h1', x: 4, y: 4, type: 'hazard' },
  ];
  const customGate: WarpGate = { x: 9, y: 0, active: false };

  const mazeState = createInitialState('maze', 20, 20, Math.random, customObstacles, customGate);
  assert.equal(mazeState.mode, 'maze');
  assert.equal(mazeState.obstacles.length, 3);
  assert.deepEqual(mazeState.warpGate, customGate);
  assert.equal(mazeState.stage, 1);
  assert.equal(mazeState.stageFoodEaten, 0);
  assert.equal(mazeState.maxCombo, 1);
});

test('v1.3 maze mode tick interval uses dedicated startMs and speedStepMs', () => {
  const mazeConfig = MODE_SPEEDS.maze;
  assert.equal(mazeConfig.startMs, 140);
  assert.equal(mazeConfig.minMs, 70);
  assert.equal(mazeConfig.speedStepMs, 6);

  const lvl1Interval = calculateTickInterval('maze', 1, false);
  assert.equal(lvl1Interval, 140);

  const lvl5Interval = calculateTickInterval('maze', 5, false);
  assert.equal(lvl5Interval, 140 - 4 * 6); // 116ms

  const slowInterval = calculateTickInterval('maze', 1, true);
  assert.ok(slowInterval > 140);
});

test('v1.3 static wall collision without shield is fatal with deathReason wall', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = false;
  state.obstacles = [{ id: 'wall-1', x: 6, y: 5, type: 'wall' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'wall');
  assert.ok(result.events.includes('game_over'));
});

test('v1.3 static wall collision with shield halts head, absorbs shield, and deflections safely', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = true;
  state.shieldsUsed = 0;
  state.obstacles = [{ id: 'wall-1', x: 6, y: 5, type: 'wall' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.shieldsUsed, 1);
  assert.equal(result.state.powerUps.hasShield, false);
  assert.ok(result.events.includes('shield_absorb'));

  // Head remains in place on deflection tick
  assert.equal(result.state.snake[0].x, 5);
  assert.equal(result.state.snake[0].y, 5);

  // prevSnake identical to snake (zero sub-frame lerp jitter)
  assert.deepEqual(result.state.prevSnake, result.state.snake);

  // Deflected direction must be orthogonal (UP or DOWN)
  assert.ok(result.state.direction === 'UP' || result.state.direction === 'DOWN');
});

test('v1.3 static wall collision with shield consumes valid queued orthogonal turn', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  // Heading RIGHT towards wall at (6, 5), with UP queued behind it
  state.queuedDirections = ['RIGHT', 'UP'];
  state.powerUps.hasShield = true;
  state.obstacles = [{ id: 'wall-1', x: 6, y: 5, type: 'wall' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.state.direction, 'UP');
  assert.equal(result.state.queuedDirections.length, 0);
  assert.equal(result.state.snake[0].x, 5);
  assert.equal(result.state.snake[0].y, 5);
});

test('v1.3 static wall collision with shield purges wall-bound and opposite queued turns', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  // Queued RIGHT (into wall), another RIGHT (into wall), then DOWN (clear turn)
  state.queuedDirections = ['RIGHT', 'RIGHT', 'DOWN'];
  state.powerUps.hasShield = true;
  state.obstacles = [{ id: 'wall-1', x: 6, y: 5, type: 'wall' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.state.direction, 'DOWN');
  assert.equal(result.state.queuedDirections.length, 0);
  assert.equal(result.state.snake[0].x, 5);
  assert.equal(result.state.snake[0].y, 5);
});

test('v1.3 static wall collision with shield in dead-end pocket halts safely without panic', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = true;
  // Blocked ahead (6, 5), blocked UP (5, 4), blocked DOWN (5, 6)
  state.obstacles = [
    { id: 'w-front', x: 6, y: 5, type: 'wall' },
    { id: 'w-up', x: 5, y: 4, type: 'wall' },
    { id: 'w-down', x: 5, y: 6, type: 'wall' },
  ];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.powerUps.hasShield, false);
  assert.equal(result.state.snake[0].x, 5);
  assert.equal(result.state.snake[0].y, 5);
});

test('v1.3 destructible barrier with shield shatters barrier, advances snake, and awards 50 points', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = true;
  state.score = 20;
  state.shieldsUsed = 0;
  state.obstacles = [{ id: 'barrier-1', x: 6, y: 5, type: 'barrier' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.shieldsUsed, 1);
  assert.equal(result.state.powerUps.hasShield, false);
  // Barrier must be removed from obstacle state
  assert.equal(result.state.obstacles.length, 0);
  // Snake must advance into barrier cell
  assert.equal(result.state.snake[0].x, 6);
  assert.equal(result.state.snake[0].y, 5);
  // Awards exactly +50 bonus points
  assert.equal(result.state.score, 70);
  assert.ok(result.events.includes('shield_absorb'));
  assert.ok(result.events.includes('bonus'));
});

test('v1.3 destructible barrier without shield is fatal with deathReason wall', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = false;
  state.obstacles = [{ id: 'barrier-1', x: 6, y: 5, type: 'barrier' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'wall');
  assert.ok(result.events.includes('game_over'));
});

test('v1.3 hazard with shield absorbs hazard, advances safely without tail loss', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = true;
  state.score = 100;
  state.shieldsUsed = 0;
  state.obstacles = [{ id: 'hazard-1', x: 6, y: 5, type: 'hazard' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.shieldAbsorbed, true);
  assert.equal(result.state.shieldsUsed, 1);
  assert.equal(result.state.powerUps.hasShield, false);
  // Hazard absorbed and removed
  assert.equal(result.state.obstacles.length, 0);
  // Snake advances safely into (6, 5) with full length 4
  assert.equal(result.state.snake[0].x, 6);
  assert.equal(result.state.snake[0].y, 5);
  assert.equal(result.state.snake.length, 4);
  assert.equal(result.state.score, 100);
  assert.ok(result.events.includes('shield_absorb'));
});

test('v1.3 hazard without shield is fatal when snake length <= 3', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = false;
  state.obstacles = [{ id: 'hazard-1', x: 6, y: 5, type: 'hazard' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'wall');
  assert.ok(result.events.includes('game_over'));
});

test('v1.3 hazard without shield severs 2 segments, deducts 25 points, and preserves maxLength when length > 3', () => {
  const state = createInitialState('classic', 10, 10);
  // Length 5 snake
  state.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 2, y: 5 },
    { x: 1, y: 5 },
  ];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = false;
  state.score = 100;
  state.maxLength = 5;
  state.pendingGrowth = 1;
  state.obstacles = [{ id: 'hazard-1', x: 6, y: 5, type: 'hazard' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  // Snake advances into (6, 5)
  assert.equal(result.state.snake[0].x, 6);
  assert.equal(result.state.snake[0].y, 5);
  // Length 5 is reduced by 2 segments -> length becomes 3
  assert.equal(result.state.snake.length, 3);
  // Pending growth is zeroed
  assert.equal(result.state.pendingGrowth, 0);
  // Score deducted by 25 points -> 75
  assert.equal(result.state.score, 75);
  // maxLength preserved at 5
  assert.equal(result.state.maxLength, 5);
});

test('v1.3 hazard without shield clamps score at 0 when points < 25', () => {
  const state = createInitialState('classic', 10, 10);
  state.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 2, y: 5 },
  ];
  state.direction = 'RIGHT';
  state.powerUps.hasShield = false;
  state.score = 15;
  state.obstacles = [{ id: 'hazard-1', x: 6, y: 5, type: 'hazard' }];

  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, true);
  assert.equal(result.state.snake.length, 2);
  // Score clamped at 0
  assert.equal(result.state.score, 0);
});

test('v1.3 inactive gate behavior remains an impassable solid cell', () => {
  const state = createInitialState('maze', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.warpGate = { x: 6, y: 5, active: false };

  // Without shield: fatal solid collision
  state.powerUps.hasShield = false;
  const fatalResult = stepGame(state, 100);
  assert.equal(fatalResult.state.isVictory, false);
  assert.equal(fatalResult.state.isAlive, false);
  assert.equal(fatalResult.state.deathReason, 'wall');

  // With shield: kinetic deflection halt
  state.powerUps.hasShield = true;
  const shieldResult = stepGame(state, 100);
  assert.equal(shieldResult.state.isVictory, false);
  assert.equal(shieldResult.state.isAlive, true);
  assert.equal(shieldResult.shieldAbsorbed, true);
  assert.equal(shieldResult.state.snake[0].x, 5);
});

test('v1.3 active gate overlapping an obstacle must not produce victory', () => {
  // Test 1: Active gate overlapping an indestructible wall
  const wallState = createInitialState('maze', 10, 10);
  wallState.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  wallState.direction = 'RIGHT';
  wallState.warpGate = { x: 6, y: 5, active: true };
  wallState.obstacles = [{ id: 'w-overlap', x: 6, y: 5, type: 'wall' }];

  // Without shield: must trigger fatal obstacle collision, NEVER victory
  wallState.powerUps.hasShield = false;
  const wallFatal = stepGame(wallState, 100);
  assert.equal(wallFatal.state.isVictory, false);
  assert.equal(wallFatal.state.isAlive, false);
  assert.equal(wallFatal.state.deathReason, 'wall');

  // With shield: must trigger kinetic deflection halt, NEVER victory
  wallState.powerUps.hasShield = true;
  const wallDeflect = stepGame(wallState, 100);
  assert.equal(wallDeflect.state.isVictory, false);
  assert.equal(wallDeflect.state.isAlive, true);
  assert.equal(wallDeflect.shieldAbsorbed, true);
  assert.equal(wallDeflect.state.snake[0].x, 5);

  // Test 2: Active gate overlapping a destructible barrier with shield
  const barrierState = createInitialState('maze', 10, 10);
  barrierState.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  barrierState.direction = 'RIGHT';
  barrierState.warpGate = { x: 6, y: 5, active: true };
  barrierState.obstacles = [{ id: 'b-overlap', x: 6, y: 5, type: 'barrier' }];
  barrierState.powerUps.hasShield = true;

  const barrierResult = stepGame(barrierState, 100);
  // Shatters barrier, but must NOT produce victory because obstacle collision occurred
  assert.equal(barrierResult.state.isVictory, false);
  assert.equal(barrierResult.state.isAlive, true);
  assert.equal(barrierResult.shieldAbsorbed, true);
  assert.equal(barrierResult.state.snake[0].x, 6);

  // Test 3: Active gate overlapping a hazard without shield
  const hazardState = createInitialState('maze', 10, 10);
  hazardState.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }];
  hazardState.direction = 'RIGHT';
  hazardState.warpGate = { x: 6, y: 5, active: true };
  hazardState.obstacles = [{ id: 'h-overlap', x: 6, y: 5, type: 'hazard' }];
  hazardState.powerUps.hasShield = false;

  const hazardResult = stepGame(hazardState, 100);
  // Severs tail segments, but must NOT produce victory
  assert.equal(hazardResult.state.isVictory, false);
  assert.equal(hazardResult.state.isAlive, true);
  assert.equal(hazardResult.state.snake.length, 2);
});

test('v1.3 active gate overlapping a non-head snake segment must not produce victory', () => {
  // Coiled snake where segment snake[2] is at (6, 5) and head at (5, 5)
  const state = createInitialState('maze', 10, 10);
  state.snake = [
    { x: 5, y: 5 }, // head
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 6, y: 5 }, // body segment at target gate cell
    { x: 7, y: 5 },
  ];
  state.direction = 'RIGHT';
  state.warpGate = { x: 6, y: 5, active: true };

  // Without shield: self-collision is fatal, NEVER victory
  state.powerUps.hasShield = false;
  const fatalResult = stepGame(state, 100);
  assert.equal(fatalResult.state.isVictory, false);
  assert.equal(fatalResult.state.isAlive, false);
  assert.equal(fatalResult.state.deathReason, 'self');

  // With shield: shield absorbs self-collision, NEVER victory
  state.powerUps.hasShield = true;
  const shieldResult = stepGame(state, 100);
  assert.equal(shieldResult.state.isVictory, false);
  assert.equal(shieldResult.state.isAlive, true);
  assert.equal(shieldResult.shieldAbsorbed, true);
});

test('v1.3 entering a valid active gate must still produce victory', () => {
  const state = createInitialState('maze', 10, 10);
  state.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  state.direction = 'RIGHT';
  state.warpGate = { x: 6, y: 5, active: true };
  state.obstacles = [];

  const result = stepGame(state, 100);
  assert.equal(result.state.isVictory, true);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.snake[0].x, 6);
  assert.equal(result.state.snake[0].y, 5);
  assert.ok(result.events.includes('level_up'));
  assert.ok(result.events.includes('bonus'));
});

test('v1.3 maze mode outer perimeter walls are impassable solids', () => {
  const state = createInitialState('maze', 10, 10);
  state.snake = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  state.direction = 'RIGHT';

  // Without shield: fatal at perimeter
  state.powerUps.hasShield = false;
  const result = stepGame(state, 100);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.deathReason, 'wall');

  // With shield: kinetic deflection at perimeter
  state.powerUps.hasShield = true;
  const shieldResult = stepGame(state, 100);
  assert.equal(shieldResult.state.isAlive, true);
  assert.equal(shieldResult.shieldAbsorbed, true);
  assert.equal(shieldResult.state.snake[0].x, 9);
});

test('v1.3 food generation never overlaps with obstacles or warp gate', () => {
  const obstacles: Obstacle[] = [
    { id: 'w1', x: 1, y: 1, type: 'wall' },
    { id: 'w2', x: 2, y: 1, type: 'barrier' },
    { id: 'w3', x: 3, y: 1, type: 'hazard' },
  ];
  const warpGate: WarpGate = { x: 4, y: 1, active: false };

  // Run 50 initial states with seeded/random generation
  for (let i = 0; i < 50; i++) {
    const state = createInitialState('maze', 10, 10, Math.random, obstacles, warpGate);
    for (const food of state.food) {
      assert.ok(!obstacles.some(ob => ob.x === food.position.x && ob.y === food.position.y));
      assert.ok(!(warpGate.x === food.position.x && warpGate.y === food.position.y));
    }
  }
});

test('v1.3 maxCombo records peak combo during run and survives combo expiration', () => {
  let state = createInitialState('classic', 20, 20);
  assert.equal(state.maxCombo, 1);

  // Position food 1 ahead
  state.food = [
    { id: 'f-1', type: 'normal', position: { x: state.snake[0].x + 1, y: state.snake[0].y }, points: 10 },
  ];
  state = stepGame(state, 100).state;
  assert.equal(state.combo, 1);
  assert.equal(state.maxCombo, 1);

  // Position food 2 ahead
  state.food = [
    { id: 'f-2', type: 'normal', position: { x: state.snake[0].x + 1, y: state.snake[0].y }, points: 10 },
  ];
  state = stepGame(state, 200).state;
  assert.equal(state.combo, 2);
  assert.equal(state.maxCombo, 2);

  // Position food 3 ahead
  state.food = [
    { id: 'f-3', type: 'normal', position: { x: state.snake[0].x + 1, y: state.snake[0].y }, points: 10 },
  ];
  state = stepGame(state, 300).state;
  assert.equal(state.combo, 3);
  assert.equal(state.maxCombo, 3);

  // Lapsed time: combo expires back to 1x
  state = stepGame(state, 10000).state;
  assert.equal(state.combo, 1);
  // maxCombo must remain at run peak of 3!
  assert.equal(state.maxCombo, 3);
});


