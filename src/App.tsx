import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  AppScreen,
  Direction,
  GameEngineState,
  GameMode,
  GameSettings,
  ModeBestScores,
} from './game/types.ts';
import {
  createInitialState,
  queueDirection,
  stepGame,
} from './game/engine.ts';
import { NeonRenderer } from './game/renderer.ts';
import { soundEngine } from './game/audio.ts';
import {
  SwipeTracker,
  shouldAcceptSwipeControls,
  shouldShowDirectionalControls,
} from './game/controls.ts';
import {
  loadBestScores,
  loadSettings,
  resetBestScores,
  saveSettings,
  updateBestScore,
} from './game/persistence.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HeaderHUD } from './components/HeaderHUD.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { TouchDPad } from './components/TouchDPad.tsx';
import { BrandPreview } from './components/branding/BrandPreview.tsx';
import {
  loadStats,
  loadAchievements,
  recordRunCompletion,
  resetStatsAndAchievements,
} from './game/stats.ts';
import { calculateCanvasDimensions } from './game/responsive.ts';

export default function App() {
  // Navigation & Screen State
  const [screen, setScreen] = useState<AppScreen>('title');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const selectedModeRef = useRef<GameMode>('classic');
  const [bestScores, setBestScores] = useState<ModeBestScores>(() => loadBestScores());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [lifetimeStats, setLifetimeStats] = useState(() => loadStats());
  const [achievements, setAchievements] = useState(() => loadAchievements());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBrandPreview, setShowBrandPreview] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('preview') === 'brand' ||
        params.get('branding') === '1' ||
        window.location.hash === '#brand-preview'
      );
    }
    return false;
  });

  // Reactive HUD state so UI updates as soon as food is collected or stats change
  const [hudState, setHudState] = useState({
    score: 0,
    level: 1,
    length: 3,
    mode: 'classic' as GameMode,
    hasShield: false,
    slowMoUntil: 0,
    combo: 1,
  });

  // Simulation Refs (Decoupled from React 60fps loop)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<NeonRenderer>(new NeonRenderer());
  const gameStateRef = useRef<GameEngineState>(createInitialState('classic'));
  const accumulatorRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const screenRef = useRef<AppScreen>('title');
  const settingsRef = useRef<GameSettings>(settings);
  const modalsOpenRef = useRef(false);

  // Synchronize refs
  screenRef.current = screen;
  settingsRef.current = settings;
  selectedModeRef.current = selectedMode;
  modalsOpenRef.current = showHowToPlay || showSettings || showStats;

  // Swipe Tracker & Touch State
  const swipeTrackerRef = useRef<SwipeTracker>(new SwipeTracker(24));
  const isTouchActiveRef = useRef(false);

  // Sync soundEngine settings
  useEffect(() => {
    soundEngine.setSfxEnabled(settings.audio.sfxEnabled);
    soundEngine.setVolume(settings.audio.sfxVolume);
  }, [settings.audio.sfxEnabled, settings.audio.sfxVolume]);

  // Sync body data-state attribute
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Handle high score and stats updates
  const handleGameOver = useCallback((finalState: GameEngineState) => {
    screenRef.current = 'gameover';
    soundEngine.play(finalState.isVictory ? 'new_record' : 'game_over');
    const { isNewBest } = updateBestScore(finalState.mode, finalState.score);
    setIsNewRecord(isNewBest);
    setBestScores(loadBestScores());

    // Record telemetry in pilot dossier and check achievement unlock
    const { stats: updatedStats, newlyUnlocked } = recordRunCompletion(finalState);
    setLifetimeStats(updatedStats);
    setAchievements(loadAchievements());
    if (newlyUnlocked.length > 0) {
      soundEngine.play('achievement');
    }

    setScreen('gameover');
  }, []);

  // Direction handler
  const handleSteer = useCallback((dir: Direction) => {
    if (screenRef.current === 'playing') {
      gameStateRef.current = queueDirection(gameStateRef.current, dir);
    }
  }, []);

  // Start / Restart game
  const startGame = useCallback((mode?: GameMode) => {
    const targetMode = mode || selectedModeRef.current;
    screenRef.current = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const newState = createInitialState(targetMode);
    gameStateRef.current = newState;
    accumulatorRef.current = 0;
    lastTimeRef.current = performance.now();
    rendererRef.current.particles.reset();
    setIsNewRecord(false);
    setHudState({
      score: 0,
      level: 1,
      length: newState.snake.length,
      mode: targetMode,
      hasShield: false,
      slowMoUntil: 0,
      combo: 1,
    });
    setScreen('playing');
    soundEngine.play('click');
  }, []);

  // Resume game
  const resumeGame = useCallback(() => {
    screenRef.current = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;
    setScreen('playing');
    soundEngine.play('click');
  }, []);

  // Pause game
  const pauseGame = useCallback(() => {
    screenRef.current = 'paused';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setScreen('paused');
    soundEngine.play('click');
  }, []);

  // Main menu
  const returnToMainMenu = useCallback(() => {
    screenRef.current = 'title';
    setScreen('title');
    soundEngine.play('click');
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setSettings(prev => {
      const updated = {
        ...prev,
        audio: {
          ...prev.audio,
          sfxEnabled: !prev.audio.sfxEnabled,
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Update Settings
  const handleUpdateSettings = useCallback((newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // Reset Scores
  const handleResetScores = useCallback(() => {
    resetBestScores();
    setBestScores(loadBestScores());
  }, []);

  // Reset Lifetime Stats & Achievements
  const handleResetStats = useCallback(() => {
    resetStatsAndAchievements();
    setLifetimeStats(loadStats());
    setAchievements(loadAchievements());
  }, []);

  // Support ?autostart=1 query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const modeParam = params.get('mode') as GameMode;
      const initialMode = ['classic', 'zen', 'rush'].includes(modeParam) ? modeParam : 'classic';
      setSelectedMode(initialMode);
      startGame(initialMode);
    }
  }, [startGame]);

  // Support ?preview=brand or ?branding=1 or #brand-preview
  useEffect(() => {
    const handleCheckBrandPreview = () => {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('preview') === 'brand' ||
        params.get('branding') === '1' ||
        window.location.hash === '#brand-preview'
      ) {
        setShowBrandPreview(true);
      }
    };
    handleCheckBrandPreview();
    window.addEventListener('popstate', handleCheckBrandPreview);
    window.addEventListener('hashchange', handleCheckBrandPreview);
    return () => {
      window.removeEventListener('popstate', handleCheckBrandPreview);
      window.removeEventListener('hashchange', handleCheckBrandPreview);
    };
  }, []);

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key;

      // When modals (How to Play, Settings, Pilot Dossier) are open, intercept keys
      if (modalsOpenRef.current) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowHowToPlay(false);
          setShowSettings(false);
          setShowStats(false);
        }
        return;
      }

      // Global Mute toggle
      if (key === 'm' || key === 'M') {
        toggleMute();
        return;
      }

      // Title screen start
      if (screenRef.current === 'title') {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      // Game over restart
      if (screenRef.current === 'gameover') {
        if (key === 'Enter' || key === ' ' || key === 'r' || key === 'R') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      // Pause screen controls
      if (screenRef.current === 'paused') {
        if (key === ' ' || key === 'Escape' || key === 'p' || key === 'P') {
          e.preventDefault();
          resumeGame();
        } else if (key === 'r' || key === 'R') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      // Playing screen controls
      if (screenRef.current === 'playing') {
        if (key === ' ' || key === 'Escape' || key === 'p' || key === 'P') {
          e.preventDefault();
          pauseGame();
          return;
        }

        if (key === 'r' || key === 'R') {
          e.preventDefault();
          startGame();
          return;
        }

        if (key === 'ArrowUp' || key === 'w' || key === 'W') {
          e.preventDefault();
          handleSteer('UP');
        } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
          e.preventDefault();
          handleSteer('DOWN');
        } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
          e.preventDefault();
          handleSteer('LEFT');
        } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
          e.preventDefault();
          handleSteer('RIGHT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSteer, startGame, resumeGame, pauseGame, toggleMute]);

  const shouldAcceptSwipes = shouldAcceptSwipeControls(settings.controlMode);
  const shouldAcceptSwipesRef = useRef(shouldAcceptSwipes);
  shouldAcceptSwipesRef.current = shouldAcceptSwipes;

  // Touch & Pointer Swipe Handlers for mobile steering on the canvas
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!shouldAcceptSwipesRef.current) return;
    if (e.touches.length === 1) {
      isTouchActiveRef.current = true;
      swipeTrackerRef.current.start(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!shouldAcceptSwipesRef.current || !swipeTrackerRef.current.isTracking()) return;
    if (e.touches.length === 1) {
      const dir = swipeTrackerRef.current.move(e.touches[0].clientX, e.touches[0].clientY);
      if (dir) {
        handleSteer(dir);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!shouldAcceptSwipesRef.current || !swipeTrackerRef.current.isTracking()) {
      isTouchActiveRef.current = false;
      return;
    }
    if (e.changedTouches.length > 0) {
      const dir = swipeTrackerRef.current.end(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (dir) {
        handleSteer(dir);
      }
    }
    isTouchActiveRef.current = false;
  };

  const handleTouchCancel = () => {
    swipeTrackerRef.current.cancel();
    isTouchActiveRef.current = false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!shouldAcceptSwipesRef.current) return;
    if (e.pointerType === 'touch') {
      isTouchActiveRef.current = true;
      return; // Handled by touch events
    }
    if (isTouchActiveRef.current) return;
    if (e.button !== 0) return; // Only primary mouse button
    swipeTrackerRef.current.start(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!shouldAcceptSwipesRef.current || !swipeTrackerRef.current.isTracking()) return;
    if (e.pointerType === 'touch' || isTouchActiveRef.current) return;
    const dir = swipeTrackerRef.current.move(e.clientX, e.clientY);
    if (dir) {
      handleSteer(dir);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!shouldAcceptSwipesRef.current || !swipeTrackerRef.current.isTracking()) return;
    if (e.pointerType === 'touch' || isTouchActiveRef.current) return;
    const dir = swipeTrackerRef.current.end(e.clientX, e.clientY);
    if (dir) {
      handleSteer(dir);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') {
      swipeTrackerRef.current.cancel();
    }
  };

  // 60FPS Game Loop with Fixed Timestep Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

      rendererRef.current.update(dt);

      if (screenRef.current === 'playing') {
        accumulatorRef.current += dt * 1000;
        const tickInterval = gameStateRef.current.tickIntervalMs;

        while (accumulatorRef.current >= tickInterval) {
          accumulatorRef.current -= tickInterval;
          const result = stepGame(gameStateRef.current, Date.now());
          gameStateRef.current = result.state;

          // Process sound and visual effects
          for (const ev of result.events) {
            soundEngine.play(ev);
          }

          if (result.eatenFood) {
            const head = result.state.snake[0];
            const px = (head.x + 0.5) * (canvas.width / result.state.gridWidth);
            const py = (head.y + 0.5) * (canvas.height / result.state.gridHeight);

            if (result.eatenFood.type === 'normal') {
              rendererRef.current.particles.spawn(px, py, '#39FF14', 10, 140, 3.5);
            } else if (result.eatenFood.type === 'bonus') {
              rendererRef.current.particles.spawn(px, py, '#FF4FD8', 18, 180, 4);
              rendererRef.current.triggerScreenShake(6, 0.2);
            } else {
              rendererRef.current.particles.spawn(px, py, '#43F5FF', 14, 160, 4);
            }

            // Immediately synchronize reactive HUD state with updated score, level, length, and combo
            setHudState({
              score: result.state.score,
              level: result.state.level,
              length: result.state.snake.length,
              mode: result.state.mode,
              hasShield: result.state.powerUps.hasShield,
              slowMoUntil: result.state.powerUps.slowMoUntil,
              combo: result.state.combo || 1,
            });
          } else if (result.state.combo === 1) {
            setHudState(prev => (prev.combo !== 1 ? { ...prev, combo: 1 } : prev));
          }

          if (result.shieldAbsorbed) {
            const head = result.state.snake[0];
            const px = (head.x + 0.5) * (canvas.width / result.state.gridWidth);
            const py = (head.y + 0.5) * (canvas.height / result.state.gridHeight);
            rendererRef.current.particles.spawn(px, py, '#9865FF', 24, 220, 5);
            rendererRef.current.triggerScreenShake(10, 0.3);

            setHudState(prev => ({
              ...prev,
              hasShield: false,
            }));
          }

          if (!result.state.isAlive || result.state.isVictory) {
            const head = result.state.snake[0];
            const px = (head.x + 0.5) * (canvas.width / result.state.gridWidth);
            const py = (head.y + 0.5) * (canvas.height / result.state.gridHeight);
            rendererRef.current.particles.spawn(px, py, '#FF4FD8', 35, 260, 5);
            rendererRef.current.triggerScreenShake(12, 0.35);
            handleGameOver(result.state);
            break;
          }
        }
      }

      // Render with interpolation
      const alpha = screenRef.current === 'playing'
        ? Math.min(1, accumulatorRef.current / gameStateRef.current.tickIntervalMs)
        : 1;

      rendererRef.current.render(
        ctx,
        canvas.width,
        canvas.height,
        gameStateRef.current,
        alpha,
        settingsRef.current
      );

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleGameOver]);

  // Canvas Resolution & ResizeObserver with dynamic dimension calculation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const isHeadless =
        typeof navigator !== 'undefined' &&
        (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
      const dpr = isHeadless ? 1 : Math.min(2, window.devicePixelRatio || 1);

      const { cssSize, backingWidth, backingHeight } = calculateCanvasDimensions(
        rect.width,
        rect.height,
        dpr,
        { padding: 8 }
      );

      if (cssSize <= 0) return;

      // Only reassign backing dimensions when changed to prevent clearing 2D context
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }

      const cssPx = `${cssSize}px`;
      if (canvas.style.width !== cssPx) {
        canvas.style.width = cssPx;
      }
      if (canvas.style.height !== cssPx) {
        canvas.style.height = cssPx;
      }
    };

    updateCanvasSize();

    const ro = new ResizeObserver(() => {
      updateCanvasSize();
    });
    ro.observe(container);

    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, [screen, settings.controlMode]);

  const shouldShowDpad = shouldShowDirectionalControls(settings.controlMode);
  const isButtonsMode = screen === 'playing' && (settings.controlMode === 'buttons' || settings.controlMode === 'both');

  return (
    <div className="relative w-full h-[100dvh] min-h-[100vh] overflow-hidden bg-[#080A12] flex flex-col items-center justify-between cyber-grid select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* In-Game Header HUD */}
      {screen === 'playing' && (
        <div className="w-full shrink-0 z-20 px-2 sm:px-4 pt-1 sm:pt-2">
          <HeaderHUD
            score={hudState.score}
            bestScore={bestScores[hudState.mode]}
            level={hudState.level}
            length={hudState.length}
            mode={hudState.mode}
            hasShield={hudState.hasShield}
            slowMoUntil={hudState.slowMoUntil}
            combo={hudState.combo}
            onPause={pauseGame}
            onRestart={() => startGame(hudState.mode)}
            onToggleMute={toggleMute}
            sfxEnabled={settings.audio.sfxEnabled}
          />
        </div>
      )}

      {/* Main Game Playing Area (Canvas Viewport + Virtual Controls) */}
      <div className="w-full flex-1 flex flex-col relative min-h-0 min-w-0 overflow-hidden items-center justify-between game-play-area">
        {/* Canvas Viewport Container */}
        <div
          className={`w-full min-h-0 min-w-0 flex items-center justify-center relative overflow-hidden ${
            isButtonsMode ? 'game-viewport-buttons' : 'flex-1'
          }`}
        >
          <div
            data-testid="game-board-container"
            className={`relative flex justify-center w-full h-full select-none touch-none items-center p-1 sm:p-2 ${
              isButtonsMode ? 'game-board-container-buttons' : ''
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={e => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              data-testid="game-canvas"
              className="rounded-xl shadow-[0_0_30px_rgba(8,10,18,0.9)] bg-[#101426]/70 border border-[#43F5FF]/20 block"
            />
          </div>
        </div>

        {/* Touch D-Pad for Mobile Devices & Tablets */}
        {screen === 'playing' && shouldShowDpad && (
          <div
            data-testid="touch-dpad-container"
            className={`z-20 xl:hidden shrink-0 pb-1 touch-dpad-container-docked ${
              isButtonsMode ? 'touch-dpad-container-buttons' : ''
            }`}
          >
            <TouchDPad onDirection={handleSteer} isButtonsMode={isButtonsMode} />
          </div>
        )}
      </div>

      {/* Screen Modals & Overlays */}
      {screen === 'title' && (
        <>
          {/* Temporary Brand Preview Trigger Button */}
          <button
            type="button"
            onClick={() => setShowBrandPreview(true)}
            aria-label="Open Branding Preview Gallery"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-30 px-3 py-1.5 rounded-lg bg-[#101426]/90 border border-[#43F5FF]/40 text-[#43F5FF] text-xs font-mono tracking-wider hover:bg-[#43F5FF]/15 hover:border-[#43F5FF] transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
          >
            <span className="text-[#FF4FD8]">✦</span>
            <span>BRAND PREVIEW</span>
          </button>

          <TitleScreen
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            bestScores={bestScores}
            onStartGame={() => startGame(selectedMode)}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenStats={() => setShowStats(true)}
            sfxEnabled={settings.audio.sfxEnabled}
            onToggleMute={toggleMute}
          />
        </>
      )}

      {screen === 'paused' && (
        <PauseModal
          state={gameStateRef.current}
          bestScore={bestScores[gameStateRef.current.mode]}
          onResume={resumeGame}
          onRestart={() => startGame(gameStateRef.current.mode)}
          onMainMenu={returnToMainMenu}
        />
      )}

      {screen === 'gameover' && (
        <GameOverModal
          state={gameStateRef.current}
          bestScore={bestScores[gameStateRef.current.mode]}
          isNewRecord={isNewRecord}
          onPlayAgain={() => startGame(gameStateRef.current.mode)}
          onMainMenu={returnToMainMenu}
          onOpenStats={() => setShowStats(true)}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetScores={handleResetScores}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showStats && (
        <StatsModal
          stats={lifetimeStats}
          achievements={achievements}
          onResetStats={handleResetStats}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* Temporary Brand Preview Gallery Overlay */}
      {showBrandPreview && (
        <BrandPreview onClose={() => setShowBrandPreview(false)} />
      )}

      {/* Bottom Desktop Keyboard Controls Hint */}
      {screen === 'playing' && (
        <div className="hidden xl:flex justify-between items-center text-[11px] text-slate-500 font-mono tracking-wider w-full px-6 py-1.5 shrink-0 z-10">
          <span>WASD / ARROWS TO MOVE</span>
          <span>SPACE TO PAUSE · R TO RESTART · M TO MUTE</span>
        </div>
      )}
    </div>
  );
}
