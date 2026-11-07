import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  AppScreen,
  Direction,
  GameEngineState,
  GameMode,
  GameSettings,
  MazeProgress,
  MazeStageSnapshot,
  ModeBestScores,
  PlayerProgressionState,
  PlayerSkinsState,
  PlayerTrailsState,
  SnakeSkinId,
  SnakeTrailId,
  XpEarnResult,
} from './game/types.ts';
import {
  createInitialState,
  queueDirection,
  stepGame,
} from './game/engine.ts';
import {
  createInitialMazeState,
  advanceMazeStage,
  getMazeStage,
} from './game/mazes.ts';
import { NeonRenderer } from './game/renderer.ts';
import { soundEngine } from './game/audio.ts';
import {
  SwipeTracker,
  shouldAcceptSwipeControls,
  shouldShowDirectionalControls,
} from './game/controls.ts';
import {
  equipSkin,
  equipTrail,
  loadBestScores,
  loadMazeProgress,
  loadPlayerTrails,
  loadSettings,
  reconcileAndMigratePlayerSkins,
  reconcileAndMigratePlayerTrails,
  recordStageClear,
  recordCampaignCompletion,
  resetBestScores,
  saveSettings,
  updateBestScore,
} from './game/persistence.ts';
import {
  DEFAULT_PLAYER_SKINS_STATE,
  isSkinUnlocked,
} from './game/skins.ts';
import {
  DEFAULT_PLAYER_TRAILS_STATE,
  isTrailUnlocked,
} from './game/trails.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HeaderHUD } from './components/HeaderHUD.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { MazeStageSelectModal } from './components/MazeStageSelectModal.tsx';
import { StageClearModal } from './components/StageClearModal.tsx';
import { CampaignVictoryModal } from './components/CampaignVictoryModal.tsx';
import { TouchDPad } from './components/TouchDPad.tsx';
import { DailyChallengesModal } from './components/DailyChallengesModal.tsx';
import { SkinCollectionModal } from './components/progression/SkinCollectionModal.tsx';
import {
  loadDailyChallengeState,
  recordDailyChallengeRun,
  type DailyChallengeUserState,
  type RunEvaluationResult,
} from './game/challenges.ts';
import {
  loadStats,
  loadAchievements,
  recordRunCompletion,
  resetStatsAndAchievements,
} from './game/stats.ts';
import { calculateCanvasDimensions } from './game/responsive.ts';
import {
  createMazeStageSnapshot,
  calculateMazeStageDelta,
  createRunEventId,
  createMazeStageEventId,
  recordGameplayRunXp,
  recordMazeStageXp,
  recordDailyRewardClaim,
  reconcileDailyRewards,
  loadPlayerProgression,
} from './game/levels.ts';

export default function App() {
  // Navigation & Screen State
  const [screen, setScreen] = useState<AppScreen>('title');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const selectedModeRef = useRef<GameMode>('classic');
  const [bestScores, setBestScores] = useState<ModeBestScores>(() => loadBestScores());
  const [mazeProgress, setMazeProgress] = useState<MazeProgress>(() => loadMazeProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [lifetimeStats, setLifetimeStats] = useState(() => loadStats());
  const [achievements, setAchievements] = useState(() => loadAchievements());
  const [dailyState, setDailyState] = useState<DailyChallengeUserState>(() => loadDailyChallengeState());
  const [progressionState, setProgressionState] = useState<PlayerProgressionState>(() => loadPlayerProgression());

  // Safe default player skins state: pure in-memory initialization, zero storage writes during rendering
  const [playerSkins, setPlayerSkins] = useState<PlayerSkinsState>(() => ({
    ...DEFAULT_PLAYER_SKINS_STATE,
    unlockedSkinIds: [...DEFAULT_PLAYER_SKINS_STATE.unlockedSkinIds],
  }));
  const playerSkinsRef = useRef<PlayerSkinsState>(playerSkins);

  // Safe default player trails state: pure in-memory initialization, zero storage writes during rendering
  const [playerTrails, setPlayerTrails] = useState<PlayerTrailsState>(() => ({
    ...DEFAULT_PLAYER_TRAILS_STATE,
    unlockedTrailIds: [...DEFAULT_PLAYER_TRAILS_STATE.unlockedTrailIds],
  }));
  const playerTrailsRef = useRef<PlayerTrailsState>(playerTrails);
  const [customizationTab, setCustomizationTab] = useState<'skins' | 'trails'>('skins');

  const [lastXpResult, setLastXpResult] = useState<XpEarnResult | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [showSkinCollection, setShowSkinCollection] = useState(false);

  // Run start timestamp and unique instance identifier for collision-safe run event IDs
  const runStartTimeRef = useRef<number>(Date.now());
  const runInstanceIdRef = useRef<string>(Math.random().toString(36).slice(2, 9));

  // Tracks active Maze campaign session to ensure per-stage deltas and stable start timestamp
  const mazeCampaignRef = useRef<{
    campaignId: string;
    startTime: number;
    creditedFood: number;
    creditedShields: number;
    clearedStages: Set<number>;
    currentStageSnapshot: MazeStageSnapshot;
  } | null>(null);

  // Single-recording guard against duplicate stage clears or campaign wins
  const recordedClearRef = useRef<string | null>(null);

  // Reactive HUD state so UI updates as soon as food is collected or stats change
  const [hudState, setHudState] = useState({
    score: 0,
    level: 1,
    length: 3,
    mode: 'classic' as GameMode,
    hasShield: false,
    slowMoUntil: 0,
    combo: 1,
    stage: 1,
    stageName: 'THE INITIATION',
    stageFoodEaten: 0,
    isGateActive: false,
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
  playerSkinsRef.current = playerSkins;
  playerTrailsRef.current = playerTrails;
  selectedModeRef.current = selectedMode;
  modalsOpenRef.current =
    showHowToPlay ||
    showSettings ||
    showStats ||
    showStageSelect ||
    showDailyChallenges ||
    showSkinCollection;

  // Swipe Tracker & Touch State
  const swipeTrackerRef = useRef<SwipeTracker>(new SwipeTracker(24));
  const isTouchActiveRef = useRef(false);

  // Reconcile Daily Challenge rewards, Player Skins, and Player Trails upon app startup
  useEffect(() => {
    const reconRewards = reconcileDailyRewards();
    if (reconRewards.reconciledCount > 0) {
      setProgressionState(reconRewards.progressionState);
    }

    const reconSkins = reconcileAndMigratePlayerSkins();
    setPlayerSkins(reconSkins.skinsState);
    if (reconSkins.mirrorRepaired) {
      setSettings(loadSettings());
    }

    const reconTrails = reconcileAndMigratePlayerTrails();
    setPlayerTrails(reconTrails.trailsState);
    if (reconTrails.mirrorRepaired) {
      setSettings(loadSettings());
    }
  }, []);

  // Equip skin handler with honest error reporting
  const handleEquipSkin = useCallback((skinId: SnakeSkinId) => {
    const result = equipSkin(skinId);
    if (result.success) {
      setPlayerSkins(result.state);
      setSettings(loadSettings());
      soundEngine.play('click');
      return { success: true };
    }
    return { success: false, error: result.error || 'Failed to equip skin.' };
  }, []);

  // Equip trail handler with honest error reporting
  const handleEquipTrail = useCallback((trailId: SnakeTrailId) => {
    const result = equipTrail(trailId);
    if (result.success) {
      setPlayerTrails(result.state);
      setSettings(loadSettings());
      soundEngine.play('click');
      return { success: true };
    }
    return { success: false, error: result.error || 'Failed to equip trail.' };
  }, []);

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

    // Single-recording guard against duplicate game-over callbacks
    const overKey = `over-${finalState.mode}-${runStartTimeRef.current}-${runInstanceIdRef.current}-${finalState.score}`;
    if (recordedClearRef.current === overKey) {
      setScreen('gameover');
      return;
    }
    recordedClearRef.current = overKey;

    // Record telemetry in pilot dossier and check achievement unlock
    const { stats: updatedStats, newlyUnlocked } = recordRunCompletion(finalState);
    setLifetimeStats(updatedStats);
    setAchievements(loadAchievements());

    // Record daily challenge progression & Trophy Stars
    let challengeEval: RunEvaluationResult;
    const claimTime = finalState.mode === 'maze'
      ? (mazeCampaignRef.current?.startTime ?? runStartTimeRef.current)
      : runStartTimeRef.current;

    if (finalState.mode === 'maze') {
      const campaign = mazeCampaignRef.current || {
        campaignId: `maze-campaign-${runStartTimeRef.current}`,
        startTime: runStartTimeRef.current,
        creditedFood: 0,
        creditedShields: 0,
        clearedStages: new Set<number>(),
        currentStageSnapshot: createMazeStageSnapshot(finalState),
      };
      const deltaFood = Math.max(0, finalState.foodEaten - campaign.creditedFood);
      const deltaShields = Math.max(0, (finalState.shieldsUsed || 0) - campaign.creditedShields);
      const deltaCores = finalState.stageFoodEaten !== undefined ? finalState.stageFoodEaten : deltaFood;

      campaign.creditedFood = finalState.foodEaten;
      campaign.creditedShields = finalState.shieldsUsed || 0;

      const eventId = `${campaign.campaignId}-stage-${finalState.stage}-gameover`;
      challengeEval = recordDailyChallengeRun(finalState, campaign.startTime, undefined, {
        eventId,
        stageDelta: {
          foodEaten: deltaFood,
          shieldsUsed: deltaShields,
          mazeCores: deltaCores,
          isStageClear: false,
        },
      });

      // Award isolated Maze stage XP on failure
      const snapshot = campaign.currentStageSnapshot || createMazeStageSnapshot(finalState);
      const stageDelta = calculateMazeStageDelta(finalState, snapshot, false, false);
      const mazeEventId = createMazeStageEventId(campaign.campaignId, finalState.stage, 'gameover');
      const mazeXpResult = recordMazeStageXp(stageDelta, mazeEventId);
      setProgressionState(mazeXpResult.state);
      setLastXpResult(mazeXpResult);
    } else {
      const eventId = `run-${runStartTimeRef.current}-${runInstanceIdRef.current}-${finalState.score}-${finalState.foodEaten}`;
      challengeEval = recordDailyChallengeRun(finalState, runStartTimeRef.current, undefined, {
        eventId,
      });

      // Award standard run XP (Classic, Zen, Rush) with collision-safe instance seed
      const runEventId = createRunEventId(finalState.mode, runStartTimeRef.current, runInstanceIdRef.current);
      const runXpResult = recordGameplayRunXp(finalState, runStartTimeRef.current, undefined, runEventId);
      setProgressionState(runXpResult.state);
      setLastXpResult(runXpResult);
    }

    // Award 50 XP per newly completed daily challenge through the Daily Reward Ledger
    if (challengeEval.newlyCompletedChallenges && challengeEval.newlyCompletedChallenges.length > 0) {
      for (const challengeId of challengeEval.newlyCompletedChallenges) {
        const claimResult = recordDailyRewardClaim(challengeId, challengeEval.state.activeDate, undefined, claimTime);
        if (claimResult.success) {
          setProgressionState(claimResult.progressionState);
        }
      }
    }

    setDailyState(challengeEval.state);

    if (newlyUnlocked.length > 0 || challengeEval.starsAwarded > 0) {
      soundEngine.play('achievement');
    }

    // Reconcile skins and trails in case this run achieved an unlock requirement (level, Zen wraps, etc.)
    const reconSkins = reconcileAndMigratePlayerSkins();
    setPlayerSkins(reconSkins.skinsState);
    const reconTrails = reconcileAndMigratePlayerTrails();
    setPlayerTrails(reconTrails.trailsState);

    setScreen('gameover');
  }, []);

  // Handle stage clear in Maze campaign
  const handleStageClear = useCallback((state: GameEngineState) => {
    screenRef.current = 'stage_clear';
    soundEngine.play('level_up');
    const campaign = mazeCampaignRef.current;
    const clearKey = `stage-${campaign ? campaign.campaignId : 'maze'}-${state.stage}-score-${state.score}`;
    if (recordedClearRef.current !== clearKey) {
      recordedClearRef.current = clearKey;
      const updated = recordStageClear(state.stage, state.score);
      setMazeProgress(updated);

      // Record daily challenge progression & Trophy Stars with stage delta
      const startTime = campaign ? campaign.startTime : runStartTimeRef.current;
      const deltaFood = campaign ? Math.max(0, state.foodEaten - campaign.creditedFood) : state.foodEaten;
      const deltaShields = campaign ? Math.max(0, (state.shieldsUsed || 0) - campaign.creditedShields) : (state.shieldsUsed || 0);
      const deltaCores = state.stageFoodEaten !== undefined ? state.stageFoodEaten : deltaFood;
      const isNewStageClear = campaign ? !campaign.clearedStages.has(state.stage) : true;

      if (campaign) {
        campaign.clearedStages.add(state.stage);
        campaign.creditedFood = state.foodEaten;
        campaign.creditedShields = state.shieldsUsed || 0;
      }

      const eventId = campaign ? `${campaign.campaignId}-stage-${state.stage}-clear` : `maze-stage-${state.stage}-${Date.now()}`;

      const challengeEval = recordDailyChallengeRun(state, startTime, undefined, {
        eventId,
        stageDelta: {
          foodEaten: deltaFood,
          shieldsUsed: deltaShields,
          mazeCores: deltaCores,
          isStageClear: isNewStageClear,
        },
      });

      // Award isolated Maze stage XP (+100 Stage Clear bonus)
      if (campaign) {
        const snapshot = campaign.currentStageSnapshot || createMazeStageSnapshot(state);
        const stageDelta = calculateMazeStageDelta(state, snapshot, true, false);
        const stageEventId = createMazeStageEventId(campaign.campaignId, state.stage, 'clear');
        const stageXpResult = recordMazeStageXp(stageDelta, stageEventId);
        setProgressionState(stageXpResult.state);
        setLastXpResult(stageXpResult);
      }

      // Award 50 XP per newly completed daily challenge through the Daily Reward Ledger
      if (challengeEval.newlyCompletedChallenges && challengeEval.newlyCompletedChallenges.length > 0) {
        for (const challengeId of challengeEval.newlyCompletedChallenges) {
          const claimResult = recordDailyRewardClaim(challengeId, challengeEval.state.activeDate, undefined, startTime);
          if (claimResult.success) {
            setProgressionState(claimResult.progressionState);
          }
        }
      }

      setDailyState(challengeEval.state);
      if (challengeEval.starsAwarded > 0) {
        soundEngine.play('achievement');
      }

      // Reconcile skins and trails for stage clear progression
      const reconSkins = reconcileAndMigratePlayerSkins();
      setPlayerSkins(reconSkins.skinsState);
      const reconTrails = reconcileAndMigratePlayerTrails();
      setPlayerTrails(reconTrails.trailsState);
    }
    setScreen('stage_clear');
  }, []);

  // Handle final campaign victory in Maze mode
  const handleCampaignVictory = useCallback((state: GameEngineState) => {
    screenRef.current = 'campaign_victory';
    soundEngine.play('achievement');
    const campaign = mazeCampaignRef.current;
    const victoryKey = `campaign-${campaign ? campaign.campaignId : 'maze'}-score-${state.score}`;
    if (recordedClearRef.current !== victoryKey) {
      recordedClearRef.current = victoryKey;
      const updated = recordCampaignCompletion(state.score);
      setMazeProgress(updated);
      const { isNewBest } = updateBestScore('maze', state.score);
      if (isNewBest) {
        setBestScores(loadBestScores());
      }
      const { stats: updatedStats, newlyUnlocked } = recordRunCompletion(state);
      setLifetimeStats(updatedStats);
      setAchievements(loadAchievements());

      // Record daily challenge progression & Trophy Stars
      const startTime = campaign ? campaign.startTime : runStartTimeRef.current;
      const deltaFood = campaign ? Math.max(0, state.foodEaten - campaign.creditedFood) : state.foodEaten;
      const deltaShields = campaign ? Math.max(0, (state.shieldsUsed || 0) - campaign.creditedShields) : (state.shieldsUsed || 0);
      const deltaCores = state.stageFoodEaten !== undefined ? state.stageFoodEaten : deltaFood;
      const isNewStageClear = campaign ? !campaign.clearedStages.has(6) : true;

      if (campaign) {
        campaign.clearedStages.add(6);
        campaign.creditedFood = state.foodEaten;
        campaign.creditedShields = state.shieldsUsed || 0;
      }

      const eventId = campaign ? `${campaign.campaignId}-victory` : `maze-victory-${Date.now()}`;

      const challengeEval = recordDailyChallengeRun(state, startTime, undefined, {
        eventId,
        stageDelta: {
          foodEaten: deltaFood,
          shieldsUsed: deltaShields,
          mazeCores: deltaCores,
          isStageClear: isNewStageClear,
        },
      });

      // Award isolated Maze stage XP (+100 Stage Clear + 500 Campaign Victory bonus)
      if (campaign) {
        const snapshot = campaign.currentStageSnapshot || createMazeStageSnapshot(state);
        const stageDelta = calculateMazeStageDelta(state, snapshot, true, true);
        const victoryEventId = createMazeStageEventId(campaign.campaignId, 6, 'victory');
        const victoryXpResult = recordMazeStageXp(stageDelta, victoryEventId);
        setProgressionState(victoryXpResult.state);
        setLastXpResult(victoryXpResult);
      }

      // Award 50 XP per newly completed daily challenge through the Daily Reward Ledger
      if (challengeEval.newlyCompletedChallenges && challengeEval.newlyCompletedChallenges.length > 0) {
        for (const challengeId of challengeEval.newlyCompletedChallenges) {
          const claimResult = recordDailyRewardClaim(challengeId, challengeEval.state.activeDate, undefined, startTime);
          if (claimResult.success) {
            setProgressionState(claimResult.progressionState);
          }
        }
      }

      setDailyState(challengeEval.state);

      // Reconcile skins and trails for campaign victory unlock (Apex Void & Void Horizon)
      const reconSkins = reconcileAndMigratePlayerSkins();
      setPlayerSkins(reconSkins.skinsState);
      const reconTrails = reconcileAndMigratePlayerTrails();
      setPlayerTrails(reconTrails.trailsState);
    }
    setScreen('campaign_victory');
  }, []);

  // Direction handler
  const handleSteer = useCallback((dir: Direction) => {
    if (screenRef.current === 'playing') {
      gameStateRef.current = queueDirection(gameStateRef.current, dir);
    }
  }, []);

  // Launch a specific curated Maze stage
  const startMazeStage = useCallback((stageNumber: number = 1) => {
    screenRef.current = 'playing';
    const now = Date.now();
    runStartTimeRef.current = now;
    runInstanceIdRef.current = Math.random().toString(36).slice(2, 9);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedMode('maze');
    selectedModeRef.current = 'maze';
    const targetStage = Math.max(1, Math.min(6, Math.floor(stageNumber)));
    const newState = createInitialMazeState(targetStage);
    mazeCampaignRef.current = {
      campaignId: `maze-campaign-${now}-${Math.random().toString(36).slice(2, 7)}`,
      startTime: now,
      creditedFood: 0,
      creditedShields: 0,
      clearedStages: new Set<number>(),
      currentStageSnapshot: createMazeStageSnapshot(newState),
    };
    gameStateRef.current = newState;
    accumulatorRef.current = 0;
    lastTimeRef.current = performance.now();
    rendererRef.current.particles.reset();
    rendererRef.current.reset();
    setIsNewRecord(false);
    setShowStageSelect(false);
    setShowDailyChallenges(false);
    recordedClearRef.current = null;
    setLastXpResult(null);
    const cfg = getMazeStage(targetStage);
    setHudState({
      score: 0,
      level: 1,
      length: newState.snake.length,
      mode: 'maze',
      hasShield: false,
      slowMoUntil: 0,
      combo: 1,
      stage: targetStage,
      stageName: cfg.name,
      stageFoodEaten: 0,
      isGateActive: false,
    });
    setScreen('playing');
    soundEngine.play('click');
  }, []);

  // Advance to next stage from StageClearModal
  const handleContinueNextStage = useCallback(() => {
    if (screenRef.current !== 'stage_clear') return;
    if (gameStateRef.current.stage >= 6) {
      handleCampaignVictory(gameStateRef.current);
      return;
    }
    const progression = advanceMazeStage(gameStateRef.current);
    if (progression.isCampaignWon) {
      handleCampaignVictory(progression.state);
      return;
    }
    gameStateRef.current = progression.state;
    accumulatorRef.current = 0;
    lastTimeRef.current = performance.now();
    // Maintain campaign's stable start timestamp and update current stage snapshot
    if (mazeCampaignRef.current) {
      runStartTimeRef.current = mazeCampaignRef.current.startTime;
      mazeCampaignRef.current.currentStageSnapshot = createMazeStageSnapshot(progression.state);
    }
    rendererRef.current.reset();
    recordedClearRef.current = null;
    const cfg = getMazeStage(progression.state.stage);
    setHudState({
      score: progression.state.score,
      level: progression.state.level,
      length: progression.state.snake.length,
      mode: 'maze',
      hasShield: progression.state.powerUps.hasShield,
      slowMoUntil: progression.state.powerUps.slowMoUntil,
      combo: 1,
      stage: progression.state.stage,
      stageName: cfg.name,
      stageFoodEaten: 0,
      isGateActive: false,
    });
    screenRef.current = 'playing';
    setScreen('playing');
    soundEngine.play('click');
  }, [handleCampaignVictory]);

  // Start / Restart game (Classic, Zen, Rush, or Maze)
  const startGame = useCallback((mode?: GameMode) => {
    const targetMode = mode || selectedModeRef.current;
    if (targetMode === 'maze') {
      startMazeStage(1);
      return;
    }
    screenRef.current = 'playing';
    runStartTimeRef.current = Date.now();
    runInstanceIdRef.current = Math.random().toString(36).slice(2, 9);
    mazeCampaignRef.current = null;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const newState = createInitialState(targetMode);
    gameStateRef.current = newState;
    accumulatorRef.current = 0;
    lastTimeRef.current = performance.now();
    rendererRef.current.particles.reset();
    rendererRef.current.reset();
    setIsNewRecord(false);
    setShowStageSelect(false);
    setShowDailyChallenges(false);
    recordedClearRef.current = null;
    setLastXpResult(null);
    setHudState({
      score: 0,
      level: 1,
      length: newState.snake.length,
      mode: targetMode,
      hasShield: false,
      slowMoUntil: 0,
      combo: 1,
      stage: 1,
      stageName: '',
      stageFoodEaten: 0,
      isGateActive: false,
    });
    setScreen('playing');
    soundEngine.play('click');
  }, [startMazeStage]);


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
    recordedClearRef.current = null;
    rendererRef.current.reset();
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



  // Auto-pause run when page or tab loses visibility (e.g., app switching, notifications, locking on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && screenRef.current === 'playing') {
        pauseGame();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseGame]);

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

      // When modals (How to Play, Settings, Pilot Dossier, Stage Select, Daily Challenges) are open, intercept keys
      if (modalsOpenRef.current) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowHowToPlay(false);
          setShowSettings(false);
          setShowStats(false);
          setShowStageSelect(false);
          setShowDailyChallenges(false);
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
          if (selectedModeRef.current === 'maze') {
            setShowStageSelect(true);
          } else {
            startGame();
          }
        }
        return;
      }

      // Stage clear continue
      if (screenRef.current === 'stage_clear') {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          handleContinueNextStage();
        }
        return;
      }

      // Campaign victory restart
      if (screenRef.current === 'campaign_victory') {
        if (key === 'Enter' || key === ' ' || key === 'r' || key === 'R') {
          e.preventDefault();
          startMazeStage(1);
        }
        return;
      }

      // Game over restart
      if (screenRef.current === 'gameover') {
        if (key === 'Enter' || key === ' ' || key === 'r' || key === 'R') {
          e.preventDefault();
          if (gameStateRef.current.mode === 'maze') {
            startMazeStage(gameStateRef.current.stage);
          } else {
            startGame();
          }
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
          if (gameStateRef.current.mode === 'maze') {
            startMazeStage(gameStateRef.current.stage);
          } else {
            startGame();
          }
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
          if (gameStateRef.current.mode === 'maze') {
            startMazeStage(gameStateRef.current.stage);
          } else {
            startGame();
          }
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
  }, [handleSteer, startGame, startMazeStage, handleContinueNextStage, resumeGame, pauseGame, toggleMute]);

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
              stage: result.state.stage,
              stageName: result.state.mode === 'maze' ? getMazeStage(result.state.stage).name : '',
              stageFoodEaten: result.state.stageFoodEaten,
              isGateActive: result.state.warpGate?.active || false,
            });
          } else if (result.state.combo === 1) {
            setHudState(prev => (prev.combo !== 1 ? { ...prev, combo: 1 } : prev));
          }

          if (result.shieldAbsorbed) {
            const head = result.state.snake[0];
            const px = (head.x + 0.5) * (canvas.width / result.state.gridWidth);
            const py = (head.y + 0.5) * (canvas.height / result.state.gridHeight);
            rendererRef.current.spawnShieldFlash(px, py);
            rendererRef.current.triggerScreenShake(10, 0.3);

            setHudState(prev => ({
              ...prev,
              hasShield: false,
            }));
          }

          if (!result.state.isAlive || result.state.isVictory) {
            // Maze Mode: Stage Clear or Campaign Victory
            if (result.state.mode === 'maze' && result.state.isStageClear) {
              if (result.state.warpGate) {
                const gx = (result.state.warpGate.x + 0.5) * (canvas.width / result.state.gridWidth);
                const gy = (result.state.warpGate.y + 0.5) * (canvas.height / result.state.gridHeight);
                rendererRef.current.spawnWarpEntry(gx, gy);
              }
              if (result.state.isCampaignComplete) {
                handleCampaignVictory(result.state);
              } else {
                handleStageClear(result.state);
              }
              break;
            }

            // Normal death / victory
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

      // Authoritative equipped skin resolution: must be unlocked, safe fallback to cyber_cyan
      const activeSkinId = (playerSkinsRef.current && isSkinUnlocked(playerSkinsRef.current.equippedSkinId, playerSkinsRef.current))
        ? playerSkinsRef.current.equippedSkinId
        : 'cyber_cyan';

      // Authoritative equipped trail resolution: must be unlocked, safe fallback to cyber_pulse
      const activeTrailId = (playerTrailsRef.current && isTrailUnlocked(playerTrailsRef.current.equippedTrailId, playerTrailsRef.current))
        ? playerTrailsRef.current.equippedTrailId
        : 'cyber_pulse';

      rendererRef.current.render(
        ctx,
        canvas.width,
        canvas.height,
        gameStateRef.current,
        alpha,
        {
          visualEffects: settingsRef.current.visualEffects,
          skin: activeSkinId,
          trail: activeTrailId,
          isPlaying: screenRef.current === 'playing',
        }
      );

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleGameOver, handleStageClear, handleCampaignVictory]);

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
            bestScore={hudState.mode === 'maze' ? (mazeProgress.bestCampaignScore || 0) : bestScores[hudState.mode]}
            level={hudState.level}
            length={hudState.length}
            mode={hudState.mode}
            hasShield={hudState.hasShield}
            slowMoUntil={hudState.slowMoUntil}
            combo={hudState.combo}
            stage={hudState.stage}
            stageName={hudState.stageName}
            stageFoodEaten={hudState.stageFoodEaten}
            isGateActive={hudState.isGateActive}
            onPause={pauseGame}
            onRestart={() => (hudState.mode === 'maze' ? startMazeStage(hudState.stage) : startGame(hudState.mode))}
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
        <TitleScreen
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          bestScores={bestScores}
          mazeProgress={mazeProgress}
          progression={progressionState}
          onStartGame={() => (selectedMode === 'maze' ? setShowStageSelect(true) : startGame(selectedMode))}
          onOpenStageSelect={() => setShowStageSelect(true)}
          onOpenDailyChallenges={() => setShowDailyChallenges(true)}
          onOpenSkinCollection={() => {
            setCustomizationTab('skins');
            setShowSkinCollection(true);
          }}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenStats={() => setShowStats(true)}
          sfxEnabled={settings.audio.sfxEnabled}
          onToggleMute={toggleMute}
          trophyStars={dailyState.lifetimeStars}
          dailyCompletedCount={dailyState.challenges.filter(c => c.completed).length}
        />
      )}

      {screen === 'paused' && (
        <PauseModal
          state={gameStateRef.current}
          bestScore={gameStateRef.current.mode === 'maze' ? (mazeProgress.bestCampaignScore || 0) : bestScores[gameStateRef.current.mode]}
          onResume={resumeGame}
          onRestart={() => (gameStateRef.current.mode === 'maze' ? startMazeStage(gameStateRef.current.stage) : startGame(gameStateRef.current.mode))}
          onMainMenu={returnToMainMenu}
        />
      )}

      {screen === 'gameover' && (
        <GameOverModal
          state={gameStateRef.current}
          bestScore={gameStateRef.current.mode === 'maze' ? (mazeProgress.bestCampaignScore || 0) : bestScores[gameStateRef.current.mode]}
          isNewRecord={isNewRecord}
          xpEarnResult={lastXpResult}
          progression={progressionState}
          onPlayAgain={() => (gameStateRef.current.mode === 'maze' ? startMazeStage(gameStateRef.current.stage) : startGame(gameStateRef.current.mode))}
          onMainMenu={returnToMainMenu}
          onOpenStats={() => setShowStats(true)}
          onCampaignSelect={() => {
            setScreen('title');
            setShowStageSelect(true);
          }}
        />
      )}

      {screen === 'stage_clear' && (
        <StageClearModal
          state={gameStateRef.current}
          xpEarnResult={lastXpResult}
          progression={progressionState}
          onContinue={handleContinueNextStage}
          onCampaignSelect={() => {
            setScreen('title');
            setShowStageSelect(true);
          }}
          onMainMenu={returnToMainMenu}
        />
      )}

      {screen === 'campaign_victory' && (
        <CampaignVictoryModal
          state={gameStateRef.current}
          progress={mazeProgress}
          xpEarnResult={lastXpResult}
          progression={progressionState}
          onReplayCampaign={() => startMazeStage(1)}
          onCampaignSelect={() => {
            setScreen('title');
            setShowStageSelect(true);
          }}
          onMainMenu={returnToMainMenu}
        />
      )}

      {showStageSelect && (
        <MazeStageSelectModal
          progress={mazeProgress}
          onSelectStage={startMazeStage}
          onClose={() => setShowStageSelect(false)}
        />
      )}

      {showDailyChallenges && (
        <DailyChallengesModal
          dailyState={dailyState}
          onClose={() => setShowDailyChallenges(false)}
        />
      )}

      {showSkinCollection && (
        <SkinCollectionModal
          playerSkins={playerSkins}
          playerTrails={playerTrails}
          progression={progressionState}
          mazeProgress={mazeProgress}
          lifetimeStats={lifetimeStats}
          onEquipSkin={handleEquipSkin}
          onEquipTrail={handleEquipTrail}
          onClose={() => setShowSkinCollection(false)}
          visualEffects={settings.visualEffects}
          initialTab={customizationTab}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          equippedSkinId={playerSkins.equippedSkinId}
          equippedTrailId={playerTrails.equippedTrailId}
          onUpdateSettings={handleUpdateSettings}
          onResetScores={handleResetScores}
          onOpenSkinCollection={(tab) => {
            setShowSettings(false);
            setCustomizationTab(tab || 'skins');
            setShowSkinCollection(true);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showStats && (
        <StatsModal
          stats={lifetimeStats}
          achievements={achievements}
          progression={progressionState}
          onResetStats={handleResetStats}
          onClose={() => setShowStats(false)}
        />
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
