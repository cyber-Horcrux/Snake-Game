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
