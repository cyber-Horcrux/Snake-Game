import React, { useState } from 'react';
import { X, Award, BarChart3, CheckCircle2, Lock, Flame, Shield } from 'lucide-react';
import type { Achievement, LifetimeStats } from '../game/types.ts';

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
    <div className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#080A12]/90 backdrop-blur-sm overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-xl max-h-[calc(100dvh-1.5rem)] bg-[#101426] border border-[#43F5FF]/40 rounded-2xl shadow-[0_0_35px_rgba(67,245,255,0.2)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800/80 shrink-0 bg-[#101426]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-wider text-white neon-glow-cyan leading-none">
                PILOT DOSSIER
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider mt-1">
                CAREER TELEMETRY & ACHIEVEMENTS
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Statistics"
              className="p-1.5 sm:p-2 rounded-lg bg-[#080A12] border border-slate-700 text-slate-400 hover:text-white hover:border-[#43F5FF] transition-all cursor-pointer active:scale-95"
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
                  ? 'border-[#43F5FF] bg-[#43F5FF]/20 text-white shadow-[0_0_15px_rgba(67,245,255,0.3)]'
                  : 'border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#43F5FF]" />
              <span>STATISTICS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 border transition-all cursor-pointer active:scale-98 ${
                activeTab === 'achievements'
                  ? 'border-[#9865FF] bg-[#9865FF]/20 text-white shadow-[0_0_15px_rgba(152,101,255,0.3)]'
                  : 'border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9865FF]" />
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
                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Runs Executed</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#43F5FF] mt-1">{stats.runsPlayed}</span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Score</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-num text-[#9865FF] mt-1">{stats.totalScore}</span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Highest Run</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-num text-amber-400 mt-1">{stats.highestScore}</span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Food Consumed</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#39FF14] mt-1">{stats.totalFoodEaten}</span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bonus Stars</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#FF4FD8] mt-1">{stats.totalBonusEaten}</span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Longest Snake</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#43F5FF] mt-1">{stats.longestSnake}</span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Max Combo</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-amber-400 mt-1 flex items-center gap-1">
                    <Flame className="w-4 h-4 text-amber-400" />
                    {stats.maxCombo}x
                  </span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aegis Shields Used</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#9865FF] mt-1 flex items-center gap-1">
                    <Shield className="w-4 h-4 text-[#9865FF]" />
                    {stats.shieldsUsed}
                  </span>
                </div>

                <div className="bg-[#080A12] border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Zen Wraparounds</span>
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[#39FF14] mt-1">{stats.wallsWrapped}</span>
                </div>
              </div>

              {/* Reset Stats Option */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                <span className="text-[10px] sm:text-[11px] text-slate-500">Reset telemetry and achievements</span>
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
                  className={`px-2.5 sm:px-3 py-1 rounded text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ${
                    confirmReset
                      ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                      : 'bg-[#080A12] text-slate-400 border-slate-800 hover:border-slate-700'
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
              <div className="bg-[#080A12] p-2.5 sm:p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-slate-300">SYNTHESIS PROGRESS</span>
                  <span className="text-[#9865FF] font-mono-num">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#43F5FF] via-[#9865FF] to-[#FF4FD8] transition-all duration-500"
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
                        ? 'bg-[#101426] border-[#9865FF]/50 shadow-[0_0_12px_rgba(152,101,255,0.15)]'
                        : 'bg-[#080A12]/60 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        ach.unlocked
                          ? 'bg-[#9865FF]/20 border border-[#9865FF] text-[#9865FF]'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      {ach.unlocked ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#39FF14]" /> : <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold font-display ${ach.unlocked ? 'text-white' : 'text-slate-400'}`}>
                          {ach.title}
                        </span>
                        {ach.unlocked && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#39FF14]/20 text-[#39FF14] font-bold">
                            UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight mt-0.5">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#101426] border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 rounded-xl font-display font-bold text-xs sm:text-sm tracking-wider text-[#080A12] bg-[#43F5FF] hover:bg-[#74F7FF] transition-all cursor-pointer shadow-[0_0_15px_rgba(67,245,255,0.3)] active:scale-98"
          >
            DISMISS DOSSIER
          </button>
        </div>
      </div>
    </div>
  );
};
