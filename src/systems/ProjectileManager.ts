import { Group } from "three";
import { Projectile } from "@/entities/Projectile";
import { Enemy } from "@/entities/Enemy";
import { EnemyManager } from "./EnemyManager";
import { TowerConfig } from "@/types";
import { EffectManager } from "./EffectManager";
import { ImpactHandler } from "./ImpactHandler";
import { ObjectPool } from "@/utils/ObjectPool";

export class ProjectileManager {
  private projectiles: Projectile[] = [];
  private group: Group;
  private impactHandler: ImpactHandler;
  private effectManager: EffectManager | null = null;
  private pool = new ObjectPool<Projectile>(() => new Projectile());

  constructor(group: Group, enemyManager: EnemyManager) {
    this.group = group;
    this.impactHandler = new ImpactHandler(enemyManager);
  }

  setEffectManager(em: EffectManager): void {
    this.effectManager = em;
    this.impactHandler.setEffectManager(em);
  }

  spawn(
    x: number,
    y: number,
    z: number,
    target: Enemy,
    config: TowerConfig,
  ): Projectile {
    const projectile = this.pool.acquire();
    projectile.reset(x, y, z, target, config);
    this.projectiles.push(projectile);
    this.group.add(projectile.getObject3D());
    return projectile;
  }

  update(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta);
      if (!p.alive) {
        if (p.impactPosition) {
          this.impactHandler.handleImpact(p);
          if (this.effectManager) {
            this.effectManager.spawnImpactFlash(
              p.impactPosition.x,
              p.impactPosition.y,
              p.impactPosition.z,
              p.towerConfig.projectileColor,
            );
          }
        }
        this.group.remove(p.getObject3D());
        this.pool.release(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const p of this.projectiles) {
      this.group.remove(p.getObject3D());
    }
    this.projectiles = [];
    this.pool.disposeAll((p) => p.dispose());
  }
}
