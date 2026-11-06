import React, { useState } from 'react';
import { RotateCcw, Home, Trophy, Share2, Check, BarChart3 } from 'lucide-react';
import type { GameEngineState } from '../game/types.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';

interface GameOverModalProps {
  state: GameEngineState;
  bestScore: number;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onOpenStats?: () => void;
  onCampaignSelect?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  state,
  bestScore,
  isNewRecord,
  onPlayAgain,
  onMainMenu,
  onOpenStats,
  onCampaignSelect,
}) => {
  const [copied, setCopied] = useState(false);
  const isMaze = state.mode === 'maze';

  const handleShare = async () => {
    const text = isMaze
      ? `I scored ${state.score} in Neon Snake (Maze Campaign Stage ${state.stage})! Can you beat my run?`
      : `I scored ${state.score} in Neon Snake (${state.mode.toUpperCase()} Mode)! Can you beat my record?`;
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

  const getDeathMessage = () => {
    if (state.isVictory) return 'GRID OVERFLOW // COMPLETE ARENA SYNTHESIS';
    if (state.deathReason === 'wall') return 'FATAL IMPACT // BOUNDARY OR OBSTACLE COLLISION';
    if (state.deathReason === 'self') return 'FATAL OVERLAP // NEURAL SELF-COLLISION';
    return 'SYSTEM SIGNAL LOST';
  };

  const accentColor = state.isVictory ? '#10FFA0' : '#FF007A';
  const borderColor = state.isVictory ? 'border-[#10FFA0]/60' : 'border-[#FF007A]/60';
  const shadowColor = state.isVictory
    ? 'shadow-[0_0_40px_rgba(16,255,160,0.25)]'
    : 'shadow-[0_0_40px_rgba(255,0,122,0.25)]';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/90 backdrop-blur-sm overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div
        className={`w-full max-w-md max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border-2 ${borderColor} rounded-2xl p-4 xs:p-5 sm:p-7 md:p-8 ${shadowColor} flex flex-col items-center text-center overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Brand Emblem */}
        <div className="mb-2 shrink-0">
          <BrandLogo
            variant="symbol"
            size="custom"
            className="w-10 h-10 sm:w-12 sm:h-12"
            glow={isNewRecord}
            alt="Apex Cyber-Viper"
          />
        </div>

        {/* Mode Tag */}
        <div
          className="px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1 shrink-0 font-display border"
          style={{
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}40`,
            color: accentColor,
          }}
        >
          {isMaze ? `MAZE STAGE ${state.stage || 1} FAILED` : `${state.mode} RUN TERMINATED`}
        </div>

        {/* Title */}
        <h2 className="text-2xl xs:text-3xl sm:text-5xl font-black font-display tracking-wider text-[#F0F6FC] mb-1 shrink-0 drop-shadow-[0_0_20px_rgba(255,0,122,0.3)]">
          {state.isVictory ? 'VICTORY' : 'GAME OVER'}
        </h2>

        {/* Subtitle / Death Reason */}
        <p className="text-[11px] sm:text-xs font-mono text-[#79869C] tracking-wider mb-3 sm:mb-4 shrink-0 font-semibold">
          {getDeathMessage()}
        </p>

        {/* New Record Celebration Banner */}
        {isNewRecord && (
          <div className="w-full mb-3 sm:mb-4 py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#FF007A]/15 via-[#00F5FF]/15 to-[#7928CA]/15 border border-[#00F5FF] flex items-center justify-center gap-2 text-[#00F5FF] font-bold text-xs sm:text-sm tracking-wider animate-pulse shrink-0 shadow-[0_0_15px_rgba(0,245,255,0.25)]">
            <Trophy className="w-4 h-4 text-[#FFB800]" />
            <span>NEW ALL-TIME RECORD!</span>
          </div>
        )}

        {/* Big Score Display */}
        <div className="w-full bg-[#05070E] border border-[#161B2E] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col items-center shrink-0">
          <span className="text-[10px] sm:text-xs text-[#79869C] font-bold uppercase tracking-widest">
            {isMaze ? 'Campaign Score' : 'Final Score'}
          </span>
          <span className="text-3xl xs:text-4xl sm:text-5xl font-black font-mono-num text-[#00F5FF] leading-none my-1.5 drop-shadow-[0_0_15px_rgba(0,245,255,0.4)]">
            {state.score}
          </span>
          <span className="text-[11px] sm:text-xs text-[#79869C] font-mono">
            {isMaze ? 'Campaign Best' : 'Mode Best'}: <strong className="text-[#F0F6FC] font-mono-num">{bestScore}</strong>
          </span>
        </div>

        {/* Detailed Run Statistics */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full mb-4 sm:mb-5 shrink-0">
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase">
              {isMaze ? 'Cores' : 'Food'}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-[#10FFA0] mt-0.5">
              {isMaze ? `${state.stageFoodEaten || 0}/10` : state.foodEaten}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase">Max Length</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-[#7928CA] mt-0.5">
              {state.maxLength}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase">
              {isMaze ? 'Stage' : 'Level'}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-[#00F5FF] mt-0.5">
              {isMaze ? `${state.stage || 1}/6` : state.level}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 sm:gap-3 w-full shrink-0">
          <button
            type="button"
            onClick={onPlayAgain}
            data-start="true"
            className="w-full py-2.5 sm:py-3.5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider text-[#05070E] bg-gradient-to-r from-[#00F5FF] to-[#7928CA] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(0,245,255,0.4)] border border-white/20"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{isMaze ? 'RETRY STAGE [ENTER]' : 'PLAY AGAIN [ENTER]'}</span>
          </button>

          <div className={`grid ${isMaze && onCampaignSelect ? 'grid-cols-3' : onOpenStats ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 sm:gap-2 w-full`}>
            {isMaze && onCampaignSelect ? (
              <button
                type="button"
                onClick={onCampaignSelect}
                className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-[#9865FF]/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trophy className="w-3.5 h-3.5 text-[#9865FF]" />
                <span>STAGES</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleShare}
                className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
            )}

            {onOpenStats && (!isMaze || !onCampaignSelect) && (
              <button
                type="button"
                onClick={onOpenStats}
                className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-[#FFB800]/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#FFB800]" />
                <span>DOSSIER</span>
              </button>
            )}

            {isMaze && onCampaignSelect && (
              <button
                type="button"
                onClick={handleShare}
                className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
            )}

            <button
              type="button"
              onClick={onMainMenu}
              className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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

