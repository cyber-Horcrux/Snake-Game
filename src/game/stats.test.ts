import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STATS,
  INITIAL_ACHIEVEMENTS,
  loadStats,
  saveStats,
  loadAchievements,
  saveAchievements,
  recordRunCompletion,
  resetStatsAndAchievements,
} from './stats.ts';
import type { StorageLike } from './persistence.ts';
import { createInitialState } from './engine.ts';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  public shouldThrow = false;

  getItem(key: string): string | null {
    if (this.shouldThrow) throw new Error('Storage failure');
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

test('loadStats returns default stats on null or empty storage', () => {
  assert.deepEqual(loadStats(null), DEFAULT_STATS);

  const storage = new MemoryStorage();
  assert.deepEqual(loadStats(storage), DEFAULT_STATS);
});

test('loadStats gracefully handles corrupt or malformed JSON', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_lifetime_stats_v1', '{corrupt_data');
  assert.deepEqual(loadStats(storage), DEFAULT_STATS);

  storage.setItem(
    'neon_snake_lifetime_stats_v1',
    JSON.stringify({
      runsPlayed: -10,
      totalScore: 'invalid',
      highestScore: NaN,
      longestSnake: -5,
    })
  );
  const loaded = loadStats(storage);
  assert.equal(loaded.runsPlayed, 0);
  assert.equal(loaded.totalScore, 0);
  assert.equal(loaded.longestSnake, 3);
});

test('saveStats persists valid statistics', () => {
  const storage = new MemoryStorage();
  const customStats = {
    ...DEFAULT_STATS,
    runsPlayed: 12,
    totalScore: 3500,
    highestScore: 420,
    totalFoodEaten: 150,
    longestSnake: 18,
    maxCombo: 3,
  };

  const success = saveStats(customStats, storage);
  assert.equal(success, true);

  const loaded = loadStats(storage);
  assert.equal(loaded.runsPlayed, 12);
  assert.equal(loaded.totalScore, 3500);
  assert.equal(loaded.highestScore, 420);
  assert.equal(loaded.longestSnake, 18);
  assert.equal(loaded.maxCombo, 3);
});

test('loadAchievements initializes all 10 badges with locked state', () => {
  const achievements = loadAchievements(null);
  assert.equal(achievements.length, 10);
  assert.equal(achievements.every(a => a.unlocked === false), true);
});

test('recordRunCompletion updates lifetime stats and unlocks first_bite achievement', () => {
  const storage = new MemoryStorage();
  const runState = createInitialState('classic');
  runState.score = 50;
  runState.foodEaten = 4;
  runState.maxLength = 7;
  runState.combo = 2;

  const { stats, newlyUnlocked } = recordRunCompletion(runState, storage);

  assert.equal(stats.runsPlayed, 1);
  assert.equal(stats.totalScore, 50);
  assert.equal(stats.highestScore, 50);
  assert.equal(stats.totalFoodEaten, 4);
  assert.equal(stats.longestSnake, 7);
  assert.equal(stats.maxCombo, 2);

  // 'first_bite' should be unlocked
  const firstBite = newlyUnlocked.find(a => a.id === 'first_bite');
  assert.notEqual(firstBite, undefined);
  assert.equal(firstBite?.unlocked, true);
});

test('recordRunCompletion unlocks centurion achievement when score >= 100', () => {
  const storage = new MemoryStorage();
  const runState = createInitialState('classic');
  runState.score = 120;
  runState.foodEaten = 10;

  const { newlyUnlocked } = recordRunCompletion(runState, storage);
  const centurion = newlyUnlocked.find(a => a.id === 'centurion');
  assert.notEqual(centurion, undefined);
  assert.equal(centurion?.unlocked, true);
});

test('recordRunCompletion unlocks rush_hour achievement in rush mode with score >= 250', () => {
  const storage = new MemoryStorage();
  const runState = createInitialState('rush');
  runState.score = 260;
  runState.foodEaten = 15;

  const { newlyUnlocked } = recordRunCompletion(runState, storage);
  const rushHour = newlyUnlocked.find(a => a.id === 'rush_hour');
  assert.notEqual(rushHour, undefined);
  assert.equal(rushHour?.unlocked, true);
});

test('recordRunCompletion unlocks warp_runner achievement when zen wraparounds >= 20', () => {
  const storage = new MemoryStorage();
  const runState = createInitialState('zen');
  runState.wallsWrapped = 22;

  const { newlyUnlocked } = recordRunCompletion(runState, storage);
  const warpRunner = newlyUnlocked.find(a => a.id === 'warp_runner');
  assert.notEqual(warpRunner, undefined);
  assert.equal(warpRunner?.unlocked, true);
});

test('recordRunCompletion unlocks aegis_master achievement when shieldsUsed >= 1', () => {
  const storage = new MemoryStorage();
  const runState = createInitialState('classic');
  runState.shieldsUsed = 1;
  runState.powerUpsCollected = 2;

  const { stats, newlyUnlocked } = recordRunCompletion(runState, storage);
  assert.equal(stats.shieldsUsed, 1);
  assert.equal(stats.powerUpsCollected, 2);

  const aegisMaster = newlyUnlocked.find(a => a.id === 'aegis_master');
  assert.notEqual(aegisMaster, undefined);
  assert.equal(aegisMaster?.unlocked, true);
});

test('resetStatsAndAchievements cleans all records back to defaults', () => {
  const storage = new MemoryStorage();
  saveStats({ ...DEFAULT_STATS, runsPlayed: 99, totalScore: 8888 }, storage);
  saveAchievements(
    INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: true })),
    storage
  );

  resetStatsAndAchievements(storage);

  const stats = loadStats(storage);
  assert.equal(stats.runsPlayed, 0);
  assert.equal(stats.totalScore, 0);

  const achievements = loadAchievements(storage);
  assert.equal(achievements.every(a => a.unlocked === false), true);
});

