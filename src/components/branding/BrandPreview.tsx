import React, { useState } from 'react';
import { BrandLogo, LOGO_ASSETS, type LogoVariant } from './BrandLogo';

interface BrandPreviewProps {
  onClose?: () => void;
}

interface LogoCardInfo {
  variant: LogoVariant;
  filename: string;
  name: string;
  description: string;
  dimensions: string;
  isLightBg?: boolean;
}

const LOGO_CARDS: LogoCardInfo[] = [
  {
    variant: 'master',
    filename: 'logo-master.svg',
    name: 'Primary Master Logo',
    description: 'Hero lockup with Apex Viper emblem, NEON SNAKE wordmark, and [ ── ONE MORE RUN ── ] tagline bracket.',
    dimensions: '600 × 740 px',
  },
  {
    variant: 'symbol',
    filename: 'logo-symbol.svg',
    name: 'Standalone Snake Emblem',
    description: 'Precision-faceted Apex Viper predator crest with kinetic spine, optical eye sensors, and venom fangs.',
    dimensions: '512 × 512 px',
  },
  {
    variant: 'horizontal',
    filename: 'logo-horizontal.svg',
    name: 'Horizontal Logo & Wordmark',
    description: 'Wide composition engineered for navigation headers, in-game top HUD banners, and desktop title bars.',
    dimensions: '760 × 180 px',
  },
  {
    variant: 'app-icon',
    filename: 'logo-app-icon.svg',
    name: 'Compact App Icon',
    description: 'Rounded obsidian canvas with 72% safe-zone margin protecting against Android circle/squircle masks.',
    dimensions: '512 × 512 px',
  },
  {
    variant: 'monochrome',
    filename: 'logo-monochrome.svg',
    name: 'Monochrome Vector Mark',
    description: 'Single-color 100% vector silhouette with geometric negative-space cutouts for stamps, masks, and laser etching.',
    dimensions: '512 × 512 px',
  },
  {
    variant: 'transparent',
    filename: 'logo-transparent.svg',
    name: 'Transparent Master Lockup',
    description: 'Full master lockup with zero background fill, engineered for seamless compositing over dark canvas or video.',
    dimensions: '600 × 680 px',
  },
  {
    variant: 'light-bg',
    filename: 'logo-light-bg.svg',
    name: 'Light-Background Variant',
    description: 'High-contrast variant calibrated for white and light surfaces, featuring deep aerospace slate and electric teal.',
    dimensions: '600 × 700 px',
    isLightBg: true,
  },
];

export const BrandPreview: React.FC<BrandPreviewProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'scales' | 'contrast'>('all');
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [monochromeInvert, setMonochromeInvert] = useState(false);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05070E] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Cyber Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#080C1A]/95 backdrop-blur-md border-b border-[#1E294B] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-[#00F5FF]/40 flex items-center justify-center p-1 shadow-[0_0_10px_rgba(0,245,255,0.3)]">
            <img src={LOGO_ASSETS.symbol} alt="Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm sm:text-base tracking-wider text-white">
                <span className="text-[#00F5FF]">NEON SNAKE</span> BRAND SUITE
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/30">
                Phase 2 · 7 Variants
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              The Apex Cyber-Viper · ONE MORE RUN
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Navigation Filter Tabs */}
          <div className="flex items-center bg-[#0F172A] rounded-lg p-0.5 border border-[#1E294B] text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#00F5FF]/20 text-[#00F5FF] font-semibold border border-[#00F5FF]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gallery (7)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scales')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'scales'
                  ? 'bg-[#00F5FF]/20 text-[#00F5FF] font-semibold border border-[#00F5FF]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scale Tests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contrast')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'contrast'
                  ? 'bg-[#00F5FF]/20 text-[#00F5FF] font-semibold border border-[#00F5FF]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark vs Light
            </button>
          </div>

          {/* Glow Effect Toggle */}
          <button
            type="button"
            onClick={() => setGlowEnabled(!glowEnabled)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
              glowEnabled
                ? 'bg-[#FF007A]/15 text-[#FF70BA] border-[#FF007A]/40 shadow-[0_0_10px_rgba(255,0,122,0.25)]'
                : 'bg-[#0F172A] text-slate-400 border-[#1E294B]'
            }`}
          >
            {glowEnabled ? '⚡ Glow ON' : '○ Glow OFF'}
          </button>

          {/* Return to Game Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00F5FF] to-[#00A3FF] text-[#05070E] font-display font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)] flex items-center gap-1.5"
            >
              <span>✕</span>
              <span>Return to Game</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Intro Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0B1024] via-[#0E1530] to-[#0B1024] border border-[#1E294B] p-5 sm:p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F5FF]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#10FFA0] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest text-[#10FFA0] uppercase">
                  Verified Vector Suite · Concept 1 Approved
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black tracking-wide text-white">
                THE APEX CYBER-VIPER IDENTITY
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl font-sans">
                Reviewing all seven official vector logo variants in real time. Scalable, self-contained SVG assets designed to anchor NEON SNAKE across Android mobile, web, and marketing touchpoints.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={LOGO_ASSETS.master}
                download="neon-snake-logo-master.svg"
                className="px-3 py-2 rounded-lg bg-[#0F172A] border border-[#1E294B] text-xs font-mono text-slate-300 hover:text-white hover:border-[#00F5FF]/40 transition-colors flex items-center gap-1.5"
              >
                <span>↓</span> Master SVG
              </a>
              <a
                href={LOGO_ASSETS.symbol}
                download="neon-snake-logo-symbol.svg"
                className="px-3 py-2 rounded-lg bg-[#0F172A] border border-[#1E294B] text-xs font-mono text-slate-300 hover:text-white hover:border-[#00F5FF]/40 transition-colors flex items-center gap-1.5"
              >
                <span>↓</span> Symbol SVG
              </a>
            </div>
          </div>
        </div>

        {/* TAB 1: ALL SEVEN VARIANTS GALLERY */}
        {(activeTab === 'all' || activeTab === 'contrast') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-white tracking-wide flex items-center gap-2">
                <span className="text-[#00F5FF]">01 //</span> ALL SEVEN LOGO VARIANTS
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Directory: <code className="text-[#00F5FF]">src/assets/branding/</code>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LOGO_CARDS.map(card => {
                const isLight = card.isLightBg;
                const isMono = card.variant === 'monochrome';
                const isTrans = card.variant === 'transparent';

                return (
                  <div
                    key={card.variant}
                    className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 hover:border-[#00F5FF]/50 shadow-xl ${
                      isLight
                        ? 'bg-[#F8FAFC] border-slate-300 text-slate-900 shadow-[0_4px_24px_rgba(255,255,255,0.08)]'
                        : 'bg-[#090D1C] border-[#182342] text-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
                    }`}
                  >
                    {/* Card Header & Metadata */}
                    <div
                      className={`p-4 border-b flex items-start justify-between gap-2 ${
                        isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0B1124] border-[#151F3B]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                              isLight
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/30'
                            }`}
                          >
                            variant: {card.variant}
                          </span>
                          <span
                            className={`text-[11px] font-mono ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {card.dimensions}
                          </span>
                        </div>
                        <h3
                          className={`font-display font-black text-base mt-1.5 ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {card.name}
                        </h3>
                      </div>

                      <a
                        href={LOGO_ASSETS[card.variant]}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                          isLight
                            ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            : 'bg-[#0F172A] border border-[#1E294B] text-slate-300 hover:text-white'
                        }`}
                        title="Open raw SVG in new tab"
                      >
                        SVG ↗
                      </a>
                    </div>

                    {/* Visual Preview Canvas Frame */}
                    <div
                      className={`flex-1 min-h-[260px] p-6 flex items-center justify-center relative ${
                        isLight
                          ? 'bg-white'
                          : isTrans
                          ? 'bg-[#080B18] bg-[radial-gradient(#152042_1px,transparent_1px)] [background-size:16px_16px]'
                          : isMono && monochromeInvert
                          ? 'bg-white'
                          : 'bg-[#060914]'
                      }`}
                    >
                      {/* Interactive Checkerboard Indicator for Transparent variant */}
                      {isTrans && (
                        <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                          Alpha Transparent
                        </div>
                      )}

                      {/* Monochrome Inversion Toggle on Card */}
                      {isMono && (
                        <button
                          type="button"
                          onClick={() => setMonochromeInvert(!monochromeInvert)}
                          className="absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:text-white"
                        >
                          {monochromeInvert ? 'View on Dark' : 'View on White'}
                        </button>
                      )}

                      {/* The Actual Scalable Vector Logo */}
                      <div
                        className={`w-full max-h-[240px] flex items-center justify-center ${
                          glowEnabled && !isLight && !isMono
                            ? 'drop-shadow-[0_0_18px_rgba(0,245,255,0.35)]'
                            : ''
                        }`}
                      >
                        <BrandLogo
                          variant={card.variant}
                          size="custom"
                          className="w-full max-h-[220px]"
                          style={{
                            filter:
                              isMono && monochromeInvert
                                ? 'invert(1) brightness(0)'
                                : undefined,
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Footer: Filename & Description */}
                    <div
                      className={`p-4 border-t text-xs ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B1124] border-[#151F3B]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            isLight ? 'text-indigo-600' : 'text-[#00F5FF]'
                          }`}
                        >
                          {card.filename}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            isLight ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          SVG Vector
                        </span>
                      </div>
                      <p
                        className={`text-[11px] leading-relaxed ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: SCALE TESTS (APP ICON & STANDALONE SYMBOL) */}
        {(activeTab === 'all' || activeTab === 'scales') && (
          <div className="space-y-8">
            {/* App Icon Multi-Density Verification (512px, 128px, 64px, 32px) */}
            <section className="rounded-2xl bg-[#090D1C] border border-[#182342] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-display font-bold text-lg text-white tracking-wide flex items-center gap-2">
                    <span className="text-[#00F5FF]">02 //</span> APP ICON MULTI-DENSITY SCALING
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Testing <code className="text-[#00F5FF]">logo-app-icon.svg</code> at mandatory Android and Web display sizes
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
                  ✓ Safe-Area Verified
                </span>
              </div>

              <div className="bg-[#05070E] rounded-xl p-6 border border-[#151F3B] flex flex-wrap items-end justify-around gap-8">
                {/* 512px (Master Google Play Store Icon) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-3xl bg-[#080C1A] border border-[#1E294B] p-2 flex items-center justify-center shadow-[0_0_30px_rgba(0,245,255,0.2)]">
                    <BrandLogo variant="app-icon" size="custom" className="w-full h-full" glow={glowEnabled} />
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-xs font-bold text-white block">512 × 512 px</span>
                    <span className="text-[10px] text-slate-400">Master Play Store Asset</span>
                  </div>
                </div>

                {/* 128px (High-Density Tablet / Desktop Icon) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[128px] h-[128px] rounded-2xl bg-[#080C1A] border border-[#1E294B] p-1.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.15)]">
                    <BrandLogo variant="app-icon" size="custom" className="w-full h-full" />
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-xs font-bold text-white block">128 × 128 px</span>
                    <span className="text-[10px] text-slate-400">xxhdpi Launcher</span>
                  </div>
                </div>

                {/* 64px (Mobile Home Screen Standard) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[64px] h-[64px] rounded-xl bg-[#080C1A] border border-[#1E294B] p-1 flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.1)]">
                    <BrandLogo variant="app-icon" size="custom" className="w-full h-full" />
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-xs font-bold text-white block">64 × 64 px</span>
                    <span className="text-[10px] text-slate-400">mdpi Launcher</span>
                  </div>
                </div>

                {/* 32px (Notification & Browser Tab Favicon) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[32px] h-[32px] rounded-lg bg-[#080C1A] border border-[#1E294B] p-0.5 flex items-center justify-center">
                    <BrandLogo variant="app-icon" size="custom" className="w-full h-full" />
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-xs font-bold text-white block">32 × 32 px</span>
                    <span className="text-[10px] text-slate-400">Favicon / Tray</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Standalone Symbol Multi-Scale Verification (256px, 128px, 64px, 32px, 16px) */}
            <section className="rounded-2xl bg-[#090D1C] border border-[#182342] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-display font-bold text-lg text-white tracking-wide flex items-center gap-2">
                    <span className="text-[#00F5FF]">03 //</span> STANDALONE SYMBOL MULTI-SCALE LEGIBILITY
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Testing <code className="text-[#00F5FF]">logo-symbol.svg</code> from hero mark down to 16px micro-icon
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#00F5FF] bg-[#00F5FF]/10 border border-[#00F5FF]/30 px-2 py-1 rounded">
                  Predator Fangs & Brow Preserved
                </span>
              </div>

              <div className="bg-[#05070E] rounded-xl p-6 border border-[#151F3B] flex flex-wrap items-end justify-around gap-6">
                {/* 200px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] flex items-center justify-center">
                    <BrandLogo variant="symbol" size="custom" className="w-full h-full" glow={glowEnabled} />
                  </div>
                  <span className="text-xs font-mono font-bold text-white">200 px Hero</span>
                </div>

                {/* 128px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[128px] h-[128px] flex items-center justify-center">
                    <BrandLogo variant="symbol" size="custom" className="w-full h-full" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white">128 px Modal</span>
                </div>

                {/* 64px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[64px] h-[64px] flex items-center justify-center">
                    <BrandLogo variant="symbol" size="custom" className="w-full h-full" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white">64 px HUD</span>
                </div>

                {/* 32px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[32px] h-[32px] flex items-center justify-center">
                    <BrandLogo variant="symbol" size="custom" className="w-full h-full" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white">32 px Badge</span>
                </div>

                {/* 16px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[16px] h-[16px] flex items-center justify-center">
                    <BrandLogo variant="symbol" size="custom" className="w-full h-full" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white">16 px Favicon</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: DARK VS LIGHT COMPARISON */}
        {(activeTab === 'all' || activeTab === 'contrast') && (
          <section className="rounded-2xl bg-[#090D1C] border border-[#182342] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-white tracking-wide flex items-center gap-2">
                <span className="text-[#00F5FF]">04 //</span> DARK VS LIGHT SURFACE SIDE-BY-SIDE
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Independent Tuning for High Contrast
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dark Surface Container */}
              <div className="rounded-xl bg-[#05070E] border border-[#1E294B] p-6 flex flex-col items-center justify-between gap-4">
                <div className="w-full flex items-center justify-between font-mono text-xs text-slate-400">
                  <span className="text-[#00F5FF]">DARK MODE SURFACE (#05070E)</span>
                  <span>logo-transparent.svg</span>
                </div>
                <div className="w-full py-4 flex items-center justify-center">
                  <BrandLogo variant="transparent" size="custom" className="w-full max-w-[340px]" glow={glowEnabled} />
                </div>
                <p className="text-[11px] text-slate-400 font-mono text-center">
                  Electric Cyan (#00F5FF), Plasma Purple (#7928CA), and Hot Magenta Optics
                </p>
              </div>

              {/* Light Surface Container */}
              <div className="rounded-xl bg-white border border-slate-300 p-6 flex flex-col items-center justify-between gap-4 shadow-lg text-slate-900">
                <div className="w-full flex items-center justify-between font-mono text-xs text-slate-600">
                  <span className="text-indigo-600 font-bold">LIGHT MODE SURFACE (#FFFFFF)</span>
                  <span>logo-light-bg.svg</span>
                </div>
                <div className="w-full py-4 flex items-center justify-center">
                  <BrandLogo variant="light-bg" size="custom" className="w-full max-w-[340px]" />
                </div>
                <p className="text-[11px] text-slate-600 font-mono text-center">
                  Deep Obsidian (#0A0E1A), Electric Teal (#008B99), and Hot Crimson Optics
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-[#080C1A] border-t border-[#1E294B] p-4 text-center text-xs font-mono text-slate-500">
        NEON SNAKE: ONE MORE RUN · Temporary Branding Preview Component · Phase 2 Task 2
      </footer>
    </div>
  );
};

export default BrandPreview;
