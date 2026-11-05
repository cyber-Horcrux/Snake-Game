import React from 'react';

// SVG Asset URLs exported from assets directory for standard img/link references
import logoMasterUrl from '../../assets/branding/logo-master.svg';
import logoSymbolUrl from '../../assets/branding/logo-symbol.svg';
import logoHorizontalUrl from '../../assets/branding/logo-horizontal.svg';
import logoAppIconUrl from '../../assets/branding/logo-app-icon.svg';
import logoMonochromeUrl from '../../assets/branding/logo-monochrome.svg';
import logoTransparentUrl from '../../assets/branding/logo-transparent.svg';
import logoLightBgUrl from '../../assets/branding/logo-light-bg.svg';

export type LogoVariant =
  | 'master'
  | 'symbol'
  | 'horizontal'
  | 'app-icon'
  | 'monochrome'
  | 'transparent'
  | 'light-bg';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The specific logo variant to display */
  variant?: LogoVariant;
  /** Predefined size token or 'custom' to use className/style */
  size?: LogoSize;
  /** Explicit width in pixels or CSS units */
  width?: number | string;
  /** Explicit height in pixels or CSS units */
  height?: number | string;
  /** Adds responsive neon glow bloom effect */
  glow?: boolean;
  /** Accessibility label for screen readers */
  alt?: string;
  /** Whether to animate slightly on hover */
  interactive?: boolean;
  /** Render mode: 'img' uses the static SVG file; 'inline' uses self-contained vector elements */
  renderMode?: 'img' | 'inline';
}

export const LOGO_ASSETS: Record<LogoVariant, string> = {
  'master': logoMasterUrl,
  'symbol': logoSymbolUrl,
  'horizontal': logoHorizontalUrl,
  'app-icon': logoAppIconUrl,
  'monochrome': logoMonochromeUrl,
  'transparent': logoTransparentUrl,
  'light-bg': logoLightBgUrl,
};

const SIZE_PRESETS: Record<LogoSize, { width: string; height: string }> = {
  xs: { width: '32px', height: '32px' },
  sm: { width: '48px', height: '48px' },
  md: { width: '80px', height: '80px' },
  lg: { width: '140px', height: '140px' },
  xl: { width: '220px', height: '220px' },
  '2xl': { width: '320px', height: '320px' },
  custom: { width: 'auto', height: 'auto' },
};

const ASPECT_RATIOS: Record<LogoVariant, string> = {
  master: '600 / 740',
  symbol: '512 / 512',
  horizontal: '760 / 180',
  'app-icon': '512 / 512',
  monochrome: '512 / 512',
  transparent: '600 / 680',
  'light-bg': '600 / 700',
};

/**
 * BrandLogo — Official Vector Branding Component for NEON SNAKE: ONE MORE RUN
 * Delivers crisp, scalable vector representation across all 7 official brand variants.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'symbol',
  size = 'md',
  width,
  height,
  glow = false,
  alt = 'NEON SNAKE — ONE MORE RUN',
  interactive = false,
  className = '',
  style,
  ...rest
}) => {
  const assetSrc = LOGO_ASSETS[variant] || LOGO_ASSETS.symbol;
  const sizePreset = SIZE_PRESETS[size];
  const aspectRatio = ASPECT_RATIOS[variant];

  const computedWidth = width ?? (size === 'custom' ? undefined : sizePreset.width);
  const computedHeight = height ?? (size === 'custom' ? undefined : (variant === 'horizontal' ? 'auto' : sizePreset.height));

  const containerClasses = [
    'inline-flex items-center justify-center select-none relative',
    interactive ? 'transition-transform duration-300 hover:scale-105 active:scale-95' : '',
    glow ? 'drop-shadow-[0_0_16px_rgba(0,245,255,0.45)]' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      style={{
        width: computedWidth,
        height: computedHeight,
        aspectRatio: computedWidth && !computedHeight ? aspectRatio : undefined,
        ...style,
      }}
      role="img"
      aria-label={alt}
      data-logo-variant={variant}
      {...rest}
    >
      <img
        src={assetSrc}
        alt={alt}
        className="w-full h-full object-contain pointer-events-none"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default BrandLogo;
