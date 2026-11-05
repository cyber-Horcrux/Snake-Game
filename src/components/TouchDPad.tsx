import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Direction } from '../game/types.ts';

interface TouchDPadProps {
  onDirection: (dir: Direction) => void;
  isButtonsMode?: boolean;
}

export const TouchDPad: React.FC<TouchDPadProps> = ({ onDirection, isButtonsMode = false }) => {
  const handlePress = (e: React.PointerEvent, dir: Direction) => {
    e.preventDefault();
    e.stopPropagation();
    onDirection(dir);
  };

  const buttonSizeClass = isButtonsMode
    ? 'w-14 h-14 xs:w-16 xs:h-16 sm:w-[72px] sm:h-[72px] min-w-[56px] min-h-[56px] xs:min-w-[64px] xs:min-h-[64px] sm:min-w-[72px] sm:min-h-[72px] landscape:w-12 landscape:h-12 landscape:min-w-[48px] landscape:min-h-[48px]'
    : 'w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 min-w-[44px] min-h-[44px]';

  const iconSizeClass = isButtonsMode
    ? 'w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 landscape:w-6 landscape:h-6'
    : 'w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7';

  const coreSizeClass = isButtonsMode
    ? 'w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 landscape:w-8 landscape:h-8'
    : 'w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10';

  const dotSizeClass = isButtonsMode
    ? 'w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 landscape:w-2 landscape:h-2'
    : 'w-2 h-2 xs:w-2.5 xs:h-2.5';

  const gapClass = isButtonsMode
    ? 'gap-2 xs:gap-2.5 sm:gap-3.5 landscape:gap-1.5 my-1 sm:my-1.5 landscape:my-0.5'
    : 'gap-1.5 xs:gap-2 sm:gap-3 my-0.5 sm:my-1';

  return (
    <div
      role="group"
      aria-label="Touch Directional Pad"
      onContextMenu={e => e.preventDefault()}
      className="pointer-events-auto touch-none select-none flex flex-col items-center justify-center p-1 sm:p-2"
    >
      {/* Up Button */}
      <button
        type="button"
        aria-label="Steer Up"
        onPointerDown={e => handlePress(e, 'UP')}
        className={`${buttonSizeClass} rounded-xl bg-[#101426]/95 border ${
          isButtonsMode
            ? 'border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
            : 'border-slate-700 shadow-lg'
        } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_20px_rgba(67,245,255,0.4)]`}
      >
        <ArrowUp className={iconSizeClass} />
      </button>

      {/* Middle Row (Left, Center spacer, Right) */}
      <div className={`flex items-center ${gapClass}`}>
        <button
          type="button"
          aria-label="Steer Left"
          onPointerDown={e => handlePress(e, 'LEFT')}
          className={`${buttonSizeClass} rounded-xl bg-[#101426]/95 border ${
            isButtonsMode
              ? 'border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
              : 'border-slate-700 shadow-lg'
          } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_20px_rgba(67,245,255,0.4)]`}
        >
          <ArrowLeft className={iconSizeClass} />
        </button>

        {/* Center Accent Core */}
        <div
          className={`${coreSizeClass} rounded-full border border-slate-800 bg-[#080A12]/80 flex items-center justify-center shrink-0 shadow-inner`}
        >
          <div className={`${dotSizeClass} rounded-full bg-[#43F5FF]/60 shadow-[0_0_8px_rgba(67,245,255,0.8)]`} />
        </div>

        <button
          type="button"
          aria-label="Steer Right"
          onPointerDown={e => handlePress(e, 'RIGHT')}
          className={`${buttonSizeClass} rounded-xl bg-[#101426]/95 border ${
            isButtonsMode
              ? 'border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
              : 'border-slate-700 shadow-lg'
          } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_20px_rgba(67,245,255,0.4)]`}
        >
          <ArrowRight className={iconSizeClass} />
        </button>
      </div>

      {/* Down Button */}
      <button
        type="button"
        aria-label="Steer Down"
        onPointerDown={e => handlePress(e, 'DOWN')}
        className={`${buttonSizeClass} rounded-xl bg-[#101426]/95 border ${
          isButtonsMode
            ? 'border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
            : 'border-slate-700 shadow-lg'
        } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_20px_rgba(67,245,255,0.4)]`}
      >
        <ArrowDown className={iconSizeClass} />
      </button>
    </div>
  );
};
