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
 */
export function generateMap(params: MapGenParams): MapConfig {
  const { rows, cols, minPathLength, seed } = params;
  const rand = mulberry32(seed);
  const MAX_RETRIES = 30;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = tryGenerate(rows, cols, minPathLength, rand);
    if (result) return result;
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
  const verticalRange = maxRow - minRow;

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
