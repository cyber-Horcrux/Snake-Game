import test from 'node:test';
import assert from 'node:assert/strict';
import type { StorageLike } from './persistence.ts';
import {
  CUMULATIVE_THRESHOLDS_1_TO_10,
  DEFAULT_PLAYER_PROGRESSION,
  LEVEL_50_CUMULATIVE_XP,
  awardCustomXp,
  awardRunXp,
  calculateLevelFromLifetimeXp,
  calculateRunXp,
  calculateXpForNextLevel,
  createDefaultPlayerProgression,
  generateDailyRewardId,
  getCumulativeXpForLevel,
  getLevelTitle,
  loadDailyRewardLedger,
  loadPlayerProgression,
  reconcileDailyRewards,
  recordDailyRewardClaim,
  resetDailyRewardLedger,
  resetPlayerProgression,
  sanitizeNonNegativeInt,
  sanitizePlayerProgression,
  saveDailyRewardLedger,
  savePlayerProgression,
  createRunEventId,
  createMazeStageEventId,
  createMazeStageSnapshot,
  calculateMazeStageDelta,
  recordGameplayRunXp,
  recordMazeStageXp,
} from './levels.ts';
import {
  createInitialDailyState,
  getUtcDateString,
  loadDailyChallengeState,
  saveDailyChallengeState,
} from './challenges.ts';
import { STORAGE_KEYS, XP_REWARDS } from './constants.ts';
import { createInitialState, stepGame, calculateTickInterval } from './engine.ts';
import { createInitialMazeState, advanceMazeStage } from './mazes.ts';
import type { GameEngineState, MazeStageSnapshot } from './types.ts';

// In-memory mock storage adhering to StorageLike
class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  public shouldThrow = false;

  getItem(key: string): string | null {
    if (this.shouldThrow) throw new Error('Storage failure');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrow) throw new Error('Quota exceeded');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    if (this.shouldThrow) throw new Error('Storage error');
    this.data.delete(key);
  }
}

// ============================================================================
// 1. XP CALCULATIONS & RECONFIRMED EXAMPLES
// ============================================================================

test('calculateRunXp: Classic beginner example produces exactly 126 XP', () => {
  // Input: 8 normal food, 1 bonus food, score 110, survived 32s, combo 2x, 0 shields
  const breakdown = calculateRunXp({
    mode: 'classic',
    foodEaten: 8,
    bonusEaten: 1,
    score: 110,
    survivalSeconds: 32,
    maxCombo: 2,
    shieldsUsed: 0,
  });

  assert.equal(breakdown.foodXp, 80);
  assert.equal(breakdown.bonusFoodXp, 25);
  assert.equal(breakdown.scoreXp, 5); // Math.floor(110 / 20)
  assert.equal(breakdown.survivalXp, 6); // Math.floor(32 / 5)
  assert.equal(breakdown.comboXp, 10);
  assert.equal(breakdown.shieldXp, 0);
  assert.equal(breakdown.rushBonusXp, 0);
  assert.equal(breakdown.totalXp, 126);
});

test('calculateRunXp: Rush mode example produces exactly 445 XP with isolated rushBonusXp', () => {
  // Input: 22 normal food, 3 bonus food, score 340, survived 48s, combo 3x, 1 shield
  // Base subtotal = 220 + 75 + 17 + 9 + 20 + 15 = 356
  // Rush total = Math.floor(356 * 1.25) = 445
  // rushBonusXp = 445 - 356 = 89
  const breakdown = calculateRunXp({
    mode: 'rush',
    foodEaten: 22,
    bonusEaten: 3,
    score: 340,
    survivalSeconds: 48,
    maxCombo: 3,
    shieldsUsed: 1,
  });

  assert.equal(breakdown.foodXp, 220);
  assert.equal(breakdown.bonusFoodXp, 75);
  assert.equal(breakdown.scoreXp, 17);
  assert.equal(breakdown.survivalXp, 9);
  assert.equal(breakdown.comboXp, 20);
  assert.equal(breakdown.shieldXp, 15);
  assert.equal(breakdown.rushBonusXp, 89);
  assert.equal(breakdown.totalXp, 445);
});

test('calculateRunXp: Maze Stage 1 clear produces exactly 216 XP', () => {
  // Input: 10 neon cores (food), score 160, survived 42s, combo 1x, 0 shields, isStageClear: true
  // 100 + 8 + 8 + 100 = 216
  const breakdown = calculateRunXp({
    mode: 'maze',
    foodEaten: 10,
    bonusEaten: 0,
    score: 160,
    survivalSeconds: 42,
    maxCombo: 1,
    shieldsUsed: 0,
    isStageClear: true,
  });

  assert.equal(breakdown.foodXp, 100);
  assert.equal(breakdown.scoreXp, 8);
  assert.equal(breakdown.survivalXp, 8);
  assert.equal(breakdown.comboXp, 0);
  assert.equal(breakdown.stageClearBonusXp, 100);
  assert.equal(breakdown.campaignVictoryBonusXp, 0);
  assert.equal(breakdown.totalXp, 216);
});

test('calculateRunXp: Zen mode flow example produces exactly 199 XP', () => {
  // Input: 15 normal food, 0 bonus, score 150, survived 180s, 24 wraps
  // 150 + 7 + 30 (cap) + 12 = 199
  const breakdown = calculateRunXp({
    mode: 'zen',
    foodEaten: 15,
    bonusEaten: 0,
    score: 150,
    survivalSeconds: 180,
    wallsWrapped: 24,
    maxCombo: 1,
  });

  assert.equal(breakdown.foodXp, 150);
  assert.equal(breakdown.scoreXp, 7);
  assert.equal(breakdown.survivalXp, 30); // Capped at 30 XP
  assert.equal(breakdown.zenWrapXp, 12);  // Math.floor(24 / 2)
  assert.equal(breakdown.totalXp, 199);
});

test('calculateRunXp: Anti-exploit zero-XP rule awards exactly 0 XP', () => {
  // Under 5 seconds AND zero food
  const exploitRun = calculateRunXp({
    mode: 'classic',
    foodEaten: 0,
    bonusEaten: 0,
    score: 100, // Should be voided
    survivalSeconds: 4,
    maxCombo: 3, // Should be voided
    shieldsUsed: 2, // Should be voided
  });
  assert.equal(exploitRun.totalXp, 0);
  assert.equal(exploitRun.scoreXp, 0);
  assert.equal(exploitRun.comboXp, 0);
  assert.equal(exploitRun.shieldXp, 0);

  // If survival is >= 5 seconds even with 0 food, legitimate gameplay XP applies
  const survivedRun = calculateRunXp({
    mode: 'classic',
    foodEaten: 0,
    bonusEaten: 0,
    score: 40,
    survivalSeconds: 10,
  });
  assert.equal(survivedRun.survivalXp, 2);
  assert.equal(survivedRun.scoreXp, 2);
  assert.equal(survivedRun.totalXp, 4);

  // If at least 1 food is eaten, even under 5s awards XP
  const quickFoodRun = calculateRunXp({
    mode: 'classic',
    foodEaten: 1,
    bonusEaten: 0,
    score: 10,
    survivalSeconds: 2,
  });
  assert.equal(quickFoodRun.foodXp, 10);
  assert.equal(quickFoodRun.totalXp, 10);
});

test('calculateRunXp: Enforces survival, combo, shield, and Zen wrap caps', () => {
  // Survival cap is 30 XP (150s)
  const capSurvival = calculateRunXp({
    mode: 'classic',
    foodEaten: 1,
    score: 0,
    survivalSeconds: 500, // 500 / 5 = 100 -> cap 30
  });
  assert.equal(capSurvival.survivalXp, 30);

  // Shield cap is 45 XP (3 saves)
  const capShields = calculateRunXp({
    mode: 'classic',
    foodEaten: 1,
    score: 0,
    survivalSeconds: 10,
    shieldsUsed: 5, // 5 * 15 = 75 -> cap 45
  });
  assert.equal(capShields.shieldXp, 45);

  // Zen wrap cap is 15 XP (30 wraps)
  const capZen = calculateRunXp({
    mode: 'zen',
    foodEaten: 1,
    score: 0,
    survivalSeconds: 10,
    wallsWrapped: 60, // 60 / 2 = 30 -> cap 15
  });
  assert.equal(capZen.zenWrapXp, 15);

  // Non-zen mode gets 0 zenWrapXp
  const nonZen = calculateRunXp({
    mode: 'classic',
    foodEaten: 1,
    score: 0,
    survivalSeconds: 10,
    wallsWrapped: 20,
  });
  assert.equal(nonZen.zenWrapXp, 0);

  // Combo ranges: 1x = 0, 2x = 10, 3x = 20, 4x+ = 30
  assert.equal(calculateRunXp({ mode: 'classic', foodEaten: 1, score: 0, survivalSeconds: 5, maxCombo: 1 }).comboXp, 0);
  assert.equal(calculateRunXp({ mode: 'classic', foodEaten: 1, score: 0, survivalSeconds: 5, maxCombo: 2 }).comboXp, 10);
  assert.equal(calculateRunXp({ mode: 'classic', foodEaten: 1, score: 0, survivalSeconds: 5, maxCombo: 3 }).comboXp, 20);
  assert.equal(calculateRunXp({ mode: 'classic', foodEaten: 1, score: 0, survivalSeconds: 5, maxCombo: 4 }).comboXp, 30);
  assert.equal(calculateRunXp({ mode: 'classic', foodEaten: 1, score: 0, survivalSeconds: 5, maxCombo: 8 }).comboXp, 30);
});

test('calculateRunXp: Maze campaign victory bonus adds exactly +500 XP', () => {
  const victory = calculateRunXp({
    mode: 'maze',
    foodEaten: 10,
    score: 200,
    survivalSeconds: 30,
    isStageClear: true,
    isCampaignComplete: true,
  });
  assert.equal(victory.stageClearBonusXp, 100);
  assert.equal(victory.campaignVictoryBonusXp, 500);
  // Base = 100 + 10 + 6 = 116 + 100 + 500 = 716
  assert.equal(victory.totalXp, 716);
});

test('calculateRunXp: Defensively handles negative, NaN, non-finite, and null inputs', () => {
  const invalid = calculateRunXp({
    mode: 'classic',
    foodEaten: -10 as unknown as number,
    bonusEaten: NaN,
    score: Infinity,
    survivalSeconds: -50,
    maxCombo: undefined,
    shieldsUsed: null as unknown as number,
  });
  assert.equal(invalid.foodXp, 0);
  assert.equal(invalid.bonusFoodXp, 0);
  assert.equal(invalid.scoreXp, 0);
  assert.equal(invalid.survivalXp, 0);
  assert.equal(invalid.comboXp, 0);
  assert.equal(invalid.shieldXp, 0);
  assert.equal(invalid.totalXp, 0);
});

// ============================================================================
// 2. LEVEL PROGRESSION THRESHOLDS & MILESTONES
// ============================================================================

test('progression: Exact cumulative thresholds for Levels 1 through 10', () => {
  const expectedTotals = [0, 100, 275, 550, 950, 1500, 2225, 3150, 4300, 5700];
  for (let l = 1; l <= 10; l++) {
    assert.equal(
      getCumulativeXpForLevel(l),
      expectedTotals[l - 1],
      `Failed cumulative XP for Level ${l}`
    );
  }
});

test('progression: Exact transition deltas for Levels 1 through 10', () => {
  assert.equal(calculateXpForNextLevel(1), 100);
  assert.equal(calculateXpForNextLevel(2), 175);
  assert.equal(calculateXpForNextLevel(3), 275);
  assert.equal(calculateXpForNextLevel(4), 400);
  assert.equal(calculateXpForNextLevel(5), 550);
  assert.equal(calculateXpForNextLevel(6), 725);
  assert.equal(calculateXpForNextLevel(7), 925);
  assert.equal(calculateXpForNextLevel(8), 1150);
  assert.equal(calculateXpForNextLevel(9), 1400);
  assert.equal(calculateXpForNextLevel(10), 1500); // 1500 + 100 * (10 - 10) = 1500
});

test('progression: Verifies all specified milestone totals up to Level 50', () => {
  // Required milestones:
  // Level 15: 14,200 XP
  // Level 20: 25,200 XP
  // Level 25: 38,700 XP
  // Level 30: 54,700 XP
  // Level 40: 94,700 XP
  // Level 50: 143,700 XP
  assert.equal(getCumulativeXpForLevel(15), 14200, 'Milestone Level 15 must be 14,200');
  assert.equal(getCumulativeXpForLevel(20), 25200, 'Milestone Level 20 must be 25,200');
  assert.equal(getCumulativeXpForLevel(25), 38700, 'Milestone Level 25 must be 38,700');
  // Formula: T(40) = 5700 + 1500*30 + 50*30*29 = 94,200 (reaches 143,700 at Level 50)
  assert.equal(getCumulativeXpForLevel(40), 94200, 'Milestone Level 40 evaluates to 94,200 via T(N) formula');
  assert.equal(getCumulativeXpForLevel(50), 143700, 'Milestone Level 50 must be 143,700');

  // Level 49 -> 50 requires exactly 5,400 XP
  assert.equal(calculateXpForNextLevel(49), 5400, 'Level 49 -> 50 transition must be 5,400');
});

test('progression: calculateLevelFromLifetimeXp correctly derives level and progress', () => {
  // At 0 XP: Level 1, 0/100 XP
  const at0 = calculateLevelFromLifetimeXp(0);
  assert.equal(at0.level, 1);
  assert.equal(at0.currentXp, 0);
  assert.equal(at0.xpForNextLevel, 100);

  // At 99 XP: Level 1, 99/100 XP
  const at99 = calculateLevelFromLifetimeXp(99);
  assert.equal(at99.level, 1);
  assert.equal(at99.currentXp, 99);
  assert.equal(at99.xpForNextLevel, 100);

  // At 100 XP: Level 2, 0/175 XP
  const at100 = calculateLevelFromLifetimeXp(100);
  assert.equal(at100.level, 2);
  assert.equal(at100.currentXp, 0);
  assert.equal(at100.xpForNextLevel, 175);

  // At 275 XP: Level 3, 0/275 XP
  const at275 = calculateLevelFromLifetimeXp(275);
  assert.equal(at275.level, 3);
  assert.equal(at275.currentXp, 0);
  assert.equal(at275.xpForNextLevel, 275);
});

test('progression: Multi-level overflow: 1,200 XP from Level 1 produces Level 5 with 250 XP remaining', () => {
  // Level 4 threshold is 550, Level 5 is 950, Level 6 is 1500 (delta: 550)
  // At 1,200 XP: 1200 - 950 = 250 XP into Level 5, with 550 needed for Level 6
  const overflow = calculateLevelFromLifetimeXp(1200);
  assert.equal(overflow.level, 5);
  assert.equal(overflow.currentXp, 250);
  assert.equal(overflow.xpForNextLevel, 550);
});

test('progression: Level 50 permanent cap', () => {
  // Exactly at Level 50 threshold (143,700 XP)
  const atCap = calculateLevelFromLifetimeXp(LEVEL_50_CUMULATIVE_XP);
  assert.equal(atCap.level, 50);
  assert.equal(atCap.currentXp, 0);
  assert.equal(atCap.xpForNextLevel, 0);

  // Way past Level 50 threshold (200,000 XP)
  const beyondCap = calculateLevelFromLifetimeXp(200000);
  assert.equal(beyondCap.level, 50);
  assert.equal(beyondCap.currentXp, 0);
  assert.equal(beyondCap.xpForNextLevel, 0);
  assert.equal(calculateXpForNextLevel(50), 0);
});

test('progression: getLevelTitle returns kid-friendly title', () => {
  assert.equal(getLevelTitle(1), 'Neon Scout');
  assert.equal(getLevelTitle(2), 'Cyber Striker');
  assert.equal(getLevelTitle(5), 'Apex Hunter');
  assert.equal(getLevelTitle(10), 'Cyber Champion');
  assert.equal(getLevelTitle(50), 'Apex Legend');
});

// ============================================================================
// 3. PERSISTENCE & DEFENSIVE SANITIZATION
// ============================================================================

test('persistence: loadPlayerProgression returns defaults on empty or null storage', () => {
  assert.deepEqual(loadPlayerProgression(null), DEFAULT_PLAYER_PROGRESSION);

  const storage = new MemoryStorage();
  assert.deepEqual(loadPlayerProgression(storage), DEFAULT_PLAYER_PROGRESSION);
});

test('persistence: Gracefully recovers from malformed JSON and negative lifetime XP', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_player_progression_v1', '{corrupt_data}');
  assert.deepEqual(loadPlayerProgression(storage), DEFAULT_PLAYER_PROGRESSION);

  storage.setItem(
    'neon_snake_player_progression_v1',
    JSON.stringify({
      totalLifetimeXp: -500,
      level: -10,
      currentXp: -50,
      highestLevelAchieved: -1,
    })
  );
  const loaded = loadPlayerProgression(storage);
  assert.equal(loaded.totalLifetimeXp, 0);
  assert.equal(loaded.level, 1);
  assert.equal(loaded.currentXp, 0);
  assert.equal(loaded.xpForNextLevel, 100);
  assert.equal(loaded.highestLevelAchieved, 1);
});

test('persistence: totalLifetimeXp is authoritative, repairing contradictory saved fields', () => {
  const storage = new MemoryStorage();
  // Saved level says 30, but lifetime XP is only 100 (which is Level 2)
  storage.setItem(
    'neon_snake_player_progression_v1',
    JSON.stringify({
      totalLifetimeXp: 100,
      level: 30, // Contradictory!
      currentXp: 9999, // Contradictory!
      highestLevelAchieved: 1,
    })
  );
  const loaded = loadPlayerProgression(storage);
  assert.equal(loaded.totalLifetimeXp, 100);
  assert.equal(loaded.level, 2);
  assert.equal(loaded.currentXp, 0);
  assert.equal(loaded.xpForNextLevel, 175);
  assert.equal(loaded.highestLevelAchieved, 2);
});

test('persistence: savePlayerProgression persists valid state', () => {
  const storage = new MemoryStorage();
  const state = createDefaultPlayerProgression();
  state.totalLifetimeXp = 550; // Level 4
  const ok = savePlayerProgression(state, storage);
  assert.equal(ok, true);

  const reloaded = loadPlayerProgression(storage);
  assert.equal(reloaded.totalLifetimeXp, 550);
  assert.equal(reloaded.level, 4);
  assert.equal(reloaded.currentXp, 0);
  assert.equal(reloaded.xpForNextLevel, 400);
});

test('persistence: resetPlayerProgression restores defaults', () => {
  const storage = new MemoryStorage();
  savePlayerProgression({ ...DEFAULT_PLAYER_PROGRESSION, totalLifetimeXp: 5000 }, storage);
  assert.equal(loadPlayerProgression(storage).level, 9);

  resetPlayerProgression(storage);
  assert.deepEqual(loadPlayerProgression(storage), DEFAULT_PLAYER_PROGRESSION);
});

// ============================================================================
// 4. DEDUPLICATION & EVENT ID BUFFER
// ============================================================================

test('deduplication: awardRunXp awards XP on first call, zero on duplicate event ID', () => {
  const storage = new MemoryStorage();

  const runInput = {
    mode: 'classic' as const,
    foodEaten: 8,
    bonusEaten: 1,
    score: 110,
    survivalSeconds: 32,
    maxCombo: 2,
    shieldsUsed: 0,
  };

  const eventId = 'run-unique-12345';

  // First award
  const res1 = awardRunXp(runInput, eventId, storage);
  assert.equal(res1.xpEarned, 126);
  assert.equal(res1.levelBefore, 1);
  assert.equal(res1.levelAfter, 2);
  assert.equal(res1.levelsGained, 1);
  assert.equal(res1.state.totalLifetimeXp, 126);
  assert.equal(res1.state.processedRunEventIds.includes(eventId), true);

  // Second award with the EXACT SAME event ID must be rejected!
  const res2 = awardRunXp(runInput, eventId, storage);
  assert.equal(res2.xpEarned, 0);
  assert.equal(res2.levelBefore, 2);
  assert.equal(res2.levelAfter, 2);
  assert.equal(res2.levelsGained, 0);
  assert.equal(res2.state.totalLifetimeXp, 126); // Unmodified!

  // Third award with DIFFERENT event ID must succeed!
  const res3 = awardRunXp(runInput, 'run-unique-67890', storage);
  assert.equal(res3.xpEarned, 126);
  assert.equal(res3.state.totalLifetimeXp, 252);
});

test('deduplication: awardCustomXp awards direct XP and prevents duplicate daily rewards', () => {
  const storage = new MemoryStorage();
  const rewardId = 'challenge-reward-2026-11-06-easy_score_100';

  // First claim of daily challenge
  const res1 = awardCustomXp(50, rewardId, storage, true);
  assert.equal(res1.xpEarned, 50);
  assert.equal(res1.state.totalLifetimeXp, 50);
  assert.equal(res1.state.appliedRewardIds.includes(rewardId), true);

  // Duplicate claim attempt on same challenge ID
  const res2 = awardCustomXp(50, rewardId, storage, true);
  assert.equal(res2.xpEarned, 0);
  assert.equal(res2.state.totalLifetimeXp, 50); // Unmodified!
});

test('deduplication: Rolling buffer trims ordinary run event IDs at 100 without evicting daily appliedRewardIds', () => {
  const storage = new MemoryStorage();
  const dailyReward = 'challenge-reward-permanent-key';

  // Award a daily challenge first
  awardCustomXp(50, dailyReward, storage, true);

  // Now award 105 distinct runs
  for (let i = 1; i <= 105; i++) {
    awardRunXp(
      {
        mode: 'classic',
        foodEaten: 1,
        score: 0,
        survivalSeconds: 10,
      },
      `run-event-${i}`,
      storage
    );
  }

  const finalState = loadPlayerProgression(storage);

  // Run event IDs buffer is capped at exactly 100 entries!
  assert.equal(finalState.processedRunEventIds.length, 100);
  // Oldest runs (run-event-1 through 5) were evicted
  assert.equal(finalState.processedRunEventIds.includes('run-event-1'), false);
  assert.equal(finalState.processedRunEventIds.includes('run-event-5'), false);
  // Recent runs (run-event-6 through 105) are present
  assert.equal(finalState.processedRunEventIds.includes('run-event-6'), true);
  assert.equal(finalState.processedRunEventIds.includes('run-event-105'), true);

  // CRITICAL: Daily challenge appliedRewardIds is NOT trimmed with the rolling run buffer!
  assert.equal(finalState.appliedRewardIds.includes(dailyReward), true);
});

test('progression: Extra XP at Level 50 increases lifetime XP without changing level', () => {
  const storage = new MemoryStorage();

  // Seed storage at Level 50 threshold (143,700 XP)
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: LEVEL_50_CUMULATIVE_XP,
    },
    storage
  );

  const initial = loadPlayerProgression(storage);
  assert.equal(initial.level, 50);
  assert.equal(initial.currentXp, 0);
  assert.equal(initial.xpForNextLevel, 0);

  // Award another 500 XP
  const result = awardRunXp(
    {
      mode: 'classic',
      foodEaten: 50,
      score: 0,
      survivalSeconds: 10,
    },
    'run-at-cap-1',
    storage
  );

  assert.equal(result.xpEarned, 502); // 500 food + 2 survival = 502 XP
  assert.equal(result.levelBefore, 50);
  assert.equal(result.levelAfter, 50);
  assert.equal(result.levelsGained, 0);
  assert.equal(result.isMaxLevel, true);
  assert.equal(result.state.totalLifetimeXp, LEVEL_50_CUMULATIVE_XP + 502);
  assert.equal(result.state.currentXp, 0);
  assert.equal(result.state.xpForNextLevel, 0);
});

// ============================================================================
// 6. DAILY REWARD LEDGER & RECONCILIATION TESTS (Phase B Step 2)
// ============================================================================

test('Ledger 1: First completion awards exactly 50 XP and records reward ID', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  // Setup completed challenge
  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardClaimed: false,
  };
  saveDailyChallengeState(dailyState, storage);

  // Initial player progression
  const initialProg = loadPlayerProgression(storage);
  assert.equal(initialProg.totalLifetimeXp, 0);
  assert.equal(initialProg.appliedRewardIds.length, 0);

  // Claim
  const result = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(result.success, true);
  assert.equal(result.alreadyClaimed, false);
  assert.equal(result.xpEarned, 50);
  assert.equal(result.rewardId, 'challenge-reward-2026-11-06-easy_score_100');

  // Verify progression state
  const updatedProg = loadPlayerProgression(storage);
  assert.equal(updatedProg.totalLifetimeXp, 50);
  assert.equal(updatedProg.appliedRewardIds.includes('challenge-reward-2026-11-06-easy_score_100'), true);

  // Verify ledger state
  const ledger = loadDailyRewardLedger(storage);
  assert.equal(ledger.records.length, 1);
  assert.equal(ledger.records[0].rewardId, 'challenge-reward-2026-11-06-easy_score_100');
  assert.equal(ledger.records[0].xpAmount, 50);
  assert.equal(ledger.records[0].starsAmount, 25);
  assert.equal(ledger.records[0].utcDate, '2026-11-06');
});

test('Ledger 2: Repeated completion or claim attempts award 0 additional XP', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardClaimed: false,
  };
  saveDailyChallengeState(dailyState, storage);

  // First claim
  const first = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(first.success, true);
  assert.equal(first.xpEarned, 50);

  // Second claim attempt
  const second = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(second.success, false);
  assert.equal(second.alreadyClaimed, true);
  assert.equal(second.xpEarned, 0);

  // Third claim attempt
  const third = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(third.success, false);
  assert.equal(third.alreadyClaimed, true);
  assert.equal(third.xpEarned, 0);

  const finalProg = loadPlayerProgression(storage);
  assert.equal(finalProg.totalLifetimeXp, 50);
  assert.equal(finalProg.appliedRewardIds.length, 1);
});

test('Ledger 3: Duplicate reward IDs are rejected', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const rewardId = generateDailyRewardId(date, 'easy_score_100');

  // Seed ledger directly with existing rewardId
  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: date,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: now,
        },
      ],
    },
    storage
  );

  // Setup completed challenge
  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardClaimed: false,
  };
  saveDailyChallengeState(dailyState, storage);

  // Attempt claim
  const res = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(res.success, false);
  assert.equal(res.alreadyClaimed, true);
  assert.equal(res.xpEarned, 0);

  const ledger = loadDailyRewardLedger(storage);
  assert.equal(ledger.records.length, 1, 'Duplicate record must not be added');
});

test('Ledger 4: Different challenges on the same UTC date award separate 50 XP rewards', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
  };
  dailyState.challenges[1] = {
    ...dailyState.challenges[1],
    id: 'medium_combo_3',
    progress: 3,
    target: 3,
    completed: true,
  };
  dailyState.challenges[2] = {
    ...dailyState.challenges[2],
    id: 'hard_survive_120',
    progress: 120,
    target: 120,
    completed: true,
  };
  saveDailyChallengeState(dailyState, storage);

  const res1 = recordDailyRewardClaim('easy_score_100', date, storage, now);
  const res2 = recordDailyRewardClaim('medium_combo_3', date, storage, now);
  const res3 = recordDailyRewardClaim('hard_survive_120', date, storage, now);

  assert.equal(res1.success, true);
  assert.equal(res1.xpEarned, 50);
  assert.equal(res2.success, true);
  assert.equal(res2.xpEarned, 50);
  assert.equal(res3.success, true);
  assert.equal(res3.xpEarned, 50);

  const prog = loadPlayerProgression(storage);
  assert.equal(prog.totalLifetimeXp, 150);
  assert.equal(prog.appliedRewardIds.length, 3);

  const ledger = loadDailyRewardLedger(storage);
  assert.equal(ledger.records.length, 3);
});

test('Ledger 5: Same challenge on different UTC dates produces distinct reward IDs and awards 50 XP each', () => {
  const storage = new MemoryStorage();
  const date1 = '2026-11-06';
  const time1 = Date.UTC(2026, 10, 6, 12, 0, 0);
  const date2 = '2026-11-07';
  const time2 = Date.UTC(2026, 10, 7, 12, 0, 0);

  // Day 1
  const state1 = createInitialDailyState(date1, time1);
  state1.challenges[0] = {
    ...state1.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
  };
  saveDailyChallengeState(state1, storage);

  const res1 = recordDailyRewardClaim('easy_score_100', date1, storage, time1);
  assert.equal(res1.success, true);
  assert.equal(res1.rewardId, 'challenge-reward-2026-11-06-easy_score_100');
  assert.equal(res1.xpEarned, 50);

  // Day 2
  const state2 = createInitialDailyState(date2, time2);
  state2.challenges[0] = {
    ...state2.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
  };
  saveDailyChallengeState(state2, storage);

  const res2 = recordDailyRewardClaim('easy_score_100', date2, storage, time2);
  assert.equal(res2.success, true);
  assert.equal(res2.rewardId, 'challenge-reward-2026-11-07-easy_score_100');
  assert.equal(res2.xpEarned, 50);

  assert.notEqual(res1.rewardId, res2.rewardId);

  const prog = loadPlayerProgression(storage);
  assert.equal(prog.totalLifetimeXp, 100);
  assert.equal(prog.appliedRewardIds.length, 2);
  assert.equal(prog.appliedRewardIds.includes(res1.rewardId), true);
  assert.equal(prog.appliedRewardIds.includes(res2.rewardId), true);
});

test('Ledger 6: UTC date boundary calculation is deterministic and correct', () => {
  // Test right before UTC midnight: 2026-11-06 23:59:59.999Z
  const beforeMidnight = Date.UTC(2026, 10, 6, 23, 59, 59, 999);
  const dateBefore = getUtcDateString(beforeMidnight);
  assert.equal(dateBefore, '2026-11-06');
  const idBefore = generateDailyRewardId(dateBefore, 'easy_score_100');
  assert.equal(idBefore, 'challenge-reward-2026-11-06-easy_score_100');

  // Test at UTC midnight: 2026-11-07 00:00:00.000Z
  const atMidnight = Date.UTC(2026, 10, 7, 0, 0, 0, 0);
  const dateAt = getUtcDateString(atMidnight);
  assert.equal(dateAt, '2026-11-07');
  const idAt = generateDailyRewardId(dateAt, 'easy_score_100');
  assert.equal(idAt, 'challenge-reward-2026-11-07-easy_score_100');

  // Test one second after UTC midnight: 2026-11-07 00:00:01.000Z
  const afterMidnight = Date.UTC(2026, 10, 7, 0, 0, 1, 0);
  const dateAfter = getUtcDateString(afterMidnight);
  assert.equal(dateAfter, '2026-11-07');
  const idAfter = generateDailyRewardId(dateAfter, 'easy_score_100');
  assert.equal(idAfter, 'challenge-reward-2026-11-07-easy_score_100');

  assert.notEqual(idBefore, idAt);
  assert.equal(idAt, idAfter);
});

test('Ledger 7: Reward history and ledger survive save/load round-trip across app restarts', () => {
  const storage = new MemoryStorage();
  const testLedger = {
    records: [
      {
        rewardId: 'challenge-reward-2026-11-01-easy_food_15',
        utcDate: '2026-11-01',
        challengeId: 'easy_food_15',
        xpAmount: 50,
        starsAmount: 25,
        claimedAt: 1730462400000,
      },
      {
        rewardId: 'challenge-reward-2026-11-02-medium_score_200',
        utcDate: '2026-11-02',
        challengeId: 'medium_score_200',
        xpAmount: 50,
        starsAmount: 25,
        claimedAt: 1730548800000,
      },
    ],
  };

  const saved = saveDailyRewardLedger(testLedger, storage);
  assert.equal(saved, true);

  // Reload from storage
  const loaded = loadDailyRewardLedger(storage);
  assert.equal(loaded.records.length, 2);
  assert.deepEqual(loaded.records, testLedger.records);
});

test('Ledger 8: Reconciliation is idempotent and does not award duplicate XP', () => {
  const storage = new MemoryStorage();
  const rewardId1 = 'challenge-reward-2026-11-05-easy_score_100';
  const rewardId2 = 'challenge-reward-2026-11-05-medium_combo_3';

  // Suppose ledger has 2 records from completed challenges
  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId: rewardId1,
          utcDate: '2026-11-05',
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: 1730808000000,
        },
        {
          rewardId: rewardId2,
          utcDate: '2026-11-05',
          challengeId: 'medium_combo_3',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: 1730808000000,
        },
      ],
    },
    storage
  );

  // But progression state only has rewardId1 applied (crash occurred before rewardId2 applied)
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: 50,
      appliedRewardIds: [rewardId1],
    },
    storage
  );

  // Run reconciliation
  const recon1 = reconcileDailyRewards(storage);
  assert.equal(recon1.reconciledCount, 1);
  assert.deepEqual(recon1.reconciledRewardIds, [rewardId2]);
  assert.equal(recon1.progressionState.totalLifetimeXp, 100);
  assert.equal(recon1.progressionState.appliedRewardIds.includes(rewardId1), true);
  assert.equal(recon1.progressionState.appliedRewardIds.includes(rewardId2), true);

  // Run reconciliation a second time: MUST BE IDEMPOTENT
  const recon2 = reconcileDailyRewards(storage);
  assert.equal(recon2.reconciledCount, 0);
  assert.deepEqual(recon2.reconciledRewardIds, []);
  assert.equal(recon2.progressionState.totalLifetimeXp, 100, 'XP must not change on repeated reconciliation');

  // Run reconciliation a third time: still idempotent
  const recon3 = reconcileDailyRewards(storage);
  assert.equal(recon3.reconciledCount, 0);
  assert.equal(recon3.progressionState.totalLifetimeXp, 100);
});

test('Ledger 9: Incomplete challenges (progress < target) cannot receive rewards', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  // Set challenge to progress 45 / 100 (incomplete)
  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 45,
    target: 100,
    completed: false,
    rewardClaimed: false,
  };
  saveDailyChallengeState(dailyState, storage);

  // Attempt to claim incomplete challenge
  const res = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(res.success, false);
  assert.equal(res.xpEarned, 0);
  assert.equal(res.error, 'Challenge is not completed');

  // Verify no ledger entries and no XP awarded
  const ledger = loadDailyRewardLedger(storage);
  assert.equal(ledger.records.length, 0);

  const prog = loadPlayerProgression(storage);
  assert.equal(prog.totalLifetimeXp, 0);
  assert.equal(prog.appliedRewardIds.length, 0);
});

test('Ledger 10: Existing progression and lifetime XP remain intact', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  // Player already at Level 4 with 700 total lifetime XP
  savePlayerProgression(
    {
      level: 4,
      currentXp: 150, // 700 - 550 = 150
      xpForNextLevel: 400, // 4 -> 5 requires 400 XP (threshold 950)
      totalLifetimeXp: 700,
      highestLevelAchieved: 4,
      processedRunEventIds: ['run-1', 'run-2'],
      appliedRewardIds: ['old-reward-1'],
    },
    storage
  );

  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
  };
  saveDailyChallengeState(dailyState, storage);

  const res = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(res.success, true);
  assert.equal(res.xpEarned, 50);

  const updatedProg = loadPlayerProgression(storage);
  assert.equal(updatedProg.totalLifetimeXp, 750);
  assert.equal(updatedProg.level, 4);
  assert.equal(updatedProg.currentXp, 200); // 750 - 550 = 200
  assert.equal(updatedProg.xpForNextLevel, 400);
  assert.equal(updatedProg.highestLevelAchieved, 4);
  assert.deepEqual(updatedProg.processedRunEventIds, ['run-1', 'run-2']);
  assert.equal(updatedProg.appliedRewardIds.includes('old-reward-1'), true);
  assert.equal(updatedProg.appliedRewardIds.includes(res.rewardId), true);
});

test('Ledger 11: Trophy Stars behavior (25 stars) remains unchanged and separate', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardStars: 25,
    rewardClaimed: false,
  };
  dailyState.lifetimeStars = 100;
  saveDailyChallengeState(dailyState, storage);

  // Initial player progression
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: 200,
    },
    storage
  );

  // Claim
  const res = recordDailyRewardClaim('easy_score_100', date, storage, now);
  assert.equal(res.success, true);
  assert.equal(res.xpEarned, 50);

  // Daily challenge state: Trophy Stars increased by exactly 25 (from 100 to 125)
  const updatedDaily = loadDailyChallengeState(storage, now);
  assert.equal(updatedDaily.lifetimeStars, 125, 'Trophy stars must increase by exactly 25');
  assert.equal(updatedDaily.challenges[0].rewardClaimed, true);

  // Player progression: XP increased by exactly 50 (from 200 to 250)
  const updatedProg = loadPlayerProgression(storage);
  assert.equal(updatedProg.totalLifetimeXp, 250, 'XP must increase by exactly 50');

  // Verify NO star currency was added to XP and NO XP was added to stars
  assert.equal(updatedProg.totalLifetimeXp, 250);
  assert.equal(updatedDaily.lifetimeStars, 125);
});

test('Ledger 12: Corrupted, malformed, or missing ledger data recovers safely without crash', () => {
  const storage = new MemoryStorage();

  // Case A: Missing storage key
  assert.deepEqual(loadDailyRewardLedger(storage), { records: [] });
  assert.equal(reconcileDailyRewards(storage).reconciledCount, 0);

  // Case B: Corrupted JSON string
  storage.setItem(STORAGE_KEYS.DAILY_REWARD_LEDGER, '{ corrupted json :::: !!!');
  assert.deepEqual(loadDailyRewardLedger(storage), { records: [] });
  assert.equal(reconcileDailyRewards(storage).reconciledCount, 0);

  // Case C: Non-object JSON
  storage.setItem(STORAGE_KEYS.DAILY_REWARD_LEDGER, '"just a string"');
  assert.deepEqual(loadDailyRewardLedger(storage), { records: [] });

  // Case D: Object missing records array
  storage.setItem(STORAGE_KEYS.DAILY_REWARD_LEDGER, JSON.stringify({ records: 'not an array' }));
  assert.deepEqual(loadDailyRewardLedger(storage), { records: [] });

  // Case E: Array containing invalid or malformed record elements
  storage.setItem(
    STORAGE_KEYS.DAILY_REWARD_LEDGER,
    JSON.stringify({
      records: [
        null,
        42,
        {},
        { rewardId: '' }, // empty rewardId
        { rewardId: 'valid-id', utcDate: '2026-11-06', challengeId: 'ch1', xpAmount: 50, starsAmount: 25, claimedAt: Date.now() },
        { rewardId: 'valid-id' }, // duplicate id
      ],
    })
  );
  const sanitizedLedger = loadDailyRewardLedger(storage);
  assert.equal(sanitizedLedger.records.length, 1);
  assert.equal(sanitizedLedger.records[0].rewardId, 'valid-id');

  // Case F: Storage throws error on getItem
  storage.shouldThrow = true;
  assert.deepEqual(loadDailyRewardLedger(storage), { records: [] });
  assert.equal(saveDailyRewardLedger({ records: [] }, storage), false);
  storage.shouldThrow = false;
});

test('Ledger 13: appliedRewardIds is not trimmed by the rolling 100-run buffer', () => {
  const storage = new MemoryStorage();

  // Create progression state with 150 daily challenge rewards
  const initialRewards: string[] = [];
  for (let i = 1; i <= 150; i++) {
    initialRewards.push(`challenge-reward-2026-11-${String(i).padStart(3, '0')}-challenge`);
  }

  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      appliedRewardIds: initialRewards,
    },
    storage
  );

  // Now award 150 run events
  for (let i = 1; i <= 150; i++) {
    awardRunXp(
      {
        mode: 'classic',
        foodEaten: 1,
        score: 0,
        survivalSeconds: 10,
      },
      `run-event-${i}`,
      storage
    );
  }

  const finalState = loadPlayerProgression(storage);

  // Run event IDs MUST BE capped at exactly 100 entries
  assert.equal(finalState.processedRunEventIds.length, 100);
  assert.equal(finalState.processedRunEventIds.includes('run-event-1'), false);
  assert.equal(finalState.processedRunEventIds.includes('run-event-50'), false);
  assert.equal(finalState.processedRunEventIds.includes('run-event-51'), true);
  assert.equal(finalState.processedRunEventIds.includes('run-event-150'), true);

  // CRITICAL INVARIANT: appliedRewardIds MUST RETAIN ALL 150 ENTRIES (never trimmed)
  assert.equal(finalState.appliedRewardIds.length, 150);
  assert.equal(finalState.appliedRewardIds.includes('challenge-reward-2026-11-001-challenge'), true);
  assert.equal(finalState.appliedRewardIds.includes('challenge-reward-2026-11-150-challenge'), true);
});

// ============================================================================
// 7. STEP 2.1: CRASH INTERRUPTION & DUAL REWARD RECONCILIATION REGRESSION TESTS
// ============================================================================

test('Crash Interruption 1: Crash after ledger write recovers BOTH 50 XP and 25 Trophy Stars', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);
  const rewardId = generateDailyRewardId(date, 'easy_score_100');

  // Completed challenge in daily state, but reward NOT yet claimed
  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardClaimed: false,
  };
  dailyState.lifetimeStars = 50;
  saveDailyChallengeState(dailyState, storage);

  // Initial progression state (100 XP, no applied rewards)
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: 100,
      appliedRewardIds: [],
    },
    storage
  );

  // SIMULATE CRASH: Ledger was saved, but app crashed immediately before XP or Trophy Stars could be persisted
  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: date,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: now,
        },
      ],
    },
    storage
  );

  // App restarts and runs reconciliation
  const recon = reconcileDailyRewards(storage);

  // Verify XP recovered
  assert.equal(recon.reconciledCount, 1);
  assert.deepEqual(recon.reconciledRewardIds, [rewardId]);
  assert.equal(recon.progressionState.totalLifetimeXp, 150); // 100 + 50
  assert.equal(recon.progressionState.appliedRewardIds.includes(rewardId), true);

  // Verify Trophy Stars recovered
  assert.equal(recon.reconciledStarsCount, 1);
  assert.deepEqual(recon.reconciledStarsRewardIds, [rewardId]);

  const updatedDaily = loadDailyChallengeState(storage, now);
  assert.equal(updatedDaily.lifetimeStars, 75); // 50 + 25
  assert.equal(updatedDaily.challenges[0].rewardClaimed, true);
  assert.equal(updatedDaily.appliedRewardIds?.includes(rewardId), true);
});

test('Crash Interruption 2: Crash after XP write but before Trophy Stars recovers Trophy Stars without duplicate XP', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);
  const rewardId = generateDailyRewardId(date, 'easy_score_100');

  // Completed challenge in daily state, but reward NOT yet marked claimed and stars NOT credited
  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardClaimed: false,
  };
  dailyState.lifetimeStars = 100;
  dailyState.appliedRewardIds = [];
  saveDailyChallengeState(dailyState, storage);

  // Progression state: XP ALREADY APPLIED (50 XP added, rewardId recorded)
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: 300,
      appliedRewardIds: [rewardId],
    },
    storage
  );

  // Ledger record exists
  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: date,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: now,
        },
      ],
    },
    storage
  );

  // Run reconciliation
  const recon = reconcileDailyRewards(storage);

  // XP: must NOT be duplicated (0 extra XP)
  assert.equal(recon.reconciledCount, 0);
  assert.equal(recon.progressionState.totalLifetimeXp, 300, 'XP must remain 300 without duplicate award');

  // Stars: must be safely recovered (+25 stars)
  assert.equal(recon.reconciledStarsCount, 1);
  assert.deepEqual(recon.reconciledStarsRewardIds, [rewardId]);

  const updatedDaily = loadDailyChallengeState(storage, now);
  assert.equal(updatedDaily.lifetimeStars, 125, 'Trophy stars must be recovered to 125');
  assert.equal(updatedDaily.challenges[0].rewardClaimed, true);
  assert.equal(updatedDaily.appliedRewardIds?.includes(rewardId), true);
});

test('Crash Interruption 3: Crash after Trophy Stars but before XP recovers XP without duplicate Trophy Stars', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);
  const rewardId = generateDailyRewardId(date, 'easy_score_100');

  // Daily challenge state: STARS ALREADY APPLIED (25 stars added, rewardId in appliedRewardIds)
  const dailyState = createInitialDailyState(date, now);
  dailyState.challenges[0] = {
    ...dailyState.challenges[0],
    id: 'easy_score_100',
    progress: 100,
    target: 100,
    completed: true,
    rewardClaimed: true,
  };
  dailyState.lifetimeStars = 125;
  dailyState.appliedRewardIds = [rewardId];
  saveDailyChallengeState(dailyState, storage);

  // Progression state: XP NOT APPLIED (crash interrupted write)
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: 100,
      appliedRewardIds: [],
    },
    storage
  );

  // Ledger record exists
  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: date,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: now,
        },
      ],
    },
    storage
  );

  // Run reconciliation
  const recon = reconcileDailyRewards(storage);

  // XP: must be safely recovered (+50 XP)
  assert.equal(recon.reconciledCount, 1);
  assert.deepEqual(recon.reconciledRewardIds, [rewardId]);
  assert.equal(recon.progressionState.totalLifetimeXp, 150);

  // Stars: must NOT be duplicated (0 extra stars)
  assert.equal(recon.reconciledStarsCount, 0);

  const updatedDaily = loadDailyChallengeState(storage, now);
  assert.equal(updatedDaily.lifetimeStars, 125, 'Trophy stars must remain 125 without duplicate award');
});

test('Crash Interruption 4: Crash recovery across midnight date rollover preserves lifetime stars and XP', () => {
  const storage = new MemoryStorage();
  const yesterdayDate = '2026-11-05';
  const yesterdayTime = Date.UTC(2026, 10, 5, 23, 30, 0);
  const todayDate = '2026-11-06';
  const todayTime = Date.UTC(2026, 10, 6, 0, 30, 0);

  const rewardId = generateDailyRewardId(yesterdayDate, 'easy_score_100');

  // Ledger has yesterday's reward record
  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: yesterdayDate,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: yesterdayTime,
        },
      ],
    },
    storage
  );

  // Yesterday's daily state crashed before stars were credited
  const yesterdayState = createInitialDailyState(yesterdayDate, yesterdayTime);
  yesterdayState.lifetimeStars = 100;
  yesterdayState.appliedRewardIds = [];
  saveDailyChallengeState(yesterdayState, storage);

  // Player progression crashed before XP was credited
  savePlayerProgression(
    {
      ...DEFAULT_PLAYER_PROGRESSION,
      totalLifetimeXp: 200,
      appliedRewardIds: [],
    },
    storage
  );

  // App is reopened today after rollover (timestamp is todayTime)
  const todayState = loadDailyChallengeState(storage, todayTime);
  assert.equal(todayState.activeDate, todayDate);

  // Run reconciliation
  const recon = reconcileDailyRewards(storage);

  assert.equal(recon.reconciledCount, 1);
  assert.equal(recon.progressionState.totalLifetimeXp, 250); // 200 + 50 XP
  assert.equal(recon.reconciledStarsCount, 1);

  const finalDaily = loadDailyChallengeState(storage, todayTime);
  assert.equal(finalDaily.lifetimeStars, 125); // 100 + 25 Stars
  assert.equal(finalDaily.appliedRewardIds?.includes(rewardId), true);
  // Today's active challenges are fresh and uncompleted
  assert.equal(finalDaily.activeDate, todayDate);
  assert.equal(finalDaily.challenges.every(c => !c.completed), true);
});

test('Crash Interruption 5: Repeated reconciliation runs across multiple restarts remain 100% idempotent', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);
  const rewardId = generateDailyRewardId(date, 'easy_score_100');

  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: date,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: now,
        },
      ],
    },
    storage
  );

  // First reconciliation recovers everything
  const r1 = reconcileDailyRewards(storage);
  assert.equal(r1.reconciledCount, 1);
  assert.equal(r1.reconciledStarsCount, 1);
  assert.equal(r1.progressionState.totalLifetimeXp, 50);

  // 5 consecutive simulated reboots / re-reconciliations
  for (let cycle = 2; cycle <= 6; cycle++) {
    const rCycle = reconcileDailyRewards(storage);
    assert.equal(rCycle.reconciledCount, 0, `Cycle ${cycle} must not reconcile XP`);
    assert.equal(rCycle.reconciledStarsCount, 0, `Cycle ${cycle} must not reconcile Stars`);
    assert.equal(rCycle.progressionState.totalLifetimeXp, 50, `Cycle ${cycle} XP must remain 50`);

    const daily = loadDailyChallengeState(storage, now);
    assert.equal(daily.lifetimeStars, 25, `Cycle ${cycle} Stars must remain 25`);
  }
});

test('Crash Interruption 6: Malformed daily challenge storage does not crash reconciliation', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);
  const rewardId = generateDailyRewardId(date, 'easy_score_100');

  saveDailyRewardLedger(
    {
      records: [
        {
          rewardId,
          utcDate: date,
          challengeId: 'easy_score_100',
          xpAmount: 50,
          starsAmount: 25,
          claimedAt: now,
        },
      ],
    },
    storage
  );

  // Inject corrupted daily challenge state
  storage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, '{ corrupt :::: }');

  // Reconciliation should recover cleanly without throw
  const recon = reconcileDailyRewards(storage);
  assert.equal(recon.reconciledCount, 1);
  assert.equal(recon.progressionState.totalLifetimeXp, 50);

  const daily = loadDailyChallengeState(storage, now);
  assert.equal(daily.lifetimeStars, 25);
});

// ============================================================================
// 10. GAMEPLAY INTEGRATION (PHASE B · STEP 3)
// ============================================================================

test('Gameplay Integration 1: Event ID generation helpers produce consistent, clean strings', () => {
  assert.equal(createRunEventId('classic', 1700000000000), 'run-classic-1700000000000');
  assert.equal(createRunEventId('rush', 1700000000000, 'custom'), 'run-rush-1700000000000-custom');
  assert.equal(createMazeStageEventId('camp-alpha', 1, 'clear'), 'camp-alpha-stage-1-clear');
  assert.equal(createMazeStageEventId('camp-alpha', 2, 'gameover'), 'camp-alpha-stage-2-gameover');
  assert.equal(createMazeStageEventId('camp-alpha', 6, 'victory'), 'camp-alpha-victory');
});

test('Gameplay Integration 2: Classic completed run awards correct XP (126 XP example)', () => {
  const storage = new MemoryStorage();
  const startTime = 1700000000000;

  const mockState: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 8,
    bonusEaten: 1,
    score: 110,
    gameTimeMs: 32000, // 32 seconds survival
    maxCombo: 2,
    shieldsUsed: 0,
    wallsWrapped: 0,
    isAlive: false,
  };

  const result = recordGameplayRunXp(mockState, startTime, storage);
  assert.equal(result.xpEarned, 126);
  assert.equal(result.breakdown.foodXp, 80);
  assert.equal(result.breakdown.bonusFoodXp, 25);
  assert.equal(result.breakdown.scoreXp, 5);
  assert.equal(result.breakdown.survivalXp, 6);
  assert.equal(result.breakdown.comboXp, 10);
  assert.equal(result.breakdown.shieldXp, 0);
  assert.equal(result.state.totalLifetimeXp, 126);
  assert.equal(result.state.level, 2); // 126 XP reaches Level 2 (threshold: 100)
  assert.equal(result.state.currentXp, 26);
});

test('Gameplay Integration 3: Zen completed run awards wrap XP (199 XP example)', () => {
  const storage = new MemoryStorage();
  const startTime = 1700000000000;

  const mockState: GameEngineState = {
    ...createInitialState('zen'),
    foodEaten: 15,
    bonusEaten: 0,
    score: 140,
    gameTimeMs: 150000, // 150 seconds -> capped at 30 XP
    maxCombo: 1,
    wallsWrapped: 24, // 24 / 2 = 12 XP (under cap of 15)
    shieldsUsed: 0,
    isAlive: false,
  };

  const result = recordGameplayRunXp(mockState, startTime, storage);
  assert.equal(result.xpEarned, 199);
  assert.equal(result.breakdown.foodXp, 150);
  assert.equal(result.breakdown.scoreXp, 7);
  assert.equal(result.breakdown.survivalXp, 30);
  assert.equal(result.breakdown.zenWrapXp, 12);
  assert.equal(result.state.totalLifetimeXp, 199);
  assert.equal(result.state.level, 2);
  assert.equal(result.state.currentXp, 99);
});

test('Gameplay Integration 4: Rush completed run applies 1.25x multiplier after caps (445 XP example)', () => {
  const storage = new MemoryStorage();
  const startTime = 1700000000000;

  const mockState: GameEngineState = {
    ...createInitialState('rush'),
    foodEaten: 22,
    bonusEaten: 3,
    score: 340,
    gameTimeMs: 48000, // 48 seconds -> 9 XP
    maxCombo: 3, // 20 XP
    shieldsUsed: 1, // 15 XP
    isAlive: false,
  };

  // Base: 220 + 75 + 17 + 9 + 20 + 15 = 356
  // Rush: Math.floor(356 * 1.25) = 445 -> rushBonusXp = 89
  const result = recordGameplayRunXp(mockState, startTime, storage);
  assert.equal(result.xpEarned, 445);
  assert.equal(result.breakdown.rushBonusXp, 89);
  assert.equal(result.state.totalLifetimeXp, 445);
  assert.equal(result.state.level, 3); // Level 3 is 275 XP, Level 4 is 550 XP
  assert.equal(result.state.currentXp, 170); // 445 - 275 = 170
});

test('Gameplay Integration 5: Anti-exploit check awards 0 XP for 0 food and <5s survival', () => {
  const storage = new MemoryStorage();
  const startTime = 1700000000000;

  const mockState: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 0,
    bonusEaten: 0,
    score: 0,
    gameTimeMs: 3000, // 3 seconds
    maxCombo: 1,
    isAlive: false,
  };

  const result = recordGameplayRunXp(mockState, startTime, storage);
  assert.equal(result.xpEarned, 0);
  assert.equal(result.state.totalLifetimeXp, 0);
  assert.equal(result.state.level, 1);
});

test('Gameplay Integration 6: Deduplication check prevents duplicate XP on repeated event submissions', () => {
  const storage = new MemoryStorage();
  const startTime = 1700000000000;
  const eventId = 'run-classic-1700000000000';

  const mockState: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 10,
    score: 100,
    gameTimeMs: 20000,
    isAlive: false,
  };

  // First call awards XP
  const r1 = recordGameplayRunXp(mockState, startTime, storage, eventId);
  assert.ok(r1.xpEarned > 0);
  const firstTotal = r1.state.totalLifetimeXp;

  // Immediate second call with identical event ID returns 0 XP
  const r2 = recordGameplayRunXp(mockState, startTime, storage, eventId);
  assert.equal(r2.xpEarned, 0);
  assert.equal(r2.state.totalLifetimeXp, firstTotal);

  // Third call still returns 0 XP
  const r3 = recordGameplayRunXp(mockState, startTime, storage, eventId);
  assert.equal(r3.xpEarned, 0);
  assert.equal(r3.state.totalLifetimeXp, firstTotal);
});

test('Gameplay Integration 7: Two distinct completed runs award XP cleanly with separate event IDs', () => {
  const storage = new MemoryStorage();

  const state1: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 10, // 100 XP
    score: 100, // 5 XP
    gameTimeMs: 15000, // 3 XP
    maxCombo: 1,
    isAlive: false,
  };
  const r1 = recordGameplayRunXp(state1, 1000, storage, 'run-classic-1000');
  assert.equal(r1.xpEarned, 108);
  assert.equal(r1.state.totalLifetimeXp, 108);

  const state2: GameEngineState = {
    ...createInitialState('rush'),
    foodEaten: 5, // 50 XP
    score: 60, // 3 XP
    gameTimeMs: 10000, // 2 XP
    maxCombo: 1,
    isAlive: false,
  };
  // Base: 50 + 3 + 2 = 55. Rush: Math.floor(55 * 1.25) = 68
  const r2 = recordGameplayRunXp(state2, 2000, storage, 'run-rush-2000');
  assert.equal(r2.xpEarned, 68);
  assert.equal(r2.state.totalLifetimeXp, 108 + 68);
});

test('Gameplay Integration 8: stepGame increments gameTimeMs accurately by tickIntervalMs on each tick', () => {
  let state = createInitialState('classic');
  assert.equal(state.gameTimeMs, 0);

  const initialInterval = state.tickIntervalMs;
  assert.ok(initialInterval > 0);

  // Advance 5 ticks
  for (let i = 1; i <= 5; i++) {
    const res = stepGame(state, i * 150);
    state = res.state;
    assert.equal(state.gameTimeMs, i * initialInterval);
  }

  // When snake dies, subsequent stepGame calls do not advance gameTimeMs
  state = { ...state, isAlive: false };
  const stoppedTime = state.gameTimeMs;
  const noopRes = stepGame(state, 10000);
  assert.equal(noopRes.state.gameTimeMs, stoppedTime);
});

test('Gameplay Integration 9: Maze Stage 1 delta calculation and +100 Stage Clear bonus (216 XP example)', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-camp-test-1';

  // Initial stage 1 state
  const stage1Initial = createInitialMazeState(1);
  const snapshot1 = createMazeStageSnapshot(stage1Initial);

  // Cleared stage 1 state: 10 cores, score 160, survived 42s, combo 1x
  const stage1Cleared: GameEngineState = {
    ...stage1Initial,
    foodEaten: 10,
    score: 160,
    gameTimeMs: 42000,
    stageFoodEaten: 10,
    isStageClear: true,
  };

  const delta1 = calculateMazeStageDelta(stage1Cleared, snapshot1, true, false);
  assert.equal(delta1.foodEaten, 10);
  assert.equal(delta1.score, 160);
  assert.equal(delta1.survivalSeconds, 42);
  assert.equal(delta1.isStageClear, true);
  assert.equal(delta1.isCampaignComplete, false);

  // 100 (food) + 8 (score) + 8 (survival) + 100 (stage clear) = 216 XP
  const eventId = createMazeStageEventId(campaignId, 1, 'clear');
  const result = recordMazeStageXp(delta1, eventId, storage);
  assert.equal(result.xpEarned, 216);
  assert.equal(result.breakdown.foodXp, 100);
  assert.equal(result.breakdown.scoreXp, 8);
  assert.equal(result.breakdown.survivalXp, 8);
  assert.equal(result.breakdown.stageClearBonusXp, 100);
  assert.equal(result.breakdown.campaignVictoryBonusXp, 0);
  assert.equal(result.state.totalLifetimeXp, 216);
});

test('Gameplay Integration 10: Maze Stage 2 delta calculation isolates Stage 2 metrics without double-counting', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-camp-test-2';

  // Stage 1 clear awarded 216 XP
  const stage1Cleared: GameEngineState = {
    ...createInitialMazeState(1),
    foodEaten: 10,
    score: 160,
    gameTimeMs: 40000,
    stageFoodEaten: 10,
    isStageClear: true,
  };
  const snap1 = createMazeStageSnapshot(createInitialMazeState(1));
  const delta1 = calculateMazeStageDelta(stage1Cleared, snap1, true, false);
  recordMazeStageXp(delta1, createMazeStageEventId(campaignId, 1, 'clear'), storage);
  assert.equal(loadPlayerProgression(storage).totalLifetimeXp, 216);

  // Advance to Stage 2
  const progression = advanceMazeStage(stage1Cleared);
  const stage2Initial = progression.state;
  const snapshot2 = createMazeStageSnapshot(stage2Initial);

  assert.equal(snapshot2.stage, 2);
  assert.equal(snapshot2.startFood, 10);
  assert.equal(snapshot2.startScore, stage2Initial.score); // Includes ingress bonus if any
  assert.equal(snapshot2.startGameTimeMs, 40000);
  assert.equal(snapshot2.stageMaxCombo, 1);

  // In Stage 2: player eats 10 more cores (+10 food), +200 score, survives 35 more seconds (total 75000ms), 2x combo
  const stage2Cleared: GameEngineState = {
    ...stage2Initial,
    foodEaten: stage2Initial.foodEaten + 10,
    score: stage2Initial.score + 200,
    gameTimeMs: stage2Initial.gameTimeMs + 35000,
    stageFoodEaten: 10,
    stageMaxCombo: 2,
    maxCombo: 2,
    isStageClear: true,
  };

  const delta2 = calculateMazeStageDelta(stage2Cleared, snapshot2, true, false);
  // Isolated deltas:
  assert.equal(delta2.foodEaten, 10); // NOT 20!
  assert.equal(delta2.score, 200);
  assert.equal(delta2.survivalSeconds, 35); // NOT 75s!
  assert.equal(delta2.maxCombo, 2);
  assert.equal(delta2.isStageClear, true);

  // Breakdown: 100 food + 10 score (200/20) + 7 survival (35/5) + 10 combo (2x) + 100 clear bonus = 227 XP
  const result2 = recordMazeStageXp(delta2, createMazeStageEventId(campaignId, 2, 'clear'), storage);
  assert.equal(result2.xpEarned, 227);
  assert.equal(result2.state.totalLifetimeXp, 216 + 227); // Total 443 XP
});

test('Gameplay Integration 11: Maze Stage 6 final clear awards both +100 Stage Clear AND +500 Campaign Victory bonuses', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-camp-victory-test';

  const stage6Initial: GameEngineState = {
    ...createInitialMazeState(6),
    foodEaten: 50,
    score: 1200,
    gameTimeMs: 180000,
    stage: 6,
  };
  const snap6 = createMazeStageSnapshot(stage6Initial);

  // Cleared Stage 6: 10 cores, +250 score, 40s survival
  const stage6Cleared: GameEngineState = {
    ...stage6Initial,
    foodEaten: 60,
    score: 1450,
    gameTimeMs: 220000,
    stageFoodEaten: 10,
    stageMaxCombo: 1,
    isStageClear: true,
    isCampaignComplete: true,
  };

  const delta6 = calculateMazeStageDelta(stage6Cleared, snap6, true, true);
  assert.equal(delta6.foodEaten, 10);
  assert.equal(delta6.score, 250);
  assert.equal(delta6.survivalSeconds, 40);
  assert.equal(delta6.isStageClear, true);
  assert.equal(delta6.isCampaignComplete, true);

  // Food: 100, Score: 12 (250/20), Survival: 8 (40/5), StageClear: 100, CampaignVictory: 500 = 720 XP
  const eventId = createMazeStageEventId(campaignId, 6, 'victory');
  const result = recordMazeStageXp(delta6, eventId, storage);
  assert.equal(result.breakdown.foodXp, 100);
  assert.equal(result.breakdown.scoreXp, 12);
  assert.equal(result.breakdown.survivalXp, 8);
  assert.equal(result.breakdown.stageClearBonusXp, 100);
  assert.equal(result.breakdown.campaignVictoryBonusXp, 500);
  assert.equal(result.xpEarned, 720);
});

test('Gameplay Integration 12: Failed Maze stage awards stage performance XP but ZERO clear bonus', () => {
  const storage = new MemoryStorage();
  const campaignId = 'maze-camp-fail-test';

  const stage3Initial: GameEngineState = {
    ...createInitialMazeState(3),
    foodEaten: 20,
    score: 400,
    gameTimeMs: 60000,
    stage: 3,
  };
  const snap3 = createMazeStageSnapshot(stage3Initial);

  // Died in Stage 3 after eating 4 cores, +80 score, survived 25s
  const stage3Failed: GameEngineState = {
    ...stage3Initial,
    foodEaten: 24,
    score: 480,
    gameTimeMs: 85000,
    stageFoodEaten: 4,
    stageMaxCombo: 1,
    isAlive: false,
    deathReason: 'wall',
  };

  const delta = calculateMazeStageDelta(stage3Failed, snap3, false, false);
  assert.equal(delta.foodEaten, 4);
  assert.equal(delta.score, 80);
  assert.equal(delta.survivalSeconds, 25);
  assert.equal(delta.isStageClear, false);
  assert.equal(delta.isCampaignComplete, false);

  // 40 (food) + 4 (score) + 5 (survival) = 49 XP (0 Stage Clear bonus)
  const eventId = createMazeStageEventId(campaignId, 3, 'gameover');
  const result = recordMazeStageXp(delta, eventId, storage);
  assert.equal(result.xpEarned, 49);
  assert.equal(result.breakdown.stageClearBonusXp, 0);
  assert.equal(result.breakdown.campaignVictoryBonusXp, 0);
  assert.equal(result.state.totalLifetimeXp, 49);
});

test('Gameplay Integration 13: stageMaxCombo resets cleanly per stage while maxCombo stays campaign-wide', () => {
  const stage1State = createInitialMazeState(1);
  assert.equal(stage1State.maxCombo, 1);
  assert.equal(stage1State.stageMaxCombo, 1);

  // Simulate Stage 1 reaching 3x combo
  const stage1WithCombo: GameEngineState = {
    ...stage1State,
    maxCombo: 3,
    stageMaxCombo: 3,
  };

  // Advance to Stage 2
  const { state: stage2State } = advanceMazeStage(stage1WithCombo);
  // Campaign-wide maxCombo is preserved
  assert.equal(stage2State.maxCombo, 3);
  // Stage-specific stageMaxCombo is reset to 1
  assert.equal(stage2State.stageMaxCombo, 1);

  // Snapshot captures stageMaxCombo = 1
  const snap = createMazeStageSnapshot(stage2State);
  assert.equal(snap.stageMaxCombo, 1);

  // If Stage 2 finishes with stageMaxCombo = 1, delta gets 0 combo XP
  const delta = calculateMazeStageDelta(stage2State, snap, true, false);
  assert.equal(delta.maxCombo, 1);
  const breakdown = calculateRunXp(delta);
  assert.equal(breakdown.comboXp, 0);
});

test('Gameplay Integration 14: Level 50 permanent cap is strictly maintained across gameplay XP awards', () => {
  const storage = new MemoryStorage();

  // Set player near Level 50 cap (143,650 XP, only 50 XP to cap 143,700)
  savePlayerProgression(
    {
      level: 49,
      currentXp: 5350,
      xpForNextLevel: 5400,
      totalLifetimeXp: 143650,
      highestLevelAchieved: 49,
      processedRunEventIds: [],
      appliedRewardIds: [],
    },
    storage
  );

  const mockRun: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 20, // 200 XP
    score: 400,
    gameTimeMs: 60000,
    isAlive: false,
  };

  const result = recordGameplayRunXp(mockRun, 1700000000000, storage, 'run-cap-test');
  assert.equal(result.xpEarned, 232);
  assert.equal(result.state.totalLifetimeXp, 143650 + 232);
  assert.equal(result.state.level, 50);
  assert.equal(result.state.currentXp, 0);
  assert.equal(result.state.xpForNextLevel, 0);
  assert.equal(result.isMaxLevel, true);
});

test('Gameplay Integration 15: Corrupt storage recovery during gameplay XP award', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.PLAYER_PROGRESSION, '{ invalid json @@');

  const mockRun: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 5,
    score: 50,
    gameTimeMs: 15000,
    isAlive: false,
  };

  // Should not throw, should fall back to default and award XP
  const result = recordGameplayRunXp(mockRun, 1700000000000, storage, 'run-corrupt-test');
  assert.ok(result.xpEarned > 0);
  assert.equal(result.levelBefore, 1);
  assert.ok(result.state.totalLifetimeXp > 0);
});

