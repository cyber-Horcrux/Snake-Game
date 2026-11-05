import React from 'react';
import { X, ArrowRight, Shield, Clock, Sparkles, Award } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#080A12]/90 backdrop-blur-sm overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-xl max-h-[calc(100dvh-1.5rem)] bg-[#101426] border border-[#43F5FF]/40 rounded-2xl shadow-[0_0_35px_rgba(67,245,255,0.2)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 flex items-center justify-between border-b border-slate-800/80 shrink-0 bg-[#101426]">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-wider text-white neon-glow-cyan leading-none">
              TACTICAL MANUAL
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider mt-1">
              NEON SNAKE OPERATING PROTOCOL
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close How to Play"
            className="p-1.5 sm:p-2 rounded-lg bg-[#080A12] border border-slate-700 text-slate-400 hover:text-white hover:border-[#43F5FF] transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 flex-1">
          {/* Section 1: Controls */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#43F5FF] mb-2 sm:mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#43F5FF]" />
              Control Directives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div className="bg-[#080A12] p-2.5 sm:p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">DESKTOP / KEYBOARD</span>
                <ul className="text-slate-400 space-y-1">
                  <li><strong className="text-slate-200">WASD / Arrow Keys:</strong> Steer</li>
                  <li><strong className="text-slate-200">Space / Escape:</strong> Pause & Resume</li>
                  <li><strong className="text-slate-200">R:</strong> Instant Restart</li>
                  <li><strong className="text-slate-200">M:</strong> Mute / Unmute Sound</li>
                </ul>
              </div>

              <div className="bg-[#080A12] p-2.5 sm:p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">TOUCH & MOBILE</span>
                <ul className="text-slate-400 space-y-1">
                  <li><strong className="text-slate-200">Swipe Gestures:</strong> Direct arena swiping</li>
                  <li><strong className="text-slate-200">Virtual D-Pad:</strong> Directional touch buttons</li>
                  <li><strong className="text-slate-200">Control Modes:</strong> Swipe, Buttons, or Both in Settings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: Cyber Items & Power-ups */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9865FF] mb-2 sm:mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#9865FF]" />
              Energy Nodes & Power-Ups
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 text-xs">
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
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF4FD8] mb-2 sm:mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF4FD8]" />
              Arena Protocols
            </h3>
            <div className="space-y-1.5 sm:space-y-2 text-xs">
              <div className="bg-[#080A12] p-2 sm:p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#43F5FF]">CLASSIC: </span>
                  <span className="text-slate-400">Solid walls. Reflex test with gradual speed ramp.</span>
                </div>
              </div>
              <div className="bg-[#080A12] p-2 sm:p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#39FF14]">ZEN: </span>
                  <span className="text-slate-400">Boundaries wrap around infinitely. Relaxed tempo.</span>
                </div>
              </div>
              <div className="bg-[#080A12] p-2 sm:p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#FF4FD8]">RUSH: </span>
                  <span className="text-slate-400">High starting velocity, 1.5x bonus score multipliers.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#101426] border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 rounded-xl font-display font-bold text-xs sm:text-sm tracking-wider text-[#080A12] bg-[#43F5FF] hover:bg-[#74F7FF] transition-all cursor-pointer shadow-[0_0_15px_rgba(67,245,255,0.3)] active:scale-98"
          >
            READY FOR RUN
          </button>
        </div>
      </div>
    </div>
  );
};
