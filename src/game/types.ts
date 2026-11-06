/**
 * Core type definitions for NEON SNAKE
 */

export type GameMode = 'classic' | 'zen' | 'rush' | (string & {});

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridCoord {
  x: number;
  y: number;
}

export type ObstacleType = 'wall' | 'barrier' | 'hazard';

export interface Obstacle {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly type: ObstacleType;
}

export interface WarpGate {
  readonly x: number;
  readonly y: number;
  active: boolean;
}

export interface MazeStageConfig {
  readonly stage: number;               // 1 to 6
  readonly name: string;                // e.g. "THE INITIATION"
  readonly description: string;         // stage subtitle/theme
  readonly maxIngressCapacity: number;  // 22, 20, 18, 22, 16, 14
  readonly neonCoresRequired: number;   // 10
  readonly spawnHead: GridCoord;        // default head spawn
  readonly spawnDirection: Direction;   // default initial heading
  readonly spawnPath: GridCoord[];      // validated ingress path >= maxIngressCapacity
  readonly warpGate: WarpGate;          // fixed perimeter coordinate { x, y, active: false }
  readonly obstacles: Obstacle[];       // deterministic obstacle collection
}

export interface MazeProgress {
  highestStageUnlocked: number; // 1 to 6 (default 1)
  totalCampaignsWon: number;    // default 0
  totalMazesCleared: number;    // default 0
  bestCampaignScore: number;    // default 0
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

export type SnakeSkinId = 'cyber_cyan' | 'matrix_green' | 'synth_sunset' | 'hyper_violet' | 'gold_prestige';

export interface SnakeSkin {
  id: SnakeSkinId;
  name: string;
  tagline: string;
  headColor: string;
  headGlow: string;
  eyeColor: string;
  bodyColors: [string, string, string]; // [head-near, mid-body, tail]
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
  isStageClear?: boolean;
  isCampaignComplete?: boolean;
  powerUps: ActivePowerUps;
  combo: number;            // 1 to 4 combo multiplier
  comboExpiresAt: number;   // timestamp in ms
  wallsWrapped: number;     // tracked for stats & achievements
  shieldsUsed: number;      // tracked for stats & achievements
  powerUpsCollected: number;// tracked for stats & achievements
  lastTickTime: number;
  tickIntervalMs: number;
  gameTimeMs: number;
  deathReason?: 'wall' | 'self';
  obstacles: Obstacle[];
  warpGate: WarpGate | null;
  stage: number;
  stageFoodEaten: number;
  maxCombo: number;
}

export interface AudioSettings {
  sfxEnabled: boolean;
  sfxVolume: number;
}

export type ControlMode = 'swipe' | 'buttons' | 'both';

export interface GameSettings {
  audio: AudioSettings;
  visualEffects: 'high' | 'performance' | 'reduced';
  dpadPreference: 'auto' | 'always' | 'never';
  skin: SnakeSkinId;
  controlMode: ControlMode;
}

export interface ModeBestScores {
  classic: number;
  zen: number;
  rush: number;
  [mode: string]: number;
}

export type AchievementId =
  | 'first_bite'
  | 'centurion'
  | 'high_roller'
  | 'cyber_anaconda'
  | 'aegis_master'
  | 'warp_runner'
  | 'rush_hour'
  | 'speed_demon'
  | 'combo_king'
  | 'neon_legend';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface LifetimeStats {
  runsPlayed: number;
  totalScore: number;
  highestScore: number;
  totalFoodEaten: number;
  totalBonusEaten: number;
  powerUpsCollected: number;
  longestSnake: number;
  wallsWrapped: number;
  shieldsUsed: number;
  maxCombo: number;
}

export type AppScreen =
  | 'title'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'stage_clear'
  | 'campaign_victory'
  | 'settings'
  | 'how_to_play'
  | 'stats';

export type GameAudioEvent = 
  | 'click'
  | 'turn'
  | 'eat'
  | 'bonus'
  | 'powerup'
  | 'shield_absorb'
  | 'level_up'
  | 'game_over'
  | 'new_record'
  | 'combo'
  | 'achievement';

