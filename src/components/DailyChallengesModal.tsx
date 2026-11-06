import React, { useEffect, useState } from 'react';
import { X, Star, Flame, Trophy, CheckCircle2, Clock, Sparkles, Zap, Shield, Award, Compass, ChevronRight } from 'lucide-react';
import type { DailyChallengeUserState, ActiveDailyChallenge } from '../game/challenges.ts';
import { getTimeUntilUtcMidnight, STREAK_MILESTONES, REWARD_STARS } from '../game/challenges.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';

interface DailyChallengesModalProps {
  dailyState: DailyChallengeUserState;
  onClose: () => void;
}

const DIFFICULTY_CONFIG = {
  easy: {
    label: 'EASY',
    color: 'text-[#00F5FF]',
    border: 'border-[#00F5FF]/50',
    bg: 'bg-[#00F5FF]/10',
    badge: 'border-[#00F5FF]/40 text-[#00F5FF] bg-[#00F5FF]/10',
  },
  medium: {
    label: 'MEDIUM',
    color: 'text-[#9865FF]',
    border: 'border-[#9865FF]/50',
    bg: 'bg-[#9865FF]/10',
    badge: 'border-[#9865FF]/40 text-[#9865FF] bg-[#9865FF]/10',
  },
  hard: {
    label: 'HARD',
    color: 'text-[#FF007A]',
    border: 'border-[#FF007A]/50',
    bg: 'bg-[#FF007A]/10',
    badge: 'border-[#FF007A]/40 text-[#FF007A] bg-[#FF007A]/10',
  },
};

const MODE_LABELS: Record<string, string> = {
  zen: 'ZEN MODE',
  rush: 'RUSH MODE',
  maze: 'MAZE CAMPAIGN',
};

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  dailyState,
  onClose,
}) => {
  // Live UTC midnight countdown timer
  const [countdown, setCountdown] = useState(() => getTimeUntilUtcMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilUtcMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = dailyState.challenges.filter(c => c.completed).length;
  const allThreeDone = dailyState.allThreeCompleted;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Challenges and Trophy Stars"
      className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/92 backdrop-blur-md overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border-2 border-[#FFD700]/50 rounded-2xl p-3 xs:p-4 sm:p-6 shadow-[0_0_50px_rgba(255,215,0,0.2)] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#161B2E] shrink-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="symbol" size="sm" glow={true} alt="Apex Cyber-Viper" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-black font-display tracking-wider text-[#F0F6FC] uppercase">
                  DAILY CHALLENGES
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 tracking-wider">
                  UTC PROTOCOL
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#79869C] font-mono flex items-center gap-2 flex-wrap">
                <span>Date: <strong className="text-[#F0F6FC]">{dailyState.activeDate}</strong></span>
                <span className="hidden xs:inline text-slate-600">·</span>
                <span className="flex items-center gap-1 text-[#00F5FF]">
                  <Clock className="w-3 h-3 text-[#00F5FF]" />
                  <span>
                    Resets in: {String(countdown.hours).padStart(2, '0')}:
                    {String(countdown.minutes).padStart(2, '0')}:
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Challenges"
            className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-slate-600 transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Trophy Stars Economy & Streak Banner */}
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#161B2E] shrink-0">
          {/* Lifetime Stars */}
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl px-2.5 py-1.5 sm:py-2 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase tracking-wider">
              <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
              <span>Trophy Stars</span>
            </div>
            <span className="text-base sm:text-xl font-black font-mono-num text-[#FFD700] mt-0.5 drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]">
              {dailyState.lifetimeStars}
            </span>
          </div>

          {/* Current Streak */}
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl px-2.5 py-1.5 sm:py-2 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase tracking-wider">
              <Flame className="w-3 h-3 text-[#FF8A00] fill-[#FF8A00]" />
              <span>Current Streak</span>
            </div>
            <span className="text-base sm:text-xl font-black font-mono-num text-[#FF8A00] mt-0.5">
              {dailyState.currentStreak} {dailyState.currentStreak === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>

          {/* Best Streak */}
          <div className="bg-[#05070E] border border-[#161B2E] rounded-xl px-2.5 py-1.5 sm:py-2 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#79869C] font-bold uppercase tracking-wider">
              <Trophy className="w-3 h-3 text-[#10FFA0]" />
              <span>Best Streak</span>
            </div>
            <span className="text-base sm:text-xl font-black font-mono-num text-[#10FFA0] mt-0.5">
              {dailyState.bestStreak} {dailyState.bestStreak === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
        </div>

        {/* Scrollable Center: The 3 Daily Challenge Cards & Bonuses */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-2.5 sm:space-y-3 min-h-0">
          {/* Daily Challenges List */}
          <div className="space-y-2 sm:space-y-2.5">
            {dailyState.challenges.map((challenge: ActiveDailyChallenge) => {
              const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty];
              const pct = Math.min(100, Math.floor((challenge.progress / challenge.target) * 100));

              return (
                <div
                  key={challenge.id}
                  className={`p-3 sm:p-4 rounded-xl border transition-all ${
                    challenge.completed
                      ? 'bg-[#0B1516]/60 border-[#10FFA0]/40 shadow-[0_0_18px_rgba(16,255,160,0.12)]'
                      : 'bg-[#0B0E1A] border-[#161B2E] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      {/* Tags Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-display uppercase tracking-wider border ${diffConfig.badge}`}>
                          {diffConfig.label}
                        </span>

                        {challenge.modeFilter && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-[#05070E] border border-[#161B2E] text-[#79869C]">
                            {MODE_LABELS[challenge.modeFilter] || challenge.modeFilter.toUpperCase()}
                          </span>
                        )}

                        {challenge.completed ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-display uppercase tracking-wider bg-[#10FFA0]/15 border border-[#10FFA0]/40 text-[#10FFA0] flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#10FFA0]" />
                            <span>COMPLETED (+{challenge.rewardStars} ★)</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 font-bold">
                            +{challenge.rewardStars} STARS
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-display font-black text-xs sm:text-sm text-[#F0F6FC] tracking-wider uppercase">
                        {challenge.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#79869C] font-mono mt-0.5">
                        {challenge.description}
                      </p>

                      {/* Progress Bar & Value */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-[#05070E] border border-[#161B2E] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              challenge.completed
                                ? 'bg-[#10FFA0] shadow-[0_0_8px_rgba(16,255,160,0.6)]'
                                : 'bg-gradient-to-r from-[#00F5FF] to-[#9865FF]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-mono-num font-bold text-[#F0F6FC] shrink-0">
                          {challenge.progress} / {challenge.target}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-Three Daily Completion Bonus Card */}
          <div
            className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              allThreeDone
                ? 'bg-[#121B14] border-[#10FFA0]/60 shadow-[0_0_20px_rgba(16,255,160,0.18)]'
                : 'bg-[#05070E] border-[#161B2E]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  allThreeDone
                    ? 'bg-[#10FFA0]/20 border-[#10FFA0] text-[#10FFA0]'
                    : 'bg-[#0B0E1A] border-[#161B2E] text-[#FFD700]'
                }`}
              >
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-display font-black text-xs sm:text-sm text-[#F0F6FC] tracking-wider uppercase">
                    ALL-THREE COMPLETION BONUS
                  </span>
                  <span className="text-[10px] font-bold text-[#FFD700] font-mono">
                    +{REWARD_STARS.ALL_THREE_BONUS} STARS
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#79869C] font-mono">
                  Finish all 3 daily challenges today to claim the daily bonus and extend your streak!
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {allThreeDone ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10FFA0]/20 border border-[#10FFA0]/50 text-[#10FFA0] text-xs font-bold font-display">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CLAIMED</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-[#0B0E1A] border border-[#161B2E] text-[#79869C] text-xs font-mono font-bold">
                  {completedCount} / 3 DONE
                </div>
              )}
            </div>
          </div>

          {/* Consecutive Streak Milestones Card */}
          <div className="bg-[#05070E]/70 border border-[#161B2E] rounded-xl p-3 sm:p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#161B2E] mb-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FF8A00]" />
                <span className="font-display font-black text-xs text-[#F0F6FC] tracking-wider uppercase">
                  CONSECUTIVE STREAK MILESTONES
                </span>
              </div>
              <span className="text-[10px] text-[#79869C] font-mono">
                Current: <strong className="text-[#FF8A00]">{dailyState.currentStreak} Days</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
              {STREAK_MILESTONES.map(milestone => {
                const isClaimed = dailyState.claimedMilestones.includes(milestone.days);
                const isReady = dailyState.currentStreak >= milestone.days;

                return (
                  <div
                    key={milestone.days}
                    className={`p-2 sm:p-2.5 rounded-lg border text-center flex flex-col items-center justify-between ${
                      isClaimed
                        ? 'bg-[#0B1516] border-[#10FFA0]/40'
                        : isReady
                        ? 'bg-[#1A1408] border-[#FFD700]/50'
                        : 'bg-[#0B0E1A] border-[#161B2E] opacity-75'
                    }`}
                  >
                    <span className="text-[10px] font-display font-black uppercase text-[#F0F6FC]">
                      {milestone.title}
                    </span>
                    <span className="text-xs font-black font-mono-num text-[#FFD700] my-0.5">
                      +{milestone.reward} ★
                    </span>
                    <span
                      className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded border ${
                        isClaimed
                          ? 'text-[#10FFA0] border-[#10FFA0]/30 bg-[#10FFA0]/10'
                          : isReady
                          ? 'text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10'
                          : 'text-[#79869C] border-[#161B2E] bg-[#05070E]'
                      }`}
                    >
                      {isClaimed ? 'CLAIMED' : `${dailyState.currentStreak} / ${milestone.days} DAYS`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="pt-3 border-t border-[#161B2E] flex justify-between items-center text-[10px] sm:text-xs text-[#79869C] font-mono shrink-0">
          <span>Earn Trophy Stars by conquering daily protocols</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#05070E] border border-[#161B2E] hover:border-slate-600 text-[#F0F6FC] font-display font-bold text-xs cursor-pointer active:scale-95"
          >
            RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
