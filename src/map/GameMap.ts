import {
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  CatmullRomCurve3,
  Vector3,
  DoubleSide,
} from "three";
import { GridCell, CELL_COLORS } from "@/entities/GridCell";
import { CellType, MapConfig, WorldPosition, GridPosition } from "@/types";
import { extractAllWaypoints, gridToWorld, chaikinSmooth, applyPathNoise } from "./PathFinder";

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
  private roadMeshes: Mesh[] = [];

  constructor(config: MapConfig) {
    this.config = config;
    this.group = new Group();

    // Compute smoothed waypoints first so buildGrid can reuse them for road meshes
    const allGridWaypoints = extractAllWaypoints(config);
    this.allWaypoints = allGridWaypoints.map((path) => {
      const worldPoints = path.map((gp) => gridToWorld(gp, config));
      const smoothed = chaikinSmooth(worldPoints, 2);
      return applyPathNoise(smoothed, 0.08, config.grid.length);
    });
    this.waypoints = this.allWaypoints[0] ?? [];

    this.buildGrid();
  }

  private buildGrid(): void {
    const { rows, cols, cellSize, cellHeight, grid } = this.config;
    const gap = 0;
    const terrainThickness = 0.08; // thin slab for flat terrain surface

    // Single shared geometry and material for all terrain cells
    this.sharedGeometry = new BoxGeometry(cellSize - gap, terrainThickness, cellSize - gap);
    this.sharedMaterial = new MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.0,
    });

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
        matrix.setPosition(col * cellSize, terrainThickness / 2, row * cellSize);
        this.terrainMesh.setMatrixAt(index, matrix);

        // Set instance color with subtle variation for natural look
        color.setHex(CELL_COLORS[cellType]);
        if (cellType === CellType.Buildable) {
          // Vary green slightly for grass-like texture
          const variation = ((row * 7 + col * 13 + row * col) % 20 - 10) / 200;
          color.r = Math.max(0, Math.min(1, color.r + variation));
          color.g = Math.max(0, Math.min(1, color.g + variation * 0.5));
        }
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

    // Create smooth road meshes using pre-computed smoothed waypoints
    const roadWidth = this.config.cellSize * 0.7;
    const primaryRoadColor = 0xc4a06e; // warm tan
    const secondaryRoadColor = 0xb8956a; // slightly darker for secondary
    for (let i = 0; i < this.allWaypoints.length; i++) {
      const wp = this.allWaypoints[i];
      if (wp.length < 2) continue;
      const roadColor = i === 0 ? primaryRoadColor : secondaryRoadColor;
      const road = this.createRoadMesh(wp, roadColor, roadWidth);
      this.roadMeshes.push(road);
      this.group.add(road);
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

  private createRoadMesh(waypoints: WorldPosition[], color: number, width: number): Mesh {
    // Convert world-space waypoints to group-local space
    const offsetX = ((this.config.cols - 1) * this.config.cellSize) / 2;
    const offsetZ = ((this.config.rows - 1) * this.config.cellSize) / 2;

    // Build CatmullRom curve for extra smoothness
    const curvePoints = waypoints.map(
      (wp) => new Vector3(wp.x + offsetX, 0, wp.z + offsetZ),
    );
    const curve = new CatmullRomCurve3(curvePoints);
    const numSamples = Math.max(waypoints.length * 8, 80);
    const samples = curve.getSpacedPoints(numSamples);

    // Pre-compute per-sample curvature for width variation
    const curvatures: number[] = new Array(samples.length).fill(0);
    for (let i = 1; i < samples.length - 1; i++) {
      const prevSample = samples[i - 1];
      const currSample = samples[i];
      const nextSample = samples[i + 1];
      // Direction change = angle between consecutive segments
      const dx1 = currSample.x - prevSample.x;
      const dz1 = currSample.z - prevSample.z;
      const dx2 = nextSample.x - currSample.x;
      const dz2 = nextSample.z - currSample.z;
      const dot = dx1 * dx2 + dz1 * dz2;
      const len1 = Math.sqrt(dx1 * dx1 + dz1 * dz1) || 1;
      const len2 = Math.sqrt(dx2 * dx2 + dz2 * dz2) || 1;
      curvatures[i] = 1 - Math.max(-1, Math.min(1, dot / (len1 * len2)));
    }

    // Build flat strip geometry
    const positions: number[] = [];
    const indices: number[] = [];
    const baseHalfW = width / 2;
    const minWidth = 0.6; // minimum width multiplier at sharp turns
    const maxWidth = 1.15; // maximum width multiplier on straights
    const roadY = 0.10; // just above the flattened terrain

    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const next = samples[Math.min(i + 1, samples.length - 1)];
      const prev = samples[Math.max(i - 1, 0)];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;

      // Width varies with curvature: narrow at turns, wide on straights
      const curveFactor = curvatures[i];
      const widthMult = maxWidth - (maxWidth - minWidth) * Math.min(curveFactor * 3, 1);
      const halfW = baseHalfW * widthMult;

      // Perpendicular in XZ plane
      const px = (-dz / len) * halfW;
      const pz = (dx / len) * halfW;

      // Left and right vertices
      positions.push(p.x + px, roadY, p.z + pz);
      positions.push(p.x - px, roadY, p.z - pz);
    }

    for (let i = 0; i < samples.length - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new MeshStandardMaterial({
      color,
      side: DoubleSide,
      roughness: 0.9,
      metalness: 0.0,
    });

    return new Mesh(geometry, material);
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
    for (const road of this.roadMeshes) {
      road.geometry.dispose();
      (road.material as MeshStandardMaterial).dispose();
    }
    this.roadMeshes = [];
    this.cells = [];
    this.cellGrid = [];
    this.indexToCell = [];
  }
}
