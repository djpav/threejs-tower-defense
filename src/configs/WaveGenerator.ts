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

// ── Scaling Functions ──────────────────────────────────────────────

/**
 * Exponential HP scaling per level.
 * Gives a smooth ~25% HP increase per level.
 * L1=1.0  L3=1.56  L5=2.44  L7=3.81  L10=7.45
 */
export function calcHPScale(level: number): number {
  return Math.pow(1.25, level - 1);
}

/**
 * Gold reward scaling — later levels give less gold per kill.
 * Prevents runaway economy where late-game income vastly exceeds tower costs.
 * L1=1.0  L3=0.66  L5=0.50  L7=0.40  L10=0.31
 */
export function calcRewardScale(level: number): number {
  return 1 / (1 + (level - 1) * 0.25);
}

/**
 * Max enemies per wave entry. Caps unit count for performance and economy.
 * Regular enemies: 8 + level, special types: 4 + floor(level * 0.8)
 */
function capCount(raw: number, level: number, isSpecial: boolean): number {
  const cap = isSpecial ? 4 + Math.floor(level * 0.8) : 8 + level;
  return Math.min(raw, cap);
}

/** Apply reward scaling to a base enemy reward. */
function scaledReward(baseReward: number, level: number): number {
  return Math.max(1, Math.round(baseReward * calcRewardScale(level)));
}

// ── Wave Generation ────────────────────────────────────────────────

export function generateWavesForLevel(level: number): WaveConfig[] {
  const waveCount = 3 + level * 2;
  const hpScale = calcHPScale(level);
  const waves: WaveConfig[] = [];

  for (let w = 1; w <= waveCount; w++) {
    const waveProgress = w / waveCount;
    const entries: WaveConfig["entries"] = [];

    // Basic enemies every wave, scaling up
    const basicCount = capCount(4 + Math.floor(w * 1.5), level, false);
    entries.push({
      count: basicCount,
      spawnInterval: Math.max(0.3, 1.0 - waveProgress * 0.4),
      enemyConfig: {
        ...BASIC_ENEMY,
        hp: Math.round(BASIC_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.6)),
        speed: BASIC_ENEMY.speed + waveProgress * 0.4,
        reward: scaledReward(BASIC_ENEMY.reward, level),
      },
    });

    // Fast runners from wave 3+
    if (w >= 3) {
      const fastCount = capCount(3 + Math.floor((w - 2) * 1.2), level, false);
      entries.push({
        count: fastCount,
        spawnInterval: Math.max(0.25, 0.6 - waveProgress * 0.2),
        enemyConfig: {
          ...FAST_RUNNER,
          hp: Math.round(FAST_RUNNER.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: FAST_RUNNER.speed + waveProgress * 0.3,
          reward: scaledReward(FAST_RUNNER.reward, level),
        },
      });
    }

    // Tanks from wave 5+
    if (w >= 5) {
      const tankCount = capCount(2 + Math.floor((w - 4) * 0.8), level, true);
      entries.push({
        count: tankCount,
        spawnInterval: Math.max(0.8, 1.5 - waveProgress * 0.3),
        enemyConfig: {
          ...TANK_ENEMY,
          hp: Math.round(TANK_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: TANK_ENEMY.speed + waveProgress * 0.2,
          reward: scaledReward(TANK_ENEMY.reward, level),
        },
      });
    }

    // Shielded from wave 7+
    if (w >= 7) {
      const shieldCount = capCount(2 + Math.floor((w - 6) * 0.8), level, true);
      entries.push({
        count: shieldCount,
        spawnInterval: Math.max(0.5, 1.0 - waveProgress * 0.2),
        enemyConfig: {
          ...SHIELDED_ENEMY,
          hp: Math.round(SHIELDED_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: SHIELDED_ENEMY.speed + waveProgress * 0.2,
          reward: scaledReward(SHIELDED_ENEMY.reward, level),
        },
      });
    }

    // Flying enemies from wave 4+ on levels 7+
    if (level >= 7 && w >= 4) {
      const flyCount = capCount(2 + Math.floor((w - 3) * 0.8), level, true);
      entries.push({
        count: flyCount,
        spawnInterval: Math.max(0.4, 0.8 - waveProgress * 0.2),
        enemyConfig: {
          ...FLYING_ENEMY,
          hp: Math.round(FLYING_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: FLYING_ENEMY.speed + waveProgress * 0.3,
          reward: scaledReward(FLYING_ENEMY.reward, level),
        },
      });
    }

    // Healers from wave 5+ on levels 8+
    if (level >= 8 && w >= 5) {
      const healerCount = capCount(1 + Math.floor((w - 4) * 0.5), level, true);
      entries.push({
        count: healerCount,
        spawnInterval: Math.max(1.0, 2.0 - waveProgress * 0.4),
        enemyConfig: {
          ...HEALER_ENEMY,
          hp: Math.round(HEALER_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: HEALER_ENEMY.speed + waveProgress * 0.15,
          reward: scaledReward(HEALER_ENEMY.reward, level),
        },
      });
    }

    // Splitters from wave 6+ on levels 8+
    if (level >= 8 && w >= 6) {
      const splitCount = capCount(2 + Math.floor((w - 5) * 0.6), level, true);
      const childCfg = SPLITTER_ENEMY.splitConfig;
      if (childCfg) {
        entries.push({
          count: splitCount,
          spawnInterval: Math.max(0.6, 1.2 - waveProgress * 0.3),
          enemyConfig: {
            ...SPLITTER_ENEMY,
            hp: Math.round(SPLITTER_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
            speed: SPLITTER_ENEMY.speed + waveProgress * 0.2,
            reward: scaledReward(SPLITTER_ENEMY.reward, level),
            splitConfig: {
              ...childCfg,
              hp: Math.round(childCfg.hp * hpScale * (0.8 + waveProgress * 0.4)),
              speed: childCfg.speed + waveProgress * 0.2,
              reward: scaledReward(childCfg.reward, level),
            },
          },
        });
      }
    }

    // Stealth enemies from wave 4+ on levels 9+
    if (level >= 9 && w >= 4) {
      const stealthCount = capCount(2 + Math.floor((w - 3) * 0.7), level, true);
      entries.push({
        count: stealthCount,
        spawnInterval: Math.max(0.5, 0.9 - waveProgress * 0.2),
        enemyConfig: {
          ...STEALTH_ENEMY,
          hp: Math.round(STEALTH_ENEMY.hp * hpScale * (0.8 + waveProgress * 0.5)),
          speed: STEALTH_ENEMY.speed + waveProgress * 0.25,
          reward: scaledReward(STEALTH_ENEMY.reward, level),
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
          reward: scaledReward(BOSS_ENEMY.reward, level),
        },
      });
    }

    waves.push({ entries });
  }

  return waves;
}
