import React from 'react';
import { Sparkles, Trophy, Zap } from 'lucide-react';
import type { PlayerProgressionState } from '../../game/types.ts';
import { getLevelTitle } from '../../game/levels.ts';
import { MAX_PLAYER_LEVEL } from '../../game/constants.ts';

interface PlayerLevelCardProps {
  progression: PlayerProgressionState;
  variant?: 'compact' | 'standard' | 'hero';
  className?: string;
}

export const PlayerLevelCard: React.FC<PlayerLevelCardProps> = ({
  progression,
  variant = 'standard',
  className = '',
}) => {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, progression.level || 1));
  const isMaxLevel = level >= MAX_PLAYER_LEVEL;
  const levelTitle = getLevelTitle(level);
  const currentXp = Math.max(0, progression.currentXp || 0);
  const xpForNextLevel = isMaxLevel ? 0 : Math.max(1, progression.xpForNextLevel || 1);
  const remainingXp = isMaxLevel ? 0 : Math.max(0, xpForNextLevel - currentXp);
  const percent = isMaxLevel
    ? 100
    : Math.max(0, Math.min(100, Math.round((currentXp / xpForNextLevel) * 100)));

  if (variant === 'compact') {
    return (
      <div
        data-testid="player-level-card-compact"
        className={`bg-[#0B0E1A]/90 border border-[#161B2E] rounded-xl p-2.5 flex items-center justify-between gap-3 text-left ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#00F5FF]/15 border border-[#00F5FF]/40 flex items-center justify-center shrink-0">
            <span className="font-display font-black text-xs text-[#00F5FF] leading-none">
              {level}
            </span>
          </div>
          <div className="min-w-0 truncate">
            <div className="text-[11px] font-bold font-display text-[#F0F6FC] leading-none truncate">
              {levelTitle}
            </div>
            <div className="text-[9px] font-mono text-[#79869C] mt-0.5 truncate">
              {isMaxLevel ? (
                <span className="text-[#FFD700] font-semibold">MAX LEVEL</span>
              ) : (
                `${currentXp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`
              )}
            </div>
          </div>
        </div>

        <div className="w-20 shrink-0">
          <div className="w-full h-1.5 rounded-full bg-[#161B2E] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isMaxLevel
                  ? 'bg-gradient-to-r from-[#FFB800] to-[#FFD700]'
                  : 'bg-gradient-to-r from-[#00F5FF] to-[#7928CA]'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-[8px] font-mono text-right text-[#79869C] mt-0.5">
            {isMaxLevel ? '100%' : `${percent}%`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="player-level-card"
      className={`w-full bg-[#0B0E1A]/95 border border-[#161B2E] hover:border-[#00F5FF]/40 transition-all rounded-2xl p-3 xs:p-3.5 sm:p-4 text-left shadow-[0_0_24px_rgba(0,245,255,0.08)] ${className}`}
    >
      {/* Top Header: Level number + Title & Milestone Accolade */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-display font-black text-sm sm:text-base border ${
                isMaxLevel
                  ? 'bg-gradient-to-br from-[#FFD700]/25 to-[#FF8A00]/25 border-[#FFD700] text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.35)]'
                  : 'bg-[#00F5FF]/15 border-[#00F5FF]/60 text-[#00F5FF] shadow-[0_0_15px_rgba(0,245,255,0.25)]'
              }`}
            >
              {level}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-black font-display tracking-widest text-[#79869C] uppercase">
                LEVEL {level}
              </span>
              {isMaxLevel && (
                <span className="text-[9px] font-mono font-bold text-[#FFD700] flex items-center gap-0.5">
                  <Trophy className="w-2.5 h-2.5" />
                  MAX
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-black font-display text-[#F0F6FC] tracking-wide leading-tight drop-shadow-sm">
              {levelTitle}
            </div>
          </div>
        </div>

        {/* Total lifetime XP tag */}
        <div className="text-right shrink-0">
          <div className="text-[9px] font-mono font-semibold text-[#79869C] uppercase">
            CAREER XP
          </div>
          <div className="text-[11px] sm:text-xs font-mono font-bold text-[#10FFA0]">
            {(progression.totalLifetimeXp || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1 mt-2">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
          <span className="text-[#79869C]">
            {isMaxLevel ? (
              <span className="text-[#FFD700] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FFD700]" />
                APEX LEVEL ATTAINED
              </span>
            ) : (
              <span>
                <strong className="text-[#F0F6FC]">{currentXp.toLocaleString()}</strong> / {xpForNextLevel.toLocaleString()} XP
              </span>
            )}
          </span>
          <span className="font-bold text-[#00F5FF]">
            {isMaxLevel ? '100%' : `${percent}%`}
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 sm:h-2.5 rounded-full bg-[#05070E] border border-[#161B2E] overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isMaxLevel
                ? 'bg-gradient-to-r from-[#FFB800] via-[#FFD700] to-[#FF8A00] shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                : 'bg-gradient-to-r from-[#00F5FF] via-[#7928CA] to-[#FF007A] shadow-[0_0_12px_rgba(0,245,255,0.4)]'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Remaining XP or Max Message */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-[#79869C] pt-0.5">
          {isMaxLevel ? (
            <span className="text-[#FFD700] font-medium tracking-wide">
              MAX LEVEL REACHED! You've become an Apex Legend!
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1 text-[#38E1FF]">
                <Zap className="w-2.5 h-2.5" />
                {remainingXp.toLocaleString()} XP to Level {level + 1}
              </span>
              <span>Next: {getLevelTitle(level + 1)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
