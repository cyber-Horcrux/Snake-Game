import React, { useState } from 'react';
import { RotateCcw, Compass, Home, Trophy, Sparkles, Share2, Check, Award } from 'lucide-react';
import type { GameEngineState, MazeProgress, PlayerProgressionState, XpEarnResult } from '../game/types.ts';
import { getLevelTitle } from '../game/levels.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';
import { LevelUpCelebration } from './progression/LevelUpCelebration.tsx';
import { XpBreakdownList } from './progression/XpBreakdownList.tsx';

interface CampaignVictoryModalProps {
  state: GameEngineState;
  progress: MazeProgress;
  onReplayCampaign: () => void;
  onCampaignSelect: () => void;
  onMainMenu: () => void;
  xpEarnResult?: XpEarnResult | null;
  progression?: PlayerProgressionState;
}

export const CampaignVictoryModal: React.FC<CampaignVictoryModalProps> = ({
  state,
  progress,
  onReplayCampaign,
  onCampaignSelect,
  onMainMenu,
  xpEarnResult,
  progression,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCelebrationDismissed, setIsCelebrationDismissed] = useState(false);

  const handleShare = async () => {
    const text = `I conquered the full NEON SNAKE Maze Campaign with ${state.score} points! The Apex Cyber-Viper protocol is complete!`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Campaign Victory"
      className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/94 backdrop-blur-md overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border-2 border-[#FF007A] rounded-2xl p-4 xs:p-5 sm:p-7 shadow-[0_0_60px_rgba(255,0,122,0.35)] flex flex-col items-center text-center overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Apex Master Brand Emblem with Hyper Glow */}
        <div className="mb-2 shrink-0">
          <BrandLogo
            variant="symbol"
            size="custom"
            className="w-12 h-12 sm:w-16 sm:h-16"
            glow={true}
            alt="Apex Cyber-Viper Ascended"
          />
        </div>

        {/* Campaign Banner Tag */}
        <div className="px-3 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1.5 shrink-0 font-display border border-[#FF007A]/50 bg-[#FF007A]/15 text-[#FF007A] shadow-[0_0_15px_rgba(255,0,122,0.3)] animate-pulse">
          APEX PROTOCOL CONQUERED // ALL 6 STAGES SECURED
        </div>

        {/* Title */}
        <h2 className="text-2xl xs:text-3xl sm:text-4xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#00F5FF] via-[#FF007A] to-[#FFB800] mb-1 shrink-0 drop-shadow-[0_0_25px_rgba(255,0,122,0.4)]">
          CAMPAIGN VICTORY
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-mono text-[#F0F6FC] tracking-wider mb-3 sm:mb-4 shrink-0 font-bold uppercase">
          THE FINAL PROTOCOL — CLEARED
        </p>

        {/* Big Score Card */}
        <div className="w-full bg-[#05070E] border border-[#161B2E] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col items-center shrink-0">
          <span className="text-[10px] sm:text-xs text-[#79869C] font-bold uppercase tracking-widest">
            Final Campaign Score
          </span>
          <span className="text-4xl xs:text-5xl font-black font-mono-num text-[#00F5FF] leading-none my-1.5 drop-shadow-[0_0_20px_rgba(0,245,255,0.45)]">
            {state.score}
          </span>
          <span className="text-[11px] sm:text-xs text-[#79869C] font-mono">
            Best Campaign: <strong className="text-[#F0F6FC] font-mono-num">{Math.max(state.score, progress.bestCampaignScore || 0)}</strong>
          </span>
        </div>

        {/* Campaign Dossier Accolades */}
        <div className="grid grid-cols-3 gap-2 w-full mb-4 shrink-0">
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase">Stages</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-[#10FFA0] mt-0.5">
              6 / 6
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase">Victories</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-[#9865FF] mt-0.5">
              {progress.totalCampaignsWon || 1}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase">Max Length</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-[#FFB800] mt-0.5">
              {state.maxLength}
            </span>
          </div>
        </div>

        {/* Campaign Victory XP Reward & Bonuses */}
        {xpEarnResult ? (
          <div className="w-full mb-3 sm:mb-4 space-y-2 shrink-0">
            {xpEarnResult.levelsGained > 0 && !isCelebrationDismissed && (
              <LevelUpCelebration
                levelBefore={xpEarnResult.levelBefore}
                levelAfter={xpEarnResult.levelAfter}
                levelsGained={xpEarnResult.levelsGained}
                onDismiss={() => setIsCelebrationDismissed(true)}
              />
            )}

            <div
              data-testid="campaign-victory-xp-card"
              className="w-full bg-[#05070E] border border-[#FF007A]/40 rounded-xl p-2.5 sm:p-3 text-left shadow-[0_0_20px_rgba(255,0,122,0.15)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider text-[#79869C]">
                  CAMPAIGN REWARD XP
                </span>
                <span className="text-xs sm:text-sm font-black font-mono-num text-[#FF007A]">
                  +{xpEarnResult.xpEarned} XP AWARDED
                </span>
              </div>

              {/* Complete itemized breakdown separating performance and completion bonuses */}
              <div className="mt-2 space-y-2">
                <XpBreakdownList
                  breakdown={xpEarnResult.breakdown}
                  mode="maze"
                />

                <div className="pt-1.5 border-t border-[#161B2E] space-y-1">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
                  <span className="text-[#F0F6FC] font-bold">
                    Level {xpEarnResult.state.level} · {getLevelTitle(xpEarnResult.state.level)}
                  </span>
                  <span className="text-[#FFD700] font-bold">
                    {xpEarnResult.state.level >= 50
                      ? 'MAX LEVEL'
                      : `${xpEarnResult.state.currentXp.toLocaleString()} / ${xpEarnResult.state.xpForNextLevel.toLocaleString()} XP`}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[#161B2E] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00F5FF] via-[#FF007A] to-[#FFD700] transition-all duration-500"
                    style={{
                      width: `${
                        xpEarnResult.state.level >= 50
                          ? 100
                          : Math.min(
                              100,
                              Math.round(
                                (xpEarnResult.state.currentXp /
                                  Math.max(1, xpEarnResult.state.xpForNextLevel)) *
                                  100
                              )
                            )
                      }%`,
                    }}
                  />
                </div>

                <div className="text-[9px] sm:text-[10px] font-mono text-[#79869C] text-right">
                  {xpEarnResult.state.level >= 50
                    ? 'Apex Legend Status Confirmed!'
                    : `${Math.max(
                        0,
                        xpEarnResult.state.xpForNextLevel - xpEarnResult.state.currentXp
                      ).toLocaleString()} XP to Level ${xpEarnResult.state.level + 1}`}
                </div>
              </div>
            </div>
          </div>
        ) : progression ? (
          <div className="w-full mb-3 sm:mb-4 shrink-0">
            <div
              data-testid="campaign-victory-xp-card"
              className="w-full bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 text-left"
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono mb-1">
                <span className="text-[#F0F6FC] font-bold">
                  Level {progression.level} · {getLevelTitle(progression.level)}
                </span>
                <span className="text-[#FFD700] font-bold">
                  {progression.level >= 50
                    ? 'MAX LEVEL'
                    : `${progression.currentXp.toLocaleString()} / ${progression.xpForNextLevel.toLocaleString()} XP`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#161B2E] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00F5FF] via-[#FF007A] to-[#FFD700]"
                  style={{
                    width: `${
                      progression.level >= 50
                        ? 100
                        : Math.min(
                            100,
                            Math.round(
                              (progression.currentXp / Math.max(1, progression.xpForNextLevel)) * 100
                            )
                          )
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 sm:gap-2.5 w-full shrink-0">
          <button
            type="button"
            onClick={onReplayCampaign}
            data-start="true"
            className="w-full py-3 sm:py-3.5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider text-[#05070E] bg-gradient-to-r from-[#00F5FF] via-[#FF007A] to-[#FFB800] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(255,0,122,0.4)] border border-white/20"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>REPLAY CAMPAIGN [ENTER]</span>
          </button>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
            <button
              type="button"
              onClick={handleShare}
              className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10FFA0]" />
                  <span className="text-[#10FFA0]">COPIED</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#79869C]" />
                  <span>SHARE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCampaignSelect}
              className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-[#9865FF]/60 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <Compass className="w-3.5 h-3.5 text-[#9865FF]" />
              <span>STAGES</span>
            </button>

            <button
              type="button"
              onClick={onMainMenu}
              className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <Home className="w-3.5 h-3.5 text-[#79869C]" />
              <span>MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
