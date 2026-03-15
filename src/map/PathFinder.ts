import { CellType, GridPosition, MapConfig, WorldPosition } from "@/types";
import { findCells, GRID_DIRS } from "./MapData";

/**
 * Walk from Spawn through Path cells to Goal (single-chain, 4-directional).
 * Returns ordered grid positions from spawn to goal.
 */
export function extractPathCells(config: MapConfig): GridPosition[] {
  const spawn = findCells(config, CellType.Spawn)[0];
  if (!spawn) return [];

  const visited = new Set<string>();
  const path: GridPosition[] = [spawn];
  visited.add(`${spawn.row},${spawn.col}`);

  let current = spawn;

  while (true) {
    let found = false;
    for (const [dr, dc] of GRID_DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < config.rows &&
        nc >= 0 &&
        nc < config.cols &&
        !visited.has(key)
      ) {
        const cellType = config.grid[nr][nc];
        if (cellType === CellType.Path || cellType === CellType.Goal) {
          visited.add(key);
          const pos = { row: nr, col: nc };
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
 * Find ALL distinct paths from Spawn to Goal through the grid using DFS.
 * For single-path maps this returns one path; for multi-path maps it returns
 * every unique spawn-to-goal route.
 */
export function extractAllPaths(config: MapConfig): GridPosition[][] {
  const spawn = findCells(config, CellType.Spawn)[0];
  const goal = findCells(config, CellType.Goal)[0];
  if (!spawn || !goal) return [];

  const results: GridPosition[][] = [];
  const visited = new Set<string>();
  const currentPath: GridPosition[] = [];

  function dfs(pos: GridPosition): void {
    const key = `${pos.row},${pos.col}`;
    visited.add(key);
    currentPath.push(pos);

    if (pos.row === goal.row && pos.col === goal.col) {
      results.push([...currentPath]);
    } else {
      for (const [dr, dc] of GRID_DIRS) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        const nkey = `${nr},${nc}`;
        if (
          nr >= 0 &&
          nr < config.rows &&
          nc >= 0 &&
          nc < config.cols &&
          !visited.has(nkey)
        ) {
          const cellType = config.grid[nr][nc];
          if (cellType === CellType.Path || cellType === CellType.Goal) {
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

/**
 * Reduce path to corner waypoints (where direction changes) plus start/end.
 */
export function extractWaypoints(
  config: MapConfig,
): GridPosition[] {
  const fullPath = extractPathCells(config);
  return reduceToWaypoints(fullPath);
}

/**
 * Extract waypoints for every distinct path through a multi-path map.
 *
 * If `config.paths` is set (by MapGenerator for multi-path maps), those
 * explicit routes are used directly. Otherwise falls back to DFS extraction
 * from the grid, and finally to single-path extraction.
 */
export function extractAllWaypoints(config: MapConfig): GridPosition[][] {
  // Prefer explicit paths (set by MapGenerator for multi-path maps)
  if (config.paths && config.paths.length > 0) {
    return config.paths.map(reduceToWaypoints);
  }

  const allPaths = extractAllPaths(config);
  if (allPaths.length === 0) {
    // Fallback to single-path extraction
    const single = extractWaypoints(config);
    return single.length > 0 ? [single] : [];
  }
  return allPaths.map(reduceToWaypoints);
}

/**
 * Reduce a full cell-by-cell path to corner waypoints (direction changes) plus start/end.
 */
function reduceToWaypoints(fullPath: GridPosition[]): GridPosition[] {
  if (fullPath.length <= 2) return fullPath;

  const waypoints: GridPosition[] = [fullPath[0]];

  for (let i = 1; i < fullPath.length - 1; i++) {
    const prev = fullPath[i - 1];
    const curr = fullPath[i];
    const next = fullPath[i + 1];

    const dr1 = curr.row - prev.row;
    const dc1 = curr.col - prev.col;
    const dr2 = next.row - curr.row;
    const dc2 = next.col - curr.col;

    if (dr1 !== dr2 || dc1 !== dc2) {
      waypoints.push(curr);
    }
  }

  waypoints.push(fullPath[fullPath.length - 1]);
  return waypoints;
}

/**
 * Convert grid position to world position given map centering offset.
 */
export function gridToWorld(
  pos: GridPosition,
  config: MapConfig,
): WorldPosition {
  const offsetX = ((config.cols - 1) * config.cellSize) / 2;
  const offsetZ = ((config.rows - 1) * config.cellSize) / 2;
  return {
    x: pos.col * config.cellSize - offsetX,
    y: 0.2, // slightly above grid surface
    z: pos.row * config.cellSize - offsetZ,
  };
}
