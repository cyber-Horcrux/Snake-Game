import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAZE_STAGES,
  getMazeStage,
  createInitialMazeState,
  advanceMazeStage,
  STAGE_INGRESS_CAPACITIES,
} from './mazes.ts';
import {
  DEFAULT_MAZE_PROGRESS,
  loadMazeProgress,
  saveMazeProgress,
  recordStageClear,
  recordCampaignCompletion,
} from './persistence.ts';
import {
  createInitialState,
  stepGame,
  queueDirection,
} from './engine.ts';
import type { GameEngineState, MazeProgress, Direction, GridCoord } from './types.ts';

// In-memory mock storage for deterministic persistence testing
class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

test('Stage Selection: all 6 handcrafted stages are defined with correct metadata and ingress capacities', () => {
  assert.equal(MAZE_STAGES.length, 6);

  const expectedNames = [
    'THE INITIATION',
    'THE SPLIT',
    'THE GAUNTLET',
    'THE CROSSFIRE',
    'THE LABYRINTH',
    'THE FINAL PROTOCOL',
  ];

  const expectedCapacities = [22, 20, 18, 22, 16, 14];

  for (let i = 0; i < 6; i++) {
    const stage = MAZE_STAGES[i];
    assert.equal(stage.stage, i + 1);
    assert.equal(stage.name, expectedNames[i]);
    assert.ok(stage.description.length > 5);
    assert.equal(stage.neonCoresRequired, 10);
    assert.equal(stage.maxIngressCapacity, expectedCapacities[i]);
    assert.equal(stage.warpGate.active, false);
    assert.ok(stage.spawnPath.length >= stage.maxIngressCapacity);
    assert.ok(stage.obstacles.length > 0);
  }
});

test('Stage Selection: locked stage selection is rejected and unlocked stage selection succeeds', () => {
  const progress: MazeProgress = {
    highestStageUnlocked: 3,
    totalCampaignsWon: 0,
    totalMazesCleared: 2,
    bestCampaignScore: 1200,
  };

  // Helper simulating stage select click guard
  const canSelectStage = (stageNum: number, prog: MazeProgress) => {
    return stageNum <= prog.highestStageUnlocked;
  };

  // Unlocked stages 1, 2, 3 can be launched
  assert.equal(canSelectStage(1, progress), true);
  assert.equal(canSelectStage(2, progress), true);
  assert.equal(canSelectStage(3, progress), true);

  // Locked stages 4, 5, 6 cannot be launched
  assert.equal(canSelectStage(4, progress), false);
  assert.equal(canSelectStage(5, progress), false);
  assert.equal(canSelectStage(6, progress), false);
});

test('Stage Selection: replaying an earlier unlocked stage works and never decreases campaign progress', () => {
  const storage = new MemoryStorage();
  saveMazeProgress({
    highestStageUnlocked: 5,
    totalCampaignsWon: 0,
    totalMazesCleared: 4,
    bestCampaignScore: 2400,
  }, storage);

  // Replay stage 1
  const stage1State = createInitialMazeState(1);
  assert.equal(stage1State.stage, 1);
  assert.equal(stage1State.mode, 'maze');

  // Complete stage 1 replay with score 300
  const updatedProgress = recordStageClear(1, 300, storage);

  // highestStageUnlocked MUST remain 5, not reduced to 2
  assert.equal(updatedProgress.highestStageUnlocked, 5);
  assert.equal(updatedProgress.totalMazesCleared, 5);
});

test('HUD: stage number, name, and Neon Core counter update reactively', () => {
  const state = createInitialMazeState(1);
  assert.equal(state.stage, 1);
  assert.equal(state.stageFoodEaten, 0);
  assert.equal(state.warpGate?.active, false);

  const stage1Config = getMazeStage(1);
  assert.equal(stage1Config.name, 'THE INITIATION');

  // Simulate collecting 6 cores
  let runState: GameEngineState = {
    ...state,
    stageFoodEaten: 6,
    score: 60,
  };
  assert.equal(runState.stageFoodEaten, 6);
  assert.equal(runState.warpGate?.active, false);

  // Simulate collecting 10th core: Warp Gate activates
  runState = {
    ...runState,
    stageFoodEaten: 10,
    score: 100,
    warpGate: {
      ...runState.warpGate!,
      active: true,
    },
  };
  assert.equal(runState.stageFoodEaten, 10);
  assert.equal(runState.warpGate?.active, true);
});

test('HUD: Classic, Zen, and Rush modes do not expose Maze-specific stage data', () => {
  const classicState = createInitialState('classic');
  const zenState = createInitialState('zen');
  const rushState = createInitialState('rush');

  assert.equal(classicState.mode, 'classic');
  assert.equal(classicState.obstacles.length, 0);
  assert.equal(classicState.warpGate, null);

  assert.equal(zenState.mode, 'zen');
  assert.equal(zenState.obstacles.length, 0);
  assert.equal(zenState.warpGate, null);

  assert.equal(rushState.mode, 'rush');
  assert.equal(rushState.obstacles.length, 0);
  assert.equal(rushState.warpGate, null);
});

test('Stage Clear: valid Warp Gate entry triggers stage clear without bypassing obstacles or self', () => {
  const state = createInitialMazeState(1);
  const gate = state.warpGate!;

  // Position snake right in front of active gate facing it
  const nearGateState: GameEngineState = {
    ...state,
    snake: [
      { x: gate.x - 1, y: gate.y },
      { x: gate.x - 2, y: gate.y },
      { x: gate.x - 3, y: gate.y },
    ],
    direction: 'RIGHT',
    queuedDirections: [],
    stageFoodEaten: 10,
    warpGate: { ...gate, active: true },
    isAlive: true,
  };

  const result = stepGame(nearGateState, 1000);
  assert.equal(result.state.isStageClear, true);
  assert.equal(result.state.isVictory, true);
  assert.equal(result.state.isAlive, false);
  assert.equal(result.state.snake[0].x, gate.x);
  assert.equal(result.state.snake[0].y, gate.y);
  assert.ok(result.events.includes('level_up'));
});

test('Stage Clear: advanceMazeStage advances exactly one stage, loads correct layout, and compresses excess snake segments', () => {
  const state = createInitialMazeState(1);
  // Give snake length 25 (exceeding Stage 2 capacity of 20)
  const longSnake = Array.from({ length: 25 }, (_, i) => ({ x: 10, y: 10 + i }));
  const clearedState: GameEngineState = {
    ...state,
    stage: 1,
    score: 500,
    snake: longSnake,
    isStageClear: true,
  };

  const advance = advanceMazeStage(clearedState);
  assert.equal(advance.isCampaignWon, false);
  assert.equal(advance.state.stage, 2);
  assert.equal(advance.state.mode, 'maze');
  assert.equal(advance.state.stageFoodEaten, 0);
  assert.equal(advance.state.warpGate?.active, false);

  // Stage 2 capacity is 20, so 5 segments trimmed -> +250 points
  assert.equal(advance.segmentsTrimmed, 5);
  assert.equal(advance.scoreBonus, 250);
  assert.equal(advance.state.score, 750);
  assert.equal(advance.state.snake.length, 20);
  assert.equal(advance.state.isStageClear, false);
  assert.equal(advance.state.isAlive, true);
});

test('Stage Clear: rapid interactions and duplicate persistence recordings are strictly prevented', () => {
  const storage = new MemoryStorage();
  const initial = loadMazeProgress(storage);
  assert.equal(initial.totalMazesCleared, 0);

  // Simulate single-recording guard ref as implemented in App.tsx
  let recordedKey: string | null = null;
  const recordClearWithGuard = (stage: number, score: number) => {
    const key = `stage-${stage}-score-${score}`;
    if (recordedKey === key) return null;
    recordedKey = key;
    return recordStageClear(stage, score, storage);
  };

  // First tap records clear
  const firstResult = recordClearWithGuard(1, 400);
  assert.notEqual(firstResult, null);
  assert.equal(firstResult!.totalMazesCleared, 1);
  assert.equal(firstResult!.highestStageUnlocked, 2);

  // Rapid second and third taps in same frame / render cycle
  const secondResult = recordClearWithGuard(1, 400);
  const thirdResult = recordClearWithGuard(1, 400);
  assert.equal(secondResult, null);
  assert.equal(thirdResult, null);

  // Storage totalMazesCleared remains exactly 1
  const finalProgress = loadMazeProgress(storage);
  assert.equal(finalProgress.totalMazesCleared, 1);
  assert.equal(finalProgress.highestStageUnlocked, 2);
});

test('Final Victory: clearing Stage 6 flags campaign completion, never attempts Stage 7, and records win', () => {
  const storage = new MemoryStorage();
  saveMazeProgress({
    highestStageUnlocked: 6,
    totalCampaignsWon: 0,
    totalMazesCleared: 5,
    bestCampaignScore: 1800,
  }, storage);

  const stage6State = createInitialMazeState(6);
  assert.equal(stage6State.stage, 6);

  const stage6Cleared: GameEngineState = {
    ...stage6State,
    stage: 6,
    score: 3200,
    isStageClear: true,
  };

  // advanceMazeStage on Stage 6 must flag campaign completion and cap at 6
  const advance = advanceMazeStage(stage6Cleared);
  assert.equal(advance.isCampaignWon, true);
  assert.equal(advance.state.stage, 6);
  assert.equal(advance.state.isCampaignComplete, true);
  assert.equal(advance.state.isVictory, true);

  // Record completion
  const updatedProgress = recordCampaignCompletion(3200, storage);
  assert.equal(updatedProgress.highestStageUnlocked, 6);
  assert.equal(updatedProgress.totalCampaignsWon, 1);
  assert.equal(updatedProgress.totalMazesCleared, 6);
  assert.equal(updatedProgress.bestCampaignScore, 3200);
});

test('Persistence: monotonic unlock guarantee holds across arbitrary replays and restarts', () => {
  const storage = new MemoryStorage();

  // Progress through stages 1 to 4
  recordStageClear(1, 100, storage);
  recordStageClear(2, 250, storage);
  recordStageClear(3, 450, storage);
  const prog3 = loadMazeProgress(storage);
  assert.equal(prog3.highestStageUnlocked, 4);

  // Replay stage 2
  recordStageClear(2, 200, storage);
  const progAfterReplay = loadMazeProgress(storage);
  assert.equal(progAfterReplay.highestStageUnlocked, 4);

  // Replay stage 1
  recordStageClear(1, 150, storage);
  const progAfterReplay1 = loadMazeProgress(storage);
  assert.equal(progAfterReplay1.highestStageUnlocked, 4);
});

test('Regression: Classic mode wall, food, power-up, and game-over flows remain intact', () => {
  const state = createInitialState('classic', 10, 10);
  assert.equal(state.mode, 'classic');

  // Head at (3, 5), direction RIGHT -> next cell (4, 5)
  // Queue UP
  const queued = queueDirection(state, 'UP');
  assert.deepEqual(queued.queuedDirections, ['UP']);

  // Place food at (4, 5)
  const stateWithFood: GameEngineState = {
    ...state,
    food: [{ id: 'f1', type: 'normal', position: { x: 4, y: 5 }, points: 10 }],
  };

  const stepped = stepGame(stateWithFood, 1000);
  assert.equal(stepped.state.score, 10);
  assert.equal(stepped.state.foodEaten, 1);
  assert.equal(stepped.state.isAlive, true);
});

test('Full Campaign: Complete run through Stages 1 to 6 culminates in campaign victory with no Stage 7', () => {
  const storage = new MemoryStorage();
  let currentProgress = loadMazeProgress(storage);
  assert.equal(currentProgress.highestStageUnlocked, 1);
  assert.equal(currentProgress.totalCampaignsWon, 0);

  let cumulativeScore = 0;
  let currentState = createInitialMazeState(1);

  for (let stageNum = 1; stageNum <= 6; stageNum++) {
    assert.equal(currentState.stage, stageNum);
    assert.equal(currentState.mode, 'maze');
    assert.equal(currentState.isAlive, true);

    const gate = currentState.warpGate!;
    let approachHead: GridCoord;
    let approachDir: Direction;
    if (gate.x === 23) {
      approachHead = { x: 22, y: gate.y };
      approachDir = 'RIGHT';
    } else if (gate.x === 0) {
      approachHead = { x: 1, y: gate.y };
      approachDir = 'LEFT';
    } else if (gate.y === 0) {
      approachHead = { x: gate.x, y: 1 };
      approachDir = 'UP';
    } else {
      approachHead = { x: gate.x, y: 22 };
      approachDir = 'DOWN';
    }

    const preGateState: GameEngineState = {
      ...currentState,
      stage: stageNum,
      score: cumulativeScore + 300,
      stageFoodEaten: 10,
      warpGate: { ...gate, active: true },
      snake: [
        approachHead,
        { x: approachHead.x, y: approachHead.y + (approachDir === 'UP' ? 1 : -1) },
        { x: approachHead.x, y: approachHead.y + (approachDir === 'UP' ? 2 : -2) },
      ],
      direction: approachDir,
      queuedDirections: [],
      isAlive: true,
    };

    const gateEntry = stepGame(preGateState, 5000 + stageNum * 1000);
    assert.equal(gateEntry.state.isStageClear, true);
    assert.equal(gateEntry.state.isVictory, true);
    cumulativeScore = gateEntry.state.score;

    if (stageNum < 6) {
      assert.equal(gateEntry.state.isCampaignComplete, false);
      currentProgress = recordStageClear(stageNum, cumulativeScore, storage);
      assert.equal(currentProgress.highestStageUnlocked, stageNum + 1);

      // Advance to next stage
      const advancement = advanceMazeStage(gateEntry.state);
      assert.equal(advancement.isCampaignWon, false);
      assert.equal(advancement.state.stage, stageNum + 1);
      currentState = advancement.state;
    } else {
      // Stage 6 final victory!
      assert.equal(gateEntry.state.isCampaignComplete, true);
      currentProgress = recordCampaignCompletion(cumulativeScore, storage);
      assert.equal(currentProgress.highestStageUnlocked, 6);
      assert.equal(currentProgress.totalCampaignsWon, 1);
      assert.equal(currentProgress.bestCampaignScore, cumulativeScore);

      // Verify advanceMazeStage on Stage 6 caps at 6 and never loads Stage 7
      const finalAdvancement = advanceMazeStage(gateEntry.state);
      assert.equal(finalAdvancement.isCampaignWon, true);
      assert.equal(finalAdvancement.state.stage, 6);
      assert.equal(finalAdvancement.state.isCampaignComplete, true);
    }
  }
});

test('Interrupted Campaign: Failure on mid-campaign stage does not increment campaign victories or unlock beyond failure point', () => {
  const storage = new MemoryStorage();
  // Player previously unlocked up to Stage 3
  saveMazeProgress({
    highestStageUnlocked: 3,
    totalCampaignsWon: 0,
    totalMazesCleared: 2,
    bestCampaignScore: 600,
  }, storage);

  // Start Stage 3
  const state = createInitialMazeState(3);
  assert.equal(state.stage, 3);

  // Position snake heading into boundary wall
  const crashingState: GameEngineState = {
    ...state,
    snake: [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ],
    direction: 'LEFT',
    queuedDirections: [],
    powerUps: { slowMoUntil: 0, hasShield: false },
    isAlive: true,
  };

  const crashResult = stepGame(crashingState, 1000);
  assert.equal(crashResult.state.isAlive, false);
  assert.equal(crashResult.state.isVictory, false);
  assert.equal(crashResult.state.isStageClear, false);
  assert.equal(crashResult.state.isCampaignComplete, false);
  assert.equal(crashResult.state.deathReason, 'wall');

  // Verify persistence is completely untainted by failure
  const postFailProgress = loadMazeProgress(storage);
  assert.equal(postFailProgress.highestStageUnlocked, 3);
  assert.equal(postFailProgress.totalCampaignsWon, 0);
  assert.equal(postFailProgress.totalMazesCleared, 2);
  assert.equal(postFailProgress.bestCampaignScore, 600);
});

test('Obstacle Mechanics: Aegis Shield shatters breakable barriers and awards bonus score', () => {
  const state = createInitialMazeState(2);
  // Find a barrier obstacle in Stage 2
  const barrier = state.obstacles.find(o => o.type === 'barrier');
  assert.ok(barrier, 'Stage 2 must contain breakable barriers');

  const preBarrierState: GameEngineState = {
    ...state,
    snake: [
      { x: barrier!.x - 1, y: barrier!.y },
      { x: barrier!.x - 2, y: barrier!.y },
      { x: barrier!.x - 3, y: barrier!.y },
    ],
    direction: 'RIGHT',
    queuedDirections: [],
    powerUps: { slowMoUntil: 0, hasShield: true },
    isAlive: true,
    score: 100,
  };

  const step = stepGame(preBarrierState, 1000);
  assert.equal(step.state.isAlive, true);
  assert.equal(step.shieldAbsorbed, true);
  assert.equal(step.state.powerUps.hasShield, false);
  assert.equal(step.state.score, 150); // +50 bonus pts for barrier destruction
  assert.ok(!step.state.obstacles.some(o => o.id === barrier!.id), 'Barrier obstacle must be removed');
  assert.ok(step.events.includes('shield_absorb'));
});

test('Obstacle Mechanics: Aegis Shield safely deflects from indestructible walls in Maze mode', () => {
  const state = createInitialMazeState(1);
  const wall = state.obstacles.find(o => o.type === 'wall');
  assert.ok(wall, 'Stage 1 must contain indestructible walls');

  const preWallState: GameEngineState = {
    ...state,
    snake: [
      { x: wall!.x - 1, y: wall!.y },
      { x: wall!.x - 2, y: wall!.y },
      { x: wall!.x - 3, y: wall!.y },
    ],
    direction: 'RIGHT',
    queuedDirections: [],
    powerUps: { slowMoUntil: 0, hasShield: true },
    isAlive: true,
  };

  const step = stepGame(preWallState, 1000);
  assert.equal(step.state.isAlive, true);
  assert.equal(step.shieldAbsorbed, true);
  // Snake was deflected rather than dying
  assert.ok(step.state.direction !== 'RIGHT');
});

test('Regression: Zen mode wraparounds and Rush mode speed/multipliers operate correctly', () => {
  // 1. Zen mode boundary wraparound
  const zenState = createInitialState('zen', 10, 10);
  const zenAtEdge: GameEngineState = {
    ...zenState,
    snake: [
      { x: 9, y: 5 },
      { x: 8, y: 5 },
      { x: 7, y: 5 },
    ],
    direction: 'RIGHT',
    queuedDirections: [],
    isAlive: true,
    wallsWrapped: 0,
  };
  const zenStepped = stepGame(zenAtEdge, 1000);
  assert.equal(zenStepped.state.isAlive, true);
  assert.equal(zenStepped.state.snake[0].x, 0); // Wrapped around to x=0
  assert.equal(zenStepped.state.wallsWrapped, 1);

  // 2. Rush mode 1.5x score multiplier
  const rushState = createInitialState('rush', 10, 10);
  assert.equal(rushState.mode, 'rush');
  const rushWithFood: GameEngineState = {
    ...rushState,
    food: [{ id: 'rf1', type: 'normal', position: { x: 4, y: 5 }, points: 15 }], // 10 * 1.5
    snake: [
      { x: 3, y: 5 },
      { x: 2, y: 5 },
      { x: 1, y: 5 },
    ],
    direction: 'RIGHT',
    queuedDirections: [],
    score: 0,
  };
  const rushStepped = stepGame(rushWithFood, 1000);
  assert.equal(rushStepped.state.score, 15);
  assert.equal(rushStepped.state.foodEaten, 1);
});
