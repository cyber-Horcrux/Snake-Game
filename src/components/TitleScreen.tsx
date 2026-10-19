import React from 'react';
import { Play, HelpCircle, Settings, Trophy, Volume2, VolumeX, Sparkles, Zap, Infinity } from 'lucide-react';
import type { GameMode, ModeBestScores } from '../game/types.ts';

interface TitleScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  bestScores: ModeBestScores;
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
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
  sfxEnabled,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between items-center p-4 sm:p-6 bg-[#080A12]/80 overflow-y-auto">
      {/* Top Right Quick Settings */}
      <div className="w-full flex justify-end gap-2 max-w-4xl">
        <button
          onClick={onToggleMute}
          aria-label={sfxEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="p-2.5 rounded-lg bg-[#101426]/80 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] transition-all"
        >
          {sfxEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
        </button>

        <button
          onClick={onOpenSettings}
          aria-label="Game Settings"
          className="p-2.5 rounded-lg bg-[#101426]/80 border border-slate-700 hover:border-[#43F5FF] text-slate-300 hover:text-[#43F5FF] transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Title Centerpiece */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl w-full">
        {/* Custom Bespoke SVG Neon Snake Emblem */}
        <div className="mb-2 relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto relative flex items-center justify-center">
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
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#43F5FF] via-[#9865FF] to-[#FF4FD8] font-display uppercase neon-glow-cyan leading-tight">
          NEON SNAKE
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-bold tracking-[0.3em] text-slate-400 uppercase">
          ONE MORE RUN.
        </p>

        {/* Mode Selector Tabs */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-lg">
          {MODES.map(mode => {
            const isSelected = selectedMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`relative flex flex-col items-center p-2.5 sm:p-3 rounded-xl border transition-all text-center cursor-pointer ${
                  isSelected
                    ? `${mode.border} bg-[#101426] ${mode.glow} scale-105 z-10`
                    : 'border-slate-800 bg-[#0d101d]/60 hover:border-slate-700 text-slate-400'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 ${
                    isSelected ? 'text-[#43F5FF]' : 'text-slate-500'
                  }`}
                />
                <span className={`text-xs sm:text-sm font-bold font-display ${isSelected ? 'text-white' : ''}`}>
                  {mode.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono-num mt-1">
                  BEST: {bestScores[mode.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mode Description Banner */}
        <div className="mt-2.5 text-xs text-slate-400 font-medium h-4">
          {MODES.find(m => m.id === selectedMode)?.tagline}
        </div>

        {/* Large Primary START Button */}
        <button
          onClick={onStartGame}
          data-start="true"
          className="mt-6 px-10 sm:px-14 py-3.5 rounded-xl font-display font-black text-base sm:text-lg tracking-wider text-[#080A12] bg-gradient-to-r from-[#43F5FF] via-[#74F7FF] to-[#9865FF] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(67,245,255,0.4)] flex items-center gap-3 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>PLAY RUN [ENTER]</span>
        </button>

        {/* Secondary Buttons */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onOpenHowToPlay}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-[#101426]/70 border border-slate-700 hover:border-[#43F5FF]/50 transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#43F5FF]" />
            <span>HOW TO PLAY</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-[#101426]/70 border border-slate-700 hover:border-[#43F5FF]/50 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#9865FF]" />
            <span>SETTINGS</span>
          </button>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="w-full text-center py-2 text-xs text-slate-500 font-mono tracking-wider">
        WASD / ARROWS MOVE · SPACE PAUSE · R RESTART
      </div>
    </div>
  );
};
