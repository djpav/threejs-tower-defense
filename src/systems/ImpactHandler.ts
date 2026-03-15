import { Projectile } from "@/entities/Projectile";
import { Enemy } from "@/entities/Enemy";
import { EnemyManager } from "./EnemyManager";
import { TowerConfig } from "@/types";
import { EffectManager } from "./EffectManager";
import { Vector3 } from "three";

export class ImpactHandler {
  private enemyManager: EnemyManager;
  private effectManager: EffectManager | null = null;
  private chainedSet = new Set<Enemy>();

  constructor(enemyManager: EnemyManager) {
    this.enemyManager = enemyManager;
  }

  setEffectManager(em: EffectManager): void {
    this.effectManager = em;
  }

  handleImpact(projectile: Projectile): void {
    const config = projectile.towerConfig;
    const target = projectile.target;
    const impactPos = projectile.impactPosition!;

    // Apply direct damage and effects only if target is still alive
    if (!projectile.targetWasDeadOnImpact) {
      this.applyDirectDamage(target, projectile.damage);
      this.applySlowEffect(target, config);
      this.applyPoisonEffect(target, config);
    }

    // Chain lightning and splash work from impact position, so they fire
    // even when the primary target was already dead
    if (config.chainCount != null && config.chainCount > 0 && config.chainRange != null) {
      this.handleChainLightning(
        projectile.targetWasDeadOnImpact ? null : target,
        impactPos,
        config,
      );
    }

    if (config.splashRadius != null && config.splashRadius > 0) {
      this.applySplashDamage(projectile, projectile.targetWasDeadOnImpact ? null : target);
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

  private applySplashDamage(projectile: Projectile, target: Enemy | null): void {
    const config = projectile.towerConfig;
    const impact = projectile.impactPosition!;
    const splashDamage = projectile.damage * 0.5;
    const radiusSq = config.splashRadius! * config.splashRadius!;

    for (const enemy of this.enemyManager.getEnemies()) {
      // Skip the primary target (already took direct damage) -- but if target
      // is null (dead on impact), don't skip anyone
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

  private handleChainLightning(
    firstTarget: Enemy | null,
    impactPos: Vector3,
    config: TowerConfig,
  ): void {
    const chainCount = config.chainCount!;
    const chainRange = config.chainRange!;
    const falloff = config.chainDamageFalloff ?? 0.7;
    const chainRangeSq = chainRange * chainRange;

    this.chainedSet.clear();
    const chained = this.chainedSet;
    if (firstTarget) chained.add(firstTarget);

    // The chain originates from the first target if alive, otherwise from the impact position
    let currentEnemy: Enemy | null = firstTarget;
    let currentPos = firstTarget ? firstTarget.getObject3D().position : impactPos;
    let currentDamage = config.damage;

    for (let i = 0; i < chainCount; i++) {
      currentDamage *= falloff;

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

      // Spawn chain lightning visual between current origin and nearest
      if (this.effectManager) {
        const fromPos = currentEnemy ? currentEnemy.getObject3D().position : currentPos;
        const toPos = nearest.getObject3D().position;
        this.effectManager.spawnChainLightningEffect(
          fromPos.x, fromPos.y + 0.3, fromPos.z,
          toPos.x, toPos.y + 0.3, toPos.z,
          config.projectileColor,
        );
      }

      currentEnemy = nearest;
      currentPos = nearest.getObject3D().position;
    }
  }
}
