import React, { useState } from 'react';
import { X, Award, BarChart3, CheckCircle2, Lock, Flame, Shield } from 'lucide-react';
import type { Achievement, LifetimeStats } from '../game/types.ts';
import { BrandLogo } from './branding/BrandLogo.tsx';

interface StatsModalProps {
  stats: LifetimeStats;
  achievements: Achievement[];
  onResetStats: () => void;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  achievements,
  onResetStats,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');
  const [confirmReset, setConfirmReset] = useState(false);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/90 backdrop-blur-sm overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-xl max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border border-[#00F5FF]/40 rounded-2xl shadow-[0_0_35px_rgba(0,245,255,0.2)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-[#161B2E] shrink-0 bg-[#0B0E1A]">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <BrandLogo
                variant="symbol"
                size="custom"
                className="w-8 h-8 sm:w-9 sm:h-9"
                glow={false}
                alt="Apex Cyber-Viper"
              />
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-wider text-[#F0F6FC] leading-none drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                  PILOT DOSSIER
                </h2>
                <p className="text-[10px] sm:text-xs text-[#79869C] font-mono tracking-wider mt-1 font-semibold">
                  CAREER TELEMETRY & ACHIEVEMENTS
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Statistics"
              className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-[#00F5FF]/60 transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 border transition-all cursor-pointer active:scale-98 ${
                activeTab === 'stats'
                  ? 'border-[#00F5FF] bg-[#00F5FF]/15 text-[#F0F6FC] shadow-[0_0_15px_rgba(0,245,255,0.25)]'
                  : 'border-[#161B2E] bg-[#05070E] text-[#79869C] hover:border-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00F5FF]" />
              <span>STATISTICS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 border transition-all cursor-pointer active:scale-98 ${
                activeTab === 'achievements'
                  ? 'border-[#7928CA] bg-[#7928CA]/20 text-[#F0F6FC] shadow-[0_0_15px_rgba(121,40,202,0.25)]'
                  : 'border-[#161B2E] bg-[#05070E] text-[#79869C] hover:border-slate-700'
              }`}
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7928CA]" />
              <span className="truncate">ACHIEVEMENTS ({unlockedCount}/{achievements.length})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto p-3.5 sm:p-6 flex-1 space-y-4">
          {/* Tab 1: Telemetry Stats */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Runs Executed</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#00F5FF] mt-1">{stats.runsPlayed}</span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Total Score</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#7928CA] mt-1">{stats.totalScore}</span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Highest Run</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#FFB800] mt-1">{stats.highestScore}</span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Food Consumed</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#10FFA0] mt-1">{stats.totalFoodEaten}</span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Bonus Stars</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#FF007A] mt-1">{stats.totalBonusEaten}</span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Longest Snake</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#00F5FF] mt-1">{stats.longestSnake}</span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Max Combo</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#FFB800] mt-1 flex items-center gap-1">
                    <Flame className="w-4 h-4 text-[#FFB800]" />
                    {stats.maxCombo}x
                  </span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Aegis Shields Used</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#7928CA] mt-1 flex items-center gap-1">
                    <Shield className="w-4 h-4 text-[#7928CA]" />
                    {stats.shieldsUsed}
                  </span>
                </div>

                <div className="bg-[#05070E] border border-[#161B2E] rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#79869C] font-bold uppercase tracking-wider">Zen Wraparounds</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#10FFA0] mt-1">{stats.wallsWrapped}</span>
                </div>
              </div>

              {/* Reset Stats Option */}
              <div className="pt-2 flex justify-between items-center border-t border-[#161B2E]">
                <span className="text-[10px] sm:text-[11px] text-[#79869C]">Reset telemetry and achievements</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmReset) {
                      setConfirmReset(true);
                    } else {
                      onResetStats();
                      setConfirmReset(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ${
                    confirmReset
                      ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                      : 'bg-[#05070E] text-[#79869C] border-[#161B2E] hover:border-slate-700 hover:text-[#F0F6FC]'
                  }`}
                >
                  {confirmReset ? 'CONFIRM PURGE?' : 'RESET DOSSIER'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Achievements Badges */}
          {activeTab === 'achievements' && (
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="bg-[#05070E] p-3 rounded-xl border border-[#161B2E]">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-[#F0F6FC] font-display">SYNTHESIS PROGRESS</span>
                  <span className="text-[#7928CA] font-mono-num">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#161B2E] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00F5FF] via-[#7928CA] to-[#FF007A] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Badges List */}
              <div className="space-y-2">
                {achievements.map(ach => (
                  <div
                    key={ach.id}
                    className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 sm:gap-3 transition-all ${
                      ach.unlocked
                        ? 'bg-[#0B0E1A] border-[#7928CA]/50 shadow-[0_0_12px_rgba(121,40,202,0.18)]'
                        : 'bg-[#05070E]/70 border-[#161B2E] opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        ach.unlocked
                          ? 'bg-[#7928CA]/20 border border-[#7928CA] text-[#7928CA]'
                          : 'bg-[#0B0E1A] border border-[#161B2E] text-slate-600'
                      }`}
                    >
                      {ach.unlocked ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#10FFA0]" /> : <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#79869C]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold font-display ${ach.unlocked ? 'text-[#F0F6FC]' : 'text-[#79869C]'}`}>
                          {ach.title}
                        </span>
                        {ach.unlocked && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10FFA0]/15 text-[#10FFA0] font-bold border border-[#10FFA0]/30 font-display">
                            UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-[#79869C] leading-tight mt-0.5">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#0B0E1A] border-t border-[#161B2E] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3.5 rounded-xl font-display font-black text-xs sm:text-sm tracking-wider text-[#05070E] bg-[#00F5FF] hover:bg-[#38E1FF] transition-all cursor-pointer shadow-[0_0_18px_rgba(0,245,255,0.35)] active:scale-98"
          >
            DISMISS DOSSIER
          </button>
        </div>
      </div>
    </div>
  );
};
