import { CellType, GridPosition, MapConfig } from "@/types";

/**
 * BFS-based distance field from goal cell.
 * Each cell stores the shortest distance (in steps) to the goal.
 * Blocked cells (towers) have Infinity distance.
 * Enemies follow the gradient (move to lowest-distance neighbor).
 */
export class DistanceField {
  readonly rows: number;
  readonly cols: number;
  private distances: number[][];
  private goalPos: GridPosition;

  constructor(config: MapConfig) {
    this.rows = config.rows;
    this.cols = config.cols;
    this.distances = [];
    this.goalPos = { row: 0, col: 0 };

    // Find goal
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (config.grid[r][c] === CellType.Goal) {
          this.goalPos = { row: r, col: c };
        }
      }
    }

    this.rebuild(config.grid);
  }

  /**
   * Rebuild the distance field via BFS from the goal.
   * Any cell that is CellType.Buildable AND has a tower (blocked=true in blockedCells)
   * gets Infinity distance.
   * Path, Spawn, Goal cells are always walkable.
   * Buildable cells WITHOUT towers are NOT walkable (enemies can't walk on buildable cells).
   */
  rebuild(grid: CellType[][], blockedCells?: Set<string>): void {
    const { rows, cols } = this;

    // Initialize all to Infinity
    this.distances = [];
    for (let r = 0; r < rows; r++) {
      this.distances[r] = new Array<number>(cols).fill(Infinity);
    }

    // BFS from goal
    const queue: GridPosition[] = [];
    this.distances[this.goalPos.row][this.goalPos.col] = 0;
    queue.push(this.goalPos);

    const DIRS: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    let head = 0;

    while (head < queue.length) {
      const pos = queue[head++];
      const currentDist = this.distances[pos.row][pos.col];

      for (const [dr, dc] of DIRS) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (this.distances[nr][nc] <= currentDist + 1) continue;

        const cellType = grid[nr][nc];
        // Only allow walking on Path, Spawn, Goal cells
        if (cellType === CellType.Buildable) continue;
        // Check if blocked by a tower (future use for dynamic blocking)
        if (blockedCells && blockedCells.has(`${nr},${nc}`)) continue;

        this.distances[nr][nc] = currentDist + 1;
        queue.push({ row: nr, col: nc });
      }
    }
  }

  /** Get the distance value at a grid position. */
  getDistance(row: number, col: number): number {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols)
      return Infinity;
    return this.distances[row][col];
  }

  /** Check if a cell is reachable from the goal. */
  isReachable(row: number, col: number): boolean {
    return this.getDistance(row, col) < Infinity;
  }

  /** Check if spawn can reach goal (validates that path isn't blocked). */
  isSpawnReachable(spawnRow: number, spawnCol: number): boolean {
    return this.isReachable(spawnRow, spawnCol);
  }

  /**
   * Get the next cell an enemy should move to from the given position.
   * Returns the neighbor with the lowest distance value.
   * Returns null if at goal or stuck.
   */
  getNextCell(row: number, col: number): GridPosition | null {
    const currentDist = this.getDistance(row, col);
    if (currentDist === 0) return null; // at goal
    if (currentDist === Infinity) return null; // unreachable

    const DIRS: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    let bestPos: GridPosition | null = null;
    let bestDist = currentDist;

    for (const [dr, dc] of DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      const d = this.getDistance(nr, nc);
      if (d < bestDist) {
        bestDist = d;
        bestPos = { row: nr, col: nc };
      }
    }

    return bestPos;
  }

  /**
   * Extract a full path from a start position to the goal by following the gradient.
   * Useful for converting distance field navigation into waypoints for smooth movement.
   */
  extractPath(startRow: number, startCol: number): GridPosition[] {
    const path: GridPosition[] = [{ row: startRow, col: startCol }];
    let row = startRow;
    let col = startCol;
    const maxSteps = this.rows * this.cols;

    for (let i = 0; i < maxSteps; i++) {
      const next = this.getNextCell(row, col);
      if (!next) break;
      path.push(next);
      row = next.row;
      col = next.col;
    }

    return path;
  }

  /** Get the raw distance grid (for debugging/visualization). */
  getDistances(): readonly number[][] {
    return this.distances;
  }
}
