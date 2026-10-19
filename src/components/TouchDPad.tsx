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
    <div className="pointer-events-auto touch-none select-none flex flex-col items-center justify-center p-2">
      {/* Up Button */}
      <button
        type="button"
        aria-label="Steer Up"
        onPointerDown={e => handlePress(e, 'UP')}
        className="w-14 h-14 rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <ArrowUp className="w-7 h-7" />
      </button>

      {/* Middle Row (Left, Center spacer, Right) */}
      <div className="flex items-center gap-3 my-1">
        <button
          type="button"
          aria-label="Steer Left"
          onPointerDown={e => handlePress(e, 'LEFT')}
          className="w-14 h-14 rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        {/* Center Accent Core */}
        <div className="w-10 h-10 rounded-full border border-slate-800 bg-[#080A12]/80 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#43F5FF]/50" />
        </div>

        <button
          type="button"
          aria-label="Steer Right"
          onPointerDown={e => handlePress(e, 'RIGHT')}
          className="w-14 h-14 rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>

      {/* Down Button */}
      <button
        type="button"
        aria-label="Steer Down"
        onPointerDown={e => handlePress(e, 'DOWN')}
        className="w-14 h-14 rounded-xl bg-[#101426]/90 border border-slate-700 active:border-[#43F5FF] active:bg-[#43F5FF]/20 text-slate-300 active:text-[#43F5FF] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <ArrowDown className="w-7 h-7" />
      </button>
    </div>
  );
};
