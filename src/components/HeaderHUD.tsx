import React from 'react';
import { Volume2, VolumeX, Pause, RotateCcw, Shield, Clock, Flame } from 'lucide-react';
import type { GameMode } from '../game/types.ts';

interface HeaderHUDProps {
  score: number;
  bestScore: number;
  level: number;
  length: number;
  mode: GameMode;
  hasShield: boolean;
  slowMoUntil: number;
  combo?: number;
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
  score,
  bestScore,
  level,
  length,
  mode,
  hasShield,
  slowMoUntil,
  combo = 1,
  onPause,
  onRestart,
  onToggleMute,
  sfxEnabled,
}) => {
  const modeInfo = MODE_LABELS[mode] || MODE_LABELS.classic;
  const now = Date.now();
  const slowMoRemaining = Math.max(0, Math.ceil((slowMoUntil - now) / 1000));

  return (
    <header
      role="banner"
      aria-label="Game Heads Up Display"
      className="w-full pointer-events-none flex items-center justify-between gap-1.5 sm:gap-3 z-10"
    >
      {/* Left: Score & Record Best + Level & Length */}
      <div className="flex items-center gap-1.5 xs:gap-2.5 sm:gap-4 md:gap-5 bg-[#101426]/95 border border-[#43F5FF]/30 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xs">
        {/* Score */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-slate-400 font-bold uppercase leading-none">
            Score
          </span>
          <span className="text-base sm:text-2xl md:text-3xl font-bold font-mono-num text-[#43F5FF] leading-tight mt-0.5">
            {score}
          </span>
        </div>

        <div className="w-[1px] h-6 sm:h-8 bg-slate-800 shrink-0" />

        {/* Best */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-slate-400 font-bold uppercase leading-none">
            Best
          </span>
          <span className="text-xs sm:text-lg md:text-xl font-bold font-mono-num text-slate-300 leading-tight mt-0.5">
            {Math.max(bestScore, score)}
          </span>
        </div>

        <div className="w-[1px] h-6 sm:h-8 bg-slate-800 shrink-0" />

        {/* Level */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-slate-400 font-bold uppercase leading-none">
            <span className="sm:hidden">Lvl</span>
            <span className="hidden sm:inline">Level</span>
          </span>
          <span className="text-xs sm:text-lg md:text-xl font-bold font-mono-num text-[#9865FF] leading-tight mt-0.5">
            {level}
          </span>
        </div>

        <div className="w-[1px] h-6 sm:h-8 bg-slate-800 shrink-0" />

        {/* Length */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-slate-400 font-bold uppercase leading-none">
            <span className="sm:hidden">Len</span>
            <span className="hidden sm:inline">Length</span>
          </span>
          <span className="text-xs sm:text-lg md:text-xl font-bold font-mono-num text-slate-300 leading-tight mt-0.5">
            {length}
          </span>
        </div>
      </div>

      {/* Center: Mode Indicator & Active Buffs/Combos */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-widest border ${modeInfo.border} bg-[#101426]/95 ${modeInfo.color} shadow-sm`}
        >
          {modeInfo.label}
        </div>

        {/* Active Power-Up Badges & Combo */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center max-w-[160px] sm:max-w-none">
          {combo > 1 && (
            <div
              title="Active Score Multiplier"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.2 sm:py-0.5 bg-amber-500/20 border border-amber-400 rounded text-amber-300 text-[9px] sm:text-[10px] font-bold shadow-[0_0_10px_rgba(251,191,36,0.4)] animate-pulse whitespace-nowrap"
            >
              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400" />
              <span>{combo}X<span className="hidden sm:inline"> COMBO</span></span>
            </div>
          )}
          {hasShield && (
            <div
              title="Aegis Shield Active"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.2 sm:py-0.5 bg-[#9865FF]/20 border border-[#9865FF] rounded text-[#9865FF] text-[9px] sm:text-[10px] font-bold animate-pulse whitespace-nowrap"
            >
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>SHIELD</span>
            </div>
          )}
          {slowMoRemaining > 0 && (
            <div
              title="Chrono Shift Active"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.2 sm:py-0.5 bg-[#43F5FF]/20 border border-[#43F5FF] rounded text-[#43F5FF] text-[9px] sm:text-[10px] font-bold whitespace-nowrap"
            >
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{slowMoRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
        <button
          type="button"
          onClick={e => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          tabIndex={-1}
          aria-label={sfxEnabled ? 'Mute Sound' : 'Unmute Sound'}
          title={sfxEnabled ? 'Mute [M]' : 'Unmute [M]'}
          className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#101426]/95 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
        >
          {sfxEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />}
        </button>

        <button
          type="button"
          onClick={e => {
            e.currentTarget.blur();
            onRestart();
          }}
          tabIndex={-1}
          aria-label="Restart Game"
          title="Restart [R]"
          className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#101426]/95 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          onClick={e => {
            e.currentTarget.blur();
            onPause();
          }}
          tabIndex={-1}
          aria-label="Pause Game"
          title="Pause [Space/Esc]"
          className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#101426]/95 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
