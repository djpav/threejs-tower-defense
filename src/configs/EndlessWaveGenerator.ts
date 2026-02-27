import { WaveConfig } from "@/types";
import {
  BASIC_ENEMY,
  FAST_RUNNER,
  TANK_ENEMY,
  SHIELDED_ENEMY,
  BOSS_ENEMY,
  FLYING_ENEMY,
  HEALER_ENEMY,
  SPLITTER_ENEMY,
  STEALTH_ENEMY,
} from "./GameBalanceConfigs";

const MAX_ENEMY_COUNT = 50;

/** Generate a wave for endless mode based on wave number (1-indexed). */
export function generateEndlessWave(waveNumber: number): WaveConfig {
  const scale = 1 + (waveNumber - 1) * 0.15;
  const entries: WaveConfig["entries"] = [];

  // Base count grows with wave, capped for performance
  const baseCount = Math.min(MAX_ENEMY_COUNT, 4 + Math.floor(waveNumber * 1.2));

  // Always have basic enemies
  entries.push({
    count: baseCount,
    spawnInterval: Math.max(0.25, 0.8 - waveNumber * 0.02),
    enemyConfig: {
      ...BASIC_ENEMY,
      hp: Math.round(BASIC_ENEMY.hp * scale),
      speed: BASIC_ENEMY.speed * (1 + waveNumber * 0.01),
    },
  });

  // Fast runners from wave 2+
  if (waveNumber >= 2) {
    entries.push({
      count: Math.floor(baseCount * 0.5),
      spawnInterval: 0.5,
      enemyConfig: {
        ...FAST_RUNNER,
        hp: Math.round(FAST_RUNNER.hp * scale),
        speed: FAST_RUNNER.speed * (1 + waveNumber * 0.01),
      },
    });
  }

  // Tanks from wave 4+
  if (waveNumber >= 4 && waveNumber % 2 === 0) {
    entries.push({
      count: Math.floor(waveNumber / 3),
      spawnInterval: 1.2,
      enemyConfig: {
        ...TANK_ENEMY,
        hp: Math.round(TANK_ENEMY.hp * scale),
      },
    });
  }

  // Shielded from wave 5+
  if (waveNumber >= 5 && waveNumber % 3 === 0) {
    entries.push({
      count: Math.floor(waveNumber / 4),
      spawnInterval: 1.0,
      enemyConfig: {
        ...SHIELDED_ENEMY,
        hp: Math.round(SHIELDED_ENEMY.hp * scale),
      },
    });
  }

  // Flying from wave 6+
  if (waveNumber >= 6 && waveNumber % 2 === 1) {
    entries.push({
      count: Math.max(2, Math.floor(waveNumber / 4)),
      spawnInterval: 0.8,
      enemyConfig: {
        ...FLYING_ENEMY,
        hp: Math.round(FLYING_ENEMY.hp * scale),
      },
    });
  }

  // Healers from wave 8+
  if (waveNumber >= 8 && waveNumber % 4 === 0) {
    entries.push({
      count: Math.max(1, Math.floor(waveNumber / 6)),
      spawnInterval: 1.5,
      enemyConfig: {
        ...HEALER_ENEMY,
        hp: Math.round(HEALER_ENEMY.hp * scale),
      },
    });
  }

  // Splitters from wave 10+
  if (waveNumber >= 10 && waveNumber % 5 === 0) {
    entries.push({
      count: Math.max(1, Math.floor(waveNumber / 8)),
      spawnInterval: 1.5,
      enemyConfig: {
        ...SPLITTER_ENEMY,
        hp: Math.round(SPLITTER_ENEMY.hp * scale),
      },
    });
  }

  // Stealth from wave 7+
  if (waveNumber >= 7 && waveNumber % 3 === 1) {
    entries.push({
      count: Math.max(2, Math.floor(waveNumber / 5)),
      spawnInterval: 0.8,
      enemyConfig: {
        ...STEALTH_ENEMY,
        hp: Math.round(STEALTH_ENEMY.hp * scale),
      },
    });
  }

  // Boss every 10 waves
  if (waveNumber >= 10 && waveNumber % 10 === 0) {
    entries.push({
      count: 1 + Math.floor(waveNumber / 20),
      spawnInterval: 2.0,
      enemyConfig: {
        ...BOSS_ENEMY,
        hp: Math.round(BOSS_ENEMY.hp * scale * 1.5),
      },
    });
  }

  return { entries };
}
