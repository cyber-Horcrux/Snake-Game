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

  // 1. Defensively validate and clamp dimensions between 10px and 2048px
  const safeWidth = Math.min(2048, Math.max(10, Math.floor(Number.isFinite(width) ? width : 200)));
  const safeHeight = Math.min(2048, Math.max(10, Math.floor(Number.isFinite(height) ? height : 110)));

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

    // Retina / High-DPI support with backing-store clamping
    const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const dpr = Number.isFinite(rawDpr) ? Math.min(3, Math.max(1, rawDpr)) : 1;

    const MAX_BACKING_DIMENSION = 4096;
    let internalWidth = Math.round(safeWidth * dpr);
    let internalHeight = Math.round(safeHeight * dpr);

    if (internalWidth > MAX_BACKING_DIMENSION || internalHeight > MAX_BACKING_DIMENSION) {
      const scaleDown = MAX_BACKING_DIMENSION / Math.max(internalWidth, internalHeight);
      internalWidth = Math.max(1, Math.floor(internalWidth * scaleDown));
      internalHeight = Math.max(1, Math.floor(internalHeight * scaleDown));
    }

    if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
      canvas.width = internalWidth;
      canvas.height = internalHeight;
    }

    const scaleX = internalWidth / safeWidth;
    const scaleY = internalHeight / safeHeight;

    const renderStaticFrame = (time: number = 0): boolean => {
      ctx.save();
      ctx.scale(scaleX, scaleY);
      try {
        const result = drawThemePreview(ctx, safeThemeId, {
          width: safeWidth,
          height: safeHeight,
          timeMs: time,
          showSpecimen: true,
        });
        return result.success;
      } catch {
        return false;
      } finally {
        ctx.restore();
      }
    };

    // Static single-pass render when animation is disabled
    if (!shouldAnimate) {
      renderStaticFrame(0);
      return;
    }

    // Dynamic lifecycle management: 30fps throttling, visibility & offscreen pausing, error containment
    let startTime: number | null = null;
    let lastFrameTime = 0;
    const TARGET_INTERVAL_MS = 32; // Throttle cosmetic preview animation to ~30 FPS
    let isRunning = true;
    let isIntersecting = true;
    let isDocumentVisible = typeof document === 'undefined' ? true : !document.hidden;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    const scheduleNextFrame = () => {
      if (!isRunning || !isIntersecting || !isDocumentVisible || consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return;
      }
      if (animationFrameRef.current === null) {
        animationFrameRef.current = safeRequestAnimationFrame(renderLoop);
      }
    };

    const cancelScheduledFrame = () => {
      if (animationFrameRef.current !== null) {
        safeCancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const renderLoop = (timestamp: number) => {
      animationFrameRef.current = null;
      if (!isRunning || !isIntersecting || !isDocumentVisible) return;

      // Throttle from 60/120fps to ~30fps for passive preview cards
      if (lastFrameTime !== 0 && timestamp - lastFrameTime < TARGET_INTERVAL_MS) {
        scheduleNextFrame();
        return;
      }

      lastFrameTime = timestamp;
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const success = renderStaticFrame(elapsed);
      if (!success) {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          // Permanently stop runaway animation loop on persistent error
          return;
        }
      } else {
        consecutiveErrors = 0;
      }

      scheduleNextFrame();
    };

    // 1. Initial draw and kick off loop
    scheduleNextFrame();

    // 2. Pause when document / tab is hidden
    const handleVisibilityChange = () => {
      isDocumentVisible = typeof document === 'undefined' ? true : !document.hidden;
      if (isDocumentVisible) {
        scheduleNextFrame();
      } else {
        cancelScheduledFrame();
      }
    };

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // 3. Pause when canvas is scrolled off-screen via IntersectionObserver
    let observer: IntersectionObserver | null = null;
    if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function') {
      try {
        observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (entry) {
            isIntersecting = entry.isIntersecting;
            if (isIntersecting) {
              scheduleNextFrame();
            } else {
              cancelScheduledFrame();
            }
          }
        }, { threshold: 0.05 });
        observer.observe(canvas);
      } catch {
        // Fallback: keep isIntersecting = true
      }
    }

    return () => {
      isRunning = false;
      cancelScheduledFrame();
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
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
