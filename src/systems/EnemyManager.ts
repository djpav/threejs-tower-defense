import { Group } from "three";
import { Enemy } from "@/entities/Enemy";
import { EnemyConfig, WorldPosition } from "@/types";
import { EventBus } from "@/core/EventBus";
import { EffectManager } from "./EffectManager";

export class EnemyManager {
  private enemies: Enemy[] = [];
  private group: Group;
  private eventBus: EventBus;
  private waypoints: WorldPosition[];
  /** All available waypoint paths for multi-path maps. */
  private allWaypoints: WorldPosition[][];
  private effectManager: EffectManager | null = null;
  private pathCounter = 0;


  constructor(group: Group, eventBus: EventBus, waypoints: WorldPosition[], allWaypoints?: WorldPosition[][]) {
    this.group = group;
    this.eventBus = eventBus;
    this.waypoints = waypoints;
    this.allWaypoints = allWaypoints && allWaypoints.length > 0 ? allWaypoints : [waypoints];
  }

  /** Pick the next waypoint path using round-robin for balanced, deterministic distribution. */
  private pickWaypoints(): WorldPosition[] {
    if (this.allWaypoints.length <= 1) return this.waypoints;
    const index = this.pathCounter % this.allWaypoints.length;
    this.pathCounter++;
    return this.allWaypoints[index];
  }

  setEffectManager(em: EffectManager): void {
    this.effectManager = em;
  }

  spawn(config: EnemyConfig): Enemy {
    const enemy = new Enemy(config, this.pickWaypoints());
    this.enemies.push(enemy);
    this.group.add(enemy.getObject3D());
    return enemy;
  }

  getEnemies(): readonly Enemy[] {
    return this.enemies;
  }

  update(delta: number): void {
    // Healer aura pass
    this.updateHealers(delta);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta);

      if (!enemy.alive) {
        if (this.effectManager) {
          const pos = enemy.getObject3D().position;
          this.effectManager.spawnDeathBurst(pos.x, pos.y, pos.z, enemy.getColor());
        }

        // Splitter: spawn children on death
        if (enemy.config.splitOnDeath && enemy.config.splitCount && enemy.config.splitConfig) {
          this.spawnSplitChildren(enemy);
        }

        this.eventBus.emit("enemy-killed", { reward: enemy.config.reward });
        this.removeEnemy(i);
      } else if (enemy.reachedGoal) {
        this.eventBus.emit("enemy-reached-goal", { damage: 1 });
        this.removeEnemy(i);
      }
    }
  }

  private spawnSplitChildren(parent: Enemy): void {
    const config = parent.config.splitConfig!;
    // Guard against infinite recursive splitting
    if (config.splitOnDeath) return;
    const count = parent.config.splitCount!;
    const parentPos = parent.getObject3D().position;
    const wpIndex = parent.waypointIndex;
    // Children inherit the parent's path so they continue on the same route
    const parentWaypoints = parent.getWaypoints();

    for (let i = 0; i < count; i++) {
      const child = new Enemy(config, parentWaypoints);
      // Position at parent's location and progress
      child.setPositionAndProgress(parentPos.x, parentPos.z, wpIndex);
      // Spread children slightly so they don't stack
      const angle = (Math.PI * 2 * i) / count;
      child.nudgePosition(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3);

      this.enemies.push(child);
        this.group.add(child.getObject3D());
    }
  }

  private updateHealers(delta: number): void {
    for (const healer of this.enemies) {
      if (!healer.alive || !healer.config.healRadius) continue;
      if (!healer.canHealTick(delta)) continue;

      const healAmount = healer.config.healAmount ?? 10;
      const healRadiusSq = healer.config.healRadius * healer.config.healRadius;
      const healerPos = healer.getObject3D().position;

      for (const ally of this.enemies) {
        if (ally === healer || !ally.alive) continue;
        if (ally.hp >= ally.config.hp) continue; // skip full-health allies
        const allyPos = ally.getObject3D().position;
        const dx = allyPos.x - healerPos.x;
        const dz = allyPos.z - healerPos.z;
        if (dx * dx + dz * dz <= healRadiusSq) {
          ally.heal(healAmount);
          if (this.effectManager) {
            this.effectManager.spawnImpactFlash(allyPos.x, allyPos.y, allyPos.z, 0x2ecc71);
          }
        }
      }
    }
  }

  private removeEnemy(index: number): void {
    const enemy = this.enemies[index];
    this.group.remove(enemy.getObject3D());
    enemy.dispose();
    this.enemies[index] = this.enemies[this.enemies.length - 1];
    this.enemies.pop();
  }

  dispose(): void {
    for (const enemy of this.enemies) {
      this.group.remove(enemy.getObject3D());
      enemy.dispose();
    }
    this.enemies = [];
  }
}
