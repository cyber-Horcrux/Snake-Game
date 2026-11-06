import React from 'react';
import type { XpBreakdown, GameMode } from '../../game/types.ts';
import { Award, Zap, Shield, Sparkles, Trophy } from 'lucide-react';

interface XpBreakdownListProps {
  breakdown: XpBreakdown;
  mode?: GameMode;
  className?: string;
}

interface BreakdownRow {
  key: keyof Omit<XpBreakdown, 'totalXp'>;
  label: string;
  value: number;
  isBonus?: boolean;
  icon?: React.ReactNode;
}

export const XpBreakdownList: React.FC<XpBreakdownListProps> = ({
  breakdown,
  mode,
  className = '',
}) => {
  if (!breakdown || breakdown.totalXp <= 0) {
    return null;
  }

  const isMaze = mode === 'maze';

  // 1. Performance-based items
  const performanceRows: BreakdownRow[] = [
    {
      key: 'foodXp',
      label: isMaze ? 'Neon Cores' : 'Food Consumed',
      value: breakdown.foodXp,
      icon: <Sparkles className="w-3 h-3 text-[#10FFA0]" />,
    },
    {
      key: 'bonusFoodXp',
      label: 'Bonus Food',
      value: breakdown.bonusFoodXp,
      icon: <Sparkles className="w-3 h-3 text-[#FF007A]" />,
    },
    {
      key: 'scoreXp',
      label: 'Score Conversion',
      value: breakdown.scoreXp,
      icon: <Zap className="w-3 h-3 text-[#00F5FF]" />,
    },
    {
      key: 'survivalXp',
      label: 'Survival Time',
      value: breakdown.survivalXp,
      icon: <Award className="w-3 h-3 text-[#9865FF]" />,
    },
    {
      key: 'comboXp',
      label: 'Combo Multiplier',
      value: breakdown.comboXp,
      icon: <Zap className="w-3 h-3 text-[#FFB800]" />,
    },
    {
      key: 'shieldXp',
      label: 'Shield Defenses',
      value: breakdown.shieldXp,
      icon: <Shield className="w-3 h-3 text-[#00F5FF]" />,
    },
    {
      key: 'zenWrapXp',
      label: 'Zen Wraparounds',
      value: breakdown.zenWrapXp,
      icon: <Sparkles className="w-3 h-3 text-[#00F5FF]" />,
    },
    {
      key: 'rushBonusXp',
      label: 'Rush Multiplier (+25%)',
      value: breakdown.rushBonusXp,
      icon: <Zap className="w-3 h-3 text-[#FF007A]" />,
    },
  ].filter((item) => item.value > 0);

  // 2. Completion bonuses
  const bonusRows: BreakdownRow[] = [
    {
      key: 'stageClearBonusXp',
      label: 'Stage Clear Bonus',
      value: breakdown.stageClearBonusXp,
      isBonus: true,
      icon: <Award className="w-3 h-3 text-[#10FFA0]" />,
    },
    {
      key: 'campaignVictoryBonusXp',
      label: 'Campaign Victory Bonus',
      value: breakdown.campaignVictoryBonusXp,
      isBonus: true,
      icon: <Trophy className="w-3 h-3 text-[#FFD700]" />,
    },
  ].filter((item) => item.value > 0);

  const allActiveRows = [...performanceRows, ...bonusRows];

  if (allActiveRows.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="xp-breakdown-list"
      className={`w-full space-y-1.5 text-left ${className}`}
    >
      {/* Performance Items */}
      {performanceRows.length > 0 && (
        <div className="space-y-1">
          {bonusRows.length > 0 && (
            <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#79869C] px-0.5">
              Performance XP
            </div>
          )}
          <div className="bg-[#05070E]/60 border border-[#161B2E] rounded-lg divide-y divide-[#161B2E]/60 overflow-hidden">
            {performanceRows.map((row) => (
              <div
                key={row.key}
                data-testid={`xp-breakdown-row-${row.key}`}
                className="flex items-center justify-between px-2.5 py-1 text-[10px] sm:text-[11px] font-mono"
              >
                <div className="flex items-center gap-1.5 text-[#F0F6FC]">
                  {row.icon}
                  <span>{row.label}</span>
                </div>
                <span className="font-bold text-[#00F5FF] font-mono-num">
                  +{row.value} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Bonuses */}
      {bonusRows.length > 0 && (
        <div className="space-y-1 pt-0.5">
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#10FFA0] px-0.5 flex items-center justify-between">
            <span>Completion Bonus</span>
            <span className="text-[8px] bg-[#10FFA0]/15 text-[#10FFA0] border border-[#10FFA0]/30 px-1 rounded">
              BONUS
            </span>
          </div>
          <div className="bg-[#05070E]/60 border border-[#10FFA0]/30 rounded-lg divide-y divide-[#161B2E]/60 overflow-hidden">
            {bonusRows.map((row) => (
              <div
                key={row.key}
                data-testid={`xp-breakdown-row-${row.key}`}
                className="flex items-center justify-between px-2.5 py-1 text-[10px] sm:text-[11px] font-mono bg-[#10FFA0]/5"
              >
                <div className="flex items-center gap-1.5 text-[#F0F6FC] font-semibold">
                  {row.icon}
                  <span>{row.label}</span>
                </div>
                <span className="font-bold text-[#10FFA0] font-mono-num">
                  +{row.value} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
