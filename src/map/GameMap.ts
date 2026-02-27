import {
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  Color,
} from "three";
import { GridCell, CELL_COLORS } from "@/entities/GridCell";
import { MapConfig, WorldPosition, GridPosition } from "@/types";
import { extractWaypoints, gridToWorld } from "./PathFinder";

export class GameMap {
  readonly config: MapConfig;
  private cells: GridCell[] = [];
  private cellGrid: GridCell[][] = [];
  private group: Group;
  private waypoints: WorldPosition[];
  private terrainMesh!: InstancedMesh;
  private indexToCell: GridCell[] = [];
  private sharedGeometry!: BoxGeometry;
  private sharedMaterial!: MeshStandardMaterial;

  constructor(config: MapConfig) {
    this.config = config;
    this.group = new Group();
    this.buildGrid();
    this.waypoints = extractWaypoints(config).map((gp) =>
      gridToWorld(gp, config),
    );
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
    this.terrainMesh.instanceColor!.needsUpdate = true;
  }

  getObject3D(): Group {
    return this.group;
  }

  getWaypoints(): WorldPosition[] {
    return this.waypoints;
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
