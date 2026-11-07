import React, { useEffect, useRef, useState } from 'react';
import type { SnakeSkinId, SnakeTrailId } from '../../game/types.ts';
import { drawTrailPreview } from '../../game/trail_preview.ts';
import { getTrailDefinition, isValidTrailId } from '../../game/trails.ts';

export interface TrailPreviewCanvasProps {
  /** The snake trail identifier to preview. */
  trailId: SnakeTrailId | string;
  /** Optional skin to render the snake body with. Default: 'cyber_cyan' */
  skinId?: SnakeSkinId | string;
  /** Width in CSS pixels. Default: 220 */
  width?: number;
  /** Height in CSS pixels. Default: 110 */
  height?: number;
  /** Whether the snake undulating wave animation is active. Default: true */
  animated?: boolean;
  /** Explicit override for reduced-motion. If true or OS prefers reduced motion, renders static. */
  reducedMotion?: boolean;
  /** Canvas backdrop styling: 'glow' (ambient neon wash), 'dark' (solid #080A12), or 'transparent'. Default: 'glow' */
  background?: 'glow' | 'dark' | 'transparent';
  /** Extra CSS classes for the canvas element */
  className?: string;
  /** Accessible label. Defaults to "Snake trail preview: [Trail Name]" */
  ariaLabel?: string;
  /** Click handler for interactive selection cards */
  onClick?: () => void;
}

function safeRequestAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
}

function safeCancelAnimationFrame(handle: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}

export const TrailPreviewCanvas: React.FC<TrailPreviewCanvasProps> = ({
  trailId,
  skinId = 'cyber_cyan',
  width = 220,
  height = 110,
  animated = true,
  reducedMotion,
  background = 'glow',
  className = '',
  ariaLabel,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const safeWidth = Math.max(10, Math.floor(width || 220));
  const safeHeight = Math.max(10, Math.floor(height || 110));

  const [osPrefersReducedMotion, setOsPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => {
      try {
        setOsPrefersReducedMotion(mediaQuery.matches);
      } catch {
        // Safe disposal fallback
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  const shouldAnimate = animated && !(reducedMotion ?? osPrefersReducedMotion);

  const safeTrailId = isValidTrailId(trailId) ? trailId : 'cyber_pulse';
  const trailDef = getTrailDefinition(safeTrailId);
  const computedAriaLabel = ariaLabel || `Snake trail preview: ${trailDef.name}`;
  const isInteractive = typeof onClick === 'function';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
    canvas.width = Math.round(safeWidth * dpr);
    canvas.height = Math.round(safeHeight * dpr);

    if (animationFrameRef.current !== null) {
      safeCancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const renderFrame = (timeMs: number) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      drawTrailPreview(ctx, safeTrailId, {
        width: safeWidth,
        height: safeHeight,
        timeMs,
        skinId: skinId as SnakeSkinId,
        background,
      });
      ctx.restore();
    };

    if (!shouldAnimate) {
      renderFrame(400);
      return;
    }

    let startTimestamp: number | null = null;
    let isCancelled = false;

    const loop = (timestamp: number) => {
      if (isCancelled) return;

      if (typeof document !== 'undefined' && document.hidden) {
        animationFrameRef.current = safeRequestAnimationFrame(loop);
        return;
      }

      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }
      const elapsed = timestamp - startTimestamp;
      renderFrame(elapsed);
      animationFrameRef.current = safeRequestAnimationFrame(loop);
    };

    animationFrameRef.current = safeRequestAnimationFrame(loop);

    return () => {
      isCancelled = true;
      if (animationFrameRef.current !== null) {
        safeCancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [safeTrailId, skinId, safeWidth, safeHeight, shouldAnimate, background]);

  return (
    <canvas
      ref={canvasRef}
      className={`inline-block select-none rounded-xl overflow-hidden ${
        isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00F5FF]' : ''
      } ${className}`}
      style={{
        width: `${safeWidth}px`,
        height: `${safeHeight}px`,
      }}
      role={isInteractive ? 'button' : 'img'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={computedAriaLabel}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    />
  );
};
