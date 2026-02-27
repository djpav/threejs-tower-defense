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
  damage!: number;
  speed!: number;
  towerConfig!: TowerConfig;
  target!: Enemy;
  alive = true;
  impactPosition: Vector3 | null = null;

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
    this.material.color.set(config.projectileColor);
    this.material.emissive.set(config.projectileColor);
    this.mesh.position.set(x, y, z);
  }

  update(delta: number): void {
    if (!this.alive) return;

    // If target is dead or gone, self-destruct
    if (!this.target.alive || this.target.reachedGoal) {
      this.alive = false;
      return;
    }

    const targetPos = this.target.getObject3D().position;
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y + this.target.config.radius - this.mesh.position.y;
    const dz = targetPos.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const step = this.speed * delta;

    if (dist <= step + 0.15) {
      // Hit — store impact position, manager handles damage
      this._impactPos.set(targetPos.x, targetPos.y, targetPos.z);
      this.impactPosition = this._impactPos;
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
