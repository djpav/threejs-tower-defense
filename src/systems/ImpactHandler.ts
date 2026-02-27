import { Projectile } from "@/entities/Projectile";
import { Enemy } from "@/entities/Enemy";
import { EnemyManager } from "./EnemyManager";
import { TowerConfig } from "@/types";
import { EffectManager } from "./EffectManager";

export class ImpactHandler {
  private enemyManager: EnemyManager;
  private effectManager: EffectManager | null = null;

  constructor(enemyManager: EnemyManager) {
    this.enemyManager = enemyManager;
  }

  setEffectManager(em: EffectManager): void {
    this.effectManager = em;
  }

  handleImpact(projectile: Projectile): void {
    const config = projectile.towerConfig;
    const target = projectile.target;

    this.applyDirectDamage(target, projectile.damage);
    this.applySlowEffect(target, config);
    this.applyPoisonEffect(target, config);

    if (config.chainCount != null && config.chainCount > 0 && config.chainRange != null) {
      this.handleChainLightning(target, config);
    }

    if (config.splashRadius != null && config.splashRadius > 0) {
      this.applySplashDamage(projectile, target);
    }
  }

  private applyDirectDamage(target: Enemy, damage: number): void {
    if (!target.alive) return;
    target.takeDamage(damage);
    const pos = target.getObject3D().position;
    this.effectManager?.notifyDamage(pos.x, pos.y, pos.z, damage);
  }

  private applySlowEffect(target: Enemy, config: TowerConfig): void {
    if (config.slowFactor == null || config.slowDuration == null || !target.alive) return;
    target.applySlow(config.slowFactor, config.slowDuration);
  }

  private applyPoisonEffect(target: Enemy, config: TowerConfig): void {
    if (config.poisonDamage == null || config.poisonDuration == null ||
        config.poisonTickRate == null || config.poisonMaxStacks == null || !target.alive) return;
    target.applyPoison(config.poisonDamage, config.poisonDuration, config.poisonTickRate, config.poisonMaxStacks);
  }

  private applySplashDamage(projectile: Projectile, target: Enemy): void {
    const config = projectile.towerConfig;
    const impact = projectile.impactPosition!;
    const splashDamage = projectile.damage * 0.5;
    const radiusSq = config.splashRadius! * config.splashRadius!;

    for (const enemy of this.enemyManager.getEnemies()) {
      if (!enemy.alive || enemy === target) continue;

      const pos = enemy.getObject3D().position;
      const dx = pos.x - impact.x;
      const dz = pos.z - impact.z;

      if (dx * dx + dz * dz <= radiusSq) {
        enemy.takeDamage(splashDamage);
        this.effectManager?.notifyDamage(pos.x, pos.y, pos.z, splashDamage, "#ff9");
        this.applySlowEffect(enemy, config);
      }
    }
  }

  private handleChainLightning(firstTarget: Enemy, config: TowerConfig): void {
    const chainCount = config.chainCount!;
    const chainRange = config.chainRange!;
    const falloff = config.chainDamageFalloff ?? 0.7;
    const chainRangeSq = chainRange * chainRange;

    const chained = new Set<Enemy>([firstTarget]);
    let current = firstTarget;
    let currentDamage = config.damage;

    for (let i = 0; i < chainCount; i++) {
      currentDamage *= falloff;
      const currentPos = current.getObject3D().position;

      // Find nearest unchained alive enemy within chain range
      let nearest: Enemy | null = null;
      let nearestDistSq = Infinity;

      for (const enemy of this.enemyManager.getEnemies()) {
        if (!enemy.alive || chained.has(enemy)) continue;
        // Don't chain to stealthed enemies
        if (enemy.config.isStealth && !enemy.isRevealed) continue;

        const pos = enemy.getObject3D().position;
        const dx = pos.x - currentPos.x;
        const dz = pos.z - currentPos.z;
        const distSq = dx * dx + dz * dz;

        if (distSq <= chainRangeSq && distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearest = enemy;
        }
      }

      if (!nearest) break;

      const chainDmg = Math.round(currentDamage);
      nearest.takeDamage(chainDmg);
      const nearPos = nearest.getObject3D().position;
      this.effectManager?.notifyDamage(nearPos.x, nearPos.y, nearPos.z, chainDmg, "#c9f");
      chained.add(nearest);

      // Spawn chain lightning visual between current and nearest
      if (this.effectManager) {
        const fromPos = current.getObject3D().position;
        const toPos = nearest.getObject3D().position;
        this.effectManager.spawnChainLightningEffect(
          fromPos.x, fromPos.y + 0.3, fromPos.z,
          toPos.x, toPos.y + 0.3, toPos.z,
          config.projectileColor,
        );
      }

      current = nearest;
    }
  }
}
