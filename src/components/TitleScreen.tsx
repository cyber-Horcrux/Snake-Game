import React from 'react';
import { Play, HelpCircle, Settings, Trophy, Volume2, VolumeX, Sparkles, Zap, Infinity, BarChart3 } from 'lucide-react';
import type { GameMode, ModeBestScores } from '../game/types.ts';

interface TitleScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  bestScores: ModeBestScores;
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  sfxEnabled: boolean;
  onToggleMute: () => void;
}

const MODES = [
  {
    id: 'classic' as GameMode,
    name: 'CLASSIC',
    tagline: 'Solid walls & increasing reflex challenge',
    icon: Trophy,
    color: 'from-[#43F5FF] to-[#3B82F6]',
    border: 'border-[#43F5FF]',
    glow: 'shadow-[0_0_15px_rgba(67,245,255,0.25)]',
    badge: 'Standard',
  },
  {
    id: 'zen' as GameMode,
    name: 'ZEN',
    tagline: 'Wraparound boundaries & relaxed flow state',
    icon: Infinity,
    color: 'from-[#39FF14] to-[#10B981]',
    border: 'border-[#39FF14]',
    glow: 'shadow-[0_0_15px_rgba(57,255,20,0.25)]',
    badge: 'Endless Flow',
  },
  {
    id: 'rush' as GameMode,
    name: 'RUSH',
    tagline: 'High speed, high risk & 1.5x bonus score',
    icon: Zap,
    color: 'from-[#FF4FD8] to-[#9865FF]',
    border: 'border-[#FF4FD8]',
    glow: 'shadow-[0_0_15px_rgba(255,79,216,0.25)]',
    badge: 'High Adrenaline',
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  onSelectMode,
  bestScores,
  onStartGame,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenStats,
  sfxEnabled,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between items-center p-3 xs:p-4 sm:p-6 bg-[#080A12]/85 backdrop-blur-xs overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      {/* Top Right Quick Settings */}
      <div className="w-full flex justify-end gap-2 max-w-4xl shrink-0">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={sfxEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="p-2 sm:p-2.5 rounded-lg bg-[#101426]/90 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Game Settings"
          className="p-2 sm:p-2.5 rounded-lg bg-[#101426]/90 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Main Title Centerpiece */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl w-full py-2 sm:py-4">
        {/* Custom Bespoke SVG Neon Snake Emblem */}
        <div className="mb-1.5 sm:mb-2 relative shrink-0">
          <div className="w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 mx-auto relative flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-[0_0_20px_rgba(67,245,255,0.6)] animate-pulse"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Cyber Hex Ring */}
              <polygon
                points="50,4 93,27 93,73 50,96 7,73 7,27"
                stroke="#9865FF"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                className="opacity-70"
              />
              {/* Snake Stylized S Curve with Glowing Points */}
              <path
                d="M30 30 C 30 18, 70 18, 70 34 C 70 50, 30 50, 30 66 C 30 82, 70 82, 70 70"
                stroke="#43F5FF"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M30 30 C 30 18, 70 18, 70 34 C 70 50, 30 50, 30 66 C 30 82, 70 82, 70 70"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Snake Head Optic Eye */}
              <circle cx="70" cy="70" r="5" fill="#FF4FD8" />
              <circle cx="70" cy="70" r="2" fill="#FFFFFF" />
            </svg>
          </div>
        </div>

        {/* Title Lockup */}
        <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#43F5FF] via-[#9865FF] to-[#FF4FD8] font-display uppercase neon-glow-cyan leading-tight">
          NEON SNAKE
        </h1>
        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm font-bold tracking-[0.25em] sm:tracking-[0.3em] text-slate-400 uppercase">
          ONE MORE RUN.
        </p>

        {/* Mode Selector Tabs */}
        <div className="mt-3 sm:mt-5 grid grid-cols-3 gap-1.5 xs:gap-2 sm:gap-3 w-full max-w-lg">
          {MODES.map(mode => {
            const isSelected = selectedMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className={`relative flex flex-col items-center p-2 sm:p-3 rounded-xl border transition-all text-center cursor-pointer active:scale-95 ${
                  isSelected
                    ? `${mode.border} bg-[#101426] ${mode.glow} scale-102 sm:scale-105 z-10`
                    : 'border-slate-800 bg-[#0d101d]/70 hover:border-slate-700 text-slate-400'
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1 ${
                    isSelected ? 'text-[#43F5FF]' : 'text-slate-500'
                  }`}
                />
                <span className={`text-[11px] xs:text-xs sm:text-sm font-bold font-display ${isSelected ? 'text-white' : ''}`}>
                  {mode.name}
                </span>
                <span className="text-[9px] xs:text-[10px] text-slate-400 font-mono-num mt-0.5 sm:mt-1">
                  BEST: {bestScores[mode.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mode Description Banner */}
        <div className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-xs text-slate-400 font-medium min-h-[1.25rem] px-2 truncate max-w-md">
          {MODES.find(m => m.id === selectedMode)?.tagline}
        </div>

        {/* Large Primary START Button */}
        <button
          type="button"
          onClick={onStartGame}
          data-start="true"
          className="mt-3 xs:mt-4 sm:mt-6 px-8 xs:px-10 sm:px-14 py-2.5 xs:py-3 sm:py-3.5 rounded-xl font-display font-black text-sm xs:text-base sm:text-lg tracking-wider text-[#080A12] bg-gradient-to-r from-[#43F5FF] via-[#74F7FF] to-[#9865FF] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(67,245,255,0.4)] flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          <span>PLAY RUN [ENTER]</span>
        </button>

        {/* Secondary Buttons */}
        <div className="mt-3 sm:mt-4 flex flex-wrap justify-center items-center gap-1.5 xs:gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white bg-[#101426]/80 border border-slate-700 hover:border-amber-400/50 transition-all cursor-pointer active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>DOSSIER</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white bg-[#101426]/80 border border-slate-700 hover:border-[#43F5FF]/50 transition-all cursor-pointer active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#43F5FF]" />
            <span>HOW TO PLAY</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white bg-[#101426]/80 border border-slate-700 hover:border-[#9865FF]/50 transition-all cursor-pointer active:scale-95"
          >
            <Settings className="w-3.5 h-3.5 text-[#9865FF]" />
            <span>SETTINGS</span>
          </button>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="w-full text-center py-1 sm:py-2 text-[10px] sm:text-xs text-slate-500 font-mono tracking-wider shrink-0">
        WASD / ARROWS MOVE · SPACE PAUSE · R RESTART
      </div>
    </div>
  );
};
