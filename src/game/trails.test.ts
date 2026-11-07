import test from 'node:test';
import assert from 'node:assert/strict';
import type { StorageLike } from './persistence.ts';
import type { PlayerTrailsState, SnakeTrailId, TrailUnlockContext } from './types.ts';
import {
  ALL_TRAIL_IDS,
  DEFAULT_PLAYER_TRAILS_STATE,
  STARTER_TRAIL_IDS,
  checkTrailUnlockEligibility,
  getAllTrailDefinitions,
  getTrailDefinition,
  getTrailUnlockDescription,
  isTrailUnlocked,
  isValidTrailId,
  reconcilePlayerTrails,
  sanitizePlayerTrailsState,
} from './trails.ts';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from './constants.ts';
import {
  equipTrail,
  loadPlayerTrails,
  loadSettings,
  reconcileAndMigratePlayerTrails,
  resetPlayerTrails,
  savePlayerTrails,
  saveSettings,
  unlockTrail,
} from './persistence.ts';
import { createDefaultPlayerProgression } from './levels.ts';
import { DEFAULT_STATS } from './stats.ts';

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
// 1. Trail Definitions and Defaults
// -----------------------------------------------------------------------------

test('Trail Defaults 1: Default state equips cyber_pulse and has starter trails unlocked', () => {
  const storage = new MemoryStorage();
  const loaded = loadPlayerTrails(storage);

  assert.equal(loaded.equippedTrailId, 'cyber_pulse');
  assert.equal(loaded.unlockedTrailIds.length, 2);
  assert.ok(loaded.unlockedTrailIds.includes('none'));
  assert.ok(loaded.unlockedTrailIds.includes('cyber_pulse'));
});

test('Trail Defaults 2: Exactly 8 unique trail definitions exist and are valid', () => {
  const defs = getAllTrailDefinitions();
  assert.equal(defs.length, 8);
  assert.equal(ALL_TRAIL_IDS.length, 8);

  const idSet = new Set<string>();
  for (const def of defs) {
    assert.ok(isValidTrailId(def.id));
    assert.ok(!idSet.has(def.id), `Duplicate trail ID found: ${def.id}`);
    idSet.add(def.id);
    assert.ok(def.name.length > 0);
    assert.ok(def.tagline.length > 0);
    assert.ok(def.style);
    assert.ok(def.color);
    assert.ok(def.secondaryColor);
    assert.ok(def.glowColor !== undefined);
    assert.ok(def.unlock);
  }
});

test('Trail Defaults 3: isValidTrailId handles valid and invalid values correctly', () => {
  assert.equal(isValidTrailId('none'), true);
  assert.equal(isValidTrailId('cyber_pulse'), true);
  assert.equal(isValidTrailId('matrix_stream'), true);
  assert.equal(isValidTrailId('plasma_fire'), true);
  assert.equal(isValidTrailId('hyper_streak'), true);
  assert.equal(isValidTrailId('frost_vapor'), true);
  assert.equal(isValidTrailId('solar_radiance'), true);
  assert.equal(isValidTrailId('void_singularity'), true);

  assert.equal(isValidTrailId(''), false);
  assert.equal(isValidTrailId('unknown_trail'), false);
  assert.equal(isValidTrailId(null), false);
  assert.equal(isValidTrailId(undefined), false);
  assert.equal(isValidTrailId(123), false);
});

test('Trail Defaults 4: getTrailDefinition retrieves correct definitions and falls back safely', () => {
  const cyber = getTrailDefinition('cyber_pulse');
  assert.equal(cyber.name, 'Cyber Pulse');
  assert.equal(cyber.style, 'pulse');

  const none = getTrailDefinition('none');
  assert.equal(none.name, 'Stealth Void');
  assert.equal(none.style, 'none');

  // Unknown fallback to default
  const fallback = getTrailDefinition('invalid_id' as SnakeTrailId);
  assert.equal(fallback.id, 'cyber_pulse');
});

// -----------------------------------------------------------------------------
// 2. Unlock Requirements & Eligibility
// -----------------------------------------------------------------------------

test('Trail Eligibility 1: Starters (none and cyber_pulse) are always eligible', () => {
  const emptyContext: TrailUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
    maxFoodInRun: 0,
  };
  assert.equal(checkTrailUnlockEligibility('none', emptyContext), true);
  assert.equal(checkTrailUnlockEligibility('cyber_pulse', emptyContext), true);
});

test('Trail Eligibility 2: Level progression unlocks (matrix_stream, plasma_fire, hyper_streak)', () => {
  // matrix_stream requires Level 4
  assert.equal(checkTrailUnlockEligibility('matrix_stream', { playerLevel: 1 }), false);
  assert.equal(checkTrailUnlockEligibility('matrix_stream', { playerLevel: 3 }), false);
  assert.equal(checkTrailUnlockEligibility('matrix_stream', { playerLevel: 4 }), true);
  assert.equal(checkTrailUnlockEligibility('matrix_stream', { playerLevel: 10 }), true);

  // plasma_fire requires Level 8
  assert.equal(checkTrailUnlockEligibility('plasma_fire', { playerLevel: 7 }), false);
  assert.equal(checkTrailUnlockEligibility('plasma_fire', { playerLevel: 8 }), true);
  assert.equal(checkTrailUnlockEligibility('plasma_fire', { playerLevel: 15 }), true);

  // hyper_streak requires Level 12 (or alt 25 food in a run)
  assert.equal(checkTrailUnlockEligibility('hyper_streak', { playerLevel: 11, maxFoodInRun: 10 }), false);
  assert.equal(checkTrailUnlockEligibility('hyper_streak', { playerLevel: 12 }), true);
  assert.equal(checkTrailUnlockEligibility('hyper_streak', { playerLevel: 5, maxFoodInRun: 25 }), true);
});

test('Trail Eligibility 3: Zen screen wraps unlock frost_vapor (30 wraps)', () => {
  assert.equal(checkTrailUnlockEligibility('frost_vapor', { zenScreenWraps: 10, playerLevel: 1 }), false);
  assert.equal(checkTrailUnlockEligibility('frost_vapor', { zenScreenWraps: 29, playerLevel: 1 }), false);
  assert.equal(checkTrailUnlockEligibility('frost_vapor', { zenScreenWraps: 30 }), true);
  assert.equal(checkTrailUnlockEligibility('frost_vapor', { zenScreenWraps: 50 }), true);
  assert.equal(checkTrailUnlockEligibility('frost_vapor', { playerLevel: 18 }), true); // alt unlock
});

test('Trail Eligibility 4: Level 25 unlocks solar_radiance', () => {
  assert.equal(checkTrailUnlockEligibility('solar_radiance', { playerLevel: 10 }), false);
  assert.equal(checkTrailUnlockEligibility('solar_radiance', { playerLevel: 24 }), false);
  assert.equal(checkTrailUnlockEligibility('solar_radiance', { playerLevel: 25 }), true);
  assert.equal(checkTrailUnlockEligibility('solar_radiance', { playerLevel: 30 }), true);
});

test('Trail Eligibility 5: Maze Campaign Stage 3 unlocks void_singularity', () => {
  assert.equal(checkTrailUnlockEligibility('void_singularity', { mazeStagesCleared: 1, playerLevel: 1 }), false);
  assert.equal(checkTrailUnlockEligibility('void_singularity', { mazeStagesCleared: 2, playerLevel: 1 }), false);
  assert.equal(checkTrailUnlockEligibility('void_singularity', { mazeStagesCleared: 3 }), true);
  assert.equal(checkTrailUnlockEligibility('void_singularity', { playerLevel: 35 }), true); // alt unlock
});

test('Trail Eligibility 6: getTrailUnlockDescription returns clear descriptions for all trails', () => {
  for (const id of ALL_TRAIL_IDS) {
    const desc = getTrailUnlockDescription(id);
    assert.ok(typeof desc === 'string' && desc.length > 0);
  }
  assert.equal(getTrailUnlockDescription('none'), 'Available by default');
  assert.equal(getTrailUnlockDescription('cyber_pulse'), 'Available by default');
  assert.ok(getTrailUnlockDescription('matrix_stream').includes('Level 4'));
  assert.ok(getTrailUnlockDescription('plasma_fire').includes('Level 8'));
  assert.ok(getTrailUnlockDescription('hyper_streak').includes('Level 12'));
  assert.ok(getTrailUnlockDescription('frost_vapor').includes('30'));
  assert.ok(getTrailUnlockDescription('solar_radiance').includes('Level 25'));
  assert.ok(getTrailUnlockDescription('void_singularity').includes('Stage 3'));
});

// -----------------------------------------------------------------------------
// 3. Reconciliation & Progress Preservation
// -----------------------------------------------------------------------------

test('Trail Reconciliation 1: Idempotent and deterministic', () => {
  const initial: PlayerTrailsState = {
    equippedTrailId: 'cyber_pulse',
    unlockedTrailIds: ['none', 'cyber_pulse'],
  };
  const context: TrailUnlockContext = {
    level: 8,
    zenWallsWrapped: 30,
    highestMazeStage: 2,
    maxFoodInRun: 10,
  };

  const { state: pass1 } = reconcilePlayerTrails(initial, context);
  assert.ok(pass1.unlockedTrailIds.includes('matrix_stream'));
  assert.ok(pass1.unlockedTrailIds.includes('plasma_fire'));
  assert.ok(pass1.unlockedTrailIds.includes('frost_vapor'));
  assert.ok(!pass1.unlockedTrailIds.includes('hyper_streak')); // needs level 12 or food 25

  const { state: pass2 } = reconcilePlayerTrails(pass1, context);
  assert.deepEqual(pass1, pass2);
});

test('Trail Reconciliation 2: Never relocks already unlocked trails even if context drops', () => {
  const state: PlayerTrailsState = {
    equippedTrailId: 'hyper_streak',
    unlockedTrailIds: ['none', 'cyber_pulse', 'hyper_streak', 'void_singularity'],
  };
  // Context with level 1 and 0 stats
  const context: TrailUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 0,
    maxFoodInRun: 0,
  };

  const { state: reconciled } = reconcilePlayerTrails(state, context);
  assert.ok(reconciled.unlockedTrailIds.includes('hyper_streak'));
  assert.ok(reconciled.unlockedTrailIds.includes('void_singularity'));
  assert.equal(reconciled.equippedTrailId, 'hyper_streak');
});

// -----------------------------------------------------------------------------
// 4. Sanitization & Resilience
// -----------------------------------------------------------------------------

test('Trail Sanitization 1: Recovers from invalid, corrupt or empty states', () => {
  const fallback = sanitizePlayerTrailsState(null);
  assert.equal(fallback.equippedTrailId, 'cyber_pulse');
  assert.ok(fallback.unlockedTrailIds.includes('none'));
  assert.ok(fallback.unlockedTrailIds.includes('cyber_pulse'));

  const badArray = sanitizePlayerTrailsState({
    equippedTrailId: 'invalid_trail' as any,
    unlockedTrailIds: ['invalid_1' as any, 'invalid_2' as any],
  });
  assert.equal(badArray.equippedTrailId, 'cyber_pulse');
  assert.ok(badArray.unlockedTrailIds.includes('none'));
  assert.ok(badArray.unlockedTrailIds.includes('cyber_pulse'));
});

test('Trail Sanitization 2: Filters duplicates and falls back if equipped is not unlocked', () => {
  const sanitized = sanitizePlayerTrailsState({
    equippedTrailId: 'solar_radiance', // not in unlocked list
    unlockedTrailIds: ['none', 'cyber_pulse', 'none', 'cyber_pulse', 'matrix_stream'],
  });
  // Should deduplicate and change equipped to first unlocked
  assert.equal(sanitized.unlockedTrailIds.length, 3);
  assert.ok(sanitized.unlockedTrailIds.includes('none'));
  assert.ok(sanitized.unlockedTrailIds.includes('cyber_pulse'));
  assert.ok(sanitized.unlockedTrailIds.includes('matrix_stream'));
  assert.ok(sanitized.unlockedTrailIds.includes(sanitized.equippedTrailId));
});

// -----------------------------------------------------------------------------
// 5. Persistence Operations
// -----------------------------------------------------------------------------

test('Trail Persistence 1: load and save work with StorageLike', () => {
  const storage = new MemoryStorage();
  const state: PlayerTrailsState = {
    equippedTrailId: 'plasma_fire',
    unlockedTrailIds: ['none', 'cyber_pulse', 'plasma_fire'],
  };

  const saved = savePlayerTrails(state, storage);
  assert.equal(saved, true);

  const loaded = loadPlayerTrails(storage);
  assert.equal(loaded.equippedTrailId, 'plasma_fire');
  assert.deepEqual(loaded.unlockedTrailIds, ['none', 'cyber_pulse', 'plasma_fire']);
});

test('Trail Persistence 2: equipTrail validates ownership, updates settings and persists', () => {
  const storage = new MemoryStorage();
  // Initially only starters unlocked
  loadPlayerTrails(storage);

  // Attempt to equip locked trail
  const failResult = equipTrail('void_singularity', storage);
  assert.equal(failResult.success, false);
  assert.ok(failResult.error?.includes('locked'));

  // Unlock matrix_stream first
  unlockTrail('matrix_stream', storage);
  const successResult = equipTrail('matrix_stream', storage);
  assert.equal(successResult.success, true);

  const updatedState = loadPlayerTrails(storage);
  assert.equal(updatedState.equippedTrailId, 'matrix_stream');

  // Verify settings also updated
  const settings = loadSettings(storage);
  assert.equal(settings.trail, 'matrix_stream');
});

test('Trail Persistence 3: equipTrail allows unequipping via none trail', () => {
  const storage = new MemoryStorage();
  const res = equipTrail('none', storage);
  assert.equal(res.success, true);
  const updated = loadPlayerTrails(storage);
  assert.equal(updated.equippedTrailId, 'none');
});

test('Trail Persistence 4: resetPlayerTrails restores initial defaults', () => {
  const storage = new MemoryStorage();
  unlockTrail('solar_radiance', storage);
  equipTrail('solar_radiance', storage);

  resetPlayerTrails(storage);
  const loaded = loadPlayerTrails(storage);
  assert.equal(loaded.equippedTrailId, 'cyber_pulse');
  assert.deepEqual(loaded.unlockedTrailIds, ['none', 'cyber_pulse']);
});

test('Trail Persistence 5: reconcileAndMigratePlayerTrails checks full player profile', () => {
  const storage = new MemoryStorage();
  // Pre-seed progression and stats
  const progression = createDefaultPlayerProgression();
  progression.level = 35; // Unlocks matrix_stream (4), plasma_fire (8), hyper_streak (12), solar_radiance (25), void_singularity (35)

  const stats = {
    ...DEFAULT_STATS,
    wallsWrapped: 30, // Unlocks frost_vapor (30)
  };

  const reconciled = reconcileAndMigratePlayerTrails(storage, {
    progression,
    stats,
    mazeProgress: { stages: {}, bestCampaignScore: 0, highestCompletedStage: 5 },
  });

  assert.ok(reconciled.trailsState.unlockedTrailIds.includes('matrix_stream'));
  assert.ok(reconciled.trailsState.unlockedTrailIds.includes('plasma_fire'));
  assert.ok(reconciled.trailsState.unlockedTrailIds.includes('hyper_streak'));
  assert.ok(reconciled.trailsState.unlockedTrailIds.includes('frost_vapor'));
  assert.ok(reconciled.trailsState.unlockedTrailIds.includes('solar_radiance'));
  assert.ok(reconciled.trailsState.unlockedTrailIds.includes('void_singularity'));
});
