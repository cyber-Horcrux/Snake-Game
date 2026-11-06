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
  getCumulativeXpForLevel,
  getLevelTitle,
  loadPlayerProgression,
  resetPlayerProgression,
  sanitizeNonNegativeInt,
  sanitizePlayerProgression,
  savePlayerProgression,
} from './levels.ts';

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
