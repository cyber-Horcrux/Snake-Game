/**
 * Core type definitions for NEON SNAKE
 */

export type GameMode = 'classic' | 'zen' | 'rush';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridCoord {
  x: number;
  y: number;
}

export type FoodType = 'normal' | 'bonus' | 'powerup_slow' | 'powerup_shield';

export interface FoodItem {
  id: string;
  type: FoodType;
  position: GridCoord;
  points: number;
  expiresAt?: number; // timestamp in ms, if timed
  totalDurationMs?: number;
}

export interface ActivePowerUps {
  slowMoUntil: number; // timestamp ms
  hasShield: boolean;
}

export interface GameEngineState {
  mode: GameMode;
  gridWidth: number;
  gridHeight: number;
  snake: GridCoord[];       // index 0 is head
  prevSnake: GridCoord[];   // for visual interpolation
  direction: Direction;
  queuedDirections: Direction[];
  pendingGrowth: number;
  food: FoodItem[];
  score: number;
  level: number;
  foodEaten: number;
  bonusEaten: number;
  maxLength: number;
  isAlive: boolean;
  isVictory: boolean;
  powerUps: ActivePowerUps;
  lastTickTime: number;
  tickIntervalMs: number;
  gameTimeMs: number;
  deathReason?: 'wall' | 'self';
}

export interface AudioSettings {
  sfxEnabled: boolean;
  sfxVolume: number;
}

export interface GameSettings {
  audio: AudioSettings;
  visualEffects: 'high' | 'performance' | 'reduced';
  dpadPreference: 'auto' | 'always' | 'never';
}

export interface ModeBestScores {
  classic: number;
  zen: number;
  rush: number;
}

export type AppScreen = 'title' | 'playing' | 'paused' | 'gameover' | 'settings' | 'how_to_play';

export type GameAudioEvent = 
  | 'click'
  | 'turn'
  | 'eat'
  | 'bonus'
  | 'powerup'
  | 'shield_absorb'
  | 'level_up'
  | 'game_over'
  | 'new_record';
