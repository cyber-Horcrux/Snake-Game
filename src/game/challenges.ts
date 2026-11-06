/**
 * Daily Challenges & Trophy Stars Reward Economy
 * NEON SNAKE v1.4 — Phase 2 Task 6
 * 
 * Deterministic UTC-based challenge generation, robust cross-mode telemetry evaluation,
 * consecutive completion streak mechanics, and tamper-resistant storage persistence.
 */
import type { GameEngineState, GameMode } from './types.ts';
import { STORAGE_KEYS } from './constants.ts';
import type { StorageLike } from './persistence.ts';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type ChallengeObjectiveType =
  | 'single_run_score'
  | 'accumulate_food'
  | 'single_run_food'
  | 'survive_time'
  | 'use_shield'
  | 'combo_multiplier'
  | 'zen_wraparound'
  | 'rush_score'
  | 'maze_cores'
  | 'maze_stage_clear';

export interface DailyChallengeDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: ChallengeDifficulty;
  readonly objectiveType: ChallengeObjectiveType;
  readonly target: number;
  readonly modeFilter?: GameMode; // e.g., 'zen', 'rush', 'maze'
  readonly rewardStars: number;   // 25 stars
}

export interface ActiveDailyChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  objectiveType: ChallengeObjectiveType;
  target: number;
  modeFilter?: GameMode;
  rewardStars: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface DailyChallengeUserState {
  activeDate: string; // YYYY-MM-DD (UTC)
  challenges: ActiveDailyChallenge[];
  allThreeCompleted: boolean;
  allThreeRewardClaimed: boolean;
  lifetimeStars: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  claimedMilestones: number[]; // e.g. [3, 7, 14]
  lastKnownTimestamp: number;
  completedDatesHistory: string[];
  processedEventIds?: string[];
  appliedRewardIds?: string[];
}

export interface RunEvaluationOptions {
  eventId?: string;
  stageDelta?: {
    foodEaten?: number;
    shieldsUsed?: number;
    mazeCores?: number;
    isStageClear?: boolean;
  };
}

// Reward Economy Constants
export const REWARD_STARS = {
  PER_CHALLENGE: 25,
  ALL_THREE_BONUS: 50,
  STREAK_3_DAY: 100,
  STREAK_7_DAY: 250,
  STREAK_14_DAY: 500,
} as const;

export const STREAK_MILESTONES = [
  { days: 3, reward: REWARD_STARS.STREAK_3_DAY, title: '3-Day Protocol' },
  { days: 7, reward: REWARD_STARS.STREAK_7_DAY, title: '7-Day Vanguard' },
  { days: 14, reward: REWARD_STARS.STREAK_14_DAY, title: '14-Day Apex Titan' },
] as const;

// Curated Balanced Challenge Pools
export const EASY_CHALLENGES: readonly DailyChallengeDefinition[] = [
  {
    id: 'easy_score_100',
    title: 'Warm-up Circuit',
    description: 'Score at least 100 points in any single run.',
    difficulty: 'easy',
    objectiveType: 'single_run_score',
    target: 100,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'easy_food_15',
    title: 'Energy Harvester',
    description: 'Collect 15 total food items across runs.',
    difficulty: 'easy',
    objectiveType: 'accumulate_food',
    target: 15,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'easy_shield_1',
    title: 'Aegis Sentinel',
    description: 'Absorb 1 collision impact using an Aegis Shield.',
    difficulty: 'easy',
    objectiveType: 'use_shield',
    target: 1,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'easy_zen_10',
    title: 'Warp Horizon',
    description: 'Pass through the arena boundaries 10 times in Zen mode.',
    difficulty: 'easy',
    objectiveType: 'zen_wraparound',
    target: 10,
    modeFilter: 'zen',
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'easy_combo_2',
    title: 'Double Surge',
    description: 'Reach a 2x or higher Combo multiplier in any run.',
    difficulty: 'easy',
    objectiveType: 'combo_multiplier',
    target: 2,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'easy_survive_30',
    title: 'System Uptime',
    description: 'Survive for at least 30 seconds in any single run.',
    difficulty: 'easy',
    objectiveType: 'survive_time',
    target: 30,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
];

export const MEDIUM_CHALLENGES: readonly DailyChallengeDefinition[] = [
  {
    id: 'med_score_300',
    title: 'High Current',
    description: 'Score at least 300 points in any single run.',
    difficulty: 'medium',
    objectiveType: 'single_run_score',
    target: 300,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'med_food_40',
    title: 'Grid Feast',
    description: 'Collect 40 total food items across runs.',
    difficulty: 'medium',
    objectiveType: 'accumulate_food',
    target: 40,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'med_rush_150',
    title: 'Adrenaline Surge',
    description: 'Score at least 150 points in high-speed Rush mode.',
    difficulty: 'medium',
    objectiveType: 'rush_score',
    target: 150,
    modeFilter: 'rush',
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'med_maze_cores_10',
    title: 'Core Extractor',
    description: 'Extract 10 Neon Cores in Maze Campaign mode.',
    difficulty: 'medium',
    objectiveType: 'maze_cores',
    target: 10,
    modeFilter: 'maze',
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'med_maze_clear_1',
    title: 'Warp Ingress',
    description: 'Clear at least 1 curated Maze Campaign stage.',
    difficulty: 'medium',
    objectiveType: 'maze_stage_clear',
    target: 1,
    modeFilter: 'maze',
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'med_combo_3',
    title: 'Triple Matrix',
    description: 'Reach a 3x or higher Combo multiplier in any run.',
    difficulty: 'medium',
    objectiveType: 'combo_multiplier',
    target: 3,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'med_survive_60',
    title: 'Sustained Flow',
    description: 'Survive for at least 60 seconds in any single run.',
    difficulty: 'medium',
    objectiveType: 'survive_time',
    target: 60,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
];

export const HARD_CHALLENGES: readonly DailyChallengeDefinition[] = [
  {
    id: 'hard_score_600',
    title: 'Neural Overdrive',
    description: 'Achieve a score of 600 or higher in a single run.',
    difficulty: 'hard',
    objectiveType: 'single_run_score',
    target: 600,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'hard_food_80',
    title: 'Apex Consumer',
    description: 'Collect 80 total food items across runs.',
    difficulty: 'hard',
    objectiveType: 'accumulate_food',
    target: 80,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'hard_rush_300',
    title: 'Supersonic Reflex',
    description: 'Score at least 300 points in high-speed Rush mode.',
    difficulty: 'hard',
    objectiveType: 'rush_score',
    target: 300,
    modeFilter: 'rush',
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'hard_maze_clear_2',
    title: 'Sector Liberator',
    description: 'Clear 2 Maze Campaign stages.',
    difficulty: 'hard',
    objectiveType: 'maze_stage_clear',
    target: 2,
    modeFilter: 'maze',
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'hard_combo_4',
    title: 'Apex Quad Combo',
    description: 'Reach the maximum 4x Combo multiplier.',
    difficulty: 'hard',
    objectiveType: 'combo_multiplier',
    target: 4,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'hard_survive_90',
    title: 'Iron Core Endurance',
    description: 'Survive for at least 90 seconds in any single run.',
    difficulty: 'hard',
    objectiveType: 'survive_time',
    target: 90,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
  {
    id: 'hard_shield_3',
    title: 'Fortress Protocol',
    description: 'Absorb 3 collision impacts with Aegis Shields.',
    difficulty: 'hard',
    objectiveType: 'use_shield',
    target: 3,
    rewardStars: REWARD_STARS.PER_CHALLENGE,
  },
];

// ==========================================
// UTC Date Helpers
// ==========================================

export function getUtcDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getUtcDaysDifference(dateStrA: string, dateStrB: string): number {
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcB - utcA) / (86400 * 1000));
}

export function getTimeUntilUtcMidnight(timestamp: number = Date.now()): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const now = new Date(timestamp);
  const nextMidnightUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  const totalMs = Math.max(0, nextMidnightUtc - timestamp);
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalMs };
}

// ==========================================
// Deterministic UTC Daily Challenge Selection
// ==========================================

function hashDateString(dateStr: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createDateRng(seed: number) {
  let s = seed;
  return function (): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns the exact 3 daily challenges for a given UTC date (1 Easy, 1 Medium, 1 Hard).
 */
export function generateDailyChallenges(utcDate: string = getUtcDateString()): DailyChallengeDefinition[] {
  const seed = hashDateString(utcDate);
  const rng = createDateRng(seed);

  const easyIdx = Math.floor(rng() * EASY_CHALLENGES.length);
  const medIdx = Math.floor(rng() * MEDIUM_CHALLENGES.length);
  const hardIdx = Math.floor(rng() * HARD_CHALLENGES.length);

  return [
    EASY_CHALLENGES[easyIdx],
    MEDIUM_CHALLENGES[medIdx],
    HARD_CHALLENGES[hardIdx],
  ];
}

// ==========================================
// Storage & State Management
// ==========================================

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test_daily__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage restricted
  }
  return null;
}

export function createInitialDailyState(
  utcDate: string = getUtcDateString(),
  now: number = Date.now()
): DailyChallengeUserState {
  const definitions = generateDailyChallenges(utcDate);
  return {
    activeDate: utcDate,
    challenges: definitions.map(def => ({
      ...def,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    })),
    allThreeCompleted: false,
    allThreeRewardClaimed: false,
    lifetimeStars: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    claimedMilestones: [],
    lastKnownTimestamp: now,
    completedDatesHistory: [],
    processedEventIds: [],
    appliedRewardIds: [],
  };
}

export function loadDailyChallengeState(
  storage: StorageLike | null = getBrowserStorage(),
  currentTimestamp: number = Date.now()
): DailyChallengeUserState {
  const todayUtc = getUtcDateString(currentTimestamp);
  const defaultState = createInitialDailyState(todayUtc, currentTimestamp);

  if (!storage) return defaultState;

  try {
    const raw = storage.getItem(STORAGE_KEYS.DAILY_CHALLENGES);
    if (!raw) {
      saveDailyChallengeState(defaultState, storage);
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      saveDailyChallengeState(defaultState, storage);
      return defaultState;
    }

    // Defensive Sanitization
    const sanitizeNum = (val: unknown, fallback: number) =>
      typeof val === 'number' && Number.isFinite(val) && val >= 0 ? Math.floor(val) : fallback;

    const lifetimeStars = sanitizeNum(parsed.lifetimeStars, 0);
    const bestStreak = sanitizeNum(parsed.bestStreak, 0);
    let currentStreak = sanitizeNum(parsed.currentStreak, 0);
    const lastCompletedDate =
      typeof parsed.lastCompletedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastCompletedDate)
        ? parsed.lastCompletedDate
        : null;

    const claimedMilestones = Array.isArray(parsed.claimedMilestones)
      ? parsed.claimedMilestones.filter((m: unknown) => typeof m === 'number' && Number.isFinite(m))
      : [];

    const completedDatesHistory = Array.isArray(parsed.completedDatesHistory)
      ? parsed.completedDatesHistory.filter((d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];

    const processedEventIds = Array.isArray(parsed.processedEventIds)
      ? parsed.processedEventIds.filter((id: unknown) => typeof id === 'string' && (id as string).length > 0)
      : [];

    const appliedRewardIds = Array.isArray(parsed.appliedRewardIds)
      ? parsed.appliedRewardIds.filter((id: unknown) => typeof id === 'string' && (id as string).length > 0)
      : [];

    const lastKnownTimestamp = sanitizeNum(parsed.lastKnownTimestamp, currentTimestamp);

    // Clock rollback detection: if system clock rolled back significantly behind recorded timestamp
    const effectiveNow = Math.max(currentTimestamp, lastKnownTimestamp);

    const savedDate = typeof parsed.activeDate === 'string' ? parsed.activeDate : todayUtc;

    // Evaluate streak continuity on load
    if (lastCompletedDate) {
      const daysSinceCompletion = getUtcDaysDifference(lastCompletedDate, todayUtc);
      // If today is completed, streak holds; if yesterday was completed, streak holds; otherwise streak is broken
      if (daysSinceCompletion > 1) {
        currentStreak = 0;
      }
    } else {
      currentStreak = 0;
    }

    // Check if daily challenges need rollover to today's UTC date
    if (savedDate !== todayUtc) {
      const newDefinitions = generateDailyChallenges(todayUtc);
      const rolloverState: DailyChallengeUserState = {
        activeDate: todayUtc,
        challenges: newDefinitions.map(def => ({
          ...def,
          progress: 0,
          completed: false,
          rewardClaimed: false,
        })),
        allThreeCompleted: false,
        allThreeRewardClaimed: false,
        lifetimeStars,
        currentStreak,
        bestStreak,
        lastCompletedDate,
        claimedMilestones,
        lastKnownTimestamp: effectiveNow,
        completedDatesHistory,
        processedEventIds: [],
        appliedRewardIds,
      };
      saveDailyChallengeState(rolloverState, storage);
      return rolloverState;
    }

    // Validate and sanitize active day challenges
    const expectedDefs = generateDailyChallenges(todayUtc);
    let challenges: ActiveDailyChallenge[] = [];

    const isValidChallengeObj = (c: any): c is ActiveDailyChallenge => {
      return (
        c &&
        typeof c.id === 'string' &&
        typeof c.title === 'string' &&
        typeof c.description === 'string' &&
        ['easy', 'medium', 'hard'].includes(c.difficulty) &&
        typeof c.objectiveType === 'string' &&
        typeof c.target === 'number' &&
        c.target > 0
      );
    };

    if (
      Array.isArray(parsed.challenges) &&
      parsed.challenges.length === 3 &&
      parsed.challenges.every(isValidChallengeObj)
    ) {
      challenges = parsed.challenges.map((c: any) => {
        const target = sanitizeNum(c.target, 1);
        const progress = Math.max(0, Math.min(target, sanitizeNum(c.progress, 0)));
        const completed = Boolean(c.completed) || progress >= target;
        const rewardClaimed = Boolean(c.rewardClaimed);
        const rewardStars = sanitizeNum(c.rewardStars, REWARD_STARS.PER_CHALLENGE);
        return {
          id: String(c.id),
          title: String(c.title),
          description: String(c.description),
          difficulty: c.difficulty,
          objectiveType: c.objectiveType,
          target,
          modeFilter: c.modeFilter,
          rewardStars,
          progress,
          completed,
          rewardClaimed,
        };
      });
    } else {
      challenges = expectedDefs.map(def => ({
        ...def,
        progress: 0,
        completed: false,
        rewardClaimed: false,
      }));
    }

    const allThreeCompleted = challenges.length === 3 && challenges.every(c => c.completed);
    const allThreeRewardClaimed = Boolean(parsed.allThreeRewardClaimed);

    const validState: DailyChallengeUserState = {
      activeDate: todayUtc,
      challenges,
      allThreeCompleted,
      allThreeRewardClaimed,
      lifetimeStars,
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      lastCompletedDate,
      claimedMilestones,
      lastKnownTimestamp: effectiveNow,
      completedDatesHistory,
      processedEventIds,
      appliedRewardIds,
    };

    return validState;
  } catch {
    saveDailyChallengeState(defaultState, storage);
    return defaultState;
  }
}

export function saveDailyChallengeState(
  state: DailyChallengeUserState,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetDailyChallengeState(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    const fresh = createInitialDailyState();
    storage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(fresh));
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// Cross-Mode Run Evaluation Engine
// ==========================================

export interface RunEvaluationResult {
  state: DailyChallengeUserState;
  newlyCompletedChallenges: string[];
  allThreeNewlyCompleted: boolean;
  newlyClaimedMilestones: number[];
  starsAwarded: number;
}

/**
 * Evaluates a completed run against the player's active daily challenges.
 * Attributed strictly to the UTC date on which the run STARTED.
 */
export function recordDailyChallengeRun(
  finalState: GameEngineState,
  runStartTime: number = Date.now(),
  storage: StorageLike | null = getBrowserStorage(),
  options?: RunEvaluationOptions
): RunEvaluationResult {
  const currentTimestamp = Date.now();
  const runStartDate = getUtcDateString(runStartTime);

  // Load state as of the run start date
  let userState = loadDailyChallengeState(storage, runStartTime);

  // Ensure state matches the run start date (if run began prior to midnight)
  if (userState.activeDate !== runStartDate) {
    // If run started on an older date than current, do not overwrite today's state
    return {
      state: loadDailyChallengeState(storage, currentTimestamp),
      newlyCompletedChallenges: [],
      allThreeNewlyCompleted: false,
      newlyClaimedMilestones: [],
      starsAwarded: 0,
    };
  }

  // Deduplicate repeated evaluation of the exact same event
  if (options?.eventId && userState.processedEventIds?.includes(options.eventId)) {
    return {
      state: userState,
      newlyCompletedChallenges: [],
      allThreeNewlyCompleted: false,
      newlyClaimedMilestones: [],
      starsAwarded: 0,
    };
  }

  const newlyCompletedChallenges: string[] = [];
  let starsAwarded = 0;

  // Process Each Active Challenge
  const updatedChallenges = userState.challenges.map(challenge => {
    // Mode eligibility check: if challenge requires a specific mode, filter out non-matching runs
    if (challenge.modeFilter && challenge.modeFilter !== finalState.mode) {
      return challenge;
    }

    let progressDelta = 0;
    let isSingleRun = false;

    switch (challenge.objectiveType) {
      case 'single_run_score':
        isSingleRun = true;
        progressDelta = finalState.score;
        break;

      case 'accumulate_food':
        if (options?.stageDelta?.foodEaten !== undefined) {
          progressDelta = options.stageDelta.foodEaten;
        } else {
          progressDelta = finalState.foodEaten;
        }
        break;

      case 'single_run_food':
        isSingleRun = true;
        progressDelta = finalState.foodEaten;
        break;

      case 'survive_time':
        isSingleRun = true;
        // gameTimeMs in seconds
        progressDelta = Math.floor((finalState.gameTimeMs || 0) / 1000);
        break;

      case 'use_shield':
        if (options?.stageDelta?.shieldsUsed !== undefined) {
          progressDelta = options.stageDelta.shieldsUsed;
        } else {
          progressDelta = finalState.shieldsUsed || 0;
        }
        break;

      case 'combo_multiplier':
        isSingleRun = true;
        progressDelta = finalState.maxCombo || finalState.combo || 1;
        break;

      case 'zen_wraparound':
        if (finalState.mode === 'zen') {
          progressDelta = finalState.wallsWrapped || 0;
        }
        break;

      case 'rush_score':
        if (finalState.mode === 'rush') {
          isSingleRun = true;
          progressDelta = finalState.score;
        }
        break;

      case 'maze_cores':
        if (finalState.mode === 'maze') {
          if (options?.stageDelta?.mazeCores !== undefined) {
            progressDelta = options.stageDelta.mazeCores;
          } else {
            // Food eaten in maze mode represents collected neon cores
            progressDelta = finalState.stageFoodEaten !== undefined ? finalState.stageFoodEaten : finalState.foodEaten;
          }
        }
        break;

      case 'maze_stage_clear':
        if (finalState.mode === 'maze') {
          if (options?.stageDelta?.isStageClear !== undefined) {
            progressDelta = options.stageDelta.isStageClear ? 1 : 0;
          } else if (finalState.isStageClear || finalState.isCampaignComplete) {
            progressDelta = 1;
          }
        }
        break;
    }

    let newProgress = challenge.progress;
    if (isSingleRun) {
      newProgress = Math.min(challenge.target, Math.max(challenge.progress, progressDelta));
    } else {
      newProgress = Math.min(challenge.target, challenge.progress + progressDelta);
    }

    const isNewlyCompleted = !challenge.completed && newProgress >= challenge.target;
    const completed = challenge.completed || isNewlyCompleted;
    let rewardClaimed = challenge.rewardClaimed;

    if (isNewlyCompleted && !rewardClaimed) {
      newlyCompletedChallenges.push(challenge.id);
      rewardClaimed = true;
      starsAwarded += challenge.rewardStars;
    }

    return {
      ...challenge,
      progress: newProgress,
      completed,
      rewardClaimed,
    };
  });

  // Evaluate All-Three Completion
  const allThreeCompleted = updatedChallenges.length === 3 && updatedChallenges.every(c => c.completed);
  let allThreeNewlyCompleted = false;
  let allThreeRewardClaimed = userState.allThreeRewardClaimed;

  let currentStreak = userState.currentStreak;
  let bestStreak = userState.bestStreak;
  let lastCompletedDate = userState.lastCompletedDate;
  const claimedMilestones = [...userState.claimedMilestones];
  const completedDatesHistory = [...userState.completedDatesHistory];
  const newlyClaimedMilestones: number[] = [];

  if (allThreeCompleted && !allThreeRewardClaimed) {
    allThreeNewlyCompleted = true;
    allThreeRewardClaimed = true;
    starsAwarded += REWARD_STARS.ALL_THREE_BONUS;

    // Consecutive streak calculation
    if (!lastCompletedDate) {
      currentStreak = 1;
    } else {
      const daysDiff = getUtcDaysDifference(lastCompletedDate, userState.activeDate);
      if (daysDiff === 1) {
        currentStreak += 1;
      } else if (daysDiff === 0) {
        // Already recorded today, streak unchanged
      } else {
        currentStreak = 1; // Gap > 1 day: broken streak resets to 1
      }
    }

    bestStreak = Math.max(bestStreak, currentStreak);
    lastCompletedDate = userState.activeDate;
    if (!completedDatesHistory.includes(userState.activeDate)) {
      completedDatesHistory.push(userState.activeDate);
    }

    // Milestone Awards Check
    for (const milestone of STREAK_MILESTONES) {
      if (currentStreak >= milestone.days && !claimedMilestones.includes(milestone.days)) {
        claimedMilestones.push(milestone.days);
        newlyClaimedMilestones.push(milestone.days);
        starsAwarded += milestone.reward;
      }
    }
  }

  const updatedLifetimeStars = userState.lifetimeStars + starsAwarded;
  const updatedProcessedEventIds = options?.eventId
    ? [...(userState.processedEventIds || []).slice(-50), options.eventId]
    : userState.processedEventIds || [];

  const finalUserState: DailyChallengeUserState = {
    activeDate: userState.activeDate,
    challenges: updatedChallenges,
    allThreeCompleted,
    allThreeRewardClaimed,
    lifetimeStars: updatedLifetimeStars,
    currentStreak,
    bestStreak,
    lastCompletedDate,
    claimedMilestones,
    lastKnownTimestamp: Math.max(currentTimestamp, userState.lastKnownTimestamp),
    completedDatesHistory,
    processedEventIds: updatedProcessedEventIds,
    appliedRewardIds: [
      ...(userState.appliedRewardIds || []),
      ...newlyCompletedChallenges.map(cid => `challenge-reward-${userState.activeDate}-${cid}`),
    ],
  };

  saveDailyChallengeState(finalUserState, storage);

  return {
    state: finalUserState,
    newlyCompletedChallenges,
    allThreeNewlyCompleted,
    newlyClaimedMilestones,
    starsAwarded,
  };
}
