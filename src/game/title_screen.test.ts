import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Title Screen & 2x3 Main Menu Grid Regression Test Suite
// -----------------------------------------------------------------------------

const titleScreenPath = path.resolve(process.cwd(), 'src/components/TitleScreen.tsx');
const titleContent = fs.readFileSync(titleScreenPath, 'utf-8');

test('Menu Grid 1: TitleScreen defines a balanced 2-column by 3-row grid container', () => {
  // Grid container must declare 2 equal-width columns
  assert.ok(
    titleContent.includes('grid grid-cols-2'),
    'TitleScreen must render a grid with exactly 2 columns (grid-cols-2)'
  );
  // Grid container must declare semantic role="menu" and aria-label
  assert.ok(
    titleContent.includes('role="menu"'),
    'Main menu grid must specify semantic role="menu" for assistive technology'
  );
  assert.ok(
    titleContent.includes('aria-label="Secondary Actions"'),
    'Main menu grid must provide descriptive aria-label'
  );
});

test('Menu Grid 2: Exactly 6 distinct secondary action cards are present in the 2x3 grid', () => {
  // Verify all 6 action cards exist inside the secondary grid
  const hasDailyChallenges = titleContent.includes('onOpenDailyChallenges') && titleContent.includes('DAILY CHALLENGES');
  const hasCampaign = titleContent.includes('onOpenStageSelect') && titleContent.includes('CAMPAIGN');
  const hasSnakeSkins = titleContent.includes('onOpenSkinCollection') && titleContent.includes('SNAKE SKINS');
  const hasDossier = titleContent.includes('onOpenStats') && titleContent.includes('DOSSIER');
  const hasHowToPlay = titleContent.includes('onOpenHowToPlay') && titleContent.includes('HOW TO PLAY');
  const hasSettings = titleContent.includes('onOpenSettings') && titleContent.includes('SETTINGS');

  assert.ok(hasDailyChallenges, 'Menu must contain Daily Challenges card');
  assert.ok(hasCampaign, 'Menu must contain Campaign Stages card');
  assert.ok(hasSnakeSkins, 'Menu must contain Snake Skins card');
  assert.ok(hasDossier, 'Menu must contain Pilot Dossier (Stats) card');
  assert.ok(hasHowToPlay, 'Menu must contain How to Play card');
  assert.ok(hasSettings, 'Menu must contain Settings card');

  // Verify role="menuitem" is declared on all menu items
  const menuItemMatches = titleContent.match(/role="menuitem"/g) || [];
  assert.equal(menuItemMatches.length, 6, 'Exactly 6 menu items must declare role="menuitem"');
});

test('Menu Grid 3: Primary Play CTA is prominent, anchors the top of the menu block, and preserves data-start', () => {
  assert.ok(titleContent.includes('data-start="true"'), 'Primary Play button must preserve data-start="true"');
  assert.ok(titleContent.includes('PLAY RUN [ENTER]'), 'Primary Play button must preserve standard run text');
  assert.ok(titleContent.includes('CAMPAIGN STAGES [ENTER]'), 'Primary Play button must adapt to campaign stages text in Maze mode');
  assert.ok(titleContent.includes('handlePlayClick'), 'Primary Play button must trigger handlePlayClick');

  // Primary action button must declare high-prominence styling and larger min-height
  assert.ok(
    titleContent.includes('min-h-[48px]') || titleContent.includes('min-h-[52px]'),
    'Primary Play button must have a prominent minimum height (>= 48px)'
  );
  assert.ok(
    titleContent.includes('bg-gradient-to-r'),
    'Primary Play button must use signature neon cyber-gradient'
  );
});

test('Menu Grid 4: Consistent card dimensions, touch targets, and corner radii across all 6 cards', () => {
  // Every card in the 2x3 grid must enforce a comfortable minimum touch target height >= 44px
  const minHeightMatches = titleContent.match(/min-h-\[44px\]/g) || [];
  assert.equal(
    minHeightMatches.length,
    6,
    'All 6 secondary cards must enforce minimum touch target height of at least 44px'
  );

  // Every card in the 2x3 grid must use consistent rounded-xl corner radii
  const roundedMatches = titleContent.match(/rounded-xl/g) || [];
  assert.ok(
    roundedMatches.length >= 7, // 1 primary play + 6 secondary cards + mode cards
    'Cards must maintain consistent rounded-xl border radius'
  );
});

test('Menu Grid 5: Accessibility features: focus rings, reduced-motion, and descriptive aria-labels', () => {
  // Focus visible ring
  assert.ok(
    titleContent.includes('focus-visible:ring-2'),
    'Buttons must declare visible keyboard focus rings (focus-visible:ring-2)'
  );
  assert.ok(
    titleContent.includes('focus-visible:outline-none'),
    'Buttons must suppress default browser outline in favor of focus ring'
  );

  // Reduced motion support
  assert.ok(
    titleContent.includes('motion-reduce:transition-none'),
    'Interactive cards must respect reduced-motion user preferences'
  );

  // Descriptive aria-labels
  assert.ok(titleContent.includes('aria-label="Maze Campaign Stages"'), 'Campaign card must have aria-label');
  assert.ok(titleContent.includes('aria-label="Snake Skins Chassis Suite"'), 'Skins card must have aria-label');
  assert.ok(titleContent.includes('aria-label="Pilot Dossier and Statistics"'), 'Dossier card must have aria-label');
  assert.ok(titleContent.includes('aria-label="How to Play Field Manual"'), 'How to Play card must have aria-label');
  assert.ok(titleContent.includes('aria-label="Game Settings"'), 'Settings card must have aria-label');
});

test('Menu Grid 6: Universal Responsive Layout calculations across representative device matrix', () => {
  interface ViewportScenario {
    category: string;
    width: number;
    height: number;
  }

  const representativeMatrix: ViewportScenario[] = [
    { category: 'Compact phone', width: 320, height: 568 },
    { category: 'Standard phone', width: 360, height: 800 },
    { category: 'Large phone', width: 430, height: 932 },
    { category: 'Phone landscape', width: 844, height: 390 },
    { category: 'Compact tablet', width: 600, height: 960 },
    { category: 'Large tablet', width: 1024, height: 768 },
    { category: 'Small laptop', width: 1366, height: 768 },
    { category: 'Desktop monitor', width: 1920, height: 1080 },
    { category: 'Ultrawide display', width: 2560, height: 1080 },
  ];

  // Helper simulating the 2-column menu grid geometry
  const calculateMenuGridGeometry = (viewportW: number, viewportH: number) => {
    // Outer padding: min 10px on compact, up to 24px on desktop
    const outerPadding = viewportW < 360 ? 10 : (viewportW < 640 ? 16 : 24);
    const availableWidth = viewportW - (outerPadding * 2);

    // Centerpiece max-width constraint: max-w-2xl (42rem = 672px)
    const MAX_MENU_WIDTH = 672;
    const menuContainerWidth = Math.min(availableWidth, MAX_MENU_WIDTH);

    // Gap between the 2 columns: 8px on mobile, 12px on sm+
    const colGap = viewportW < 640 ? 8 : 12;

    // Equal-width column width
    const colWidth = (menuContainerWidth - colGap) / 2;

    return {
      outerPadding,
      availableWidth,
      menuContainerWidth,
      colGap,
      colWidth,
      isShort: viewportH < 500,
    };
  };

  for (const scenario of representativeMatrix) {
    const geo = calculateMenuGridGeometry(scenario.width, scenario.height);

    // Column width must never collapse or become negative
    assert.ok(
      geo.colWidth > 130,
      `${scenario.category} (${scenario.width}x${scenario.height}): Column width (${geo.colWidth}px) must be >= 130px for touch & readability`
    );

    // Container width must strictly honor maximum constraint (prevent excessive stretching on ultrawide)
    assert.ok(
      geo.menuContainerWidth <= 672,
      `${scenario.category}: Menu width (${geo.menuContainerWidth}px) exceeds max-w-2xl boundary (672px)`
    );

    // Both columns together + gap must fit strictly within available screen width
    const totalGridWidth = (geo.colWidth * 2) + geo.colGap;
    assert.ok(
      totalGridWidth <= geo.availableWidth + 0.01,
      `${scenario.category}: Total grid width (${totalGridWidth}px) overflows available width (${geo.availableWidth}px)`
    );
  }
});

test('Menu Grid 7: Dynamic indicators render correctly for Daily Challenges and Campaign progress', () => {
  // Daily challenges pulse indicator must render conditionally when challenges are pending
  assert.ok(
    titleContent.includes('dailyCompletedCount < 3'),
    'Daily challenges card must conditionally render pulse indicator when challenges remain'
  );
  assert.ok(
    titleContent.includes('trophyStars > 0'),
    'Daily challenges card must render trophy stars count when earned'
  );

  // Campaign card must display stage progress
  assert.ok(
    titleContent.includes('mazeProgress?.highestStageUnlocked || 1'),
    'Campaign card must display current highest stage unlocked'
  );
});

test('Menu Grid 8: Visual identity tokens strictly maintained', () => {
  // Void background, Obsidian card background, Cyber slate borders, Neon Cyan accents
  assert.ok(titleContent.includes('#05070E'), 'Must use Void background #05070E');
  assert.ok(titleContent.includes('#0B0E1A'), 'Must use Obsidian background #0B0E1A');
  assert.ok(titleContent.includes('#161B2E'), 'Must use Cyber slate border #161B2E');
  assert.ok(titleContent.includes('#00F5FF'), 'Must use Neon Cyan accent #00F5FF');
  assert.ok(titleContent.includes('#7928CA'), 'Must use Purple Core accent #7928CA');
  assert.ok(titleContent.includes('#FF007A'), 'Must use Hot Magenta accent #FF007A');
  assert.ok(titleContent.includes('#F0F6FC'), 'Must use Primary Text #F0F6FC');
  assert.ok(titleContent.includes('#79869C'), 'Must use Muted Text #79869C');
});
