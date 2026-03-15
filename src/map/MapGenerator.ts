import { CellType, MapConfig, MapGenParams, GridPosition } from "@/types";

/** Mulberry32 seeded PRNG — returns a function that produces [0, 1) floats. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random int in [min, max] inclusive. */
function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/**
 * Generate a random map with a valid single-cell-wide serpentine path.
 *
 * The path bounces between the top and bottom of the grid with short
 * horizontal connectors (2-3 cells), creating dramatic full-height
 * serpentine patterns that fill the grid well.
 *
 * When `multiPath` is true, attempts to add a secondary branching path.
 */
export function generateMap(params: MapGenParams, multiPath = false): MapConfig {
  const { rows, cols, minPathLength, seed } = params;
  const rand = mulberry32(seed);
  const MAX_RETRIES = 30;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = tryGenerate(rows, cols, minPathLength, rand);
    if (result) {
      if (multiPath) {
        tryAddSecondaryPath(result, rand);
      }
      return result;
    }
  }

  return generateFallbackZigzag(rows, cols);
}

function tryGenerate(
  rows: number,
  cols: number,
  minPathLength: number,
  rand: () => number,
): MapConfig | null {
  const margin = 1;
  const minRow = margin;
  const maxRow = rows - 1 - margin;

  // Spawn near top or bottom, goal on the opposite side
  const spawnNearTop = rand() < 0.5;
  const spawnRow = spawnNearTop
    ? randInt(rand, minRow, minRow + 1)
    : randInt(rand, maxRow - 1, maxRow);
  const goalRow = spawnNearTop
    ? randInt(rand, maxRow - 1, maxRow)
    : randInt(rand, minRow, minRow + 1);

  // Build path as ordered positions
  const path: GridPosition[] = [];
  let row = spawnRow;
  let col = 0;
  path.push({ row, col });

  // Start by going toward the opposite edge
  let goingDown = spawnNearTop;

  while (col < cols - 1) {
    // Short horizontal connector: 2-3 cells
    const remainingCols = cols - 1 - col;
    const hLen = remainingCols <= 3 ? remainingCols : randInt(rand, 2, 3);
    for (let i = 0; i < hLen && col < cols - 1; i++) {
      col++;
      path.push({ row, col });
    }

    if (col >= cols - 1) break;

    // Long vertical segment: bounce to near the opposite boundary
    // Target: go almost to the other edge with slight randomization
    const targetRow = goingDown
      ? randInt(rand, maxRow - 1, maxRow)
      : randInt(rand, minRow, minRow + 1);

    const dir = targetRow > row ? 1 : -1;
    const steps = Math.abs(targetRow - row);
    if (steps === 0) {
      // Already at boundary — flip direction
      goingDown = !goingDown;
      continue;
    }

    for (let i = 0; i < steps; i++) {
      row += dir;
      path.push({ row, col });
    }

    goingDown = !goingDown;
  }

  // Connect to goal row if needed
  if (row !== goalRow) {
    const lastCell = path[path.length - 1];
    if (lastCell.col === cols - 1) {
      path.pop();
      col = cols - 2;
      const prev = path[path.length - 1];
      if (prev.row !== row || prev.col !== col) {
        path.push({ row, col });
      }
    }
    const dir = goalRow > row ? 1 : -1;
    while (row !== goalRow) {
      row += dir;
      path.push({ row, col });
    }
    col = cols - 1;
    path.push({ row, col });
  }

  if (path.length < minPathLength) return null;

  // Dedup (safety)
  const seen = new Set<string>();
  const dedupedPath: GridPosition[] = [];
  for (const p of path) {
    const key = `${p.row},${p.col}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedPath.push(p);
    }
  }

  // Stamp onto grid
  const grid: CellType[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(CellType.Buildable));
  }
  for (let i = 0; i < dedupedPath.length; i++) {
    const p = dedupedPath[i];
    if (i === 0) {
      grid[p.row][p.col] = CellType.Spawn;
    } else if (i === dedupedPath.length - 1) {
      grid[p.row][p.col] = CellType.Goal;
    } else {
      grid[p.row][p.col] = CellType.Path;
    }
  }

  // Reject T-junctions: every path cell must have exactly 2 neighbors,
  // spawn/goal must have exactly 1
  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellType.Buildable) continue;
      let neighbors = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== CellType.Buildable) {
          neighbors++;
        }
      }
      const isEndpoint = grid[r][c] === CellType.Spawn || grid[r][c] === CellType.Goal;
      if (isEndpoint && neighbors !== 1) return null;
      if (!isEndpoint && neighbors !== 2) return null;
    }
  }

  // Validate buildable ratio
  let buildableCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellType.Buildable) buildableCount++;
    }
  }
  if (buildableCount / (rows * cols) < 0.3) return null;

  return { rows, cols, cellSize: 1, cellHeight: 0.2, grid };
}

/**
 * Attempt to add a secondary path to an existing single-path map.
 *
 * Strategy:
 * 1. Extract the existing primary path from spawn to goal.
 * 2. Try several candidate branch/rejoin pairs along the primary path.
 * 3. Use A* through Buildable cells (avoiding the primary path) to find
 *    an alternative route between the two branch points.
 * 4. Stamp the secondary path cells onto the grid.
 * 5. Store both routes explicitly in config.paths so consumers don't need
 *    to extract paths from grid topology (which is ambiguous when paths
 *    are adjacent).
 *
 * The secondary path is allowed to be adjacent to the primary path --
 * the routes are tracked explicitly, not inferred from the grid.
 *
 * If no secondary path can be found (not enough space), the map stays
 * single-path.
 */
function tryAddSecondaryPath(config: MapConfig, rand: () => number): void {
  const primaryPath = extractPrimaryPath(config);
  if (primaryPath.length < 10) return;

  // Try several candidate branch/rejoin combinations
  const candidates: [number, number][] = [];
  for (let b = 0.15; b <= 0.4; b += 0.05) {
    for (let r = 0.6; r <= 0.85; r += 0.05) {
      candidates.push([b, r]);
    }
  }
  // Shuffle candidates deterministically
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Set of ALL non-buildable cells (the entire primary path + spawn + goal)
  const allPathCells = new Set<string>();
  for (const p of primaryPath) {
    allPathCells.add(`${p.row},${p.col}`);
  }

  for (const [bFrac, rFrac] of candidates) {
    const branchIdx = Math.floor(primaryPath.length * bFrac);
    const rejoinIdx = Math.floor(primaryPath.length * rFrac);
    if (rejoinIdx - branchIdx < 4) continue;

    const branchPoint = primaryPath[branchIdx];
    const rejoinPoint = primaryPath[rejoinIdx];

    // A* must avoid ALL existing path cells (except the branch and rejoin
    // endpoints themselves) so it only routes through Buildable terrain.
    const avoidCells = new Set(allPathCells);
    avoidCells.delete(`${branchPoint.row},${branchPoint.col}`);
    avoidCells.delete(`${rejoinPoint.row},${rejoinPoint.col}`);

    const secondaryRoute = astarBuildable(config, branchPoint, rejoinPoint, avoidCells, rand);
    if (!secondaryRoute || secondaryRoute.length < 3) continue;

    // Reject trivial shortcuts: the secondary route must be at least 40%
    // of the primary segment length between branch and rejoin points.
    const primarySegmentLength = rejoinIdx - branchIdx;
    if (secondaryRoute.length < primarySegmentLength * 0.4) continue;

    // Secondary route found -- stamp new cells onto grid
    const newCells = secondaryRoute.slice(1, -1); // exclude branch/rejoin
    for (const cell of newCells) {
      config.grid[cell.row][cell.col] = CellType.Path;
    }

    // Build the two explicit route arrays (spawn -> goal):
    // Route A = primary (unchanged)
    // Route B = primaryPath[0..branchIdx] + secondaryRoute[1..-2] + primaryPath[rejoinIdx..]
    const routeA = [...primaryPath];
    const routeB = [
      ...primaryPath.slice(0, branchIdx + 1),
      ...secondaryRoute.slice(1, -1),
      ...primaryPath.slice(rejoinIdx),
    ];
    config.paths = [routeA, routeB];
    return; // success
  }
}

/**
 * Extract the ordered primary path from spawn to goal by walking through the grid.
 * This is a simpler version of PathFinder.extractPathCells, inlined here to
 * avoid circular dependencies between MapGenerator and PathFinder.
 */
function extractPrimaryPath(config: MapConfig): GridPosition[] {
  let spawn: GridPosition | null = null;
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      if (config.grid[r][c] === CellType.Spawn) {
        spawn = { row: r, col: c };
        break;
      }
    }
    if (spawn) break;
  }
  if (!spawn) return [];

  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const visited = new Set<string>();
  const path: GridPosition[] = [spawn];
  visited.add(`${spawn.row},${spawn.col}`);
  let current = spawn;

  while (true) {
    let found = false;
    for (const [dr, dc] of DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 && nr < config.rows &&
        nc >= 0 && nc < config.cols &&
        !visited.has(key)
      ) {
        const ct = config.grid[nr][nc];
        if (ct === CellType.Path || ct === CellType.Goal) {
          visited.add(key);
          const pos: GridPosition = { row: nr, col: nc };
          path.push(pos);
          current = pos;
          found = true;
          break;
        }
      }
    }
    if (!found) break;
  }

  return path;
}

/**
 * A* pathfinding through Buildable cells from `start` to `end`.
 * `avoidCells` is a set of path-cell keys the route should not traverse.
 * The start and end points themselves are on the existing path (they are the
 * branch/rejoin points) so they are allowed even though they aren't Buildable.
 *
 * Returns the path including start and end, or null if no route exists.
 */
function astarBuildable(
  config: MapConfig,
  start: GridPosition,
  end: GridPosition,
  avoidCells: Set<string>,
  _rand: () => number,
): GridPosition[] | null {
  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function heuristic(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  const startKey = `${start.row},${start.col}`;
  const endKey = `${end.row},${end.col}`;

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const parent = new Map<string, string>();
  const openSet = new Set<string>();
  const closedSet = new Set<string>();

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, end));
  openSet.add(startKey);

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let bestKey = "";
    let bestF = Infinity;
    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        bestKey = key;
      }
    }

    if (bestKey === endKey) {
      // Reconstruct path
      const path: GridPosition[] = [];
      let cur = endKey;
      while (cur) {
        const [r, c] = cur.split(",").map(Number);
        path.push({ row: r, col: c });
        const p = parent.get(cur);
        if (!p) break;
        cur = p;
      }
      path.reverse();
      return path;
    }

    openSet.delete(bestKey);
    closedSet.add(bestKey);

    const [cr, cc] = bestKey.split(",").map(Number);
    const currentG = gScore.get(bestKey) ?? Infinity;

    for (const [dr, dc] of DIRS) {
      const nr = cr + dr;
      const nc = cc + dc;
      const nk = `${nr},${nc}`;

      if (nr < 0 || nr >= config.rows || nc < 0 || nc >= config.cols) continue;
      if (closedSet.has(nk)) continue;
      if (avoidCells.has(nk)) continue;

      // Only allow Buildable cells (or the end point itself)
      const cellType = config.grid[nr][nc];
      if (nk !== endKey && cellType !== CellType.Buildable) continue;

      const tentativeG = currentG + 1;
      const prevG = gScore.get(nk) ?? Infinity;

      if (tentativeG < prevG) {
        parent.set(nk, bestKey);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + heuristic({ row: nr, col: nc }, end));
        openSet.add(nk);
      }
    }
  }

  return null; // No path found
}

/** Fallback: deterministic full-height zigzag. */
function generateFallbackZigzag(rows: number, cols: number): MapConfig {
  const grid: CellType[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(CellType.Buildable));
  }

  const margin = 1;
  let row = margin;
  let col = 0;
  grid[row][col] = CellType.Spawn;

  let goingDown = true;

  while (col < cols - 1) {
    // Short horizontal connector
    const hLen = Math.min(2, cols - 1 - col);
    for (let i = 0; i < hLen; i++) {
      col++;
      grid[row][col] = CellType.Path;
    }
    if (col >= cols - 1) break;

    // Full-height vertical segment
    const targetRow = goingDown ? rows - 1 - margin : margin;
    const dir = targetRow > row ? 1 : -1;
    while (row !== targetRow) {
      row += dir;
      grid[row][col] = CellType.Path;
    }
    goingDown = !goingDown;
  }

  grid[row][cols - 1] = CellType.Goal;
  return { rows, cols, cellSize: 1, cellHeight: 0.2, grid };
}
