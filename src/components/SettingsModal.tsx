import React, { useState } from 'react';
import { X, Volume2, VolumeX, Eye, Smartphone, Trash2, Check, AlertTriangle } from 'lucide-react';
import type { GameSettings } from '../game/types.ts';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onResetScores: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetScores,
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

  const handleDpadChange = (pref: 'auto' | 'always' | 'never') => {
    onUpdateSettings({
      ...settings,
      dpadPreference: pref,
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
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#080A12]/90 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-[#101426] border border-[#9865FF]/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(152,101,255,0.2)] relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Settings"
          className="absolute top-5 right-5 p-2 rounded-lg bg-[#080A12] border border-slate-700 text-slate-400 hover:text-white hover:border-[#9865FF] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-wider text-white neon-glow-magenta mb-1">
          SETTINGS
        </h2>
        <p className="text-xs text-slate-400 font-mono tracking-wider mb-6">
          CONFIGURATION & PROTOCOLS
        </p>

        {/* 1. Audio Settings */}
        <div className="mb-6 bg-[#080A12] p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#43F5FF]" />
              Sound Effects
            </span>
            <button
              onClick={handleToggleSfx}
              aria-label={settings.audio.sfxEnabled ? 'Disable Sound Effects' : 'Enable Sound Effects'}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                settings.audio.sfxEnabled
                  ? 'bg-[#43F5FF]/20 text-[#43F5FF] border border-[#43F5FF]'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {settings.audio.sfxEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Volume</span>
              <span className="font-mono-num font-bold text-white">
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
              className="w-full accent-[#43F5FF] cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        {/* 2. Visual Effects & Reduced Motion */}
        <div className="mb-6 bg-[#080A12] p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[#9865FF]" />
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
                onClick={() => handleVisualChange(opt.id)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  settings.visualEffects === opt.id
                    ? 'border-[#9865FF] bg-[#9865FF]/20 text-white shadow-[0_0_10px_rgba(152,101,255,0.3)]'
                    : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. On-Screen D-Pad */}
        <div className="mb-6 bg-[#080A12] p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-[#FF4FD8]" />
            Mobile Directional Pad
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'auto' as const, label: 'AUTO', desc: 'Touch screens' },
              { id: 'always' as const, label: 'ALWAYS', desc: 'Show pad' },
              { id: 'never' as const, label: 'OFF', desc: 'Swipe only' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handleDpadChange(opt.id)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  settings.dpadPreference === opt.id
                    ? 'border-[#FF4FD8] bg-[#FF4FD8]/20 text-white shadow-[0_0_10px_rgba(255,79,216,0.3)]'
                    : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Reset Best Scores */}
        <div className="mb-6 bg-[#080A12] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
              Personal Records
            </span>
            <span className="text-[11px] text-slate-400">
              Clear saved high scores across all modes
            </span>
          </div>

          <button
            onClick={handleResetClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              confirmReset
                ? 'bg-rose-500 text-white border border-rose-400 animate-pulse'
                : resetDone
                ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
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

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider text-[#080A12] bg-[#9865FF] hover:bg-[#B084FF] transition-all cursor-pointer shadow-[0_0_15px_rgba(152,101,255,0.3)]"
        >
          SAVE & CLOSE
        </button>
      </div>
    </div>
  );
};
