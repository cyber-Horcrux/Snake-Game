import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Palette, Sparkles, AlertCircle, Shield } from 'lucide-react';
import type {
  MazeProgress,
  PlayerProgressionState,
  PlayerSkinsState,
  SnakeSkinId,
} from '../../game/types.ts';
import {
  getAllSkinDefinitions,
  getSkinUnlockDescription,
  isSkinUnlocked,
} from '../../game/skins.ts';
import { SkinPreviewCanvas } from './SkinPreviewCanvas.tsx';

export interface SkinCollectionModalProps {
  playerSkins: PlayerSkinsState;
  progression?: PlayerProgressionState;
  mazeProgress?: MazeProgress;
  onEquipSkin: (skinId: SnakeSkinId) => { success: boolean; error?: string };
  onClose: () => void;
  visualEffects?: 'high' | 'performance' | 'reduced';
}

export const SkinCollectionModal: React.FC<SkinCollectionModalProps> = ({
  playerSkins,
  progression,
  mazeProgress,
  onEquipSkin,
  onClose,
  visualEffects = 'high',
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const unlockedCount = allSkins.filter(skin => isSkinUnlocked(skin.id, playerSkins)).length;
  const currentLevel = progression?.level ?? 1;

  const handleEquip = (skinId: SnakeSkinId) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = onEquipSkin(skinId);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to equip skin. Please try again.');
      }
    } catch {
      setErrorMessage('Storage write failed. Could not equip skin.');
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="skin-collection-title"
    >
      <div className="w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border border-[#00F5FF]/30 rounded-2xl shadow-[0_0_35px_rgba(0,245,255,0.18)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 flex items-center justify-between border-b border-[#161B2E] shrink-0 bg-[#0B0E1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] shrink-0">
              <Palette className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2
                  id="skin-collection-title"
                  className="text-lg xs:text-xl sm:text-2xl font-black font-display tracking-wider text-[#F0F6FC] leading-none drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                >
                  SNAKE SKINS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F5FF]/15 border border-[#00F5FF]/40 text-[#00F5FF]">
                  {unlockedCount} / {allSkins.length} UNLOCKED
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#79869C] font-mono tracking-wider mt-1 font-semibold">
                NEON CHASSIS SUITE · COSMETIC OVERLAYS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Snake Skins Collection"
            className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-[#00F5FF]/60 transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
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
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {allSkins.map(skin => {
              const unlocked = isSkinUnlocked(skin.id, playerSkins);
              const isEquipped = playerSkins.equippedSkinId === skin.id;
              const unlockDesc = getSkinUnlockDescription(skin.id);

              return (
                <div
                  key={skin.id}
                  className={`flex flex-col justify-between p-3 rounded-xl border transition-all relative ${
                    isEquipped
                      ? 'bg-[#00F5FF]/10 border-[#00F5FF] shadow-[0_0_18px_rgba(0,245,255,0.22)]'
                      : unlocked
                      ? 'bg-[#05070E] border-[#161B2E] hover:border-[#00F5FF]/40'
                      : 'bg-[#05070E]/60 border-[#161B2E]/60 opacity-85'
                  }`}
                >
                  {/* Equipped Status Badge Top Right */}
                  {isEquipped && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#00F5FF] text-[#05070E] font-display font-black text-[9px] tracking-wider flex items-center gap-1 shadow-sm">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      EQUIPPED
                    </div>
                  )}

                  {/* Skin Undulating Preview Canvas */}
                  <div className="w-full flex items-center justify-center pt-1 pb-2">
                    <SkinPreviewCanvas
                      skinId={skin.id}
                      width={180}
                      height={90}
                      animated={unlocked && visualEffects !== 'reduced'}
                      reducedMotion={visualEffects === 'reduced'}
                      background="glow"
                      className="w-full max-w-[200px] aspect-[2/1] border border-[#161B2E] rounded-lg"
                      ariaLabel={`${skin.name} preview`}
                    />
                  </div>

                  {/* Skin Metadata */}
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

                  {/* Action / Lock Requirements Area */}
                  <div className="mt-2 pt-2 border-t border-[#161B2E]/80">
                    {isEquipped ? (
                      <div className="w-full py-2 rounded-lg bg-[#00F5FF]/15 border border-[#00F5FF]/60 text-[#00F5FF] font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,245,255,0.15)] select-none">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ACTIVE</span>
                      </div>
                    ) : unlocked ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(skin.id)}
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
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#0B0E1A] border-t border-[#161B2E] shrink-0 flex flex-col xs:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#79869C]">
            <Shield className="w-3.5 h-3.5 text-[#00F5FF]" />
            <span>Equipped skin applies to Classic, Zen, Rush, and Maze modes.</span>
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
