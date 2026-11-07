import React, { useEffect, useRef, useState } from 'react';
import type { BoardThemeId } from '../../game/types.ts';
import { drawThemePreview } from '../../game/theme_preview.ts';
import { getThemeDefinition, isValidThemeId } from '../../game/themes.ts';

export interface BoardThemePreviewCanvasProps {
  /** The board theme identifier to preview. */
  themeId: BoardThemeId | string;
  /** Width in CSS pixels. Default: 200 */
  width?: number;
  /** Height in CSS pixels. Default: 110 */
  height?: number;
  /** Whether the miniature specimen food pulse animation is active. Default: true */
  animated?: boolean;
  /** Explicit override for reduced-motion. If true or OS prefers reduced motion, renders static. */
  reducedMotion?: boolean;
  /** Extra CSS classes for the canvas element */
  className?: string;
  /** Accessible label. Defaults to "Board theme preview: [Theme Name]" */
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

export const BoardThemePreviewCanvas: React.FC<BoardThemePreviewCanvasProps> = ({
  themeId,
  width = 200,
  height = 110,
  animated = true,
  reducedMotion,
  className = '',
  ariaLabel,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const safeWidth = Math.max(10, Math.floor(width || 200));
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

  const safeThemeId: BoardThemeId = isValidThemeId(themeId) ? themeId : 'obsidian_grid';
  const themeDef = getThemeDefinition(safeThemeId);
  const computedAriaLabel = ariaLabel || `Board theme preview: ${themeDef.name}`;
  const isInteractive = typeof onClick === 'function';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina / High-DPI support
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const internalWidth = Math.round(safeWidth * dpr);
    const internalHeight = Math.round(safeHeight * dpr);

    if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
      canvas.width = internalWidth;
      canvas.height = internalHeight;
    }

    // Static single-pass render when animation is disabled
    if (!shouldAnimate) {
      ctx.save();
      ctx.scale(dpr, dpr);
      drawThemePreview(ctx, safeThemeId, {
        width: safeWidth,
        height: safeHeight,
        timeMs: 0,
        showSpecimen: true,
      });
      ctx.restore();
      return;
    }

    // Continuous 60fps loop with frame time
    let startTime: number | null = null;
    let isRunning = true;

    const renderLoop = (timestamp: number) => {
      if (!isRunning) return;

      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.save();
      ctx.scale(dpr, dpr);
      drawThemePreview(ctx, safeThemeId, {
        width: safeWidth,
        height: safeHeight,
        timeMs: elapsed,
        showSpecimen: true,
      });
      ctx.restore();

      animationFrameRef.current = safeRequestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = safeRequestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current !== null) {
        safeCancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [safeThemeId, safeWidth, safeHeight, shouldAnimate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${safeWidth}px`,
        height: `${safeHeight}px`,
        display: 'block',
      }}
      className={`rounded-lg transition-transform ${isInteractive ? 'cursor-pointer hover:scale-[1.02]' : ''} ${className}`}
      onClick={onClick}
      role={isInteractive ? 'button' : 'img'}
      tabIndex={isInteractive ? 0 : -1}
      aria-label={computedAriaLabel}
      onKeyDown={e => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
};
