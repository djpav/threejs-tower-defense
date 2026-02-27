import { Group } from "three";
import { Tower } from "@/entities/Tower";
import { TowerConfig, GridPosition } from "@/types";
import { GameMap } from "@/map/GameMap";
import { CellType } from "@/types";

export class TowerManager {
  private towers: Tower[] = [];
  private group: Group;
  private map: GameMap;
  private cachedTowers: readonly Tower[] | null = null;

  constructor(group: Group, map: GameMap) {
    this.group = group;
    this.map = map;
  }

  canPlace(gridPos: GridPosition): boolean {
    const cell = this.map.getCellAt(gridPos.row, gridPos.col);
    return !!cell && cell.cellType === CellType.Buildable && !cell.occupied;
  }

  place(config: TowerConfig, gridPos: GridPosition): Tower | null {
    if (!this.canPlace(gridPos)) return null;

    const cell = this.map.getCellAt(gridPos.row, gridPos.col)!;
    const worldPos = this.map.getWorldPosition(gridPos);
    const tower = new Tower(config, gridPos, worldPos.x, worldPos.z);
    cell.occupied = true;
    this.towers.push(tower);
    this.cachedTowers = null;
    this.group.add(tower.getObject3D());
    tower.startPlacementAnimation();
    return tower;
  }

  remove(tower: Tower): void {
    const cell = this.map.getCellAt(tower.gridPos.row, tower.gridPos.col);
    if (cell) cell.occupied = false;
    this.group.remove(tower.getObject3D());
    tower.dispose();
    const idx = this.towers.indexOf(tower);
    if (idx !== -1) this.towers.splice(idx, 1);
    this.cachedTowers = null;
  }

  getTowerAt(gridPos: GridPosition): Tower | undefined {
    return this.towers.find(
      (t) => t.gridPos.row === gridPos.row && t.gridPos.col === gridPos.col,
    );
  }

  upgradeTower(tower: Tower, newConfig: TowerConfig): void {
    tower.upgrade(newConfig);
  }

  getTowers(): readonly Tower[] {
    if (!this.cachedTowers) {
      this.cachedTowers = [...this.towers];
    }
    return this.cachedTowers;
  }

  update(delta: number): void {
    for (const tower of this.towers) {
      tower.update(delta);
    }
  }

  dispose(): void {
    for (const tower of this.towers) {
      this.group.remove(tower.getObject3D());
      tower.dispose();
    }
    this.towers = [];
  }
}
