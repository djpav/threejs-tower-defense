import { Raycaster, Vector2, Camera, Group, Object3D } from "three";
import { GameMap } from "@/map/GameMap";
import { GridCell } from "@/entities/GridCell";
import { Enemy } from "@/entities/Enemy";
import { CellType, GridPosition } from "@/types";

/** Maximum distance (px) a finger can move and still be considered a tap. */
const TAP_MOVE_THRESHOLD = 10;

/** Maximum duration (ms) for a touch to be considered a tap. */
const TAP_DURATION_MS = 300;

/** Duration (ms) for a long-press gesture. */
const LONG_PRESS_MS = 500;

export type PointerType = "mouse" | "touch";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private map: GameMap;
  private enemyGroup: Group;
  private raycaster: Raycaster;
  private pointer: Vector2;
  private hoveredCell: GridCell | null = null;
  private onCellClick: ((gridPos: GridPosition) => void) | null = null;
  private onTowerClick: ((gridPos: GridPosition) => void) | null = null;
  private onEmptyClick: (() => void) | null = null;
  private onCellHover: ((gridPos: GridPosition | null) => void) | null = null;
  private onEnemyClick: ((enemy: Enemy) => void) | null = null;
  private onLongPress: ((gridPos: GridPosition) => void) | null = null;

  /** Tracks whether the last interaction came from mouse or touch. */
  pointerType: PointerType = "mouse";

  // ── Touch-tap detection state ──
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(canvas: HTMLCanvasElement, camera: Camera, map: GameMap, enemyGroup: Group) {
    this.canvas = canvas;
    this.camera = camera;
    this.map = map;
    this.enemyGroup = enemyGroup;
    this.raycaster = new Raycaster();
    this.pointer = new Vector2();

    // Mouse events
    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);

    // Touch events
    this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener("touchcancel", this.handleTouchCancel);
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

  setOnLongPress(callback: (gridPos: GridPosition) => void): void {
    this.onLongPress = callback;
  }

  // ── Unified pointer coordinate update ──

  private updatePointerFromMouse(event: MouseEvent): void {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private updatePointerFromTouch(touch: Touch): void {
    this.pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  }

  // ── Raycasting (shared by mouse and touch) ──

  private raycastCell(): GridCell | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
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

  /**
   * Shared click/tap handler -- processes a pointer interaction at the
   * current `this.pointer` coordinates. Called from both mouse click and
   * touch tap detection.
   */
  private processClick(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);

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

    // Clicked outside any buildable cell -> deselect
    if (this.onEmptyClick) {
      this.onEmptyClick();
    }
  }

  /**
   * Shared hover handler -- updates highlight and hover callback at the
   * current `this.pointer` coordinates. Called from both mousemove and
   * touchmove.
   */
  private processHover(): void {
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
  }

  // ── Mouse handlers ──

  private handleClick = (event: MouseEvent): void => {
    this.pointerType = "mouse";
    this.updatePointerFromMouse(event);
    this.processClick();
  };

  private handleMouseMove = (event: MouseEvent): void => {
    this.pointerType = "mouse";
    this.updatePointerFromMouse(event);
    this.processHover();
  };

  // ── Touch handlers ──

  private handleTouchStart = (event: TouchEvent): void => {
    // Only handle single-finger touches for game interaction;
    // multi-finger gestures are handled by CameraController (OrbitControls).
    if (event.touches.length !== 1) {
      this.cancelLongPress();
      return;
    }

    event.preventDefault();
    this.pointerType = "touch";

    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = performance.now();

    // Update pointer for hover preview
    this.updatePointerFromTouch(touch);
    this.processHover();

    // Start long-press timer
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.handleLongPress();
    }, LONG_PRESS_MS);
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (event.touches.length !== 1) {
      this.cancelLongPress();
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If the finger moved beyond threshold, this is a drag (camera pan),
    // not a tap -- cancel long-press and let OrbitControls handle it.
    if (distance > TAP_MOVE_THRESHOLD) {
      this.cancelLongPress();
      return;
    }

    // Finger is still near start position -- update hover preview
    event.preventDefault();
    this.pointerType = "touch";
    this.updatePointerFromTouch(touch);
    this.processHover();
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    this.cancelLongPress();

    // Use changedTouches for the finger that was lifted
    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = performance.now() - this.touchStartTime;

    // Only treat as a tap if the finger stayed close and was brief
    if (distance <= TAP_MOVE_THRESHOLD && duration <= TAP_DURATION_MS) {
      event.preventDefault();
      this.pointerType = "touch";
      this.updatePointerFromTouch(touch);
      this.processClick();
    }

    // Clear hover on touch end (no finger on screen)
    if (this.hoveredCell) {
      this.hoveredCell.unhighlight();
      this.hoveredCell = null;
    }
    if (this.onCellHover) this.onCellHover(null);
  };

  private handleTouchCancel = (): void => {
    this.cancelLongPress();
    if (this.hoveredCell) {
      this.hoveredCell.unhighlight();
      this.hoveredCell = null;
    }
    if (this.onCellHover) this.onCellHover(null);
  };

  private cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private handleLongPress(): void {
    if (!this.onLongPress) return;

    // Raycast at the current pointer position to find if we're on a tower
    const cell = this.raycastCell();
    if (cell && cell.cellType === CellType.Buildable && cell.occupied) {
      this.onLongPress(cell.gridPos);
    }
  }

  dispose(): void {
    // Mouse
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);

    // Touch
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.handleTouchCancel);

    this.cancelLongPress();

    if (this.hoveredCell) {
      this.hoveredCell.unhighlight();
    }
  }
}
