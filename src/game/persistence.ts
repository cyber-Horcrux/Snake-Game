/**
 * Storage and Persistence Module
 * Robust schema validation, error handling, and fallback defaults.
 */
import type { GameMode, GameSettings, ModeBestScores } from './types.ts';
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
    const raw = storage.getItem(STORAGE_KEYS.BEST_SCORES);
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
    const raw = storage.getItem(STORAGE_KEYS.SETTINGS);
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

    return {
      audio: {
        sfxEnabled,
        sfxVolume,
      },
      visualEffects,
      dpadPreference,
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
