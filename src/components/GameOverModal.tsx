import React, { useState } from 'react';
import { RotateCcw, Home, Trophy, Share2, Check } from 'lucide-react';
import type { GameEngineState } from '../game/types.ts';

interface GameOverModalProps {
  state: GameEngineState;
  bestScore: number;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  state,
  bestScore,
  isNewRecord,
  onPlayAgain,
  onMainMenu,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `I scored ${state.score} in Neon Snake (${state.mode.toUpperCase()} Mode)! Can you beat my record?`;
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
    if (state.deathReason === 'wall') return 'FATAL IMPACT // BOUNDARY COLLISION';
    if (state.deathReason === 'self') return 'FATAL OVERLAP // NEURAL SELF-COLLISION';
    return 'SYSTEM SIGNAL LOST';
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#080A12]/90">
      <div className="w-full max-w-md bg-[#101426] border-2 border-[#FF4FD8] rounded-2xl p-6 sm:p-8 shadow-[0_0_40px_rgba(255,79,216,0.3)] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Mode Tag */}
        <div className="px-3 py-0.5 rounded bg-[#FF4FD8]/10 border border-[#FF4FD8]/40 text-[#FF4FD8] text-xs font-bold tracking-widest uppercase mb-1">
          {state.mode} RUN TERMINATED
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-wider text-white neon-glow-magenta mb-1">
          {state.isVictory ? 'VICTORY' : 'GAME OVER'}
        </h2>

        {/* Subtitle / Death Reason */}
        <p className="text-xs font-mono text-slate-400 tracking-wider mb-6">
          {getDeathMessage()}
        </p>

        {/* New Record Celebration Banner */}
        {isNewRecord && (
          <div className="w-full mb-6 py-2 px-4 rounded-xl bg-gradient-to-r from-[#FF4FD8]/20 via-[#43F5FF]/20 to-[#9865FF]/20 border border-[#43F5FF] flex items-center justify-center gap-2 text-[#43F5FF] font-bold text-sm tracking-wider animate-pulse">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>NEW ALL-TIME RECORD!</span>
          </div>
        )}

        {/* Big Score Display */}
        <div className="w-full bg-[#080A12] border border-slate-800 rounded-xl p-4 mb-5 flex flex-col items-center">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            Final Score
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono-num text-[#43F5FF] leading-none my-1">
            {state.score}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Mode Best: <strong className="text-white font-mono-num">{bestScore}</strong>
          </span>
        </div>

        {/* Detailed Run Statistics */}
        <div className="grid grid-cols-3 gap-2 w-full mb-6">
          <div className="bg-[#080A12]/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Food</span>
            <span className="text-lg font-bold font-mono-num text-[#39FF14] mt-0.5">
              {state.foodEaten}
            </span>
          </div>

          <div className="bg-[#080A12]/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Max Length</span>
            <span className="text-lg font-bold font-mono-num text-[#9865FF] mt-0.5">
              {state.maxLength}
            </span>
          </div>

          <div className="bg-[#080A12]/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Level</span>
            <span className="text-lg font-bold font-mono-num text-[#43F5FF] mt-0.5">
              {state.level}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onPlayAgain}
            data-start="true"
            className="w-full py-3.5 rounded-xl font-display font-bold text-base tracking-wider text-[#080A12] bg-gradient-to-r from-[#43F5FF] to-[#9865FF] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(67,245,255,0.35)]"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN [ENTER]</span>
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={handleShare}
              className="py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-300 bg-[#080A12] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#39FF14]" />
                  <span className="text-[#39FF14]">COPIED!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>SHARE RUN</span>
                </>
              )}
            </button>

            <button
              onClick={onMainMenu}
              className="py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-300 bg-[#080A12] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
