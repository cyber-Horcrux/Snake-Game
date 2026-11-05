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

const MODE_LABELS: Record<GameMode, { label: string; color: string; border: string; bg: string }> = {
  classic: {
    label: 'CLASSIC',
    color: 'text-[#00F5FF]',
    border: 'border-[#00F5FF]/40',
    bg: 'bg-[#00F5FF]/10',
  },
  zen: {
    label: 'ZEN',
    color: 'text-[#10FFA0]',
    border: 'border-[#10FFA0]/40',
    bg: 'bg-[#10FFA0]/10',
  },
  rush: {
    label: 'RUSH',
    color: 'text-[#FF007A]',
    border: 'border-[#FF007A]/40',
    bg: 'bg-[#FF007A]/10',
  },
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
      <div className="flex items-center gap-1.5 xs:gap-2.5 sm:gap-4 md:gap-5 bg-[#0B0E1A]/95 border border-[#161B2E] px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl pointer-events-auto shadow-[0_4px_24px_rgba(5,7,14,0.7)] backdrop-blur-sm">
        {/* Score */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-[#79869C] font-bold uppercase leading-none">
            Score
          </span>
          <span className="text-base sm:text-2xl md:text-3xl font-bold font-mono-num text-[#00F5FF] leading-tight mt-0.5">
            {score}
          </span>
        </div>

        <div className="w-[1px] h-6 sm:h-8 bg-[#161B2E] shrink-0" />

        {/* Best */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-[#79869C] font-bold uppercase leading-none">
            Best
          </span>
          <span className="text-xs sm:text-lg md:text-xl font-bold font-mono-num text-[#F0F6FC] leading-tight mt-0.5">
            {Math.max(bestScore, score)}
          </span>
        </div>

        <div className="w-[1px] h-6 sm:h-8 bg-[#161B2E] shrink-0" />

        {/* Level */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-[#79869C] font-bold uppercase leading-none">
            <span className="sm:hidden">Lvl</span>
            <span className="hidden sm:inline">Level</span>
          </span>
          <span className="text-xs sm:text-lg md:text-xl font-bold font-mono-num text-[#7928CA] leading-tight mt-0.5">
            {level}
          </span>
        </div>

        <div className="w-[1px] h-6 sm:h-8 bg-[#161B2E] shrink-0" />

        {/* Length */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[11px] tracking-wider text-[#79869C] font-bold uppercase leading-none">
            <span className="sm:hidden">Len</span>
            <span className="hidden sm:inline">Length</span>
          </span>
          <span className="text-xs sm:text-lg md:text-xl font-bold font-mono-num text-[#F0F6FC] leading-tight mt-0.5">
            {length}
          </span>
        </div>
      </div>

      {/* Center: Mode Indicator & Active Buffs/Combos */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className={`px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-widest border ${modeInfo.border} ${modeInfo.bg} ${modeInfo.color} shadow-sm uppercase font-display`}
        >
          {modeInfo.label}
        </div>

        {/* Active Power-Up Badges & Combo */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center max-w-[160px] sm:max-w-none">
          {combo > 1 && (
            <div
              title="Active Score Multiplier"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-[#FFB800]/15 border border-[#FFB800] rounded text-[#FFB800] text-[9px] sm:text-[10px] font-bold shadow-[0_0_12px_rgba(255,184,0,0.35)] animate-pulse whitespace-nowrap"
            >
              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FFB800] fill-[#FFB800]" />
              <span>{combo}X<span className="hidden sm:inline"> COMBO</span></span>
            </div>
          )}
          {hasShield && (
            <div
              title="Aegis Shield Active"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-[#7928CA]/20 border border-[#7928CA] rounded text-[#F0F6FC] text-[9px] sm:text-[10px] font-bold shadow-[0_0_10px_rgba(121,40,202,0.4)] animate-pulse whitespace-nowrap"
            >
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#7928CA]" />
              <span>SHIELD</span>
            </div>
          )}
          {slowMoRemaining > 0 && (
            <div
              title="Chrono Shift Active"
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-[#00F5FF]/15 border border-[#00F5FF] rounded text-[#00F5FF] text-[9px] sm:text-[10px] font-bold shadow-[0_0_10px_rgba(0,245,255,0.35)] whitespace-nowrap"
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
          className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B0E1A]/95 border border-[#161B2E] hover:border-[#00F5FF]/60 text-[#79869C] hover:text-[#00F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
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
          className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B0E1A]/95 border border-[#161B2E] hover:border-[#00F5FF]/60 text-[#79869C] hover:text-[#00F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
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
          className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B0E1A]/95 border border-[#161B2E] hover:border-[#00F5FF]/60 text-[#79869C] hover:text-[#00F5FF] flex items-center justify-center transition-colors shadow-md active:scale-95 cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
