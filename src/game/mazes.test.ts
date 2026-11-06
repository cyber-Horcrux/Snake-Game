import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAZE_STAGES,
  MAX_CAMPAIGN_STAGES,
  NEON_CORES_PER_STAGE,
  STAGE_INGRESS_CAPACITIES,
  UNIVERSAL_SAFE_INGRESS_CAPACITY,
  EXCESS_SEGMENT_SCORE_BONUS,
  getMazeStage,
  calculateIngressSnake,
  createInitialMazeState,
  advanceMazeStage,
} from './mazes.ts';
import { getDirectionOffset } from './engine.ts';
import type { GridCoord } from './types.ts';

// Helper: Manhattan distance
function manhattanDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Helper: BFS reachability check from start to target avoiding solid obstacles
function isPathReachable(
  start: GridCoord,
  target: GridCoord,
  obstacles: { x: number; y: number; type: string }[],
  gridWidth: number = 24,
  gridHeight: number = 24
): boolean {
  // Indestructible walls cannot be passed; barriers can be broken with shield, but let's check path reachability
  const solidSet = new Set<string>();
  for (const o of obstacles) {
    if (o.type === 'wall') {
      solidSet.add(`${o.x},${o.y}`);
    }
  }

  const queue: GridCoord[] = [{ ...start }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === target.x && current.y === target.y) {
      return true;
    }

    for (const d of directions) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      const key = `${nx},${ny}`;

      if (
        nx >= 0 &&
        nx < gridWidth &&
        ny >= 0 &&
        ny < gridHeight &&
        !solidSet.has(key) &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

// ==========================================
// A. LAYOUT INTEGRITY TESTS
// ==========================================

test('all six handcrafted stages exist with proper metadata', () => {
  assert.equal(MAZE_STAGES.length, 6);
  assert.equal(MAX_CAMPAIGN_STAGES, 6);

  const expectedNames = [
    'THE INITIATION',
    'THE SPLIT',
    'THE GAUNTLET',
    'THE CROSSFIRE',
    'THE LABYRINTH',
    'THE FINAL PROTOCOL',
  ];

  for (let i = 0; i < 6; i++) {
    const stage = MAZE_STAGES[i];
    assert.equal(stage.stage, i + 1);
    assert.equal(stage.name, expectedNames[i]);
    assert.ok(stage.description.length > 5);
    assert.equal(stage.neonCoresRequired, NEON_CORES_PER_STAGE);
    assert.equal(stage.maxIngressCapacity, STAGE_INGRESS_CAPACITIES[i + 1]);
    assert.ok(stage.obstacles.length > 0);
  }
});

test('stage capacities match Task 1D specifications exactly', () => {
  assert.equal(STAGE_INGRESS_CAPACITIES[1], 22);
  assert.equal(STAGE_INGRESS_CAPACITIES[2], 20);
  assert.equal(STAGE_INGRESS_CAPACITIES[3], 18);
  assert.equal(STAGE_INGRESS_CAPACITIES[4], 22);
  assert.equal(STAGE_INGRESS_CAPACITIES[5], 16);
  assert.equal(STAGE_INGRESS_CAPACITIES[6], 14);
  assert.equal(UNIVERSAL_SAFE_INGRESS_CAPACITY, 14);
});

test('all obstacle IDs across all stages are globally unique and stable', () => {
  const allIds = new Set<string>();
  let totalObstacles = 0;

  for (const stage of MAZE_STAGES) {
    for (const ob of stage.obstacles) {
      assert.ok(!allIds.has(ob.id), `Duplicate obstacle ID detected: ${ob.id}`);
      allIds.add(ob.id);
      totalObstacles++;
    }
  }

  assert.equal(allIds.size, totalObstacles);
});

test('no obstacle overlaps another obstacle within any stage', () => {
  for (const stage of MAZE_STAGES) {
    const coordSet = new Set<string>();
    for (const ob of stage.obstacles) {
      const key = `${ob.x},${ob.y}`;
      assert.ok(!coordSet.has(key), `Stage ${stage.stage} has overlapping obstacle at ${key}`);
      coordSet.add(key);
      assert.ok(ob.x >= 0 && ob.x < 24, `Obstacle x out of bounds in stage ${stage.stage}: ${ob.x}`);
      assert.ok(ob.y >= 0 && ob.y < 24, `Obstacle y out of bounds in stage ${stage.stage}: ${ob.y}`);
    }
  }
});

test('no obstacle overlaps the spawn path in any stage', () => {
  for (const stage of MAZE_STAGES) {
    const obstacleSet = new Set(stage.obstacles.map(o => `${o.x},${o.y}`));
    for (const sp of stage.spawnPath) {
      const key = `${sp.x},${sp.y}`;
      assert.ok(
        !obstacleSet.has(key),
        `Stage ${stage.stage} has spawn segment overlapping obstacle at ${key}`
      );
    }
  }
});

test('no Warp Gate overlaps an obstacle in any stage', () => {
  for (const stage of MAZE_STAGES) {
    const gate = stage.warpGate;
    const overlap = stage.obstacles.some(o => o.x === gate.x && o.y === gate.y);
    assert.equal(overlap, false, `Stage ${stage.stage} warp gate overlaps an obstacle!`);
  }
});

test('no Warp Gate overlaps the spawn path in any stage', () => {
  for (const stage of MAZE_STAGES) {
    const gate = stage.warpGate;
    const overlap = stage.spawnPath.some(sp => sp.x === gate.x && sp.y === gate.y);
    assert.equal(overlap, false, `Stage ${stage.stage} warp gate overlaps spawn path!`);
  }
});

test('every Warp Gate is positioned on the perimeter and initialized inactive', () => {
  for (const stage of MAZE_STAGES) {
    const gate = stage.warpGate;
    assert.equal(gate.active, false);
    const onPerimeter = gate.x === 0 || gate.x === 23 || gate.y === 0 || gate.y === 23;
    assert.ok(onPerimeter, `Stage ${stage.stage} warp gate (${gate.x}, ${gate.y}) is not on perimeter!`);
  }
});

test('spawn paths are strictly contiguous, valid, and satisfy stage capacities', () => {
  for (const stage of MAZE_STAGES) {
    assert.ok(
      stage.spawnPath.length >= stage.maxIngressCapacity,
      `Stage ${stage.stage} spawnPath length (${stage.spawnPath.length}) < capacity (${stage.maxIngressCapacity})`
    );

    // Head is spawnPath[0]
    assert.deepEqual(stage.spawnHead, stage.spawnPath[0]);

    // Check contiguity
    for (let i = 0; i < stage.spawnPath.length - 1; i++) {
      const a = stage.spawnPath[i];
      const b = stage.spawnPath[i + 1];
      assert.equal(
        manhattanDistance(a, b),
        1,
        `Stage ${stage.stage} spawnPath has gap between segment ${i} and ${i + 1}`
      );
    }

    // Check no self-overlapping in spawn path
    const pathSet = new Set(stage.spawnPath.map(p => `${p.x},${p.y}`));
    assert.equal(pathSet.size, stage.spawnPath.length, `Stage ${stage.stage} spawn path has duplicate coordinates!`);
  }
});

test('valid initial movement is guaranteed ahead of spawn head', () => {
  for (const stage of MAZE_STAGES) {
    const offset = getDirectionOffset(stage.spawnDirection);
    const targetCell = {
      x: stage.spawnHead.x + offset.x,
      y: stage.spawnHead.y + offset.y,
    };

    // Cell ahead must be inside bounds
    assert.ok(targetCell.x >= 0 && targetCell.x < 24);
    assert.ok(targetCell.y >= 0 && targetCell.y < 24);

    // Cell ahead must not be an obstacle
    const hitOb = stage.obstacles.some(o => o.x === targetCell.x && o.y === targetCell.y);
    assert.equal(hitOb, false, `Stage ${stage.stage} cell ahead of spawn head is blocked by obstacle!`);

    // Cell ahead must not be warp gate
    assert.ok(
      !(targetCell.x === stage.warpGate.x && targetCell.y === stage.warpGate.y),
      `Stage ${stage.stage} cell ahead of spawn head is warp gate!`
    );
  }
});

test('every stage has a reachable Warp Gate from spawn head via clear paths', () => {
  for (const stage of MAZE_STAGES) {
    const reachable = isPathReachable(stage.spawnHead, stage.warpGate, stage.obstacles);
    assert.ok(reachable, `Stage ${stage.stage} warp gate is not reachable from spawn head!`);
  }
});

test('stage mechanics progression: Stage 1 walls only, Stage 2 barriers, Stage 3 hazards, Stage 4-6 combined', () => {
  const s1 = getMazeStage(1);
  assert.ok(s1.obstacles.every(o => o.type === 'wall'));

  const s2 = getMazeStage(2);
  assert.ok(s2.obstacles.some(o => o.type === 'barrier'));
  assert.ok(s2.obstacles.some(o => o.type === 'wall'));

  const s3 = getMazeStage(3);
  assert.ok(s3.obstacles.some(o => o.type === 'hazard'));
  assert.ok(s3.obstacles.some(o => o.type === 'wall'));

  for (let s = 4; s <= 6; s++) {
    const stage = getMazeStage(s);
    assert.ok(stage.obstacles.some(o => o.type === 'wall'), `Stage ${s} missing walls`);
    assert.ok(stage.obstacles.some(o => o.type === 'barrier'), `Stage ${s} missing barriers`);
    assert.ok(stage.obstacles.some(o => o.type === 'hazard'), `Stage ${s} missing hazards`);
  }
});

// ==========================================
// B. MULTI-STAGE PROGRESSION & TRIMMING TESTS
// ==========================================

test('calculateIngressSnake preserves snake length within destination capacity', () => {
  const stage2 = getMazeStage(2); // capacity 20
  const snakeLen10 = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));

  const ingress = calculateIngressSnake(snakeLen10, stage2);
  assert.equal(ingress.snake.length, 10);
  assert.equal(ingress.trimmedSegments, 0);
  assert.equal(ingress.scoreBonus, 0);
  assert.deepEqual(ingress.snake[0], stage2.spawnHead);
});

test('calculateIngressSnake caps excess length and converts segments to +50 points', () => {
  const stage5 = getMazeStage(5); // capacity 16
  const snakeLen20 = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0 }));

  const ingress = calculateIngressSnake(snakeLen20, stage5);
  // Capped to 16
  assert.equal(ingress.snake.length, 16);
  // 4 trimmed segments
  assert.equal(ingress.trimmedSegments, 4);
  // 4 * 50 = +200 points bonus
  assert.equal(ingress.scoreBonus, 200);
  assert.deepEqual(ingress.snake[0], stage5.spawnHead);
});

test('calculateIngressSnake entering Stage 6 with length 22 caps to 14 and awards +400 points', () => {
  const stage6 = getMazeStage(6); // capacity 14
  const snakeLen22 = Array.from({ length: 22 }, (_, i) => ({ x: i, y: 0 }));

  const ingress = calculateIngressSnake(snakeLen22, stage6);
  assert.equal(ingress.snake.length, 14);
  assert.equal(ingress.trimmedSegments, 8);
  assert.equal(ingress.scoreBonus, 8 * 50); // 400
});

test('advanceMazeStage transitions from Stage 1 to Stage 2 with proper resets', () => {
  const initial = createInitialMazeState(1);
  initial.score = 150;
  initial.foodEaten = 10;
  initial.stageFoodEaten = 10;
  initial.warpGate!.active = true;
  initial.isVictory = true;

  const result = advanceMazeStage(initial);
  assert.equal(result.isCampaignWon, false);
  const next = result.state;

  assert.equal(next.stage, 2);
  assert.equal(next.stageFoodEaten, 0);
  assert.equal(next.warpGate?.active, false);
  assert.equal(next.warpGate?.x, getMazeStage(2).warpGate.x);
  assert.equal(next.warpGate?.y, getMazeStage(2).warpGate.y);
  assert.equal(next.isAlive, true);
  assert.equal(next.isVictory, false);
  assert.equal(next.isStageClear, false);
  assert.equal(next.score, 150);
  assert.equal(next.food.length, 1);
});

test('advanceMazeStage full campaign run: progression through Stages 1 to 6 and completion', () => {
  let state = createInitialMazeState(1);
  let totalBonusEarned = 0;

  for (let s = 1; s <= 5; s++) {
    assert.equal(state.stage, s);
    state.stageFoodEaten = 10;
    state.warpGate!.active = true;

    // Give snake some extra length to test capacity trimming across stages
    state.snake = Array.from({ length: 22 }, (_, i) => ({ x: i, y: 0 }));

    const transition = advanceMazeStage(state);
    assert.equal(transition.isCampaignWon, false);
    totalBonusEarned += transition.scoreBonus;

    state = transition.state;
    assert.equal(state.stage, s + 1);
    assert.equal(state.stageFoodEaten, 0);
    assert.equal(state.warpGate?.active, false);
    assert.equal(state.isAlive, true);
  }

  // Now at Stage 6
  assert.equal(state.stage, 6);
  state.stageFoodEaten = 10;
  state.warpGate!.active = true;

  // Complete Stage 6
  const finalResult = advanceMazeStage(state);
  assert.equal(finalResult.isCampaignWon, true);
  assert.equal(finalResult.state.stage, 6); // Does NOT advance to Stage 7
  assert.equal(finalResult.state.isCampaignComplete, true);
  assert.equal(finalResult.state.isVictory, true);
  assert.equal(finalResult.state.isAlive, false);
});
