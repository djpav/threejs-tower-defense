import { Tower } from "@/entities/Tower";
import { Enemy } from "@/entities/Enemy";
import { TargetingPriority } from "@/types";
import { TowerManager } from "./TowerManager";
import { EnemyManager } from "./EnemyManager";
import { ProjectileManager } from "./ProjectileManager";
import { EffectManager } from "./EffectManager";

export class CombatSystem {
  private towerManager: TowerManager;
  private enemyManager: EnemyManager;
  private projectileManager: ProjectileManager;
  private effectManager: EffectManager | null = null;

  constructor(
    towerManager: TowerManager,
    enemyManager: EnemyManager,
    projectileManager: ProjectileManager,
  ) {
    this.towerManager = towerManager;
    this.enemyManager = enemyManager;
    this.projectileManager = projectileManager;
  }

  setEffectManager(em: EffectManager): void {
    this.effectManager = em;
  }

  update(_delta: number): void {
    const enemies = this.enemyManager.getEnemies();
    const towers = this.towerManager.getTowers();

    // Stealth detection pass: any tower within reveal range reveals stealth enemies
    this.updateStealthDetection(towers, enemies);

    for (const tower of towers) {
      const target = this.findBestTarget(tower, enemies);

      // Always update tower's target for rotation
      if (target) {
        tower.setTarget(target.getObject3D().position);
      }

      // Only fire when ready and has target
      if (tower.canFire() && target) {
        if (tower.config.isPulse) {
          this.handlePulse(tower, enemies);
        } else {
          this.fire(tower, target);
        }
      }
    }
  }

  private updateStealthDetection(towers: readonly Tower[], enemies: readonly Enemy[]): void {
    for (const enemy of enemies) {
      if (!enemy.config.isStealth || !enemy.alive) continue;

      let nearTower = false;
      const revealRange = enemy.config.stealthRevealRange ?? 2.0;
      const revealRangeSq = revealRange * revealRange;
      const enemyPos = enemy.getObject3D().position;

      for (const tower of towers) {
        const towerPos = tower.getObject3D().position;
        const dx = enemyPos.x - towerPos.x;
        const dz = enemyPos.z - towerPos.z;
        if (dx * dx + dz * dz <= revealRangeSq) {
          nearTower = true;
          break;
        }
      }

      if (nearTower) {
        enemy.reveal();
      } else {
        enemy.conceal();
      }
    }
  }

  /** Find the best target in range based on the tower's targeting priority. */
  private findBestTarget(tower: Tower, enemies: readonly Enemy[]): Enemy | null {
    const towerPos = tower.getObject3D().position;
    const rangeSq = tower.config.range * tower.config.range;
    const canTargetFlying = tower.config.canTargetFlying !== false;
    const mode = tower.targetingMode;
    let best: Enemy | null = null;
    let bestValue = mode === TargetingPriority.Weakest ? Infinity : -Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedGoal) continue;
      if (enemy.config.isFlying && !canTargetFlying) continue;
      if (enemy.config.isStealth && !enemy.isRevealed) continue;

      const enemyPos = enemy.getObject3D().position;
      const dx = enemyPos.x - towerPos.x;
      const dz = enemyPos.z - towerPos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > rangeSq) continue;

      let value: number;
      switch (mode) {
        case TargetingPriority.Nearest:
          value = -distSq; // higher = closer
          break;
        case TargetingPriority.Strongest:
          value = enemy.hp;
          break;
        case TargetingPriority.Weakest:
          value = enemy.hp;
          if (value < bestValue) { bestValue = value; best = enemy; }
          continue;
        case TargetingPriority.First:
        default:
          value = enemy.pathProgress;
          break;
      }

      if (value > bestValue) {
        bestValue = value;
        best = enemy;
      }
    }

    return best;
  }

  /** Tesla pulse: damage all enemies in range, no projectile. */
  private handlePulse(tower: Tower, enemies: readonly Enemy[]): void {
    const towerPos = tower.getObject3D().position;
    const rangeSq = tower.config.range * tower.config.range;
    const canTargetFlying = tower.config.canTargetFlying !== false;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedGoal) continue;
      if (enemy.config.isFlying && !canTargetFlying) continue;
      if (enemy.config.isStealth && !enemy.isRevealed) continue;

      const enemyPos = enemy.getObject3D().position;
      const dx = enemyPos.x - towerPos.x;
      const dz = enemyPos.z - towerPos.z;

      if (dx * dx + dz * dz <= rangeSq) {
        enemy.takeDamage(tower.config.damage);
        this.effectManager?.notifyDamage(enemyPos.x, enemyPos.y, enemyPos.z, tower.config.damage, "#0ef");
      }
    }

    // Spawn pulse visual effect
    if (this.effectManager) {
      this.effectManager.spawnPulseEffect(
        towerPos.x, towerPos.y + 0.3, towerPos.z,
        tower.config.range, tower.config.projectileColor,
      );
    }

    tower.resetCooldown();
  }

  private fire(tower: Tower, target: Enemy): void {
    const towerPos = tower.getObject3D().position;
    this.projectileManager.spawn(
      towerPos.x,
      towerPos.y + 0.7, // fire from turret top
      towerPos.z,
      target,
      tower.config,
    );
    tower.resetCooldown();
  }

  dispose(): void {
    // No own resources to clean up
  }
}
