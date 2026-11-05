import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BRANDING_DIR = path.resolve(process.cwd(), 'src/assets/branding');

const REQUIRED_VARIANTS = [
  'logo-master.svg',
  'logo-symbol.svg',
  'logo-horizontal.svg',
  'logo-app-icon.svg',
  'logo-monochrome.svg',
  'logo-transparent.svg',
  'logo-light-bg.svg',
];

test('all seven required vector logo asset files exist in src/assets/branding/', () => {
  assert.ok(fs.existsSync(BRANDING_DIR), 'src/assets/branding directory must exist');

  for (const filename of REQUIRED_VARIANTS) {
    const filePath = path.join(BRANDING_DIR, filename);
    assert.ok(fs.existsSync(filePath), `Asset ${filename} must exist`);

    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 200, `Asset ${filename} must have non-trivial file size (> 200 bytes)`);
    assert.ok(stats.size < 50000, `Asset ${filename} must be lightweight vector (< 50KB)`);
  }
});

test('all seven SVG assets are strictly valid vector XML without embedded raster images', () => {
  for (const filename of REQUIRED_VARIANTS) {
    const filePath = path.join(BRANDING_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Must start with or contain proper <svg opening and closing tag
    assert.ok(content.includes('<svg'), `${filename}: must contain opening <svg tag`);
    assert.ok(content.includes('</svg>'), `${filename}: must contain closing </svg> tag`);
    assert.ok(content.includes('xmlns="http://www.w3.org/2000/svg"'), `${filename}: must declare SVG namespace`);

    // 2. Must have valid viewBox attribute
    assert.match(content, /viewBox="[0-9\s.-]+"/, `${filename}: must have viewBox defined`);

    // 3. Must NEVER contain embedded raster images or data URI bitmaps
    assert.ok(!content.includes('<image'), `${filename}: must not contain <image> tag`);
    assert.ok(!content.includes('data:image/png'), `${filename}: must not contain base64 png`);
    assert.ok(!content.includes('data:image/jpeg'), `${filename}: must not contain base64 jpeg`);
    assert.ok(!content.includes('data:image/webp'), `${filename}: must not contain base64 webp`);

    // 4. Must contain scalable geometry (paths / polygons / lines)
    assert.ok(content.includes('<path') || content.includes('<polygon'), `${filename}: must contain vector geometry`);
  }
});

test('specific brand variants meet their architectural identity requirements', () => {
  // 1. logo-master: Must include NEON SNAKE wordmark and ONE MORE RUN tagline
  const masterContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-master.svg'), 'utf-8');
  assert.ok(masterContent.includes('NEON'), 'logo-master.svg must include "NEON"');
  assert.ok(masterContent.includes('SNAKE'), 'logo-master.svg must include "SNAKE"');
  assert.ok(masterContent.includes('ONE MORE RUN'), 'logo-master.svg must include "ONE MORE RUN"');

  // 2. logo-horizontal: Must include horizontal layout aspect ratio with both title & tagline
  const horizContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-horizontal.svg'), 'utf-8');
  assert.ok(horizContent.includes('NEON'), 'logo-horizontal.svg must include "NEON"');
  assert.ok(horizContent.includes('SNAKE'), 'logo-horizontal.svg must include "SNAKE"');
  assert.ok(horizContent.includes('ONE MORE RUN'), 'logo-horizontal.svg must include "ONE MORE RUN"');
  assert.ok(horizContent.includes('viewBox="0 0 760 180"'), 'logo-horizontal.svg must use wide aspect ratio');

  // 3. logo-symbol: Pure standalone emblem
  const symbolContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-symbol.svg'), 'utf-8');
  assert.ok(symbolContent.includes('viewBox="0 0 512 512"'), 'logo-symbol.svg must be square 512x512');
  assert.ok(symbolContent.includes('id="predator-eyes"'), 'logo-symbol.svg must include predator eye sensors');
  assert.ok(symbolContent.includes('id="predator-fangs"'), 'logo-symbol.svg must include venom fangs');

  // 4. logo-app-icon: Contains safe-zone padding and rounded backing canvas
  const appIconContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-app-icon.svg'), 'utf-8');
  assert.ok(appIconContent.includes('viewBox="0 0 512 512"'), 'logo-app-icon.svg must be square 512x512');
  assert.ok(appIconContent.includes('<rect width="512" height="512"'), 'logo-app-icon.svg must have backing canvas');

  // 5. logo-monochrome: 1-color pure fill without colored gradients
  const monoContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-monochrome.svg'), 'utf-8');
  assert.ok(monoContent.includes('fill="#FFFFFF"'), 'logo-monochrome.svg must use monochrome fill');
  assert.ok(!monoContent.includes('linearGradient'), 'logo-monochrome.svg should not rely on linear gradients');

  // 6. logo-transparent: Full lockup without solid background rectangle
  const transContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-transparent.svg'), 'utf-8');
  assert.ok(!transContent.includes('<rect width="600" height="740" rx="24"'), 'logo-transparent.svg must not have solid background card');
  assert.ok(transContent.includes('ONE MORE RUN'), 'logo-transparent.svg must include tagline');

  // 7. logo-light-bg: High contrast dark strokes/fills tuned for light backgrounds
  const lightContent = fs.readFileSync(path.join(BRANDING_DIR, 'logo-light-bg.svg'), 'utf-8');
  assert.ok(lightContent.includes('#0F172A') || lightContent.includes('#0A0E1A'), 'logo-light-bg.svg must use dark high-contrast typography');
  assert.ok(lightContent.includes('ONE MORE RUN'), 'logo-light-bg.svg must include tagline');
});

test('BrandLogo component module exports are available and well-formed', () => {
  const brandLogoPath = path.resolve(process.cwd(), 'src/components/branding/BrandLogo.tsx');
  assert.ok(fs.existsSync(brandLogoPath), 'BrandLogo.tsx component must exist');

  const content = fs.readFileSync(brandLogoPath, 'utf-8');
  assert.ok(content.includes('export const BrandLogo'), 'Must export BrandLogo component');
  assert.ok(content.includes('export const LOGO_ASSETS'), 'Must export LOGO_ASSETS map');
  assert.ok(content.includes('export type LogoVariant'), 'Must export LogoVariant type');

  // Verify all 7 variants are registered in LOGO_ASSETS
  for (const variant of ['master', 'symbol', 'horizontal', 'app-icon', 'monochrome', 'transparent', 'light-bg']) {
    assert.ok(content.includes(`'${variant}'`), `BrandLogo must support variant: ${variant}`);
  }
});

test('index.html contains complete web metadata, SEO, and social cards', () => {
  const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
  assert.ok(fs.existsSync(indexHtmlPath), 'index.html must exist');

  const content = fs.readFileSync(indexHtmlPath, 'utf-8');

  // Title & Charset
  assert.ok(content.includes('<title>NEON SNAKE — ONE MORE RUN</title>'), 'Must have correct title');
  assert.ok(content.includes('charset="UTF-8"'), 'Must specify UTF-8 charset');

  // Theme color & Mobile App display
  assert.ok(content.includes('name="theme-color" content="#05070E"'), 'Must define brand theme color');
  assert.ok(content.includes('name="apple-mobile-web-app-capable" content="yes"'), 'Must enable apple mobile web app');
  assert.ok(content.includes('viewport-fit=cover'), 'Must specify viewport-fit=cover');

  // Favicons & Manifest
  assert.ok(content.includes('rel="icon" type="image/svg+xml" href="/favicon.svg"'), 'Must link SVG favicon');
  assert.ok(content.includes('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"'), 'Must link Apple touch icon');
  assert.ok(content.includes('rel="manifest" href="/manifest.json"'), 'Must link PWA manifest');

  // OpenGraph & Twitter
  assert.ok(content.includes('property="og:title" content="NEON SNAKE — ONE MORE RUN"'), 'Must have og:title');
  assert.ok(content.includes('property="og:image" content="/og-image.png"'), 'Must link og:image');
  assert.ok(content.includes('property="og:image:width" content="1200"'), 'Must specify og:image:width 1200');
  assert.ok(content.includes('property="og:image:height" content="630"'), 'Must specify og:image:height 630');
  assert.ok(content.includes('name="twitter:card" content="summary_large_image"'), 'Must specify twitter:card summary_large_image');
  assert.ok(content.includes('name="twitter:image" content="/og-image.png"'), 'Must link twitter:image');
});

test('public branding assets and PWA manifest exist and are valid', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  assert.ok(fs.existsSync(publicDir), 'public directory must exist');

  // Verify PNG and SVG assets
  const requiredPublicFiles = [
    'favicon.svg',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'favicon.ico',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'og-image.png',
    'og-image.svg',
    'manifest.json',
  ];

  for (const file of requiredPublicFiles) {
    const filePath = path.join(publicDir, file);
    assert.ok(fs.existsSync(filePath), `Public asset ${file} must exist`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 50, `Public asset ${file} must not be empty`);
  }

  // Verify PWA manifest JSON structure
  const manifestRaw = fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.name, 'NEON SNAKE — ONE MORE RUN');
  assert.equal(manifest.short_name, 'NEON SNAKE');
  assert.equal(manifest.theme_color, '#05070E');
  assert.equal(manifest.background_color, '#05070E');
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Manifest must declare at least 3 icons');
});

test('Android launcher icon and splash screen resources exist across all required densities', () => {
  const androidResDir = path.resolve(process.cwd(), 'android/app/src/main/res');
  assert.ok(fs.existsSync(androidResDir), 'android/app/src/main/res directory must exist');

  // 1. Mipmap densities for launcher icons
  const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  for (const d of densities) {
    const dir = path.join(androidResDir, `mipmap-${d}`);
    assert.ok(fs.existsSync(dir), `mipmap-${d} must exist`);

    const standardIcon = path.join(dir, 'ic_launcher.png');
    const roundIcon = path.join(dir, 'ic_launcher_round.png');
    const foregroundIcon = path.join(dir, 'ic_launcher_foreground.png');

    assert.ok(fs.existsSync(standardIcon), `ic_launcher.png must exist in mipmap-${d}`);
    assert.ok(fs.existsSync(roundIcon), `ic_launcher_round.png must exist in mipmap-${d}`);
    assert.ok(fs.existsSync(foregroundIcon), `ic_launcher_foreground.png must exist in mipmap-${d}`);

    assert.ok(fs.statSync(standardIcon).size > 200, `${standardIcon} must not be empty`);
    assert.ok(fs.statSync(roundIcon).size > 200, `${roundIcon} must not be empty`);
    assert.ok(fs.statSync(foregroundIcon).size > 200, `${foregroundIcon} must not be empty`);
  }

  // 2. Splash screen densities (portrait and landscape)
  const splashDirs = [
    'drawable',
    'drawable-port-mdpi',
    'drawable-port-hdpi',
    'drawable-port-xhdpi',
    'drawable-port-xxhdpi',
    'drawable-port-xxxhdpi',
    'drawable-land-mdpi',
    'drawable-land-hdpi',
    'drawable-land-xhdpi',
    'drawable-land-xxhdpi',
    'drawable-land-xxxhdpi',
  ];

  for (const sDir of splashDirs) {
    const splashFile = path.join(androidResDir, sDir, 'splash.png');
    assert.ok(fs.existsSync(splashFile), `splash.png must exist in ${sDir}`);
    assert.ok(fs.statSync(splashFile).size > 1000, `splash.png in ${sDir} must be a valid high-resolution image`);
  }

  // 3. Android adaptive background color
  const bgXml = path.join(androidResDir, 'values/ic_launcher_background.xml');
  const bgContent = fs.readFileSync(bgXml, 'utf-8');
  assert.ok(bgContent.includes('#05070E'), 'ic_launcher_background color must be #05070E');
});
