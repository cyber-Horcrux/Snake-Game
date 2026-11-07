/**
 * Board Themes Domain Logic
 * Pure, deterministic functions for theme lookups, ownership validation,
 * unlock eligibility checking, and state sanitization.
 * 
 * Target: Distinctive, professional 2D game environment art with realistic material qualities,
 * restrained depth, high contrast, and zero compromise to gameplay readability.
 */

import type {
  BoardThemeDefinition,
  BoardThemeId,
  PlayerThemesState,
  ThemeUnlockCondition,
  ThemeUnlockContext,
} from './types.ts';

export const STARTER_THEME_IDS: readonly BoardThemeId[] = [
  'obsidian_grid',
  'industrial_foundry',
] as const;

export const ALL_THEME_IDS: readonly BoardThemeId[] = [
  'obsidian_grid',
  'industrial_foundry',
  'arctic_research',
  'bio_dome',
  'solar_array',
  'void_observatory',
] as const;

export const DEFAULT_PLAYER_THEMES_STATE: PlayerThemesState = {
  equippedThemeId: 'obsidian_grid',
  unlockedThemeIds: ['obsidian_grid', 'industrial_foundry'],
};

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeDefinition> = {
  obsidian_grid: {
    id: 'obsidian_grid',
    name: 'Obsidian Grid',
    tagline: 'Dark graphite weave & restrained cyan optics',
    description: 'Precision architectural carbon-graphite floor with ultra-fine tactical cyan grid lines and chamfered alloy containment bezels.',
    category: 'Architectural',
    primaryAccent: '#00F5FF',
    secondaryAccent: '#9865FF',
    floorBg: '#050811',
    floorGradient: {
      center: 'rgba(9, 18, 38, 0.95)',
      edge: 'rgba(3, 5, 12, 0.98)',
    },
    grid: {
      lineColor: 'rgba(56, 189, 248, 0.04)',
      crosshairColor: 'rgba(56, 189, 248, 0.14)',
      accentFrequency: 4,
    },
    border: {
      outerBase: 'rgba(15, 23, 42, 0.9)',
      shadowOcclusion: 'rgba(2, 6, 23, 0.98)',
      specularChamfer: 'rgba(67, 245, 255, 0.4)',
      emissivePerimeter: 'rgba(67, 245, 255, 0.75)',
      cornerReticle: 'rgba(152, 101, 255, 0.85)',
    },
    unlock: {
      type: 'default',
      description: 'Available by default',
    },
  },
  industrial_foundry: {
    id: 'industrial_foundry',
    name: 'Industrial Foundry',
    tagline: 'Heavy dark iron, brushed steel & warm amber rivets',
    description: 'Rugged thermal-treated alloy plating with brushed steel grid seams, amber rivet points, and industrial hazard-notched perimeter brackets.',
    category: 'Heavy Industrial',
    primaryAccent: '#FF9E0B',
    secondaryAccent: '#FF3B30',
    floorBg: '#0A0806',
    floorGradient: {
      center: 'rgba(26, 18, 12, 0.95)',
      edge: 'rgba(8, 6, 4, 0.98)',
    },
    grid: {
      lineColor: 'rgba(245, 158, 11, 0.045)',
      crosshairColor: 'rgba(245, 158, 11, 0.16)',
      accentFrequency: 4,
    },
    border: {
      outerBase: 'rgba(30, 20, 14, 0.92)',
      shadowOcclusion: 'rgba(5, 3, 2, 0.98)',
      specularChamfer: 'rgba(255, 170, 50, 0.45)',
      emissivePerimeter: 'rgba(245, 158, 11, 0.8)',
      cornerReticle: 'rgba(255, 68, 68, 0.85)',
    },
    unlock: {
      type: 'default',
      description: 'Available by default',
    },
  },
  arctic_research: {
    id: 'arctic_research',
    name: 'Arctic Research',
    tagline: 'Sub-zero cryo-slate & frosted crystalline sensors',
    description: 'Cryogenically insulated ceramic floor with cool diamond laser grid intersections and frost-beveled titanium containment rails.',
    category: 'Cryogenic',
    primaryAccent: '#38E1FF',
    secondaryAccent: '#E0F7FA',
    floorBg: '#040914',
    floorGradient: {
      center: 'rgba(8, 24, 44, 0.95)',
      edge: 'rgba(2, 6, 14, 0.98)',
    },
    grid: {
      lineColor: 'rgba(56, 225, 255, 0.045)',
      crosshairColor: 'rgba(224, 247, 250, 0.18)',
      accentFrequency: 4,
    },
    border: {
      outerBase: 'rgba(12, 28, 48, 0.92)',
      shadowOcclusion: 'rgba(2, 8, 18, 0.98)',
      specularChamfer: 'rgba(224, 247, 250, 0.55)',
      emissivePerimeter: 'rgba(56, 225, 255, 0.82)',
      cornerReticle: 'rgba(0, 229, 255, 0.9)',
    },
    unlock: {
      type: 'level',
      requiredLevel: 6,
      description: 'Reach Level 6 (Laser Fang)',
    },
    altUnlock: {
      type: 'zen_wraps',
      requiredZenWraps: 25,
      description: 'Or wrap 25 boundaries in Zen Mode',
    },
  },
  bio_dome: {
    id: 'bio_dome',
    name: 'Bio-Dome',
    tagline: 'Dark botanical biome with bioluminescent node mesh',
    description: 'Deep carbonized soil substrate with organic hexagonal mesh accents, bioluminescent emerald grid crosshairs, and living boundary nodes.',
    category: 'Bioluminescent',
    primaryAccent: '#10FFA0',
    secondaryAccent: '#00E5FF',
    floorBg: '#030E08',
    floorGradient: {
      center: 'rgba(6, 32, 18, 0.95)',
      edge: 'rgba(2, 10, 5, 0.98)',
    },
    grid: {
      lineColor: 'rgba(16, 255, 160, 0.04)',
      crosshairColor: 'rgba(16, 255, 160, 0.16)',
      accentFrequency: 4,
    },
    border: {
      outerBase: 'rgba(10, 30, 20, 0.9)',
      shadowOcclusion: 'rgba(1, 8, 4, 0.98)',
      specularChamfer: 'rgba(16, 255, 160, 0.45)',
      emissivePerimeter: 'rgba(16, 255, 160, 0.78)',
      cornerReticle: 'rgba(0, 229, 255, 0.85)',
    },
    unlock: {
      type: 'level',
      requiredLevel: 10,
      description: 'Reach Level 10 (Cyber Champion)',
    },
    altUnlock: {
      type: 'food_single_run',
      requiredFoodSingleRun: 15,
      description: 'Or eat 15 food in a single run',
    },
  },
  solar_array: {
    id: 'solar_array',
    name: 'Solar Array',
    tagline: 'Photovoltaic alloy panels with radiant gold illumination',
    description: 'Space-grade photovoltaic silicon tiles with amber micro-circuit lines, polished bronze containment bevels, and coronal corner glints.',
    category: 'Orbital Energy',
    primaryAccent: '#FFD700',
    secondaryAccent: '#FF8A00',
    floorBg: '#0D0802',
    floorGradient: {
      center: 'rgba(32, 20, 6, 0.95)',
      edge: 'rgba(10, 6, 2, 0.98)',
    },
    grid: {
      lineColor: 'rgba(255, 215, 0, 0.045)',
      crosshairColor: 'rgba(255, 215, 0, 0.18)',
      accentFrequency: 4,
    },
    border: {
      outerBase: 'rgba(36, 24, 8, 0.92)',
      shadowOcclusion: 'rgba(8, 4, 1, 0.98)',
      specularChamfer: 'rgba(255, 220, 80, 0.5)',
      emissivePerimeter: 'rgba(255, 215, 0, 0.82)',
      cornerReticle: 'rgba(255, 138, 0, 0.9)',
    },
    unlock: {
      type: 'level',
      requiredLevel: 20,
      description: 'Reach Level 20 (Vortex Overlord)',
    },
    altUnlock: {
      type: 'maze_stage',
      requiredMazeStage: 2,
      description: 'Or clear Stage 2 in Maze Campaign',
    },
  },
  void_observatory: {
    id: 'void_observatory',
    name: 'Void Observatory',
    tagline: 'Deep cosmos horizon & quantum dark-matter perimeter',
    description: 'Astronomical vacuum chamber floor with celestial deep-space vignette, orbital coordinate grid crosses, and quantum purple containment rails.',
    category: 'Astrophysical',
    primaryAccent: '#7C4DFF',
    secondaryAccent: '#00F5FF',
    floorBg: '#05030E',
    floorGradient: {
      center: 'rgba(20, 10, 40, 0.95)',
      edge: 'rgba(4, 2, 10, 0.98)',
    },
    grid: {
      lineColor: 'rgba(124, 77, 255, 0.045)',
      crosshairColor: 'rgba(0, 245, 255, 0.16)',
      accentFrequency: 4,
    },
    border: {
      outerBase: 'rgba(22, 12, 42, 0.92)',
      shadowOcclusion: 'rgba(3, 1, 8, 0.98)',
      specularChamfer: 'rgba(180, 140, 255, 0.45)',
      emissivePerimeter: 'rgba(124, 77, 255, 0.82)',
      cornerReticle: 'rgba(0, 245, 255, 0.9)',
    },
    unlock: {
      type: 'level',
      requiredLevel: 35,
      description: 'Reach Level 35 (Apex Cyber Master)',
    },
    altUnlock: {
      type: 'campaign_victory',
      requiredCampaignVictory: true,
      description: 'Or complete the Maze Campaign',
    },
  },
};

export function isValidThemeId(id: unknown): id is BoardThemeId {
  return typeof id === 'string' && (ALL_THEME_IDS as readonly string[]).includes(id);
}

export function getThemeDefinition(id: BoardThemeId): BoardThemeDefinition {
  return BOARD_THEMES[id] ?? BOARD_THEMES.obsidian_grid;
}

export function getAllThemeDefinitions(): BoardThemeDefinition[] {
  return ALL_THEME_IDS.map(id => BOARD_THEMES[id]);
}

export function getThemeUnlockDescription(id: BoardThemeId): string {
  const def = getThemeDefinition(id);
  let desc = def.unlock.description;
  if (def.altUnlock) {
    desc += ` (${def.altUnlock.description})`;
  }
  return desc;
}

function checkSingleCondition(condition: ThemeUnlockCondition, context: ThemeUnlockContext): boolean {
  switch (condition.type) {
    case 'default':
      return true;

    case 'level':
      return typeof condition.requiredLevel === 'number' && context.level >= condition.requiredLevel;

    case 'zen_wraps':
      return typeof condition.requiredZenWraps === 'number' && context.zenWallsWrapped >= condition.requiredZenWraps;

    case 'maze_stage':
      return typeof condition.requiredMazeStage === 'number' && context.highestMazeStage >= condition.requiredMazeStage;

    case 'food_single_run':
      return typeof condition.requiredFoodSingleRun === 'number' && (context.maxFoodInRun ?? 0) >= condition.requiredFoodSingleRun;

    case 'campaign_victory':
      return Boolean(condition.requiredCampaignVictory) && Boolean(context.campaignWon);

    default:
      return false;
  }
}

export function isThemeEligible(id: BoardThemeId, context: ThemeUnlockContext): boolean {
  if (STARTER_THEME_IDS.includes(id)) {
    return true;
  }

  const def = BOARD_THEMES[id];
  if (!def) return false;

  if (checkSingleCondition(def.unlock, context)) {
    return true;
  }

  if (def.altUnlock && checkSingleCondition(def.altUnlock, context)) {
    return true;
  }

  return false;
}

export function isThemeUnlocked(id: BoardThemeId, state: PlayerThemesState): boolean {
  if (STARTER_THEME_IDS.includes(id)) {
    return true;
  }
  return state.unlockedThemeIds.includes(id);
}

export function sanitizePlayerThemesState(raw: unknown): PlayerThemesState {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_PLAYER_THEMES_STATE };
  }

  const candidate = raw as Partial<PlayerThemesState>;
  const unlockedSet = new Set<BoardThemeId>(STARTER_THEME_IDS);

  if (Array.isArray(candidate.unlockedThemeIds)) {
    for (const item of candidate.unlockedThemeIds) {
      if (isValidThemeId(item)) {
        unlockedSet.add(item);
      }
    }
  }

  const validUnlocked = ALL_THEME_IDS.filter(id => unlockedSet.has(id));

  let equipped: BoardThemeId = DEFAULT_PLAYER_THEMES_STATE.equippedThemeId;
  if (isValidThemeId(candidate.equippedThemeId) && unlockedSet.has(candidate.equippedThemeId)) {
    equipped = candidate.equippedThemeId;
  } else if (validUnlocked.length > 0) {
    equipped = validUnlocked[0];
  }

  return {
    equippedThemeId: equipped,
    unlockedThemeIds: validUnlocked,
  };
}

export function reconcilePlayerThemes(
  currentState: PlayerThemesState,
  context: ThemeUnlockContext
): { state: PlayerThemesState; newlyUnlocked: BoardThemeId[] } {
  const sanitized = sanitizePlayerThemesState(currentState);
  const currentUnlockedSet = new Set<BoardThemeId>(sanitized.unlockedThemeIds);
  const newlyUnlocked: BoardThemeId[] = [];

  for (const id of ALL_THEME_IDS) {
    if (!currentUnlockedSet.has(id) && isThemeEligible(id, context)) {
      currentUnlockedSet.add(id);
      newlyUnlocked.push(id);
    }
  }

  const updatedUnlocked = ALL_THEME_IDS.filter(id => currentUnlockedSet.has(id));

  let equipped = sanitized.equippedThemeId;
  if (!currentUnlockedSet.has(equipped)) {
    equipped = 'obsidian_grid';
  }

  return {
    state: {
      equippedThemeId: equipped,
      unlockedThemeIds: updatedUnlocked,
    },
    newlyUnlocked,
  };
}
