import {
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  BoxGeometry,
  ConeGeometry,
  RingGeometry,
  CanvasTexture,
  Sprite,
  SpriteMaterial,
  Group,
  Color,
  DoubleSide,
  Texture,
} from "three";
import { GameObject } from "./GameObject";
import { CellType, GridPosition } from "@/types";

export const CELL_COLORS: Record<CellType, number> = {
  [CellType.Buildable]: 0x4caf50, // green
  [CellType.Path]: 0xd2b48c, // sand / tan
  [CellType.Spawn]: 0xf44336, // red
  [CellType.Goal]: 0x2196f3, // blue
};

const HIGHLIGHT_COLOR = new Color(0x81c784);

function createSignTexture(text: string, bgColor: string, textColor: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // Background with rounded feel
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 56, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 56, 8);
  ctx.stroke();

  // Text
  ctx.fillStyle = textColor;
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 34);

  return new CanvasTexture(canvas);
}

export class GridCell extends GameObject {
  readonly cellType: CellType;
  readonly gridPos: GridPosition;
  readonly baseColor: Color;
  instanceIndex: number = 0;
  onColorChange: ((index: number, color: Color) => void) | null = null;
  private marker: Group | null = null;
  private markerMeshes: Mesh[] = [];
  private signSprite: Sprite | null = null;
  private textures: Texture[] = [];
  private elapsed = 0;
  private iconBaseY = 0;
  occupied = false;

  constructor(
    cellType: CellType,
    gridPos: GridPosition,
    cellSize: number,
    cellHeight: number,
  ) {
    super();
    this.cellType = cellType;
    this.gridPos = gridPos;
    this.baseColor = new Color(CELL_COLORS[cellType]);

    // Only build markers for spawn/goal cells
    if (cellType === CellType.Spawn || cellType === CellType.Goal) {
      this.marker = this.buildMarker(cellType, cellSize, cellHeight, gridPos);
    }
  }

  private buildMarker(type: CellType, cellSize: number, cellHeight: number, gridPos: GridPosition): Group {
    const marker = new Group();
    const cx = gridPos.col * cellSize;
    const cz = gridPos.row * cellSize;
    const baseY = cellHeight;
    const color = type === CellType.Spawn ? 0xff6b6b : 0x64b5f6;
    const isSpawn = type === CellType.Spawn;

    // ── Signboard post ──
    const postHeight = cellSize * 0.7;
    const post = new Mesh(
      new BoxGeometry(cellSize * 0.06, postHeight, cellSize * 0.06),
      new MeshStandardMaterial({ color: 0x8b6914 }),
    );
    post.position.set(cx + cellSize * 0.3, baseY + postHeight / 2, cz);
    marker.add(post);
    this.markerMeshes.push(post);

    // ── Sign face (sprite — always faces camera) ──
    const signTexture = createSignTexture(
      isSpawn ? "START" : "END",
      isSpawn ? "#c0392b" : "#2471a3",
      "#fff",
    );
    this.textures.push(signTexture);

    const spriteMat = new SpriteMaterial({ map: signTexture, transparent: true });
    const sign = new Sprite(spriteMat);
    const signH = cellSize * 0.35;
    sign.scale.set(cellSize * 0.7, signH, 1);
    sign.position.set(cx + cellSize * 0.3, baseY + postHeight + signH * 0.5, cz);
    marker.add(sign);
    this.signSprite = sign;

    // ── Floating icon ──
    this.iconBaseY = baseY + cellSize * 0.35;

    if (isSpawn) {
      // Spawn: upward arrow (cone pointing up)
      const cone = new Mesh(
        new ConeGeometry(cellSize * 0.15, cellSize * 0.3, 4),
        new MeshBasicMaterial({ color: 0xff4444 }),
      );
      cone.position.set(cx - cellSize * 0.15, this.iconBaseY, cz);
      marker.add(cone);
      this.markerMeshes.push(cone);
    } else {
      // Goal: spinning diamond
      const diamond = new Mesh(
        new BoxGeometry(cellSize * 0.18, cellSize * 0.28, cellSize * 0.18),
        new MeshBasicMaterial({ color: 0x42a5f5 }),
      );
      diamond.rotation.y = Math.PI / 4;
      diamond.position.set(cx - cellSize * 0.15, this.iconBaseY, cz);
      marker.add(diamond);
      this.markerMeshes.push(diamond);
    }

    // ── Pulsing ground ring ──
    const ring = new Mesh(
      new RingGeometry(cellSize * 0.25, cellSize * 0.35, 16),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, baseY + 0.02, cz);
    marker.add(ring);
    this.markerMeshes.push(ring);

    return marker;
  }

  getMarkerObject(): Group | null {
    return this.marker;
  }

  highlight(): void {
    if (this.cellType === CellType.Buildable && !this.occupied) {
      this.onColorChange?.(this.instanceIndex, HIGHLIGHT_COLOR);
    }
  }

  unhighlight(): void {
    this.onColorChange?.(this.instanceIndex, this.baseColor);
  }

  update(delta: number): void {
    if (!this.marker) return;
    this.elapsed += delta;

    // Floating icon is at index 1 (after post)
    const icon = this.markerMeshes[1];
    if (icon) {
      const bob = Math.sin(this.elapsed * 2.5) * 0.08;
      icon.position.y = this.iconBaseY + bob;
      if (this.cellType === CellType.Goal) {
        icon.rotation.y += delta * 1.2;
      }
    }

    // Pulsing ring is at index 2
    const ring = this.markerMeshes[2];
    if (ring) {
      const pulse = 0.8 + Math.sin(this.elapsed * 3) * 0.2;
      ring.scale.set(pulse, pulse, pulse);
      (ring.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(this.elapsed * 3) * 0.3;
    }
  }

  dispose(): void {
    for (const m of this.markerMeshes) {
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    }
    if (this.signSprite) {
      (this.signSprite.material as SpriteMaterial).dispose();
    }
    for (const t of this.textures) {
      t.dispose();
    }
  }
}
