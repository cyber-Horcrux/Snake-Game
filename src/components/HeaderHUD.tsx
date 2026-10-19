import React from 'react';
import { Volume2, VolumeX, Pause, RotateCcw, Shield, Clock } from 'lucide-react';
import type { GameEngineState, GameMode } from '../game/types.ts';

interface HeaderHUDProps {
  state: GameEngineState;
  bestScore: number;
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  sfxEnabled: boolean;
}

const MODE_LABELS: Record<GameMode, { label: string; color: string; border: string }> = {
  classic: { label: 'CLASSIC', color: 'text-[#43F5FF]', border: 'border-[#43F5FF]/40' },
  zen: { label: 'ZEN', color: 'text-[#39FF14]', border: 'border-[#39FF14]/40' },
  rush: { label: 'RUSH', color: 'text-[#FF4FD8]', border: 'border-[#FF4FD8]/40' },
};

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  state,
  bestScore,
  onPause,
  onRestart,
  onToggleMute,
  sfxEnabled,
}) => {
  const modeInfo = MODE_LABELS[state.mode];
  const now = Date.now();
  const slowMoRemaining = Math.max(0, Math.ceil((state.powerUps.slowMoUntil - now) / 1000));

  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-5 flex flex-col justify-between z-10">
      {/* Top Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & High Score */}
        <div className="flex items-center gap-3 sm:gap-6 bg-[#101426]/90 border border-[#43F5FF]/30 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div>
            <div className="text-[10px] sm:text-xs tracking-wider text-slate-400 font-bold uppercase">
              Score
            </div>
            <div className="text-xl sm:text-3xl font-bold font-mono-num text-[#43F5FF] leading-none">
              {state.score}
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          <div>
            <div className="text-[10px] sm:text-xs tracking-wider text-slate-400 font-bold uppercase">
              Best
            </div>
            <div className="text-sm sm:text-xl font-bold font-mono-num text-slate-300 leading-none">
              {Math.max(bestScore, state.score)}
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-8 bg-slate-800" />

          <div className="hidden sm:block">
            <div className="text-[10px] sm:text-xs tracking-wider text-slate-400 font-bold uppercase">
              Level
            </div>
            <div className="text-sm sm:text-xl font-bold font-mono-num text-[#9865FF] leading-none">
              {state.level}
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-8 bg-slate-800" />

          <div className="hidden sm:block">
            <div className="text-[10px] sm:text-xs tracking-wider text-slate-400 font-bold uppercase">
              Length
            </div>
            <div className="text-sm sm:text-xl font-bold font-mono-num text-slate-300 leading-none">
              {state.snake.length}
            </div>
          </div>
        </div>

        {/* Center: Mode & Active Power-Ups */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-bold tracking-widest border ${modeInfo.border} bg-[#101426]/90 ${modeInfo.color} shadow-sm`}
          >
            {modeInfo.label}
          </div>

          {/* Active Power-Up Badges */}
          <div className="flex items-center gap-1.5">
            {state.powerUps.hasShield && (
              <div
                title="Aegis Shield Active"
                className="flex items-center gap-1 px-2 py-0.5 bg-[#9865FF]/20 border border-[#9865FF] rounded text-[#9865FF] text-[10px] font-bold animate-pulse"
              >
                <Shield className="w-3 h-3" />
                <span>SHIELD</span>
              </div>
            )}
            {slowMoRemaining > 0 && (
              <div
                title="Chrono Shift Active"
                className="flex items-center gap-1 px-2 py-0.5 bg-[#43F5FF]/20 border border-[#43F5FF] rounded text-[#43F5FF] text-[10px] font-bold"
              >
                <Clock className="w-3 h-3" />
                <span>{slowMoRemaining}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={e => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            tabIndex={-1}
            aria-label={sfxEnabled ? 'Mute Sound' : 'Unmute Sound'}
            title={sfxEnabled ? 'Mute [M]' : 'Unmute [M]'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#101426]/90 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            onClick={e => {
              e.currentTarget.blur();
              onRestart();
            }}
            tabIndex={-1}
            aria-label="Restart Game"
            title="Restart [R]"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#101426]/90 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={e => {
              e.currentTarget.blur();
              onPause();
            }}
            tabIndex={-1}
            aria-label="Pause Game"
            title="Pause [Space/Esc]"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#101426]/90 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Hint on Desktop */}
      <div className="hidden md:flex justify-between items-center text-[11px] text-slate-500 font-mono tracking-wider">
        <span>WASD / ARROWS TO MOVE</span>
        <span>SPACE TO PAUSE · R TO RESTART</span>
      </div>
    </div>
  );
};
