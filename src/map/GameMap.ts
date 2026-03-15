import {
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  Color,
} from "three";
import { GridCell, CELL_COLORS } from "@/entities/GridCell";
import { CellType, MapConfig, WorldPosition, GridPosition } from "@/types";
import { extractWaypoints, extractAllWaypoints, gridToWorld } from "./PathFinder";

export class GameMap {
  readonly config: MapConfig;
  private cells: GridCell[] = [];
  private cellGrid: GridCell[][] = [];
  private group: Group;
  private waypoints: WorldPosition[];
  /** All waypoint paths (for multi-path maps). Always has at least one entry. */
  private allWaypoints: WorldPosition[][];
  private terrainMesh!: InstancedMesh;
  private indexToCell: GridCell[] = [];
  private sharedGeometry!: BoxGeometry;
  private sharedMaterial!: MeshStandardMaterial;

  constructor(config: MapConfig) {
    this.config = config;
    this.group = new Group();
    this.buildGrid();

    const allGridWaypoints = extractAllWaypoints(config);
    this.allWaypoints = allGridWaypoints.map((path) =>
      path.map((gp) => gridToWorld(gp, config)),
    );
    // Primary waypoints = first path (backwards-compatible)
    this.waypoints = this.allWaypoints[0] ?? [];
  }

  private buildGrid(): void {
    const { rows, cols, cellSize, cellHeight, grid } = this.config;
    const gap = 0.05;

    // Single shared geometry and material for all terrain cells
    this.sharedGeometry = new BoxGeometry(cellSize - gap, cellHeight, cellSize - gap);
    this.sharedMaterial = new MeshStandardMaterial();

    const count = rows * cols;
    this.terrainMesh = new InstancedMesh(this.sharedGeometry, this.sharedMaterial, count);

    const matrix = new Matrix4();
    const color = new Color();

    this.cellGrid = [];
    for (let row = 0; row < rows; row++) {
      const rowArr: GridCell[] = [];
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const cellType = grid[row][col];

        // Set instance transform
        matrix.identity();
        matrix.setPosition(col * cellSize, cellHeight / 2, row * cellSize);
        this.terrainMesh.setMatrixAt(index, matrix);

        // Set instance color
        color.setHex(CELL_COLORS[cellType]);
        this.terrainMesh.setColorAt(index, color);

        // Create lightweight GridCell (no mesh creation)
        const cell = new GridCell(cellType, { row, col }, cellSize, cellHeight);
        cell.instanceIndex = index;
        cell.onColorChange = (i, c) => this.updateInstanceColor(i, c);

        this.cells.push(cell);
        this.indexToCell.push(cell);
        rowArr.push(cell);

        // Add marker objects (spawn/goal only) to group
        const markerObj = cell.getMarkerObject();
        if (markerObj) {
          this.group.add(markerObj);
        }
      }
      this.cellGrid.push(rowArr);
    }

    // Tint secondary path cells so players can visually distinguish routes
    if (this.config.paths && this.config.paths.length >= 2) {
      const primarySet = new Set<string>();
      for (const pos of this.config.paths[0]) {
        primarySet.add(`${pos.row},${pos.col}`);
      }
      // Also include spawn/goal cells so they never get tinted
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ct = grid[r][c];
          if (ct === CellType.Spawn || ct === CellType.Goal) {
            primarySet.add(`${r},${c}`);
          }
        }
      }

      const secondaryColor = new Color(0xc4a06e); // warmer golden-tan
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== CellType.Path) continue;
          if (primarySet.has(`${r},${c}`)) continue;
          const idx = r * cols + c;
          this.terrainMesh.setColorAt(idx, secondaryColor);
          // Update the GridCell's baseColor so unhighlight restores the tinted shade
          this.cellGrid[r][c].baseColor.copy(secondaryColor);
        }
      }
    }

    // Mark instance buffers for upload
    this.terrainMesh.instanceMatrix.needsUpdate = true;
    if (this.terrainMesh.instanceColor) {
      this.terrainMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.terrainMesh);

    // Center the group so the map's midpoint is at the origin
    this.group.position.set(
      -((cols - 1) * cellSize) / 2,
      0,
      -((rows - 1) * cellSize) / 2,
    );
  }

  private updateInstanceColor(index: number, color: Color): void {
    this.terrainMesh.setColorAt(index, color);
    if (this.terrainMesh.instanceColor) this.terrainMesh.instanceColor.needsUpdate = true;
  }

  getObject3D(): Group {
    return this.group;
  }

  getWaypoints(): WorldPosition[] {
    return this.waypoints;
  }

  /** Returns all waypoint paths. For single-path maps, the array has one entry. */
  getAllWaypoints(): WorldPosition[][] {
    return this.allWaypoints;
  }

  getCellAt(row: number, col: number): GridCell | undefined {
    return this.cellGrid[row]?.[col];
  }

  getWorldPosition(gridPos: GridPosition): WorldPosition {
    return gridToWorld(gridPos, this.config);
  }

  getTerrainMesh(): InstancedMesh {
    return this.terrainMesh;
  }

  getCellByInstanceId(id: number): GridCell | undefined {
    return this.indexToCell[id];
  }

  update(delta: number): void {
    for (const cell of this.cells) {
      cell.update(delta);
    }
  }

  dispose(): void {
    for (const cell of this.cells) {
      cell.dispose();
    }
    this.sharedGeometry.dispose();
    this.sharedMaterial.dispose();
    this.cells = [];
    this.cellGrid = [];
    this.indexToCell = [];
  }
}
