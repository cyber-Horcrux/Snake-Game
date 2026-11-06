import test from 'node:test';
import assert from 'node:assert/strict';
import type { StorageLike } from './persistence.ts';
import type { PlayerSkinsState, SnakeSkinId } from './types.ts';
import {
  ALL_SKIN_IDS,
  DEFAULT_PLAYER_SKINS_STATE,
  STARTER_SKIN_IDS,
  checkSkinUnlockEligibility,
  getAllSkinDefinitions,
  getSkinDefinition,
  getSkinUnlockDescription,
  isSkinUnlocked,
  isValidSkinId,
  reconcilePlayerSkins,
  sanitizePlayerSkinsState,
} from './skins.ts';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from './constants.ts';
import {
  equipSkin,
  loadPlayerSkins,
  loadSettings,
  resetPlayerSkins,
  savePlayerSkins,
  saveSettings,
  unlockSkin,
} from './persistence.ts';
import {
  loadPlayerProgression,
  savePlayerProgression,
  createDefaultPlayerProgression,
} from './levels.ts';
import { loadStats, saveStats, DEFAULT_STATS } from './stats.ts';
import {
  createInitialDailyState,
  loadDailyChallengeState,
  saveDailyChallengeState,
} from './challenges.ts';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  public failNextWrite = false;
  public failKeyWrite: string | null = null;
  public writeAttempt = 0;
  public shouldFailWrite?: (key: string, attempt: number) => boolean;

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.writeAttempt++;
    if (
      this.failNextWrite ||
      (this.failKeyWrite && key === this.failKeyWrite) ||
      (this.shouldFailWrite && this.shouldFailWrite(key, this.writeAttempt))
    ) {
      throw new Error(`Simulated write error for ${key} at attempt ${this.writeAttempt}`);
    }
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
    this.writeAttempt = 0;
  }
}

// -----------------------------------------------------------------------------
// 1. Default Ownership Tests
// -----------------------------------------------------------------------------

test('Default Ownership 1: Fresh state unlocks both starter skins and equips Cyber Cyan', () => {
  const storage = new MemoryStorage();
  const loaded = loadPlayerSkins(storage);

  assert.equal(loaded.equippedSkinId, 'cyber_cyan');
  assert.equal(loaded.unlockedSkinIds.length, 2);
  assert.ok(loaded.unlockedSkinIds.includes('cyber_cyan'));
  assert.ok(loaded.unlockedSkinIds.includes('matrix_green'));
});

test('Default Ownership 2: Default state constants are immutable and safely cloned', () => {
  const s1 = loadPlayerSkins(new MemoryStorage());
  s1.unlockedSkinIds.push('synth_sunset');

  const s2 = loadPlayerSkins(new MemoryStorage());
  assert.equal(s2.unlockedSkinIds.length, 2);
  assert.ok(!s2.unlockedSkinIds.includes('synth_sunset'));
});

test('Default Ownership 3: Exactly 8 skin definitions are authored and valid', () => {
  const defs = getAllSkinDefinitions();
  assert.equal(defs.length, 8);
  assert.equal(ALL_SKIN_IDS.length, 8);

  for (const def of defs) {
    assert.ok(isValidSkinId(def.id));
    assert.ok(def.name.length > 0);
    assert.ok(def.tagline.length > 0);
    assert.ok(def.headColor.startsWith('#'));
    assert.ok(def.headGlow.startsWith('#'));
    assert.ok(def.eyeColor.startsWith('#'));
    assert.equal(def.bodyColors.length, 3);
  }
});

// -----------------------------------------------------------------------------
// 2. Unlock Eligibility & Progression Integration
// -----------------------------------------------------------------------------

test('Unlocking 4: Level 3 unlocks Synth Sunset', () => {
  const synthDef = getSkinDefinition('synth_sunset');
  assert.equal(checkSkinUnlockEligibility(synthDef, { level: 1, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(synthDef, { level: 2, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(synthDef, { level: 3, zenWallsWrapped: 0, campaignVictories: 0 }), true);
  assert.equal(checkSkinUnlockEligibility(synthDef, { level: 10, zenWallsWrapped: 0, campaignVictories: 0 }), true);
});

test('Unlocking 5: Level 7 unlocks Hyper Violet', () => {
  const violetDef = getSkinDefinition('hyper_violet');
  assert.equal(checkSkinUnlockEligibility(violetDef, { level: 6, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(violetDef, { level: 7, zenWallsWrapped: 0, campaignVictories: 0 }), true);
  assert.equal(checkSkinUnlockEligibility(violetDef, { level: 14, zenWallsWrapped: 0, campaignVictories: 0 }), true);
});

test('Unlocking 6: Level 15 unlocks Crimson Blaze', () => {
  const crimsonDef = getSkinDefinition('crimson_blaze');
  assert.equal(checkSkinUnlockEligibility(crimsonDef, { level: 14, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(crimsonDef, { level: 15, zenWallsWrapped: 0, campaignVictories: 0 }), true);
  assert.equal(checkSkinUnlockEligibility(crimsonDef, { level: 20, zenWallsWrapped: 0, campaignVictories: 0 }), true);
});

test('Unlocking 7: 50 verified Zen wall wraps unlock Arctic Frost', () => {
  const arcticDef = getSkinDefinition('arctic_frost');
  assert.equal(checkSkinUnlockEligibility(arcticDef, { level: 1, zenWallsWrapped: 49, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(arcticDef, { level: 1, zenWallsWrapped: 50, campaignVictories: 0 }), true);
  assert.equal(checkSkinUnlockEligibility(arcticDef, { level: 1, zenWallsWrapped: 120, campaignVictories: 0 }), true);
});

test('Unlocking 8: Level 20 independently unlocks Arctic Frost (Dual-path unlock)', () => {
  const arcticDef = getSkinDefinition('arctic_frost');
  assert.equal(checkSkinUnlockEligibility(arcticDef, { level: 19, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(arcticDef, { level: 20, zenWallsWrapped: 0, campaignVictories: 0 }), true);
});

test('Unlocking 9: Level 25 unlocks Solar Prestige', () => {
  const goldDef = getSkinDefinition('gold_prestige');
  assert.equal(checkSkinUnlockEligibility(goldDef, { level: 24, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(goldDef, { level: 25, zenWallsWrapped: 0, campaignVictories: 0 }), true);
  assert.equal(checkSkinUnlockEligibility(goldDef, { level: 50, zenWallsWrapped: 0, campaignVictories: 0 }), true);
});

test('Unlocking 10: Maze Campaign Victory unlocks Apex Void', () => {
  const voidDef = getSkinDefinition('apex_void');
  assert.equal(checkSkinUnlockEligibility(voidDef, { level: 1, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(voidDef, { level: 1, zenWallsWrapped: 0, campaignVictories: 1 }), true);
  assert.equal(checkSkinUnlockEligibility(voidDef, { level: 1, zenWallsWrapped: 0, campaignVictories: 5 }), true);
});

test('Unlocking 11: Level 40 independently unlocks Apex Void (Dual-path unlock)', () => {
  const voidDef = getSkinDefinition('apex_void');
  assert.equal(checkSkinUnlockEligibility(voidDef, { level: 39, zenWallsWrapped: 0, campaignVictories: 0 }), false);
  assert.equal(checkSkinUnlockEligibility(voidDef, { level: 40, zenWallsWrapped: 0, campaignVictories: 0 }), true);
});

// -----------------------------------------------------------------------------
// 3. Idempotency & Reconciliation Tests
// -----------------------------------------------------------------------------

test('Idempotency 12: Reconciling player skins twice produces identical state with zero duplicate unlocks', () => {
  const initial = DEFAULT_PLAYER_SKINS_STATE;
  const context = { level: 7, zenWallsWrapped: 0, campaignVictories: 0 };

  const pass1 = reconcilePlayerSkins(initial, context);
  assert.deepEqual(pass1.newlyUnlocked, ['synth_sunset', 'hyper_violet']);
  assert.equal(pass1.state.unlockedSkinIds.length, 4);

  const pass2 = reconcilePlayerSkins(pass1.state, context);
  assert.deepEqual(pass2.newlyUnlocked, []);
  assert.equal(pass2.state.unlockedSkinIds.length, 4);
  assert.deepEqual(pass1.state, pass2.state);
});

test('Idempotency 13: Previously unlocked skins are never lost when reconciling lower telemetry', () => {
  const stateWithHighUnlocks: PlayerSkinsState = {
    equippedSkinId: 'gold_prestige',
    unlockedSkinIds: ['cyber_cyan', 'matrix_green', 'gold_prestige'],
  };

  // Reconcile with Level 1 telemetry
  const res = reconcilePlayerSkins(stateWithHighUnlocks, { level: 1, zenWallsWrapped: 0, campaignVictories: 0 });
  assert.ok(res.state.unlockedSkinIds.includes('gold_prestige'));
  assert.equal(res.state.equippedSkinId, 'gold_prestige');
});

test('Idempotency 14: Repeated unlockSkin calls are safe and non-duplicative', () => {
  const storage = new MemoryStorage();
  const res1 = unlockSkin('synth_sunset', storage);
  assert.equal(res1.success, true);
  assert.equal(res1.state.unlockedSkinIds.filter(id => id === 'synth_sunset').length, 1);

  const res2 = unlockSkin('synth_sunset', storage);
  assert.equal(res2.success, true);
  assert.equal(res2.state.unlockedSkinIds.filter(id => id === 'synth_sunset').length, 1);
});

// -----------------------------------------------------------------------------
// 4. Equipping & Persistence Tests
// -----------------------------------------------------------------------------

test('Equipping 15: Unlocked skin can be equipped and survives storage reload', () => {
  const storage = new MemoryStorage();
  // Matrix emerald is a default starter skin
  const res = equipSkin('matrix_green', storage);
  assert.equal(res.success, true);
  assert.equal(res.state.equippedSkinId, 'matrix_green');

  const reloaded = loadPlayerSkins(storage);
  assert.equal(reloaded.equippedSkinId, 'matrix_green');

  // Also verifies settings synchronization
  const settings = loadSettings(storage);
  assert.equal(settings.skin, 'matrix_green');
});

test('Equipping 16: Locked skin cannot be equipped and yields descriptive error', () => {
  const storage = new MemoryStorage();
  const res = equipSkin('gold_prestige', storage);

  assert.equal(res.success, false);
  assert.ok(res.error?.includes('locked'));
  assert.equal(res.state.equippedSkinId, 'cyber_cyan');

  // Verify storage was not modified
  const reloaded = loadPlayerSkins(storage);
  assert.equal(reloaded.equippedSkinId, 'cyber_cyan');
});

test('Equipping 17: Invalid or unknown skin ID is rejected', () => {
  const storage = new MemoryStorage();
  const res = equipSkin('neon_dragon_unknown' as SnakeSkinId, storage);

  assert.equal(res.success, false);
  assert.equal(res.state.equippedSkinId, 'cyber_cyan');
});

test('Equipping 18: Default skin Cyber Cyan can always be re-equipped', () => {
  const storage = new MemoryStorage();
  equipSkin('matrix_green', storage);
  assert.equal(loadPlayerSkins(storage).equippedSkinId, 'matrix_green');

  const reEquip = equipSkin('cyber_cyan', storage);
  assert.equal(reEquip.success, true);
  assert.equal(reEquip.state.equippedSkinId, 'cyber_cyan');
  assert.equal(loadPlayerSkins(storage).equippedSkinId, 'cyber_cyan');
});

// -----------------------------------------------------------------------------
// 5. Defensive Storage & Sanitization Tests
// -----------------------------------------------------------------------------

test('Sanitization 19: Malformed JSON in storage falls back gracefully to default state without crash', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_skins_v1', '{ invalid json garbage');

  const loaded = loadPlayerSkins(storage);
  assert.equal(loaded.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(loaded.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
});

test('Sanitization 20: Unknown IDs and duplicate entries are sanitized cleanly', () => {
  const storage = new MemoryStorage();
  const dirtyData = {
    equippedSkinId: 'fake_skin_99',
    unlockedSkinIds: ['cyber_cyan', 'cyber_cyan', 'matrix_green', 'non_existent_id', 'synth_sunset'],
  };
  storage.setItem('neon_snake_skins_v1', JSON.stringify(dirtyData));

  const loaded = loadPlayerSkins(storage);
  // Fake equipped skin falls back to default Cyber Cyan
  assert.equal(loaded.equippedSkinId, 'cyber_cyan');
  // Unknown items removed and duplicates deduplicated
  assert.deepEqual(loaded.unlockedSkinIds, ['cyber_cyan', 'matrix_green', 'synth_sunset']);
});

test('Sanitization 21: Non-array unlockedSkinIds falls back to starter skins', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_skins_v1', JSON.stringify({ equippedSkinId: 'matrix_green', unlockedSkinIds: 'corrupt_string' }));

  const loaded = loadPlayerSkins(storage);
  assert.equal(loaded.equippedSkinId, 'matrix_green');
  assert.deepEqual(loaded.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
});

test('Sanitization 22: Null storage operations return safe defaults and false writes', () => {
  const loaded = loadPlayerSkins(null);
  assert.equal(loaded.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(loaded.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);

  assert.equal(savePlayerSkins(DEFAULT_PLAYER_SKINS_STATE, null), false);
  assert.equal(resetPlayerSkins(null), false);
});

test('Sanitization 23: Failed write during equipSkin does not leave dirty state', () => {
  const storage = new MemoryStorage();
  storage.failNextWrite = true;

  const res = equipSkin('matrix_green', storage);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Failed to write'));
});

// -----------------------------------------------------------------------------
// 6. Reset Compatibility Tests
// -----------------------------------------------------------------------------

test('Reset 24: resetPlayerSkins restores default starter skins and Cyber Cyan', () => {
  const storage = new MemoryStorage();
  unlockSkin('synth_sunset', storage);
  equipSkin('synth_sunset', storage);

  const beforeReset = loadPlayerSkins(storage);
  assert.equal(beforeReset.equippedSkinId, 'synth_sunset');
  assert.ok(beforeReset.unlockedSkinIds.includes('synth_sunset'));

  const success = resetPlayerSkins(storage);
  assert.equal(success, true);

  const afterReset = loadPlayerSkins(storage);
  assert.equal(afterReset.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(afterReset.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);

  const settings = loadSettings(storage);
  assert.equal(settings.skin, 'cyber_cyan');
});

test('Reset 25: resetPlayerSkins does not mutate unrelated statistics or progression', () => {
  const storage = new MemoryStorage();
  const initialProgression = {
    ...createDefaultPlayerProgression(),
    level: 12,
    totalLifetimeXp: 9000,
  };
  savePlayerProgression(initialProgression, storage);

  const initialStats = {
    ...DEFAULT_STATS,
    totalScore: 9999,
  };
  saveStats(initialStats, storage);

  resetPlayerSkins(storage);

  const reloadedProgression = loadPlayerProgression(storage);
  assert.equal(reloadedProgression.level, 12);
  assert.equal(reloadedProgression.totalLifetimeXp, 9000);

  const reloadedStats = loadStats(storage);
  assert.equal(reloadedStats.totalScore, 9999);
});

// -----------------------------------------------------------------------------
// 7. Non-Interference Tests
// -----------------------------------------------------------------------------

test('Non-Interference 26: Unlocking skins never alters lifetime XP, current XP, or level', () => {
  const storage = new MemoryStorage();
  const progBefore = {
    ...createDefaultPlayerProgression(),
    level: 5,
    currentXp: 200,
    totalLifetimeXp: 1150,
  };
  savePlayerProgression(progBefore, storage);

  unlockSkin('crimson_blaze', storage);

  const progAfter = loadPlayerProgression(storage);
  assert.equal(progAfter.level, progBefore.level);
  assert.equal(progAfter.currentXp, progBefore.currentXp);
  assert.equal(progAfter.totalLifetimeXp, progBefore.totalLifetimeXp);
});

test('Non-Interference 27: Unlocking skins never alters Trophy Stars or Daily Challenge state', () => {
  const storage = new MemoryStorage();
  const dailyState = createInitialDailyState('2026-11-06');
  dailyState.lifetimeStars = 75;
  saveDailyChallengeState(dailyState, storage);

  unlockSkin('arctic_frost', storage);

  const reloadedDaily = loadDailyChallengeState(storage);
  assert.equal(reloadedDaily.lifetimeStars, 75);
});

test('Descriptions 28: getSkinUnlockDescription accurately outputs official level titles and criteria', () => {
  assert.equal(getSkinUnlockDescription('cyber_cyan'), 'Available by default');
  assert.equal(getSkinUnlockDescription('matrix_green'), 'Available by default');
  assert.equal(getSkinUnlockDescription('synth_sunset'), 'Reach Level 3 (Grid Runner)');
  assert.equal(getSkinUnlockDescription('hyper_violet'), 'Reach Level 7 (Pulse Master)');
  assert.equal(getSkinUnlockDescription('crimson_blaze'), 'Reach Level 15 (Neon Phantom)');
  assert.equal(getSkinUnlockDescription('gold_prestige'), 'Reach Level 25 (Solar Sentinel)');
  assert.ok(getSkinUnlockDescription('arctic_frost').includes('Wrap 50 boundaries in Zen Mode'));
  assert.ok(getSkinUnlockDescription('arctic_frost').includes('Level 20 (Vortex Overlord)'));
  assert.ok(getSkinUnlockDescription('apex_void').includes('Complete the Maze Campaign'));
  assert.ok(getSkinUnlockDescription('apex_void').includes('Level 40 (Quantum Basilisk)'));
});

// -----------------------------------------------------------------------------
// 8. Legacy Skin Compatibility & Ownership Audit (Scenarios 1 - 8)
// -----------------------------------------------------------------------------

test('Legacy Audit 29 [Scenario 1 - Fresh Installation]: Empty storage loads default state and settings', () => {
  const storage = new MemoryStorage();
  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);

  const settings = loadSettings(storage);
  assert.equal(settings.skin, 'cyber_cyan');
});

test('Legacy Audit 30 [Scenario 2 - Existing with cyber_cyan]: Preserves cyber_cyan as default starter', () => {
  const storage = new MemoryStorage();
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'cyber_cyan' }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
});

test('Legacy Audit 31 [Scenario 3 - Existing with matrix_green]: Preserves matrix_green starter choice', () => {
  const storage = new MemoryStorage();
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'matrix_green' }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'matrix_green');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
});

test('Legacy Audit 32 [Scenario 4 - Existing with synth_sunset]: Does not grant unearned ownership, falls back to cyber_cyan', () => {
  const storage = new MemoryStorage();
  // Player selected synth_sunset in legacy settings without having unlocked it
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'synth_sunset' }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
  assert.equal(isSkinUnlocked('synth_sunset', skins), false);

  // Verifies settings file is not destroyed
  const settings = loadSettings(storage);
  assert.equal(settings.skin, 'synth_sunset');
});

test('Legacy Audit 33 [Scenario 5 - Existing with hyper_violet]: Does not grant unearned ownership, falls back to cyber_cyan', () => {
  const storage = new MemoryStorage();
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'hyper_violet' }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
  assert.equal(isSkinUnlocked('hyper_violet', skins), false);
});

test('Legacy Audit 34 [Scenario 6 - Existing with gold_prestige]: Does not grant unearned ownership, falls back to cyber_cyan', () => {
  const storage = new MemoryStorage();
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'gold_prestige' }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'cyber_cyan');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
  assert.equal(isSkinUnlocked('gold_prestige', skins), false);
});

test('Legacy Audit 35 [Scenario 7 - Missing skin ledger with valid settings]: Recovers gracefully without data loss', () => {
  const storage = new MemoryStorage();
  saveSettings({
    ...DEFAULT_SETTINGS,
    controlMode: 'both',
    dpadPreference: 'always',
    skin: 'matrix_green',
  }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'matrix_green');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);

  const settings = loadSettings(storage);
  assert.equal(settings.controlMode, 'both');
  assert.equal(settings.dpadPreference, 'always');
  assert.equal(settings.skin, 'matrix_green');
});

test('Legacy Audit 36 [Scenario 8 - Corrupted skin ledger with valid settings]: Recovers starter preference and protects against crash', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.SKINS, '{"equippedSkinId": invalid_json_syntax');
  saveSettings({ ...DEFAULT_SETTINGS, skin: 'matrix_green' }, storage);

  const skins = loadPlayerSkins(storage);
  assert.equal(skins.equippedSkinId, 'matrix_green');
  assert.deepEqual(skins.unlockedSkinIds, ['cyber_cyan', 'matrix_green']);
});

// -----------------------------------------------------------------------------
// 9. Two-Storage Transaction Synchronization & Rollback
// -----------------------------------------------------------------------------

test('Sync 37: equipSkin synchronizes both STORAGE_KEYS.SKINS and STORAGE_KEYS.SETTINGS', () => {
  const storage = new MemoryStorage();
  const res = equipSkin('matrix_green', storage);
  assert.equal(res.success, true);

  const skins = loadPlayerSkins(storage);
  const settings = loadSettings(storage);

  assert.equal(skins.equippedSkinId, 'matrix_green');
  assert.equal(settings.skin, 'matrix_green');
});

test('Sync 38: equipSkin rolls back skins persistence if settings write fails', () => {
  const storage = new MemoryStorage();
  // Initially equipped with cyber_cyan
  assert.equal(loadPlayerSkins(storage).equippedSkinId, 'cyber_cyan');
  assert.equal(loadSettings(storage).skin, 'cyber_cyan');

  // Trigger failure specifically when writing to STORAGE_KEYS.SETTINGS
  storage.failKeyWrite = STORAGE_KEYS.SETTINGS;

  const res = equipSkin('matrix_green', storage);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Failed to synchronize skin with game settings'));

  // Ensure skins storage rolled back to cyber_cyan to prevent desynchronization
  const reloadedSkins = loadPlayerSkins(storage);
  assert.equal(reloadedSkins.equippedSkinId, 'cyber_cyan');
});

test('Sync 39: equipSkin aborts cleanly if initial skins storage write fails', () => {
  const storage = new MemoryStorage();
  storage.failKeyWrite = STORAGE_KEYS.SKINS;

  const res = equipSkin('matrix_green', storage);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Failed to write skin persistence'));

  const settings = loadSettings(storage);
  assert.equal(settings.skin, 'cyber_cyan');
});

test('Sync 40: resetPlayerSkins returns false if storage write throws', () => {
  const storage = new MemoryStorage();
  storage.failNextWrite = true;

  const res = resetPlayerSkins(storage);
  assert.equal(res, false);
});

test('Sync 41: equipSkin honestly reports failure when both settings write AND skins rollback fail', () => {
  const storage = new MemoryStorage();
  // Attempt 1: write updated skins (succeeds)
  // Attempt 2: write updated settings (fails)
  // Attempt 3: write rollback skins (fails)
  storage.shouldFailWrite = (key: string, attempt: number) => {
    if (attempt === 2 && key === STORAGE_KEYS.SETTINGS) return true;
    if (attempt === 3 && key === STORAGE_KEYS.SKINS) return true;
    return false;
  };

  const res = equipSkin('matrix_green', storage);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Critical: Storage rollback also failed'));
  // State honestly reports matrix_green because the rollback to cyber_cyan failed!
  assert.equal(res.state.equippedSkinId, 'matrix_green');
});

test('Sync 42: resetPlayerSkins rolls back skins ledger if settings reset fails', () => {
  const storage = new MemoryStorage();
  // Set up user with an unlocked & equipped skin
  unlockSkin('synth_sunset', storage);
  equipSkin('synth_sunset', storage);

  const initialSkins = loadPlayerSkins(storage);
  assert.equal(initialSkins.equippedSkinId, 'synth_sunset');
  const initialSettings = loadSettings(storage);
  assert.equal(initialSettings.skin, 'synth_sunset');

  // Attempt 1: savePlayerSkins(DEFAULT_PLAYER_SKINS_STATE) succeeds
  // Attempt 2: saveSettings({ ...settings, skin: 'cyber_cyan' }) fails
  // Attempt 3: savePlayerSkins(currentSkins) rollback succeeds
  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    return attempt === 2 && key === STORAGE_KEYS.SETTINGS;
  };

  const success = resetPlayerSkins(storage);
  assert.equal(success, false);

  // Verify rollback restored initial skins state so skins were not left partially wiped
  const reloadedSkins = loadPlayerSkins(storage);
  assert.equal(reloadedSkins.equippedSkinId, 'synth_sunset');
  assert.ok(reloadedSkins.unlockedSkinIds.includes('synth_sunset'));
});

test('Sync 43: resetPlayerSkins does not touch settings if initial skins write fails', () => {
  const storage = new MemoryStorage();
  unlockSkin('synth_sunset', storage);
  equipSkin('synth_sunset', storage);

  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    return attempt === 1 && key === STORAGE_KEYS.SKINS;
  };

  const success = resetPlayerSkins(storage);
  assert.equal(success, false);

  // Settings should never have been touched
  const settings = loadSettings(storage);
  assert.equal(settings.skin, 'synth_sunset');
});

test('Sync 44: resetPlayerSkins returns false if both settings reset and skins rollback fail', () => {
  const storage = new MemoryStorage();
  unlockSkin('synth_sunset', storage);
  equipSkin('synth_sunset', storage);

  storage.writeAttempt = 0;
  // Attempt 1: reset skins (succeeds)
  // Attempt 2: reset settings (fails)
  // Attempt 3: rollback skins (fails)
  storage.shouldFailWrite = (key: string, attempt: number) => {
    if (attempt === 2 && key === STORAGE_KEYS.SETTINGS) return true;
    if (attempt === 3 && key === STORAGE_KEYS.SKINS) return true;
    return false;
  };

  const success = resetPlayerSkins(storage);
  assert.equal(success, false);
});
