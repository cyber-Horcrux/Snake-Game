/**
 * Storage and Persistence Module
 * Robust schema validation, error handling, and fallback defaults.
 */
import type { BoardThemeId, ControlMode, GameMode, GameSettings, ModeBestScores, MazeProgress, PlayerSkinsState, PlayerThemesState, PlayerTrailsState, SnakeSkinId, SnakeTrailId, ThemeUnlockContext, TrailUnlockContext } from './types.ts';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants.ts';
import {
  ALL_SKIN_IDS,
  DEFAULT_PLAYER_SKINS_STATE,
  STARTER_SKIN_IDS,
  type SkinUnlockContext,
  isSkinUnlocked,
  isValidSkinId,
  reconcilePlayerSkins,
  sanitizePlayerSkinsState,
} from './skins.ts';
import {
  ALL_TRAIL_IDS,
  DEFAULT_PLAYER_TRAILS_STATE,
  STARTER_TRAIL_IDS,
  isTrailUnlocked,
  isValidTrailId,
  reconcilePlayerTrails,
  sanitizePlayerTrailsState,
} from './trails.ts';
import {
  ALL_THEME_IDS,
  DEFAULT_PLAYER_THEMES_STATE,
  STARTER_THEME_IDS,
  isThemeUnlocked,
  isValidThemeId,
  reconcilePlayerThemes,
  sanitizePlayerThemesState,
} from './themes.ts';
import { loadPlayerProgression } from './levels.ts';
import { loadStats } from './stats.ts';

export const DEFAULT_BEST_SCORES: ModeBestScores = {
  classic: 0,
  zen: 0,
  rush: 0,
};

// Mockable storage interface for unit testing without DOM window
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test storage access
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage might be blocked or unavailable (e.g. strict private browsing)
  }
  return null;
}

export function loadBestScores(storage: StorageLike | null = getBrowserStorage()): ModeBestScores {
  if (!storage) return { ...DEFAULT_BEST_SCORES };

  try {
    const raw = storage.getItem(STORAGE_KEYS.BEST_SCORES) || storage.getItem('neonsnake_best_scores');
    if (!raw) return { ...DEFAULT_BEST_SCORES };

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_BEST_SCORES };
    }

    return {
      classic: Number.isFinite(parsed.classic) && parsed.classic >= 0 ? Math.floor(parsed.classic) : 0,
      zen: Number.isFinite(parsed.zen) && parsed.zen >= 0 ? Math.floor(parsed.zen) : 0,
      rush: Number.isFinite(parsed.rush) && parsed.rush >= 0 ? Math.floor(parsed.rush) : 0,
    };
  } catch {
    return { ...DEFAULT_BEST_SCORES };
  }
}

export function saveBestScores(scores: ModeBestScores, storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;

  try {
    const payload = JSON.stringify({
      classic: Math.max(0, Math.floor(scores.classic || 0)),
      zen: Math.max(0, Math.floor(scores.zen || 0)),
      rush: Math.max(0, Math.floor(scores.rush || 0)),
    });
    storage.setItem(STORAGE_KEYS.BEST_SCORES, payload);
    return true;
  } catch {
    return false;
  }
}

export function updateBestScore(
  mode: GameMode,
  newScore: number,
  storage: StorageLike | null = getBrowserStorage()
): { isNewBest: boolean; currentBest: number } {
  const currentScores = loadBestScores(storage);
  const currentBest = currentScores[mode] || 0;

  if (newScore > currentBest) {
    const updated = {
      ...currentScores,
      [mode]: newScore,
    };
    saveBestScores(updated, storage);
    return { isNewBest: true, currentBest: newScore };
  }

  return { isNewBest: false, currentBest };
}

export function resetBestScores(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.BEST_SCORES, JSON.stringify(DEFAULT_BEST_SCORES));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings(storage: StorageLike | null = getBrowserStorage()): GameSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };

  try {
    const raw = storage.getItem(STORAGE_KEYS.SETTINGS) || storage.getItem('neonsnake_settings');
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_SETTINGS };
    }

    const sfxEnabled = typeof parsed.audio?.sfxEnabled === 'boolean' ? parsed.audio.sfxEnabled : DEFAULT_SETTINGS.audio.sfxEnabled;
    const rawVolume = parsed.audio?.sfxVolume;
    const sfxVolume = typeof rawVolume === 'number' && Number.isFinite(rawVolume) ? Math.max(0, Math.min(1, rawVolume)) : DEFAULT_SETTINGS.audio.sfxVolume;

    const validVisuals = ['high', 'performance', 'reduced'];
    const visualEffects = validVisuals.includes(parsed.visualEffects) ? parsed.visualEffects : DEFAULT_SETTINGS.visualEffects;

    const validDpad = ['auto', 'always', 'never'];
    const dpadPreference = validDpad.includes(parsed.dpadPreference) ? parsed.dpadPreference : DEFAULT_SETTINGS.dpadPreference;

    const validSkins: SnakeSkinId[] = [...ALL_SKIN_IDS];
    const skin = validSkins.includes(parsed.skin) ? parsed.skin : DEFAULT_SETTINGS.skin;

    const validTrails: SnakeTrailId[] = [...ALL_TRAIL_IDS];
    const trail = validTrails.includes(parsed.trail) ? parsed.trail : DEFAULT_SETTINGS.trail;

    const validThemes: BoardThemeId[] = [...ALL_THEME_IDS];
    const boardTheme = validThemes.includes(parsed.boardTheme) ? parsed.boardTheme : DEFAULT_SETTINGS.boardTheme;

    const validControlModes: ControlMode[] = ['swipe', 'buttons', 'both'];
    let controlMode: ControlMode;
    if (validControlModes.includes(parsed.controlMode)) {
      controlMode = parsed.controlMode;
    } else if (parsed.dpadPreference === 'never') {
      controlMode = 'swipe';
    } else if (parsed.dpadPreference === 'always') {
      controlMode = 'buttons';
    } else {
      controlMode = DEFAULT_SETTINGS.controlMode;
    }

    return {
      audio: {
        sfxEnabled,
        sfxVolume,
      },
      visualEffects,
      dpadPreference,
      skin,
      trail,
      boardTheme,
      controlMode,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings, storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// MAZE CAMPAIGN PROGRESS PERSISTENCE
// ==========================================

export const DEFAULT_MAZE_PROGRESS: MazeProgress = {
  highestStageUnlocked: 1,
  totalCampaignsWon: 0,
  totalMazesCleared: 0,
  bestCampaignScore: 0,
};

export function loadMazeProgress(storage: StorageLike | null = getBrowserStorage()): MazeProgress {
  if (!storage) return { ...DEFAULT_MAZE_PROGRESS };

  try {
    const raw = storage.getItem(STORAGE_KEYS.MAZE_PROGRESS) || storage.getItem('neonsnake_maze_progress');
    if (!raw) return { ...DEFAULT_MAZE_PROGRESS };

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_MAZE_PROGRESS };
    }

    const rawStage = parsed.highestStageUnlocked;
    const highestStageUnlocked =
      typeof rawStage === 'number' && Number.isFinite(rawStage)
        ? Math.max(1, Math.min(6, Math.floor(rawStage)))
        : DEFAULT_MAZE_PROGRESS.highestStageUnlocked;

    const rawWins = parsed.totalCampaignsWon;
    const totalCampaignsWon =
      typeof rawWins === 'number' && Number.isFinite(rawWins) && rawWins >= 0
        ? Math.floor(rawWins)
        : DEFAULT_MAZE_PROGRESS.totalCampaignsWon;

    const rawCleared = parsed.totalMazesCleared;
    const totalMazesCleared =
      typeof rawCleared === 'number' && Number.isFinite(rawCleared) && rawCleared >= 0
        ? Math.floor(rawCleared)
        : DEFAULT_MAZE_PROGRESS.totalMazesCleared;

    const rawBestScore = parsed.bestCampaignScore;
    const bestCampaignScore =
      typeof rawBestScore === 'number' && Number.isFinite(rawBestScore) && rawBestScore >= 0
        ? Math.floor(rawBestScore)
        : DEFAULT_MAZE_PROGRESS.bestCampaignScore;

    return {
      highestStageUnlocked,
      totalCampaignsWon,
      totalMazesCleared,
      bestCampaignScore,
    };
  } catch {
    return { ...DEFAULT_MAZE_PROGRESS };
  }
}

export function saveMazeProgress(
  progress: MazeProgress,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;

  try {
    const sanitized: MazeProgress = {
      highestStageUnlocked: Math.max(1, Math.min(6, Math.floor(progress.highestStageUnlocked || 1))),
      totalCampaignsWon: Math.max(0, Math.floor(progress.totalCampaignsWon || 0)),
      totalMazesCleared: Math.max(0, Math.floor(progress.totalMazesCleared || 0)),
      bestCampaignScore: Math.max(0, Math.floor(progress.bestCampaignScore || 0)),
    };
    storage.setItem(STORAGE_KEYS.MAZE_PROGRESS, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function recordStageClear(
  stageNumber: number,
  runScore: number,
  storage: StorageLike | null = getBrowserStorage()
): MazeProgress {
  const current = loadMazeProgress(storage);
  const nextUnlock = Math.max(1, Math.min(6, stageNumber + 1));
  const newHighest = Math.max(current.highestStageUnlocked, nextUnlock);
  const newMazesCleared = current.totalMazesCleared + 1;
  const isFinalStage = stageNumber >= 6;
  const newWins = isFinalStage ? current.totalCampaignsWon + 1 : current.totalCampaignsWon;
  const newBestScore = Math.max(current.bestCampaignScore, Math.floor(runScore || 0));

  const updated: MazeProgress = {
    highestStageUnlocked: newHighest,
    totalCampaignsWon: newWins,
    totalMazesCleared: newMazesCleared,
    bestCampaignScore: newBestScore,
  };

  saveMazeProgress(updated, storage);
  return updated;
}

export function recordCampaignCompletion(
  finalScore: number,
  storage: StorageLike | null = getBrowserStorage()
): MazeProgress {
  return recordStageClear(6, finalScore, storage);
}

export function resetMazeProgress(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.MAZE_PROGRESS, JSON.stringify(DEFAULT_MAZE_PROGRESS));
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// PLAYER SKINS PERSISTENCE
// ==========================================

export function loadPlayerSkins(storage: StorageLike | null = getBrowserStorage()): PlayerSkinsState {
  if (!storage) {
    return {
      equippedSkinId: DEFAULT_PLAYER_SKINS_STATE.equippedSkinId,
      unlockedSkinIds: [...DEFAULT_PLAYER_SKINS_STATE.unlockedSkinIds],
    };
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.SKINS);
    if (!raw) {
      // If skin ledger is missing, recover legacy starter skin preference if set in settings
      const settings = loadSettings(storage);
      const equippedCandidate = (settings && STARTER_SKIN_IDS.includes(settings.skin as any))
        ? (settings.skin as SnakeSkinId)
        : DEFAULT_PLAYER_SKINS_STATE.equippedSkinId;

      return {
        equippedSkinId: equippedCandidate,
        unlockedSkinIds: [...DEFAULT_PLAYER_SKINS_STATE.unlockedSkinIds],
      };
    }
    const parsed = JSON.parse(raw);
    return sanitizePlayerSkinsState(parsed);
  } catch {
    let equippedCandidate = DEFAULT_PLAYER_SKINS_STATE.equippedSkinId;
    try {
      const settings = loadSettings(storage);
      if (settings && STARTER_SKIN_IDS.includes(settings.skin as any)) {
        equippedCandidate = settings.skin as SnakeSkinId;
      }
    } catch {
      // fallback to default
    }
    return {
      equippedSkinId: equippedCandidate,
      unlockedSkinIds: [...DEFAULT_PLAYER_SKINS_STATE.unlockedSkinIds],
    };
  }
}

export function savePlayerSkins(
  skinsState: PlayerSkinsState,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;

  try {
    const sanitized = sanitizePlayerSkinsState(skinsState);
    storage.setItem(STORAGE_KEYS.SKINS, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function equipSkin(
  skinId: SnakeSkinId,
  storage: StorageLike | null = getBrowserStorage()
): { success: boolean; state: PlayerSkinsState; error?: string } {
  const current = loadPlayerSkins(storage);
  if (!isSkinUnlocked(skinId, current)) {
    return {
      success: false,
      state: current,
      error: `Skin '${skinId}' is not unlocked.`,
    };
  }

  const updated: PlayerSkinsState = {
    equippedSkinId: skinId,
    unlockedSkinIds: current.unlockedSkinIds,
  };

  const savedSkins = savePlayerSkins(updated, storage);
  if (!savedSkins) {
    return {
      success: false,
      state: current,
      error: 'Failed to write skin persistence to storage.',
    };
  }

  // Synchronize GameSettings.skin with two-storage rollback guarantee
  const settings = loadSettings(storage);
  if (settings.skin !== skinId) {
    const savedSettings = saveSettings({ ...settings, skin: skinId }, storage);
    if (!savedSettings) {
      // Rollback skins storage to current to prevent desynchronization
      const rollbackSuccess = savePlayerSkins(current, storage);
      if (!rollbackSuccess) {
        return {
          success: false,
          state: updated,
          error: 'Failed to synchronize skin with game settings. Critical: Storage rollback also failed.',
        };
      }
      return {
        success: false,
        state: current,
        error: 'Failed to synchronize skin with game settings.',
      };
    }
  }

  return {
    success: true,
    state: updated,
  };
}

export function unlockSkin(
  skinId: SnakeSkinId,
  storage: StorageLike | null = getBrowserStorage()
): { success: boolean; state: PlayerSkinsState } {
  if (!isValidSkinId(skinId)) {
    const current = loadPlayerSkins(storage);
    return { success: false, state: current };
  }

  const current = loadPlayerSkins(storage);
  if (current.unlockedSkinIds.includes(skinId)) {
    return { success: true, state: current };
  }

  const updated: PlayerSkinsState = {
    equippedSkinId: current.equippedSkinId,
    unlockedSkinIds: [...current.unlockedSkinIds, skinId],
  };

  const sanitized = sanitizePlayerSkinsState(updated);
  savePlayerSkins(sanitized, storage);

  return {
    success: true,
    state: sanitized,
  };
}

export function resetPlayerSkins(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    const currentSkins = loadPlayerSkins(storage);
    const savedSkins = savePlayerSkins(DEFAULT_PLAYER_SKINS_STATE, storage);
    if (!savedSkins) {
      return false;
    }

    const settings = loadSettings(storage);
    if (settings.skin !== 'cyber_cyan') {
      const savedSettings = saveSettings({ ...settings, skin: 'cyber_cyan' }, storage);
      if (!savedSettings) {
        // Rollback skins ledger to previous state so we don't leave partial reset
        savePlayerSkins(currentSkins, storage);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export interface SkinReconciliationResult {
  skinsState: PlayerSkinsState;
  newlyUnlocked: SnakeSkinId[];
  mirrorRepaired: boolean;
  wasMigrated: boolean;
  success: boolean;
  skinsSaved: boolean;
  error?: string;
  rollbackAttempted?: boolean;
  rollbackSucceeded?: boolean;
}

/**
 * Reconciles player skin ownership and validates equipped skin at startup.
 * - Authoritative telemetry sources:
 *   - Player Level: from PlayerProgressionState
 *   - Zen Walls Wrapped: from LifetimeStats
 *   - Maze Campaigns Won: from MazeProgress (totalCampaignsWon)
 * - Safe Legacy Migration:
 *   - If no skins ledger exists, evaluates settings.skin against authoritative unlock criteria.
 *   - Preserves old settings.skin ONLY if legitimately earned.
 *   - Locked or invalid selections safely fall back to 'cyber_cyan'.
 * - Equipped Skin Validation:
 *   - Ensures equippedSkinId is unlocked in the reconciled ownership set.
 *   - Falls back to 'cyber_cyan' if locked.
 * - Mirror Repair:
 *   - Synchronizes GameSettings.skin to match the authoritative equippedSkinId.
 * - Persistence Integrity:
 *   - Checks boolean results of savePlayerSkins() and saveSettings().
 *   - Never reports mirrorRepaired: true unless settings write actually succeeds.
 *   - Never silently reports successful migration when required persistence writes fail.
 *   - Handles partial writes and rollback/recovery explicitly without claiming multi-key atomicity.
 * - Idempotent and safe against missing/throwing storage.
 */
export function reconcileAndMigratePlayerSkins(
  storage: StorageLike | null = getBrowserStorage(),
  contextOverride?: Partial<SkinUnlockContext>
): SkinReconciliationResult {
  if (!storage) {
    return {
      skinsState: { ...DEFAULT_PLAYER_SKINS_STATE },
      newlyUnlocked: [],
      mirrorRepaired: false,
      wasMigrated: false,
      success: false,
      skinsSaved: false,
      error: 'Storage unavailable',
    };
  }

  try {
    const rawSkins = storage.getItem(STORAGE_KEYS.SKINS);
    const hadSkinsLedger = rawSkins !== null;
    const isMigrationCandidate = !hadSkinsLedger;

    // Load current skin state (sanitized)
    const currentSkins = loadPlayerSkins(storage);

    // Load authoritative progression, stats, and campaign data
    const progression = loadPlayerProgression(storage);
    const stats = loadStats(storage);
    const maze = loadMazeProgress(storage);
    const settings = loadSettings(storage);

    const context: SkinUnlockContext = {
      level: contextOverride?.level ?? (progression?.level ?? 1),
      zenWallsWrapped: contextOverride?.zenWallsWrapped ?? (stats?.wallsWrapped ?? 0),
      campaignVictories: contextOverride?.campaignVictories ?? (maze?.totalCampaignsWon ?? 0),
    };

    // 1. Reconcile unlocks against authoritative telemetry
    const { state: reconciled, newlyUnlocked } = reconcilePlayerSkins(currentSkins, context);

    // 2. Validate equipped skin
    let equippedSkinId = reconciled.equippedSkinId;

    if (!hadSkinsLedger) {
      // Legacy user migrating for the first time
      const legacyCandidate = settings?.skin;
      if (isValidSkinId(legacyCandidate) && reconciled.unlockedSkinIds.includes(legacyCandidate)) {
        // Legitimate earned skin choice from legacy settings
        equippedSkinId = legacyCandidate;
      } else {
        // Fallback to Cyber Cyan (never trust an unearned legacy skin)
        equippedSkinId = 'cyber_cyan';
      }
    } else {
      // Ensure existing equipped skin is unlocked in the reconciled set
      if (!reconciled.unlockedSkinIds.includes(equippedSkinId)) {
        equippedSkinId = 'cyber_cyan';
      }
    }

    const finalState: PlayerSkinsState = {
      equippedSkinId,
      unlockedSkinIds: reconciled.unlockedSkinIds,
    };

    // 3. Persist authoritative skins state
    let skinsSaved = false;
    try {
      skinsSaved = savePlayerSkins(finalState, storage);
    } catch {
      skinsSaved = false;
    }

    if (!skinsSaved) {
      // Primary skin-ledger write failed!
      let rollbackAttempted = false;
      let rollbackSucceeded = false;
      let errorMsg = 'Failed to write player skins ledger to storage.';

      if (hadSkinsLedger) {
        // Attempt recovery write to restore previous uncorrupted ledger
        rollbackAttempted = true;
        try {
          rollbackSucceeded = savePlayerSkins(currentSkins, storage);
        } catch {
          rollbackSucceeded = false;
        }
        if (!rollbackSucceeded) {
          errorMsg = 'Failed to write player skins ledger. Critical: Recovery rollback to previous state also failed.';
        }
      } else {
        // Migration candidate: remove any partial/corrupt key
        rollbackAttempted = true;
        try {
          storage.removeItem(STORAGE_KEYS.SKINS);
          rollbackSucceeded = true;
        } catch {
          rollbackSucceeded = false;
          errorMsg = 'Failed to write player skins ledger. Critical: Cleanup of failed migration ledger also failed.';
        }
      }

      // Safe fallback state: if ledger previously existed, return currentSkins;
      // otherwise, strictly fall back to Cyber Cyan so unpersisted selections are never treated as authoritative
      const safeFallback: PlayerSkinsState = hadSkinsLedger
        ? currentSkins
        : { ...DEFAULT_PLAYER_SKINS_STATE };

      return {
        skinsState: safeFallback,
        newlyUnlocked: [],
        mirrorRepaired: false,
        wasMigrated: false,
        success: false,
        skinsSaved: false,
        error: errorMsg,
        rollbackAttempted,
        rollbackSucceeded,
      };
    }

    // 4. Synchronize settings mirror if stale
    let mirrorRepaired = false;
    let mirrorError: string | undefined;

    if (settings.skin !== equippedSkinId) {
      let settingsSaved = false;
      try {
        settingsSaved = saveSettings({ ...settings, skin: equippedSkinId }, storage);
      } catch {
        settingsSaved = false;
      }

      if (settingsSaved) {
        mirrorRepaired = true;
      } else {
        mirrorRepaired = false;
        mirrorError = 'Failed to synchronize skin with game settings mirror.';
      }
    }

    // Migration was successful if this was a first-time migration and the skin ledger was saved
    // If settings mirror repair was required but failed, report partial persistence honestly
    const overallSuccess = mirrorError === undefined;
    const wasMigrated = isMigrationCandidate && skinsSaved && overallSuccess;

    return {
      skinsState: finalState,
      newlyUnlocked,
      mirrorRepaired,
      wasMigrated,
      success: overallSuccess,
      skinsSaved: true,
      error: mirrorError,
    };
  } catch (err) {
    return {
      skinsState: { ...DEFAULT_PLAYER_SKINS_STATE },
      newlyUnlocked: [],
      mirrorRepaired: false,
      wasMigrated: false,
      success: false,
      skinsSaved: false,
      error: err instanceof Error ? err.message : 'Unexpected reconciliation error',
    };
  }
}

// ==========================================
// PLAYER TRAILS PERSISTENCE
// ==========================================

export function loadPlayerTrails(storage: StorageLike | null = getBrowserStorage()): PlayerTrailsState {
  if (!storage) {
    return {
      equippedTrailId: DEFAULT_PLAYER_TRAILS_STATE.equippedTrailId,
      unlockedTrailIds: [...DEFAULT_PLAYER_TRAILS_STATE.unlockedTrailIds],
    };
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.TRAILS);
    if (!raw) {
      // If trail ledger is missing, recover starter trail preference if set in settings
      const settings = loadSettings(storage);
      const equippedCandidate = (settings && STARTER_TRAIL_IDS.includes(settings.trail as any))
        ? (settings.trail as SnakeTrailId)
        : DEFAULT_PLAYER_TRAILS_STATE.equippedTrailId;

      return {
        equippedTrailId: equippedCandidate,
        unlockedTrailIds: [...DEFAULT_PLAYER_TRAILS_STATE.unlockedTrailIds],
      };
    }
    const parsed = JSON.parse(raw);
    return sanitizePlayerTrailsState(parsed);
  } catch {
    let equippedCandidate = DEFAULT_PLAYER_TRAILS_STATE.equippedTrailId;
    try {
      const settings = loadSettings(storage);
      if (settings && STARTER_TRAIL_IDS.includes(settings.trail as any)) {
        equippedCandidate = settings.trail as SnakeTrailId;
      }
    } catch {
      // fallback
    }
    return {
      equippedTrailId: equippedCandidate,
      unlockedTrailIds: [...DEFAULT_PLAYER_TRAILS_STATE.unlockedTrailIds],
    };
  }
}

export function savePlayerTrails(
  trailsState: PlayerTrailsState,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;

  try {
    const sanitized = sanitizePlayerTrailsState(trailsState);
    storage.setItem(STORAGE_KEYS.TRAILS, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function equipTrail(
  trailId: SnakeTrailId,
  storage: StorageLike | null = getBrowserStorage()
): { success: boolean; state: PlayerTrailsState; error?: string } {
  const current = loadPlayerTrails(storage);
  if (!isTrailUnlocked(trailId, current)) {
    return {
      success: false,
      state: current,
      error: `Trail '${trailId}' is not unlocked.`,
    };
  }

  const updated: PlayerTrailsState = {
    equippedTrailId: trailId,
    unlockedTrailIds: current.unlockedTrailIds,
  };

  const savedTrails = savePlayerTrails(updated, storage);
  if (!savedTrails) {
    return {
      success: false,
      state: current,
      error: 'Failed to write trail persistence to storage.',
    };
  }

  // Synchronize GameSettings.trail with two-storage rollback guarantee
  const settings = loadSettings(storage);
  if (settings.trail !== trailId) {
    const savedSettings = saveSettings({ ...settings, trail: trailId }, storage);
    if (!savedSettings) {
      // Rollback trails storage to current to prevent desynchronization
      const rollbackSuccess = savePlayerTrails(current, storage);
      if (!rollbackSuccess) {
        return {
          success: false,
          state: updated,
          error: 'Failed to synchronize trail with game settings. Critical: Storage rollback also failed.',
        };
      }
      return {
        success: false,
        state: current,
        error: 'Failed to synchronize trail with game settings.',
      };
    }
  }

  return {
    success: true,
    state: updated,
  };
}

export function unlockTrail(
  trailId: SnakeTrailId,
  storage: StorageLike | null = getBrowserStorage()
): { success: boolean; state: PlayerTrailsState } {
  if (!isValidTrailId(trailId)) {
    const current = loadPlayerTrails(storage);
    return { success: false, state: current };
  }

  const current = loadPlayerTrails(storage);
  if (current.unlockedTrailIds.includes(trailId)) {
    return { success: true, state: current };
  }

  const updated: PlayerTrailsState = {
    equippedTrailId: current.equippedTrailId,
    unlockedTrailIds: [...current.unlockedTrailIds, trailId],
  };

  const sanitized = sanitizePlayerTrailsState(updated);
  savePlayerTrails(sanitized, storage);

  return {
    success: true,
    state: sanitized,
  };
}

export function resetPlayerTrails(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    const currentTrails = loadPlayerTrails(storage);
    const savedTrails = savePlayerTrails(DEFAULT_PLAYER_TRAILS_STATE, storage);
    if (!savedTrails) {
      return false;
    }

    const settings = loadSettings(storage);
    if (settings.trail !== 'cyber_pulse') {
      const savedSettings = saveSettings({ ...settings, trail: 'cyber_pulse' }, storage);
      if (!savedSettings) {
        // Rollback trails ledger to previous state so we don't leave partial reset
        savePlayerTrails(currentTrails, storage);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export interface TrailReconciliationResult {
  trailsState: PlayerTrailsState;
  newlyUnlocked: SnakeTrailId[];
  mirrorRepaired: boolean;
  wasMigrated: boolean;
  success: boolean;
  trailsSaved: boolean;
  error?: string;
  rollbackAttempted?: boolean;
  rollbackSucceeded?: boolean;
}

/**
 * Reconciles player trail ownership and validates equipped trail at startup.
 */
export function reconcileAndMigratePlayerTrails(
  storage: StorageLike | null = getBrowserStorage(),
  contextOverride?: Partial<TrailUnlockContext> & {
    progression?: { level: number };
    stats?: { wallsWrapped?: number; totalFoodEaten?: number; longestSnake?: number; zenScreenWraps?: number; foodEaten?: number; maxFoodInRun?: number };
    mazeProgress?: Partial<MazeProgress> & { highestStageUnlocked?: number; highestCompletedStage?: number; [key: string]: unknown };
    playerLevel?: number;
    zenScreenWraps?: number;
    mazeStagesCleared?: number;
    lifetimeFoodEaten?: number;
  }
): TrailReconciliationResult {
  if (!storage) {
    return {
      trailsState: { ...DEFAULT_PLAYER_TRAILS_STATE },
      newlyUnlocked: [],
      mirrorRepaired: false,
      wasMigrated: false,
      success: false,
      trailsSaved: false,
      error: 'Storage unavailable',
    };
  }

  try {
    const rawTrails = storage.getItem(STORAGE_KEYS.TRAILS);
    const hadTrailsLedger = rawTrails !== null;
    const isMigrationCandidate = !hadTrailsLedger;

    const currentTrails = loadPlayerTrails(storage);
    const progression = loadPlayerProgression(storage);
    const stats = loadStats(storage);
    const maze = loadMazeProgress(storage);
    const settings = loadSettings(storage);

    const level = contextOverride?.level ?? contextOverride?.playerLevel ?? contextOverride?.progression?.level ?? (progression?.level ?? 1);
    const zenWallsWrapped = contextOverride?.zenWallsWrapped ?? contextOverride?.zenScreenWraps ?? contextOverride?.stats?.wallsWrapped ?? contextOverride?.stats?.zenScreenWraps ?? (stats?.wallsWrapped ?? 0);
    const highestMazeStage = contextOverride?.highestMazeStage ?? contextOverride?.mazeStagesCleared ?? contextOverride?.mazeProgress?.highestStageUnlocked ?? contextOverride?.mazeProgress?.highestCompletedStage ?? (maze?.highestStageUnlocked ?? 1);
    // Authoritative single-run food count: use explicit contextOverride, contextOverride.stats.maxFoodInRun, or stats.maxFoodInRun;
    // never substitute cumulative lifetime food statistics (totalFoodEaten) or unrelated stats.
    const maxFoodInRun = contextOverride?.maxFoodInRun ?? contextOverride?.stats?.maxFoodInRun ?? (stats?.maxFoodInRun ?? 0);

    const context: TrailUnlockContext = {
      level,
      zenWallsWrapped,
      highestMazeStage,
      maxFoodInRun,
    };

    // 1. Reconcile unlocks against authoritative telemetry
    const { state: reconciled, newlyUnlocked } = reconcilePlayerTrails(currentTrails, context);

    // 2. Validate equipped trail
    let equippedTrailId = reconciled.equippedTrailId;

    if (!hadTrailsLedger) {
      const legacyCandidate = settings?.trail;
      if (isValidTrailId(legacyCandidate) && reconciled.unlockedTrailIds.includes(legacyCandidate)) {
        equippedTrailId = legacyCandidate;
      } else {
        equippedTrailId = 'cyber_pulse';
      }
    } else {
      if (!reconciled.unlockedTrailIds.includes(equippedTrailId)) {
        equippedTrailId = 'cyber_pulse';
      }
    }

    const finalState: PlayerTrailsState = {
      equippedTrailId,
      unlockedTrailIds: reconciled.unlockedTrailIds,
    };

    // 3. Persist authoritative trails state
    let trailsSaved = false;
    try {
      trailsSaved = savePlayerTrails(finalState, storage);
    } catch {
      trailsSaved = false;
    }

    if (!trailsSaved) {
      let rollbackAttempted = false;
      let rollbackSucceeded = false;
      let errorMsg = 'Failed to write player trails ledger to storage.';

      if (hadTrailsLedger) {
        rollbackAttempted = true;
        try {
          rollbackSucceeded = savePlayerTrails(currentTrails, storage);
        } catch {
          rollbackSucceeded = false;
        }
        if (!rollbackSucceeded) {
          errorMsg = 'Failed to write player trails ledger. Critical: Recovery rollback to previous state also failed.';
        }
      } else {
        rollbackAttempted = true;
        try {
          storage.removeItem(STORAGE_KEYS.TRAILS);
          rollbackSucceeded = true;
        } catch {
          rollbackSucceeded = false;
          errorMsg = 'Failed to write player trails ledger. Critical: Cleanup of failed migration ledger also failed.';
        }
      }

      const safeFallback: PlayerTrailsState = hadTrailsLedger
        ? currentTrails
        : { ...DEFAULT_PLAYER_TRAILS_STATE };

      return {
        trailsState: safeFallback,
        newlyUnlocked: [],
        mirrorRepaired: false,
        wasMigrated: false,
        success: false,
        trailsSaved: false,
        error: errorMsg,
        rollbackAttempted,
        rollbackSucceeded,
      };
    }

    // 4. Synchronize settings mirror if stale
    let mirrorRepaired = false;
    let mirrorError: string | undefined;

    if (settings.trail !== equippedTrailId) {
      let settingsSaved = false;
      try {
        settingsSaved = saveSettings({ ...settings, trail: equippedTrailId }, storage);
      } catch {
        settingsSaved = false;
      }

      if (settingsSaved) {
        mirrorRepaired = true;
      } else {
        mirrorRepaired = false;
        mirrorError = 'Failed to synchronize trail with game settings mirror.';
      }
    }

    const overallSuccess = mirrorError === undefined;
    const wasMigrated = isMigrationCandidate && trailsSaved && overallSuccess;

    return {
      trailsState: finalState,
      newlyUnlocked,
      mirrorRepaired,
      wasMigrated,
      success: overallSuccess,
      trailsSaved: true,
      error: mirrorError,
    };
  } catch (err) {
    return {
      trailsState: { ...DEFAULT_PLAYER_TRAILS_STATE },
      newlyUnlocked: [],
      mirrorRepaired: false,
      wasMigrated: false,
      success: false,
      trailsSaved: false,
      error: err instanceof Error ? err.message : 'Unexpected reconciliation error',
    };
  }
}

// ==========================================
// BOARD THEMES PERSISTENCE & RECONCILIATION
// ==========================================

export function loadPlayerThemes(storage: StorageLike | null = getBrowserStorage()): PlayerThemesState {
  if (!storage) return { ...DEFAULT_PLAYER_THEMES_STATE };

  try {
    const raw = storage.getItem(STORAGE_KEYS.THEMES);
    if (!raw) return { ...DEFAULT_PLAYER_THEMES_STATE };

    const parsed = JSON.parse(raw);
    return sanitizePlayerThemesState(parsed);
  } catch {
    return { ...DEFAULT_PLAYER_THEMES_STATE };
  }
}

export function savePlayerThemes(
  state: PlayerThemesState,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;

  try {
    const sanitized = sanitizePlayerThemesState(state);
    storage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function equipTheme(
  themeId: BoardThemeId,
  storage: StorageLike | null = getBrowserStorage()
): { success: boolean; state: PlayerThemesState; error?: string } {
  if (!isValidThemeId(themeId)) {
    return {
      success: false,
      state: loadPlayerThemes(storage),
      error: `Invalid theme identifier: ${String(themeId)}`,
    };
  }

  const current = loadPlayerThemes(storage);
  if (!isThemeUnlocked(themeId, current)) {
    return {
      success: false,
      state: current,
      error: 'Cannot equip locked board theme. Unlock requirements have not been met.',
    };
  }

  const updated: PlayerThemesState = {
    equippedThemeId: themeId,
    unlockedThemeIds: current.unlockedThemeIds,
  };

  const savedThemes = savePlayerThemes(updated, storage);
  if (!savedThemes) {
    return {
      success: false,
      state: current,
      error: 'Storage failure: Unable to persist equipped board theme.',
    };
  }

  // Synchronize settings mirror
  const settings = loadSettings(storage);
  if (settings.boardTheme !== themeId) {
    const savedSettings = saveSettings({ ...settings, boardTheme: themeId }, storage);
    if (!savedSettings) {
      // Rollback themes state
      savePlayerThemes(current, storage);
      return {
        success: false,
        state: current,
        error: 'Storage failure: Unable to update game settings theme mirror.',
      };
    }
  }

  return {
    success: true,
    state: updated,
  };
}

export function unlockTheme(
  themeId: BoardThemeId,
  storage: StorageLike | null = getBrowserStorage()
): { success: boolean; state: PlayerThemesState } {
  if (!isValidThemeId(themeId)) {
    const current = loadPlayerThemes(storage);
    return { success: false, state: current };
  }

  const current = loadPlayerThemes(storage);
  if (current.unlockedThemeIds.includes(themeId)) {
    return { success: true, state: current };
  }

  const updated: PlayerThemesState = {
    equippedThemeId: current.equippedThemeId,
    unlockedThemeIds: [...current.unlockedThemeIds, themeId],
  };

  const sanitized = sanitizePlayerThemesState(updated);
  savePlayerThemes(sanitized, storage);

  return {
    success: true,
    state: sanitized,
  };
}

export function resetPlayerThemes(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    const currentThemes = loadPlayerThemes(storage);
    const savedThemes = savePlayerThemes(DEFAULT_PLAYER_THEMES_STATE, storage);
    if (!savedThemes) {
      return false;
    }

    const settings = loadSettings(storage);
    if (settings.boardTheme !== 'obsidian_grid') {
      const savedSettings = saveSettings({ ...settings, boardTheme: 'obsidian_grid' }, storage);
      if (!savedSettings) {
        // Rollback themes ledger
        savePlayerThemes(currentThemes, storage);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export interface ThemeReconciliationResult {
  themesState: PlayerThemesState;
  newlyUnlocked: BoardThemeId[];
  mirrorRepaired: boolean;
  wasMigrated: boolean;
  success: boolean;
  themesSaved: boolean;
  error?: string;
  rollbackAttempted?: boolean;
  rollbackSucceeded?: boolean;
}

/**
 * Reconciles player board theme ownership and validates equipped theme at startup.
 */
export function reconcileAndMigratePlayerThemes(
  storage: StorageLike | null = getBrowserStorage(),
  contextOverride?: Partial<ThemeUnlockContext> & {
    progression?: { level: number };
    stats?: { wallsWrapped?: number; totalFoodEaten?: number; longestSnake?: number; zenScreenWraps?: number; maxFoodInRun?: number };
    mazeProgress?: Partial<MazeProgress> & { highestStageUnlocked?: number; totalCampaignsWon?: number };
    playerLevel?: number;
    zenScreenWraps?: number;
    mazeStagesCleared?: number;
  }
): ThemeReconciliationResult {
  if (!storage) {
    return {
      themesState: { ...DEFAULT_PLAYER_THEMES_STATE },
      newlyUnlocked: [],
      mirrorRepaired: false,
      wasMigrated: false,
      success: false,
      themesSaved: false,
      error: 'Storage unavailable',
    };
  }

  try {
    const rawThemes = storage.getItem(STORAGE_KEYS.THEMES);
    const hadThemesLedger = rawThemes !== null;
    const isMigrationCandidate = !hadThemesLedger;

    const currentThemes = loadPlayerThemes(storage);
    const progression = loadPlayerProgression(storage);
    const stats = loadStats(storage);
    const maze = loadMazeProgress(storage);
    const settings = loadSettings(storage);

    const level = contextOverride?.level ?? contextOverride?.playerLevel ?? contextOverride?.progression?.level ?? (progression?.level ?? 1);
    const zenWallsWrapped = contextOverride?.zenWallsWrapped ?? contextOverride?.zenScreenWraps ?? contextOverride?.stats?.wallsWrapped ?? contextOverride?.stats?.zenScreenWraps ?? (stats?.wallsWrapped ?? 0);
    const highestMazeStage = contextOverride?.highestMazeStage ?? contextOverride?.mazeStagesCleared ?? contextOverride?.mazeProgress?.highestStageUnlocked ?? (maze?.highestStageUnlocked ?? 1);
    const maxFoodInRun = contextOverride?.maxFoodInRun ?? contextOverride?.stats?.maxFoodInRun ?? (stats?.maxFoodInRun ?? 0);
    const campaignWon = contextOverride?.campaignWon ?? ((maze?.totalCampaignsWon ?? 0) > 0);

    const context: ThemeUnlockContext = {
      level,
      zenWallsWrapped,
      highestMazeStage,
      maxFoodInRun,
      campaignWon,
    };

    // 1. Reconcile unlocks against telemetry
    const { state: reconciled, newlyUnlocked } = reconcilePlayerThemes(currentThemes, context);

    // 2. Validate equipped theme
    let equippedThemeId = reconciled.equippedThemeId;

    if (!hadThemesLedger) {
      const legacyCandidate = settings?.boardTheme;
      if (isValidThemeId(legacyCandidate) && reconciled.unlockedThemeIds.includes(legacyCandidate)) {
        equippedThemeId = legacyCandidate;
      } else {
        equippedThemeId = 'obsidian_grid';
      }
    } else {
      if (!reconciled.unlockedThemeIds.includes(equippedThemeId)) {
        equippedThemeId = 'obsidian_grid';
      }
    }

    const finalState: PlayerThemesState = {
      equippedThemeId,
      unlockedThemeIds: reconciled.unlockedThemeIds,
    };

    // 3. Persist authoritative themes state
    let themesSaved = false;
    try {
      themesSaved = savePlayerThemes(finalState, storage);
    } catch {
      themesSaved = false;
    }

    if (!themesSaved) {
      let rollbackAttempted = false;
      let rollbackSucceeded = false;
      let errorMsg = 'Failed to write player themes ledger to storage.';

      if (hadThemesLedger) {
        rollbackAttempted = true;
        try {
          rollbackSucceeded = savePlayerThemes(currentThemes, storage);
        } catch {
          rollbackSucceeded = false;
        }
        if (!rollbackSucceeded) {
          errorMsg = 'Failed to write player themes ledger. Critical: Recovery rollback to previous state also failed.';
        }
      } else {
        rollbackAttempted = true;
        try {
          storage.removeItem(STORAGE_KEYS.THEMES);
          rollbackSucceeded = true;
        } catch {
          rollbackSucceeded = false;
          errorMsg = 'Failed to write player themes ledger. Critical: Cleanup of failed migration ledger also failed.';
        }
      }

      const safeFallback: PlayerThemesState = hadThemesLedger
        ? currentThemes
        : { ...DEFAULT_PLAYER_THEMES_STATE };

      return {
        themesState: safeFallback,
        newlyUnlocked: [],
        mirrorRepaired: false,
        wasMigrated: false,
        success: false,
        themesSaved: false,
        error: errorMsg,
        rollbackAttempted,
        rollbackSucceeded,
      };
    }

    // 4. Synchronize settings mirror if stale
    let mirrorRepaired = false;
    let mirrorError: string | undefined;

    if (settings.boardTheme !== equippedThemeId) {
      let settingsSaved = false;
      try {
        settingsSaved = saveSettings({ ...settings, boardTheme: equippedThemeId }, storage);
      } catch {
        settingsSaved = false;
      }

      if (settingsSaved) {
        mirrorRepaired = true;
      } else {
        mirrorRepaired = false;
        mirrorError = 'Failed to synchronize board theme with game settings mirror.';
      }
    }

    const overallSuccess = mirrorError === undefined;
    const wasMigrated = isMigrationCandidate && themesSaved && overallSuccess;

    return {
      themesState: finalState,
      newlyUnlocked,
      mirrorRepaired,
      wasMigrated,
      success: overallSuccess,
      themesSaved: true,
      error: mirrorError,
    };
  } catch (err) {
    return {
      themesState: { ...DEFAULT_PLAYER_THEMES_STATE },
      newlyUnlocked: [],
      mirrorRepaired: false,
      wasMigrated: false,
      success: false,
      themesSaved: false,
      error: err instanceof Error ? err.message : 'Unexpected reconciliation error',
    };
  }
}




