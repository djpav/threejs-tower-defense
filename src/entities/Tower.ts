import {
  Mesh,
  MeshStandardMaterial,
  Group,
  Color,
  Vector3,
  MathUtils,
} from "three";
import { GameObject } from "./GameObject";
import { TowerConfig, TowerInfo, GridPosition, TargetingPriority } from "@/types";
import { createTowerMeshes } from "./TowerMeshFactory";

export class Tower extends GameObject {
  config: TowerConfig;
  readonly gridPos: GridPosition;
  private group: Group;
  private meshes: Mesh[] = [];
  private _level = 1;
  private _totalInvested: number;
  targetingMode: TargetingPriority = TargetingPriority.First;

  // Target tracking for rotation
  private targetPosition: Vector3 | null = null;
  private currentAngle = 0;

  // Placement animation
  private placementAnim = 0;

  cooldownTimer = 0;

  constructor(config: TowerConfig, gridPos: GridPosition, worldX: number, worldZ: number) {
    super();
    this.config = config;
    this.gridPos = gridPos;
    this._totalInvested = config.cost;

    this.group = new Group();
    this.buildMesh();

    this.group.position.set(worldX, 0, worldZ);
    this.object3D = this.group;
  }

  get level(): number {
    return this._level;
  }

  get totalInvested(): number {
    return this._totalInvested;
  }

  /** Upgrade the tower: swap config and rebuild visuals. */
  upgrade(newConfig: TowerConfig): void {
    this._totalInvested += this.config.upgradeCost ?? 0;
    this.config = newConfig;
    this._level++;
    this.rebuildVisuals();
  }

  setTarget(pos: Vector3): void {
    this.targetPosition = pos;
  }

  startPlacementAnimation(): void {
    this.placementAnim = 1.0; // 1 second of animation
    this.group.scale.set(0, 0, 0);
  }

  private rebuildVisuals(): void {
    // Dispose old meshes
    for (const mesh of this.meshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
    }
    this.meshes = [];

    // Rebuild
    this.buildMesh();

    // Scale up 10% per level above 1
    const scale = 1 + (this._level - 1) * 0.1;
    this.group.scale.set(scale, scale, scale);

    // Add emissive glow at higher levels (preserve existing emissive if stronger)
    if (this._level >= 2) {
      const intensity = this._level === 2 ? 0.3 : 0.6;
      for (const mesh of this.meshes) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat.emissiveIntensity < intensity) {
          mat.emissive = new Color(mat.color);
          mat.emissiveIntensity = intensity;
        }
      }
    }
  }

  /** Build a plain-data TowerInfo snapshot for events / UI. */
  toInfo(maxLevel: number): TowerInfo {
    return {
      type: this.config.type,
      name: this.config.name,
      level: this._level,
      maxLevel,
      damage: this.config.damage,
      range: this.config.range,
      fireRate: this.config.fireRate,
      upgradeCost: this.config.upgradeCost,
      splashRadius: this.config.splashRadius,
      slowFactor: this.config.slowFactor,
      slowDuration: this.config.slowDuration,
      chainCount: this.config.chainCount,
      poisonDamage: this.config.poisonDamage,
      poisonDuration: this.config.poisonDuration,
      isPulse: this.config.isPulse,
      targetingPriority: this.targetingMode,
      totalInvested: this._totalInvested,
      gridPos: { ...this.gridPos },
    };
  }

  private buildMesh(): void {
    const meshes = createTowerMeshes(this.config.type);
    for (const mesh of meshes) {
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update(delta: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }

    // Placement spring animation
    if (this.placementAnim > 0) {
      this.placementAnim -= delta * 3; // ~0.33s to complete
      if (this.placementAnim <= 0) {
        this.placementAnim = 0;
        const baseScale = 1 + (this._level - 1) * 0.1;
        this.group.scale.set(baseScale, baseScale, baseScale);
      } else {
        const t = 1 - this.placementAnim;
        // Spring overshoot: goes to ~1.15 then settles to 1.0
        const spring = 1 - Math.pow(1 - t, 3) * (1 - t) + Math.sin(t * Math.PI) * 0.15;
        const baseScale = 1 + (this._level - 1) * 0.1;
        const s = spring * baseScale;
        this.group.scale.set(s, s, s);
      }
    }

    // Smooth rotation toward target
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.group.position.x;
      const dz = this.targetPosition.z - this.group.position.z;
      const targetAngle = Math.atan2(dx, dz);

      // Smooth lerp for rotation (8 rad/s effective speed)
      let diff = targetAngle - this.currentAngle;
      // Normalize to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      this.currentAngle += diff * MathUtils.clamp(8 * delta, 0, 1);
      this.group.rotation.y = this.currentAngle;
    }
  }

  canFire(): boolean {
    return this.cooldownTimer <= 0;
  }

  resetCooldown(): void {
    this.cooldownTimer = 1 / this.config.fireRate;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
    }
  }
}
