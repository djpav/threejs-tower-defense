import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { GameObject } from "./GameObject";
import { Enemy } from "./Enemy";
import { TowerConfig } from "@/types";

const PROJECTILE_GEO = new SphereGeometry(0.08, 6, 4);

export class Projectile extends GameObject {
  private mesh: Mesh;
  private material: MeshStandardMaterial;
  private _impactPos = new Vector3();
  private _lastTargetPos = new Vector3();
  damage!: number;
  speed!: number;
  towerConfig!: TowerConfig;
  target!: Enemy;
  alive = true;
  impactPosition: Vector3 | null = null;
  /** True when the projectile reached its destination but the target was already dead/gone. */
  targetWasDeadOnImpact = false;

  constructor() {
    super();
    this.material = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
    });
    this.mesh = new Mesh(PROJECTILE_GEO, this.material);
    this.object3D = this.mesh;
  }

  reset(
    x: number,
    y: number,
    z: number,
    target: Enemy,
    config: TowerConfig,
  ): void {
    this.target = target;
    this.damage = config.damage;
    this.speed = config.projectileSpeed;
    this.towerConfig = config;
    this.alive = true;
    this.impactPosition = null;
    this.targetWasDeadOnImpact = false;
    this.material.color.set(config.projectileColor);
    this.material.emissive.set(config.projectileColor);
    this.mesh.position.set(x, y, z);

    // Snapshot initial target position
    const targetPos = target.getObject3D().position;
    this._lastTargetPos.set(targetPos.x, targetPos.y, targetPos.z);
  }

  update(delta: number): void {
    if (!this.alive) return;

    const targetDead = !this.target.alive || this.target.reachedGoal;

    // Determine destination: live target position, or last known position if target is dead
    let destX: number;
    let destY: number;
    let destZ: number;

    if (targetDead) {
      // Target died in flight -- fly to last known position
      destX = this._lastTargetPos.x;
      destY = this._lastTargetPos.y + this.target.config.radius;
      destZ = this._lastTargetPos.z;
    } else {
      // Target alive -- track it and update last known position
      const targetPos = this.target.getObject3D().position;
      this._lastTargetPos.set(targetPos.x, targetPos.y, targetPos.z);
      destX = targetPos.x;
      destY = targetPos.y + this.target.config.radius;
      destZ = targetPos.z;
    }

    const dx = destX - this.mesh.position.x;
    const dy = destY - this.mesh.position.y;
    const dz = destZ - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const step = this.speed * delta;

    if (dist <= step + 0.15) {
      // Arrived at destination -- store impact position at ground level
      this._impactPos.set(this._lastTargetPos.x, this._lastTargetPos.y, this._lastTargetPos.z);
      this.impactPosition = this._impactPos;
      this.targetWasDeadOnImpact = targetDead;
      this.alive = false;
    } else {
      this.mesh.position.x += (dx / dist) * step;
      this.mesh.position.y += (dy / dist) * step;
      this.mesh.position.z += (dz / dist) * step;
    }
  }

  dispose(): void {
    this.material.dispose();
  }
}
