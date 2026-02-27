import { EnemyConfig } from "./enemies";

export interface WaveEntry {
  count: number;
  spawnInterval: number;
  enemyConfig: EnemyConfig;
}

export interface WaveConfig {
  entries: WaveEntry[];
}

export interface LevelConfig {
  level: number;
  name: string;
  rows: number;
  cols: number;
  minPathLength: number;
  startingGold: number;
  startingLives: number;
  waves: WaveConfig[];
  seed: number;
}
