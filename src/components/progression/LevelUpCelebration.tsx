import React from 'react';
import { Sparkles, Trophy, ArrowUpRight } from 'lucide-react';
import { getLevelTitle } from '../../game/levels.ts';

interface LevelUpCelebrationProps {
  levelBefore: number;
  levelAfter: number;
  levelsGained: number;
  onDismiss?: () => void;
  className?: string;
}

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  levelBefore,
  levelAfter,
  levelsGained,
  onDismiss,
  className = '',
}) => {
  if (levelsGained <= 0 || levelAfter <= levelBefore) {
    return null;
  }

  const newTitle = getLevelTitle(levelAfter);

  return (
    <div
      data-testid="level-up-celebration"
      className={`w-full bg-gradient-to-r from-[#00F5FF]/15 via-[#7928CA]/25 to-[#FF007A]/15 border-2 border-[#00F5FF] rounded-2xl p-3 sm:p-4 text-center shadow-[0_0_30px_rgba(0,245,255,0.35)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-300 ${className}`}
    >
      {/* Decorative ambient light */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#00F5FF]/20 blur-xl pointer-events-none rounded-full" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Banner Tag */}
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#00F5FF]/20 border border-[#00F5FF]/50 text-[#00F5FF] text-[10px] sm:text-xs font-black font-display tracking-widest uppercase mb-1 shadow-sm">
          <Sparkles className="w-3 h-3 text-[#FFD700]" />
          <span>
            {levelsGained > 1 ? `LEVEL UP! +${levelsGained} LEVELS` : 'LEVEL UP!'}
          </span>
          <Sparkles className="w-3 h-3 text-[#FFD700]" />
        </div>

        {/* Transition Header */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 my-1">
          <div className="flex items-center gap-1 text-sm sm:text-base font-black font-display text-[#79869C]">
            <span>LVL {levelBefore}</span>
          </div>

          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00F5FF]/20 text-[#00F5FF]">
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
          </div>

          <div className="flex items-center gap-1 text-xl sm:text-2xl font-black font-display text-[#F0F6FC] drop-shadow-[0_0_12px_rgba(0,245,255,0.6)]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F5FF] to-[#10FFA0]">
              LVL {levelAfter}
            </span>
          </div>
        </div>

        {/* New Rank Title */}
        <div className="text-xs sm:text-sm font-black font-display text-[#FFD700] tracking-wider drop-shadow-sm flex items-center gap-1 mt-0.5">
          <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
          <span>{newTitle}</span>
        </div>

        {/* Supportive subtitle for teenagers and kids */}
        <p className="text-[10px] sm:text-[11px] font-mono text-[#79869C] mt-1 font-medium">
          New milestone reached! Your pilot rank is ascending.
        </p>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 text-[10px] font-mono text-[#00F5FF] hover:underline cursor-pointer"
          >
            DISMISS
          </button>
        )}
      </div>
    </div>
  );
};
