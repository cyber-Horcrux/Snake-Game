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
  Obstacle,
  WarpGate,
} from './types.ts';
import {
  GRID_SIZE,
  INITIAL_SNAKE_LENGTH,
  MODE_SPEEDS,
  POINTS,
  POWER_UPS,
  FOOD_PROGRESSION_PER_LEVEL,
  COMBO_SETTINGS,
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

export function getOrthogonalDirections(dir: Direction): [Direction, Direction] {
  switch (dir) {
    case 'UP':
    case 'DOWN':
      return ['LEFT', 'RIGHT'];
    case 'LEFT':
    case 'RIGHT':
      return ['UP', 'DOWN'];
  }
}

/**
 * Checks whether stepping into a given coordinate is unobstructed by boundaries,
 * obstacles, inactive warp gates, or stationary snake body segments.
 */
export function isCellClear(
  coord: GridCoord,
  obstacles: Obstacle[],
  snake: GridCoord[],
  gridWidth: number,
  gridHeight: number,
  warpGate: WarpGate | null = null
): boolean {
  if (coord.x < 0 || coord.x >= gridWidth || coord.y < 0 || coord.y >= gridHeight) {
    return false;
  }
  for (let i = 0; i < obstacles.length; i++) {
    const ob = obstacles[i];
    if (ob.x === coord.x && ob.y === coord.y) {
      return false;
    }
  }
  if (warpGate && !warpGate.active && warpGate.x === coord.x && warpGate.y === coord.y) {
    return false;
  }
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === coord.x && snake[i].y === coord.y) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates clearance (unobstructed steps) along a ray in the given direction.
 */
export function calculateClearance(
  from: GridCoord,
  dir: Direction,
  obstacles: Obstacle[],
  snake: GridCoord[],
  gridWidth: number,
  gridHeight: number,
  warpGate: WarpGate | null = null
): number {
  const offset = getDirectionOffset(dir);
  let steps = 0;
  let curr = { x: from.x + offset.x, y: from.y + offset.y };
  while (isCellClear(curr, obstacles, snake, gridWidth, gridHeight, warpGate)) {
    steps++;
    curr = { x: curr.x + offset.x, y: curr.y + offset.y };
  }
  return steps;
}

/**
 * Deterministically finds the best safe orthogonal deflection direction when
 * colliding with an impassable wall.
 * 1. Evaluates orthogonal options.
 * 2. If exactly one is open, selects it.
 * 3. If both are open, selects the one with greater clearance.
 *    If clearance is tied, uses deterministic clockwise tie-breaker.
 * 4. If neither is open, returns null (cannot deflect safely).
 */
export function findSafeDeflectionDirection(
  head: GridCoord,
  currentDir: Direction,
  obstacles: Obstacle[],
  snake: GridCoord[],
  gridWidth: number,
  gridHeight: number,
  warpGate: WarpGate | null = null
): Direction | null {
  const [orthA, orthB] = getOrthogonalDirections(currentDir);
  const offsetA = getDirectionOffset(orthA);
  const targetA = { x: head.x + offsetA.x, y: head.y + offsetA.y };
  const clearA = isCellClear(targetA, obstacles, snake, gridWidth, gridHeight, warpGate);

  const offsetB = getDirectionOffset(orthB);
  const targetB = { x: head.x + offsetB.x, y: head.y + offsetB.y };
  const clearB = isCellClear(targetB, obstacles, snake, gridWidth, gridHeight, warpGate);

  if (clearA && !clearB) return orthA;
  if (!clearA && clearB) return orthB;
  if (!clearA && !clearB) return null;

  const depthA = calculateClearance(head, orthA, obstacles, snake, gridWidth, gridHeight, warpGate);
  const depthB = calculateClearance(head, orthB, obstacles, snake, gridWidth, gridHeight, warpGate);

  if (depthA > depthB) return orthA;
  if (depthB > depthA) return orthB;

  // Clockwise tie-breaker relative to current heading
  const clockwiseMap: Record<Direction, Direction> = {
    UP: 'RIGHT',
    RIGHT: 'DOWN',
    DOWN: 'LEFT',
    LEFT: 'UP',
  };
  return clockwiseMap[currentDir];
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
  rng: () => number = Math.random,
  obstacles: Obstacle[] = [],
  warpGate: WarpGate | null = null
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
    combo: 1,
    comboExpiresAt: 0,
    wallsWrapped: 0,
    shieldsUsed: 0,
    powerUpsCollected: 0,
    lastTickTime: 0,
    tickIntervalMs: calculateTickInterval(mode, 1, false),
    gameTimeMs: 0,
    obstacles,
    warpGate,
    stage: 1,
    stageFoodEaten: 0,
    maxCombo: 1,
  };

  // Spawn initial normal food ensuring no overlap with snake, obstacles, or warpGate
  const occupied: GridCoord[] = [
    ...snake,
    ...obstacles.map(o => ({ x: o.x, y: o.y })),
  ];
  if (warpGate) {
    occupied.push({ x: warpGate.x, y: warpGate.y });
  }

  const emptyCell = findEmptyCell(gridWidth, gridHeight, occupied, rng);
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

  let currentObstacles = [...(currentState.obstacles || [])];
  let currentPowerUps = { ...currentState.powerUps };
  let newWallsWrapped = currentState.wallsWrapped || 0;
  let newShieldsUsed = currentState.shieldsUsed || 0;
  let newPowerUpsCollected = currentState.powerUpsCollected || 0;
  let newStageFoodEaten = currentState.stageFoodEaten || 0;
  let newStage = currentState.stage || 1;
  let newMaxCombo = currentState.maxCombo || 1;
  let obstacleScoreBonus = 0;
  let isHazardHitWithoutShield = false;

  // Helper for Kinetic Deflection & Halt on impassable obstacles/walls
  const executeKineticDeflection = (): StepResult => {
    currentPowerUps.hasShield = false;
    shieldAbsorbed = true;
    newShieldsUsed++;
    events.push('shield_absorb');

    // Head remains at current position (does not advance into wall)
    nextHeadX = head.x;
    nextHeadY = head.y;

    // Discard any queued direction that points into the wall or is opposite to heading
    remainingQueue = remainingQueue.filter(
      d => d !== nextDirection && !isOpposite(d, nextDirection)
    );

    let selectedDeflection: Direction | null = null;

    // Check if user has an orthogonal direction queued that is clear
    while (remainingQueue.length > 0) {
      const candidate = remainingQueue[0];
      const candOffset = getDirectionOffset(candidate);
      const candTarget = { x: head.x + candOffset.x, y: head.y + candOffset.y };
      if (isCellClear(candTarget, currentObstacles, currentState.snake, currentState.gridWidth, currentState.gridHeight, currentState.warpGate)) {
        selectedDeflection = remainingQueue.shift()!;
        break;
      } else {
        remainingQueue.shift(); // Discard obstructed turn
      }
    }

    // If no queued turn was usable, evaluate the two orthogonal directions
    if (!selectedDeflection) {
      selectedDeflection = findSafeDeflectionDirection(
        head,
        nextDirection,
        currentObstacles,
        currentState.snake,
        currentState.gridWidth,
        currentState.gridHeight,
        currentState.warpGate
      );
    }

    if (selectedDeflection) {
      nextDirection = selectedDeflection;
      events.push('turn');
    }

    // Snake halts for this tick: body segments hold positions
    const haltedSnake = currentState.snake.map(s => ({ ...s }));
    const prevSnakeCopy = currentState.snake.map(s => ({ ...s }));
    const isSlowMoActive = nowMs < currentPowerUps.slowMoUntil;
    const newTickInterval = calculateTickInterval(
      currentState.mode,
      currentState.level,
      isSlowMoActive
    );

    return {
      state: {
        ...currentState,
        snake: haltedSnake,
        prevSnake: prevSnakeCopy,
        direction: nextDirection,
        queuedDirections: remainingQueue,
        powerUps: currentPowerUps,
        shieldsUsed: newShieldsUsed,
        lastTickTime: nowMs,
        tickIntervalMs: newTickInterval,
        obstacles: currentObstacles,
        maxCombo: newMaxCombo,
      },
      events,
      shieldAbsorbed: true,
    };
  };

  const warpGate = currentState.warpGate;

  // PRIORITY 1: Obstacle Collisions (walls, barriers, hazards)
  let hitObstacle: Obstacle | undefined;
  for (let i = 0; i < currentObstacles.length; i++) {
    const ob = currentObstacles[i];
    if (ob.x === nextHeadX && ob.y === nextHeadY) {
      hitObstacle = ob;
      break;
    }
  }

  if (hitObstacle) {
    if (hitObstacle.type === 'barrier') {
      if (currentPowerUps.hasShield) {
        currentPowerUps.hasShield = false;
        shieldAbsorbed = true;
        newShieldsUsed++;
        events.push('shield_absorb', 'bonus');
        currentObstacles = currentObstacles.filter(o => o.id !== hitObstacle!.id);
        obstacleScoreBonus += 50;
        // Snake advances into barrier's previous coordinate
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
    } else if (hitObstacle.type === 'hazard') {
      if (currentPowerUps.hasShield) {
        currentPowerUps.hasShield = false;
        shieldAbsorbed = true;
        newShieldsUsed++;
        events.push('shield_absorb');
        currentObstacles = currentObstacles.filter(o => o.id !== hitObstacle!.id);
        // Snake advances safely without segment loss
      } else {
        if (currentState.snake.length <= 3) {
          return {
            state: {
              ...currentState,
              isAlive: false,
              deathReason: 'wall',
            },
            events: ['game_over'],
          };
        } else {
          // Snake length > 3: advances into hazard coordinate and triggers segment severing
          isHazardHitWithoutShield = true;
        }
      }
    } else if (hitObstacle.type === 'wall') {
      if (currentPowerUps.hasShield) {
        return executeKineticDeflection();
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
  }

  // PRIORITY 3: Inactive Warp Gate (Impassable solid obstacle)
  if (warpGate && !warpGate.active && nextHeadX === warpGate.x && nextHeadY === warpGate.y) {
    if (currentPowerUps.hasShield) {
      return executeKineticDeflection();
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

  // PRIORITY 4: Outer Boundary Wall Collision & Wraparound
  let wallCollision = false;
  if (currentState.mode === 'zen') {
    const wrappedX = (nextHeadX + currentState.gridWidth) % currentState.gridWidth;
    const wrappedY = (nextHeadY + currentState.gridHeight) % currentState.gridHeight;
    if (wrappedX !== nextHeadX || wrappedY !== nextHeadY) {
      newWallsWrapped++;
    }
    nextHeadX = wrappedX;
    nextHeadY = wrappedY;
  } else if (currentState.mode === 'maze') {
    // Maze Mode: outer boundaries are impassable solid walls
    if (
      nextHeadX < 0 ||
      nextHeadX >= currentState.gridWidth ||
      nextHeadY < 0 ||
      nextHeadY >= currentState.gridHeight
    ) {
      if (currentPowerUps.hasShield) {
        return executeKineticDeflection();
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
  } else {
    // Classic and Rush: solid boundaries with Quantum Phase shield
    if (
      nextHeadX < 0 ||
      nextHeadX >= currentState.gridWidth ||
      nextHeadY < 0 ||
      nextHeadY >= currentState.gridHeight
    ) {
      wallCollision = true;
    }

    if (wallCollision) {
      if (currentPowerUps.hasShield) {
        currentPowerUps.hasShield = false;
        shieldAbsorbed = true;
        newShieldsUsed++;
        newWallsWrapped++;
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
  }

  // PRIORITY 5: Self-Collision (with Tail-Vacating Rule)
  const tailWillVacate = currentState.pendingGrowth === 0 && !isHazardHitWithoutShield;
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
      newShieldsUsed++;
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

  // PRIORITY 5: Active Warp Gate (Stage Clear Condition)
  // May occur ONLY when destination gate cell is otherwise valid and unobstructed:
  // - Never bypasses obstacle collision (!hitObstacle)
  // - Never bypasses self-collision (!hitSelf)
  // - Never bypasses boundary collision (!wallCollision)
  if (
    warpGate &&
    warpGate.active &&
    nextHeadX === warpGate.x &&
    nextHeadY === warpGate.y &&
    !hitObstacle &&
    !hitSelf &&
    !wallCollision
  ) {
    events.push('level_up', 'bonus');
    const newHead: GridCoord = { x: nextHeadX, y: nextHeadY };
    const prevSnakeCopy = currentState.snake.map(s => ({ ...s }));
    const newSnake: GridCoord[] = [newHead, ...currentState.snake.slice(0, -1)];
    const isMazeMode = currentState.mode === 'maze';
    const isFinalStage = isMazeMode && currentState.stage >= 6;
    return {
      state: {
        ...currentState,
        snake: newSnake,
        prevSnake: prevSnakeCopy,
        direction: nextDirection,
        queuedDirections: remainingQueue,
        isVictory: true,
        isStageClear: isMazeMode,
        isCampaignComplete: isFinalStage,
        isAlive: false,
        stageFoodEaten: newStageFoodEaten,
        maxCombo: newMaxCombo,
      },
      events,
    };
  }

  // Clean Expired Food Items
  const activeFoods = currentState.food.filter(item => {
    if (item.expiresAt && nowMs > item.expiresAt) {
      return false;
    }
    return true;
  });

  // Food & Power-up Collection
  let eatenFood: FoodItem | undefined;
  const remainingFoods: FoodItem[] = [];
  let scoreGain = obstacleScoreBonus;
  let newPendingGrowth = currentState.pendingGrowth;
  let newFoodEaten = currentState.foodEaten;
  let newBonusEaten = currentState.bonusEaten;
  let currentCombo = currentState.combo || 1;
  let currentComboExpiresAt = currentState.comboExpiresAt || 0;

  // Reset combo if time window has lapsed
  if (nowMs > currentComboExpiresAt) {
    currentCombo = 1;
  }

  for (const item of activeFoods) {
    if (item.position.x === nextHeadX && item.position.y === nextHeadY) {
      eatenFood = item;
    } else {
      remainingFoods.push(item);
    }
  }

  if (eatenFood) {
    if (nowMs <= currentComboExpiresAt && currentCombo >= 1) {
      currentCombo = Math.min(COMBO_SETTINGS.MAX_COMBO, currentCombo + 1);
      if (currentCombo > 1) {
        events.push('combo');
      }
    } else {
      currentCombo = 1;
    }
    currentComboExpiresAt = nowMs + COMBO_SETTINGS.WINDOW_MS;

    scoreGain += eatenFood.points * currentCombo;
    if (eatenFood.type === 'normal') {
      newFoodEaten++;
      newStageFoodEaten = Math.min(10, newStageFoodEaten + 1);
      newPendingGrowth++;
      events.push('eat');
    } else if (eatenFood.type === 'bonus') {
      newBonusEaten++;
      events.push('bonus');
    } else if (eatenFood.type === 'powerup_slow') {
      newPowerUpsCollected++;
      currentPowerUps.slowMoUntil = nowMs + POWER_UPS.SLOW_MO_DURATION_MS;
      events.push('powerup');
    } else if (eatenFood.type === 'powerup_shield') {
      newPowerUpsCollected++;
      currentPowerUps.hasShield = true;
      events.push('powerup');
    }
  }

  // maxCombo tracking: records highest combo reached during this run
  newMaxCombo = Math.max(newMaxCombo, currentCombo);

  // Level Calculation
  const newLevel = Math.floor(newFoodEaten / FOOD_PROGRESSION_PER_LEVEL) + 1;
  if (newLevel > currentState.level) {
    events.push('level_up');
  }

  // Update Snake Segments & Hazard Tail Severing
  const newHead: GridCoord = { x: nextHeadX, y: nextHeadY };
  const newSnake: GridCoord[] = [newHead, ...currentState.snake];

  if (isHazardHitWithoutShield) {
    // Unshielded hazard penalty: clear pending growth, remove 2 additional tail segments
    newPendingGrowth = 0;
    // Beyond normal movement (which removes 1 tail), pop 2 additional segments (total 3 pops)
    for (let r = 0; r < 3; r++) {
      if (newSnake.length > 1) {
        newSnake.pop();
      }
    }
  } else {
    if (newPendingGrowth > 0) {
      newPendingGrowth--;
    } else {
      newSnake.pop(); // Normal tail pop
    }
  }

  // PrevSnake alignment matching newSnake.length
  const prevSnakeCopy = currentState.snake.slice(0, newSnake.length).map(s => ({ ...s }));
  while (prevSnakeCopy.length < newSnake.length) {
    prevSnakeCopy.push({ ...newSnake[prevSnakeCopy.length] });
  }

  // Calculate final score with hazard deduction (never below 0)
  let finalScore = currentState.score + scoreGain;
  if (isHazardHitWithoutShield) {
    finalScore = Math.max(0, finalScore - 25);
  }

  const newMaxLength = Math.max(currentState.maxLength, newSnake.length);

  // Check Warp Gate activation in Maze Mode
  let updatedWarpGate = currentState.warpGate ? { ...currentState.warpGate } : null;
  if (updatedWarpGate && currentState.mode === 'maze' && newStageFoodEaten >= 10) {
    updatedWarpGate.active = true;
  }

  // Check victory (board completely filled)
  if (newSnake.length >= currentState.gridWidth * currentState.gridHeight) {
    return {
      state: {
        ...currentState,
        snake: newSnake,
        prevSnake: prevSnakeCopy,
        score: finalScore,
        foodEaten: newFoodEaten,
        bonusEaten: newBonusEaten,
        maxLength: newMaxLength,
        combo: currentCombo,
        comboExpiresAt: currentComboExpiresAt,
        wallsWrapped: newWallsWrapped,
        shieldsUsed: newShieldsUsed,
        powerUpsCollected: newPowerUpsCollected,
        isVictory: true,
        isAlive: false,
        obstacles: currentObstacles,
        warpGate: updatedWarpGate,
        stage: newStage,
        stageFoodEaten: newStageFoodEaten,
        maxCombo: newMaxCombo,
      },
      events: ['new_record'],
    };
  }

  // Respawn Food & Power-ups (ensuring no overlap with snake, obstacles, or warpGate)
  const occupiedForSpawn: GridCoord[] = [
    ...newSnake,
    ...remainingFoods.map(f => f.position),
    ...currentObstacles.map(o => ({ x: o.x, y: o.y })),
  ];
  if (updatedWarpGate) {
    occupiedForSpawn.push({ x: updatedWarpGate.x, y: updatedWarpGate.y });
  }

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

  // Slow-mo check
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
    score: finalScore,
    level: newLevel,
    foodEaten: newFoodEaten,
    bonusEaten: newBonusEaten,
    maxLength: newMaxLength,
    powerUps: currentPowerUps,
    combo: currentCombo,
    comboExpiresAt: currentComboExpiresAt,
    wallsWrapped: newWallsWrapped,
    shieldsUsed: newShieldsUsed,
    powerUpsCollected: newPowerUpsCollected,
    lastTickTime: nowMs,
    tickIntervalMs: newTickInterval,
    obstacles: currentObstacles,
    warpGate: updatedWarpGate,
    stage: newStage,
    stageFoodEaten: newStageFoodEaten,
    maxCombo: newMaxCombo,
  };

  return {
    state: updatedState,
    events,
    eatenFood,
    shieldAbsorbed,
  };
}
