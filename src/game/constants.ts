/**
 * Tunable game constants for NEON SNAKE
 */
import type { GameMode } from './types.ts';

export const GRID_SIZE = {
  WIDTH: 24,
  HEIGHT: 24,
};

export const INITIAL_SNAKE_LENGTH = 3;

export const POINTS = {
  NORMAL_FOOD: 10,
  BONUS_FOOD_BASE: 30,
  POWERUP: 15,
};

export const FOOD_PROGRESSION_PER_LEVEL = 5;

// Speed intervals in milliseconds per level (Level 1 to 10+)
export const MODE_SPEEDS: Record<GameMode, { startMs: number; minMs: number; speedStepMs: number }> = {
  classic: {
    startMs: 135,
    minMs: 65,
    speedStepMs: 7,
  },
  zen: {
    startMs: 155,
    minMs: 95,
    speedStepMs: 5,
  },
  rush: {
    startMs: 100,
    minMs: 48,
    speedStepMs: 6,
  },
};

export const POWER_UPS = {
  SLOW_MO_DURATION_MS: 7500,
  SLOW_MO_FACTOR: 1.45, // Multiplies tick interval (slower snake)
  BONUS_FOOD_DURATION_MS: 9000,
  SPAWN_INTERVAL_FOODS: 7, // Chance to spawn bonus or powerup every 7 foods
};

export const DEFAULT_SETTINGS = {
  audio: {
    sfxEnabled: true,
    sfxVolume: 0.8,
  },
  visualEffects: 'high' as const,
  dpadPreference: 'auto' as const,
};

export const STORAGE_KEYS = {
  BEST_SCORES: 'neon_snake_best_scores_v1',
  SETTINGS: 'neon_snake_settings_v1',
  STATISTICS: 'neon_snake_lifetime_stats_v1',
};
