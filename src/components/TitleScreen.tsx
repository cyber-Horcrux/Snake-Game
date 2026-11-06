import React from 'react';
import { Play, HelpCircle, Settings, Trophy, Volume2, VolumeX, Zap, Infinity, BarChart3, Compass, Star } from 'lucide-react';
import type { GameMode, MazeProgress, ModeBestScores, PlayerProgressionState } from '../game/types.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';
import { PlayerLevelCard } from './progression/PlayerLevelCard.tsx';

interface TitleScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  bestScores: ModeBestScores;
  mazeProgress?: MazeProgress;
  progression?: PlayerProgressionState;
  onStartGame: () => void;
  onOpenStageSelect?: () => void;
  onOpenDailyChallenges?: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  sfxEnabled: boolean;
  onToggleMute: () => void;
  trophyStars?: number;
  dailyCompletedCount?: number;
}

const MODES = [
  {
    id: 'classic' as GameMode,
    name: 'CLASSIC',
    tagline: 'Solid walls & increasing reflex challenge',
    icon: Trophy,
    accent: '#00F5FF',
    border: 'border-[#00F5FF]',
    glow: 'shadow-[0_0_18px_rgba(0,245,255,0.28)]',
    badge: 'Standard',
  },
  {
    id: 'zen' as GameMode,
    name: 'ZEN',
    tagline: 'Wraparound boundaries & relaxed flow state',
    icon: Infinity,
    accent: '#10FFA0',
    border: 'border-[#10FFA0]',
    glow: 'shadow-[0_0_18px_rgba(16,255,160,0.28)]',
    badge: 'Endless Flow',
  },
  {
    id: 'rush' as GameMode,
    name: 'RUSH',
    tagline: 'High speed, high risk & 1.5x bonus score',
    icon: Zap,
    accent: '#FF007A',
    border: 'border-[#FF007A]',
    glow: 'shadow-[0_0_18px_rgba(255,0,122,0.28)]',
    badge: 'High Adrenaline',
  },
  {
    id: 'maze' as GameMode,
    name: 'MAZE',
    tagline: '6 curated tactical stages & Warp Gate extraction',
    icon: Compass,
    accent: '#9865FF',
    border: 'border-[#9865FF]',
    glow: 'shadow-[0_0_18px_rgba(152,101,255,0.28)]',
    badge: 'Campaign',
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  onSelectMode,
  bestScores,
  mazeProgress,
  progression,
  onStartGame,
  onOpenStageSelect,
  onOpenDailyChallenges,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenStats,
  sfxEnabled,
  onToggleMute,
  trophyStars = 0,
  dailyCompletedCount = 0,
}) => {
  const isMaze = selectedMode === 'maze';

  const handlePlayClick = () => {
    if (isMaze && onOpenStageSelect) {
      onOpenStageSelect();
    } else {
      onStartGame();
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between items-center p-3 xs:p-4 sm:p-6 bg-[#05070E]/88 backdrop-blur-sm overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      {/* Top Right Quick Controls */}
      <div className="w-full flex justify-end gap-2 max-w-4xl shrink-0">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={sfxEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="p-2 sm:p-2.5 rounded-xl bg-[#0B0E1A]/90 border border-[#161B2E] hover:border-[#00F5FF]/60 text-[#79869C] hover:text-[#00F5FF] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Game Settings"
          className="p-2 sm:p-2.5 rounded-xl bg-[#0B0E1A]/90 border border-[#161B2E] hover:border-[#00F5FF]/60 text-[#79869C] hover:text-[#00F5FF] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Main Title Centerpiece */}
      <div className="flex flex-col items-center text-center my-auto max-w-3xl w-full py-2 sm:py-4">
        {/* Apex Cyber-Viper Master Brand Logo */}
        <div className="mb-2 sm:mb-3 relative shrink-0">
          <BrandLogo
            variant="symbol"
            size="custom"
            className="w-14 h-14 xs:w-18 xs:h-18 sm:w-22 sm:h-22"
            glow={true}
            interactive={true}
            alt="Apex Cyber-Viper Emblem"
          />
        </div>

        {/* Brand Title Lockup */}
        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00F5FF] via-[#7928CA] to-[#FF007A] font-display uppercase leading-tight select-none drop-shadow-[0_0_24px_rgba(0,245,255,0.35)]">
          NEON SNAKE
        </h1>
        <p className="mt-1 text-[11px] sm:text-xs font-bold tracking-[0.32em] text-[#79869C] uppercase select-none">
          ONE MORE RUN
        </p>

        {/* Pilot Progression Level Card */}
        {progression && (
          <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md lg:max-w-2xl mt-3 sm:mt-4 shrink-0">
            <PlayerLevelCard progression={progression} />
          </div>
        )}

        {/* Mode Selector Cards (Responsive 2x2 on Mobile/Tablet, 4 Cols on Desktop) */}
        <div className="@container w-full max-w-xs xs:max-w-sm sm:max-w-md lg:max-w-2xl mt-3 xs:mt-4 sm:mt-6">
          <div className="grid grid-cols-2 @[640px]:grid-cols-4 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3 w-full">
            {MODES.map(mode => {
              const isSelected = selectedMode === mode.id;
              const Icon = mode.icon;
              const isMazeMode = mode.id === 'maze';
              const bestDisplay = isMazeMode
                ? `STAGE ${mazeProgress?.highestStageUnlocked || 1}/6`
                : `BEST: ${bestScores[mode.id] || 0}`;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onSelectMode(mode.id)}
                  className={`relative flex flex-col items-center justify-center p-2.5 xs:p-3 sm:p-3.5 rounded-xl border transition-all text-center cursor-pointer active:scale-95 min-h-[4.5rem] xs:min-h-[4.75rem] sm:min-h-[5.25rem] h-full ${
                    isSelected
                      ? 'border-[#00F5FF] bg-[#0B0E1A] shadow-[0_0_18px_rgba(0,245,255,0.28)] scale-[1.02] z-10'
                      : 'border-[#161B2E] bg-[#0B0E1A]/60 hover:border-slate-700 text-[#79869C]'
                  }`}
                >
                  <Icon
                    className="w-4 h-4 sm:w-5 sm:h-5 mb-1 shrink-0 transition-colors"
                    style={{ color: isSelected ? mode.accent : undefined }}
                  />
                  <span className={`text-[11px] xs:text-xs sm:text-sm font-bold font-display tracking-wider leading-tight ${isSelected ? 'text-[#F0F6FC]' : ''}`}>
                    {mode.name}
                  </span>
                  <span className="text-[9px] xs:text-[10px] text-[#79869C] font-mono-num mt-1 font-semibold truncate max-w-full leading-none">
                    {bestDisplay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Tagline Description */}
        <div className="mt-2 sm:mt-2.5 text-[11px] sm:text-xs text-[#79869C] font-medium min-h-[1.25rem] px-2 text-center max-w-md">
          {MODES.find(m => m.id === selectedMode)?.tagline}
        </div>

        {/* Large Primary Action Button */}
        <button
          type="button"
          onClick={handlePlayClick}
          data-start="true"
          className="mt-4 xs:mt-5 sm:mt-7 px-8 xs:px-12 sm:px-16 py-3 xs:py-3.5 sm:py-4 rounded-xl font-display font-black text-sm xs:text-base sm:text-lg tracking-wider text-[#05070E] bg-gradient-to-r from-[#00F5FF] via-[#38E1FF] to-[#7928CA] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_28px_rgba(0,245,255,0.4)] flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0 border border-white/20"
        >
          {isMaze ? <Compass className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
          <span>{isMaze ? 'CAMPAIGN STAGES [ENTER]' : 'PLAY RUN [ENTER]'}</span>
        </button>

        {/* Secondary Buttons Grid */}
        <div className="mt-3.5 sm:mt-5 flex flex-wrap justify-center items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenDailyChallenges}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-[#FFD700] bg-[#0B0E1A]/90 border border-[#FFD700]/50 hover:border-[#FFD700] hover:text-[#FFF] transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(255,215,0,0.2)]"
          >
            <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
            <span>DAILY {trophyStars > 0 ? `(${trophyStars} ★)` : 'CHALLENGES'}</span>
            {dailyCompletedCount < 3 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F5FF] animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenStageSelect}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-[#F0F6FC] bg-[#0B0E1A]/90 border border-[#9865FF]/50 hover:border-[#9865FF] text-[#9865FF] hover:text-[#F0F6FC] transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(152,101,255,0.2)]"
          >
            <Compass className="w-3.5 h-3.5 text-[#9865FF]" />
            <span>CAMPAIGN</span>
          </button>

          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-[#F0F6FC] bg-[#0B0E1A]/90 border border-[#161B2E] hover:border-[#FFB800]/60 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#FFB800]" />
            <span>DOSSIER</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-[#F0F6FC] bg-[#0B0E1A]/90 border border-[#161B2E] hover:border-[#00F5FF]/60 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#00F5FF]" />
            <span>HOW TO PLAY</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-[#F0F6FC] bg-[#0B0E1A]/90 border border-[#161B2E] hover:border-[#7928CA]/60 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-[#7928CA]" />
            <span>SETTINGS</span>
          </button>
        </div>
      </div>

      {/* Bottom Tactical Control Legend */}
      <div className="w-full text-center py-1 sm:py-2 text-[10px] sm:text-xs text-[#79869C]/80 font-mono tracking-wider shrink-0 select-none">
        WASD / ARROWS MOVE · SPACE PAUSE · R RESTART
      </div>
    </div>
  );
};
