import React from 'react';
import { X, ArrowRight, Shield, Clock, Sparkles, Award } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#080A12]/90 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl bg-[#101426] border border-[#43F5FF]/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(67,245,255,0.2)] relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close How to Play"
          className="absolute top-5 right-5 p-2 rounded-lg bg-[#080A12] border border-slate-700 text-slate-400 hover:text-white hover:border-[#43F5FF] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-wider text-white neon-glow-cyan mb-1">
          TACTICAL MANUAL
        </h2>
        <p className="text-xs text-slate-400 font-mono tracking-wider mb-6">
          NEON SNAKE OPERATING PROTOCOL
        </p>

        {/* Section 1: Controls */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#43F5FF] mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#43F5FF]" />
            Control Directives
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#080A12] p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">DESKTOP / KEYBOARD</span>
              <ul className="text-slate-400 space-y-1">
                <li><strong className="text-slate-200">WASD / Arrow Keys:</strong> Steer</li>
                <li><strong className="text-slate-200">Space / Escape:</strong> Pause & Resume</li>
                <li><strong className="text-slate-200">R:</strong> Instant Restart</li>
                <li><strong className="text-slate-200">M:</strong> Mute / Unmute Sound</li>
              </ul>
            </div>

            <div className="bg-[#080A12] p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">TOUCH & MOBILE</span>
              <ul className="text-slate-400 space-y-1">
                <li><strong className="text-slate-200">Virtual D-Pad:</strong> Directional touch</li>
                <li><strong className="text-slate-200">Swipe Gestures:</strong> Direct arena swiping</li>
                <li><strong className="text-slate-200">HUD Icons:</strong> Instant pause & restart</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Cyber Items & Power-ups */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#9865FF] mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#9865FF]" />
            Energy Nodes & Power-Ups
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#39FF14]/20 border border-[#39FF14] flex items-center justify-center shrink-0">
                <div className="w-3.5 h-3.5 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
              </div>
              <div>
                <span className="font-bold text-[#39FF14] block">Neon Core (+10 PTS)</span>
                <span className="text-[11px] text-slate-400">
                  Standard energy. Grows length by 1. Level increases every 5 eaten.
                </span>
              </div>
            </div>

            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF4FD8]/20 border border-[#FF4FD8] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#FF4FD8]" />
              </div>
              <div>
                <span className="font-bold text-[#FF4FD8] block">Bonus Star (+30 PTS)</span>
                <span className="text-[11px] text-slate-400">
                  Timed high-value core with countdown ring. Disappears if not captured!
                </span>
              </div>
            </div>

            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#43F5FF]/20 border border-[#43F5FF] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#43F5FF]" />
              </div>
              <div>
                <span className="font-bold text-[#43F5FF] block">Chrono Shift (+15 PTS)</span>
                <span className="text-[11px] text-slate-400">
                  Temporarily slows simulation down for 7.5 seconds for precision steering.
                </span>
              </div>
            </div>

            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#9865FF]/20 border border-[#9865FF] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-[#9865FF]" />
              </div>
              <div>
                <span className="font-bold text-[#9865FF] block">Aegis Shield (+15 PTS)</span>
                <span className="text-[11px] text-slate-400">
                  Protects against 1 fatal wall impact or self-collision!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Modes */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF4FD8] mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF4FD8]" />
            Arena Protocols
          </h3>
          <div className="space-y-2 text-xs">
            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#43F5FF]">CLASSIC: </span>
                <span className="text-slate-400">Solid walls. Reflex test with gradual speed ramp.</span>
              </div>
            </div>
            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#39FF14]">ZEN: </span>
                <span className="text-slate-400">Boundaries wrap around infinitely. Relaxed tempo.</span>
              </div>
            </div>
            <div className="bg-[#080A12] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#FF4FD8]">RUSH: </span>
                <span className="text-slate-400">High starting velocity, 1.5x bonus score multipliers.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider text-[#080A12] bg-[#43F5FF] hover:bg-[#74F7FF] transition-all cursor-pointer shadow-[0_0_15px_rgba(67,245,255,0.3)]"
        >
          READY FOR RUN
        </button>
      </div>
    </div>
  );
};
