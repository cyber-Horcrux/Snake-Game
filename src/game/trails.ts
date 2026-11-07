/**
 * Snake Trails Domain Logic
 * Pure, deterministic functions for trail lookups, ownership validation,
 * unlock eligibility checking, and state sanitization.
 * 
 * Target audience: Children & Teenagers
 * Design: Purely cosmetic, fair progression, no paid mechanics or grinding walls.
 */

import type {
  PlayerTrailsState,
  SnakeTrailId,
  TrailDefinition,
  TrailUnlockCondition,
  TrailUnlockContext,
} from './types.ts';

export const STARTER_TRAIL_IDS: readonly SnakeTrailId[] = [
  'none',
  'cyber_pulse',
] as const;

export const ALL_TRAIL_IDS: readonly SnakeTrailId[] = [
  'none',
  'cyber_pulse',
  'matrix_stream',
  'plasma_fire',
  'hyper_streak',
  'frost_vapor',
  'solar_radiance',
  'void_singularity',
] as const;

export const DEFAULT_PLAYER_TRAILS_STATE: PlayerTrailsState = {
  equippedTrailId: 'cyber_pulse',
  unlockedTrailIds: ['none', 'cyber_pulse'],
};

export const TRAILS: Record<SnakeTrailId, TrailDefinition> = {
  none: {
    id: 'none',
    name: 'Stealth Void',
    tagline: 'Silent wake, zero photonic emissions',
    color: '#64748B',
    secondaryColor: '#334155',
    glowColor: '#00000000',
    style: 'none',
    unlock: {
      type: 'default',
      description: 'Available by default',
    },
  },
  cyber_pulse: {
    id: 'cyber_pulse',
    name: 'Cyber Pulse',
    tagline: 'Coherent cyan harmonic waveform',
    color: '#00F5FF',
    secondaryColor: '#38E1FF',
    glowColor: '#00F5FF',
    style: 'pulse',
    unlock: {
      type: 'default',
      description: 'Available by default',
    },
  },
  matrix_stream: {
    id: 'matrix_stream',
    name: 'Matrix Stream',
    tagline: 'Digital phosphor binary cascade',
    color: '#39FF14',
    secondaryColor: '#10B981',
    glowColor: '#39FF14',
    style: 'matrix',
    unlock: {
      type: 'level',
      requiredLevel: 4,
      description: 'Reach Level 4 (Vector Viper)',
    },
  },
  plasma_fire: {
    id: 'plasma_fire',
    name: 'Plasma Overdrive',
    tagline: 'Superheated orange-magenta thermal wake',
    color: '#FF8A00',
    secondaryColor: '#FF2E93',
    glowColor: '#FF8A00',
    style: 'plasma',
    unlock: {
      type: 'level',
      requiredLevel: 8,
      description: 'Reach Level 8 (Circuit Cobra)',
    },
  },
  hyper_streak: {
    id: 'hyper_streak',
    name: 'Hyper Light Arc',
    tagline: 'High-frequency ultraviolet slipstream',
    color: '#9865FF',
    secondaryColor: '#FF4FD8',
    glowColor: '#9865FF',
    style: 'streak',
    unlock: {
      type: 'level',
      requiredLevel: 12,
      description: 'Reach Level 12',
    },
    altUnlock: {
      type: 'food_single_run',
      requiredFoodSingleRun: 25,
      description: 'Or eat 25 food in a single run',
    },
  },
  frost_vapor: {
    id: 'frost_vapor',
    name: 'Cryo Vapor',
    tagline: 'Sub-zero liquid nitrogen condensation plume',
    color: '#E0F7FA',
    secondaryColor: '#00E5FF',
    glowColor: '#00E5FF',
    style: 'vapor',
    unlock: {
      type: 'zen_wraps',
      requiredZenWraps: 30,
      description: 'Wrap 30 boundaries in Zen Mode',
    },
    altUnlock: {
      type: 'level',
      requiredLevel: 18,
      description: 'Or reach Level 18',
    },
  },
  solar_radiance: {
    id: 'solar_radiance',
    name: 'Solar Radiance',
    tagline: 'Coronal golden starlight wake with solar glints',
    color: '#FFD700',
    secondaryColor: '#FFB300',
    glowColor: '#FFD700',
    style: 'solar',
    unlock: {
      type: 'level',
      requiredLevel: 25,
      description: 'Reach Level 25 (Solar Sentinel)',
    },
  },
  void_singularity: {
    id: 'void_singularity',
    name: 'Void Horizon',
    tagline: 'Gravitational quantum singularity distortion trace',
    color: '#7C4DFF',
    secondaryColor: '#00F5FF',
    glowColor: '#7C4DFF',
    style: 'singularity',
    unlock: {
      type: 'maze_stage',
      requiredMazeStage: 3,
      description: 'Clear Stage 3 in Maze Campaign',
    },
    altUnlock: {
      type: 'level',
      requiredLevel: 35,
      description: 'Or reach Level 35',
    },
  },
};

/**
 * Type guard for validating if an unknown value is an authorized SnakeTrailId.
 */
export function isValidTrailId(val: unknown): val is SnakeTrailId {
  return typeof val === 'string' && (ALL_TRAIL_IDS as readonly string[]).includes(val);
}

/**
 * Retrieves the trail definition for a given SnakeTrailId, falling back safely to Cyber Pulse.
 */
export function getTrailDefinition(id: SnakeTrailId | string | null | undefined): TrailDefinition {
  if (isValidTrailId(id)) {
    return TRAILS[id];
  }
  return TRAILS.cyber_pulse;
}

/**
 * Returns all 8 authorized trail definitions in standard display order.
 */
export function getAllTrailDefinitions(): TrailDefinition[] {
  return ALL_TRAIL_IDS.map(id => TRAILS[id]);
}

/**
 * Checks whether a given trail ID is unlocked within the provided PlayerTrailsState.
 */
export function isTrailUnlocked(trailId: SnakeTrailId, state: PlayerTrailsState): boolean {
  if (!state || !Array.isArray(state.unlockedTrailIds)) {
    return STARTER_TRAIL_IDS.includes(trailId);
  }
  return state.unlockedTrailIds.includes(trailId);
}

/**
 * Evaluates whether a trail is eligible for unlocking given the player's telemetry context.
 * Evaluates primary unlock condition and optional alternative condition.
 */
export function checkTrailUnlockEligibility(
  trailOrId: TrailDefinition | SnakeTrailId,
  context: Partial<TrailUnlockContext> & {
    playerLevel?: number;
    zenScreenWraps?: number;
    mazeStagesCleared?: number;
    lifetimeFoodEaten?: number; // Kept in interface for backward compatibility, strictly ignored for single-run food requirement
  }
): boolean {
  const trail = typeof trailOrId === 'string' ? getTrailDefinition(trailOrId) : trailOrId;
  if (!trail) return false;

  const safeLevel = Math.max(1, Math.floor(context.playerLevel ?? context.level ?? 1));
  const safeZenWraps = Math.max(0, Math.floor(context.zenScreenWraps ?? context.zenWallsWrapped ?? 0));
  const safeMazeStage = Math.max(0, Math.floor(context.mazeStagesCleared ?? context.highestMazeStage ?? 0));
  // Authoritative single-run food counter: never substitute cumulative lifetime food statistics
  const safeMaxFood = Math.max(0, Math.floor(context.maxFoodInRun ?? 0));

  const checkCondition = (cond?: TrailUnlockCondition): boolean => {
    if (!cond) return false;
    switch (cond.type) {
      case 'default':
        return true;
      case 'level':
        return cond.requiredLevel !== undefined && safeLevel >= cond.requiredLevel;
      case 'zen_wraps':
        return cond.requiredZenWraps !== undefined && safeZenWraps >= cond.requiredZenWraps;
      case 'maze_stage':
        return cond.requiredMazeStage !== undefined && safeMazeStage >= cond.requiredMazeStage;
      case 'food_single_run':
        return cond.requiredFoodSingleRun !== undefined && safeMaxFood >= cond.requiredFoodSingleRun;
      default:
        return false;
    }
  };

  if (checkCondition(trail.unlock)) {
    return true;
  }

  if (trail.altUnlock && checkCondition(trail.altUnlock)) {
    return true;
  }

  return false;
}

/**
 * Pure, deterministic reconciliation function that evaluates all 8 trails against
 * player progression context, preserving all previously unlocked trails and adding newly
 * earned ones without duplication.
 * 
 * Guarantees idempotency: running repeatedly produces 0 duplicate entries.
 */
export function reconcilePlayerTrails(
  currentState: PlayerTrailsState,
  context: TrailUnlockContext
): { state: PlayerTrailsState; newlyUnlocked: SnakeTrailId[] } {
  const sanitizedCurrent = sanitizePlayerTrailsState(currentState);
  const unlockedSet = new Set<SnakeTrailId>(sanitizedCurrent.unlockedTrailIds);
  const newlyUnlocked: SnakeTrailId[] = [];

  for (const trailId of ALL_TRAIL_IDS) {
    if (!unlockedSet.has(trailId)) {
      const def = TRAILS[trailId];
      if (def && checkTrailUnlockEligibility(def, context)) {
        unlockedSet.add(trailId);
        newlyUnlocked.push(trailId);
      }
    }
  }

  // Preserve canonical display order in unlockedTrailIds
  const orderedUnlocked: SnakeTrailId[] = ALL_TRAIL_IDS.filter(id => unlockedSet.has(id));

  const updatedState: PlayerTrailsState = {
    equippedTrailId: sanitizedCurrent.equippedTrailId,
    unlockedTrailIds: orderedUnlocked,
  };

  return {
    state: updatedState,
    newlyUnlocked,
  };
}

/**
 * Sanitizes and defensive-repairs raw or corrupt player trail data.
 * - Always ensures starter trails (none, cyber_pulse) are unlocked.
 * - Filters out unknown or corrupt IDs.
 * - Ensures equippedTrailId is valid and exists in unlockedTrailIds; falls back to cyber_pulse.
 */
export function sanitizePlayerTrailsState(raw: unknown): PlayerTrailsState {
  if (typeof raw !== 'object' || raw === null) {
    return {
      equippedTrailId: 'cyber_pulse',
      unlockedTrailIds: [...DEFAULT_PLAYER_TRAILS_STATE.unlockedTrailIds],
    };
  }

  const cast = raw as Record<string, unknown>;
  const unlockedSet = new Set<SnakeTrailId>(STARTER_TRAIL_IDS);

  if (Array.isArray(cast.unlockedTrailIds)) {
    for (const item of cast.unlockedTrailIds) {
      if (isValidTrailId(item)) {
        unlockedSet.add(item);
      }
    }
  }

  const orderedUnlocked: SnakeTrailId[] = ALL_TRAIL_IDS.filter(id => unlockedSet.has(id));

  let equippedTrailId: SnakeTrailId = 'cyber_pulse';
  if (isValidTrailId(cast.equippedTrailId) && unlockedSet.has(cast.equippedTrailId)) {
    equippedTrailId = cast.equippedTrailId;
  }

  return {
    equippedTrailId,
    unlockedTrailIds: orderedUnlocked,
  };
}

/**
 * Returns player-facing unlock requirement text for a trail.
 */
export function getTrailUnlockDescription(trailId: SnakeTrailId): string {
  const def = TRAILS[trailId];
  if (!def) return 'Available by default';
  if (def.unlock.type === 'default') {
    return 'Available by default';
  }
  if (def.altUnlock) {
    return `${def.unlock.description} (${def.altUnlock.description})`;
  }
  return def.unlock.description;
}
