import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import type { GameEngineState } from '../game/types.ts';

interface PauseModalProps {
  state: GameEngineState;
  bestScore: number;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  state,
  bestScore,
  onResume,
  onRestart,
  onMainMenu,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#080A12]/85">
      <div className="w-full max-w-md bg-[#101426] border-2 border-[#43F5FF] rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(67,245,255,0.25)] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="px-3 py-1 rounded bg-[#43F5FF]/10 border border-[#43F5FF]/30 text-[#43F5FF] text-xs font-bold tracking-widest uppercase mb-2">
          {state.mode} SIMULATION
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-wider text-white neon-glow-cyan mb-6">
          SYSTEM PAUSED
        </h2>

        {/* Run Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="bg-[#080A12] border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Current Score
            </span>
            <span className="text-2xl font-bold font-mono-num text-[#43F5FF] mt-1">
              {state.score}
            </span>
          </div>

          <div className="bg-[#080A12] border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Record Best
            </span>
            <span className="text-2xl font-bold font-mono-num text-slate-300 mt-1">
              {Math.max(bestScore, state.score)}
            </span>
          </div>

          <div className="bg-[#080A12] border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Food Eaten
            </span>
            <span className="text-xl font-bold font-mono-num text-[#39FF14] mt-1">
              {state.foodEaten}
            </span>
          </div>

          <div className="bg-[#080A12] border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Length
            </span>
            <span className="text-xl font-bold font-mono-num text-[#9865FF] mt-1">
              {state.snake.length}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full py-3.5 rounded-xl font-display font-bold text-base tracking-wider text-[#080A12] bg-[#43F5FF] hover:bg-[#74F7FF] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(67,245,255,0.3)]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>RESUME [SPACE]</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider text-slate-200 bg-[#080A12] hover:bg-slate-900 border border-slate-700 hover:border-[#43F5FF]/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#43F5FF]" />
            <span>RESTART RUN [R]</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
