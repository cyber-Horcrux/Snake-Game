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

export type SnakeSkinId =
  | 'cyber_cyan'
  | 'matrix_green'
  | 'synth_sunset'
  | 'hyper_violet'
  | 'crimson_blaze'
  | 'arctic_frost'
  | 'gold_prestige'
  | 'apex_void';

export type SkinUnlockType = 'default' | 'level' | 'zen_wraps' | 'campaign_victory';

export interface SkinUnlockCondition {
  type: SkinUnlockType;
  description: string;
  requiredLevel?: number;
  requiredZenWraps?: number;
  requiredCampaignVictory?: boolean;
}

export interface SkinDefinition {
  id: SnakeSkinId;
  name: string;
  tagline: string;
  headColor: string;
  headGlow: string;
  eyeColor: string;
  bodyColors: [string, string, string]; // [head-near, mid-body, tail]
  unlock: SkinUnlockCondition;
  altUnlock?: SkinUnlockCondition;
}

export type SnakeSkin = SkinDefinition;

export interface PlayerSkinsState {
  equippedSkinId: SnakeSkinId;
  unlockedSkinIds: SnakeSkinId[];
}

export type SnakeTrailId =
  | 'none'
  | 'cyber_pulse'
  | 'matrix_stream'
  | 'plasma_fire'
  | 'hyper_streak'
  | 'frost_vapor'
  | 'solar_radiance'
  | 'void_singularity';

export type TrailStyle =
  | 'none'
  | 'pulse'
  | 'matrix'
  | 'plasma'
  | 'streak'
  | 'vapor'
  | 'solar'
  | 'singularity';

export type TrailUnlockType = 'default' | 'level' | 'zen_wraps' | 'maze_stage' | 'food_single_run';

export interface TrailUnlockCondition {
  type: TrailUnlockType;
  description: string;
  requiredLevel?: number;
  requiredZenWraps?: number;
  requiredMazeStage?: number;
  requiredFoodSingleRun?: number;
}

export interface TrailDefinition {
  id: SnakeTrailId;
  name: string;
  tagline: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  style: TrailStyle;
  unlock: TrailUnlockCondition;
  altUnlock?: TrailUnlockCondition;
}

export interface PlayerTrailsState {
  equippedTrailId: SnakeTrailId;
  unlockedTrailIds: SnakeTrailId[];
}

export interface TrailUnlockContext {
  level: number;
  zenWallsWrapped: number;
  highestMazeStage: number;
  maxFoodInRun?: number;
}

export type BoardThemeId =
  | 'obsidian_grid'
  | 'industrial_foundry'
  | 'arctic_research'
  | 'bio_dome'
  | 'solar_array'
  | 'void_observatory';

export type ThemeUnlockType = 'default' | 'level' | 'zen_wraps' | 'maze_stage' | 'food_single_run' | 'campaign_victory';

export interface ThemeUnlockCondition {
  type: ThemeUnlockType;
  description: string;
  requiredLevel?: number;
  requiredZenWraps?: number;
  requiredMazeStage?: number;
  requiredFoodSingleRun?: number;
  requiredCampaignVictory?: boolean;
}

export interface BoardThemeDefinition {
  id: BoardThemeId;
  name: string;
  tagline: string;
  description: string;
  category: string;
  primaryAccent: string;
  secondaryAccent: string;
  floorBg: string;
  floorGradient: {
    center: string;
    edge: string;
  };
  grid: {
    lineColor: string;
    crosshairColor: string;
    accentFrequency: number;
  };
  border: {
    outerBase: string;
    shadowOcclusion: string;
    specularChamfer: string;
    emissivePerimeter: string;
    cornerReticle: string;
  };
  unlock: ThemeUnlockCondition;
  altUnlock?: ThemeUnlockCondition;
}

export interface PlayerThemesState {
  equippedThemeId: BoardThemeId;
  unlockedThemeIds: BoardThemeId[];
}

export interface ThemeUnlockContext {
  level: number;
  zenWallsWrapped: number;
  highestMazeStage: number;
  maxFoodInRun?: number;
  campaignWon?: boolean;
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
  stageMaxCombo?: number;
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
  trail: SnakeTrailId;
  boardTheme: BoardThemeId;
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
  maxFoodInRun?: number;
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
  | 'stats'
  | 'challenges';

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

export interface XpBreakdown {
  foodXp: number;
  bonusFoodXp: number;
  scoreXp: number;
  survivalXp: number;
  comboXp: number;
  shieldXp: number;
  zenWrapXp: number;
  rushBonusXp: number;
  stageClearBonusXp: number;
  campaignVictoryBonusXp: number;
  totalXp: number;
}

export interface PlayerProgressionState {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  totalLifetimeXp: number;
  highestLevelAchieved: number;
  processedRunEventIds: string[];
  appliedRewardIds: string[];
}

export interface XpEarnResult {
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  levelsGained: number;
  isMaxLevel: boolean;
  state: PlayerProgressionState;
  breakdown: XpBreakdown;
}

export interface RunXpInput {
  mode: GameMode;
  foodEaten: number;
  bonusEaten?: number;
  score: number;
  survivalSeconds: number;
  maxCombo?: number;
  shieldsUsed?: number;
  wallsWrapped?: number;
  isStageClear?: boolean;
  isCampaignComplete?: boolean;
}

export interface DailyRewardRecord {
  rewardId: string;
  utcDate: string;
  challengeId: string;
  xpAmount: number;
  starsAmount: number;
  claimedAt: number;
}

export interface DailyRewardLedger {
  records: DailyRewardRecord[];
}

export interface DailyRewardClaimResult {
  success: boolean;
  rewardId: string;
  xpEarned: number;
  alreadyClaimed: boolean;
  error?: string;
  record?: DailyRewardRecord;
  progressionState: PlayerProgressionState;
}

export interface DailyRewardReconciliationResult {
  reconciledCount: number;
  reconciledRewardIds: string[];
  reconciledStarsCount?: number;
  reconciledStarsRewardIds?: string[];
  progressionState: PlayerProgressionState;
}

export interface MazeStageSnapshot {
  stage: number;
  startFood: number;
  startBonusFood: number;
  startScore: number;
  startGameTimeMs: number;
  startShields: number;
  startWallsWrapped: number;
  stageMaxCombo: number;
}

export interface MazeStagePerformanceInput {
  stage: number;
  foodEaten: number;
  bonusEaten?: number;
  score: number;
  survivalSeconds: number;
  stageMaxCombo?: number;
  shieldsUsed?: number;
  isStageClear?: boolean;
  isCampaignComplete?: boolean;
}

