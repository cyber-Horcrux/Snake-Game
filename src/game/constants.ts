/**
 * Tunable game constants for NEON SNAKE
 */
import type { ControlMode, GameMode, SnakeSkin, SnakeSkinId } from './types.ts';

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

export const COMBO_SETTINGS = {
  WINDOW_MS: 3200,      // Time to eat next food to increment combo
  MAX_COMBO: 4,         // Max multiplier (1x, 2x, 3x, 4x)
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
  maze: {
    startMs: 140,
    minMs: 70,
    speedStepMs: 6,
  },
};

export const POWER_UPS = {
  SLOW_MO_DURATION_MS: 7500,
  SLOW_MO_FACTOR: 1.45, // Multiplies tick interval (slower snake)
  BONUS_FOOD_DURATION_MS: 9000,
  SPAWN_INTERVAL_FOODS: 7, // Chance to spawn bonus or powerup every 7 foods
};

export const SKINS: Record<SnakeSkinId, SnakeSkin> = {
  cyber_cyan: {
    id: 'cyber_cyan',
    name: 'Cyber Cyan',
    tagline: 'Standard issue neural interface',
    headColor: '#43F5FF',
    headGlow: '#43F5FF',
    eyeColor: '#39FF14',
    bodyColors: ['#43F5FF', '#9865FF', '#FF4FD8'],
  },
  matrix_green: {
    id: 'matrix_green',
    name: 'Matrix Emerald',
    tagline: 'Phosphor terminal cascade',
    headColor: '#39FF14',
    headGlow: '#39FF14',
    eyeColor: '#43F5FF',
    bodyColors: ['#39FF14', '#10B981', '#065F46'],
  },
  synth_sunset: {
    id: 'synth_sunset',
    name: 'Synth Sunset',
    tagline: 'Outrun dusk neon glow',
    headColor: '#FF8A00',
    headGlow: '#FF8A00',
    eyeColor: '#43F5FF',
    bodyColors: ['#FF8A00', '#FF2E93', '#8A2BE2'],
  },
  hyper_violet: {
    id: 'hyper_violet',
    name: 'Hyper Violet',
    tagline: 'Deep ultraviolet laser arc',
    headColor: '#9865FF',
    headGlow: '#9865FF',
    eyeColor: '#FF4FD8',
    bodyColors: ['#9865FF', '#C084FC', '#FF4FD8'],
  },
  gold_prestige: {
    id: 'gold_prestige',
    name: 'Solar Prestige',
    tagline: 'Hyper-conductive pure gold alloy',
    headColor: '#FFD700',
    headGlow: '#FFD700',
    eyeColor: '#FF4FD8',
    bodyColors: ['#FFD700', '#F59E0B', '#B45309'],
  },
};

export const DEFAULT_SETTINGS = {
  audio: {
    sfxEnabled: true,
    sfxVolume: 0.8,
  },
  visualEffects: 'high' as const,
  dpadPreference: 'auto' as const,
  skin: 'cyber_cyan' as SnakeSkinId,
  controlMode: 'swipe' as ControlMode,
};

export const STORAGE_KEYS = {
  BEST_SCORES: 'neon_snake_best_scores_v1',
  SETTINGS: 'neon_snake_settings_v1',
  STATISTICS: 'neon_snake_lifetime_stats_v1',
  ACHIEVEMENTS: 'neon_snake_achievements_v1',
  DAILY_CHALLENGES: 'neon_snake_daily_challenges_v1',
  MAZE_PROGRESS: 'neon_snake_maze_progress_v1',
  PLAYER_PROGRESSION: 'neon_snake_player_progression_v1',
  DAILY_REWARD_LEDGER: 'neon_snake_daily_reward_ledger_v1',
};

export const MAX_PLAYER_LEVEL = 50;
export const MAX_PROCESSED_RUN_EVENTS = 100;

export const XP_REWARDS = {
  NORMAL_FOOD: 10,
  BONUS_FOOD: 25,
  SCORE_DIVISOR: 20,
  SURVIVAL_INTERVAL_SECONDS: 5,
  SURVIVAL_CAP: 30,
  COMBO_2X: 10,
  COMBO_3X: 20,
  COMBO_4X_PLUS: 30,
  SHIELD_SAVE: 15,
  SHIELD_CAP: 45,
  ZEN_WRAP_DIVISOR: 2,
  ZEN_WRAP_CAP: 15,
  RUSH_MULTIPLIER: 1.25,
  MAZE_STAGE_CLEAR: 100,
  MAZE_CAMPAIGN_VICTORY: 500,
  DAILY_CHALLENGE_COMPLETION: 50,
  ANTI_EXPLOIT_MIN_SURVIVAL_SECONDS: 5,
} as const;

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Neon Scout',
  2: 'Cyber Striker',
  3: 'Grid Runner',
  4: 'Vector Viper',
  5: 'Apex Hunter',
  6: 'Laser Fang',
  7: 'Pulse Master',
  8: 'Circuit Cobra',
  9: 'Hyper Serpent',
  10: 'Cyber Champion',
  15: 'Neon Phantom',
  20: 'Vortex Overlord',
  25: 'Solar Sentinel',
  30: 'Titan Viper',
  40: 'Quantum Basilisk',
  50: 'Apex Legend',
};

