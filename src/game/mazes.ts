/**
 * Curated Maze Campaign Layouts & Multi-Stage Progression
 * NEON SNAKE v1.3 — The Challenge Update
 */
import type { Direction, GameEngineState, GridCoord, MazeStageConfig, Obstacle, WarpGate } from './types.ts';
import { GRID_SIZE, INITIAL_SNAKE_LENGTH, MODE_SPEEDS, POINTS } from './constants.ts';
import { calculateTickInterval, findEmptyCell } from './engine.ts';

export const MAX_CAMPAIGN_STAGES = 6;
export const NEON_CORES_PER_STAGE = 10;
export const EXCESS_SEGMENT_SCORE_BONUS = 50;
export const UNIVERSAL_SAFE_INGRESS_CAPACITY = 14;

export const STAGE_INGRESS_CAPACITIES: Record<number, number> = {
  1: 22,
  2: 20,
  3: 18,
  4: 22,
  5: 16,
  6: 14,
};

// ==========================================
// STAGE 1: THE INITIATION
// Open layout introducing navigation & static walls
// Max capacity: 22 | Warp Gate: East perimeter (23, 12)
// ==========================================
const STAGE_1_OBSTACLES: Obstacle[] = [
  // Top-Left architectural pillar
  { id: 's1_w01', x: 5, y: 5, type: 'wall' },
  { id: 's1_w02', x: 6, y: 5, type: 'wall' },
  { id: 's1_w03', x: 7, y: 5, type: 'wall' },
  { id: 's1_w04', x: 5, y: 6, type: 'wall' },
  { id: 's1_w05', x: 5, y: 7, type: 'wall' },

  // Top-Right architectural pillar
  { id: 's1_w06', x: 17, y: 5, type: 'wall' },
  { id: 's1_w07', x: 18, y: 5, type: 'wall' },
  { id: 's1_w08', x: 19, y: 5, type: 'wall' },
  { id: 's1_w09', x: 19, y: 6, type: 'wall' },
  { id: 's1_w10', x: 19, y: 7, type: 'wall' },

  // Bottom-Right architectural pillar
  { id: 's1_w11', x: 17, y: 18, type: 'wall' },
  { id: 's1_w12', x: 18, y: 18, type: 'wall' },
  { id: 's1_w13', x: 19, y: 18, type: 'wall' },
  { id: 's1_w14', x: 19, y: 17, type: 'wall' },
  { id: 's1_w15', x: 19, y: 16, type: 'wall' },

  // Center vertical baffles
  { id: 's1_w16', x: 12, y: 6, type: 'wall' },
  { id: 's1_w17', x: 12, y: 7, type: 'wall' },
  { id: 's1_w18', x: 12, y: 8, type: 'wall' },
  { id: 's1_w19', x: 12, y: 16, type: 'wall' },
  { id: 's1_w20', x: 12, y: 17, type: 'wall' },
];

const STAGE_1_SPAWN_PATH: GridCoord[] = [
  { x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }, { x: 5, y: 12 },
  { x: 4, y: 12 }, { x: 3, y: 12 }, { x: 2, y: 12 }, { x: 2, y: 13 },
  { x: 2, y: 14 }, { x: 2, y: 15 }, { x: 2, y: 16 }, { x: 2, y: 17 },
  { x: 2, y: 18 }, { x: 2, y: 19 }, { x: 2, y: 20 }, { x: 3, y: 20 },
  { x: 4, y: 20 }, { x: 5, y: 20 }, { x: 6, y: 20 }, { x: 7, y: 20 },
  { x: 8, y: 20 }, { x: 9, y: 20 },
];

// ==========================================
// STAGE 2: THE SPLIT
// Multiple route choices & destructible barriers
// Max capacity: 20 | Warp Gate: North perimeter (12, 0)
// ==========================================
const STAGE_2_OBSTACLES: Obstacle[] = [
  // Central dividing spine walls
  { id: 's2_w01', x: 12, y: 8, type: 'wall' },
  { id: 's2_w02', x: 12, y: 9, type: 'wall' },
  { id: 's2_w03', x: 12, y: 10, type: 'wall' },
  { id: 's2_w04', x: 12, y: 13, type: 'wall' },
  { id: 's2_w05', x: 12, y: 14, type: 'wall' },
  { id: 's2_w06', x: 12, y: 15, type: 'wall' },

  // Spine shortcut barriers
  { id: 's2_b01', x: 12, y: 7, type: 'barrier' },
  { id: 's2_b02', x: 12, y: 11, type: 'barrier' },
  { id: 's2_b03', x: 12, y: 12, type: 'barrier' },
  { id: 's2_b04', x: 12, y: 16, type: 'barrier' },

  // Left wing dividers
  { id: 's2_w07', x: 7, y: 8, type: 'wall' },
  { id: 's2_w08', x: 7, y: 9, type: 'wall' },
  { id: 's2_w09', x: 7, y: 10, type: 'wall' },
  { id: 's2_b05', x: 7, y: 11, type: 'barrier' },
  { id: 's2_w10', x: 7, y: 14, type: 'wall' },
  { id: 's2_w11', x: 7, y: 15, type: 'wall' },
  { id: 's2_w12', x: 7, y: 16, type: 'wall' },

  // Right wing dividers
  { id: 's2_w13', x: 17, y: 8, type: 'wall' },
  { id: 's2_w14', x: 17, y: 9, type: 'wall' },
  { id: 's2_w15', x: 17, y: 10, type: 'wall' },
  { id: 's2_b06', x: 17, y: 11, type: 'barrier' },
  { id: 's2_w16', x: 17, y: 14, type: 'wall' },
  { id: 's2_w17', x: 17, y: 15, type: 'wall' },
  { id: 's2_w18', x: 17, y: 16, type: 'wall' },
];

const STAGE_2_SPAWN_PATH: GridCoord[] = [
  { x: 12, y: 20 }, { x: 12, y: 21 }, { x: 12, y: 22 }, { x: 11, y: 22 },
  { x: 10, y: 22 }, { x: 9, y: 22 }, { x: 8, y: 22 }, { x: 7, y: 22 },
  { x: 6, y: 22 }, { x: 5, y: 22 }, { x: 4, y: 22 }, { x: 3, y: 22 },
  { x: 2, y: 22 }, { x: 2, y: 21 }, { x: 2, y: 20 }, { x: 2, y: 19 },
  { x: 2, y: 18 }, { x: 2, y: 17 }, { x: 2, y: 16 }, { x: 2, y: 15 },
];

// ==========================================
// STAGE 3: THE GAUNTLET
// Narrow passages & deliberate risk/reward hazards
// Max capacity: 18 | Warp Gate: West perimeter (0, 12)
// ==========================================
const STAGE_3_OBSTACLES: Obstacle[] = [
  // Upper chicane walls
  { id: 's3_w01', x: 6, y: 6, type: 'wall' },
  { id: 's3_w02', x: 7, y: 6, type: 'wall' },
  { id: 's3_w03', x: 8, y: 6, type: 'wall' },
  { id: 's3_w04', x: 14, y: 6, type: 'wall' },
  { id: 's3_w05', x: 15, y: 6, type: 'wall' },
  { id: 's3_w06', x: 16, y: 6, type: 'wall' },

  // Lower chicane walls
  { id: 's3_w07', x: 6, y: 18, type: 'wall' },
  { id: 's3_w08', x: 7, y: 18, type: 'wall' },
  { id: 's3_w09', x: 8, y: 18, type: 'wall' },
  { id: 's3_w10', x: 14, y: 18, type: 'wall' },
  { id: 's3_w11', x: 15, y: 18, type: 'wall' },
  { id: 's3_w12', x: 16, y: 18, type: 'wall' },

  // Mid dividing columns
  { id: 's3_w13', x: 10, y: 9, type: 'wall' },
  { id: 's3_w14', x: 10, y: 10, type: 'wall' },
  { id: 's3_w15', x: 10, y: 14, type: 'wall' },
  { id: 's3_w16', x: 10, y: 15, type: 'wall' },

  // Deliberate risk/reward hazard nodes (all have clear bypassing routes)
  { id: 's3_h01', x: 10, y: 12, type: 'hazard' },
  { id: 's3_h02', x: 5, y: 10, type: 'hazard' },
  { id: 's3_h03', x: 5, y: 14, type: 'hazard' },
  { id: 's3_h04', x: 15, y: 10, type: 'hazard' },
  { id: 's3_h05', x: 15, y: 14, type: 'hazard' },
];

const STAGE_3_SPAWN_PATH: GridCoord[] = [
  { x: 18, y: 12 }, { x: 19, y: 12 }, { x: 20, y: 12 }, { x: 21, y: 12 },
  { x: 22, y: 12 }, { x: 22, y: 13 }, { x: 22, y: 14 }, { x: 22, y: 15 },
  { x: 22, y: 16 }, { x: 22, y: 17 }, { x: 22, y: 18 }, { x: 22, y: 19 },
  { x: 22, y: 20 }, { x: 22, y: 21 }, { x: 21, y: 21 }, { x: 20, y: 21 },
  { x: 19, y: 21 }, { x: 18, y: 21 },
];

// ==========================================
// STAGE 4: THE CROSSFIRE
// Combined walls, breakable barriers & hazards
// Max capacity: 22 | Warp Gate: South perimeter (12, 23)
// ==========================================
const STAGE_4_OBSTACLES: Obstacle[] = [
  // Corner bunker walls surrounding central hub
  { id: 's4_w01', x: 9, y: 9, type: 'wall' },
  { id: 's4_w02', x: 10, y: 9, type: 'wall' },
  { id: 's4_w03', x: 9, y: 10, type: 'wall' },

  { id: 's4_w04', x: 14, y: 9, type: 'wall' },
  { id: 's4_w05', x: 15, y: 9, type: 'wall' },
  { id: 's4_w06', x: 15, y: 10, type: 'wall' },

  { id: 's4_w07', x: 9, y: 15, type: 'wall' },
  { id: 's4_w08', x: 10, y: 15, type: 'wall' },
  { id: 's4_w09', x: 9, y: 14, type: 'wall' },

  { id: 's4_w10', x: 15, y: 15, type: 'wall' },
  { id: 's4_w11', x: 14, y: 15, type: 'wall' },
  { id: 's4_w12', x: 15, y: 14, type: 'wall' },

  // Breakable bunker barrier gates
  { id: 's4_b01', x: 12, y: 9, type: 'barrier' },
  { id: 's4_b02', x: 12, y: 15, type: 'barrier' },
  { id: 's4_b03', x: 9, y: 12, type: 'barrier' },
  { id: 's4_b04', x: 15, y: 12, type: 'barrier' },

  // Flanking hazards
  { id: 's4_h01', x: 5, y: 9, type: 'hazard' },
  { id: 's4_h02', x: 19, y: 9, type: 'hazard' },
  { id: 's4_h03', x: 5, y: 15, type: 'hazard' },
  { id: 's4_h04', x: 19, y: 15, type: 'hazard' },
  { id: 's4_h05', x: 12, y: 12, type: 'hazard' },
];

const STAGE_4_SPAWN_PATH: GridCoord[] = [
  { x: 12, y: 4 }, { x: 12, y: 3 }, { x: 12, y: 2 }, { x: 12, y: 1 },
  { x: 11, y: 1 }, { x: 10, y: 1 }, { x: 9, y: 1 }, { x: 8, y: 1 },
  { x: 7, y: 1 }, { x: 6, y: 1 }, { x: 5, y: 1 }, { x: 4, y: 1 },
  { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 },
  { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }, { x: 1, y: 6 },
  { x: 1, y: 7 }, { x: 1, y: 8 },
];

// ==========================================
// STAGE 5: THE LABYRINTH
// Concentric corridors, barriers & resource management
// Max capacity: 16 | Warp Gate: East perimeter (23, 6)
// ==========================================
const STAGE_5_OBSTACLES: Obstacle[] = [
  // Outer ring wall segments
  { id: 's5_w01', x: 6, y: 6, type: 'wall' },
  { id: 's5_w02', x: 7, y: 6, type: 'wall' },
  { id: 's5_w03', x: 8, y: 6, type: 'wall' },
  { id: 's5_w04', x: 9, y: 6, type: 'wall' },
  { id: 's5_w05', x: 10, y: 6, type: 'wall' },
  { id: 's5_w06', x: 11, y: 6, type: 'wall' },
  { id: 's5_w07', x: 13, y: 6, type: 'wall' },
  { id: 's5_w08', x: 14, y: 6, type: 'wall' },
  { id: 's5_w09', x: 15, y: 6, type: 'wall' },
  { id: 's5_w10', x: 16, y: 6, type: 'wall' },
  { id: 's5_w11', x: 17, y: 6, type: 'wall' },
  { id: 's5_w12', x: 18, y: 6, type: 'wall' },

  { id: 's5_w13', x: 6, y: 18, type: 'wall' },
  { id: 's5_w14', x: 7, y: 18, type: 'wall' },
  { id: 's5_w15', x: 8, y: 18, type: 'wall' },
  { id: 's5_w16', x: 9, y: 18, type: 'wall' },
  { id: 's5_w17', x: 10, y: 18, type: 'wall' },
  { id: 's5_w18', x: 11, y: 18, type: 'wall' },
  { id: 's5_w19', x: 13, y: 18, type: 'wall' },
  { id: 's5_w20', x: 14, y: 18, type: 'wall' },
  { id: 's5_w21', x: 15, y: 18, type: 'wall' },
  { id: 's5_w22', x: 16, y: 18, type: 'wall' },
  { id: 's5_w23', x: 17, y: 18, type: 'wall' },
  { id: 's5_w24', x: 18, y: 18, type: 'wall' },

  { id: 's5_w25', x: 6, y: 7, type: 'wall' },
  { id: 's5_w26', x: 6, y: 8, type: 'wall' },
  { id: 's5_w27', x: 6, y: 9, type: 'wall' },
  { id: 's5_w28', x: 6, y: 10, type: 'wall' },
  { id: 's5_w29', x: 6, y: 14, type: 'wall' },
  { id: 's5_w30', x: 6, y: 15, type: 'wall' },
  { id: 's5_w31', x: 6, y: 16, type: 'wall' },
  { id: 's5_w32', x: 6, y: 17, type: 'wall' },

  { id: 's5_w33', x: 18, y: 7, type: 'wall' },
  { id: 's5_w34', x: 18, y: 8, type: 'wall' },
  { id: 's5_w35', x: 18, y: 9, type: 'wall' },
  { id: 's5_w36', x: 18, y: 10, type: 'wall' },
  { id: 's5_w37', x: 18, y: 14, type: 'wall' },
  { id: 's5_w38', x: 18, y: 15, type: 'wall' },
  { id: 's5_w39', x: 18, y: 16, type: 'wall' },
  { id: 's5_w40', x: 18, y: 17, type: 'wall' },

  // Inner ring barriers
  { id: 's5_b01', x: 12, y: 9, type: 'barrier' },
  { id: 's5_b02', x: 12, y: 15, type: 'barrier' },
  { id: 's5_b03', x: 9, y: 12, type: 'barrier' },
  { id: 's5_b04', x: 15, y: 12, type: 'barrier' },

  // Inner ring corner walls
  { id: 's5_w41', x: 9, y: 9, type: 'wall' },
  { id: 's5_w42', x: 15, y: 9, type: 'wall' },
  { id: 's5_w43', x: 9, y: 15, type: 'wall' },
  { id: 's5_w44', x: 15, y: 15, type: 'wall' },

  // Inner ring hazards
  { id: 's5_h01', x: 8, y: 8, type: 'hazard' },
  { id: 's5_h02', x: 16, y: 8, type: 'hazard' },
  { id: 's5_h03', x: 8, y: 16, type: 'hazard' },
  { id: 's5_h04', x: 16, y: 16, type: 'hazard' },
];

const STAGE_5_SPAWN_PATH: GridCoord[] = [
  { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 },
  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
  { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 },
  { x: 10, y: 2 }, { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 13, y: 2 },
];

// ==========================================
// STAGE 6: THE FINAL PROTOCOL
// The Apex Bastion trial of cybernetic navigation
// Max capacity: 14 | Warp Gate: North apex (12, 0)
// ==========================================
const STAGE_6_OBSTACLES: Obstacle[] = [
  // Apex gateway defenses
  { id: 's6_w01', x: 11, y: 4, type: 'wall' },
  { id: 's6_w02', x: 13, y: 4, type: 'wall' },
  { id: 's6_b01', x: 10, y: 4, type: 'barrier' },
  { id: 's6_b02', x: 14, y: 4, type: 'barrier' },

  // Mid bastion flanking walls
  { id: 's6_w03', x: 6, y: 10, type: 'wall' },
  { id: 's6_w04', x: 7, y: 10, type: 'wall' },
  { id: 's6_w05', x: 17, y: 10, type: 'wall' },
  { id: 's6_w06', x: 18, y: 10, type: 'wall' },
  { id: 's6_w07', x: 6, y: 14, type: 'wall' },
  { id: 's6_w08', x: 7, y: 14, type: 'wall' },
  { id: 's6_w09', x: 17, y: 14, type: 'wall' },
  { id: 's6_w10', x: 18, y: 14, type: 'wall' },

  // Inner sanctum vault walls
  { id: 's6_w11', x: 10, y: 11, type: 'wall' },
  { id: 's6_w12', x: 10, y: 13, type: 'wall' },
  { id: 's6_w13', x: 14, y: 11, type: 'wall' },
  { id: 's6_w14', x: 14, y: 13, type: 'wall' },

  // Inner sanctum barrier doors
  { id: 's6_b03', x: 10, y: 12, type: 'barrier' },
  { id: 's6_b04', x: 14, y: 12, type: 'barrier' },
  { id: 's6_b05', x: 12, y: 10, type: 'barrier' },
  { id: 's6_b06', x: 12, y: 14, type: 'barrier' },

  // Inner sanctum laser mine hazards
  { id: 's6_h01', x: 12, y: 12, type: 'hazard' },
  { id: 's6_h02', x: 8, y: 8, type: 'hazard' },
  { id: 's6_h03', x: 16, y: 8, type: 'hazard' },
  { id: 's6_h04', x: 8, y: 16, type: 'hazard' },
  { id: 's6_h05', x: 16, y: 16, type: 'hazard' },
];

const STAGE_6_SPAWN_PATH: GridCoord[] = [
  { x: 12, y: 17 }, { x: 12, y: 18 }, { x: 12, y: 19 }, { x: 12, y: 20 },
  { x: 12, y: 21 }, { x: 12, y: 22 }, { x: 11, y: 22 }, { x: 10, y: 22 },
  { x: 9, y: 22 }, { x: 8, y: 22 }, { x: 7, y: 22 }, { x: 6, y: 22 },
  { x: 5, y: 22 }, { x: 4, y: 22 },
];

// ==========================================
// MAZE CAMPAIGN CONFIGURATION TABLE
// ==========================================
export const MAZE_STAGES: readonly MazeStageConfig[] = [
  {
    stage: 1,
    name: 'THE INITIATION',
    description: 'Basic navigation & static architectural walls',
    maxIngressCapacity: 22,
    neonCoresRequired: NEON_CORES_PER_STAGE,
    spawnHead: { x: 8, y: 12 },
    spawnDirection: 'RIGHT',
    spawnPath: STAGE_1_SPAWN_PATH,
    warpGate: { x: 23, y: 12, active: false },
    obstacles: STAGE_1_OBSTACLES,
  },
  {
    stage: 2,
    name: 'THE SPLIT',
    description: 'Multiple route choices & destructible barriers',
    maxIngressCapacity: 20,
    neonCoresRequired: NEON_CORES_PER_STAGE,
    spawnHead: { x: 12, y: 20 },
    spawnDirection: 'UP',
    spawnPath: STAGE_2_SPAWN_PATH,
    warpGate: { x: 12, y: 0, active: false },
    obstacles: STAGE_2_OBSTACLES,
  },
  {
    stage: 3,
    name: 'THE GAUNTLET',
    description: 'Narrow passages & deliberate risk/reward hazards',
    maxIngressCapacity: 18,
    neonCoresRequired: NEON_CORES_PER_STAGE,
    spawnHead: { x: 18, y: 12 },
    spawnDirection: 'LEFT',
    spawnPath: STAGE_3_SPAWN_PATH,
    warpGate: { x: 0, y: 12, active: false },
    obstacles: STAGE_3_OBSTACLES,
  },
  {
    stage: 4,
    name: 'THE CROSSFIRE',
    description: 'Combined walls, breakable barriers & hazards',
    maxIngressCapacity: 22,
    neonCoresRequired: NEON_CORES_PER_STAGE,
    spawnHead: { x: 12, y: 4 },
    spawnDirection: 'DOWN',
    spawnPath: STAGE_4_SPAWN_PATH,
    warpGate: { x: 12, y: 23, active: false },
    obstacles: STAGE_4_OBSTACLES,
  },
  {
    stage: 5,
    name: 'THE LABYRINTH',
    description: 'Concentric corridors, barriers & resource management',
    maxIngressCapacity: 16,
    neonCoresRequired: NEON_CORES_PER_STAGE,
    spawnHead: { x: 4, y: 4 },
    spawnDirection: 'RIGHT',
    spawnPath: STAGE_5_SPAWN_PATH,
    warpGate: { x: 23, y: 6, active: false },
    obstacles: STAGE_5_OBSTACLES,
  },
  {
    stage: 6,
    name: 'THE FINAL PROTOCOL',
    description: 'The Apex Bastion trial of cybernetic reflexes',
    maxIngressCapacity: 14,
    neonCoresRequired: NEON_CORES_PER_STAGE,
    spawnHead: { x: 12, y: 17 },
    spawnDirection: 'UP',
    spawnPath: STAGE_6_SPAWN_PATH,
    warpGate: { x: 12, y: 0, active: false },
    obstacles: STAGE_6_OBSTACLES,
  },
];

/**
 * Retrieves the configuration for a given stage number (1..6).
 * Safely defaults to Stage 1 if number is out of bounds.
 */
export function getMazeStage(stageNumber: number): MazeStageConfig {
  const index = Math.max(1, Math.min(MAX_CAMPAIGN_STAGES, Math.floor(stageNumber))) - 1;
  return MAZE_STAGES[index];
}

/**
 * Calculates ingress snake placement, capping length to destination stage capacity
 * and converting each trimmed segment into +50 score points.
 */
export function calculateIngressSnake(
  currentSnake: GridCoord[],
  targetStage: MazeStageConfig
): {
  snake: GridCoord[];
  trimmedSegments: number;
  scoreBonus: number;
} {
  const currentLength = currentSnake.length;
  let targetLength = currentLength;
  let trimmedSegments = 0;
  let scoreBonus = 0;

  if (currentLength > targetStage.maxIngressCapacity) {
    trimmedSegments = currentLength - targetStage.maxIngressCapacity;
    scoreBonus = trimmedSegments * EXCESS_SEGMENT_SCORE_BONUS;
    targetLength = targetStage.maxIngressCapacity;
  }

  // Ensure minimum valid length of at least INITIAL_SNAKE_LENGTH (3)
  targetLength = Math.max(INITIAL_SNAKE_LENGTH, Math.min(targetLength, targetStage.spawnPath.length));

  const ingressSnake = targetStage.spawnPath.slice(0, targetLength).map(c => ({ ...c }));
  return {
    snake: ingressSnake,
    trimmedSegments,
    scoreBonus,
  };
}

/**
 * Initializes a fresh GameEngineState configured for the specified Maze Stage.
 */
export function createInitialMazeState(
  stageNumber: number = 1,
  gridWidth: number = GRID_SIZE.WIDTH,
  gridHeight: number = GRID_SIZE.HEIGHT,
  rng: () => number = Math.random
): GameEngineState {
  const stageConfig = getMazeStage(stageNumber);
  const snake = stageConfig.spawnPath.slice(0, INITIAL_SNAKE_LENGTH).map(c => ({ ...c }));
  const prevSnake = snake.map(c => ({ ...c }));

  const obstacles = stageConfig.obstacles.map(o => ({ ...o }));
  const warpGate: WarpGate = { ...stageConfig.warpGate, active: false };

  const state: GameEngineState = {
    mode: 'maze',
    gridWidth,
    gridHeight,
    snake,
    prevSnake,
    direction: stageConfig.spawnDirection,
    queuedDirections: [],
    pendingGrowth: 0,
    food: [],
    score: 0,
    level: 1,
    foodEaten: 0,
    bonusEaten: 0,
    maxLength: INITIAL_SNAKE_LENGTH,
    isAlive: true,
    isVictory: false,
    isStageClear: false,
    isCampaignComplete: false,
    powerUps: {
      slowMoUntil: 0,
      hasShield: false,
    },
    combo: 1,
    comboExpiresAt: 0,
    wallsWrapped: 0,
    shieldsUsed: 0,
    powerUpsCollected: 0,
    lastTickTime: 0,
    tickIntervalMs: calculateTickInterval('maze', 1, false),
    gameTimeMs: 0,
    obstacles,
    warpGate,
    stage: stageConfig.stage,
    stageFoodEaten: 0,
    maxCombo: 1,
    stageMaxCombo: 1,
  };

  // Place initial neon core food
  const occupied: GridCoord[] = [
    ...snake,
    ...obstacles.map(o => ({ x: o.x, y: o.y })),
    { x: warpGate.x, y: warpGate.y },
  ];

  const emptyCell = findEmptyCell(gridWidth, gridHeight, occupied, rng);
  if (emptyCell) {
    state.food.push({
      id: `food-stage-${stageConfig.stage}-0`,
      type: 'normal',
      position: emptyCell,
      points: POINTS.NORMAL_FOOD,
    });
  }

  return state;
}

/**
 * Progresses from the currently cleared stage to the next stage.
 * If stage 6 is completed, flags campaign completion.
 */
export function advanceMazeStage(
  currentState: GameEngineState,
  rng: () => number = Math.random
): {
  state: GameEngineState;
  isCampaignWon: boolean;
  scoreBonus: number;
  segmentsTrimmed: number;
} {
  // If already at or beyond Stage 6, mark campaign win and do NOT load Stage 7
  if (currentState.stage >= MAX_CAMPAIGN_STAGES) {
    return {
      state: {
        ...currentState,
        isCampaignComplete: true,
        isVictory: true,
        isStageClear: true,
        isAlive: false,
      },
      isCampaignWon: true,
      scoreBonus: 0,
      segmentsTrimmed: 0,
    };
  }

  const nextStageNum = currentState.stage + 1;
  const nextStage = getMazeStage(nextStageNum);
  const ingress = calculateIngressSnake(currentState.snake, nextStage);

  const nextObstacles = nextStage.obstacles.map(o => ({ ...o }));
  const nextWarpGate: WarpGate = { ...nextStage.warpGate, active: false };

  const finalScore = currentState.score + ingress.scoreBonus;
  const newMaxLength = Math.max(currentState.maxLength, ingress.snake.length);

  const nowMs = Date.now();
  const isSlowMoActive = nowMs < currentState.powerUps.slowMoUntil;
  const tickIntervalMs = calculateTickInterval('maze', currentState.level, isSlowMoActive);

  const nextState: GameEngineState = {
    ...currentState,
    stage: nextStage.stage,
    stageFoodEaten: 0,
    obstacles: nextObstacles,
    warpGate: nextWarpGate,
    snake: ingress.snake,
    prevSnake: ingress.snake.map(s => ({ ...s })),
    direction: nextStage.spawnDirection,
    queuedDirections: [],
    score: finalScore,
    pendingGrowth: 0,
    isAlive: true,
    isVictory: false,
    isStageClear: false,
    isCampaignComplete: false,
    maxLength: newMaxLength,
    tickIntervalMs,
    food: [],
    stageMaxCombo: 1,
  };

  // Spawn fresh initial core on next stage
  const occupied: GridCoord[] = [
    ...ingress.snake,
    ...nextObstacles.map(o => ({ x: o.x, y: o.y })),
    { x: nextWarpGate.x, y: nextWarpGate.y },
  ];

  const emptyCell = findEmptyCell(nextState.gridWidth, nextState.gridHeight, occupied, rng);
  if (emptyCell) {
    nextState.food.push({
      id: `food-stage-${nextStage.stage}-0`,
      type: 'normal',
      position: emptyCell,
      points: POINTS.NORMAL_FOOD,
    });
  }

  return {
    state: nextState,
    isCampaignWon: false,
    scoreBonus: ingress.scoreBonus,
    segmentsTrimmed: ingress.trimmedSegments,
  };
}
