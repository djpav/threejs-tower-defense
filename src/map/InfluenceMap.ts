import { MapConfig } from "@/types";
import { Tower } from "@/entities/Tower";

/**
 * Grid-based influence/danger map.
 * Each cell stores a danger value based on proximity to towers.
 * Used for enemy path scoring: score = distance + danger * weight.
 */
export class InfluenceMap {
  readonly rows: number;
  readonly cols: number;
  private danger: number[][];
  private cellSize: number;
  private offsetX: number;
  private offsetZ: number;

  constructor(config: MapConfig) {
    this.rows = config.rows;
    this.cols = config.cols;
    this.cellSize = config.cellSize;
    // Map centering offsets (same as GameMap/gridToWorld)
    this.offsetX = ((config.cols - 1) * config.cellSize) / 2;
    this.offsetZ = ((config.rows - 1) * config.cellSize) / 2;
    this.danger = [];
    this.clear();
  }

  /** Reset all danger values to 0. */
  clear(): void {
    this.danger = [];
    for (let r = 0; r < this.rows; r++) {
      this.danger[r] = new Array<number>(this.cols).fill(0);
    }
  }

  /**
   * Rebuild the danger map from current tower positions.
   * Each tower emits influence: danger = max(0, range - distance).
   * Overlapping tower ranges stack additively.
   */
  rebuild(towers: readonly Tower[]): void {
    this.clear();

    for (const tower of towers) {
      const towerPos = tower.getObject3D().position;
      const range = tower.config.range;
      const damage = tower.config.damage;

      // Convert world position to grid position
      const gridCol = Math.round((towerPos.x + this.offsetX) / this.cellSize);
      const gridRow = Math.round((towerPos.z + this.offsetZ) / this.cellSize);

      // Cells within range
      const cellRange = Math.ceil(range / this.cellSize);

      for (let dr = -cellRange; dr <= cellRange; dr++) {
        for (let dc = -cellRange; dc <= cellRange; dc++) {
          const r = gridRow + dr;
          const c = gridCol + dc;
          if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;

          // World-space distance from tower center to cell center
          const cellWorldX = c * this.cellSize - this.offsetX;
          const cellWorldZ = r * this.cellSize - this.offsetZ;
          const dx = cellWorldX - towerPos.x;
          const dz = cellWorldZ - towerPos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist <= range) {
            // Danger falls off linearly with distance, weighted by tower damage
            const influence = (1 - dist / range) * damage;
            this.danger[r][c] += influence;
          }
        }
      }
    }
  }

  /** Get the danger value at a grid position. */
  getDanger(row: number, col: number): number {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return 0;
    return this.danger[row][col];
  }

  /** Get the danger value at a world position. */
  getDangerAtWorld(worldX: number, worldZ: number): number {
    const col = Math.round((worldX + this.offsetX) / this.cellSize);
    const row = Math.round((worldZ + this.offsetZ) / this.cellSize);
    return this.getDanger(row, col);
  }

  /** Get the raw danger grid (for debugging/visualization). */
  getDangerGrid(): readonly number[][] {
    return this.danger;
  }
}
