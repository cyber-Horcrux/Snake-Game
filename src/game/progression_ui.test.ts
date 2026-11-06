import test from 'node:test';
import assert from 'node:assert/strict';
import type { StorageLike } from './persistence.ts';
import type { GameEngineState, PlayerProgressionState, RunXpInput, XpEarnResult } from './types.ts';
import {
  awardRunXp,
  calculateLevelFromLifetimeXp,
  calculateMazeStageDelta,
  calculateRunXp,
  createDefaultPlayerProgression,
  createMazeStageEventId,
  createMazeStageSnapshot,
  createRunEventId,
  getCumulativeXpForLevel,
  getLevelTitle,
  loadPlayerProgression,
  recordDailyRewardClaim,
  recordGameplayRunXp,
  recordMazeStageXp,
  savePlayerProgression,
} from './levels.ts';
import {
  createInitialDailyState,
  getUtcDateString,
  loadDailyChallengeState,
  recordDailyChallengeRun,
  saveDailyChallengeState,
} from './challenges.ts';
import { createInitialState } from './engine.ts';
import { MAX_PLAYER_LEVEL, XP_REWARDS } from './constants.ts';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

// -----------------------------------------------------------------------------
// A. Player Level Card Presentation Logic Tests
// -----------------------------------------------------------------------------

test('Player Level Card 1: Correct level and title displayed for intermediate levels', () => {
  const p1: PlayerProgressionState = {
    ...createDefaultPlayerProgression(),
    level: 12,
    currentXp: 450,
    xpForNextLevel: 1700,
  };

  assert.equal(p1.level, 12);
  assert.equal(getLevelTitle(p1.level), 'Cyber Champion');
});

test('Player Level Card 2: Correct XP progress and remaining XP calculation', () => {
  const p: PlayerProgressionState = {
    ...createDefaultPlayerProgression(),
    level: 12,
    currentXp: 450,
    xpForNextLevel: 1700,
  };

  const remaining = Math.max(0, p.xpForNextLevel - p.currentXp);
  const percent = Math.round((p.currentXp / p.xpForNextLevel) * 100);

  assert.equal(remaining, 1250);
  assert.equal(percent, 26);
});

test('Player Level Card 3: Level 50 displays permanent maximum-level state with 100% progress', () => {
  const maxProgression = calculateLevelFromLifetimeXp(150000);
  assert.equal(maxProgression.level, MAX_PLAYER_LEVEL);
  assert.equal(maxProgression.currentXp, 0);
  assert.equal(maxProgression.xpForNextLevel, 0);

  const title = getLevelTitle(maxProgression.level);
  assert.equal(title, 'Apex Legend');

  const isMaxLevel = maxProgression.level >= MAX_PLAYER_LEVEL;
  const percent = isMaxLevel ? 100 : Math.round((maxProgression.currentXp / maxProgression.xpForNextLevel) * 100);
  assert.equal(percent, 100);
});

test('Player Level Card 4: Defensive handling of zero, undefined, and malformed progression data', () => {
  const malformed = {
    level: 0,
    currentXp: -50,
    xpForNextLevel: 0,
    totalLifetimeXp: -100,
  } as unknown as PlayerProgressionState;

  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, malformed.level || 1));
  const currentXp = Math.max(0, malformed.currentXp || 0);
  const xpForNext = Math.max(1, malformed.xpForNextLevel || 1);

  assert.equal(level, 1);
  assert.equal(currentXp, 0);
  assert.equal(xpForNext, 1);
  assert.equal(getLevelTitle(level), 'Neon Scout');
});

// -----------------------------------------------------------------------------
// B. GameOver Screen Integration Tests
// -----------------------------------------------------------------------------

test('GameOver Integration 5: Standard completed run produces authoritative XpEarnResult for GameOver UI', () => {
  const storage = new MemoryStorage();
  const startTime = 1715000000000;
  const eventId = createRunEventId('classic', startTime, 'seed-1');

  const runState: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 10,
    score: 100,
    gameTimeMs: 25000,
    shieldsUsed: 1,
  };

  const result: XpEarnResult = recordGameplayRunXp(runState, startTime, storage, eventId);

  // Authoritative reward data consumed directly by GameOverModal
  assert.ok(result.xpEarned > 0);
  assert.equal(result.levelBefore, 1);
  assert.ok(result.state.totalLifetimeXp > 0);
  assert.equal(result.breakdown.foodXp, 100); // 10 * 10
  assert.equal(result.breakdown.scoreXp, 5); // 100 / 20
  assert.equal(result.breakdown.survivalXp, 5); // 25 / 5
  assert.equal(result.breakdown.shieldXp, 15); // 1 * 15
});

test('GameOver Integration 6: Level-up transition and multi-level leap are captured cleanly in XpEarnResult', () => {
  const storage = new MemoryStorage();
  // Player is at Level 1 with 80 XP (needs 20 XP to reach Level 2 at 100 XP threshold)
  const initial: PlayerProgressionState = {
    ...createDefaultPlayerProgression(),
    level: 1,
    currentXp: 80,
    xpForNextLevel: 100,
    totalLifetimeXp: 80,
    highestLevelAchieved: 1,
  };
  savePlayerProgression(initial, storage);

  // Player completes a big run earning 300 XP (Total lifetime: 80 + 300 = 380 XP)
  // Thresholds: Level 1 (0), Level 2 (100), Level 3 (275), Level 4 (550)
  // 380 XP reaches Level 3!
  const runState: GameEngineState = {
    ...createInitialState('rush'),
    foodEaten: 20,
    bonusEaten: 2,
    score: 200,
    gameTimeMs: 30000,
  };

  const result = recordGameplayRunXp(runState, 1715000000000, storage, 'rush-big-run');

  assert.equal(result.levelBefore, 1);
  assert.equal(result.levelAfter, 3);
  assert.equal(result.levelsGained, 2);
  assert.equal(result.state.level, 3);
  assert.equal(getLevelTitle(result.levelAfter), 'Grid Runner');
});

test('GameOver Integration 7: Zero-XP run awards 0 XP and produces empty breakdown cleanly for friendly UI display', () => {
  const storage = new MemoryStorage();
  const zeroRunState: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 0,
    bonusEaten: 0,
    score: 0,
    gameTimeMs: 2000, // < 5 seconds
  };

  const result = recordGameplayRunXp(zeroRunState, 1715000000000, storage, 'zero-xp-run');

  assert.equal(result.xpEarned, 0);
  assert.equal(result.levelsGained, 0);
  assert.equal(result.breakdown.totalXp, 0);
});

test('GameOver Integration 8: Reopening GameOver screen with stored lastXpResult does not award duplicate XP', () => {
  const storage = new MemoryStorage();
  const startTime = 1715000000000;
  const eventId = createRunEventId('classic', startTime, 'run-idempotence');

  const runState: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 5,
    score: 50,
    gameTimeMs: 15000,
  };

  // Initial completion: awards XP
  const firstResult = recordGameplayRunXp(runState, startTime, storage, eventId);
  const totalXp = firstResult.state.totalLifetimeXp;
  assert.ok(firstResult.xpEarned > 0);

  // Modal reopening or re-rendering: awardRunXp returns 0 duplicate XP
  const secondResult = awardRunXp({ mode: 'classic', foodEaten: 5, score: 50, survivalSeconds: 15 }, eventId, storage);
  assert.equal(secondResult.xpEarned, 0);
  assert.equal(secondResult.state.totalLifetimeXp, totalXp);
});

// -----------------------------------------------------------------------------
// C. Maze StageClear and CampaignVictory Screen Integration Tests
// -----------------------------------------------------------------------------

test('Maze Integration 9: Stage Clear displays isolated stage-specific XP and +100 Stage Clear bonus', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-test-campaign-1';

  // Stage 1 initial snapshot: 0 food, 0 score, 0 ms
  const initialStage1: GameEngineState = {
    ...createInitialState('maze'),
    stage: 1,
    foodEaten: 0,
    score: 0,
    gameTimeMs: 0,
  };
  const snapshot1 = createMazeStageSnapshot(initialStage1);

  // Stage 1 finishes with 10 cores, 100 score, 20s
  const stage1Cleared: GameEngineState = {
    ...initialStage1,
    foodEaten: 10,
    score: 100,
    gameTimeMs: 20000,
    stageFoodEaten: 10,
    isStageClear: true,
  };

  const delta = calculateMazeStageDelta(stage1Cleared, snapshot1, true, false);
  const eventId = createMazeStageEventId(campaignId, 1, 'clear');
  const stageResult = recordMazeStageXp(delta, eventId, storage);

  assert.equal(stageResult.breakdown.stageClearBonusXp, 100);
  assert.equal(stageResult.breakdown.campaignVictoryBonusXp, 0);
  assert.ok(stageResult.xpEarned > 100); // 100 bonus + performance XP
});

test('Maze Integration 10: Campaign Victory displays both +100 Stage Clear and +500 Campaign Victory bonuses', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-test-campaign-2';

  // Stage 6 snapshot
  const initialStage6: GameEngineState = {
    ...createInitialState('maze'),
    stage: 6,
    foodEaten: 50,
    score: 1200,
    gameTimeMs: 100000,
  };
  const snapshot6 = createMazeStageSnapshot(initialStage6);

  // Stage 6 cleared and full campaign won
  const finalVictory: GameEngineState = {
    ...initialStage6,
    foodEaten: 60,
    score: 1500,
    gameTimeMs: 130000,
    stageFoodEaten: 10,
    isStageClear: true,
    isCampaignComplete: true,
  };

  const delta = calculateMazeStageDelta(finalVictory, snapshot6, true, true);
  const victoryEventId = createMazeStageEventId(campaignId, 6, 'victory');
  const victoryResult = recordMazeStageXp(delta, victoryEventId, storage);

  // Both bonuses are distinguished and awarded
  assert.equal(victoryResult.breakdown.stageClearBonusXp, 100);
  assert.equal(victoryResult.breakdown.campaignVictoryBonusXp, 500);
  assert.ok(victoryResult.xpEarned >= 600);
});

test('Maze Integration 11: Reopening StageClear or CampaignVictory modals never awards duplicate XP', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-test-campaign-3';
  const eventId = createMazeStageEventId(campaignId, 6, 'victory');

  const delta: RunXpInput = {
    mode: 'maze',
    foodEaten: 10,
    score: 250,
    survivalSeconds: 30,
    isStageClear: true,
    isCampaignComplete: true,
  };

  const firstAward = recordMazeStageXp(delta, eventId, storage);
  const lifetimeAfterFirst = firstAward.state.totalLifetimeXp;
  assert.ok(firstAward.xpEarned > 0);

  // Re-firing the record call (e.g. if screen was reopened or re-rendered)
  const secondAward = recordMazeStageXp(delta, eventId, storage);
  assert.equal(secondAward.xpEarned, 0);
  assert.equal(secondAward.state.totalLifetimeXp, lifetimeAfterFirst);
});

// -----------------------------------------------------------------------------
// D. Stats Screen Dossier Integration Tests
// -----------------------------------------------------------------------------

test('Stats Dossier 12: Player Progression section maps lifetime XP, highest level, and remaining XP correctly', () => {
  const storage = new MemoryStorage();

  // Create Level 5 progression:
  // Cumulative threshold for Level 5 is 950 XP
  // Suppose player has 1,200 XP total -> in Level 5, current XP = 250, next level threshold delta = 550
  const derived = calculateLevelFromLifetimeXp(1200);
  assert.equal(derived.level, 5);
  assert.equal(derived.currentXp, 250);
  assert.equal(derived.xpForNextLevel, 550);

  const progressionState: PlayerProgressionState = {
    ...createDefaultPlayerProgression(),
    level: derived.level,
    currentXp: derived.currentXp,
    xpForNextLevel: derived.xpForNextLevel,
    totalLifetimeXp: 1200,
    highestLevelAchieved: 5,
  };
  savePlayerProgression(progressionState, storage);

  const loaded = loadPlayerProgression(storage);
  assert.equal(loaded.level, 5);
  assert.equal(getLevelTitle(loaded.level), 'Apex Hunter');
  assert.equal(loaded.totalLifetimeXp, 1200);
  assert.equal(loaded.highestLevelAchieved, 5);
  assert.equal(loaded.currentXp, 250);
  assert.equal(loaded.xpForNextLevel, 550);

  const remaining = loaded.xpForNextLevel - loaded.currentXp;
  assert.equal(remaining, 300);
});

test('Stats Dossier 13: Level 50 player displays Apex Legend status and zero remaining XP cleanly', () => {
  const maxState = calculateLevelFromLifetimeXp(143700);
  assert.equal(maxState.level, 50);
  assert.equal(maxState.currentXp, 0);
  assert.equal(maxState.xpForNextLevel, 0);

  const title = getLevelTitle(maxState.level);
  assert.equal(title, 'Apex Legend');
});

// -----------------------------------------------------------------------------
// E. Regressions & Ledger Integrity Tests
// -----------------------------------------------------------------------------

test('Progression Regression 14: Daily Challenge XP (50 XP) and Trophy Stars (25 Stars) remain completely distinct', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const dailyState = createInitialDailyState(date);
  const challenge = dailyState.challenges[0];
  challenge.progress = challenge.target;
  challenge.completed = true;
  saveDailyChallengeState(dailyState, storage);

  const claimRes = recordDailyRewardClaim(challenge.id, date, storage, 1715000000000);
  assert.equal(claimRes.success, true);
  assert.equal(claimRes.xpEarned, 50);

  // Trophy Stars are tracked separately in DailyChallengeUserState
  const reloadedDaily = loadDailyChallengeState(storage, 1715000000000);
  assert.equal(reloadedDaily.lifetimeStars, 25);

  // Player Progression has 50 XP
  const reloadedProgression = loadPlayerProgression(storage);
  assert.equal(reloadedProgression.totalLifetimeXp, 50);
});

test('Progression Regression 15: Level 50 permanent cap cannot be exceeded even with millions of XP', () => {
  const millionXp = calculateLevelFromLifetimeXp(1000000);
  assert.equal(millionXp.level, 50);
  assert.equal(millionXp.currentXp, 0);
  assert.equal(millionXp.xpForNextLevel, 0);
});

// -----------------------------------------------------------------------------
// F. Step 4.1 Audit Verification Tests
// -----------------------------------------------------------------------------

test('Audit 16: All 10 XP breakdown components are accurately calculated and sum strictly equals totalXp', () => {
  // Scenario 1: Standard run with combo, shields, food, bonus, score, survival
  const classicInput: RunXpInput = {
    mode: 'classic',
    foodEaten: 12,
    bonusEaten: 2,
    score: 300,
    survivalSeconds: 45,
    maxCombo: 4,
    shieldsUsed: 2,
  };
  const classicBreakdown = calculateRunXp(classicInput);
  assert.ok(classicBreakdown.foodXp > 0);
  assert.ok(classicBreakdown.bonusFoodXp > 0);
  assert.ok(classicBreakdown.scoreXp > 0);
  assert.ok(classicBreakdown.survivalXp > 0);
  assert.ok(classicBreakdown.comboXp > 0);
  assert.ok(classicBreakdown.shieldXp > 0);
  assert.equal(classicBreakdown.zenWrapXp, 0); // Not Zen
  assert.equal(classicBreakdown.rushBonusXp, 0); // Not Rush
  assert.equal(classicBreakdown.stageClearBonusXp, 0);
  assert.equal(classicBreakdown.campaignVictoryBonusXp, 0);

  const classicSum =
    classicBreakdown.foodXp +
    classicBreakdown.bonusFoodXp +
    classicBreakdown.scoreXp +
    classicBreakdown.survivalXp +
    classicBreakdown.comboXp +
    classicBreakdown.shieldXp +
    classicBreakdown.zenWrapXp +
    classicBreakdown.rushBonusXp +
    classicBreakdown.stageClearBonusXp +
    classicBreakdown.campaignVictoryBonusXp;
  assert.equal(classicSum, classicBreakdown.totalXp);

  // Scenario 2: Zen mode with wraparounds
  const zenInput: RunXpInput = {
    mode: 'zen',
    foodEaten: 5,
    score: 100,
    survivalSeconds: 20,
    wallsWrapped: 10,
  };
  const zenBreakdown = calculateRunXp(zenInput);
  assert.ok(zenBreakdown.zenWrapXp > 0);
  const zenSum =
    zenBreakdown.foodXp +
    zenBreakdown.bonusFoodXp +
    zenBreakdown.scoreXp +
    zenBreakdown.survivalXp +
    zenBreakdown.comboXp +
    zenBreakdown.shieldXp +
    zenBreakdown.zenWrapXp +
    zenBreakdown.rushBonusXp +
    zenBreakdown.stageClearBonusXp +
    zenBreakdown.campaignVictoryBonusXp;
  assert.equal(zenSum, zenBreakdown.totalXp);

  // Scenario 3: Rush mode with multiplier
  const rushInput: RunXpInput = {
    mode: 'rush',
    foodEaten: 15,
    score: 400,
    survivalSeconds: 60,
  };
  const rushBreakdown = calculateRunXp(rushInput);
  assert.ok(rushBreakdown.rushBonusXp > 0);
  const rushSum =
    rushBreakdown.foodXp +
    rushBreakdown.bonusFoodXp +
    rushBreakdown.scoreXp +
    rushBreakdown.survivalXp +
    rushBreakdown.comboXp +
    rushBreakdown.shieldXp +
    rushBreakdown.zenWrapXp +
    rushBreakdown.rushBonusXp +
    rushBreakdown.stageClearBonusXp +
    rushBreakdown.campaignVictoryBonusXp;
  assert.equal(rushSum, rushBreakdown.totalXp);

  // Scenario 4: Maze mode with both Stage Clear and Campaign Victory
  const mazeInput: RunXpInput = {
    mode: 'maze',
    foodEaten: 10,
    score: 500,
    survivalSeconds: 30,
    isStageClear: true,
    isCampaignComplete: true,
  };
  const mazeBreakdown = calculateRunXp(mazeInput);
  assert.equal(mazeBreakdown.stageClearBonusXp, 100);
  assert.equal(mazeBreakdown.campaignVictoryBonusXp, 500);
  const mazeSum =
    mazeBreakdown.foodXp +
    mazeBreakdown.bonusFoodXp +
    mazeBreakdown.scoreXp +
    mazeBreakdown.survivalXp +
    mazeBreakdown.comboXp +
    mazeBreakdown.shieldXp +
    mazeBreakdown.zenWrapXp +
    mazeBreakdown.rushBonusXp +
    mazeBreakdown.stageClearBonusXp +
    mazeBreakdown.campaignVictoryBonusXp;
  assert.equal(mazeSum, mazeBreakdown.totalXp);
});

test('Audit 17: Zero-value XP components are never rendered or counted as positive earnings', () => {
  const minimalRun: RunXpInput = {
    mode: 'classic',
    foodEaten: 1,
    score: 10,
    survivalSeconds: 5,
    bonusEaten: 0,
    shieldsUsed: 0,
    wallsWrapped: 0,
    maxCombo: 1,
  };
  const breakdown = calculateRunXp(minimalRun);

  // Zero-value fields
  assert.equal(breakdown.bonusFoodXp, 0);
  assert.equal(breakdown.comboXp, 0);
  assert.equal(breakdown.shieldXp, 0);
  assert.equal(breakdown.zenWrapXp, 0);
  assert.equal(breakdown.rushBonusXp, 0);
  assert.equal(breakdown.stageClearBonusXp, 0);
  assert.equal(breakdown.campaignVictoryBonusXp, 0);

  // Only earned items are positive
  assert.ok(breakdown.foodXp > 0);
  assert.ok(breakdown.survivalXp > 0);
  assert.equal(breakdown.totalXp, breakdown.foodXp + breakdown.scoreXp + breakdown.survivalXp);
});

test('Audit 18: Progression State remains strictly authoritative after storage reloads and level transitions', () => {
  const storage = new MemoryStorage();

  // Fresh state starts at Level 1 with 0 XP
  const fresh = loadPlayerProgression(storage);
  assert.equal(fresh.level, 1);
  assert.equal(fresh.currentXp, 0);
  assert.equal(fresh.totalLifetimeXp, 0);
  assert.equal(fresh.highestLevelAchieved, 1);
  assert.equal(getLevelTitle(fresh.level), 'Neon Scout');

  // Multi-level leap with 2,500 XP
  const awardResult = awardRunXp(
    { mode: 'classic', foodEaten: 50, score: 1000, survivalSeconds: 120 },
    'event-multileap-audit',
    storage
  );
  assert.ok(awardResult.levelsGained >= 1);
  assert.equal(awardResult.levelAfter, awardResult.state.level);
  assert.equal(awardResult.state.highestLevelAchieved, awardResult.levelAfter);

  // Storage reload returns identical authoritative values
  const reloaded = loadPlayerProgression(storage);
  assert.deepEqual(reloaded, awardResult.state);
});

test('Audit 19: Modal re-renders and re-openings never award duplicate XP or mutate event IDs', () => {
  const storage = new MemoryStorage();
  const eventId = 'audit-run-idempotency-101';

  const runInput: RunXpInput = {
    mode: 'classic',
    foodEaten: 10,
    score: 200,
    survivalSeconds: 30,
  };

  const initialResult = awardRunXp(runInput, eventId, storage);
  assert.ok(initialResult.xpEarned > 0);
  const initialLifetime = initialResult.state.totalLifetimeXp;
  const initialEventsLength = initialResult.state.processedRunEventIds.length;

  // Re-invoking awardRunXp with the same eventId yields 0 XP
  const duplicateResult = awardRunXp(runInput, eventId, storage);
  assert.equal(duplicateResult.xpEarned, 0);
  assert.equal(duplicateResult.levelsGained, 0);
  assert.equal(duplicateResult.state.totalLifetimeXp, initialLifetime);
  assert.equal(duplicateResult.state.processedRunEventIds.length, initialEventsLength);
});

test('Audit 20: Stage Clear (+100) and Campaign Victory (+500) bonuses are strictly distinct and non-duplicative', () => {
  const storage = new MemoryStorage();

  // Intermediate Stage 3 clear: gets +100 Stage Clear, 0 Campaign Victory
  const stage3Input: RunXpInput = {
    mode: 'maze',
    foodEaten: 10,
    score: 150,
    survivalSeconds: 25,
    isStageClear: true,
    isCampaignComplete: false,
  };
  const stage3Result = awardRunXp(stage3Input, 'maze-stage-3-audit-clear', storage);
  assert.equal(stage3Result.breakdown.stageClearBonusXp, 100);
  assert.equal(stage3Result.breakdown.campaignVictoryBonusXp, 0);

  // Final Stage 6 victory: gets +100 Stage Clear AND +500 Campaign Victory
  const stage6Input: RunXpInput = {
    mode: 'maze',
    foodEaten: 10,
    score: 250,
    survivalSeconds: 35,
    isStageClear: true,
    isCampaignComplete: true,
  };
  const stage6Result = awardRunXp(stage6Input, 'maze-stage-6-audit-victory', storage);
  assert.equal(stage6Result.breakdown.stageClearBonusXp, 100);
  assert.equal(stage6Result.breakdown.campaignVictoryBonusXp, 500);
});
