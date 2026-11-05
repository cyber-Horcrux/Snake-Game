import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Direction } from '../game/types.ts';

interface TouchDPadProps {
  onDirection: (dir: Direction) => void;
}

export const TouchDPad: React.FC<TouchDPadProps> = ({ onDirection }) => {
  const handlePress = (e: React.PointerEvent, dir: Direction) => {
    e.preventDefault();
    e.stopPropagation();
    onDirection(dir);
  };

  return (
    <div
      role="group"
      aria-label="Touch Directional Pad"
      className="pointer-events-auto touch-none select-none flex flex-col items-center justify-center p-1 sm:p-2"
    >
      {/* Up Button */}
      <button
        type="button"
        aria-label="Steer Up"
        onPointerDown={e => handlePress(e, 'UP')}
        className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 min-w-[44px] min-h-[44px] rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
      >
        <ArrowUp className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7" />
      </button>

      {/* Middle Row (Left, Center spacer, Right) */}
      <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 my-0.5 sm:my-1">
        <button
          type="button"
          aria-label="Steer Left"
          onPointerDown={e => handlePress(e, 'LEFT')}
          className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 min-w-[44px] min-h-[44px] rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Center Accent Core */}
        <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border border-slate-800 bg-[#080A12]/80 flex items-center justify-center">
          <div className="w-2 h-2 xs:w-2.5 xs:h-2.5 rounded-full bg-[#43F5FF]/50" />
        </div>

        <button
          type="button"
          aria-label="Steer Right"
          onPointerDown={e => handlePress(e, 'RIGHT')}
          className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 min-w-[44px] min-h-[44px] rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowRight className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7" />
        </button>
      </div>

      {/* Down Button */}
      <button
        type="button"
        aria-label="Steer Down"
        onPointerDown={e => handlePress(e, 'DOWN')}
        className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 min-w-[44px] min-h-[44px] rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
      >
        <ArrowDown className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7" />
      </button>
    </div>
  );
};
