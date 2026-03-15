import { CellType, MapConfig, MapGenParams, GridPosition } from "@/types";
import { generateAnchors, connectAnchors, validateAnchors } from "@/map/TopologyGenerator";
import { mulberry32, randInt, clamp } from "@/utils/MathUtils";

// ── Flow-Field Noise ──────────────────────────────────────────────

/** Build a seeded permutation table for hash-based noise. */
function buildPermutation(rand: () => number): number[] {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return [...p, ...p];
}

/** Smoothstep for noise interpolation. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** 2D value noise with smooth interpolation. Returns [-1, 1]. */
function valueNoise2D(x: number, y: number, perm: number[]): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const n00 = (perm[(perm[xi] + yi) & 511] / 255) * 2 - 1;
  const n10 = (perm[(perm[(xi + 1) & 255] + yi) & 511] / 255) * 2 - 1;
  const n01 = (perm[(perm[xi] + ((yi + 1) & 255)) & 511] / 255) * 2 - 1;
  const n11 = (perm[(perm[(xi + 1) & 255] + ((yi + 1) & 255)) & 511] / 255) * 2 - 1;

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

// ── Grid Validation ──────────────────────────────────────────────

/**
 * Validate a stamped grid for path correctness and quality.
 * Returns true if the grid passes all checks.
 */
function validateGrid(
  grid: CellType[][],
  rows: number,
  cols: number,
  path: GridPosition[],
): boolean {
  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // T-junction check: path cells must have exactly 2 neighbors, spawn/goal exactly 1
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
      if (isEndpoint && neighbors !== 1) return false;
      if (!isEndpoint && neighbors !== 2) return false;
    }
  }

  // Buildable ratio: must be between 30% and 90%
  let buildableCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellType.Buildable) buildableCount++;
    }
  }
  const ratio = buildableCount / (rows * cols);
  if (ratio < 0.3 || ratio > 0.90) return false;

  // Coverage: path must span at least 60% of grid width and 40% of height
  let minCol = cols, maxCol = 0, minRow = rows, maxRow = 0;
  for (const p of path) {
    if (p.col < minCol) minCol = p.col;
    if (p.col > maxCol) maxCol = p.col;
    if (p.row < minRow) minRow = p.row;
    if (p.row > maxRow) maxRow = p.row;
  }
  const colSpan = (maxCol - minCol + 1) / cols;
  const rowSpan = (maxRow - minRow + 1) / rows;
  if (colSpan < 0.6 || rowSpan < 0.4) return false;

  // Turn density: path must have enough direction changes
  // A "turn" = direction from path[i-1]→path[i] differs from path[i]→path[i+1]
  if (path.length >= 3) {
    let turns = 0;
    for (let i = 1; i < path.length - 1; i++) {
      const dr1 = path[i].row - path[i - 1].row;
      const dc1 = path[i].col - path[i - 1].col;
      const dr2 = path[i + 1].row - path[i].row;
      const dc2 = path[i + 1].col - path[i].col;
      if (dr1 !== dr2 || dc1 !== dc2) turns++;
    }
    // Minimum turns scales with path length: at least 1 turn per 10 cells
    const minTurns = Math.max(2, Math.floor(path.length / 10));
    if (turns < minTurns) return false;
  }

  return true;
}

// ── Topology-Based Path Generator ─────────────────────────────────

function tryGenerateTopology(
  rows: number,
  cols: number,
  minPathLength: number,
  rand: () => number,
): MapConfig | null {
  // Generate anchor points for a random topology type
  const anchors = generateAnchors(rows, cols, rand);

  // Validate anchor placement constraints
  if (!validateAnchors(anchors, rows, cols)) return null;

  // Connect anchors via cardinal-direction walking
  const path = connectAnchors(anchors, rows, cols);
  if (!path || path.length < minPathLength) return null;

  // Stamp onto grid
  const grid: CellType[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(CellType.Buildable));
  }
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (i === 0) {
      grid[p.row][p.col] = CellType.Spawn;
    } else if (i === path.length - 1) {
      grid[p.row][p.col] = CellType.Goal;
    } else {
      grid[p.row][p.col] = CellType.Path;
    }
  }

  if (!validateGrid(grid, rows, cols, path)) return null;
  return { rows, cols, cellSize: 1, cellHeight: 0.2, grid };
}

// ── Flow-Field Path Generator ─────────────────────────────────────

function tryGenerateFlowField(
  rows: number,
  cols: number,
  minPathLength: number,
  rand: () => number,
): MapConfig | null {
  const perm = buildPermutation(rand);
  const noiseScale = 0.18 + rand() * 0.20;  // 0.18-0.38 (higher = tighter, denser curves)
  const curviness = 0.80 + rand() * 0.15;   // 0.80-0.95 (noise-driven, winding paths)

  const margin = 1;
  const minRow = margin;
  const maxRow = rows - 1 - margin;

  const spawnNearTop = rand() < 0.5;
  const spawnRow = spawnNearTop
    ? randInt(rand, minRow, minRow + 1)
    : randInt(rand, maxRow - 1, maxRow);
  const goalRow = spawnNearTop
    ? randInt(rand, maxRow - 1, maxRow)
    : randInt(rand, minRow, minRow + 1);

  const goal: GridPosition = { row: goalRow, col: cols - 1 };

  // Walk the flow field
  const path: GridPosition[] = [];
  const visited = new Set<string>();
  let row = spawnRow;
  let col = 0;
  const maxSteps = rows * cols;
  const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (let step = 0; step < maxSteps; step++) {
    path.push({ row, col });
    visited.add(`${row},${col}`);

    if (row === goal.row && col === goal.col) break;

    // Goal vector (normalized)
    const dx = goal.col - col;
    const dy = goal.row - row;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const gx = dx / dist;
    const gy = dy / dist;

    // Progressive goal attraction — stronger as path gets longer
    // Use cubic progress so noise dominates most of the path
    const progress = path.length / maxSteps;
    const goalWeight = Math.max(1 - curviness, progress * progress * progress);
    const noiseWeight = 1 - goalWeight;

    // Noise vector from flow field
    const n = valueNoise2D(col * noiseScale, row * noiseScale, perm);
    const angle = n * Math.PI;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);

    // Blend noise + goal
    const vx = nx * noiseWeight + gx * goalWeight;
    const vy = ny * noiseWeight + gy * goalWeight;

    // Try all 4 directions, sorted by alignment with blended vector
    const scored = DIRS.map(([dr, dc]) => ({
      dr, dc,
      score: dr * vy + dc * vx,
    })).sort((a, b) => b.score - a.score);

    let moved = false;
    for (const { dr, dc } of scored) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited.has(`${nr},${nc}`)) continue;
      row = nr;
      col = nc;
      moved = true;
      break;
    }

    if (!moved) return null;
  }

  if (row !== goal.row || col !== goal.col) return null;
  if (path.length < minPathLength) return null;

  // Stamp onto grid
  const grid: CellType[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(CellType.Buildable));
  }
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (i === 0) {
      grid[p.row][p.col] = CellType.Spawn;
    } else if (i === path.length - 1) {
      grid[p.row][p.col] = CellType.Goal;
    } else {
      grid[p.row][p.col] = CellType.Path;
    }
  }

  if (!validateGrid(grid, rows, cols, path)) return null;
  return { rows, cols, cellSize: 1, cellHeight: 0.2, grid };
}

// ── Map Generation (flow-field → organic → zigzag fallback) ───────

/**
 * Generate a random map using a tiered generator pipeline:
 * 1. Flow-field noise walker — organic curves guided by value noise (best quality)
 * 2. Topology-based — anchor points in strategic patterns (hook, S-curve, spiral)
 * 3. Organic serpentine fallback — variable-segment zigzag
 * 4. Deterministic zigzag — guaranteed valid (last resort)
 *
 * When `multiPath` is true, attempts to add a secondary branching path.
 */
export function generateMap(params: MapGenParams, multiPath = false): MapConfig {
  const { rows, cols, minPathLength, seed } = params;
  const rand = mulberry32(seed);

  // Tier 1: Flow-field (15 attempts) — best organic quality
  for (let attempt = 0; attempt < 15; attempt++) {
    const result = tryGenerateFlowField(rows, cols, minPathLength, rand);
    if (result) {
      if (multiPath) tryAddSecondaryPath(result, rand);
      return result;
    }
  }

  // Tier 2: Topology-based (10 attempts)
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = tryGenerateTopology(rows, cols, minPathLength, rand);
    if (result) {
      if (multiPath) tryAddSecondaryPath(result, rand);
      return result;
    }
  }

  // Tier 2: Organic serpentine (15 attempts)
  for (let attempt = 0; attempt < 15; attempt++) {
    const result = tryGenerateOrganic(rows, cols, minPathLength, rand);
    if (result) {
      if (multiPath) tryAddSecondaryPath(result, rand);
      return result;
    }
  }

  return generateFallbackZigzag(rows, cols);
}

function tryGenerateOrganic(
  rows: number,
  cols: number,
  minPathLength: number,
  rand: () => number,
): MapConfig | null {
  const minSegment = 2;
  const maxSegment = 5;
  const verticalBias = 0.6;

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
    // Horizontal segment: variable length (minSegment to maxSegment)
    const remainingCols = cols - 1 - col;
    const hLen = remainingCols <= maxSegment
      ? remainingCols
      : randInt(rand, minSegment, maxSegment);
    for (let i = 0; i < hLen && col < cols - 1; i++) {
      col++;
      path.push({ row, col });
    }

    if (col >= cols - 1) break;

    // Vertical segment: full bounce or partial bounce
    let targetRow: number;
    if (rand() < verticalBias) {
      // Full bounce: go to near the opposite boundary
      targetRow = goingDown
        ? randInt(rand, maxRow - 1, maxRow)
        : randInt(rand, minRow, minRow + 1);
    } else {
      // Partial bounce: move a moderate amount vertically
      targetRow = clamp(row + randInt(rand, -4, 4), minRow, maxRow);
    }

    const step = targetRow > row ? 1 : -1;
    const steps = Math.abs(targetRow - row);
    if (steps === 0) {
      // Already at boundary — flip direction
      goingDown = !goingDown;
      continue;
    }

    for (let i = 0; i < steps; i++) {
      row += step;
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

  if (!validateGrid(grid, rows, cols, dedupedPath)) return null;
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
  for (let b = 0.10; b <= 0.30; b += 0.05) {
    for (let r = 0.70; r <= 0.90; r += 0.05) {
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
