import { CellType } from "@/types";
import { GRID_DIRS } from "@/map/MapData";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMap(
  grid: CellType[][],
  rows: number,
  cols: number,
): ValidationResult {
  const errors: string[] = [];

  // Find spawn and goal cells
  const spawns: { row: number; col: number }[] = [];
  const goals: { row: number; col: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellType.Spawn) spawns.push({ row: r, col: c });
      if (grid[r][c] === CellType.Goal) goals.push({ row: r, col: c });
    }
  }

  if (spawns.length === 0) errors.push("Map needs a Spawn cell");
  if (spawns.length > 1) errors.push("Map has multiple Spawn cells (only 1 allowed)");
  if (goals.length === 0) errors.push("Map needs a Goal cell");
  if (goals.length > 1) errors.push("Map has multiple Goal cells (only 1 allowed)");

  if (spawns.length !== 1 || goals.length !== 1) {
    return { valid: false, errors };
  }

  // BFS from Spawn to Goal through Path/Goal cells
  const spawn = spawns[0];
  const goal = goals[0];
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [spawn];
  visited.add(`${spawn.row},${spawn.col}`);
  let reachedGoal = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === goal.row && current.col === goal.col) {
      reachedGoal = true;
      break;
    }
    for (const [dr, dc] of GRID_DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        !visited.has(key)
      ) {
        const cell = grid[nr][nc];
        if (cell === CellType.Path || cell === CellType.Goal) {
          visited.add(key);
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  if (!reachedGoal) {
    errors.push("No connected path from Spawn to Goal");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * BFS from Spawn to Goal, returning the ordered path of grid positions.
 * Returns empty array if no valid path exists.
 */
export function findPath(
  grid: CellType[][],
  rows: number,
  cols: number,
): { row: number; col: number }[] {
  // Find spawn
  let spawn: { row: number; col: number } | null = null;
  let goal: { row: number; col: number } | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellType.Spawn) spawn = { row: r, col: c };
      if (grid[r][c] === CellType.Goal) goal = { row: r, col: c };
    }
  }
  if (!spawn || !goal) return [];

  // BFS with parent tracking
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: { row: number; col: number }[] = [spawn];
  const startKey = `${spawn.row},${spawn.col}`;
  visited.add(startKey);
  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const curKey = `${current.row},${current.col}`;
    if (current.row === goal.row && current.col === goal.col) {
      found = true;
      break;
    }
    for (const [dr, dc] of GRID_DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        !visited.has(key)
      ) {
        const cell = grid[nr][nc];
        if (cell === CellType.Path || cell === CellType.Goal) {
          visited.add(key);
          parent.set(key, curKey);
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  if (!found) return [];

  // Reconstruct path from goal back to spawn
  const path: { row: number; col: number }[] = [];
  let key = `${goal.row},${goal.col}`;
  while (key !== startKey) {
    const [r, c] = key.split(",").map(Number);
    path.push({ row: r, col: c });
    key = parent.get(key)!;
  }
  path.push(spawn);
  path.reverse();
  return path;
}

/**
 * Find ALL distinct paths from Spawn to Goal using DFS.
 * Returns an array of paths; each path is an ordered array of grid positions.
 * For single-path maps, returns one path. For multi-path maps, returns all routes.
 */
export function findAllPaths(
  grid: CellType[][],
  rows: number,
  cols: number,
): { row: number; col: number }[][] {
  let spawn: { row: number; col: number } | null = null;
  let goal: { row: number; col: number } | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellType.Spawn) spawn = { row: r, col: c };
      if (grid[r][c] === CellType.Goal) goal = { row: r, col: c };
    }
  }
  if (!spawn || !goal) return [];

  const results: { row: number; col: number }[][] = [];
  const visited = new Set<string>();
  const currentPath: { row: number; col: number }[] = [];

  function dfs(pos: { row: number; col: number }): void {
    const key = `${pos.row},${pos.col}`;
    visited.add(key);
    currentPath.push(pos);

    if (pos.row === goal!.row && pos.col === goal!.col) {
      results.push([...currentPath]);
    } else {
      for (const [dr, dc] of GRID_DIRS) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        const nkey = `${nr},${nc}`;
        if (
          nr >= 0 && nr < rows &&
          nc >= 0 && nc < cols &&
          !visited.has(nkey)
        ) {
          const cell = grid[nr][nc];
          if (cell === CellType.Path || cell === CellType.Goal) {
            dfs({ row: nr, col: nc });
          }
        }
      }
    }

    visited.delete(key);
    currentPath.pop();
  }

  dfs(spawn);
  return results;
}
