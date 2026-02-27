import { Raycaster, Vector2, Camera, Group, Object3D } from "three";
import { GameMap } from "@/map/GameMap";
import { GridCell } from "@/entities/GridCell";
import { Enemy } from "@/entities/Enemy";
import { CellType, GridPosition } from "@/types";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private map: GameMap;
  private enemyGroup: Group;
  private raycaster: Raycaster;
  private mouse: Vector2;
  private hoveredCell: GridCell | null = null;
  private onCellClick: ((gridPos: GridPosition) => void) | null = null;
  private onTowerClick: ((gridPos: GridPosition) => void) | null = null;
  private onEmptyClick: (() => void) | null = null;
  private onCellHover: ((gridPos: GridPosition | null) => void) | null = null;
  private onEnemyClick: ((enemy: Enemy) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, camera: Camera, map: GameMap, enemyGroup: Group) {
    this.canvas = canvas;
    this.camera = camera;
    this.map = map;
    this.enemyGroup = enemyGroup;
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
  }

  setOnCellClick(callback: (gridPos: GridPosition) => void): void {
    this.onCellClick = callback;
  }

  setOnTowerClick(callback: (gridPos: GridPosition) => void): void {
    this.onTowerClick = callback;
  }

  setOnEmptyClick(callback: () => void): void {
    this.onEmptyClick = callback;
  }

  setOnCellHover(callback: (gridPos: GridPosition | null) => void): void {
    this.onCellHover = callback;
  }

  setOnEnemyClick(callback: (enemy: Enemy) => void): void {
    this.onEnemyClick = callback;
  }

  private updateMouse(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private raycastCell(): GridCell | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.map.getTerrainMesh());
    if (intersects.length > 0 && intersects[0].instanceId != null) {
      return this.map.getCellByInstanceId(intersects[0].instanceId) ?? null;
    }
    return null;
  }

  private findEnemyFromHit(object: Object3D): Enemy | null {
    let current: Object3D | null = object;
    while (current) {
      if (current.userData.entity instanceof Enemy) {
        return current.userData.entity;
      }
      current = current.parent;
    }
    return null;
  }

  private handleClick = (event: MouseEvent): void => {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Raycast enemies first (recursive to hit child meshes)
    if (this.enemyGroup.children.length > 0) {
      const enemyHits = this.raycaster.intersectObjects(this.enemyGroup.children, true);
      if (enemyHits.length > 0) {
        const enemy = this.findEnemyFromHit(enemyHits[0].object);
        if (enemy && enemy.alive && this.onEnemyClick) {
          this.onEnemyClick(enemy);
          return;
        }
      }
    }

    // Fall through to terrain raycast
    const cell = this.raycastCell();

    if (cell && cell.cellType === CellType.Buildable) {
      if (cell.occupied && this.onTowerClick) {
        this.onTowerClick(cell.gridPos);
      } else if (!cell.occupied && this.onCellClick) {
        this.onCellClick(cell.gridPos);
      }
      return;
    }

    // Clicked outside any buildable cell → deselect
    if (this.onEmptyClick) {
      this.onEmptyClick();
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    this.updateMouse(event);
    const cell = this.raycastCell();

    if (this.hoveredCell && this.hoveredCell !== cell) {
      this.hoveredCell.unhighlight();
      this.hoveredCell = null;
    }

    if (
      cell &&
      cell.cellType === CellType.Buildable &&
      !cell.occupied
    ) {
      cell.highlight();
      this.hoveredCell = cell;
      if (this.onCellHover) this.onCellHover(cell.gridPos);
    } else {
      if (this.onCellHover) this.onCellHover(null);
    }
  };

  dispose(): void {
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    if (this.hoveredCell) {
      this.hoveredCell.unhighlight();
    }
  }
}
