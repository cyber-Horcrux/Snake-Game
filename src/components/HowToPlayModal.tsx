import React from 'react';
import { X, Shield, Clock, Sparkles } from 'lucide-react';
import { BrandLogo } from './branding/BrandLogo.tsx';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-2 xs:p-3 sm:p-6 bg-[#05070E]/90 backdrop-blur-sm overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-xl max-h-[calc(100dvh-1.5rem)] bg-[#0B0E1A] border border-[#00F5FF]/40 rounded-2xl shadow-[0_0_35px_rgba(0,245,255,0.2)] flex flex-col relative my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 flex items-center justify-between border-b border-[#161B2E] shrink-0 bg-[#0B0E1A]">
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
                TACTICAL MANUAL
              </h2>
              <p className="text-[10px] sm:text-xs text-[#79869C] font-mono tracking-wider mt-1 font-semibold">
                NEON SNAKE OPERATING PROTOCOL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close How to Play"
            className="p-1.5 sm:p-2 rounded-xl bg-[#05070E] border border-[#161B2E] text-[#79869C] hover:text-[#F0F6FC] hover:border-[#00F5FF]/60 transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 flex-1">
          {/* Section 1: Controls */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#00F5FF] mb-2 sm:mb-3 flex items-center gap-2 font-display">
              <span className="w-2 h-2 rounded-full bg-[#00F5FF]" />
              Control Directives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div className="bg-[#05070E] p-3 sm:p-3.5 rounded-xl border border-[#161B2E]">
                <span className="font-bold text-[#F0F6FC] block mb-1.5 font-display tracking-wider text-[11px] sm:text-xs">
                  DESKTOP / KEYBOARD
                </span>
                <ul className="text-[#79869C] space-y-1.5">
                  <li><strong className="text-[#F0F6FC]">WASD / Arrow Keys:</strong> Steer snake</li>
                  <li><strong className="text-[#F0F6FC]">Space / Escape:</strong> Pause & Resume</li>
                  <li><strong className="text-[#F0F6FC]">R:</strong> Instant run restart</li>
                  <li><strong className="text-[#F0F6FC]">M:</strong> Mute / Unmute Audio</li>
                </ul>
              </div>

              <div className="bg-[#05070E] p-3 sm:p-3.5 rounded-xl border border-[#161B2E]">
                <span className="font-bold text-[#F0F6FC] block mb-1.5 font-display tracking-wider text-[11px] sm:text-xs">
                  TOUCH & MOBILE
                </span>
                <ul className="text-[#79869C] space-y-1.5">
                  <li><strong className="text-[#F0F6FC]">Swipe Gestures:</strong> Direct arena drag/flick</li>
                  <li><strong className="text-[#F0F6FC]">Virtual D-Pad:</strong> Directional touch buttons</li>
                  <li><strong className="text-[#F0F6FC]">Control Modes:</strong> Swipe, Buttons, or Both in Settings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: Cyber Items & Power-ups */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#7928CA] mb-2 sm:mb-3 flex items-center gap-2 font-display">
              <span className="w-2 h-2 rounded-full bg-[#7928CA]" />
              Energy Nodes & Power-Ups
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 text-xs">
              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#10FFA0]/15 border border-[#10FFA0] flex items-center justify-center shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#10FFA0] shadow-[0_0_8px_#10FFA0]" />
                </div>
                <div>
                  <span className="font-bold text-[#10FFA0] block font-display">Neon Core (+10 PTS)</span>
                  <span className="text-[11px] text-[#79869C] leading-snug">
                    Standard energy. Grows length by 1. Level increases every 5 eaten.
                  </span>
                </div>
              </div>

              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF007A]/15 border border-[#FF007A] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#FF007A]" />
                </div>
                <div>
                  <span className="font-bold text-[#FF007A] block font-display">Bonus Star (+30 PTS)</span>
                  <span className="text-[11px] text-[#79869C] leading-snug">
                    Timed high-value core with countdown ring. Disappears if not captured!
                  </span>
                </div>
              </div>

              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00F5FF]/15 border border-[#00F5FF] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#00F5FF]" />
                </div>
                <div>
                  <span className="font-bold text-[#00F5FF] block font-display">Chrono Shift (+15 PTS)</span>
                  <span className="text-[11px] text-[#79869C] leading-snug">
                    Temporarily slows simulation down for 7.5s for precision steering.
                  </span>
                </div>
              </div>

              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#7928CA]/20 border border-[#7928CA] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-[#7928CA]" />
                </div>
                <div>
                  <span className="font-bold text-[#7928CA] block font-display">Aegis Shield (+15 PTS)</span>
                  <span className="text-[11px] text-[#79869C] leading-snug">
                    Absorbs 1 fatal wall impact or self-collision and keeps run alive!
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Modes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF007A] mb-2 sm:mb-3 flex items-center gap-2 font-display">
              <span className="w-2 h-2 rounded-full bg-[#FF007A]" />
              Arena Protocols
            </h3>
            <div className="space-y-2 text-xs">
              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#00F5FF] font-display">CLASSIC: </span>
                  <span className="text-[#79869C]">Solid walls. Reflex test with gradual speed ramp.</span>
                </div>
              </div>
              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#10FFA0] font-display">ZEN: </span>
                  <span className="text-[#79869C]">Boundaries wrap around infinitely. Relaxed tempo.</span>
                </div>
              </div>
              <div className="bg-[#05070E] p-2.5 sm:p-3 rounded-xl border border-[#161B2E] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#FF007A] font-display">RUSH: </span>
                  <span className="text-[#79869C]">High starting velocity, 1.5x bonus score multipliers.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[#0B0E1A] border-t border-[#161B2E] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3.5 rounded-xl font-display font-black text-xs sm:text-sm tracking-wider text-[#05070E] bg-[#00F5FF] hover:bg-[#38E1FF] transition-all cursor-pointer shadow-[0_0_18px_rgba(0,245,255,0.35)] active:scale-98"
          >
            READY FOR RUN
          </button>
        </div>
      </div>
    </div>
  );
};
