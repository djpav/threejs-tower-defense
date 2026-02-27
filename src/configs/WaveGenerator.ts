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

export function generateWavesForLevel(level: number): WaveConfig[] {
  const waveCount = 3 + level * 2;
  const hpScale = 1 + (level - 1) * 0.4;
  const waves: WaveConfig[] = [];

  for (let w = 1; w <= waveCount; w++) {
    const waveProgress = w / waveCount;
    const entries: WaveConfig["entries"] = [];

    // Basic enemies every wave, scaling up
    const basicCount = 4 + Math.floor(w * 1.5);
    entries.push({
      count: basicCount,
      spawnInterval: Math.max(0.3, 1.0 - waveProgress * 0.4),
      enemyConfig: {
        ...BASIC_ENEMY,
        hp: Math.round(BASIC_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.6)),
        speed: BASIC_ENEMY.speed + waveProgress * 0.4,
      },
    });

    // Fast runners from wave 3+
    if (w >= 3) {
      const fastCount = 3 + Math.floor((w - 2) * 1.2);
      entries.push({
        count: fastCount,
        spawnInterval: Math.max(0.25, 0.6 - waveProgress * 0.2),
        enemyConfig: {
          ...FAST_RUNNER,
          hp: Math.round(FAST_RUNNER.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: FAST_RUNNER.speed + waveProgress * 0.3,
        },
      });
    }

    // Tanks from wave 5+
    if (w >= 5) {
      const tankCount = 2 + Math.floor((w - 4) * 0.8);
      entries.push({
        count: tankCount,
        spawnInterval: Math.max(0.8, 1.5 - waveProgress * 0.3),
        enemyConfig: {
          ...TANK_ENEMY,
          hp: Math.round(TANK_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: TANK_ENEMY.speed + waveProgress * 0.2,
        },
      });
    }

    // Shielded from wave 7+
    if (w >= 7) {
      const shieldCount = 2 + Math.floor((w - 6) * 0.8);
      entries.push({
        count: shieldCount,
        spawnInterval: Math.max(0.5, 1.0 - waveProgress * 0.2),
        enemyConfig: {
          ...SHIELDED_ENEMY,
          hp: Math.round(SHIELDED_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: SHIELDED_ENEMY.speed + waveProgress * 0.2,
        },
      });
    }

    // Flying enemies from wave 4+ on levels 7+
    if (level >= 7 && w >= 4) {
      const flyCount = 2 + Math.floor((w - 3) * 0.8);
      entries.push({
        count: flyCount,
        spawnInterval: Math.max(0.4, 0.8 - waveProgress * 0.2),
        enemyConfig: {
          ...FLYING_ENEMY,
          hp: Math.round(FLYING_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: FLYING_ENEMY.speed + waveProgress * 0.3,
        },
      });
    }

    // Healers from wave 5+ on levels 8+
    if (level >= 8 && w >= 5) {
      const healerCount = 1 + Math.floor((w - 4) * 0.5);
      entries.push({
        count: healerCount,
        spawnInterval: Math.max(1.0, 2.0 - waveProgress * 0.4),
        enemyConfig: {
          ...HEALER_ENEMY,
          hp: Math.round(HEALER_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: HEALER_ENEMY.speed + waveProgress * 0.15,
        },
      });
    }

    // Splitters from wave 6+ on levels 8+
    if (level >= 8 && w >= 6) {
      const splitCount = 2 + Math.floor((w - 5) * 0.6);
      entries.push({
        count: splitCount,
        spawnInterval: Math.max(0.6, 1.2 - waveProgress * 0.3),
        enemyConfig: {
          ...SPLITTER_ENEMY,
          hp: Math.round(SPLITTER_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: SPLITTER_ENEMY.speed + waveProgress * 0.2,
          splitConfig: {
            ...SPLITTER_ENEMY.splitConfig!,
            hp: Math.round(SPLITTER_ENEMY.splitConfig!.hp * hpScale * (0.8 + waveProgress * 0.4)),
            speed: SPLITTER_ENEMY.splitConfig!.speed + waveProgress * 0.2,
          },
        },
      });
    }

    // Stealth enemies from wave 4+ on levels 9+
    if (level >= 9 && w >= 4) {
      const stealthCount = 2 + Math.floor((w - 3) * 0.7);
      entries.push({
        count: stealthCount,
        spawnInterval: Math.max(0.5, 0.9 - waveProgress * 0.2),
        enemyConfig: {
          ...STEALTH_ENEMY,
          hp: Math.round(STEALTH_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: STEALTH_ENEMY.speed + waveProgress * 0.25,
        },
      });
    }

    // Boss on final wave for levels 3+
    if (w === waveCount && level >= 3) {
      const bossCount = Math.min(level - 1, 4);
      entries.push({
        count: bossCount,
        spawnInterval: 3.0,
        enemyConfig: {
          ...BOSS_ENEMY,
          hp: Math.round(BOSS_ENEMY.hp * hpScale),
          speed: BOSS_ENEMY.speed + (level - 3) * 0.1,
        },
      });
    }

    waves.push({ entries });
  }

  return waves;
}
