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

  return (
    <div
      role="group"
      aria-label="Touch Directional Pad"
      onContextMenu={e => e.preventDefault()}
      className={`pointer-events-auto touch-none select-none flex flex-col items-center justify-center p-1 sm:p-2 touch-dpad-root ${
        isButtonsMode ? 'touch-dpad-buttons-mode' : ''
      }`}
    >
      {/* Up Button */}
      <button
        type="button"
        aria-label="Steer Up"
        onPointerDown={e => handlePress(e, 'UP')}
        style={{
          width: 'var(--dpad-btn)',
          height: 'var(--dpad-btn)',
          minWidth: 'var(--dpad-btn)',
          minHeight: 'var(--dpad-btn)',
        }}
        className={`rounded-2xl bg-[#101426]/95 border ${
          isButtonsMode
            ? 'border-slate-700/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
            : 'border-slate-700 shadow-lg'
        } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_24px_rgba(67,245,255,0.45)]`}
      >
        <ArrowUp
          style={{ width: 'var(--dpad-icon)', height: 'var(--dpad-icon)' }}
          className="shrink-0"
        />
      </button>

      {/* Middle Row (Left, Center spacer, Right) */}
      <div
        style={{
          gap: 'var(--dpad-gap)',
          marginTop: 'var(--dpad-gap)',
          marginBottom: 'var(--dpad-gap)',
        }}
        className="flex items-center"
      >
        <button
          type="button"
          aria-label="Steer Left"
          onPointerDown={e => handlePress(e, 'LEFT')}
          style={{
            width: 'var(--dpad-btn)',
            height: 'var(--dpad-btn)',
            minWidth: 'var(--dpad-btn)',
            minHeight: 'var(--dpad-btn)',
          }}
          className={`rounded-2xl bg-[#101426]/95 border ${
            isButtonsMode
              ? 'border-slate-700/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
              : 'border-slate-700 shadow-lg'
          } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_24px_rgba(67,245,255,0.45)]`}
        >
          <ArrowLeft
            style={{ width: 'var(--dpad-icon)', height: 'var(--dpad-icon)' }}
            className="shrink-0"
          />
        </button>

        {/* Center Accent Core */}
        <div
          style={{
            width: 'var(--dpad-core)',
            height: 'var(--dpad-core)',
          }}
          className="rounded-full border border-slate-800 bg-[#080A12]/85 flex items-center justify-center shrink-0 shadow-inner"
        >
          <div
            style={{
              width: 'var(--dpad-dot)',
              height: 'var(--dpad-dot)',
            }}
            className="rounded-full bg-[#43F5FF]/70 shadow-[0_0_10px_rgba(67,245,255,0.9)]"
          />
        </div>

        <button
          type="button"
          aria-label="Steer Right"
          onPointerDown={e => handlePress(e, 'RIGHT')}
          style={{
            width: 'var(--dpad-btn)',
            height: 'var(--dpad-btn)',
            minWidth: 'var(--dpad-btn)',
            minHeight: 'var(--dpad-btn)',
          }}
          className={`rounded-2xl bg-[#101426]/95 border ${
            isButtonsMode
              ? 'border-slate-700/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
              : 'border-slate-700 shadow-lg'
          } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_24px_rgba(67,245,255,0.45)]`}
        >
          <ArrowRight
            style={{ width: 'var(--dpad-icon)', height: 'var(--dpad-icon)' }}
            className="shrink-0"
          />
        </button>
      </div>

      {/* Down Button */}
      <button
        type="button"
        aria-label="Steer Down"
        onPointerDown={e => handlePress(e, 'DOWN')}
        style={{
          width: 'var(--dpad-btn)',
          height: 'var(--dpad-btn)',
          minWidth: 'var(--dpad-btn)',
          minHeight: 'var(--dpad-btn)',
        }}
        className={`rounded-2xl bg-[#101426]/95 border ${
          isButtonsMode
            ? 'border-slate-700/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
            : 'border-slate-700 shadow-lg'
        } active:border-[#43F5FF] active:bg-[#43F5FF]/25 text-slate-200 active:text-[#43F5FF] flex items-center justify-center active:scale-95 transition-all cursor-pointer select-none touch-none active:shadow-[0_0_24px_rgba(67,245,255,0.45)]`}
      >
        <ArrowDown
          style={{ width: 'var(--dpad-icon)', height: 'var(--dpad-icon)' }}
          className="shrink-0"
        />
      </button>
    </div>
  );
};
