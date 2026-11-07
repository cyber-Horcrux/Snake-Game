/**
 * Board Themes Comprehensive Unit Test Suite
 * Covers theme definitions, starter access, unlock progression, equipping,
 * persistence, sanitization, reconciliation, preview rendering, and game rendering compatibility.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { BoardThemeId, GameEngineState, PlayerThemesState, ThemeUnlockContext } from './types.ts';
import {
  ALL_THEME_IDS,
  BOARD_THEMES,
  DEFAULT_PLAYER_THEMES_STATE,
  STARTER_THEME_IDS,
  createDefaultPlayerThemesState,
  getAllThemeDefinitions,
  getThemeDefinition,
  getThemeUnlockDescription,
  isThemeEligible,
  isThemeUnlocked,
  isValidThemeId,
  reconcilePlayerThemes,
  sanitizePlayerThemesState,
} from './themes.ts';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from './constants.ts';
import {
  equipTheme,
  loadPlayerThemes,
  loadSettings,
  reconcileAndMigratePlayerThemes,
  resetPlayerThemes,
  savePlayerThemes,
  saveSettings,
  unlockTheme,
  type StorageLike,
} from './persistence.ts';
import { drawThemePreview } from './theme_preview.ts';
import { NeonRenderer } from './renderer.ts';
import { createInitialState } from './engine.ts';

function createMockStorage(initialData: Record<string, string> = {}): StorageLike & {
  store: Map<string, string>;
  writeAttempt: number;
  failNextWrite: boolean;
  shouldFailWrite?: (key: string, attempt: number) => boolean;
} {
  const store = new Map<string, string>(Object.entries(initialData));
  const storageObj = {
    store,
    writeAttempt: 0,
    failNextWrite: false,
    shouldFailWrite: undefined as ((key: string, attempt: number) => boolean) | undefined,
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      storageObj.writeAttempt++;
      if (
        storageObj.failNextWrite ||
        (storageObj.shouldFailWrite && storageObj.shouldFailWrite(key, storageObj.writeAttempt))
      ) {
        throw new Error(`Simulated write error for ${key} at attempt ${storageObj.writeAttempt}`);
      }
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
  };
  return storageObj;
}

function createMockCanvasContext(): CanvasRenderingContext2D & { operations: string[] } {
  const operations: string[] = [];
  return {
    operations,
    save: () => operations.push('save()'),
    restore: () => operations.push('restore()'),
    clearRect: (x: number, y: number, w: number, h: number) => operations.push(`clearRect(${x},${y},${w},${h})`),
    fillRect: (x: number, y: number, w: number, h: number) => operations.push(`fillRect(${x},${y},${w},${h})`),
    strokeRect: (x: number, y: number, w: number, h: number) => operations.push(`strokeRect(${x},${y},${w},${h})`),
    beginPath: () => operations.push('beginPath()'),
    closePath: () => operations.push('closePath()'),
    moveTo: (x: number, y: number) => operations.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => operations.push(`lineTo(${x},${y})`),
    stroke: () => operations.push('stroke()'),
    fill: () => operations.push('fill()'),
    arc: (x: number, y: number, r: number) => operations.push(`arc(${x},${y},${r})`),
    scale: (x: number, y: number) => operations.push(`scale(${x},${y})`),
    translate: (x: number, y: number) => operations.push(`translate(${x},${y})`),
    rotate: (a: number) => operations.push(`rotate(${a})`),
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => operations.push(`quadraticCurveTo(${cpx},${cpy},${x},${y})`),
    bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => operations.push(`bezierCurveTo(${cp1x},${cp1y},${cp2x},${cp2y},${x},${y})`),
    createLinearGradient: () => ({
      addColorStop: (offset: number, color: string) => operations.push(`addColorStop(${offset},${color})`),
    }),
    createRadialGradient: (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
      operations.push(`createRadialGradient(${x0},${y0},${r0},${x1},${y1},${r1})`);
      return {
        addColorStop: (offset: number, color: string) => operations.push(`addColorStop(${offset},${color})`),
      } as unknown as CanvasGradient;
    },
    lineWidth: 1,
    strokeStyle: '#000000',
    fillStyle: '#000000',
    shadowColor: 'transparent',
    shadowBlur: 0,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D & { operations: string[] };
}

// =============================================================================
// SECTION 1: Theme Definitions & Identification
// =============================================================================

test('Theme Definitions 1: Exactly 6 unique board theme definitions exist and are valid', () => {
  assert.equal(ALL_THEME_IDS.length, 6, 'Must define exactly 6 board themes');
  const seenIds = new Set<string>();

  for (const id of ALL_THEME_IDS) {
    assert.ok(!seenIds.has(id), `Theme ID ${id} must be unique`);
    seenIds.add(id);

    const theme = BOARD_THEMES[id];
    assert.ok(theme, `Theme definition for ${id} must exist`);
    assert.equal(theme.id, id);
    assert.ok(theme.name && theme.name.length > 0, `Theme ${id} must have a non-empty name`);
    assert.ok(theme.tagline && theme.tagline.length > 0, `Theme ${id} must have a non-empty tagline`);
    assert.ok(theme.category && theme.category.length > 0, `Theme ${id} must have a category`);
    assert.ok(theme.primaryAccent && theme.primaryAccent.startsWith('#'), `Theme ${id} must have valid hex primaryAccent`);
    assert.ok(theme.secondaryAccent && theme.secondaryAccent.startsWith('#'), `Theme ${id} must have valid hex secondaryAccent`);
    assert.ok(theme.floorBg && theme.floorBg.startsWith('#'), `Theme ${id} must have valid hex floorBg`);
    assert.ok(theme.floorGradient.center, `Theme ${id} must have center gradient`);
    assert.ok(theme.floorGradient.edge, `Theme ${id} must have edge gradient`);
    assert.ok(theme.grid.lineColor, `Theme ${id} must have grid lineColor`);
    assert.ok(theme.grid.crosshairColor, `Theme ${id} must have grid crosshairColor`);
    assert.ok(theme.border.outerBase, `Theme ${id} must have border outerBase`);
    assert.ok(theme.border.emissivePerimeter, `Theme ${id} must have border emissivePerimeter`);
    assert.ok(theme.border.cornerReticle, `Theme ${id} must have border cornerReticle`);
    assert.ok(theme.unlock, `Theme ${id} must have unlock criteria`);
  }
});

test('Theme Definitions 2: isValidThemeId distinguishes valid from invalid IDs', () => {
  for (const id of ALL_THEME_IDS) {
    assert.equal(isValidThemeId(id), true, `${id} must be recognized as valid`);
  }

  assert.equal(isValidThemeId(''), false);
  assert.equal(isValidThemeId('random_theme'), false);
  assert.equal(isValidThemeId('neon_grid'), false);
  assert.equal(isValidThemeId(null), false);
  assert.equal(isValidThemeId(undefined), false);
  assert.equal(isValidThemeId(123), false);
});

test('Theme Definitions 3: getThemeDefinition and getAllThemeDefinitions work properly', () => {
  const all = getAllThemeDefinitions();
  assert.equal(all.length, 6);

  const obsidian = getThemeDefinition('obsidian_grid');
  assert.equal(obsidian.name, 'Obsidian Grid');

  // Unknown theme falls back safely to obsidian_grid
  const fallback = getThemeDefinition('unknown' as unknown as BoardThemeId);
  assert.equal(fallback.id, 'obsidian_grid');
});

test('Theme Definitions 4: Starter themes are configured as expected', () => {
  assert.deepEqual(STARTER_THEME_IDS, ['obsidian_grid', 'industrial_foundry']);
  assert.equal(DEFAULT_PLAYER_THEMES_STATE.equippedThemeId, 'obsidian_grid');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, ['obsidian_grid', 'industrial_foundry']);
  assert.equal(DEFAULT_SETTINGS.boardTheme, 'obsidian_grid');
});

// =============================================================================
// SECTION 2: Unlock Eligibility Logic
// =============================================================================

test('Theme Eligibility 1: Starter themes are always eligible', () => {
  const emptyContext: ThemeUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
  };

  assert.equal(isThemeEligible('obsidian_grid', emptyContext), true);
  assert.equal(isThemeEligible('industrial_foundry', emptyContext), true);
});

test('Theme Eligibility 2: Arctic Research unlocks at Level 6 or 25 Zen wraps', () => {
  const baseContext: ThemeUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
  };

  assert.equal(isThemeEligible('arctic_research', baseContext), false);

  // By Level
  assert.equal(isThemeEligible('arctic_research', { ...baseContext, level: 5 }), false);
  assert.equal(isThemeEligible('arctic_research', { ...baseContext, level: 6 }), true);

  // By Zen wraps
  assert.equal(isThemeEligible('arctic_research', { ...baseContext, zenWallsWrapped: 24 }), false);
  assert.equal(isThemeEligible('arctic_research', { ...baseContext, zenWallsWrapped: 25 }), true);
});

test('Theme Eligibility 3: Bio-Dome unlocks at Level 10 or 15 food in a single run', () => {
  const baseContext: ThemeUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
    maxFoodInRun: 0,
  };

  assert.equal(isThemeEligible('bio_dome', baseContext), false);

  // By Level
  assert.equal(isThemeEligible('bio_dome', { ...baseContext, level: 9 }), false);
  assert.equal(isThemeEligible('bio_dome', { ...baseContext, level: 10 }), true);

  // By Food in single run
  assert.equal(isThemeEligible('bio_dome', { ...baseContext, maxFoodInRun: 14 }), false);
  assert.equal(isThemeEligible('bio_dome', { ...baseContext, maxFoodInRun: 15 }), true);
});

test('Theme Eligibility 4: Solar Array unlocks at Level 20 or Stage 2 in Maze Campaign', () => {
  const baseContext: ThemeUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
  };

  assert.equal(isThemeEligible('solar_array', baseContext), false);

  // By Level
  assert.equal(isThemeEligible('solar_array', { ...baseContext, level: 19 }), false);
  assert.equal(isThemeEligible('solar_array', { ...baseContext, level: 20 }), true);

  // By Maze Stage
  assert.equal(isThemeEligible('solar_array', { ...baseContext, highestMazeStage: 1 }), false);
  assert.equal(isThemeEligible('solar_array', { ...baseContext, highestMazeStage: 2 }), true);
});

test('Theme Eligibility 5: Void Observatory unlocks at Level 35 or Maze Campaign Victory', () => {
  const baseContext: ThemeUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
    campaignWon: false,
  };

  assert.equal(isThemeEligible('void_observatory', baseContext), false);

  // By Level
  assert.equal(isThemeEligible('void_observatory', { ...baseContext, level: 34 }), false);
  assert.equal(isThemeEligible('void_observatory', { ...baseContext, level: 35 }), true);

  // By Campaign Victory
  assert.equal(isThemeEligible('void_observatory', { ...baseContext, campaignWon: true }), true);
});

test('Theme Eligibility 6: getThemeUnlockDescription returns clear descriptions for all themes', () => {
  for (const id of ALL_THEME_IDS) {
    const desc = getThemeUnlockDescription(id);
    assert.ok(typeof desc === 'string' && desc.length > 0);
  }

  // Checks both primary and alt requirements in description
  const arcticDesc = getThemeUnlockDescription('arctic_research');
  assert.ok(arcticDesc.includes('Level 6'));
  assert.ok(arcticDesc.includes('25'));
});

// =============================================================================
// SECTION 3: State Sanitization & Reconciliation
// =============================================================================

test('Theme Sanitization 1: Recovers gracefully from corrupted, null, or empty states', () => {
  assert.deepEqual(sanitizePlayerThemesState(null), DEFAULT_PLAYER_THEMES_STATE);
  assert.deepEqual(sanitizePlayerThemesState(undefined), DEFAULT_PLAYER_THEMES_STATE);
  assert.deepEqual(sanitizePlayerThemesState('corrupted'), DEFAULT_PLAYER_THEMES_STATE);
  assert.deepEqual(sanitizePlayerThemesState({}), DEFAULT_PLAYER_THEMES_STATE);

  // Guarantees starter themes are always unlocked
  const sanitizedEmpty = sanitizePlayerThemesState({ unlockedThemeIds: [] });
  assert.ok(sanitizedEmpty.unlockedThemeIds.includes('obsidian_grid'));
  assert.ok(sanitizedEmpty.unlockedThemeIds.includes('industrial_foundry'));
});

test('Theme Sanitization 2: Filters invalid IDs and falls back if equipped is not unlocked', () => {
  const dirty = {
    equippedThemeId: 'void_observatory', // not in unlocked list
    unlockedThemeIds: ['obsidian_grid', 'fake_theme', 123, 'arctic_research'],
  };

  const clean = sanitizePlayerThemesState(dirty);
  assert.deepEqual(clean.unlockedThemeIds, ['obsidian_grid', 'industrial_foundry', 'arctic_research']);
  // Falls back to a valid unlocked theme
  assert.equal(clean.equippedThemeId, 'obsidian_grid');
});

test('Theme Reconciliation 1: Idempotent and deterministic', () => {
  const context: ThemeUnlockContext = {
    level: 10,
    zenWallsWrapped: 30,
    highestMazeStage: 2,
    maxFoodInRun: 20,
    campaignWon: false,
  };

  const initial: PlayerThemesState = {
    equippedThemeId: 'obsidian_grid',
    unlockedThemeIds: ['obsidian_grid', 'industrial_foundry'],
  };

  const first = reconcilePlayerThemes(initial, context);
  assert.ok(first.newlyUnlocked.length > 0);
  assert.ok(first.state.unlockedThemeIds.includes('arctic_research'));
  assert.ok(first.state.unlockedThemeIds.includes('bio_dome'));
  assert.ok(first.state.unlockedThemeIds.includes('solar_array'));

  // Second pass with same context produces no newly unlocked
  const second = reconcilePlayerThemes(first.state, context);
  assert.deepEqual(second.newlyUnlocked, []);
  assert.deepEqual(second.state, first.state);
});

test('Theme Reconciliation 2: Never relocks already unlocked themes even if context drops', () => {
  const unlockedAll: PlayerThemesState = {
    equippedThemeId: 'void_observatory',
    unlockedThemeIds: [...ALL_THEME_IDS],
  };

  // Telemetry dropped (e.g. fresh session or reset context)
  const lowContext: ThemeUnlockContext = {
    level: 1,
    zenWallsWrapped: 0,
    highestMazeStage: 1,
    campaignWon: false,
  };

  const result = reconcilePlayerThemes(unlockedAll, lowContext);
  assert.deepEqual(result.newlyUnlocked, []);
  assert.equal(result.state.equippedThemeId, 'void_observatory');
  assert.deepEqual(result.state.unlockedThemeIds, ALL_THEME_IDS);
});

// =============================================================================
// SECTION 4: Persistence, Equipping & Settings Mirror
// =============================================================================

test('Theme Persistence 1: load and save work with mock StorageLike', () => {
  const storage = createMockStorage();

  // Fresh load returns default state
  const initial = loadPlayerThemes(storage);
  assert.deepEqual(initial, DEFAULT_PLAYER_THEMES_STATE);

  // Save updated state
  const updated: PlayerThemesState = {
    equippedThemeId: 'industrial_foundry',
    unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
  };
  const saved = savePlayerThemes(updated, storage);
  assert.equal(saved, true);

  // Reload
  const reloaded = loadPlayerThemes(storage);
  assert.deepEqual(reloaded, updated);
});

test('Theme Persistence 2: equipTheme validates ownership, updates settings and persists', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'obsidian_grid',
      unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'obsidian_grid',
    }),
  });

  // Equip unlocked theme
  const equipResult = equipTheme('arctic_research', storage);
  assert.equal(equipResult.success, true);
  assert.equal(equipResult.state.equippedThemeId, 'arctic_research');

  // Verify settings mirror was synchronized
  const settings = loadSettings(storage);
  assert.equal(settings.boardTheme, 'arctic_research');

  // Attempt to equip locked theme fails
  const lockedResult = equipTheme('void_observatory', storage);
  assert.equal(lockedResult.success, false);
  assert.ok(lockedResult.error?.includes('locked'));

  // Attempt to equip invalid theme fails
  const invalidResult = equipTheme('nonexistent' as unknown as BoardThemeId, storage);
  assert.equal(invalidResult.success, false);
});

test('Theme Persistence 3: unlockTheme unlocks single theme safely', () => {
  const storage = createMockStorage();
  const res = unlockTheme('solar_array', storage);
  assert.equal(res.success, true);
  assert.ok(res.state.unlockedThemeIds.includes('solar_array'));

  // Unlocking already unlocked theme is a no-op success
  const res2 = unlockTheme('solar_array', storage);
  assert.equal(res2.success, true);
  assert.ok(res2.state.unlockedThemeIds.includes('solar_array'));
});

test('Theme Persistence 3b: unlockTheme handles write failure, invalid IDs, and null storage', () => {
  // 1. Write failure when savePlayerThemes throws/fails
  const failableStorage = createMockStorage();
  failableStorage.failNextWrite = true;

  const initialThemes = loadPlayerThemes(failableStorage);
  assert.ok(!initialThemes.unlockedThemeIds.includes('solar_array'));

  const failRes = unlockTheme('solar_array', failableStorage);
  assert.equal(failRes.success, false, 'Must never return success: true when write fails');
  assert.deepEqual(failRes.state, initialThemes, 'Must return the previous state on failure');
  assert.ok(failRes.error?.includes('Failed to write theme persistence to storage'), 'Must return clear error');

  // Verify storage was not updated
  const storageAfterFail = loadPlayerThemes(failableStorage);
  assert.ok(!storageAfterFail.unlockedThemeIds.includes('solar_array'));

  // 2. Invalid theme ID rejection
  const normalStorage = createMockStorage();
  const invalidRes = unlockTheme('non_existent_theme' as unknown as BoardThemeId, normalStorage);
  assert.equal(invalidRes.success, false);
  assert.ok(invalidRes.error?.includes('Invalid theme identifier'));
  assert.deepEqual(invalidRes.state, DEFAULT_PLAYER_THEMES_STATE);

  // 3. Null storage failure
  const nullRes = unlockTheme('solar_array', null);
  assert.equal(nullRes.success, false);
  assert.ok(nullRes.error?.includes('Failed to write theme persistence to storage'));
  assert.deepEqual(nullRes.state, DEFAULT_PLAYER_THEMES_STATE);
});

test('Theme Persistence 4: resetPlayerThemes restores initial defaults', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'solar_array',
      unlockedThemeIds: [...ALL_THEME_IDS],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'solar_array',
    }),
  });

  const resetResult = resetPlayerThemes(storage);
  assert.equal(resetResult.success, true);
  assert.deepEqual(resetResult.state, DEFAULT_PLAYER_THEMES_STATE);

  const themes = loadPlayerThemes(storage);
  assert.deepEqual(themes, DEFAULT_PLAYER_THEMES_STATE);

  const settings = loadSettings(storage);
  assert.equal(settings.boardTheme, 'obsidian_grid');
});

test('Theme Persistence 4b: equipTheme rollback succeeds when settings write fails', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'obsidian_grid',
      unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'obsidian_grid',
    }),
  });

  // Attempt 1: savePlayerThemes(updated) succeeds
  // Attempt 2: saveSettings(updated) fails
  // Attempt 3: savePlayerThemes(current) rollback succeeds
  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    return attempt === 2 && key === STORAGE_KEYS.SETTINGS;
  };

  const res = equipTheme('arctic_research', storage);
  assert.equal(res.success, false);
  assert.equal(res.state.equippedThemeId, 'obsidian_grid', 'State must report previous state because rollback succeeded');
  assert.ok(res.error?.includes('Failed to synchronize board theme with game settings'));
  assert.ok(!res.error?.includes('Critical'), 'Must not report critical error when rollback succeeds');

  // Verify theme in storage was restored
  const reloaded = loadPlayerThemes(storage);
  assert.equal(reloaded.equippedThemeId, 'obsidian_grid');
});

test('Theme Persistence 4c: equipTheme reports critical error honestly when settings write and rollback both fail', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'obsidian_grid',
      unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'obsidian_grid',
    }),
  });

  // Attempt 1: savePlayerThemes(updated) succeeds
  // Attempt 2: saveSettings(updated) fails
  // Attempt 3: savePlayerThemes(current) rollback fails!
  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    if (attempt === 2 && key === STORAGE_KEYS.SETTINGS) return true;
    if (attempt === 3 && key === STORAGE_KEYS.THEMES) return true;
    return false;
  };

  const res = equipTheme('arctic_research', storage);
  assert.equal(res.success, false);
  // State honestly reports arctic_research because rollback to obsidian_grid failed!
  assert.equal(res.state.equippedThemeId, 'arctic_research', 'Must never claim previous state was restored when rollback fails');
  assert.ok(res.error?.includes('Critical: Storage rollback to previous state also failed'), 'Must return explicit critical error');

  // Verify storage actually contains arctic_research
  const reloaded = loadPlayerThemes(storage);
  assert.equal(reloaded.equippedThemeId, 'arctic_research');
});

test('Theme Persistence 4d: resetPlayerThemes rollback succeeds when settings reset fails', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'arctic_research',
      unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'arctic_research',
    }),
  });

  // Attempt 1: savePlayerThemes(defaultState) succeeds
  // Attempt 2: saveSettings(default) fails
  // Attempt 3: savePlayerThemes(currentThemes) rollback succeeds
  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    return attempt === 2 && key === STORAGE_KEYS.SETTINGS;
  };

  const res = resetPlayerThemes(storage);
  assert.equal(res.success, false);
  assert.equal(res.state.equippedThemeId, 'arctic_research', 'State must report previous state because rollback succeeded');
  assert.ok(res.error?.includes('Failed to synchronize reset board theme with game settings'));
  assert.ok(!res.error?.includes('Critical'));

  // Verify storage contains previous themes
  const reloaded = loadPlayerThemes(storage);
  assert.equal(reloaded.equippedThemeId, 'arctic_research');
  assert.ok(reloaded.unlockedThemeIds.includes('arctic_research'));
});

test('Theme Persistence 4e: resetPlayerThemes reports critical error honestly when settings reset and rollback both fail', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'arctic_research',
      unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'arctic_research',
    }),
  });

  // Attempt 1: savePlayerThemes(defaultState) succeeds
  // Attempt 2: saveSettings(default) fails
  // Attempt 3: savePlayerThemes(currentThemes) rollback fails!
  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    if (attempt === 2 && key === STORAGE_KEYS.SETTINGS) return true;
    if (attempt === 3 && key === STORAGE_KEYS.THEMES) return true;
    return false;
  };

  const res = resetPlayerThemes(storage);
  assert.equal(res.success, false);
  // State honestly reports defaultState because rollback to previous themes failed!
  assert.equal(res.state.equippedThemeId, 'obsidian_grid', 'Must return state information honestly');
  assert.deepEqual(res.state.unlockedThemeIds, ['obsidian_grid', 'industrial_foundry']);
  assert.ok(res.error?.includes('Critical: Storage rollback to previous state also failed'), 'Must return explicit critical error');

  // Verify storage actually contains default state
  const reloaded = loadPlayerThemes(storage);
  assert.equal(reloaded.equippedThemeId, 'obsidian_grid');
});

test('Theme Persistence 4f: resetPlayerThemes returns failure if initial themes write fails', () => {
  const storage = createMockStorage({
    [STORAGE_KEYS.THEMES]: JSON.stringify({
      equippedThemeId: 'arctic_research',
      unlockedThemeIds: ['obsidian_grid', 'industrial_foundry', 'arctic_research'],
    }),
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'arctic_research',
    }),
  });

  storage.writeAttempt = 0;
  storage.shouldFailWrite = (key: string, attempt: number) => {
    return attempt === 1 && key === STORAGE_KEYS.THEMES;
  };

  const res = resetPlayerThemes(storage);
  assert.equal(res.success, false);
  assert.equal(res.state.equippedThemeId, 'arctic_research');
  assert.ok(res.error?.includes('Unable to reset board themes ledger'));

  // Settings should not have been modified
  const settings = loadSettings(storage);
  assert.equal(settings.boardTheme, 'arctic_research');
});

test('Theme Defensive Copying: modifying returned states cannot mutate default state constants', () => {
  // Capture pristine snapshot of default state
  const expectedDefaultEquipped = 'obsidian_grid';
  const expectedDefaultUnlocked = ['obsidian_grid', 'industrial_foundry'];

  assert.equal(DEFAULT_PLAYER_THEMES_STATE.equippedThemeId, expectedDefaultEquipped);
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);

  // 1. Modifying state returned from loadPlayerThemes(null)
  const nullLoaded = loadPlayerThemes(null);
  nullLoaded.equippedThemeId = 'solar_array';
  nullLoaded.unlockedThemeIds.push('void_observatory');
  assert.equal(DEFAULT_PLAYER_THEMES_STATE.equippedThemeId, expectedDefaultEquipped, 'Default equipped must not be mutated');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked, 'Default unlocked array must not be mutated');

  // 2. Modifying state returned from loadPlayerThemes(emptyStorage)
  const emptyStorage = createMockStorage();
  const emptyLoaded = loadPlayerThemes(emptyStorage);
  emptyLoaded.unlockedThemeIds.push('arctic_research');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);

  // 3. Modifying state returned from loadPlayerThemes with corrupted JSON
  const corruptStorage = createMockStorage({
    [STORAGE_KEYS.THEMES]: '{ invalid json !!!',
  });
  const corruptLoaded = loadPlayerThemes(corruptStorage);
  corruptLoaded.unlockedThemeIds.push('bio_dome');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);

  // 4. Modifying state returned from sanitizePlayerThemesState(null) and invalid types
  const sanitizedNull = sanitizePlayerThemesState(null);
  sanitizedNull.unlockedThemeIds.push('void_observatory');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);

  const sanitizedString = sanitizePlayerThemesState('not-an-object');
  sanitizedString.unlockedThemeIds.push('void_observatory');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);

  // 5. Modifying state returned from createDefaultPlayerThemesState()
  const freshCopy = createDefaultPlayerThemesState();
  freshCopy.unlockedThemeIds.push('solar_array');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);

  // 6. Modifying state returned from resetPlayerThemes()
  const resetStorage = createMockStorage();
  const resetRes = resetPlayerThemes(resetStorage);
  resetRes.state.unlockedThemeIds.push('arctic_research');
  assert.deepEqual(DEFAULT_PLAYER_THEMES_STATE.unlockedThemeIds, expectedDefaultUnlocked);
});


test('Theme Persistence 5: reconcileAndMigratePlayerThemes performs migration from legacy settings', () => {
  // Legacy user has settings with boardTheme = 'industrial_foundry', but no themes ledger yet
  const storage = createMockStorage({
    [STORAGE_KEYS.SETTINGS]: JSON.stringify({
      ...DEFAULT_SETTINGS,
      boardTheme: 'industrial_foundry',
    }),
  });

  const recon = reconcileAndMigratePlayerThemes(storage);
  assert.equal(recon.success, true);
  assert.equal(recon.wasMigrated, true);
  assert.equal(recon.themesState.equippedThemeId, 'industrial_foundry');
  assert.ok(recon.themesState.unlockedThemeIds.includes('industrial_foundry'));
});

// =============================================================================
// SECTION 5: Theme Preview Canvas Engine
// =============================================================================

test('Theme Preview 1: drawThemePreview executes operations for all 6 themes without errors', () => {
  for (const id of ALL_THEME_IDS) {
    const ctx = createMockCanvasContext();
    const result = drawThemePreview(ctx, id, {
      width: 220,
      height: 110,
      timeMs: 250,
      showSpecimen: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.resolvedThemeId, id);
    assert.equal(result.themeName, BOARD_THEMES[id].name);
    assert.ok(ctx.operations.length > 20, `Theme ${id} must draw canvas operations`);

    // Must call clearRect first
    assert.ok(ctx.operations.some(op => op.startsWith('clearRect(0,0,220,110)')));
    // Must fill base floor
    assert.ok(ctx.operations.some(op => op.startsWith('fillRect(0,0,220,110)')));
    // Must draw containment frame
    assert.ok(ctx.operations.some(op => op.startsWith('strokeRect')));
  }
});

test('Theme Preview 2: drawThemePreview handles null context and invalid theme ID safely', () => {
  const nullResult = drawThemePreview(null, 'obsidian_grid', { width: 100, height: 50 });
  assert.equal(nullResult.success, false);

  const ctx = createMockCanvasContext();
  const invalidResult = drawThemePreview(ctx, 'invalid_theme', { width: 100, height: 50 });
  assert.equal(invalidResult.success, true);
  assert.equal(invalidResult.resolvedThemeId, 'obsidian_grid');
});

// =============================================================================
// SECTION 6: Renderer Integration & Readability Preservation
// =============================================================================

test('Theme Rendering 1: NeonRenderer renders successfully with any theme specified', () => {
  const renderer = new NeonRenderer();
  const state: GameEngineState = createInitialState('classic');

  for (const themeId of ALL_THEME_IDS) {
    const ctx = createMockCanvasContext();
    renderer.render(
      ctx,
      600,
      600,
      state,
      1,
      {
        visualEffects: 'high',
        skin: 'cyber_cyan',
        trail: 'cyber_pulse',
        boardTheme: themeId,
        isPlaying: true,
      },
      1000
    );

    assert.ok(ctx.operations.length > 10, `Renderer must produce draw calls for theme ${themeId}`);
    // Clear rect
    assert.ok(ctx.operations.some(op => op.startsWith('clearRect(0,0,600,600)')));
  }
});

test('Theme Rendering 2: Reduced visual effects and performance mode render without crashing', () => {
  const renderer = new NeonRenderer();
  const state: GameEngineState = createInitialState('classic');

  for (const mode of ['high', 'performance', 'reduced'] as const) {
    const ctx = createMockCanvasContext();
    renderer.render(
      ctx,
      600,
      600,
      state,
      1,
      {
        visualEffects: mode,
        skin: 'cyber_cyan',
        trail: 'cyber_pulse',
        boardTheme: 'industrial_foundry',
        isPlaying: true,
      },
      1000
    );

    assert.ok(ctx.operations.length > 0);
  }
});
