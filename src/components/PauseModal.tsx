import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import type { GameEngineState } from '../game/types.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';

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
    <div className="absolute inset-0 z-30 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/88 backdrop-blur-sm overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border-2 border-[#00F5FF]/50 rounded-2xl p-4 xs:p-5 sm:p-7 md:p-8 shadow-[0_0_35px_rgba(0,245,255,0.22)] flex flex-col items-center text-center overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Subtle Brand Identity Accent */}
        <div className="mb-2 shrink-0">
          <BrandLogo
            variant="symbol"
            size="custom"
            className="w-8 h-8 sm:w-10 sm:h-10 opacity-90"
            glow={false}
            alt="Apex Cyber-Viper"
          />
        </div>

        <div className="px-2.5 py-0.5 rounded bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1 sm:mb-2 shrink-0 font-display">
          {state.mode} SIMULATION
        </div>

        <h2 className="text-2xl xs:text-3xl sm:text-4xl font-black font-display tracking-wider text-[#F0F6FC] mb-3 sm:mb-5 shrink-0 drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]">
          SYSTEM PAUSED
        </h2>

        {/* Run Stat Tiles */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full mb-4 sm:mb-6 shrink-0">
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center">
            <span className="text-[10px] sm:text-[11px] text-[#79869C] font-bold uppercase tracking-wider">
              Current Score
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#00F5FF] mt-0.5 sm:mt-1">
              {state.score}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center">
            <span className="text-[10px] sm:text-[11px] text-[#79869C] font-bold uppercase tracking-wider">
              Record Best
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#F0F6FC] mt-0.5 sm:mt-1">
              {Math.max(bestScore, state.score)}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center">
            <span className="text-[10px] sm:text-[11px] text-[#79869C] font-bold uppercase tracking-wider">
              Food Eaten
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono-num text-[#10FFA0] mt-0.5 sm:mt-1">
              {state.foodEaten}
            </span>
          </div>

          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center">
            <span className="text-[10px] sm:text-[11px] text-[#79869C] font-bold uppercase tracking-wider">
              Length
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono-num text-[#7928CA] mt-0.5 sm:mt-1">
              {state.snake.length}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 sm:gap-3 w-full shrink-0">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 sm:py-3.5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider text-[#05070E] bg-[#00F5FF] hover:bg-[#38E1FF] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(0,245,255,0.35)]"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>RESUME [SPACE]</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 sm:py-3 rounded-xl font-display font-bold text-xs sm:text-sm tracking-wider text-[#F0F6FC] bg-[#05070E] hover:bg-[#161B2E] border border-[#161B2E] hover:border-[#00F5FF]/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00F5FF]" />
            <span>RESTART RUN [R]</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#79869C] hover:text-[#F0F6FC] transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-98"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>RETURN TO MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
