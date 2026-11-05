/**
 * Lifetime Statistics & Achievement Tracking
 * Pure, persistent, and validated against corrupted storage.
 */
import type {
  Achievement,
  AchievementId,
  GameEngineState,
  LifetimeStats,
} from './types.ts';
import { STORAGE_KEYS } from './constants.ts';
import type { StorageLike } from './persistence.ts';

export const DEFAULT_STATS: LifetimeStats = {
  runsPlayed: 0,
  totalScore: 0,
  highestScore: 0,
  totalFoodEaten: 0,
  totalBonusEaten: 0,
  powerUpsCollected: 0,
  longestSnake: 3,
  wallsWrapped: 0,
  shieldsUsed: 0,
  maxCombo: 1,
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_bite',
    title: 'First Bite',
    description: 'Consume your first Neon Core energy node.',
    unlocked: false,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Reach a score of 100 in any single run.',
    unlocked: false,
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Achieve a score of 500 in a single run.',
    unlocked: false,
  },
  {
    id: 'cyber_anaconda',
    title: 'Cyber Anaconda',
    description: 'Grow your snake to 25 segments long.',
    unlocked: false,
  },
  {
    id: 'aegis_master',
    title: 'Aegis Master',
    description: 'Absorb a fatal wall or body impact with an Aegis Shield.',
    unlocked: false,
  },
  {
    id: 'warp_runner',
    title: 'Warp Runner',
    description: 'Pass through the boundaries 20 times in Zen Mode.',
    unlocked: false,
  },
  {
    id: 'rush_hour',
    title: 'Rush Hour',
    description: 'Score 250 or more points in high-speed Rush Mode.',
    unlocked: false,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Reach Level 5 in any run.',
    unlocked: false,
  },
  {
    id: 'combo_king',
    title: 'Combo Matrix',
    description: 'Achieve a 3x or higher food combo multiplier.',
    unlocked: false,
  },
  {
    id: 'neon_legend',
    title: 'Neon Legend',
    description: 'Accumulate 1,000+ total career points across all runs.',
    unlocked: false,
  },
];

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test_stats__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage restricted
  }
  return null;
}

export function loadStats(storage: StorageLike | null = getBrowserStorage()): LifetimeStats {
  if (!storage) return { ...DEFAULT_STATS };

  try {
    const raw = storage.getItem(STORAGE_KEYS.STATISTICS) || storage.getItem('neonsnake_stats') || storage.getItem('neonsnake_lifetime_stats');
    if (!raw) return { ...DEFAULT_STATS };

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_STATS };
    }

    const sanitizeNum = (val: unknown, fallback: number): number =>
      typeof val === 'number' && Number.isFinite(val) && val >= 0
        ? Math.floor(val)
        : fallback;

    return {
      runsPlayed: sanitizeNum(parsed.runsPlayed, DEFAULT_STATS.runsPlayed),
      totalScore: sanitizeNum(parsed.totalScore, DEFAULT_STATS.totalScore),
      highestScore: sanitizeNum(parsed.highestScore, DEFAULT_STATS.highestScore),
      totalFoodEaten: sanitizeNum(parsed.totalFoodEaten, DEFAULT_STATS.totalFoodEaten),
      totalBonusEaten: sanitizeNum(parsed.totalBonusEaten, DEFAULT_STATS.totalBonusEaten),
      powerUpsCollected: sanitizeNum(parsed.powerUpsCollected, DEFAULT_STATS.powerUpsCollected),
      longestSnake: Math.max(3, sanitizeNum(parsed.longestSnake, DEFAULT_STATS.longestSnake)),
      wallsWrapped: sanitizeNum(parsed.wallsWrapped, DEFAULT_STATS.wallsWrapped),
      shieldsUsed: sanitizeNum(parsed.shieldsUsed, DEFAULT_STATS.shieldsUsed),
      maxCombo: Math.max(1, sanitizeNum(parsed.maxCombo, DEFAULT_STATS.maxCombo)),
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats: LifetimeStats, storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.STATISTICS, JSON.stringify(stats));
    return true;
  } catch {
    return false;
  }
}

export function loadAchievements(storage: StorageLike | null = getBrowserStorage()): Achievement[] {
  if (!storage) return INITIAL_ACHIEVEMENTS.map(a => ({ ...a }));

  try {
    const raw = storage.getItem(STORAGE_KEYS.ACHIEVEMENTS) || storage.getItem('neonsnake_achievements');
    if (!raw) return INITIAL_ACHIEVEMENTS.map(a => ({ ...a }));

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_ACHIEVEMENTS.map(a => ({ ...a }));

    const lookup = new Map<string, { unlocked: boolean; unlockedAt?: number }>();
    for (const item of parsed) {
      if (item && typeof item.id === 'string') {
        lookup.set(item.id, {
          unlocked: Boolean(item.unlocked),
          unlockedAt: typeof item.unlockedAt === 'number' ? item.unlockedAt : undefined,
        });
      }
    }

    return INITIAL_ACHIEVEMENTS.map(base => {
      const match = lookup.get(base.id);
      return {
        ...base,
        unlocked: match?.unlocked ?? false,
        unlockedAt: match?.unlockedAt,
      };
    });
  } catch {
    return INITIAL_ACHIEVEMENTS.map(a => ({ ...a }));
  }
}

export function saveAchievements(
  achievements: Achievement[],
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    return true;
  } catch {
    return false;
  }
}

/**
 * Updates stats and calculates any newly unlocked achievements upon run completion.
 */
export function recordRunCompletion(
  finalState: GameEngineState,
  storage: StorageLike | null = getBrowserStorage()
): { stats: LifetimeStats; newlyUnlocked: Achievement[] } {
  const currentStats = loadStats(storage);
  const currentAchievements = loadAchievements(storage);
  const now = Date.now();

  const updatedStats: LifetimeStats = {
    runsPlayed: currentStats.runsPlayed + 1,
    totalScore: currentStats.totalScore + finalState.score,
    highestScore: Math.max(currentStats.highestScore, finalState.score),
    totalFoodEaten: currentStats.totalFoodEaten + finalState.foodEaten,
    totalBonusEaten: currentStats.totalBonusEaten + finalState.bonusEaten,
    powerUpsCollected: currentStats.powerUpsCollected + (finalState.powerUpsCollected || 0),
    longestSnake: Math.max(currentStats.longestSnake, finalState.maxLength),
    wallsWrapped: currentStats.wallsWrapped + (finalState.wallsWrapped || 0),
    shieldsUsed: currentStats.shieldsUsed + (finalState.shieldsUsed || 0),
    maxCombo: Math.max(currentStats.maxCombo, finalState.combo || 1),
  };

  saveStats(updatedStats, storage);

  // Evaluate achievements
  const newlyUnlocked: Achievement[] = [];
  const updatedAchievements = currentAchievements.map(ach => {
    if (ach.unlocked) return ach;

    let shouldUnlock = false;
    switch (ach.id) {
      case 'first_bite':
        shouldUnlock = updatedStats.totalFoodEaten >= 1;
        break;
      case 'centurion':
        shouldUnlock = finalState.score >= 100;
        break;
      case 'high_roller':
        shouldUnlock = finalState.score >= 500;
        break;
      case 'cyber_anaconda':
        shouldUnlock = finalState.maxLength >= 25;
        break;
      case 'aegis_master':
        shouldUnlock = updatedStats.shieldsUsed >= 1;
        break;
      case 'warp_runner':
        shouldUnlock = updatedStats.wallsWrapped >= 20;
        break;
      case 'rush_hour':
        shouldUnlock = finalState.mode === 'rush' && finalState.score >= 250;
        break;
      case 'speed_demon':
        shouldUnlock = finalState.level >= 5;
        break;
      case 'combo_king':
        shouldUnlock = updatedStats.maxCombo >= 3;
        break;
      case 'neon_legend':
        shouldUnlock = updatedStats.totalScore >= 1000;
        break;
    }

    if (shouldUnlock) {
      const unlockedAch: Achievement = {
        ...ach,
        unlocked: true,
        unlockedAt: now,
      };
      newlyUnlocked.push(unlockedAch);
      return unlockedAch;
    }

    return ach;
  });

  if (newlyUnlocked.length > 0) {
    saveAchievements(updatedAchievements, storage);
  }

  return { stats: updatedStats, newlyUnlocked };
}

export function resetStatsAndAchievements(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    saveStats(DEFAULT_STATS, storage);
    saveAchievements(INITIAL_ACHIEVEMENTS.map(a => ({ ...a })), storage);
    return true;
  } catch {
    return false;
  }
}
