import React, { useState } from 'react';
import { X, Volume2, Eye, Smartphone, Trash2, Check, AlertTriangle, Palette, Sparkles } from 'lucide-react';
import type { ControlMode, GameSettings, SnakeSkinId, SnakeTrailId } from '../game/types.ts';
import { SKINS } from '../game/constants.ts';
import { getTrailDefinition } from '../game/trails.ts';

interface SettingsModalProps {
  settings: GameSettings;
  equippedSkinId?: SnakeSkinId;
  equippedTrailId?: SnakeTrailId;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onResetScores: () => void;
  onOpenSkinCollection?: (tab?: 'skins' | 'trails') => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  equippedSkinId,
  equippedTrailId,
  onUpdateSettings,
  onResetScores,
  onOpenSkinCollection,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleToggleSfx = () => {
    onUpdateSettings({
      ...settings,
      audio: {
        ...settings.audio,
        sfxEnabled: !settings.audio.sfxEnabled,
      },
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    onUpdateSettings({
      ...settings,
      audio: {
        ...settings.audio,
        sfxVolume: vol,
      },
    });
  };

  const handleVisualChange = (mode: 'high' | 'performance' | 'reduced') => {
    onUpdateSettings({
      ...settings,
      visualEffects: mode,
    });
  };

  const handleControlModeChange = (mode: ControlMode) => {
    onUpdateSettings({
      ...settings,
      controlMode: mode,
      dpadPreference: mode === 'swipe' ? 'never' : mode === 'buttons' ? 'always' : 'auto',
    });
  };

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }

    onResetScores();
    setConfirmReset(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/90 backdrop-blur-sm overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border border-[#7928CA]/40 rounded-2xl shadow-[0_0_35px_rgba(121,40,202,0.2)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 flex items-center justify-between border-b border-[#161B2E] shrink-0 bg-[#0B0E1A]">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-wider text-[#F0F6FC] leading-none drop-shadow-[0_0_15px_rgba(121,40,202,0.3)]">
              SETTINGS
            </h2>
            <p className="text-[10px] sm:text-xs text-[#79869C] font-mono tracking-wider mt-1 font-semibold">
              CONFIGURATION & PROTOCOLS
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-[#7928CA]/60 transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 flex-1">
          {/* 1. Audio Settings */}
          <div className="bg-[#05070E] p-3.5 sm:p-4 rounded-xl border border-[#161B2E]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#00F5FF]" />
                Sound Effects
              </span>
              <button
                type="button"
                onClick={handleToggleSfx}
                aria-label={settings.audio.sfxEnabled ? 'Disable Sound Effects' : 'Enable Sound Effects'}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer font-display ${
                  settings.audio.sfxEnabled
                    ? 'bg-[#00F5FF]/15 text-[#00F5FF] border border-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.25)]'
                    : 'bg-[#0B0E1A] text-[#79869C] border border-[#161B2E]'
                }`}
              >
                {settings.audio.sfxEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#79869C] mb-1.5">
                <span>Volume</span>
                <span className="font-mono-num font-bold text-[#F0F6FC]">
                  {Math.round(settings.audio.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.audio.sfxVolume}
                onChange={handleVolumeChange}
                disabled={!settings.audio.sfxEnabled}
                aria-label="Sound volume slider"
                className="w-full accent-[#00F5FF] cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* 2. Visual Effects & Reduced Motion */}
          <div className="bg-[#05070E] p-3.5 sm:p-4 rounded-xl border border-[#161B2E]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC] flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-[#7928CA]" />
              Graphics & Animation
            </span>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'high' as const, label: 'HIGH GLOW', desc: 'Full bloom' },
                { id: 'performance' as const, label: 'FAST', desc: 'Balanced' },
                { id: 'reduced' as const, label: 'REDUCED', desc: 'No shake' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVisualChange(opt.id)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    settings.visualEffects === opt.id
                      ? 'border-[#7928CA] bg-[#7928CA]/20 text-[#F0F6FC] shadow-[0_0_12px_rgba(121,40,202,0.3)]'
                      : 'border-[#161B2E] text-[#79869C] hover:border-slate-700 hover:text-[#F0F6FC]'
                  }`}
                >
                  <div className="text-xs font-bold font-display">{opt.label}</div>
                  <div className="text-[10px] text-[#79869C] mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Snake Chassis Neon Skin */}
          <div className="bg-[#05070E] p-3.5 sm:p-4 rounded-xl border border-[#161B2E]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#00F5FF]" />
                Snake Chassis Neon Skin
              </span>
              <span className="text-[10px] font-mono text-[#00F5FF] uppercase tracking-widest px-2 py-0.5 rounded bg-[#00F5FF]/10 border border-[#00F5FF]/30 font-bold">
                ACTIVE
              </span>
            </div>

            {/* Active Skin Info Card */}
            {(() => {
              const activeId = equippedSkinId || settings.skin || 'cyber_cyan';
              const currentSkin = SKINS[activeId] || SKINS.cyber_cyan;
              return (
                <div className="p-3 rounded-xl border border-[#00F5FF]/40 bg-[#00F5FF]/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: currentSkin.headColor }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: currentSkin.bodyColors[1] }}
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentSkin.bodyColors[2] }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-display text-[#F0F6FC] truncate">
                        {currentSkin.name}
                      </div>
                      <div className="text-[10px] text-[#79869C] truncate">
                        {currentSkin.tagline}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {onOpenSkinCollection && (
              <button
                type="button"
                onClick={() => onOpenSkinCollection('skins')}
                className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00F5FF]/15 to-[#7928CA]/20 border border-[#00F5FF]/50 hover:border-[#00F5FF] text-[#00F5FF] hover:text-[#F0F6FC] font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,245,255,0.15)] active:scale-95"
              >
                <Palette className="w-4 h-4" />
                <span>SNAKE SKINS</span>
              </button>
            )}
          </div>

          {/* 3.5 Snake Energy Trail */}
          <div className="bg-[#05070E] p-3.5 sm:p-4 rounded-xl border border-[#161B2E]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9865FF]" />
                Snake Energy Trail
              </span>
              <span className="text-[10px] font-mono text-[#9865FF] uppercase tracking-widest px-2 py-0.5 rounded bg-[#9865FF]/10 border border-[#9865FF]/30 font-bold">
                ACTIVE
              </span>
            </div>

            {/* Active Trail Info Card */}
            {(() => {
              const activeTrailId = equippedTrailId || settings.trail || 'cyber_pulse';
              const currentTrail = getTrailDefinition(activeTrailId);
              return (
                <div className="p-3 rounded-xl border border-[#9865FF]/40 bg-[#9865FF]/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: currentTrail.color }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: currentTrail.secondaryColor }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-display text-[#F0F6FC] truncate">
                        {currentTrail.name}
                      </div>
                      <div className="text-[10px] text-[#79869C] truncate">
                        {currentTrail.tagline}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {onOpenSkinCollection && (
              <button
                type="button"
                onClick={() => onOpenSkinCollection('trails')}
                className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#9865FF]/15 to-[#FF007A]/20 border border-[#9865FF]/50 hover:border-[#9865FF] text-[#9865FF] hover:text-[#F0F6FC] font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(152,101,255,0.15)] active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>SNAKE TRAILS</span>
              </button>
            )}
          </div>

          {/* 4. Movement Controls */}
          <div className="bg-[#05070E] p-3.5 sm:p-4 rounded-xl border border-[#161B2E]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#FF007A]" />
                Movement Controls
              </span>
              <span className="text-[10px] font-mono text-[#79869C] uppercase tracking-widest px-2 py-0.5 rounded bg-[#0B0E1A] border border-[#161B2E] font-bold">
                {settings.controlMode}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'swipe' as const, label: 'SWIPE', desc: 'Gesture steering' },
                { id: 'buttons' as const, label: 'BUTTONS', desc: 'Directional D-Pad' },
                { id: 'both' as const, label: 'BOTH', desc: 'Swipe + D-Pad' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleControlModeChange(opt.id)}
                  aria-pressed={settings.controlMode === opt.id}
                  aria-label={`Select ${opt.label} controls`}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    settings.controlMode === opt.id
                      ? 'border-[#FF007A] bg-[#FF007A]/20 text-[#F0F6FC] shadow-[0_0_12px_rgba(255,0,122,0.35)]'
                      : 'border-[#161B2E] text-[#79869C] hover:border-slate-700 hover:text-[#F0F6FC]'
                  }`}
                >
                  <div className="text-xs font-bold font-display">{opt.label}</div>
                  <div className="text-[10px] text-[#79869C] mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Reset Best Scores */}
          <div className="bg-[#05070E] p-3.5 sm:p-4 rounded-xl border border-[#161B2E] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC] block">
                Personal Records
              </span>
              <span className="text-[11px] text-[#79869C]">
                Clear saved high scores across all modes
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetClick}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                confirmReset
                  ? 'bg-rose-500 text-white border border-rose-400 animate-pulse'
                  : resetDone
                  ? 'bg-[#10FFA0]/20 text-[#10FFA0] border border-[#10FFA0]'
                  : 'bg-[#0B0E1A] hover:bg-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] border border-[#161B2E]'
              }`}
            >
              {confirmReset ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>CONFIRM?</span>
                </>
              ) : resetDone ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>CLEARED</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>RESET</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#0B0E1A] border-t border-[#161B2E] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3.5 rounded-xl font-display font-black text-xs sm:text-sm tracking-wider bg-[#7928CA] hover:bg-[#9247E6] transition-all cursor-pointer shadow-[0_0_18px_rgba(121,40,202,0.35)] active:scale-98 text-white"
          >
            SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
