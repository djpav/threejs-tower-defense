import { Group } from "three";
import { Effect } from "./effects/Effect";
import { DeathBurstEffect } from "./effects/DeathBurstEffect";
import { ImpactFlashEffect } from "./effects/ImpactFlashEffect";
import { TeslaPulseEffect } from "./effects/TeslaPulseEffect";
import { ChainLightningEffect } from "./effects/ChainLightningEffect";
import { ObjectPool } from "@/utils/ObjectPool";

export class EffectManager {
  private effects: Effect[] = [];
  private group: Group;
  private onDamage: ((x: number, y: number, z: number, damage: number, color?: string) => void) | null = null;

  private deathBurstPool = new ObjectPool<DeathBurstEffect>(() => new DeathBurstEffect());
  private impactFlashPool = new ObjectPool<ImpactFlashEffect>(() => new ImpactFlashEffect());
  private teslaPulsePool = new ObjectPool<TeslaPulseEffect>(() => new TeslaPulseEffect());
  private chainLightningPool = new ObjectPool<ChainLightningEffect>(() => new ChainLightningEffect());
  private releaseMap = new Map<Effect, ObjectPool<any>>();

  constructor(group: Group) {
    this.group = group;
  }

  setDamageCallback(cb: (x: number, y: number, z: number, damage: number, color?: string) => void): void {
    this.onDamage = cb;
  }

  notifyDamage(x: number, y: number, z: number, damage: number, color?: string): void {
    this.onDamage?.(x, y, z, damage, color);
  }

  spawnDeathBurst(x: number, y: number, z: number, color: number): void {
    const effect = this.deathBurstPool.acquire();
    effect.reset(x, y, z, color);
    this.addEffect(effect, this.deathBurstPool);
  }

  spawnImpactFlash(x: number, y: number, z: number, color: number): void {
    const effect = this.impactFlashPool.acquire();
    effect.reset(x, y, z, color);
    this.addEffect(effect, this.impactFlashPool);
  }

  spawnPulseEffect(x: number, y: number, z: number, range: number, color: number): void {
    const effect = this.teslaPulsePool.acquire();
    effect.reset(x, y, z, range, color);
    this.addEffect(effect, this.teslaPulsePool);
  }

  spawnChainLightningEffect(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    color: number,
  ): void {
    const effect = this.chainLightningPool.acquire();
    effect.reset(x1, y1, z1, x2, y2, z2, color);
    this.addEffect(effect, this.chainLightningPool);
  }

  private addEffect(effect: Effect, pool: ObjectPool<any>): void {
    this.effects.push(effect);
    this.group.add(effect.object);
    this.releaseMap.set(effect, pool);
  }

  update(delta: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      const alive = effect.update(delta);
      if (!alive) {
        this.group.remove(effect.object);
        const pool = this.releaseMap.get(effect);
        if (pool) {
          this.releaseMap.delete(effect);
          pool.release(effect);
        } else {
          effect.dispose();
        }
        this.effects.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const effect of this.effects) {
      this.group.remove(effect.object);
    }
    this.effects = [];
    this.releaseMap.clear();
    this.deathBurstPool.disposeAll((e) => e.dispose());
    this.impactFlashPool.disposeAll((e) => e.dispose());
    this.teslaPulsePool.disposeAll((e) => e.dispose());
    this.chainLightningPool.disposeAll((e) => e.dispose());
  }
}
