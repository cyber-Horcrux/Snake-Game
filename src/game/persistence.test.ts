import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BEST_SCORES,
  loadBestScores,
  saveBestScores,
  updateBestScore,
  resetBestScores,
  loadSettings,
  saveSettings,
  DEFAULT_MAZE_PROGRESS,
  loadMazeProgress,
  saveMazeProgress,
  recordStageClear,
  recordCampaignCompletion,
  resetMazeProgress,
} from './persistence.ts';
import type { StorageLike } from './persistence.ts';
import { DEFAULT_SETTINGS } from './constants.ts';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  public shouldThrow = false;

  getItem(key: string): string | null {
    if (this.shouldThrow) throw new Error('Storage disabled');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrow) throw new Error('Quota exceeded');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    if (this.shouldThrow) throw new Error('Storage error');
    this.data.delete(key);
  }
}

test('loadBestScores returns defaults when empty or null storage', () => {
  assert.deepEqual(loadBestScores(null), DEFAULT_BEST_SCORES);

  const storage = new MemoryStorage();
  assert.deepEqual(loadBestScores(storage), DEFAULT_BEST_SCORES);
});

test('loadBestScores gracefully handles corrupt and malformed JSON', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_best_scores_v1', '{invalid_json}');
  assert.deepEqual(loadBestScores(storage), DEFAULT_BEST_SCORES);

  storage.setItem('neon_snake_best_scores_v1', JSON.stringify({ classic: -50, zen: 'hello', rush: NaN }));
  const sanitized = loadBestScores(storage);
  assert.equal(sanitized.classic, 0);
  assert.equal(sanitized.zen, 0);
  assert.equal(sanitized.rush, 0);
});

test('updateBestScore correctly updates high scores per mode', () => {
  const storage = new MemoryStorage();

  const res1 = updateBestScore('classic', 150, storage);
  assert.equal(res1.isNewBest, true);
  assert.equal(res1.currentBest, 150);

  // Lower score should not overwrite
  const res2 = updateBestScore('classic', 90, storage);
  assert.equal(res2.isNewBest, false);
  assert.equal(res2.currentBest, 150);

  // Zen mode is tracked separately
  const res3 = updateBestScore('zen', 300, storage);
  assert.equal(res3.isNewBest, true);
  assert.equal(res3.currentBest, 300);

  const all = loadBestScores(storage);
  assert.equal(all.classic, 150);
  assert.equal(all.zen, 300);
  assert.equal(all.rush, 0);
});

test('resetBestScores resets all modes back to 0', () => {
  const storage = new MemoryStorage();
  saveBestScores({ classic: 100, zen: 200, rush: 300 }, storage);

  resetBestScores(storage);
  const scores = loadBestScores(storage);
  assert.deepEqual(scores, { classic: 0, zen: 0, rush: 0 });
});

test('loadSettings sanitizes corrupted fields and clamped volume', () => {
  const storage = new MemoryStorage();
  storage.setItem(
    'neon_snake_settings_v1',
    JSON.stringify({
      audio: { sfxEnabled: true, sfxVolume: 99 }, // Volume should clamp to 1.0
      visualEffects: 'invalid_mode',
      dpadPreference: 'auto',
      skin: 'non_existent_skin',
    })
  );

  const loaded = loadSettings(storage);
  assert.equal(loaded.audio.sfxVolume, 1.0);
  assert.equal(loaded.visualEffects, DEFAULT_SETTINGS.visualEffects);
  assert.equal(loaded.dpadPreference, 'auto');
  assert.equal(loaded.skin, 'cyber_cyan'); // Falls back to default skin
  assert.equal(loaded.controlMode, 'swipe'); // Falls back to default control mode

  // Valid skin is loaded properly
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'synth_sunset' }, storage);
  const reloaded = loadSettings(storage);
  assert.equal(reloaded.skin, 'synth_sunset');
});

test('default control mode for new installations is swipe', () => {
  const emptyStorage = new MemoryStorage();
  const settings = loadSettings(emptyStorage);
  assert.equal(settings.controlMode, 'swipe');
  assert.deepEqual(loadSettings(null).controlMode, 'swipe');
});

test('correct persistence and restoration of all three control modes', () => {
  const storage = new MemoryStorage();

  // Test swipe
  saveSettings({ ...DEFAULT_SETTINGS, controlMode: 'swipe' }, storage);
  assert.equal(loadSettings(storage).controlMode, 'swipe');

  // Test buttons
  saveSettings({ ...DEFAULT_SETTINGS, controlMode: 'buttons' }, storage);
  assert.equal(loadSettings(storage).controlMode, 'buttons');

  // Test both
  saveSettings({ ...DEFAULT_SETTINGS, controlMode: 'both' }, storage);
  assert.equal(loadSettings(storage).controlMode, 'both');
});

test('restoration of previously saved selections and legacy dpad migration', () => {
  const storage = new MemoryStorage();

  // Legacy setting with dpadPreference 'never' maps to swipe
  storage.setItem(
    'neon_snake_settings_v1',
    JSON.stringify({
      audio: { sfxEnabled: true, sfxVolume: 0.8 },
      visualEffects: 'high',
      dpadPreference: 'never',
      skin: 'cyber_cyan',
    })
  );
  assert.equal(loadSettings(storage).controlMode, 'swipe');

  // Legacy setting with dpadPreference 'always' maps to buttons
  storage.setItem(
    'neon_snake_settings_v1',
    JSON.stringify({
      audio: { sfxEnabled: true, sfxVolume: 0.8 },
      visualEffects: 'high',
      dpadPreference: 'always',
      skin: 'cyber_cyan',
    })
  );
  assert.equal(loadSettings(storage).controlMode, 'buttons');

  // Corrupted or invalid controlMode falls back safely to swipe
  storage.setItem(
    'neon_snake_settings_v1',
    JSON.stringify({
      audio: { sfxEnabled: true, sfxVolume: 0.8 },
      visualEffects: 'high',
      controlMode: 'teleport_mind_control',
      skin: 'cyber_cyan',
    })
  );
  assert.equal(loadSettings(storage).controlMode, 'swipe');
});

test('storage exceptions do not crash application', () => {
  const brokenStorage = new MemoryStorage();
  brokenStorage.shouldThrow = true;

  // None of these should throw exceptions
  assert.doesNotThrow(() => {
    loadBestScores(brokenStorage);
    saveBestScores({ classic: 10, zen: 20, rush: 30 }, brokenStorage);
    updateBestScore('rush', 50, brokenStorage);
    resetBestScores(brokenStorage);
    loadSettings(brokenStorage);
    saveSettings(DEFAULT_SETTINGS, brokenStorage);
  });
});

test('legacy storage keys neonsnake_best_scores and neonsnake_settings are seamlessly migrated', () => {
  const legacyStorage = new MemoryStorage();
  legacyStorage.setItem('neonsnake_best_scores', JSON.stringify({ classic: 250, zen: 180, rush: 120 }));
  legacyStorage.setItem('neonsnake_settings', JSON.stringify({
    audio: { sfxEnabled: true, sfxVolume: 0.7 },
    visualEffects: 'high',
    skin: 'hyper_violet',
    controlMode: 'buttons',
  }));

  const scores = loadBestScores(legacyStorage);
  assert.equal(scores.classic, 250);
  assert.equal(scores.zen, 180);
  assert.equal(scores.rush, 120);

  const settings = loadSettings(legacyStorage);
  assert.equal(settings.skin, 'hyper_violet');
  assert.equal(settings.controlMode, 'buttons');
  assert.equal(settings.audio.sfxVolume, 0.7);
});

// ==========================================
// MAZE CAMPAIGN PERSISTENCE TESTS
// ==========================================

test('loadMazeProgress returns defaults on empty or null storage', () => {
  assert.deepEqual(loadMazeProgress(null), DEFAULT_MAZE_PROGRESS);

  const storage = new MemoryStorage();
  assert.deepEqual(loadMazeProgress(storage), DEFAULT_MAZE_PROGRESS);
});

test('loadMazeProgress gracefully handles corrupt and malformed JSON', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_maze_progress_v1', '{corrupt_json');
  assert.deepEqual(loadMazeProgress(storage), DEFAULT_MAZE_PROGRESS);

  storage.setItem('neon_snake_maze_progress_v1', JSON.stringify({
    highestStageUnlocked: 99, // Should clamp to 6
    totalCampaignsWon: -5,     // Should clamp to 0
    totalMazesCleared: 'invalid', // Should fallback to 0
    bestCampaignScore: NaN,    // Should fallback to 0
  }));

  const parsed = loadMazeProgress(storage);
  assert.equal(parsed.highestStageUnlocked, 6);
  assert.equal(parsed.totalCampaignsWon, 0);
  assert.equal(parsed.totalMazesCleared, 0);
  assert.equal(parsed.bestCampaignScore, 0);
});

test('saveMazeProgress correctly persists valid progress data', () => {
  const storage = new MemoryStorage();
  const progress = {
    highestStageUnlocked: 4,
    totalCampaignsWon: 1,
    totalMazesCleared: 15,
    bestCampaignScore: 1250,
  };

  const success = saveMazeProgress(progress, storage);
  assert.equal(success, true);
  assert.deepEqual(loadMazeProgress(storage), progress);
});

test('recordStageClear unlocks next stage up to 6', () => {
  const storage = new MemoryStorage();

  // Clear Stage 1 -> unlocks Stage 2
  const p1 = recordStageClear(1, 150, storage);
  assert.equal(p1.highestStageUnlocked, 2);
  assert.equal(p1.totalMazesCleared, 1);
  assert.equal(p1.totalCampaignsWon, 0);
  assert.equal(p1.bestCampaignScore, 150);

  // Clear Stage 2 -> unlocks Stage 3
  const p2 = recordStageClear(2, 300, storage);
  assert.equal(p2.highestStageUnlocked, 3);
  assert.equal(p2.totalMazesCleared, 2);
  assert.equal(p2.bestCampaignScore, 300);
});

test('replaying a previously unlocked stage does not reduce highestStageUnlocked', () => {
  const storage = new MemoryStorage();
  saveMazeProgress({
    highestStageUnlocked: 5,
    totalCampaignsWon: 0,
    totalMazesCleared: 10,
    bestCampaignScore: 600,
  }, storage);

  // Replay Stage 2 (would unlock Stage 3) -> highestStageUnlocked must remain 5!
  const result = recordStageClear(2, 200, storage);
  assert.equal(result.highestStageUnlocked, 5);
  assert.equal(result.totalMazesCleared, 11);
  assert.equal(result.bestCampaignScore, 600); // 200 is lower, preserve 600
});

test('clearing Stage 6 increments totalCampaignsWon and caps highestStageUnlocked at 6', () => {
  const storage = new MemoryStorage();
  saveMazeProgress({
    highestStageUnlocked: 6,
    totalCampaignsWon: 0,
    totalMazesCleared: 5,
    bestCampaignScore: 800,
  }, storage);

  const finalResult = recordStageClear(6, 1200, storage);
  assert.equal(finalResult.highestStageUnlocked, 6); // Does not become 7
  assert.equal(finalResult.totalCampaignsWon, 1);
  assert.equal(finalResult.totalMazesCleared, 6);
  assert.equal(finalResult.bestCampaignScore, 1200);
});

test('recordCampaignCompletion delegates cleanly to final stage completion', () => {
  const storage = new MemoryStorage();
  const result = recordCampaignCompletion(2500, storage);
  assert.equal(result.totalCampaignsWon, 1);
  assert.equal(result.bestCampaignScore, 2500);
  assert.equal(result.highestStageUnlocked, 6);
});

test('resetMazeProgress restores defaults cleanly', () => {
  const storage = new MemoryStorage();
  saveMazeProgress({
    highestStageUnlocked: 6,
    totalCampaignsWon: 3,
    totalMazesCleared: 25,
    bestCampaignScore: 3000,
  }, storage);

  const resetSuccess = resetMazeProgress(storage);
  assert.equal(resetSuccess, true);
  assert.deepEqual(loadMazeProgress(storage), DEFAULT_MAZE_PROGRESS);
});

test('interrupted run leaves saved maze progress unmodified', () => {
  const storage = new MemoryStorage();
  saveMazeProgress({
    highestStageUnlocked: 3,
    totalCampaignsWon: 0,
    totalMazesCleared: 2,
    bestCampaignScore: 250,
  }, storage);

  // An unfinished run occurs (process terminates or crashes before gate entry)
  // No recordStageClear was invoked
  const progressAfterInterruption = loadMazeProgress(storage);
  assert.equal(progressAfterInterruption.highestStageUnlocked, 3);
  assert.equal(progressAfterInterruption.totalMazesCleared, 2);
  assert.equal(progressAfterInterruption.bestCampaignScore, 250);
});

test('legacy storage key neonsnake_maze_progress is seamlessly migrated', () => {
  const legacyStorage = new MemoryStorage();
  legacyStorage.setItem('neonsnake_maze_progress', JSON.stringify({
    highestStageUnlocked: 4,
    totalCampaignsWon: 1,
    totalMazesCleared: 12,
    bestCampaignScore: 1800,
  }));

  const progress = loadMazeProgress(legacyStorage);
  assert.equal(progress.highestStageUnlocked, 4);
  assert.equal(progress.totalCampaignsWon, 1);
  assert.equal(progress.totalMazesCleared, 12);
  assert.equal(progress.bestCampaignScore, 1800);
});

