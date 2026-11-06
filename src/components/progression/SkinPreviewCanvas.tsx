import React, { useEffect, useRef, useState } from 'react';
import type { SnakeSkinId } from '../../game/types.ts';
import { drawSkinPreview } from '../../game/skin_preview.ts';
import { getSkinDefinition, isValidSkinId } from '../../game/skins.ts';

export interface SkinPreviewCanvasProps {
  /** The snake skin identifier to preview. Invalid IDs safely fallback to Cyber Cyan. */
  skinId: SnakeSkinId | string;
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
  /** Accessible label. Defaults to "Snake skin preview: [Skin Name]" */
  ariaLabel?: string;
  /** Click handler for interactive selection cards */
  onClick?: () => void;
}

// Resilient RAF / timer wrappers for SSR, testing and legacy WebView environments
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

export const SkinPreviewCanvas: React.FC<SkinPreviewCanvasProps> = ({
  skinId,
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

  // Clamp logical dimensions defensively against zero/negative sizing
  const safeWidth = Math.max(10, Math.floor(width || 220));
  const safeHeight = Math.max(10, Math.floor(height || 110));

  // Detect OS prefers-reduced-motion preference safely
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
        // Fallback gracefully if event target was disposed
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

  // Authoritative skin resolution for accessible labeling
  const safeSkinId = isValidSkinId(skinId) ? skinId : 'cyber_cyan';
  const skinDef = getSkinDefinition(safeSkinId);
  const computedAriaLabel = ariaLabel || `Snake skin preview: ${skinDef.name}`;
  const isInteractive = typeof onClick === 'function';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI screen pixel ratio scaling
    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
    canvas.width = Math.round(safeWidth * dpr);
    canvas.height = Math.round(safeHeight * dpr);

    // Cancel any existing animation frame to prevent duplicate loops
    if (animationFrameRef.current !== null) {
      safeCancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const renderFrame = (timeMs: number) => {
      ctx.save();
      // Scale coordinates so all drawing operations use logical CSS pixels
      ctx.scale(dpr, dpr);
      drawSkinPreview(ctx, safeSkinId, {
        width: safeWidth,
        height: safeHeight,
        timeMs,
        background,
      });
      ctx.restore();
    };

    if (!shouldAnimate) {
      // Draw a static, aesthetically balanced S-curve frame (timeMs = 400ms)
      renderFrame(400);
      return;
    }

    let startTimestamp: number | null = null;
    let isCancelled = false;

    const loop = (timestamp: number) => {
      if (isCancelled) return;

      // Pause rendering calculations if the document is hidden
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
  }, [safeSkinId, safeWidth, safeHeight, shouldAnimate, background]);

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
