import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Palette, Sparkles, LayoutGrid, AlertCircle, Shield, Zap } from 'lucide-react';
import type {
  BoardThemeId,
  LifetimeStats,
  MazeProgress,
  PlayerProgressionState,
  PlayerSkinsState,
  PlayerThemesState,
  PlayerTrailsState,
  SnakeSkinId,
  SnakeTrailId,
} from '../../game/types.ts';
import {
  getAllSkinDefinitions,
  getSkinUnlockDescription,
  isSkinUnlocked,
} from '../../game/skins.ts';
import {
  getAllTrailDefinitions,
  getTrailUnlockDescription,
  isTrailUnlocked,
} from '../../game/trails.ts';
import {
  getAllThemeDefinitions,
  getThemeUnlockDescription,
  isThemeUnlocked,
} from '../../game/themes.ts';
import { SkinPreviewCanvas } from './SkinPreviewCanvas.tsx';
import { TrailPreviewCanvas } from './TrailPreviewCanvas.tsx';
import { BoardThemePreviewCanvas } from './BoardThemePreviewCanvas.tsx';

export interface SkinCollectionModalProps {
  playerSkins: PlayerSkinsState;
  playerTrails?: PlayerTrailsState;
  playerThemes?: PlayerThemesState;
  progression?: PlayerProgressionState;
  mazeProgress?: MazeProgress;
  lifetimeStats?: LifetimeStats;
  onEquipSkin: (skinId: SnakeSkinId) => { success: boolean; error?: string };
  onEquipTrail?: (trailId: SnakeTrailId) => { success: boolean; error?: string };
  onEquipTheme?: (themeId: BoardThemeId) => { success: boolean; error?: string };
  onClose: () => void;
  visualEffects?: 'high' | 'performance' | 'reduced';
  initialTab?: 'skins' | 'trails' | 'themes';
}

export const SkinCollectionModal: React.FC<SkinCollectionModalProps> = ({
  playerSkins,
  playerTrails = { equippedTrailId: 'cyber_pulse', unlockedTrailIds: ['none', 'cyber_pulse'] },
  playerThemes = { equippedThemeId: 'obsidian_grid', unlockedThemeIds: ['obsidian_grid', 'industrial_foundry'] },
  progression,
  mazeProgress,
  lifetimeStats,
  onEquipSkin,
  onEquipTrail,
  onEquipTheme,
  onClose,
  visualEffects = 'high',
  initialTab = 'skins',
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'trails' | 'themes'>(initialTab);
  const [selectedSkinId, setSelectedSkinId] = useState<SnakeSkinId>(playerSkins.equippedSkinId);
  const [selectedTrailId, setSelectedTrailId] = useState<SnakeTrailId>(playerTrails.equippedTrailId);
  const [selectedThemeId, setSelectedThemeId] = useState<BoardThemeId>(playerThemes.equippedThemeId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync activeTab whenever modal opens with a specific initial tab
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Close on Escape key press for keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const allSkins = getAllSkinDefinitions();
  const unlockedSkinsCount = allSkins.filter(skin => isSkinUnlocked(skin.id, playerSkins)).length;

  const allTrails = getAllTrailDefinitions();
  const unlockedTrailsCount = allTrails.filter(trail => isTrailUnlocked(trail.id, playerTrails)).length;

  const allThemes = getAllThemeDefinitions();
  const unlockedThemesCount = allThemes.filter(theme => isThemeUnlocked(theme.id, playerThemes)).length;

  const currentLevel = progression?.level ?? 1;
  const currentZenWraps = lifetimeStats?.wallsWrapped ?? 0;
  const currentStage = mazeProgress?.highestStageUnlocked ?? 1;
  const currentMaxFoodInRun = lifetimeStats?.maxFoodInRun ?? 0;
  const currentCampaignWon = (mazeProgress?.totalCampaignsWon ?? 0) > 0;

  const renderConditionBadge = (
    cond: {
      type: string;
      requiredLevel?: number;
      requiredZenWraps?: number;
      requiredMazeStage?: number;
      requiredFoodSingleRun?: number;
      requiredCampaignVictory?: boolean;
    },
    isAlt: boolean = false
  ) => {
    const prefix = isAlt ? 'ALT: ' : '';
    switch (cond.type) {
      case 'level':
        return cond.requiredLevel ? (
          <div className="text-[9px] font-mono text-[#9865FF] font-bold">
            {prefix}LVL {currentLevel} / {cond.requiredLevel}
          </div>
        ) : null;
      case 'zen_wraps':
        return cond.requiredZenWraps ? (
          <div className="text-[9px] font-mono text-[#10FFA0] font-bold">
            {prefix}WRAPS {currentZenWraps} / {cond.requiredZenWraps}
          </div>
        ) : null;
      case 'maze_stage':
        return cond.requiredMazeStage ? (
          <div className="text-[9px] font-mono text-[#00F5FF] font-bold">
            {prefix}STAGE {currentStage} / {cond.requiredMazeStage}
          </div>
        ) : null;
      case 'food_single_run':
        return cond.requiredFoodSingleRun ? (
          <div className="text-[9px] font-mono text-[#FF8A00] font-bold">
            {prefix}BEST RUN {currentMaxFoodInRun} / {cond.requiredFoodSingleRun} FOOD
          </div>
        ) : null;
      case 'campaign_victory':
        return (
          <div className="text-[9px] font-mono text-[#FFD700] font-bold">
            {prefix}{currentCampaignWon ? 'CAMPAIGN COMPLETED' : 'COMPLETE CAMPAIGN'}
          </div>
        );
      default:
        return null;
    }
  };

  const handleEquipSkin = (skinId: SnakeSkinId) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = onEquipSkin(skinId);
      if (result.success) {
        setSelectedSkinId(skinId);
      } else {
        setErrorMessage(result.error || 'Failed to equip skin. Please try again.');
      }
    } catch {
      setErrorMessage('Storage write failed. Could not equip skin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEquipTrailAction = (trailId: SnakeTrailId) => {
    if (isSubmitting || !onEquipTrail) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = onEquipTrail(trailId);
      if (result.success) {
        setSelectedTrailId(trailId);
      } else {
        setErrorMessage(result.error || 'Failed to equip trail. Please try again.');
      }
    } catch {
      setErrorMessage('Storage write failed. Could not equip trail.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEquipThemeAction = (themeId: BoardThemeId) => {
    if (isSubmitting || !onEquipTheme) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = onEquipTheme(themeId);
      if (result.success) {
        setSelectedThemeId(themeId);
      } else {
        setErrorMessage(result.error || 'Failed to equip board theme. Please try again.');
      }
    } catch {
      setErrorMessage('Storage write failed. Could not equip board theme.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/90 backdrop-blur-sm overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border border-[#00F5FF]/30 rounded-2xl shadow-[0_0_35px_rgba(0,245,255,0.15)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Sticky Header with Tab Navigation */}
        <div className="p-3.5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#161B2E] shrink-0 bg-[#0B0E1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF]">
              {activeTab === 'skins' ? (
                <Palette className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : activeTab === 'trails' ? (
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#9865FF]" />
              ) : (
                <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFD700]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-wider text-[#F0F6FC] leading-none drop-shadow-[0_0_15px_rgba(0,245,255,0.25)]">
                  {activeTab === 'skins'
                    ? 'CHASSIS SUITE'
                    : activeTab === 'trails'
                    ? 'ENERGY TRAILS'
                    : 'BOARD THEMES'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#161B2E] text-[#00F5FF] border border-[#00F5FF]/20">
                  {activeTab === 'skins'
                    ? `${unlockedSkinsCount}/${allSkins.length}`
                    : activeTab === 'trails'
                    ? `${unlockedTrailsCount}/${allTrails.length}`
                    : `${unlockedThemesCount}/${allThemes.length}`} UNLOCKED
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#79869C] font-mono tracking-wider mt-1 font-semibold">
                {activeTab === 'skins'
                  ? 'NEON CHASSIS SUITE · COSMETIC OVERLAYS'
                  : activeTab === 'trails'
                  ? 'ENERGY SLIPSTREAM · COSMETIC WAKES'
                  : 'TACTICAL GRIDS · ENVIRONMENTAL SURFACES'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Category Switcher Tabs */}
            <div className="flex items-center p-1 bg-[#05070E] rounded-xl border border-[#161B2E]">
              <button
                type="button"
                onClick={() => { setActiveTab('skins'); setErrorMessage(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'skins'
                    ? 'bg-[#00F5FF] text-[#05070E] shadow-[0_0_12px_rgba(0,245,255,0.3)]'
                    : 'text-[#79869C] hover:text-[#F0F6FC]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>SKINS</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('trails'); setErrorMessage(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'trails'
                    ? 'bg-[#9865FF] text-[#05070E] shadow-[0_0_12px_rgba(152,101,255,0.3)]'
                    : 'text-[#79869C] hover:text-[#F0F6FC]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>TRAILS</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('themes'); setErrorMessage(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'themes'
                    ? 'bg-[#FFD700] text-[#05070E] shadow-[0_0_12px_rgba(255,215,0,0.3)]'
                    : 'text-[#79869C] hover:text-[#F0F6FC]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>BOARDS</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Customization Suite"
              className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-[#00F5FF]/60 transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mx-3.5 sm:mx-6 mt-3.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto p-3 xs:p-4 sm:p-6 flex-1">
          {activeTab === 'skins' ? (
            /* ==========================================
               SKINS TAB VIEW
               ========================================== */
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {allSkins.map(skin => {
                const unlocked = isSkinUnlocked(skin.id, playerSkins);
                const isEquipped = playerSkins.equippedSkinId === skin.id;
                const unlockDesc = getSkinUnlockDescription(skin.id);

                return (
                  <div
                    key={skin.id}
                    onClick={() => setSelectedSkinId(skin.id)}
                    className={`flex flex-col justify-between p-3 rounded-xl border transition-all relative cursor-pointer ${
                      isEquipped
                        ? 'bg-[#00F5FF]/10 border-[#00F5FF] shadow-[0_0_18px_rgba(0,245,255,0.22)]'
                        : selectedSkinId === skin.id
                        ? 'bg-[#05070E] border-[#00F5FF]/60 shadow-[0_0_12px_rgba(0,245,255,0.15)]'
                        : unlocked
                        ? 'bg-[#05070E] border-[#161B2E] hover:border-[#00F5FF]/40'
                        : 'bg-[#05070E]/60 border-[#161B2E]/60 opacity-85'
                    }`}
                  >
                    {isEquipped && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#00F5FF] text-[#05070E] font-display font-black text-[9px] tracking-wider flex items-center gap-1 shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        EQUIPPED
                      </div>
                    )}

                    <div className="w-full flex items-center justify-center pt-1 pb-2">
                      <SkinPreviewCanvas
                        skinId={skin.id}
                        width={180}
                        height={90}
                        animated={activeTab === 'skins' && selectedSkinId === skin.id && unlocked && visualEffects !== 'reduced'}
                        reducedMotion={visualEffects === 'reduced'}
                        background="glow"
                        className="w-full max-w-[200px] aspect-[2/1] border border-[#161B2E] rounded-lg"
                        ariaLabel={`${skin.name} preview`}
                      />
                    </div>

                    <div className="my-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: skin.headColor }}
                        />
                        <h3 className="font-display font-bold text-xs sm:text-sm text-[#F0F6FC] tracking-wide truncate">
                          {skin.name}
                        </h3>
                      </div>
                      <p className="text-[10px] text-[#79869C] mt-0.5 truncate leading-tight">
                        {skin.tagline}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#161B2E]/80">
                      {isEquipped ? (
                        <div className="w-full py-2 rounded-lg bg-[#00F5FF]/15 border border-[#00F5FF]/60 text-[#00F5FF] font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,245,255,0.15)] select-none">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>ACTIVE</span>
                        </div>
                      ) : unlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipSkin(skin.id)}
                          disabled={isSubmitting}
                          aria-label={`Equip ${skin.name}`}
                          className="w-full py-2 rounded-lg bg-[#161B2E] hover:bg-[#00F5FF] text-[#F0F6FC] hover:text-[#05070E] border border-[#00F5FF]/40 hover:border-[#00F5FF] font-display font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>EQUIP</span>
                        </button>
                      ) : (
                        <div className="w-full p-2 rounded-lg bg-[#0B0E1A] border border-[#161B2E] text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#FFB800] uppercase font-display tracking-wider">
                            <Lock className="w-2.5 h-2.5" />
                            <span>LOCKED</span>
                          </div>
                          <p className="text-[9px] text-[#79869C] mt-1 leading-snug font-medium">
                            {unlockDesc}
                          </p>
                          {skin.unlock.type === 'level' && skin.unlock.requiredLevel && (
                            <div className="mt-1 text-[9px] font-mono text-[#00F5FF] font-bold">
                              LVL {currentLevel} / {skin.unlock.requiredLevel}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'trails' ? (
            /* ==========================================
               TRAILS TAB VIEW
               ========================================== */
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {allTrails.map(trail => {
                const unlocked = isTrailUnlocked(trail.id, playerTrails);
                const isEquipped = playerTrails.equippedTrailId === trail.id;
                const unlockDesc = getTrailUnlockDescription(trail.id);

                return (
                  <div
                    key={trail.id}
                    onClick={() => setSelectedTrailId(trail.id)}
                    className={`flex flex-col justify-between p-3 rounded-xl border transition-all relative cursor-pointer ${
                      isEquipped
                        ? 'bg-[#9865FF]/10 border-[#9865FF] shadow-[0_0_18px_rgba(152,101,255,0.22)]'
                        : selectedTrailId === trail.id
                        ? 'bg-[#05070E] border-[#9865FF]/60 shadow-[0_0_12px_rgba(152,101,255,0.15)]'
                        : unlocked
                        ? 'bg-[#05070E] border-[#161B2E] hover:border-[#9865FF]/40'
                        : 'bg-[#05070E]/60 border-[#161B2E]/60 opacity-85'
                    }`}
                  >
                    {isEquipped && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#9865FF] text-[#05070E] font-display font-black text-[9px] tracking-wider flex items-center gap-1 shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        EQUIPPED
                      </div>
                    )}

                    {/* Trail Live Preview Canvas */}
                    <div className="w-full flex items-center justify-center pt-1 pb-2">
                      <TrailPreviewCanvas
                        trailId={trail.id}
                        skinId={playerSkins.equippedSkinId}
                        width={180}
                        height={90}
                        animated={activeTab === 'trails' && selectedTrailId === trail.id && unlocked && visualEffects !== 'reduced'}
                        reducedMotion={visualEffects === 'reduced'}
                        background="glow"
                        className="w-full max-w-[200px] aspect-[2/1] border border-[#161B2E] rounded-lg"
                        ariaLabel={`${trail.name} preview`}
                        onClick={() => setSelectedTrailId(trail.id)}
                      />
                    </div>

                    {/* Trail Metadata */}
                    <div className="my-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: trail.color }}
                        />
                        <h3 className="font-display font-bold text-xs sm:text-sm text-[#F0F6FC] tracking-wide truncate">
                          {trail.name}
                        </h3>
                      </div>
                      <p className="text-[10px] text-[#79869C] mt-0.5 truncate leading-tight">
                        {trail.tagline}
                      </p>
                    </div>

                    {/* Action / Lock Requirements Area */}
                    <div className="mt-2 pt-2 border-t border-[#161B2E]/80">
                      {isEquipped ? (
                        <div className="w-full py-2 rounded-lg bg-[#9865FF]/15 border border-[#9865FF]/60 text-[#9865FF] font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(152,101,255,0.15)] select-none">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>ACTIVE</span>
                        </div>
                      ) : unlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipTrailAction(trail.id)}
                          disabled={isSubmitting}
                          aria-label={`Equip ${trail.name}`}
                          className="w-full py-2 rounded-lg bg-[#161B2E] hover:bg-[#9865FF] text-[#F0F6FC] hover:text-[#05070E] border border-[#9865FF]/40 hover:border-[#9865FF] font-display font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <Zap className="w-3 h-3" />
                          <span>EQUIP</span>
                        </button>
                      ) : (
                        <div className="w-full p-2 rounded-lg bg-[#0B0E1A] border border-[#161B2E] text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#FFB800] uppercase font-display tracking-wider">
                            <Lock className="w-2.5 h-2.5" />
                            <span>LOCKED</span>
                          </div>
                          <p className="text-[9px] text-[#79869C] mt-1 leading-snug font-medium">
                            {unlockDesc}
                          </p>
                          <div className="mt-1 flex flex-col gap-0.5">
                            {renderConditionBadge(trail.unlock, false)}
                            {trail.altUnlock && (
                              <>
                                <div className="text-[8px] text-[#79869C] font-mono font-bold tracking-wider uppercase">— OR —</div>
                                {renderConditionBadge(trail.altUnlock, true)}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==========================================
               BOARDS TAB VIEW
               ========================================== */
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {allThemes.map(theme => {
                const unlocked = isThemeUnlocked(theme.id, playerThemes);
                const isEquipped = playerThemes.equippedThemeId === theme.id;
                const unlockDesc = getThemeUnlockDescription(theme.id);

                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`flex flex-col justify-between p-3 rounded-xl border transition-all relative cursor-pointer ${
                      isEquipped
                        ? 'bg-[#FFD700]/10 border-[#FFD700] shadow-[0_0_18px_rgba(255,215,0,0.22)]'
                        : selectedThemeId === theme.id
                        ? 'bg-[#05070E] border-[#FFD700]/60 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                        : unlocked
                        ? 'bg-[#05070E] border-[#161B2E] hover:border-[#FFD700]/40'
                        : 'bg-[#05070E]/60 border-[#161B2E]/60 opacity-85'
                    }`}
                  >
                    {isEquipped && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#FFD700] text-[#05070E] font-display font-black text-[9px] tracking-wider flex items-center gap-1 shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        EQUIPPED
                      </div>
                    )}

                    {/* Board Theme Live Preview Canvas */}
                    <div className="w-full flex items-center justify-center pt-1 pb-2">
                      <BoardThemePreviewCanvas
                        themeId={theme.id}
                        width={220}
                        height={110}
                        animated={activeTab === 'themes' && selectedThemeId === theme.id && unlocked && visualEffects !== 'reduced'}
                        reducedMotion={visualEffects === 'reduced'}
                        className="w-full aspect-[2/1] border border-[#161B2E] rounded-lg shadow-sm"
                        ariaLabel={`${theme.name} preview`}
                      />
                    </div>

                    {/* Theme Metadata */}
                    <div className="my-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: theme.primaryAccent }}
                          />
                          <h3 className="font-display font-bold text-xs sm:text-sm text-[#F0F6FC] tracking-wide truncate">
                            {theme.name}
                          </h3>
                        </div>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#161B2E] text-[#79869C] uppercase tracking-wider shrink-0">
                          {theme.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#79869C] mt-0.5 truncate leading-tight">
                        {theme.tagline}
                      </p>
                    </div>

                    {/* Action / Lock Requirements Area */}
                    <div className="mt-2 pt-2 border-t border-[#161B2E]/80">
                      {isEquipped ? (
                        <div className="w-full py-2 rounded-lg bg-[#FFD700]/15 border border-[#FFD700]/60 text-[#FFD700] font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(255,215,0,0.15)] select-none">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>ACTIVE</span>
                        </div>
                      ) : unlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipThemeAction(theme.id)}
                          disabled={isSubmitting}
                          aria-label={`Equip ${theme.name}`}
                          className="w-full py-2 rounded-lg bg-[#161B2E] hover:bg-[#FFD700] text-[#F0F6FC] hover:text-[#05070E] border border-[#FFD700]/40 hover:border-[#FFD700] font-display font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <LayoutGrid className="w-3 h-3" />
                          <span>EQUIP</span>
                        </button>
                      ) : (
                        <div className="w-full p-2 rounded-lg bg-[#0B0E1A] border border-[#161B2E] text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#FFB800] uppercase font-display tracking-wider">
                            <Lock className="w-2.5 h-2.5" />
                            <span>LOCKED</span>
                          </div>
                          <p className="text-[9px] text-[#79869C] mt-1 leading-snug font-medium">
                            {unlockDesc}
                          </p>
                          <div className="mt-1 flex flex-col gap-0.5">
                            {renderConditionBadge(theme.unlock, false)}
                            {theme.altUnlock && (
                              <>
                                <div className="text-[8px] text-[#79869C] font-mono font-bold tracking-wider uppercase">— OR —</div>
                                {renderConditionBadge(theme.altUnlock, true)}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#0B0E1A] border-t border-[#161B2E] shrink-0 flex flex-col xs:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#79869C]">
            <Shield className="w-3.5 h-3.5 text-[#00F5FF]" />
            <span>Customizations apply seamlessly to Classic, Zen, Rush, and Maze modes.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full xs:w-auto px-6 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider bg-[#00F5FF] hover:bg-[#38E1FF] text-[#05070E] transition-all cursor-pointer shadow-[0_0_15px_rgba(0,245,255,0.3)] active:scale-95"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
