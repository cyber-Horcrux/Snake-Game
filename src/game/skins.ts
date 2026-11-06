/**
 * Snake Skins Domain Logic
 * Pure, deterministic functions for skin lookups, ownership validation,
 * unlock eligibility checking, and state sanitization.
 * 
 * Target audience: Children & Teenagers
 * Design: Purely cosmetic, fair progression, no paid mechanics or grinding walls.
 */

import type {
  PlayerSkinsState,
  SkinDefinition,
  SnakeSkinId,
} from './types.ts';
import { SKINS } from './constants.ts';

export const STARTER_SKIN_IDS: readonly SnakeSkinId[] = [
  'cyber_cyan',
  'matrix_green',
] as const;

export const ALL_SKIN_IDS: readonly SnakeSkinId[] = [
  'cyber_cyan',
  'matrix_green',
  'synth_sunset',
  'hyper_violet',
  'crimson_blaze',
  'arctic_frost',
  'gold_prestige',
  'apex_void',
] as const;

export const DEFAULT_PLAYER_SKINS_STATE: PlayerSkinsState = {
  equippedSkinId: 'cyber_cyan',
  unlockedSkinIds: ['cyber_cyan', 'matrix_green'],
};

export interface SkinUnlockContext {
  level: number;
  zenWallsWrapped: number;
  campaignVictories: number;
}

/**
 * Type guard for validating if an unknown value is an authorized SnakeSkinId.
 */
export function isValidSkinId(val: unknown): val is SnakeSkinId {
  return typeof val === 'string' && (ALL_SKIN_IDS as readonly string[]).includes(val);
}

/**
 * Retrieves the skin definition for a given SnakeSkinId, falling back to Cyber Cyan.
 */
export function getSkinDefinition(id: SnakeSkinId): SkinDefinition {
  return SKINS[id] || SKINS.cyber_cyan;
}

/**
 * Returns all 8 authorized skin definitions in standard display order.
 */
export function getAllSkinDefinitions(): SkinDefinition[] {
  return ALL_SKIN_IDS.map(id => SKINS[id]);
}

/**
 * Checks whether a given skin ID is unlocked within the provided PlayerSkinsState.
 */
export function isSkinUnlocked(skinId: SnakeSkinId, state: PlayerSkinsState): boolean {
  if (!state || !Array.isArray(state.unlockedSkinIds)) {
    return STARTER_SKIN_IDS.includes(skinId);
  }
  return state.unlockedSkinIds.includes(skinId);
}

/**
 * Evaluates whether a skin is eligible for unlocking given the player's telemetry context.
 * Evaluates primary unlock condition and optional alternative condition.
 */
export function checkSkinUnlockEligibility(
  skin: SkinDefinition,
  context: SkinUnlockContext
): boolean {
  const safeLevel = Math.max(1, Math.floor(context.level || 1));
  const safeZenWraps = Math.max(0, Math.floor(context.zenWallsWrapped || 0));
  const safeCampaignVictories = Math.max(0, Math.floor(context.campaignVictories || 0));

  const checkCondition = (cond: SkinDefinition['unlock']): boolean => {
    switch (cond.type) {
      case 'default':
        return true;
      case 'level':
        return cond.requiredLevel !== undefined && safeLevel >= cond.requiredLevel;
      case 'zen_wraps':
        return cond.requiredZenWraps !== undefined && safeZenWraps >= cond.requiredZenWraps;
      case 'campaign_victory':
        return cond.requiredCampaignVictory === true && safeCampaignVictories >= 1;
      default:
        return false;
    }
  };

  if (checkCondition(skin.unlock)) {
    return true;
  }

  if (skin.altUnlock && checkCondition(skin.altUnlock)) {
    return true;
  }

  return false;
}

/**
 * Pure, deterministic reconciliation function that evaluates all 8 skins against
 * player progression context, preserving all previously unlocked skins and adding newly
 * earned ones without duplication.
 * 
 * Guarantees idempotency: running repeatedly produces 0 duplicate entries.
 */
export function reconcilePlayerSkins(
  currentState: PlayerSkinsState,
  context: SkinUnlockContext
): { state: PlayerSkinsState; newlyUnlocked: SnakeSkinId[] } {
  const sanitizedCurrent = sanitizePlayerSkinsState(currentState);
  const unlockedSet = new Set<SnakeSkinId>(sanitizedCurrent.unlockedSkinIds);
  const newlyUnlocked: SnakeSkinId[] = [];

  for (const skinId of ALL_SKIN_IDS) {
    if (!unlockedSet.has(skinId)) {
      const def = SKINS[skinId];
      if (def && checkSkinUnlockEligibility(def, context)) {
        unlockedSet.add(skinId);
        newlyUnlocked.push(skinId);
      }
    }
  }

  // Preserve canonical display order in unlockedSkinIds
  const orderedUnlocked: SnakeSkinId[] = ALL_SKIN_IDS.filter(id => unlockedSet.has(id));

  const updatedState: PlayerSkinsState = {
    equippedSkinId: sanitizedCurrent.equippedSkinId,
    unlockedSkinIds: orderedUnlocked,
  };

  return {
    state: updatedState,
    newlyUnlocked,
  };
}

/**
 * Sanitizes and defensive-repairs raw or corrupt player skin data.
 * - Always ensures starter skins (cyber_cyan, matrix_green) are unlocked.
 * - Filters out unknown or corrupt IDs.
 * - Ensures equippedSkinId is valid and exists in unlockedSkinIds; falls back to cyber_cyan.
 */
export function sanitizePlayerSkinsState(raw: unknown): PlayerSkinsState {
  if (typeof raw !== 'object' || raw === null) {
    return {
      equippedSkinId: 'cyber_cyan',
      unlockedSkinIds: [...DEFAULT_PLAYER_SKINS_STATE.unlockedSkinIds],
    };
  }

  const cast = raw as Record<string, unknown>;
  const unlockedSet = new Set<SnakeSkinId>(STARTER_SKIN_IDS);

  if (Array.isArray(cast.unlockedSkinIds)) {
    for (const item of cast.unlockedSkinIds) {
      if (isValidSkinId(item)) {
        unlockedSet.add(item);
      }
    }
  }

  const orderedUnlocked: SnakeSkinId[] = ALL_SKIN_IDS.filter(id => unlockedSet.has(id));

  let equippedSkinId: SnakeSkinId = 'cyber_cyan';
  if (isValidSkinId(cast.equippedSkinId) && unlockedSet.has(cast.equippedSkinId)) {
    equippedSkinId = cast.equippedSkinId;
  }

  return {
    equippedSkinId,
    unlockedSkinIds: orderedUnlocked,
  };
}

/**
 * Returns player-facing unlock requirement text for a skin.
 */
export function getSkinUnlockDescription(skinId: SnakeSkinId): string {
  const def = SKINS[skinId];
  if (!def) return 'Unlocked';
  if (def.unlock.type === 'default') {
    return 'Available by default';
  }
  if (def.altUnlock) {
    return `${def.unlock.description} (${def.altUnlock.description})`;
  }
  return def.unlock.description;
}
