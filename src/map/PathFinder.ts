import { CellType, GridPosition, MapConfig, WorldPosition } from "@/types";
import { findCells } from "./MapData";

const DIRS: GridPosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

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
    for (const dir of DIRS) {
      const nr = current.row + dir.row;
      const nc = current.col + dir.col;
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
 * Reduce path to corner waypoints (where direction changes) plus start/end.
 */
export function extractWaypoints(
  config: MapConfig,
): GridPosition[] {
  const fullPath = extractPathCells(config);
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
