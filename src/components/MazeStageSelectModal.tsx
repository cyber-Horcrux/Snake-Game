import React from 'react';
import { X, Lock, CheckCircle2, Play, Trophy, Shield, Zap, ChevronRight, Compass } from 'lucide-react';
import type { MazeProgress, MazeStageConfig } from '../game/types.ts';
import { MAZE_STAGES } from '../game/mazes.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';

interface MazeStageSelectModalProps {
  progress: MazeProgress;
  onSelectStage: (stageNumber: number) => void;
  onClose: () => void;
}

export const MazeStageSelectModal: React.FC<MazeStageSelectModalProps> = ({
  progress,
  onSelectStage,
  onClose,
}) => {
  const highestUnlocked = Math.max(1, Math.min(6, progress.highestStageUnlocked || 1));
  const hasWonCampaign = (progress.totalCampaignsWon || 0) > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Maze Campaign Stage Selection"
      className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/92 backdrop-blur-md overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border-2 border-[#9865FF]/50 rounded-2xl p-3 xs:p-4 sm:p-6 shadow-[0_0_50px_rgba(152,101,255,0.25)] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#161B2E] shrink-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="symbol" size="sm" glow={true} alt="Apex Cyber-Viper" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-black font-display tracking-wider text-[#F0F6FC] uppercase">
                  MAZE CAMPAIGN
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9865FF]/20 text-[#9865FF] border border-[#9865FF]/40 tracking-wider">
                  v1.3 CHALLENGE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#79869C] font-mono">
                Curated tactical trials & Warp Gate extraction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Stage Select"
            className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-slate-600 transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Campaign Dossier Stats Banner */}
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#161B2E] shrink-0">
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl px-2.5 py-1.5 sm:py-2 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase tracking-wider">
              Unlocked
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono-num text-[#9865FF] mt-0.5">
              {highestUnlocked} / 6
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl px-2.5 py-1.5 sm:py-2 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase tracking-wider">
              Victories
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono-num text-[#10FFA0] mt-0.5">
              {progress.totalCampaignsWon || 0}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl px-2.5 py-1.5 sm:py-2 flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase tracking-wider">
              Campaign Best
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono-num text-[#00F5FF] mt-0.5">
              {progress.bestCampaignScore || 0}
            </span>
          </div>
        </div>

        {/* Stages Grid (All 6 Handcrafted Stages) */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-2 sm:space-y-2.5 min-h-0">
          {MAZE_STAGES.map((stageConfig: MazeStageConfig) => {
            const isUnlocked = stageConfig.stage <= highestUnlocked;
            const isCompleted =
              stageConfig.stage < highestUnlocked ||
              (stageConfig.stage === 6 && hasWonCampaign);
            const isCurrentTarget =
              stageConfig.stage === highestUnlocked && !isCompleted;

            return (
              <button
                key={stageConfig.stage}
                type="button"
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) {
                    onSelectStage(stageConfig.stage);
                  }
                }}
                className={`w-full text-left p-3 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  !isUnlocked
                    ? 'bg-[#080B14]/40 border-[#161B2E]/60 opacity-55 cursor-not-allowed'
                    : isCurrentTarget
                    ? 'bg-[#0F1428] border-[#9865FF] shadow-[0_0_20px_rgba(152,101,255,0.22)] hover:border-[#B48BFF] cursor-pointer active:scale-[0.99]'
                    : isCompleted
                    ? 'bg-[#0B0E1A] border-[#10FFA0]/30 hover:border-[#10FFA0]/60 cursor-pointer active:scale-[0.99]'
                    : 'bg-[#0B0E1A] border-[#161B2E] hover:border-[#00F5FF]/50 cursor-pointer active:scale-[0.99]'
                }`}
              >
                {/* Left: Stage Number Badge & Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-display font-black text-sm sm:text-base shrink-0 border ${
                      !isUnlocked
                        ? 'bg-[#05070E] border-[#161B2E] text-slate-600'
                        : isCurrentTarget
                        ? 'bg-[#9865FF]/20 border-[#9865FF] text-[#F0F6FC] shadow-[0_0_12px_rgba(152,101,255,0.4)]'
                        : isCompleted
                        ? 'bg-[#10FFA0]/15 border-[#10FFA0]/50 text-[#10FFA0]'
                        : 'bg-[#05070E] border-[#161B2E] text-[#00F5FF]'
                    }`}
                  >
                    {!isUnlocked ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#10FFA0]" />
                    ) : (
                      <span>{stageConfig.stage}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-black text-xs sm:text-sm text-[#F0F6FC] tracking-wider uppercase truncate">
                        {stageConfig.stage}. {stageConfig.name}
                      </span>

                      {isCurrentTarget && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#9865FF]/20 text-[#B48BFF] border border-[#9865FF]/40 tracking-wider uppercase animate-pulse">
                          Current Objective
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#10FFA0]/15 text-[#10FFA0] border border-[#10FFA0]/30 tracking-wider uppercase">
                          Cleared
                        </span>
                      )}
                      {!isUnlocked && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-500 bg-[#05070E] border border-[#161B2E] tracking-wider uppercase">
                          Locked
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs text-[#79869C] mt-0.5 truncate">
                      {stageConfig.description}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[10px] sm:text-[11px] font-mono text-[#79869C]">
                      <span>Max Ingress: <strong className="text-[#00F5FF] font-mono-num">{stageConfig.maxIngressCapacity}</strong></span>
                      <span>Target: <strong className="text-[#9865FF] font-mono-num">10 Cores</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Action Indicator */}
                <div className="shrink-0 flex items-center">
                  {isUnlocked ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#05070E] border border-[#161B2E] text-xs font-bold font-display text-[#F0F6FC] group-hover:border-[#9865FF]">
                      <Play className="w-3.5 h-3.5 text-[#9865FF] fill-current" />
                      <span className="hidden xs:inline">{isCompleted ? 'REPLAY' : 'LAUNCH'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#79869C]" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-[#05070E] border border-[#161B2E] text-slate-600">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Guidance */}
        <div className="pt-3 border-t border-[#161B2E] flex justify-between items-center text-[10px] sm:text-xs text-[#79869C] font-mono shrink-0">
          <span>Collect 10 Neon Cores to unlock perimeter Warp Gate</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#05070E] border border-[#161B2E] hover:border-slate-600 text-[#F0F6FC] font-display font-bold text-xs cursor-pointer active:scale-95"
          >
            RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
