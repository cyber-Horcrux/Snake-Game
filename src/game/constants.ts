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
};

