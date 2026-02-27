import { CellType } from "./enums";

export interface GridPosition {
  row: number;
  col: number;
}

export interface MapConfig {
  rows: number;
  cols: number;
  cellSize: number;
  cellHeight: number;
  grid: CellType[][];
}

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface MapGenParams {
  rows: number;
  cols: number;
  minPathLength: number;
  seed: number;
}
