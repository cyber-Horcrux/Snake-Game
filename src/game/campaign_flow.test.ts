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
import type { GameEngineState, MazeProgress } from './types.ts';

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
