import React, { useState } from 'react';
import { ArrowRight, Compass, Home, Trophy, CheckCircle2, Zap } from 'lucide-react';
import type { GameEngineState } from '../game/types.ts';
import { getMazeStage, STAGE_INGRESS_CAPACITIES } from '../game/mazes.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';

interface StageClearModalProps {
  state: GameEngineState;
  onContinue: () => void;
  onCampaignSelect: () => void;
  onMainMenu: () => void;
}

export const StageClearModal: React.FC<StageClearModalProps> = ({
  state,
  onContinue,
  onCampaignSelect,
  onMainMenu,
}) => {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const currentStageConfig = getMazeStage(state.stage);
  const nextStageNum = Math.min(6, state.stage + 1);
  const nextStageConfig = getMazeStage(nextStageNum);
  const nextCapacity = STAGE_INGRESS_CAPACITIES[nextStageNum] || 14;

  const willBeTrimmed = state.snake.length > nextCapacity;
  const excessSegments = willBeTrimmed ? state.snake.length - nextCapacity : 0;
  const segmentBonus = excessSegments * 50;

  const handleContinueClick = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    onContinue();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stage Clear"
      className="absolute inset-0 z-30 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/92 backdrop-blur-md overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border-2 border-[#10FFA0]/60 rounded-2xl p-4 xs:p-5 sm:p-7 shadow-[0_0_50px_rgba(16,255,160,0.25)] flex flex-col items-center text-center overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Emblem */}
        <div className="mb-2 shrink-0">
          <BrandLogo
            variant="symbol"
            size="custom"
            className="w-10 h-10 sm:w-12 sm:h-12"
            glow={true}
            alt="Apex Cyber-Viper"
          />
        </div>

        {/* Mode Tag */}
        <div className="px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1 shrink-0 font-display border border-[#10FFA0]/40 bg-[#10FFA0]/10 text-[#10FFA0]">
          WARP GATE EXTRACTION SUCCESSFUL
        </div>

        {/* Title */}
        <h2 className="text-2xl xs:text-3xl sm:text-4xl font-black font-display tracking-wider text-[#F0F6FC] mb-1 shrink-0 drop-shadow-[0_0_20px_rgba(16,255,160,0.4)]">
          STAGE {state.stage} CLEARED
        </h2>

        {/* Subtitle / Stage Name */}
        <p className="text-[11px] sm:text-xs font-mono text-[#79869C] tracking-wider mb-3 sm:mb-4 shrink-0 font-bold uppercase">
          {currentStageConfig.name} — COMPLETED
        </p>

        {/* Main Score & Cores Banner */}
        <div className="w-full bg-[#05070E] border border-[#161B2E] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col items-center shrink-0">
          <span className="text-[10px] sm:text-xs text-[#79869C] font-bold uppercase tracking-widest">
            Total Campaign Score
          </span>
          <span className="text-3xl xs:text-4xl sm:text-5xl font-black font-mono-num text-[#00F5FF] leading-none my-1.5 drop-shadow-[0_0_15px_rgba(0,245,255,0.4)]">
            {state.score}
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-[#10FFA0] mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10FFA0]" />
            <span>10 / 10 Neon Cores Extracted</span>
          </div>
        </div>

        {/* Next Stage Preview Box */}
        <div className="w-full bg-[#05070E]/80 border border-[#9865FF]/40 rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 text-left shrink-0">
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider text-[#9865FF]">
            <span>NEXT TRIAL UNLOCKED</span>
            <span>STAGE {nextStageNum} / 6</span>
          </div>
          <p className="text-xs sm:text-sm font-black font-display text-[#F0F6FC] mt-0.5 tracking-wide">
            {nextStageConfig.name}
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#79869C] font-mono mt-0.5">
            {nextStageConfig.description}
          </p>

          {willBeTrimmed && (
            <div className="mt-2 pt-2 border-t border-[#161B2E] flex items-center justify-between text-[10px] font-mono text-[#FFB800]">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#FFB800]" />
                Ingress Cap ({nextCapacity}): {excessSegments} segments compressed
              </span>
              <strong className="text-[#10FFA0]">+{segmentBonus} PTS</strong>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 sm:gap-2.5 w-full shrink-0">
          <button
            type="button"
            disabled={isAdvancing}
            onClick={handleContinueClick}
            data-start="true"
            className="w-full py-3 sm:py-3.5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider text-[#05070E] bg-gradient-to-r from-[#10FFA0] via-[#00F5FF] to-[#9865FF] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(16,255,160,0.35)] border border-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>CONTINUE TO STAGE {nextStageNum}</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={onCampaignSelect}
              className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-[#9865FF]/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Compass className="w-3.5 h-3.5 text-[#9865FF]" />
              <span>STAGES</span>
            </button>

            <button
              type="button"
              onClick={onMainMenu}
              className="py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Home className="w-3.5 h-3.5 text-[#79869C]" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
