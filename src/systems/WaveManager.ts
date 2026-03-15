import { WaveConfig } from "@/types";
import { EnemyManager } from "./EnemyManager";
import { EventBus } from "@/core/EventBus";

type WaveState = "idle" | "spawning" | "active" | "done";

export class WaveManager {
  private waves: WaveConfig[];
  private enemyManager: EnemyManager;
  private eventBus: EventBus;

  private currentWave = 0;
  private entryIndex = 0;
  private spawnedInEntry = 0;
  private spawnTimer = 0;
  private state: WaveState = "idle";

  constructor(
    waves: WaveConfig[],
    enemyManager: EnemyManager,
    eventBus: EventBus,
  ) {
    this.waves = waves;
    this.enemyManager = enemyManager;
    this.eventBus = eventBus;
  }

  get waveNumber(): number {
    return this.currentWave + 1;
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  get isIdle(): boolean {
    return this.state === "idle";
  }

  get isDone(): boolean {
    return this.state === "done";
  }

  startWave(): boolean {
    if (this.state !== "idle") return false;
    if (this.currentWave >= this.waves.length) return false;

    this.entryIndex = 0;
    this.spawnedInEntry = 0;
    this.spawnTimer = 0;
    this.state = "spawning";
    this.eventBus.emit("wave-start", { wave: this.currentWave + 1 });
    return true;
  }

  update(delta: number): void {
    if (this.state === "spawning") {
      this.updateSpawning(delta);
    } else if (this.state === "active") {
      // Wait for all enemies to be killed or reach goal
      if (this.enemyManager.getEnemies().length === 0) {
        this.eventBus.emit("wave-complete", { wave: this.currentWave + 1 });
        this.currentWave++;
        if (this.currentWave >= this.waves.length) {
          this.state = "done";
        } else {
          this.state = "idle";
        }
      }
    }
  }

  private updateSpawning(delta: number): void {
    const wave = this.waves[this.currentWave];
    const entry = wave.entries[this.entryIndex];

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.enemyManager.spawn(entry.enemyConfig);
      this.spawnedInEntry++;
      this.spawnTimer = entry.spawnInterval;

      if (this.spawnedInEntry >= entry.count) {
        this.entryIndex++;
        this.spawnedInEntry = 0;

        if (this.entryIndex >= wave.entries.length) {
          this.state = "active";
        }
      }
    }
  }

  /** Add a wave dynamically (for endless mode). */
  addWave(wave: WaveConfig): void {
    this.waves.push(wave);
  }

  dispose(): void {
    // No own resources
  }
}
