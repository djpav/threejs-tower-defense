import { EnemyConfig, WaveConfig } from "@/types";
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

/** Max enemies per entry — basic types */
const MAX_BASIC_COUNT = 20;
/** Max enemies per entry — special types (tanks, healers, splitters, etc.) */
const MAX_SPECIAL_COUNT = 10;

/**
 * Exponential HP scale for endless mode.
 * ~25% HP increase every 3 waves, matching campaign's per-level rate.
 */
export function calcEndlessHPScale(waveNumber: number): number {
  return Math.pow(1.25, (waveNumber - 1) / 3);
}

/**
 * Reward decay for endless mode.
 * Slower decay than campaign (0.04 vs 0.25) to sustain longer play sessions.
 */
export function calcEndlessRewardScale(waveNumber: number): number {
  return 1 / (1 + (waveNumber - 1) * 0.04);
}

/** Apply HP and reward scaling to an enemy config. */
function scaleEnemy(
  base: EnemyConfig,
  hpScale: number,
  rewardScale: number,
  extraHpMultiplier = 1,
): EnemyConfig {
  return {
    ...base,
    hp: Math.round(base.hp * hpScale * extraHpMultiplier),
    reward: Math.max(1, Math.round(base.reward * rewardScale)),
  };
}

/** Generate a wave for endless mode based on wave number (1-indexed). */
export function generateEndlessWave(waveNumber: number): WaveConfig {
  const hpScale = calcEndlessHPScale(waveNumber);
  const rewardScale = calcEndlessRewardScale(waveNumber);
  const entries: WaveConfig["entries"] = [];

  // Base count grows with wave, capped for performance
  const baseCount = Math.min(MAX_BASIC_COUNT, 4 + Math.floor(waveNumber * 1.2));

  // Always have basic enemies
  entries.push({
    count: baseCount,
    spawnInterval: Math.max(0.25, 0.8 - waveNumber * 0.02),
    enemyConfig: {
      ...scaleEnemy(BASIC_ENEMY, hpScale, rewardScale),
      speed: BASIC_ENEMY.speed * (1 + waveNumber * 0.01),
    },
  });

  // Fast runners from wave 2+
  if (waveNumber >= 2) {
    entries.push({
      count: Math.min(MAX_BASIC_COUNT, Math.floor(baseCount * 0.5)),
      spawnInterval: 0.5,
      enemyConfig: {
        ...scaleEnemy(FAST_RUNNER, hpScale, rewardScale),
        speed: FAST_RUNNER.speed * (1 + waveNumber * 0.01),
      },
    });
  }

  // Tanks from wave 4+
  if (waveNumber >= 4 && waveNumber % 2 === 0) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, Math.floor(waveNumber / 3)),
      spawnInterval: 1.2,
      enemyConfig: scaleEnemy(TANK_ENEMY, hpScale, rewardScale),
    });
  }

  // Shielded from wave 5+
  if (waveNumber >= 5 && waveNumber % 3 === 0) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, Math.floor(waveNumber / 4)),
      spawnInterval: 1.0,
      enemyConfig: scaleEnemy(SHIELDED_ENEMY, hpScale, rewardScale),
    });
  }

  // Flying from wave 6+
  if (waveNumber >= 6 && waveNumber % 2 === 1) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, Math.max(2, Math.floor(waveNumber / 4))),
      spawnInterval: 0.8,
      enemyConfig: scaleEnemy(FLYING_ENEMY, hpScale, rewardScale),
    });
  }

  // Healers from wave 8+
  if (waveNumber >= 8 && waveNumber % 4 === 0) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, Math.max(1, Math.floor(waveNumber / 6))),
      spawnInterval: 1.5,
      enemyConfig: scaleEnemy(HEALER_ENEMY, hpScale, rewardScale),
    });
  }

  // Splitters from wave 10+
  if (waveNumber >= 10 && waveNumber % 5 === 0) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, Math.max(1, Math.floor(waveNumber / 8))),
      spawnInterval: 1.5,
      enemyConfig: scaleEnemy(SPLITTER_ENEMY, hpScale, rewardScale),
    });
  }

  // Stealth from wave 7+
  if (waveNumber >= 7 && waveNumber % 3 === 1) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, Math.max(2, Math.floor(waveNumber / 5))),
      spawnInterval: 0.8,
      enemyConfig: scaleEnemy(STEALTH_ENEMY, hpScale, rewardScale),
    });
  }

  // Boss every 10 waves
  if (waveNumber >= 10 && waveNumber % 10 === 0) {
    entries.push({
      count: Math.min(MAX_SPECIAL_COUNT, 1 + Math.floor(waveNumber / 20)),
      spawnInterval: 2.0,
      enemyConfig: scaleEnemy(BOSS_ENEMY, hpScale, rewardScale, 1.5),
    });
  }

  return { entries };
}
