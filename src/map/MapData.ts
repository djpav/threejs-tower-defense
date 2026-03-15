import { CellType, GridPosition, MapConfig } from "@/types";

/** 4-directional neighbor offsets (up, down, left, right). */
export const GRID_DIRS: readonly [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function findCells(config: MapConfig, type: CellType): GridPosition[] {
  const result: GridPosition[] = [];
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      if (config.grid[row][col] === type) {
        result.push({ row, col });
      }
    }
  }
  return result;
}