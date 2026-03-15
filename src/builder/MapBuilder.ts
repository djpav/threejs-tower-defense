import {
  Scene,
  AmbientLight,
  DirectionalLight,
  Color,
  Raycaster,
  Vector2,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  Line,
  ConeGeometry,
  RingGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide,
} from "three";
import { CameraController } from "@/rendering/CameraController";
import { CellType, MapConfig } from "@/types";
import { BuilderGrid } from "./BuilderGrid";
import { BuilderToolbar, BuilderTool } from "./BuilderToolbar";
import { validateMap, findPath, findAllPaths } from "./PathValidator";
import * as MapExporter from "./MapExporter";

export class MapBuilder {
  readonly scene: Scene;
  readonly cameraController: CameraController;
  private grid: BuilderGrid;
  private toolbar: BuilderToolbar;
  private canvas: HTMLCanvasElement;
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private isPointerDown = false;
  private lastPaintedCell = "";
  private isTouchPainting = false;
  private pathOverlay: Group | null = null;
  private showingPath = false;
  private onBack: () => void;
  private onPlay: (mapConfig: MapConfig, gold: number, lives: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onBack: () => void,
    onPlay: (mapConfig: MapConfig, gold: number, lives: number) => void,
  ) {
    this.canvas = canvas;
    this.onBack = onBack;
    this.onPlay = onPlay;

    // Build a lightweight scene for the builder
    this.scene = new Scene();
    this.scene.background = new Color(0x1a1a2e);
    const ambient = new AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const directional = new DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);

    // Grid
    this.grid = new BuilderGrid(12, 16);
    this.scene.add(this.grid.getObject3D());

    // Camera — reuse CameraController with a MapConfig-like shape
    const mapConfig = this.buildMapConfig();
    this.cameraController = new CameraController(
      mapConfig,
      window.innerWidth / window.innerHeight,
      canvas,
    );

    // Toolbar
    this.toolbar = new BuilderToolbar({
      onResize: (rows, cols) => this.handleResize(rows, cols),
      onValidate: () => this.handleValidate(),
      onExport: () => this.handleExport(),
      onImport: () => this.handleImport(),
      onPlay: () => this.handlePlay(),
      onBack: () => this.onBack(),
      onClear: () => this.handleClear(),
      onShowPath: () => this.handleShowPath(),
    });

    // Mouse input listeners
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);

    // Touch input listeners
    this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    window.addEventListener("touchend", this.handleTouchEnd);
    window.addEventListener("touchcancel", this.handleTouchCancel);
  }

  private buildMapConfig(): MapConfig {
    return {
      rows: this.grid.getRows(),
      cols: this.grid.getCols(),
      cellSize: this.grid.getCellSize(),
      cellHeight: this.grid.getCellHeight(),
      grid: this.grid.getGrid(),
    };
  }

  private updatePointerFromMouse(event: MouseEvent): void {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private updatePointerFromTouch(touch: Touch): void {
    this.pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  }

  private raycastCell(): { row: number; col: number } | null {
    this.raycaster.setFromCamera(this.pointer, this.cameraController.camera);
    const intersects = this.raycaster.intersectObject(this.grid.getTerrainMesh());
    if (intersects.length > 0 && intersects[0].instanceId != null) {
      return this.grid.instanceToGridPos(intersects[0].instanceId);
    }
    return null;
  }

  private paintCell(row: number, col: number): void {
    const key = `${row},${col}`;
    if (key === this.lastPaintedCell) return;
    this.lastPaintedCell = key;

    // Clear stale path overlay when grid changes
    if (this.showingPath) {
      this.clearPathOverlay();
      this.showingPath = false;
    }

    const tool = this.toolbar.getActiveTool();
    const cellType = this.toolToCellType(tool);

    // For spawn/goal, ensure only one exists by erasing previous
    if (tool === "spawn" || tool === "goal") {
      const target = tool === "spawn" ? CellType.Spawn : CellType.Goal;
      const grid = this.grid.getGrid();
      for (let r = 0; r < this.grid.getRows(); r++) {
        for (let c = 0; c < this.grid.getCols(); c++) {
          if (grid[r][c] === target) {
            this.grid.setCellType(r, c, CellType.Buildable);
          }
        }
      }
    }

    this.grid.setCellType(row, col, cellType);
  }

  private toolToCellType(tool: BuilderTool): CellType {
    switch (tool) {
      case "path": return CellType.Path;
      case "spawn": return CellType.Spawn;
      case "goal": return CellType.Goal;
      case "erase": return CellType.Buildable;
    }
  }

  // ── Input handlers ──

  private handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return; // left click only
    this.isPointerDown = true;
    this.lastPaintedCell = "";
    this.updatePointerFromMouse(event);
    const cell = this.raycastCell();
    if (cell) this.paintCell(cell.row, cell.col);
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isPointerDown) return;
    this.updatePointerFromMouse(event);
    const cell = this.raycastCell();
    if (cell) this.paintCell(cell.row, cell.col);
  };

  private handleMouseUp = (): void => {
    this.isPointerDown = false;
    this.lastPaintedCell = "";
  };

  // ── Touch handlers ──

  private handleTouchStart = (event: TouchEvent): void => {
    // Only handle single-finger touches for painting;
    // multi-finger gestures are for camera control (OrbitControls).
    if (event.touches.length !== 1) return;

    event.preventDefault();
    this.isTouchPainting = true;
    this.lastPaintedCell = "";

    const touch = event.touches[0];
    this.updatePointerFromTouch(touch);
    const cell = this.raycastCell();
    if (cell) this.paintCell(cell.row, cell.col);
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.isTouchPainting || event.touches.length !== 1) return;

    event.preventDefault();
    const touch = event.touches[0];
    this.updatePointerFromTouch(touch);
    const cell = this.raycastCell();
    if (cell) this.paintCell(cell.row, cell.col);
  };

  private handleTouchEnd = (): void => {
    this.isTouchPainting = false;
    this.lastPaintedCell = "";
  };

  private handleTouchCancel = (): void => {
    this.isTouchPainting = false;
    this.lastPaintedCell = "";
  };

  // ── Toolbar callbacks ──

  private handleResize(rows: number, cols: number): void {
    this.clearPathOverlay();
    this.showingPath = false;
    this.scene.remove(this.grid.getObject3D());
    this.grid.dispose();
    this.grid = new BuilderGrid(rows, cols);
    this.scene.add(this.grid.getObject3D());

    // Rebuild camera to fit new grid
    this.cameraController.dispose();
    const mapConfig = this.buildMapConfig();
    const newCam = new CameraController(
      mapConfig,
      window.innerWidth / window.innerHeight,
      this.canvas,
    );
    // Copy camera controller reference — but we own it, so replace
    (this as { cameraController: CameraController }).cameraController = newCam;
  }

  private handleValidate(): void {
    const result = validateMap(
      this.grid.getGrid(),
      this.grid.getRows(),
      this.grid.getCols(),
    );
    this.toolbar.showValidation(result.valid, result.errors);
  }

  private handleExport(): void {
    const mapFile = MapExporter.exportToJSON(
      this.grid.getGrid(),
      this.grid.getRows(),
      this.grid.getCols(),
      "Custom Map",
      100,
      20,
    );
    MapExporter.download(mapFile);
  }

  private async handleImport(): Promise<void> {
    try {
      const mapFile = await MapExporter.upload();
      // Resize grid to match imported map
      this.handleResize(mapFile.rows, mapFile.cols);
      this.toolbar.setGridSize(mapFile.rows, mapFile.cols);
      // Load cells
      const grid = mapFile.grid.map((row) => row.map((c) => c as CellType));
      this.grid.loadGrid(grid);
    } catch (e) {
      this.toolbar.showValidation(false, [(e as Error).message]);
    }
  }

  private handlePlay(): void {
    const result = validateMap(
      this.grid.getGrid(),
      this.grid.getRows(),
      this.grid.getCols(),
    );
    if (!result.valid) {
      this.toolbar.showValidation(result.valid, result.errors);
      return;
    }

    const mapConfig = this.buildMapConfig();
    this.onPlay(mapConfig, 100, 20);
  }

  private handleShowPath(): void {
    if (this.showingPath) {
      this.clearPathOverlay();
      this.showingPath = false;
      return;
    }

    const allPaths = findAllPaths(
      this.grid.getGrid(),
      this.grid.getRows(),
      this.grid.getCols(),
    );

    if (allPaths.length === 0) {
      // Fallback to single BFS path
      const path = findPath(
        this.grid.getGrid(),
        this.grid.getRows(),
        this.grid.getCols(),
      );
      if (path.length === 0) {
        this.toolbar.showValidation(false, ["No valid path to display"]);
        return;
      }
      this.buildPathOverlay(path);
    } else {
      this.buildMultiPathOverlay(allPaths);
    }
    this.showingPath = true;
  }

  private buildPathOverlay(path: { row: number; col: number }[]): void {
    this.clearPathOverlay();

    const overlay = new Group();
    const cellSize = this.grid.getCellSize();
    const y = this.grid.getCellHeight() + 0.05; // slightly above grid

    // Line tracing the path
    const positions: number[] = [];
    for (const p of path) {
      positions.push(p.col * cellSize, y, p.row * cellSize);
    }
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    const lineMat = new LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
    const line = new Line(lineGeo, lineMat);
    overlay.add(line);

    // Direction arrows every few cells
    // Pre-rotate geometry so tip points along +Z (default is +Y)
    const arrowGeo = new ConeGeometry(cellSize * 0.12, cellSize * 0.3, 4);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new MeshBasicMaterial({ color: 0xffff00 });
    const step = Math.max(1, Math.floor(path.length / 8));
    for (let i = step; i < path.length; i += step) {
      const curr = path[i];
      // Use forward direction when possible, fall back to backward
      const next = i + 1 < path.length ? path[i + 1] : curr;
      const prev = path[i - 1];
      const dx = i + 1 < path.length ? next.col - curr.col : curr.col - prev.col;
      const dz = i + 1 < path.length ? next.row - curr.row : curr.row - prev.row;

      const arrow = new Mesh(arrowGeo, arrowMat);
      arrow.position.set(
        curr.col * cellSize,
        y + 0.05,
        curr.row * cellSize,
      );
      // Single Y-axis rotation for heading (geometry already points +Z)
      arrow.rotation.y = Math.atan2(dx, dz);
      overlay.add(arrow);
    }

    // Mark orphaned path cells (not on the valid route) with red rings
    const onPath = new Set(path.map((p) => `${p.row},${p.col}`));
    const grid = this.grid.getGrid();
    const orphanGeo = new RingGeometry(cellSize * 0.2, cellSize * 0.35, 8);
    orphanGeo.rotateX(-Math.PI / 2);
    const orphanMat = new MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8,
      side: DoubleSide,
    });
    for (let r = 0; r < this.grid.getRows(); r++) {
      for (let c = 0; c < this.grid.getCols(); c++) {
        if (grid[r][c] === CellType.Path && !onPath.has(`${r},${c}`)) {
          const ring = new Mesh(orphanGeo, orphanMat);
          ring.position.set(c * cellSize, y + 0.02, r * cellSize);
          overlay.add(ring);
        }
      }
    }

    // Apply same centering offset as the grid group
    overlay.position.copy(this.grid.getObject3D().position);
    this.scene.add(overlay);
    this.pathOverlay = overlay;
  }

  /** Overlay colors for multiple paths. */
  private static readonly PATH_COLORS = [0xffff00, 0x00ffff, 0xff8800, 0x00ff00, 0xff00ff];

  private buildMultiPathOverlay(paths: { row: number; col: number }[][]): void {
    this.clearPathOverlay();

    const overlay = new Group();
    const cellSize = this.grid.getCellSize();
    const baseY = this.grid.getCellHeight() + 0.05;

    // Collect all cells from all paths for orphan detection
    const allOnPath = new Set<string>();
    for (const path of paths) {
      for (const p of path) {
        allOnPath.add(`${p.row},${p.col}`);
      }
    }

    for (let pi = 0; pi < paths.length; pi++) {
      const path = paths[pi];
      const color = MapBuilder.PATH_COLORS[pi % MapBuilder.PATH_COLORS.length];
      const y = baseY + pi * 0.04; // slight Y offset per path

      // Line
      const positions: number[] = [];
      for (const p of path) {
        positions.push(p.col * cellSize, y, p.row * cellSize);
      }
      const lineGeo = new BufferGeometry();
      lineGeo.setAttribute("position", new Float32BufferAttribute(positions, 3));
      const lineMat = new LineBasicMaterial({ color, linewidth: 2 });
      overlay.add(new Line(lineGeo, lineMat));

      // Direction arrows
      const arrowGeo = new ConeGeometry(cellSize * 0.12, cellSize * 0.3, 4);
      arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new MeshBasicMaterial({ color });
      const step = Math.max(1, Math.floor(path.length / 8));
      for (let i = step; i < path.length; i += step) {
        const curr = path[i];
        const next = i + 1 < path.length ? path[i + 1] : curr;
        const prev = path[i - 1];
        const dx = i + 1 < path.length ? next.col - curr.col : curr.col - prev.col;
        const dz = i + 1 < path.length ? next.row - curr.row : curr.row - prev.row;

        const arrow = new Mesh(arrowGeo, arrowMat);
        arrow.position.set(curr.col * cellSize, y + 0.05, curr.row * cellSize);
        arrow.rotation.y = Math.atan2(dx, dz);
        overlay.add(arrow);
      }
    }

    // Mark orphaned path cells (not on any valid route) with red rings
    const grid = this.grid.getGrid();
    const orphanGeo = new RingGeometry(cellSize * 0.2, cellSize * 0.35, 8);
    orphanGeo.rotateX(-Math.PI / 2);
    const orphanMat = new MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8,
      side: DoubleSide,
    });
    for (let r = 0; r < this.grid.getRows(); r++) {
      for (let c = 0; c < this.grid.getCols(); c++) {
        if (grid[r][c] === CellType.Path && !allOnPath.has(`${r},${c}`)) {
          const ring = new Mesh(orphanGeo, orphanMat);
          ring.position.set(c * cellSize, baseY + 0.02, r * cellSize);
          overlay.add(ring);
        }
      }
    }

    overlay.position.copy(this.grid.getObject3D().position);
    this.scene.add(overlay);
    this.pathOverlay = overlay;
  }

  private clearPathOverlay(): void {
    if (this.pathOverlay) {
      // Dispose geometries and materials
      this.pathOverlay.traverse((obj) => {
        if (obj instanceof Line) {
          obj.geometry.dispose();
          (obj.material as LineBasicMaterial).dispose();
        }
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
          (obj.material as MeshBasicMaterial).dispose();
        }
      });
      this.scene.remove(this.pathOverlay);
      this.pathOverlay = null;
    }
  }

  private handleClear(): void {
    this.grid.clear();
    this.clearPathOverlay();
    this.showingPath = false;
  }

  update(): void {
    this.cameraController.update();
  }

  resize(aspect: number): void {
    this.cameraController.resize(aspect);
  }

  dispose(): void {
    this.clearPathOverlay();
    // Mouse
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    // Touch
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleTouchEnd);
    window.removeEventListener("touchcancel", this.handleTouchCancel);

    this.toolbar.dispose();
    this.grid.dispose();
    this.cameraController.dispose();
  }
}
