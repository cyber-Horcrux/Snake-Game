/**
 * Storage and Persistence Module
 * Robust schema validation, error handling, and fallback defaults.
 */
import type { ControlMode, GameMode, GameSettings, ModeBestScores, MazeProgress } from './types.ts';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants.ts';

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

    const validSkins = ['cyber_cyan', 'matrix_green', 'synth_sunset', 'hyper_violet', 'gold_prestige'];
    const skin = validSkins.includes(parsed.skin) ? parsed.skin : DEFAULT_SETTINGS.skin;

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

