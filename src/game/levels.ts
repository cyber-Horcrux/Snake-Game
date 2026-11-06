/**
 * Player Levels & XP Progression Engine
 * Pure, persistent, and validated against corrupted storage.
 * 
 * Target audience: Children & Teenagers
 * Design: Simple vocabulary, fair progression, no grinding walls, permanent Level 50 cap.
 */

import type {
  DailyRewardClaimResult,
  DailyRewardLedger,
  DailyRewardReconciliationResult,
  DailyRewardRecord,
  GameEngineState,
  GameMode,
  MazeStageSnapshot,
  PlayerProgressionState,
  RunXpInput,
  XpBreakdown,
  XpEarnResult,
} from './types.ts';
import {
  LEVEL_TITLES,
  MAX_PLAYER_LEVEL,
  MAX_PROCESSED_RUN_EVENTS,
  STORAGE_KEYS,
  XP_REWARDS,
} from './constants.ts';
import type { StorageLike } from './persistence.ts';
import {
  getUtcDateString,
  loadDailyChallengeState,
  saveDailyChallengeState,
  REWARD_STARS,
} from './challenges.ts';

// Precomputed cumulative XP thresholds for Levels 1 through 10
export const CUMULATIVE_THRESHOLDS_1_TO_10: readonly number[] = [
  0,     // Level 1: 0
  100,   // Level 2: 100 (delta: 100)
  275,   // Level 3: 275 (delta: 175)
  550,   // Level 4: 550 (delta: 275)
  950,   // Level 5: 950 (delta: 400)
  1500,  // Level 6: 1500 (delta: 550)
  2225,  // Level 7: 2225 (delta: 725)
  3150,  // Level 8: 3150 (delta: 925)
  4300,  // Level 9: 4300 (delta: 1150)
  5700,  // Level 10: 5700 (delta: 1400)
] as const;

// Transition deltas (XP needed to advance to next level) for Levels 1 through 9
export const TRANSITION_DELTAS_1_TO_9: readonly number[] = [
  100,  // 1 -> 2
  175,  // 2 -> 3
  275,  // 3 -> 4
  400,  // 4 -> 5
  550,  // 5 -> 6
  725,  // 6 -> 7
  925,  // 7 -> 8
  1150, // 8 -> 9
  1400, // 9 -> 10
] as const;

// Cumulative XP required to reach the permanent maximum Level 50 cap
export const LEVEL_50_CUMULATIVE_XP = 143700;

export const DEFAULT_PLAYER_PROGRESSION: PlayerProgressionState = {
  level: 1,
  currentXp: 0,
  xpForNextLevel: 100,
  totalLifetimeXp: 0,
  highestLevelAchieved: 1,
  processedRunEventIds: [],
  appliedRewardIds: [],
};

export const EMPTY_XP_BREAKDOWN: XpBreakdown = {
  foodXp: 0,
  bonusFoodXp: 0,
  scoreXp: 0,
  survivalXp: 0,
  comboXp: 0,
  shieldXp: 0,
  zenWrapXp: 0,
  rushBonusXp: 0,
  stageClearBonusXp: 0,
  campaignVictoryBonusXp: 0,
  totalXp: 0,
};

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test_levels__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage restricted
  }
  return null;
}

export function sanitizeNonNegativeInt(val: unknown, fallback: number = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
    return fallback;
  }
  return Math.max(0, Math.floor(val));
}

/**
 * Calculates XP required to advance from `level` to `level + 1`.
 * For level >= 50, returns 0.
 */
export function calculateXpForNextLevel(level: number): number {
  const sanitizedLevel = Math.max(1, Math.floor(level));
  if (sanitizedLevel >= MAX_PLAYER_LEVEL) {
    return 0;
  }
  if (sanitizedLevel >= 1 && sanitizedLevel <= 9) {
    return TRANSITION_DELTAS_1_TO_9[sanitizedLevel - 1];
  }
  // Levels 10 to 49: 1500 + 100 * (L - 10)
  return 1500 + 100 * (sanitizedLevel - 10);
}

/**
 * Returns cumulative total lifetime XP required to reach `level`.
 * Validated against formula: T(N) = 5700 + 1500 * (N - 10) + 50 * (N - 10) * (N - 11)
 */
export function getCumulativeXpForLevel(level: number): number {
  const sanitizedLevel = Math.max(1, Math.floor(level));
  if (sanitizedLevel <= 1) {
    return 0;
  }
  if (sanitizedLevel <= 10) {
    return CUMULATIVE_THRESHOLDS_1_TO_10[sanitizedLevel - 1];
  }
  if (sanitizedLevel >= MAX_PLAYER_LEVEL) {
    return LEVEL_50_CUMULATIVE_XP;
  }
  const nMinus10 = sanitizedLevel - 10;
  return 5700 + 1500 * nMinus10 + 50 * nMinus10 * (nMinus10 - 1);
}

/**
 * Derives player level, current level XP progress, and transition XP
 * purely from authoritative `totalLifetimeXp`.
 */
export function calculateLevelFromLifetimeXp(totalLifetimeXp: number): {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
} {
  const sanitizedXp = sanitizeNonNegativeInt(totalLifetimeXp, 0);

  if (sanitizedXp >= LEVEL_50_CUMULATIVE_XP) {
    return {
      level: MAX_PLAYER_LEVEL,
      currentXp: 0,
      xpForNextLevel: 0,
    };
  }

  // Check Levels 1 to 9
  for (let l = 1; l <= 9; l++) {
    const nextThreshold = CUMULATIVE_THRESHOLDS_1_TO_10[l]; // threshold for level l + 1
    if (sanitizedXp < nextThreshold) {
      const currentThreshold = CUMULATIVE_THRESHOLDS_1_TO_10[l - 1];
      return {
        level: l,
        currentXp: sanitizedXp - currentThreshold,
        xpForNextLevel: TRANSITION_DELTAS_1_TO_9[l - 1],
      };
    }
  }

  // Levels 10 to 49
  for (let l = 10; l <= 49; l++) {
    const nextThreshold = getCumulativeXpForLevel(l + 1);
    if (sanitizedXp < nextThreshold) {
      const currentThreshold = getCumulativeXpForLevel(l);
      return {
        level: l,
        currentXp: sanitizedXp - currentThreshold,
        xpForNextLevel: calculateXpForNextLevel(l),
      };
    }
  }

  return {
    level: MAX_PLAYER_LEVEL,
    currentXp: 0,
    xpForNextLevel: 0,
  };
}

/**
 * Returns a kid-friendly title/rank for the given level.
 */
export function getLevelTitle(level: number): string {
  const sanitized = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level)));
  if (LEVEL_TITLES[sanitized]) {
    return LEVEL_TITLES[sanitized];
  }
  // Fallback to highest milestone achieved
  const milestoneLevels = [50, 40, 30, 25, 20, 15, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  for (const milestone of milestoneLevels) {
    if (sanitized >= milestone && LEVEL_TITLES[milestone]) {
      return LEVEL_TITLES[milestone];
    }
  }
  return 'Neon Scout';
}

/**
 * Calculates XP earned from a completed run or stage attempt.
 * Pure function with no side effects.
 */
export function calculateRunXp(input: RunXpInput): XpBreakdown {
  const foodEaten = sanitizeNonNegativeInt(input.foodEaten, 0);
  const bonusEaten = sanitizeNonNegativeInt(input.bonusEaten, 0);
  const score = sanitizeNonNegativeInt(input.score, 0);
  const survivalSeconds = sanitizeNonNegativeInt(input.survivalSeconds, 0);
  const maxCombo = sanitizeNonNegativeInt(input.maxCombo, 1);
  const shieldsUsed = sanitizeNonNegativeInt(input.shieldsUsed, 0);
  const wallsWrapped = sanitizeNonNegativeInt(input.wallsWrapped, 0);
  const isStageClear = Boolean(input.isStageClear);
  const isCampaignComplete = Boolean(input.isCampaignComplete);
  const mode = input.mode;

  // Anti-exploit rule: Zero food consumed and under 5 seconds survival = 0 XP
  if (foodEaten + bonusEaten === 0 && survivalSeconds < XP_REWARDS.ANTI_EXPLOIT_MIN_SURVIVAL_SECONDS) {
    return { ...EMPTY_XP_BREAKDOWN };
  }

  // 1. Core food components
  const foodXp = foodEaten * XP_REWARDS.NORMAL_FOOD;
  const bonusFoodXp = bonusEaten * XP_REWARDS.BONUS_FOOD;

  // 2. Score contribution: Math.floor(score / 20)
  const scoreXp = Math.floor(score / XP_REWARDS.SCORE_DIVISOR);

  // 3. Survival time: Math.min(30, Math.floor(survivalSeconds / 5))
  const survivalXp = Math.min(
    XP_REWARDS.SURVIVAL_CAP,
    Math.floor(survivalSeconds / XP_REWARDS.SURVIVAL_INTERVAL_SECONDS)
  );

  // 4. Highest Combo achieved during run:
  // 1x = 0, 2x = 10, 3x = 20, 4x or higher = 30
  let comboXp = 0;
  if (maxCombo >= 4) {
    comboXp = XP_REWARDS.COMBO_4X_PLUS;
  } else if (maxCombo === 3) {
    comboXp = XP_REWARDS.COMBO_3X;
  } else if (maxCombo === 2) {
    comboXp = XP_REWARDS.COMBO_2X;
  }

  // 5. Shield absorption: Math.min(45, shieldsUsed * 15)
  const shieldXp = Math.min(
    XP_REWARDS.SHIELD_CAP,
    shieldsUsed * XP_REWARDS.SHIELD_SAVE
  );

  // 6. Zen wraps (Zen mode only): Math.min(15, Math.floor(wallsWrapped / 2))
  let zenWrapXp = 0;
  if (mode === 'zen') {
    zenWrapXp = Math.min(
      XP_REWARDS.ZEN_WRAP_CAP,
      Math.floor(wallsWrapped / XP_REWARDS.ZEN_WRAP_DIVISOR)
    );
  }

  // Base gameplay subtotal
  const baseSubtotal = foodXp + bonusFoodXp + scoreXp + survivalXp + comboXp + shieldXp + zenWrapXp;

  // 7. Rush Mode Multiplier (1.25x applied to base gameplay subtotal)
  let rushBonusXp = 0;
  if (mode === 'rush') {
    const rushTotal = Math.floor(baseSubtotal * XP_REWARDS.RUSH_MULTIPLIER);
    rushBonusXp = rushTotal - baseSubtotal;
  }

  // 8. Maze stage and campaign clear bonuses (separate and additive)
  const stageClearBonusXp = isStageClear ? XP_REWARDS.MAZE_STAGE_CLEAR : 0;
  const campaignVictoryBonusXp = isCampaignComplete ? XP_REWARDS.MAZE_CAMPAIGN_VICTORY : 0;

  const totalXp = baseSubtotal + rushBonusXp + stageClearBonusXp + campaignVictoryBonusXp;

  return {
    foodXp,
    bonusFoodXp,
    scoreXp,
    survivalXp,
    comboXp,
    shieldXp,
    zenWrapXp,
    rushBonusXp,
    stageClearBonusXp,
    campaignVictoryBonusXp,
    totalXp,
  };
}

/**
 * Returns a clean copy of default progression state.
 */
export function createDefaultPlayerProgression(): PlayerProgressionState {
  return {
    level: DEFAULT_PLAYER_PROGRESSION.level,
    currentXp: DEFAULT_PLAYER_PROGRESSION.currentXp,
    xpForNextLevel: DEFAULT_PLAYER_PROGRESSION.xpForNextLevel,
    totalLifetimeXp: DEFAULT_PLAYER_PROGRESSION.totalLifetimeXp,
    highestLevelAchieved: DEFAULT_PLAYER_PROGRESSION.highestLevelAchieved,
    processedRunEventIds: [...DEFAULT_PLAYER_PROGRESSION.processedRunEventIds],
    appliedRewardIds: [...DEFAULT_PLAYER_PROGRESSION.appliedRewardIds],
  };
}

/**
 * Sanitizes and repairs player progression from any raw object or corrupted data.
 * Authoritative source of truth is `totalLifetimeXp`.
 */
export function sanitizePlayerProgression(raw: unknown): PlayerProgressionState {
  if (typeof raw !== 'object' || raw === null) {
    return createDefaultPlayerProgression();
  }

  const parsed = raw as Record<string, unknown>;
  const totalLifetimeXp = sanitizeNonNegativeInt(parsed.totalLifetimeXp, 0);
  const derived = calculateLevelFromLifetimeXp(totalLifetimeXp);

  const rawHighest = sanitizeNonNegativeInt(parsed.highestLevelAchieved, derived.level);
  const highestLevelAchieved = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.max(rawHighest, derived.level)));

  // Sanitize event collections
  const processedRunEventIds = Array.isArray(parsed.processedRunEventIds)
    ? parsed.processedRunEventIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .slice(-MAX_PROCESSED_RUN_EVENTS)
    : [];

  const appliedRewardIds = Array.isArray(parsed.appliedRewardIds)
    ? parsed.appliedRewardIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];

  return {
    level: derived.level,
    currentXp: derived.currentXp,
    xpForNextLevel: derived.xpForNextLevel,
    totalLifetimeXp,
    highestLevelAchieved,
    processedRunEventIds,
    appliedRewardIds,
  };
}

/**
 * Loads player progression state from persistent storage.
 */
export function loadPlayerProgression(
  storage: StorageLike | null = getBrowserStorage()
): PlayerProgressionState {
  if (!storage) {
    return createDefaultPlayerProgression();
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.PLAYER_PROGRESSION) || storage.getItem('neonsnake_player_progression');
    if (!raw) {
      return createDefaultPlayerProgression();
    }
    const parsed = JSON.parse(raw);
    return sanitizePlayerProgression(parsed);
  } catch {
    return createDefaultPlayerProgression();
  }
}

/**
 * Persists player progression state to storage.
 */
export function savePlayerProgression(
  state: PlayerProgressionState,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    const sanitized = sanitizePlayerProgression(state);
    storage.setItem(STORAGE_KEYS.PLAYER_PROGRESSION, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

/**
 * Resets player progression state back to default Level 1 with 0 XP.
 */
export function resetPlayerProgression(
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    const defaultState = createDefaultPlayerProgression();
    storage.setItem(STORAGE_KEYS.PLAYER_PROGRESSION, JSON.stringify(defaultState));
    return true;
  } catch {
    return false;
  }
}

/**
 * Awards XP from a completed gameplay run using a unique event ID.
 * Protects against duplicate event submission and multi-level progression overflow.
 */
export function awardRunXp(
  input: RunXpInput,
  eventId?: string,
  storage: StorageLike | null = getBrowserStorage()
): XpEarnResult {
  const currentState = loadPlayerProgression(storage);
  const trimmedEventId = typeof eventId === 'string' ? eventId.trim() : '';

  // Duplicate protection check
  if (trimmedEventId && currentState.processedRunEventIds.includes(trimmedEventId)) {
    return {
      xpEarned: 0,
      levelBefore: currentState.level,
      levelAfter: currentState.level,
      levelsGained: 0,
      isMaxLevel: currentState.level >= MAX_PLAYER_LEVEL,
      state: currentState,
      breakdown: { ...EMPTY_XP_BREAKDOWN },
    };
  }

  const breakdown = calculateRunXp(input);
  const xpEarned = breakdown.totalXp;
  const levelBefore = currentState.level;

  let updatedEventIds = currentState.processedRunEventIds;
  if (trimmedEventId) {
    updatedEventIds = [...currentState.processedRunEventIds.slice(-(MAX_PROCESSED_RUN_EVENTS - 1)), trimmedEventId];
  }

  if (xpEarned === 0) {
    const updatedState: PlayerProgressionState = {
      ...currentState,
      processedRunEventIds: updatedEventIds,
    };
    savePlayerProgression(updatedState, storage);
    return {
      xpEarned: 0,
      levelBefore,
      levelAfter: levelBefore,
      levelsGained: 0,
      isMaxLevel: levelBefore >= MAX_PLAYER_LEVEL,
      state: updatedState,
      breakdown,
    };
  }

  const newTotalLifetimeXp = currentState.totalLifetimeXp + xpEarned;
  const derived = calculateLevelFromLifetimeXp(newTotalLifetimeXp);
  const newHighest = Math.max(currentState.highestLevelAchieved, derived.level);

  const updatedState: PlayerProgressionState = {
    level: derived.level,
    currentXp: derived.currentXp,
    xpForNextLevel: derived.xpForNextLevel,
    totalLifetimeXp: newTotalLifetimeXp,
    highestLevelAchieved: newHighest,
    processedRunEventIds: updatedEventIds,
    appliedRewardIds: currentState.appliedRewardIds,
  };

  savePlayerProgression(updatedState, storage);

  return {
    xpEarned,
    levelBefore,
    levelAfter: derived.level,
    levelsGained: Math.max(0, derived.level - levelBefore),
    isMaxLevel: derived.level >= MAX_PLAYER_LEVEL,
    state: updatedState,
    breakdown,
  };
}

/**
 * Generates a stable, unique event ID for a standard run (Classic, Zen, Rush).
 */
export function createRunEventId(
  mode: GameMode,
  startTime: number,
  seed?: string
): string {
  const sanitizedMode = mode || 'classic';
  const sanitizedTime = sanitizeNonNegativeInt(startTime, 0);
  if (seed && typeof seed === 'string' && seed.trim().length > 0) {
    return `run-${sanitizedMode}-${sanitizedTime}-${seed.trim()}`;
  }
  return `run-${sanitizedMode}-${sanitizedTime}`;
}

/**
 * Generates a stable, unique event ID for a Maze stage completion or failure.
 */
export function createMazeStageEventId(
  campaignId: string,
  stage: number,
  outcome: 'clear' | 'victory' | 'gameover'
): string {
  const cleanCampaignId =
    typeof campaignId === 'string' && campaignId.trim().length > 0
      ? campaignId.trim()
      : `maze-campaign-${Date.now()}`;
  const cleanStage = Math.max(1, Math.min(6, Math.floor(stage)));

  if (outcome === 'victory') {
    return `${cleanCampaignId}-victory`;
  }
  return `${cleanCampaignId}-stage-${cleanStage}-${outcome}`;
}

/**
 * Creates an immutable snapshot of gameplay metrics at the start of a Maze stage.
 */
export function createMazeStageSnapshot(state: GameEngineState): MazeStageSnapshot {
  return {
    stage: state.stage || 1,
    startFood: state.foodEaten || 0,
    startBonusFood: state.bonusEaten || 0,
    startScore: state.score || 0,
    startGameTimeMs: state.gameTimeMs || 0,
    startShields: state.shieldsUsed || 0,
    startWallsWrapped: state.wallsWrapped || 0,
    stageMaxCombo: state.stageMaxCombo || 1,
  };
}

/**
 * Calculates isolated stage-specific deltas between the current Maze state and the stage start snapshot.
 */
export function calculateMazeStageDelta(
  currentState: GameEngineState,
  snapshot: MazeStageSnapshot,
  isStageClear: boolean = false,
  isCampaignComplete: boolean = false
): RunXpInput {
  const deltaFood = Math.max(0, (currentState.foodEaten || 0) - (snapshot.startFood || 0));
  const deltaBonus = Math.max(0, (currentState.bonusEaten || 0) - (snapshot.startBonusFood || 0));
  const deltaScore = Math.max(0, (currentState.score || 0) - (snapshot.startScore || 0));
  const deltaMs = Math.max(0, (currentState.gameTimeMs || 0) - (snapshot.startGameTimeMs || 0));
  const survivalSeconds = Math.floor(deltaMs / 1000);
  const deltaShields = Math.max(0, (currentState.shieldsUsed || 0) - (snapshot.startShields || 0));
  const deltaWalls = Math.max(0, (currentState.wallsWrapped || 0) - (snapshot.startWallsWrapped || 0));
  const stageMaxCombo = currentState.stageMaxCombo || 1;

  return {
    mode: 'maze',
    foodEaten: deltaFood,
    bonusEaten: deltaBonus,
    score: deltaScore,
    survivalSeconds,
    maxCombo: stageMaxCombo,
    shieldsUsed: deltaShields,
    wallsWrapped: deltaWalls,
    isStageClear,
    isCampaignComplete,
  };
}

/**
 * Records XP earned from a completed standard run (Classic, Zen, Rush) based on simulation time.
 */
export function recordGameplayRunXp(
  finalState: GameEngineState,
  runStartTime: number,
  storage: StorageLike | null = getBrowserStorage(),
  eventId?: string
): XpEarnResult {
  const survivalSeconds = Math.floor((finalState.gameTimeMs || 0) / 1000);
  const resolvedEventId = eventId || createRunEventId(finalState.mode, runStartTime);

  const input: RunXpInput = {
    mode: finalState.mode,
    foodEaten: finalState.foodEaten || 0,
    bonusEaten: finalState.bonusEaten || 0,
    score: finalState.score || 0,
    survivalSeconds,
    maxCombo: finalState.maxCombo || 1,
    shieldsUsed: finalState.shieldsUsed || 0,
    wallsWrapped: finalState.wallsWrapped || 0,
    isStageClear: Boolean(finalState.isStageClear),
    isCampaignComplete: Boolean(finalState.isCampaignComplete),
  };

  return awardRunXp(input, resolvedEventId, storage);
}

/**
 * Records isolated XP earned from a Maze stage clear, victory, or game over.
 */
export function recordMazeStageXp(
  stageDelta: RunXpInput,
  eventId: string,
  storage: StorageLike | null = getBrowserStorage()
): XpEarnResult {
  return awardRunXp(stageDelta, eventId, storage);
}

/**
 * Awards direct XP (such as from Daily Challenges) with permanent deduplication
 * via `appliedRewardIds`. Daily challenge IDs are not subject to rolling buffer eviction.
 */
export function awardCustomXp(
  xpAmount: number,
  rewardId?: string,
  storage: StorageLike | null = getBrowserStorage(),
  isDailyReward: boolean = false
): XpEarnResult {
  const currentState = loadPlayerProgression(storage);
  const trimmedId = typeof rewardId === 'string' ? rewardId.trim() : '';

  // Check deduplication
  if (trimmedId) {
    if (isDailyReward && currentState.appliedRewardIds.includes(trimmedId)) {
      return {
        xpEarned: 0,
        levelBefore: currentState.level,
        levelAfter: currentState.level,
        levelsGained: 0,
        isMaxLevel: currentState.level >= MAX_PLAYER_LEVEL,
        state: currentState,
        breakdown: { ...EMPTY_XP_BREAKDOWN },
      };
    }
    if (!isDailyReward && currentState.processedRunEventIds.includes(trimmedId)) {
      return {
        xpEarned: 0,
        levelBefore: currentState.level,
        levelAfter: currentState.level,
        levelsGained: 0,
        isMaxLevel: currentState.level >= MAX_PLAYER_LEVEL,
        state: currentState,
        breakdown: { ...EMPTY_XP_BREAKDOWN },
      };
    }
  }

  const sanitizedXp = sanitizeNonNegativeInt(xpAmount, 0);
  const levelBefore = currentState.level;

  let updatedRunIds = currentState.processedRunEventIds;
  let updatedRewardIds = currentState.appliedRewardIds;

  if (trimmedId) {
    if (isDailyReward) {
      updatedRewardIds = [...currentState.appliedRewardIds, trimmedId];
    } else {
      updatedRunIds = [...currentState.processedRunEventIds.slice(-(MAX_PROCESSED_RUN_EVENTS - 1)), trimmedId];
    }
  }

  if (sanitizedXp === 0) {
    const updatedState: PlayerProgressionState = {
      ...currentState,
      processedRunEventIds: updatedRunIds,
      appliedRewardIds: updatedRewardIds,
    };
    savePlayerProgression(updatedState, storage);
    return {
      xpEarned: 0,
      levelBefore,
      levelAfter: levelBefore,
      levelsGained: 0,
      isMaxLevel: levelBefore >= MAX_PLAYER_LEVEL,
      state: updatedState,
      breakdown: { ...EMPTY_XP_BREAKDOWN },
    };
  }

  const newTotalLifetimeXp = currentState.totalLifetimeXp + sanitizedXp;
  const derived = calculateLevelFromLifetimeXp(newTotalLifetimeXp);
  const newHighest = Math.max(currentState.highestLevelAchieved, derived.level);

  const updatedState: PlayerProgressionState = {
    level: derived.level,
    currentXp: derived.currentXp,
    xpForNextLevel: derived.xpForNextLevel,
    totalLifetimeXp: newTotalLifetimeXp,
    highestLevelAchieved: newHighest,
    processedRunEventIds: updatedRunIds,
    appliedRewardIds: updatedRewardIds,
  };

  savePlayerProgression(updatedState, storage);

  return {
    xpEarned: sanitizedXp,
    levelBefore,
    levelAfter: derived.level,
    levelsGained: Math.max(0, derived.level - levelBefore),
    isMaxLevel: derived.level >= MAX_PLAYER_LEVEL,
    state: updatedState,
    breakdown: {
      ...EMPTY_XP_BREAKDOWN,
      totalXp: sanitizedXp,
    },
  };
}

// ==========================================
// Daily Challenge XP Reward Ledger & Reconciliation
// ==========================================

/**
 * Generates a deterministic daily challenge reward ID based on UTC date and challenge ID.
 * Format: challenge-reward-${utcDate}-${challengeId}
 */
export function generateDailyRewardId(utcDate: string, challengeId: string): string {
  const sanitizedDate = typeof utcDate === 'string' ? utcDate.trim() : '';
  const sanitizedId = typeof challengeId === 'string' ? challengeId.trim() : '';
  return `challenge-reward-${sanitizedDate}-${sanitizedId}`;
}

/**
 * Loads the Daily Reward Ledger from storage.
 * Gracefully handles missing, corrupted, or malformed data by returning empty records array.
 */
export function loadDailyRewardLedger(
  storage: StorageLike | null = getBrowserStorage()
): DailyRewardLedger {
  if (!storage) {
    return { records: [] };
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.DAILY_REWARD_LEDGER);
    if (!raw) {
      return { records: [] };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
      return { records: [] };
    }

    const seenIds = new Set<string>();
    const validRecords: DailyRewardRecord[] = [];

    for (const r of parsed.records) {
      if (
        r &&
        typeof r.rewardId === 'string' &&
        r.rewardId.trim().length > 0 &&
        typeof r.utcDate === 'string' &&
        typeof r.challengeId === 'string' &&
        typeof r.xpAmount === 'number' &&
        Number.isFinite(r.xpAmount) &&
        typeof r.starsAmount === 'number' &&
        Number.isFinite(r.starsAmount) &&
        typeof r.claimedAt === 'number' &&
        Number.isFinite(r.claimedAt)
      ) {
        const trimmedRewardId = r.rewardId.trim();
        if (!seenIds.has(trimmedRewardId)) {
          seenIds.add(trimmedRewardId);
          validRecords.push({
            rewardId: trimmedRewardId,
            utcDate: r.utcDate.trim(),
            challengeId: r.challengeId.trim(),
            xpAmount: sanitizeNonNegativeInt(r.xpAmount, XP_REWARDS.DAILY_CHALLENGE_COMPLETION),
            starsAmount: sanitizeNonNegativeInt(r.starsAmount, 25),
            claimedAt: r.claimedAt,
          });
        }
      }
    }

    return { records: validRecords };
  } catch {
    return { records: [] };
  }
}

/**
 * Persists the Daily Reward Ledger to storage.
 */
export function saveDailyRewardLedger(
  ledger: DailyRewardLedger,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    const sanitizedRecords = Array.isArray(ledger?.records)
      ? ledger.records.filter(r => r && typeof r.rewardId === 'string' && r.rewardId.trim().length > 0)
      : [];
    storage.setItem(STORAGE_KEYS.DAILY_REWARD_LEDGER, JSON.stringify({ records: sanitizedRecords }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears the Daily Reward Ledger in storage.
 */
export function resetDailyRewardLedger(
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.removeItem(STORAGE_KEYS.DAILY_REWARD_LEDGER);
    return true;
  } catch {
    return false;
  }
}

/**
 * Claims a completed daily challenge reward, enforcing exactly-once 50 XP and 25 Trophy Stars.
 * Protocol:
 * 1. Checks if already recorded in the ledger or progression appliedRewardIds.
 * 2. Checks that challenge is completed (progress >= target || completed === true).
 * 3. Records entry in Daily Reward Ledger.
 * 4. Applies 50 XP to PlayerProgressionState.appliedRewardIds.
 * 5. Applies 25 Trophy Stars and marks rewardClaimed: true in DailyChallengeUserState.
 */
export function recordDailyRewardClaim(
  challengeId: string,
  utcDate?: string,
  storage: StorageLike | null = getBrowserStorage(),
  timestamp?: number
): DailyRewardClaimResult {
  const effectiveTimestamp = timestamp ?? Date.now();
  const effectiveUtcDate = typeof utcDate === 'string' && utcDate.trim().length > 0
    ? utcDate.trim()
    : getUtcDateString(effectiveTimestamp);

  const sanitizedChallengeId = typeof challengeId === 'string' ? challengeId.trim() : '';
  const currentProgression = loadPlayerProgression(storage);

  if (!sanitizedChallengeId) {
    return {
      success: false,
      rewardId: '',
      xpEarned: 0,
      alreadyClaimed: false,
      error: 'Invalid challenge ID',
      progressionState: currentProgression,
    };
  }

  const rewardId = generateDailyRewardId(effectiveUtcDate, sanitizedChallengeId);

  // 1. Check if already recorded in the ledger or progression state
  const ledger = loadDailyRewardLedger(storage);
  const alreadyInLedger = ledger.records.some(r => r.rewardId === rewardId);
  const alreadyInProgression = currentProgression.appliedRewardIds.includes(rewardId);

  if (alreadyInLedger || alreadyInProgression) {
    return {
      success: false,
      rewardId,
      xpEarned: 0,
      alreadyClaimed: true,
      error: 'Reward already claimed',
      progressionState: currentProgression,
    };
  }

  // 2. Incomplete challenges (progress < target) cannot receive rewards
  const dailyState = loadDailyChallengeState(storage, effectiveTimestamp);
  const activeChallenge = dailyState.challenges.find(c => c.id === sanitizedChallengeId);

  if (activeChallenge) {
    const isCompleted = activeChallenge.completed || activeChallenge.progress >= activeChallenge.target;
    if (!isCompleted) {
      return {
        success: false,
        rewardId,
        xpEarned: 0,
        alreadyClaimed: false,
        error: 'Challenge is not completed',
        progressionState: currentProgression,
      };
    }
  }

  // 3. Write deterministic record to Daily Reward Ledger
  const newRecord: DailyRewardRecord = {
    rewardId,
    utcDate: effectiveUtcDate,
    challengeId: sanitizedChallengeId,
    xpAmount: XP_REWARDS.DAILY_CHALLENGE_COMPLETION,
    starsAmount: activeChallenge?.rewardStars ?? REWARD_STARS.PER_CHALLENGE,
    claimedAt: effectiveTimestamp,
  };
  ledger.records.push(newRecord);
  saveDailyRewardLedger(ledger, storage);

  // 4. Apply 50 XP to PlayerProgressionState (recording rewardId in appliedRewardIds)
  const earnResult = awardCustomXp(
    XP_REWARDS.DAILY_CHALLENGE_COMPLETION,
    rewardId,
    storage,
    true
  );

  // 5. Update Trophy Stars and rewardClaimed: true in daily challenge state if not yet claimed
  const appliedStarsIds = new Set(dailyState.appliedRewardIds || []);
  if (!appliedStarsIds.has(rewardId)) {
    appliedStarsIds.add(rewardId);
    dailyState.appliedRewardIds = Array.from(appliedStarsIds);
    if (activeChallenge) {
      if (!activeChallenge.rewardClaimed) {
        activeChallenge.rewardClaimed = true;
        activeChallenge.completed = true;
        dailyState.lifetimeStars += activeChallenge.rewardStars;
      }
    } else {
      dailyState.lifetimeStars += newRecord.starsAmount;
    }
    saveDailyChallengeState(dailyState, storage);
  }

  return {
    success: true,
    rewardId,
    xpEarned: earnResult.xpEarned,
    alreadyClaimed: false,
    record: newRecord,
    progressionState: earnResult.state,
  };
}

/**
 * Reconciles any unapplied Daily Challenge rewards from the Daily Reward Ledger
 * into both PlayerProgressionState (XP) and DailyChallengeUserState (Trophy Stars).
 * 
 * Ensures transactional recovery across app crashes or interruptions between writes:
 * - Recovers unapplied 50 XP rewards without duplicating existing XP.
 * - Recovers unapplied 25 Trophy Stars without duplicating existing Stars.
 * - Completely idempotent: running repeatedly produces 0 duplicate rewards.
 */
export function reconcileDailyRewards(
  storage: StorageLike | null = getBrowserStorage()
): DailyRewardReconciliationResult {
  const progression = loadPlayerProgression(storage);
  const ledger = loadDailyRewardLedger(storage);
  const dailyState = loadDailyChallengeState(storage);

  if (ledger.records.length === 0) {
    return {
      reconciledCount: 0,
      reconciledRewardIds: [],
      reconciledStarsCount: 0,
      reconciledStarsRewardIds: [],
      progressionState: progression,
    };
  }

  // 1. Reconcile XP in PlayerProgressionState
  const appliedXpSet = new Set(progression.appliedRewardIds);
  const missingXpRecords: DailyRewardRecord[] = [];

  for (const record of ledger.records) {
    if (!appliedXpSet.has(record.rewardId)) {
      appliedXpSet.add(record.rewardId);
      missingXpRecords.push(record);
    }
  }

  let totalXpToAdd = 0;
  const reconciledXpRewardIds: string[] = [];

  for (const record of missingXpRecords) {
    totalXpToAdd += sanitizeNonNegativeInt(record.xpAmount, XP_REWARDS.DAILY_CHALLENGE_COMPLETION);
    reconciledXpRewardIds.push(record.rewardId);
  }

  let updatedProgression = progression;
  if (missingXpRecords.length > 0) {
    const newTotalLifetimeXp = progression.totalLifetimeXp + totalXpToAdd;
    const derived = calculateLevelFromLifetimeXp(newTotalLifetimeXp);

    updatedProgression = {
      level: derived.level,
      currentXp: derived.currentXp,
      xpForNextLevel: derived.xpForNextLevel,
      totalLifetimeXp: newTotalLifetimeXp,
      highestLevelAchieved: Math.max(progression.highestLevelAchieved, derived.level),
      processedRunEventIds: progression.processedRunEventIds,
      appliedRewardIds: Array.from(appliedXpSet),
    };
    savePlayerProgression(updatedProgression, storage);
  }

  // 2. Reconcile Trophy Stars in DailyChallengeUserState
  const appliedStarsSet = new Set(dailyState.appliedRewardIds || []);
  const missingStarsRecords: DailyRewardRecord[] = [];

  for (const record of ledger.records) {
    if (!appliedStarsSet.has(record.rewardId)) {
      appliedStarsSet.add(record.rewardId);
      missingStarsRecords.push(record);
    }
  }

  let totalStarsToAdd = 0;
  const reconciledStarsRewardIds: string[] = [];

  if (missingStarsRecords.length > 0) {
    for (const record of missingStarsRecords) {
      totalStarsToAdd += sanitizeNonNegativeInt(record.starsAmount, REWARD_STARS.PER_CHALLENGE);
      reconciledStarsRewardIds.push(record.rewardId);

      // If active challenges on that date include this challenge, mark it claimed
      if (dailyState.activeDate === record.utcDate) {
        const challenge = dailyState.challenges.find(c => c.id === record.challengeId);
        if (challenge) {
          challenge.completed = true;
          challenge.rewardClaimed = true;
        }
      }
    }

    dailyState.lifetimeStars += totalStarsToAdd;
    dailyState.appliedRewardIds = Array.from(appliedStarsSet);
    saveDailyChallengeState(dailyState, storage);
  }

  return {
    reconciledCount: reconciledXpRewardIds.length,
    reconciledRewardIds: reconciledXpRewardIds,
    reconciledStarsCount: reconciledStarsRewardIds.length,
    reconciledStarsRewardIds,
    progressionState: updatedProgression,
  };
}
