import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  queueDirection,
  stepGame,
  isOpposite,
  findEmptyCell,
  calculateTickInterval,
} from './engine.ts';
import { POINTS } from './constants.ts';

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
