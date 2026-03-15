import {
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  Color,
} from "three";
import { CellType } from "@/types";
import { CELL_COLORS } from "@/entities/GridCell";

const CELL_SIZE = 1;
const CELL_HEIGHT = 0.08;
const GAP = 0;

export class BuilderGrid {
  private rows: number;
  private cols: number;
  private grid: CellType[][];
  private group: Group;
  private terrainMesh!: InstancedMesh;
  private sharedGeometry!: BoxGeometry;
  private sharedMaterial!: MeshStandardMaterial;
  private tempColor = new Color();

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = [];
    this.group = new Group();
    this.initGrid();
    this.buildMesh();
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: CellType[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(CellType.Buildable);
      }
      this.grid.push(row);
    }
  }

  private buildMesh(): void {
    this.sharedGeometry = new BoxGeometry(CELL_SIZE - GAP, CELL_HEIGHT, CELL_SIZE - GAP);
    this.sharedMaterial = new MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.0,
    });

    const count = this.rows * this.cols;
    this.terrainMesh = new InstancedMesh(this.sharedGeometry, this.sharedMaterial, count);

    const matrix = new Matrix4();
    const color = new Color();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const index = r * this.cols + c;
        matrix.identity();
        matrix.setPosition(c * CELL_SIZE, CELL_HEIGHT / 2, r * CELL_SIZE);
        this.terrainMesh.setMatrixAt(index, matrix);

        color.setHex(CELL_COLORS[this.grid[r][c]]);
        if (this.grid[r][c] === CellType.Buildable) {
          const variation = ((r * 7 + c * 13 + r * c) % 20 - 10) / 200;
          color.r = Math.max(0, Math.min(1, color.r + variation));
          color.g = Math.max(0, Math.min(1, color.g + variation * 0.5));
        }
        this.terrainMesh.setColorAt(index, color);
      }
    }

    this.terrainMesh.instanceMatrix.needsUpdate = true;
    if (this.terrainMesh.instanceColor) {
      this.terrainMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.terrainMesh);

    // Center group so map midpoint is at origin
    this.group.position.set(
      -((this.cols - 1) * CELL_SIZE) / 2,
      0,
      -((this.rows - 1) * CELL_SIZE) / 2,
    );
  }

  setCellType(row: number, col: number, type: CellType): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.grid[row][col] = type;

    const index = row * this.cols + col;
    this.tempColor.setHex(CELL_COLORS[type]);
    this.terrainMesh.setColorAt(index, this.tempColor);
    if (this.terrainMesh.instanceColor) this.terrainMesh.instanceColor.needsUpdate = true;
  }

  getCellType(row: number, col: number): CellType {
    return this.grid[row][col];
  }

  getGrid(): CellType[][] {
    return this.grid;
  }

  getRows(): number {
    return this.rows;
  }

  getCols(): number {
    return this.cols;
  }

  /** Convert instanceId to (row, col) */
  instanceToGridPos(instanceId: number): { row: number; col: number } {
    const row = Math.floor(instanceId / this.cols);
    const col = instanceId % this.cols;
    return { row, col };
  }

  resize(rows: number, cols: number): void {
    // Dispose old mesh
    this.group.remove(this.terrainMesh);
    this.sharedGeometry.dispose();
    this.sharedMaterial.dispose();

    this.rows = rows;
    this.cols = cols;
    this.initGrid();
    this.buildMesh();
  }

  clear(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.setCellType(r, c, CellType.Buildable);
      }
    }
  }

  loadGrid(grid: CellType[][]): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (grid[r]?.[c]) {
          this.setCellType(r, c, grid[r][c]);
        }
      }
    }
  }

  getTerrainMesh(): InstancedMesh {
    return this.terrainMesh;
  }

  getObject3D(): Group {
    return this.group;
  }

  getCellSize(): number {
    return CELL_SIZE;
  }

  getCellHeight(): number {
    return CELL_HEIGHT;
  }

  dispose(): void {
    this.sharedGeometry.dispose();
    this.sharedMaterial.dispose();
    this.group.clear();
  }
}
