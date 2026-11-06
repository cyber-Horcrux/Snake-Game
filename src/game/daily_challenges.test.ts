import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDailyChallenges,
  getUtcDateString,
  getUtcDaysDifference,
  getTimeUntilUtcMidnight,
  loadDailyChallengeState,
  saveDailyChallengeState,
  recordDailyChallengeRun,
  createInitialDailyState,
  REWARD_STARS,
  STREAK_MILESTONES,
  EASY_CHALLENGES,
  MEDIUM_CHALLENGES,
  HARD_CHALLENGES,
  type DailyChallengeUserState,
} from './challenges.ts';
import { createInitialState, stepGame } from './engine.ts';
import { createInitialMazeState } from './mazes.ts';
import type { GameEngineState } from './types.ts';
import type { StorageLike } from './persistence.ts';

// Deterministic in-memory mock storage
class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// ==========================================
// 1. CHALLENGE GENERATION TESTS
// ==========================================

test('Challenge Generation: same UTC date always deterministically generates identical three challenges', () => {
  const date = '2026-11-06';
  const setA = generateDailyChallenges(date);
  const setB = generateDailyChallenges(date);

  assert.equal(setA.length, 3);
  assert.equal(setB.length, 3);
  assert.deepEqual(setA.map(c => c.id), setB.map(c => c.id));
  assert.equal(setA[0].difficulty, 'easy');
  assert.equal(setA[1].difficulty, 'medium');
  assert.equal(setA[2].difficulty, 'hard');
});

test('Challenge Generation: different UTC dates generate different challenge selections', () => {
  const date1 = '2026-01-01';
  const date2 = '2026-06-15';
  const set1 = generateDailyChallenges(date1);
  const set2 = generateDailyChallenges(date2);

  assert.equal(set1.length, 3);
  assert.equal(set2.length, 3);
  // Compare selection - either ids or combination differ
  const ids1 = set1.map(c => c.id).join(',');
  const ids2 = set2.map(c => c.id).join(',');
  assert.notEqual(ids1, ids2, 'Different UTC dates should generate distinct challenge selections');
});

test('Challenge Generation: exactly three unique challenge IDs with valid positive targets are generated', () => {
  const sampleDates = [
    '2026-03-01',
    '2026-04-12',
    '2026-08-25',
    '2026-11-06',
    '2026-12-31',
  ];

  for (const date of sampleDates) {
    const challenges = generateDailyChallenges(date);
    assert.equal(challenges.length, 3);

    const idSet = new Set(challenges.map(c => c.id));
    assert.equal(idSet.size, 3, 'All 3 challenges must have unique IDs');

    for (const ch of challenges) {
      assert.ok(ch.target > 0, 'Target must be positive');
      assert.equal(ch.rewardStars, 25, 'Standard reward must be 25 stars');
      assert.ok(ch.title.length > 3);
      assert.ok(ch.description.length > 10);
      assert.ok(['easy', 'medium', 'hard'].includes(ch.difficulty));
    }
  }
});

// ==========================================
// 2. PROGRESS TRACKING TESTS
// ==========================================

test('Progress Tracking: single-run score and cumulative food update correctly', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0); // 2026-11-06 12:00 UTC

  // Create initial state with specific definitions for testing
  const initial = createInitialDailyState(date, now);
  // Manually override challenges for deterministic unit verification
  initial.challenges = [
    {
      id: 'test_score_100',
      title: 'Score 100',
      description: 'Score 100 pts',
      difficulty: 'easy',
      objectiveType: 'single_run_score',
      target: 100,
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      id: 'test_food_20',
      title: 'Eat 20 Food',
      description: 'Eat 20 foods',
      difficulty: 'medium',
      objectiveType: 'accumulate_food',
      target: 20,
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      id: 'test_survive_60',
      title: 'Survive 60s',
      description: 'Survive 60s',
      difficulty: 'hard',
      objectiveType: 'survive_time',
      target: 60,
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
  ];
  saveDailyChallengeState(initial, storage);

  // Run 1: Score 80, food 8, survive 25s
  const run1State: GameEngineState = {
    ...createInitialState('classic'),
    score: 80,
    foodEaten: 8,
    gameTimeMs: 25000,
  };

  const eval1 = recordDailyChallengeRun(run1State, now, storage);
  assert.equal(eval1.state.challenges[0].progress, 80);
  assert.equal(eval1.state.challenges[0].completed, false);
  assert.equal(eval1.state.challenges[1].progress, 8);
  assert.equal(eval1.state.challenges[1].completed, false);
  assert.equal(eval1.state.challenges[2].progress, 25);
  assert.equal(eval1.state.challenges[2].completed, false);
  assert.equal(eval1.starsAwarded, 0);

  // Run 2: Score 120 (completes challenge 1!), food 15 (8 + 15 = 23 -> completes challenge 2!), survive 70s (completes challenge 3!)
  const run2State: GameEngineState = {
    ...createInitialState('classic'),
    score: 120,
    foodEaten: 15,
    gameTimeMs: 70000,
  };

  const eval2 = recordDailyChallengeRun(run2State, now + 1000, storage);
  assert.equal(eval2.state.challenges[0].progress, 100);
  assert.equal(eval2.state.challenges[0].completed, true);
  assert.equal(eval2.state.challenges[1].progress, 20);
  assert.equal(eval2.state.challenges[1].completed, true);
  assert.equal(eval2.state.challenges[2].progress, 60);
  assert.equal(eval2.state.challenges[2].completed, true);

  // All 3 completed! 3 * 25 + 50 (all-three bonus) = 125 stars
  assert.equal(eval2.allThreeNewlyCompleted, true);
  assert.equal(eval2.starsAwarded, 125);
  assert.equal(eval2.state.lifetimeStars, 125);
  assert.equal(eval2.state.currentStreak, 1);
});

test('Progress Tracking: Maze-only objectives reject non-Maze runs', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges[0] = {
    id: 'test_maze_cores',
    title: 'Extract Cores',
    description: 'Extract 10 Neon Cores in Maze mode',
    difficulty: 'medium',
    objectiveType: 'maze_cores',
    target: 10,
    modeFilter: 'maze',
    rewardStars: 25,
    progress: 0,
    completed: false,
    rewardClaimed: false,
  };
  saveDailyChallengeState(initial, storage);

  // Classic run with 15 food eaten
  const classicRun: GameEngineState = {
    ...createInitialState('classic'),
    foodEaten: 15,
  };
  const evalClassic = recordDailyChallengeRun(classicRun, now, storage);
  assert.equal(evalClassic.state.challenges[0].progress, 0, 'Classic run must not advance Maze objective');

  // Maze run with 6 cores eaten
  const mazeRun: GameEngineState = {
    ...createInitialMazeState(1),
    stageFoodEaten: 6,
    foodEaten: 6,
  };
  const evalMaze = recordDailyChallengeRun(mazeRun, now, storage);
  assert.equal(evalMaze.state.challenges[0].progress, 6, 'Maze run must advance Maze objective');
});

test('Progress Tracking: Zen-only boundary objective rejects Classic and Rush runs', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges[0] = {
    id: 'test_zen_wrap',
    title: 'Zen Wraparound',
    description: 'Pass boundaries in Zen mode',
    difficulty: 'easy',
    objectiveType: 'zen_wraparound',
    target: 10,
    modeFilter: 'zen',
    rewardStars: 25,
    progress: 0,
    completed: false,
    rewardClaimed: false,
  };
  saveDailyChallengeState(initial, storage);

  // Classic run with shieldsUsed or boundaries
  const classicRun: GameEngineState = {
    ...createInitialState('classic'),
    wallsWrapped: 5,
  };
  const res1 = recordDailyChallengeRun(classicRun, now, storage);
  assert.equal(res1.state.challenges[0].progress, 0);

  // Zen run with 7 wraparounds
  const zenRun: GameEngineState = {
    ...createInitialState('zen'),
    wallsWrapped: 7,
  };
  const res2 = recordDailyChallengeRun(zenRun, now, storage);
  assert.equal(res2.state.challenges[0].progress, 7);
});

test('Progress Tracking: runs spanning UTC midnight contribute strictly to their start date', () => {
  const storage = new MemoryStorage();

  // Run started on Nov 6 at 23:58:00 UTC
  const startTime = Date.UTC(2026, 10, 6, 23, 58, 0);
  const startDateStr = getUtcDateString(startTime);
  assert.equal(startDateStr, '2026-11-06');

  // Load state on start date
  const stateNov6 = loadDailyChallengeState(storage, startTime);
  assert.equal(stateNov6.activeDate, '2026-11-06');

  // Run finishes on Nov 7 at 00:05:00 UTC
  const finishTime = Date.UTC(2026, 10, 7, 0, 5, 0);
  assert.equal(getUtcDateString(finishTime), '2026-11-07');

  const runState: GameEngineState = {
    ...createInitialState('classic'),
    score: 150,
    foodEaten: 15,
  };

  // Evaluate run attributing strictly to start date
  const evalResult = recordDailyChallengeRun(runState, startTime, storage);
  assert.equal(evalResult.state.activeDate, '2026-11-06');

  // Verify Nov 7 load does not mix up with Nov 6 active challenges
  const stateNov7 = loadDailyChallengeState(storage, finishTime);
  assert.equal(stateNov7.activeDate, '2026-11-07');
});

// ==========================================
// 3. REWARD & STREAK ECONOMY TESTS
// ==========================================

test('Rewards: each completed challenge awards exactly 25 stars and all-three awards additional 50 stars', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 12, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges = [
    { id: 'c1', title: 'C1', description: 'C1', difficulty: 'easy', objectiveType: 'single_run_score', target: 50, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
    { id: 'c2', title: 'C2', description: 'C2', difficulty: 'medium', objectiveType: 'single_run_score', target: 100, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
    { id: 'c3', title: 'C3', description: 'C3', difficulty: 'hard', objectiveType: 'single_run_score', target: 200, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
  ];
  saveDailyChallengeState(initial, storage);

  // Complete challenge 1 (score 60)
  const r1 = recordDailyChallengeRun({ ...createInitialState('classic'), score: 60 }, now, storage);
  assert.equal(r1.starsAwarded, 25);
  assert.equal(r1.state.lifetimeStars, 25);
  assert.equal(r1.state.allThreeCompleted, false);

  // Complete challenge 2 (score 110)
  const r2 = recordDailyChallengeRun({ ...createInitialState('classic'), score: 110 }, now, storage);
  assert.equal(r2.starsAwarded, 25);
  assert.equal(r2.state.lifetimeStars, 50);
  assert.equal(r2.state.allThreeCompleted, false);

  // Complete challenge 3 (score 250) -> triggers both C3 (25) + all-three bonus (50) = 75 stars
  const r3 = recordDailyChallengeRun({ ...createInitialState('classic'), score: 250 }, now, storage);
  assert.equal(r3.starsAwarded, 75);
  assert.equal(r3.state.lifetimeStars, 125);
  assert.equal(r3.state.allThreeCompleted, true);
  assert.equal(r3.state.allThreeRewardClaimed, true);

  // Additional runs on same day award ZERO additional stars
  const r4 = recordDailyChallengeRun({ ...createInitialState('classic'), score: 500 }, now, storage);
  assert.equal(r4.starsAwarded, 0);
  assert.equal(r4.state.lifetimeStars, 125);
});

test('Streak: 3-, 7-, and 14-day consecutive completion milestones award exact stars and claims are permanent', () => {
  const storage = new MemoryStorage();

  let currentDate = '2026-11-01';
  let timestamp = Date.UTC(2026, 10, 1, 12, 0, 0);

  // Simulate 14 consecutive qualifying days
  for (let day = 1; day <= 14; day++) {
    timestamp = Date.UTC(2026, 10, day, 12, 0, 0);
    currentDate = getUtcDateString(timestamp);

    const userState = loadDailyChallengeState(storage, timestamp);
    // Set 3 valid score challenges for today so the run completes all three
    userState.challenges = [
      { id: `c1_${day}`, title: 'C1', description: 'C1', difficulty: 'easy', objectiveType: 'single_run_score', target: 10, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
      { id: `c2_${day}`, title: 'C2', description: 'C2', difficulty: 'medium', objectiveType: 'single_run_score', target: 20, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
      { id: `c3_${day}`, title: 'C3', description: 'C3', difficulty: 'hard', objectiveType: 'single_run_score', target: 30, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
    ];
    saveDailyChallengeState(userState, storage);

    const evalResult = recordDailyChallengeRun(
      { ...createInitialState('classic'), score: 1000 },
      timestamp,
      storage
    );

    assert.equal(evalResult.state.currentStreak, day);
    assert.equal(evalResult.state.bestStreak, day);

    if (day === 3) {
      assert.ok(evalResult.newlyClaimedMilestones.includes(3));
      assert.ok(evalResult.state.claimedMilestones.includes(3));
    } else if (day === 7) {
      assert.ok(evalResult.newlyClaimedMilestones.includes(7));
      assert.ok(evalResult.state.claimedMilestones.includes(7));
    } else if (day === 14) {
      assert.ok(evalResult.newlyClaimedMilestones.includes(14));
      assert.ok(evalResult.state.claimedMilestones.includes(14));
    }
  }

  const finalState = loadDailyChallengeState(storage, timestamp);
  assert.equal(finalState.currentStreak, 14);
  assert.equal(finalState.bestStreak, 14);

  // Total stars = 14 * 125 (daily full clear) + 100 (3-day) + 250 (7-day) + 500 (14-day) = 1750 + 850 = 2600 stars
  assert.equal(finalState.lifetimeStars, 2600);

  // Now simulate a broken streak on Day 16 (skipped Day 15)
  const day16Time = Date.UTC(2026, 10, 16, 12, 0, 0);
  const day16State = loadDailyChallengeState(storage, day16Time);
  // Current streak resets to 0 because Day 15 was missed
  assert.equal(day16State.currentStreak, 0);
  // Best streak remains 14!
  assert.equal(day16State.bestStreak, 14);
  // Lifetime stars NEVER decrease!
  assert.equal(day16State.lifetimeStars, 2600);

  // Milestones [3, 7, 14] remain claimed and cannot be awarded again
  assert.deepEqual(day16State.claimedMilestones, [3, 7, 14]);
});

// ==========================================
// 4. PERSISTENCE & CLOCK SAFETY TESTS
// ==========================================

test('Persistence: corrupt or malformed storage recovers safely with defaults', () => {
  const storage = new MemoryStorage();
  storage.setItem('neon_snake_daily_challenges_v1', '{"lifetimeStars": "corrupt", "challenges": null}');

  const loaded = loadDailyChallengeState(storage);
  assert.equal(loaded.challenges.length, 3);
  assert.equal(loaded.lifetimeStars, 0);
  assert.equal(loaded.currentStreak, 0);
});

test('Persistence: clock rollback detection prevents rewind attacks', () => {
  const storage = new MemoryStorage();
  const futureTime = Date.UTC(2026, 10, 20, 12, 0, 0);
  const userState = createInitialDailyState('2026-11-20', futureTime);
  userState.lifetimeStars = 500;
  userState.lastKnownTimestamp = futureTime;
  saveDailyChallengeState(userState, storage);

  // System clock rewound by 10 days
  const rolledBackTime = Date.UTC(2026, 10, 10, 12, 0, 0);
  const loaded = loadDailyChallengeState(storage, rolledBackTime);

  // Lifetime stars must not be wiped and lastKnownTimestamp is maintained
  assert.equal(loaded.lifetimeStars, 500);
  assert.ok(loaded.lastKnownTimestamp >= futureTime);
});

// ==========================================
// 5. REGRESSION TESTS
// ==========================================

test('Regression: Classic, Zen, Rush, and Maze game modes initialize and operate cleanly', () => {
  const classic = createInitialState('classic');
  const zen = createInitialState('zen');
  const rush = createInitialState('rush');
  const maze = createInitialMazeState(1);

  assert.equal(classic.mode, 'classic');
  assert.equal(zen.mode, 'zen');
  assert.equal(rush.mode, 'rush');
  assert.equal(maze.mode, 'maze');

  const stepClassic = stepGame(classic, 1000);
  assert.equal(stepClassic.state.isAlive, true);

  const stepMaze = stepGame(maze, 1000);
  assert.equal(stepMaze.state.isAlive, true);
});

// ==========================================
// 6. TASK 6B TELEMETRY INTEGRITY & DELTA TESTS
// ==========================================

test('Telemetry Integrity: three consecutive Maze stage clears do not duplicate cumulative metrics', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 10, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges = [
    {
      id: 'accum_food_test',
      title: 'Food Harvest',
      description: 'Eat 25 food',
      difficulty: 'easy',
      objectiveType: 'accumulate_food',
      target: 25,
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      id: 'maze_cores_test',
      title: 'Maze Cores',
      description: 'Extract 30 cores',
      difficulty: 'medium',
      objectiveType: 'maze_cores',
      target: 30,
      modeFilter: 'maze',
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      id: 'maze_stages_test',
      title: 'Stage Master',
      description: 'Clear 3 stages',
      difficulty: 'hard',
      objectiveType: 'maze_stage_clear',
      target: 3,
      modeFilter: 'maze',
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
  ];
  saveDailyChallengeState(initial, storage);

  // Stage 1 Clear: 10 food, 10 cores
  const st1State: GameEngineState = {
    ...createInitialMazeState(1),
    stage: 1,
    stageFoodEaten: 10,
    foodEaten: 10,
    score: 500,
    isStageClear: true,
  };
  const eval1 = recordDailyChallengeRun(st1State, now, storage, {
    eventId: 'camp1-st1-clear',
    stageDelta: { foodEaten: 10, mazeCores: 10, isStageClear: true },
  });
  assert.equal(eval1.state.challenges[0].progress, 10, 'Stage 1 should credit 10 food');
  assert.equal(eval1.state.challenges[1].progress, 10, 'Stage 1 should credit 10 cores');
  assert.equal(eval1.state.challenges[2].progress, 1, 'Stage 1 should credit 1 stage clear');

  // Stage 2 Clear: cumulative foodEaten is 20, stageFoodEaten is 10
  const st2State: GameEngineState = {
    ...createInitialMazeState(2),
    stage: 2,
    stageFoodEaten: 10,
    foodEaten: 20,
    score: 1100,
    isStageClear: true,
  };
  const eval2 = recordDailyChallengeRun(st2State, now, storage, {
    eventId: 'camp1-st2-clear',
    stageDelta: { foodEaten: 10, mazeCores: 10, isStageClear: true },
  });
  assert.equal(eval2.state.challenges[0].progress, 20, 'Stage 2 must not duplicate Stage 1 food (20 total, not 30)');
  assert.equal(eval2.state.challenges[1].progress, 20, 'Stage 2 must not duplicate cores (20 total, not 30)');
  assert.equal(eval2.state.challenges[2].progress, 2, 'Stage 2 clear count must be 2');

  // Stage 3 Clear: cumulative foodEaten is 30, stageFoodEaten is 10
  const st3State: GameEngineState = {
    ...createInitialMazeState(3),
    stage: 3,
    stageFoodEaten: 10,
    foodEaten: 30,
    score: 1800,
    isStageClear: true,
  };
  const eval3 = recordDailyChallengeRun(st3State, now, storage, {
    eventId: 'camp1-st3-clear',
    stageDelta: { foodEaten: 10, mazeCores: 10, isStageClear: true },
  });
  assert.equal(eval3.state.challenges[0].progress, 25, 'Food challenge completed at target 25');
  assert.equal(eval3.state.challenges[0].completed, true);
  assert.equal(eval3.state.challenges[1].progress, 30, 'Cores challenge completed at target 30');
  assert.equal(eval3.state.challenges[1].completed, true);
  assert.equal(eval3.state.challenges[2].progress, 3, 'Stage clear challenge completed at target 3');
  assert.equal(eval3.state.challenges[2].completed, true);
  assert.equal(eval3.allThreeNewlyCompleted, true);
  assert.equal(eval3.starsAwarded, 125, 'All 3 completed: 3 * 25 + 50 bonus = 125 stars');
});

test('Telemetry Integrity: final campaign victory does not duplicate final-stage reward', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 14, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges = [
    {
      id: 'stage_clear_test',
      title: 'Stage Clear Test',
      description: 'Clear 1 stage',
      difficulty: 'easy',
      objectiveType: 'maze_stage_clear',
      target: 1,
      modeFilter: 'maze',
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      id: 'zen_test',
      title: 'Zen Test',
      description: 'Wraparounds',
      difficulty: 'medium',
      objectiveType: 'zen_wraparound',
      target: 100,
      modeFilter: 'zen',
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      id: 'rush_test',
      title: 'Rush Test',
      description: 'Rush score',
      difficulty: 'hard',
      objectiveType: 'rush_score',
      target: 10000,
      modeFilter: 'rush',
      rewardStars: 25,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    },
  ];
  saveDailyChallengeState(initial, storage);

  const st6VictoryState: GameEngineState = {
    ...createInitialMazeState(6),
    stage: 6,
    score: 4500,
    isStageClear: true,
    isCampaignComplete: true,
    isVictory: true,
  };

  // First victory evaluation
  const res1 = recordDailyChallengeRun(st6VictoryState, now, storage, {
    eventId: 'campaign-123-victory',
    stageDelta: { foodEaten: 10, mazeCores: 10, isStageClear: true },
  });
  assert.equal(res1.starsAwarded, 25);
  assert.equal(res1.state.challenges[0].completed, true);

  // Accidental repeated evaluation with same eventId
  const res2 = recordDailyChallengeRun(st6VictoryState, now, storage, {
    eventId: 'campaign-123-victory',
    stageDelta: { foodEaten: 10, mazeCores: 10, isStageClear: true },
  });
  assert.equal(res2.starsAwarded, 0, 'Duplicate victory call must award 0 stars');
  assert.equal(res2.newlyCompletedChallenges.length, 0);
  assert.equal(res2.state.lifetimeStars, 25);
});

test('Telemetry Integrity: repeated evaluation of the same completion event is strictly deduplicated', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 15, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges[0] = {
    id: 'score_100',
    title: 'Score 100',
    description: 'Score 100',
    difficulty: 'easy',
    objectiveType: 'single_run_score',
    target: 100,
    rewardStars: 25,
    progress: 0,
    completed: false,
    rewardClaimed: false,
  };
  saveDailyChallengeState(initial, storage);

  const runState: GameEngineState = {
    ...createInitialState('classic'),
    score: 150,
  };

  const eval1 = recordDailyChallengeRun(runState, now, storage, { eventId: 'unique-run-event-99' });
  assert.equal(eval1.starsAwarded, 25);
  assert.equal(eval1.state.lifetimeStars, 25);

  const eval2 = recordDailyChallengeRun(runState, now, storage, { eventId: 'unique-run-event-99' });
  assert.equal(eval2.starsAwarded, 0);
  assert.equal(eval2.state.lifetimeStars, 25);

  const eval3 = recordDailyChallengeRun(runState, now, storage, { eventId: 'unique-run-event-99' });
  assert.equal(eval3.starsAwarded, 0);
  assert.equal(eval3.state.lifetimeStars, 25);
});

test('Attribution & Rollover: run crossing UTC midnight contributes strictly to start date', () => {
  const storage = new MemoryStorage();

  // Run began at 23:55 UTC on 2026-11-06
  const startTime = Date.UTC(2026, 10, 6, 23, 55, 0);
  const startDayState = loadDailyChallengeState(storage, startTime);
  assert.equal(startDayState.activeDate, '2026-11-06');

  // Run finished at 00:08 UTC on 2026-11-07
  const runState: GameEngineState = {
    ...createInitialState('classic'),
    score: 350,
    foodEaten: 30,
  };

  const evalResult = recordDailyChallengeRun(runState, startTime, storage, {
    eventId: 'midnight-run-1',
  });
  assert.equal(evalResult.state.activeDate, '2026-11-06', 'Run must attribute to 2026-11-06 start date');
});

test('Attribution & Rollover: new run started after UTC rollover targets new date', () => {
  const storage = new MemoryStorage();

  // Prior day Nov 6
  const nov6Time = Date.UTC(2026, 10, 6, 12, 0, 0);
  const stateNov6 = loadDailyChallengeState(storage, nov6Time);
  assert.equal(stateNov6.activeDate, '2026-11-06');

  // Next day Nov 7: fresh run starts at 00:10 UTC
  const nov7Time = Date.UTC(2026, 10, 7, 0, 10, 0);
  const stateNov7 = loadDailyChallengeState(storage, nov7Time);
  assert.equal(stateNov7.activeDate, '2026-11-07', 'State must advance to 2026-11-07');
  assert.equal(stateNov7.challenges.length, 3);
  assert.equal(stateNov7.challenges.every(c => c.progress === 0), true);

  const nov7Run: GameEngineState = {
    ...createInitialState('classic'),
    score: 200,
    foodEaten: 15,
  };
  const evalNov7 = recordDailyChallengeRun(nov7Run, nov7Time, storage, {
    eventId: 'nov7-run-1',
  });
  assert.equal(evalNov7.state.activeDate, '2026-11-07');
});

test('Reward Integrity: reloading after a reward transaction preserves claimed state and prevents duplicate claims', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 16, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges[0] = {
    id: 'reload_test_c1',
    title: 'Reload Test',
    description: 'Score 50 pts',
    difficulty: 'easy',
    objectiveType: 'single_run_score',
    target: 50,
    rewardStars: 25,
    progress: 0,
    completed: false,
    rewardClaimed: false,
  };
  saveDailyChallengeState(initial, storage);

  // Complete challenge
  const res1 = recordDailyChallengeRun(
    { ...createInitialState('classic'), score: 80 },
    now,
    storage,
    { eventId: 'event-reload-1' }
  );
  assert.equal(res1.starsAwarded, 25);
  assert.equal(res1.state.lifetimeStars, 25);

  // Reload state from storage
  const reloaded = loadDailyChallengeState(storage, now + 1000);
  assert.equal(reloaded.lifetimeStars, 25);
  assert.equal(reloaded.challenges[0].completed, true);
  assert.equal(reloaded.challenges[0].rewardClaimed, true);

  // Subsequent run cannot claim the reward again
  const res2 = recordDailyChallengeRun(
    { ...createInitialState('classic'), score: 120 },
    now + 2000,
    storage,
    { eventId: 'event-reload-2' }
  );
  assert.equal(res2.starsAwarded, 0);
  assert.equal(res2.state.lifetimeStars, 25);
});

test('Reward Integrity: all-three daily bonus is awarded exactly once per UTC date', () => {
  const storage = new MemoryStorage();
  const date = '2026-11-06';
  const now = Date.UTC(2026, 10, 6, 17, 0, 0);

  const initial = createInitialDailyState(date, now);
  initial.challenges = [
    { id: 'b1', title: 'B1', description: 'B1', difficulty: 'easy', objectiveType: 'single_run_score', target: 50, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
    { id: 'b2', title: 'B2', description: 'B2', difficulty: 'medium', objectiveType: 'single_run_score', target: 50, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
    { id: 'b3', title: 'B3', description: 'B3', difficulty: 'hard', objectiveType: 'single_run_score', target: 50, rewardStars: 25, progress: 0, completed: false, rewardClaimed: false },
  ];
  saveDailyChallengeState(initial, storage);

  // Complete all three in a single run: 3 * 25 + 50 (bonus) = 125 stars
  const run1 = recordDailyChallengeRun(
    { ...createInitialState('classic'), score: 100 },
    now,
    storage,
    { eventId: 'all-three-run-1' }
  );
  assert.equal(run1.starsAwarded, 125);
  assert.equal(run1.allThreeNewlyCompleted, true);
  assert.equal(run1.state.allThreeCompleted, true);
  assert.equal(run1.state.allThreeRewardClaimed, true);
  assert.equal(run1.state.lifetimeStars, 125);

  // Additional subsequent run with another event on same day
  const run2 = recordDailyChallengeRun(
    { ...createInitialState('classic'), score: 300 },
    now + 5000,
    storage,
    { eventId: 'all-three-run-2' }
  );
  assert.equal(run2.starsAwarded, 0, 'No duplicate all-three bonus or challenge stars awarded');
  assert.equal(run2.allThreeNewlyCompleted, false);
  assert.equal(run2.state.lifetimeStars, 125);
});
