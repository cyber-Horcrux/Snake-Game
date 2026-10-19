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
import { TouchDPad } from './components/TouchDPad.tsx';

export default function App() {
  // Navigation & Screen State
  const [screen, setScreen] = useState<AppScreen>('title');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const selectedModeRef = useRef<GameMode>('classic');
  const [bestScores, setBestScores] = useState<ModeBestScores>(() => loadBestScores());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Reactive HUD state so UI updates as soon as food is collected or stats change
  const [hudState, setHudState] = useState({
    score: 0,
    level: 1,
    length: 3,
    mode: 'classic' as GameMode,
    hasShield: false,
    slowMoUntil: 0,
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

  // Synchronize refs
  screenRef.current = screen;
  settingsRef.current = settings;
  selectedModeRef.current = selectedMode;

  if (typeof window !== 'undefined') {
    (window as unknown as { __gameStateRef: unknown }).__gameStateRef = gameStateRef;
  }

  // Touch Swipe coordinates
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Sync soundEngine settings
  useEffect(() => {
    soundEngine.setSfxEnabled(settings.audio.sfxEnabled);
    soundEngine.setVolume(settings.audio.sfxVolume);
  }, [settings.audio.sfxEnabled, settings.audio.sfxVolume]);

  // Sync body data-state attribute
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Handle high score updates
  const handleGameOver = useCallback((finalState: GameEngineState) => {
    screenRef.current = 'gameover';
    soundEngine.play(finalState.isVictory ? 'new_record' : 'game_over');
    const { isNewBest } = updateBestScore(finalState.mode, finalState.score);
    setIsNewRecord(isNewBest);
    setBestScores(loadBestScores());
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

  // Touch Swipe Handlers for mobile steering on the canvas
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartRef.current.x;
    const dy = endY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipeDistance = 24;
    if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      handleSteer(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      handleSteer(dy > 0 ? 'DOWN' : 'UP');
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

            // Immediately synchronize reactive HUD state with updated score, level, and length
            setHudState({
              score: result.state.score,
              level: result.state.level,
              length: result.state.snake.length,
              mode: result.state.mode,
              hasShield: result.state.powerUps.hasShield,
              slowMoUntil: result.state.powerUps.slowMoUntil,
            });
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

  // Canvas Resolution & ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const minDimension = Math.floor(Math.min(rect.width, rect.height) * 0.94);
      const size = Math.max(280, Math.min(760, minDimension));

      const isHeadless =
        typeof navigator !== 'undefined' &&
        (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
      const dpr = isHeadless ? 1 : Math.min(2, window.devicePixelRatio || 1);

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const shouldShowDpad =
    settings.dpadPreference === 'always' ||
    (settings.dpadPreference === 'auto' &&
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080A12] flex flex-col items-center justify-center cyber-grid">
      {/* Canvas Viewport Container */}
      <div
        className="relative flex items-center justify-center w-full h-full p-2 select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          className="rounded-xl shadow-[0_0_30px_rgba(8,10,18,0.9)] bg-[#101426]/70 border border-[#43F5FF]/20"
        />

        {/* In-Game Minimal Perimeter HUD */}
        {screen === 'playing' && (
          <HeaderHUD
            score={hudState.score}
            bestScore={bestScores[hudState.mode]}
            level={hudState.level}
            length={hudState.length}
            mode={hudState.mode}
            hasShield={hudState.hasShield}
            slowMoUntil={hudState.slowMoUntil}
            onPause={pauseGame}
            onRestart={() => startGame(hudState.mode)}
            onToggleMute={toggleMute}
            sfxEnabled={settings.audio.sfxEnabled}
          />
        )}
      </div>

      {/* Screen Modals & Overlays */}
      {screen === 'title' && (
        <TitleScreen
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          bestScores={bestScores}
          onStartGame={() => startGame(selectedMode)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
          sfxEnabled={settings.audio.sfxEnabled}
          onToggleMute={toggleMute}
        />
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

      {/* Touch D-Pad for Mobile Devices */}
      {screen === 'playing' && shouldShowDpad && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 md:hidden">
          <TouchDPad onDirection={handleSteer} />
        </div>
      )}
    </div>
  );
}
