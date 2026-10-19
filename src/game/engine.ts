/**
 * Pure, deterministic Snake Game Engine
 * Free of DOM/React dependencies for fast, decoupled unit testing and 60fps rendering.
 */
import type {
  ActivePowerUps,
  Direction,
  FoodItem,
  GameAudioEvent,
  GameEngineState,
  GameMode,
  GridCoord,
} from './types.ts';
import {
  GRID_SIZE,
  INITIAL_SNAKE_LENGTH,
  MODE_SPEEDS,
  POINTS,
  POWER_UPS,
  FOOD_PROGRESSION_PER_LEVEL,
} from './constants.ts';

export interface StepResult {
  state: GameEngineState;
  events: GameAudioEvent[];
  eatenFood?: FoodItem;
  shieldAbsorbed?: boolean;
}

export function isOpposite(dirA: Direction, dirB: Direction): boolean {
  return (
    (dirA === 'UP' && dirB === 'DOWN') ||
    (dirA === 'DOWN' && dirB === 'UP') ||
    (dirA === 'LEFT' && dirB === 'RIGHT') ||
    (dirA === 'RIGHT' && dirB === 'LEFT')
  );
}

export function getDirectionOffset(dir: Direction): GridCoord {
  switch (dir) {
    case 'UP':
      return { x: 0, y: -1 };
    case 'DOWN':
      return { x: 0, y: 1 };
    case 'LEFT':
      return { x: -1, y: 0 };
    case 'RIGHT':
      return { x: 1, y: 0 };
  }
}

/**
 * Generates an unoccupied random coordinate on the grid.
 * Returns null if grid is completely full.
 */
export function findEmptyCell(
  gridWidth: number,
  gridHeight: number,
  occupiedCells: GridCoord[],
  rng: () => number = Math.random
): GridCoord | null {
  const occupiedSet = new Set<string>();
  for (const c of occupiedCells) {
    occupiedSet.add(`${c.x},${c.y}`);
  }

  const totalCells = gridWidth * gridHeight;
  if (occupiedSet.size >= totalCells) {
    return null;
  }

  // If mostly empty, try random samples first (fast path)
  if (occupiedSet.size < totalCells * 0.75) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(rng() * gridWidth);
      const ry = Math.floor(rng() * gridHeight);
      if (!occupiedSet.has(`${rx},${ry}`)) {
        return { x: rx, y: ry };
      }
    }
  }

  // Fallback: list all free cells
  const freeCells: GridCoord[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (!occupiedSet.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) return null;
  const index = Math.floor(rng() * freeCells.length);
  return freeCells[index];
}

export function calculateTickInterval(
  mode: GameMode,
  level: number,
  isSlowMoActive: boolean
): number {
  const config = MODE_SPEEDS[mode];
  const rawInterval = config.startMs - (level - 1) * config.speedStepMs;
  const clampedInterval = Math.max(config.minMs, rawInterval);

  if (isSlowMoActive) {
    return Math.round(clampedInterval * POWER_UPS.SLOW_MO_FACTOR);
  }
  return clampedInterval;
}

export function createInitialSnake(
  startX: number,
  startY: number,
  length: number = INITIAL_SNAKE_LENGTH
): GridCoord[] {
  const snake: GridCoord[] = [];
  for (let i = 0; i < length; i++) {
    snake.push({ x: startX - i, y: startY });
  }
  return snake;
}

export function createInitialState(
  mode: GameMode = 'classic',
  gridWidth: number = GRID_SIZE.WIDTH,
  gridHeight: number = GRID_SIZE.HEIGHT,
  rng: () => number = Math.random
): GameEngineState {
  const startX = Math.floor(gridWidth / 3);
  const startY = Math.floor(gridHeight / 2);
  const snake = createInitialSnake(startX, startY, INITIAL_SNAKE_LENGTH);
  const prevSnake = snake.map(s => ({ ...s }));

  const state: GameEngineState = {
    mode,
    gridWidth,
    gridHeight,
    snake,
    prevSnake,
    direction: 'RIGHT',
    queuedDirections: [],
    pendingGrowth: 0,
    food: [],
    score: 0,
    level: 1,
    foodEaten: 0,
    bonusEaten: 0,
    maxLength: INITIAL_SNAKE_LENGTH,
    isAlive: true,
    isVictory: false,
    powerUps: {
      slowMoUntil: 0,
      hasShield: false,
    },
    lastTickTime: 0,
    tickIntervalMs: calculateTickInterval(mode, 1, false),
    gameTimeMs: 0,
  };

  // Spawn initial normal food
  const emptyCell = findEmptyCell(gridWidth, gridHeight, snake, rng);
  if (emptyCell) {
    state.food.push({
      id: 'food-0',
      type: 'normal',
      position: emptyCell,
      points: POINTS.NORMAL_FOOD,
    });
  }

  return state;
}

export function queueDirection(
  state: GameEngineState,
  newDir: Direction
): GameEngineState {
  if (!state.isAlive || state.isVictory) return state;

  // Maximum of 2 queued turns to prevent unresponsive buffer buildup
  if (state.queuedDirections.length >= 2) return state;

  // Check opposite relative to the last direction that will be executed
  const referenceDir =
    state.queuedDirections.length > 0
      ? state.queuedDirections[state.queuedDirections.length - 1]
      : state.direction;

  if (newDir === referenceDir || isOpposite(newDir, referenceDir)) {
    return state;
  }

  return {
    ...state,
    queuedDirections: [...state.queuedDirections, newDir],
  };
}

export function stepGame(
  currentState: GameEngineState,
  nowMs: number,
  rng: () => number = Math.random
): StepResult {
  if (!currentState.isAlive || currentState.isVictory) {
    return { state: currentState, events: [] };
  }

  const events: GameAudioEvent[] = [];
  let shieldAbsorbed = false;

  // 1. Resolve Direction
  let nextDirection = currentState.direction;
  let remainingQueue = [...currentState.queuedDirections];
  if (remainingQueue.length > 0) {
    const candidate = remainingQueue.shift()!;
    if (!isOpposite(candidate, currentState.direction)) {
      nextDirection = candidate;
      events.push('turn');
    }
  }

  const offset = getDirectionOffset(nextDirection);
  const head = currentState.snake[0];
  let nextHeadX = head.x + offset.x;
  let nextHeadY = head.y + offset.y;

  // 2. Wall Collisions & Wraparound
  let wallCollision = false;
  if (currentState.mode === 'zen') {
    nextHeadX = (nextHeadX + currentState.gridWidth) % currentState.gridWidth;
    nextHeadY = (nextHeadY + currentState.gridHeight) % currentState.gridHeight;
  } else {
    // Classic and Rush: walls are solid boundaries
    if (
      nextHeadX < 0 ||
      nextHeadX >= currentState.gridWidth ||
      nextHeadY < 0 ||
      nextHeadY >= currentState.gridHeight
    ) {
      wallCollision = true;
    }
  }

  // Power-up shield vs Wall collision
  let currentPowerUps = { ...currentState.powerUps };
  if (wallCollision) {
    if (currentPowerUps.hasShield) {
      // Quantum Phase: Consume shield and warp through to opposite boundary
      currentPowerUps.hasShield = false;
      shieldAbsorbed = true;
      events.push('shield_absorb');
      nextHeadX = (nextHeadX + currentState.gridWidth) % currentState.gridWidth;
      nextHeadY = (nextHeadY + currentState.gridHeight) % currentState.gridHeight;
    } else {
      return {
        state: {
          ...currentState,
          isAlive: false,
          deathReason: 'wall',
        },
        events: ['game_over'],
      };
    }
  }

  // 3. Self-Collision (with Tail-Vacating Rule)
  // If snake is not growing on this step, the tail segment will vacate this cell on this step.
  // Therefore, moving into the tail position is legal when pendingGrowth === 0.
  const tailWillVacate = currentState.pendingGrowth === 0;
  const segmentsToCheck = tailWillVacate
    ? currentState.snake.slice(0, -1)
    : currentState.snake;

  const hitSelf = segmentsToCheck.some(
    seg => seg.x === nextHeadX && seg.y === nextHeadY
  );

  if (hitSelf) {
    if (currentPowerUps.hasShield) {
      currentPowerUps.hasShield = false;
      shieldAbsorbed = true;
      events.push('shield_absorb');
    } else {
      return {
        state: {
          ...currentState,
          isAlive: false,
          deathReason: 'self',
        },
        events: ['game_over'],
      };
    }
  }

  // 4. Clean Expired Food Items
  const activeFoods = currentState.food.filter(item => {
    if (item.expiresAt && nowMs > item.expiresAt) {
      return false;
    }
    return true;
  });

  // 5. Food & Power-up Collection
  let eatenFood: FoodItem | undefined;
  const remainingFoods: FoodItem[] = [];
  let scoreGain = 0;
  let newPendingGrowth = currentState.pendingGrowth;
  let newFoodEaten = currentState.foodEaten;
  let newBonusEaten = currentState.bonusEaten;

  for (const item of activeFoods) {
    if (item.position.x === nextHeadX && item.position.y === nextHeadY) {
      eatenFood = item;
    } else {
      remainingFoods.push(item);
    }
  }

  if (eatenFood) {
    scoreGain += eatenFood.points;
    if (eatenFood.type === 'normal') {
      newFoodEaten++;
      newPendingGrowth++;
      events.push('eat');
    } else if (eatenFood.type === 'bonus') {
      newBonusEaten++;
      events.push('bonus');
    } else if (eatenFood.type === 'powerup_slow') {
      currentPowerUps.slowMoUntil = nowMs + POWER_UPS.SLOW_MO_DURATION_MS;
      events.push('powerup');
    } else if (eatenFood.type === 'powerup_shield') {
      currentPowerUps.hasShield = true;
      events.push('powerup');
    }
  }

  // 6. Level Calculation
  const newLevel = Math.floor(newFoodEaten / FOOD_PROGRESSION_PER_LEVEL) + 1;
  if (newLevel > currentState.level) {
    events.push('level_up');
  }

  // 7. Update Snake Segments
  const newHead: GridCoord = { x: nextHeadX, y: nextHeadY };
  const prevSnakeCopy = currentState.snake.map(s => ({ ...s }));
  const newSnake: GridCoord[] = [newHead, ...currentState.snake];

  if (newPendingGrowth > 0) {
    newPendingGrowth--;
  } else {
    newSnake.pop(); // Remove tail
  }

  const newMaxLength = Math.max(currentState.maxLength, newSnake.length);

  // Check victory (board completely filled)
  if (newSnake.length >= currentState.gridWidth * currentState.gridHeight) {
    return {
      state: {
        ...currentState,
        snake: newSnake,
        prevSnake: prevSnakeCopy,
        score: currentState.score + scoreGain,
        foodEaten: newFoodEaten,
        bonusEaten: newBonusEaten,
        maxLength: newMaxLength,
        isVictory: true,
        isAlive: false,
      },
      events: ['new_record'],
    };
  }

  // 8. Respawn Food & Power-ups
  const occupiedForSpawn: GridCoord[] = [
    ...newSnake,
    ...remainingFoods.map(f => f.position),
  ];

  // If no normal food exists on board, spawn one
  const hasNormalFood = remainingFoods.some(f => f.type === 'normal');
  if (!hasNormalFood) {
    const normalCell = findEmptyCell(
      currentState.gridWidth,
      currentState.gridHeight,
      occupiedForSpawn,
      rng
    );
    if (normalCell) {
      remainingFoods.push({
        id: `food-${nowMs}-${Math.floor(rng() * 1000)}`,
        type: 'normal',
        position: normalCell,
        points: POINTS.NORMAL_FOOD,
      });
      occupiedForSpawn.push(normalCell);
    }
  }

  // Chance to spawn bonus food or powerup
  const hasSpecial = remainingFoods.some(f => f.type !== 'normal');
  if (!hasSpecial && newFoodEaten > 0 && newFoodEaten % POWER_UPS.SPAWN_INTERVAL_FOODS === 0 && eatenFood) {
    const specialRoll = rng();
    const specialCell = findEmptyCell(
      currentState.gridWidth,
      currentState.gridHeight,
      occupiedForSpawn,
      rng
    );

    if (specialCell) {
      if (specialRoll < 0.5) {
        // Bonus food
        const bonusPoints =
          currentState.mode === 'rush'
            ? POINTS.BONUS_FOOD_BASE * 1.5
            : POINTS.BONUS_FOOD_BASE;
        remainingFoods.push({
          id: `bonus-${nowMs}`,
          type: 'bonus',
          position: specialCell,
          points: bonusPoints,
          expiresAt: nowMs + POWER_UPS.BONUS_FOOD_DURATION_MS,
          totalDurationMs: POWER_UPS.BONUS_FOOD_DURATION_MS,
        });
      } else if (specialRoll < 0.75) {
        // Slow-Mo
        remainingFoods.push({
          id: `slow-${nowMs}`,
          type: 'powerup_slow',
          position: specialCell,
          points: POINTS.POWERUP,
          expiresAt: nowMs + 12000,
          totalDurationMs: 12000,
        });
      } else if (!currentPowerUps.hasShield) {
        // Shield
        remainingFoods.push({
          id: `shield-${nowMs}`,
          type: 'powerup_shield',
          position: specialCell,
          points: POINTS.POWERUP,
          expiresAt: nowMs + 12000,
          totalDurationMs: 12000,
        });
      }
    }
  }

  // 9. Slow-mo check
  const isSlowMoActive = nowMs < currentPowerUps.slowMoUntil;
  const newTickInterval = calculateTickInterval(
    currentState.mode,
    newLevel,
    isSlowMoActive
  );

  const updatedState: GameEngineState = {
    ...currentState,
    snake: newSnake,
    prevSnake: prevSnakeCopy,
    direction: nextDirection,
    queuedDirections: remainingQueue,
    pendingGrowth: newPendingGrowth,
    food: remainingFoods,
    score: currentState.score + scoreGain,
    level: newLevel,
    foodEaten: newFoodEaten,
    bonusEaten: newBonusEaten,
    maxLength: newMaxLength,
    powerUps: currentPowerUps,
    lastTickTime: nowMs,
    tickIntervalMs: newTickInterval,
  };

  return {
    state: updatedState,
    events,
    eatenFood,
    shieldAbsorbed,
  };
}
