import { LEVEL_CONFIGS } from "@/configs/LevelConfigs";
import { generateEndlessWave } from "@/configs/EndlessWaveGenerator";
import { generateBudgetWave } from "@/configs/WaveGenerator";
import {
  BASIC_ENEMY,
  FAST_RUNNER,
  TANK_ENEMY,
  SHIELDED_ENEMY,
  FLYING_ENEMY,
} from "@/configs/GameBalanceConfigs";
import { Difficulty, DIFFICULTY_MODS, WaveConfig, LevelConfig, EnemyConfig } from "@/types";
import { mulberry32 } from "@/utils/MathUtils";

export class LevelManager {
  private endlessWaveNum = 0;
  private currentMods = DIFFICULTY_MODS[Difficulty.Normal];

  buildLevelConfig(levelIndex: number, difficulty: Difficulty): LevelConfig {
    const mods = DIFFICULTY_MODS[difficulty];
    this.currentMods = mods;

    if (levelIndex === -1) {
      const initialWaves = [1, 2, 3].map(n => generateEndlessWave(n));
      this.endlessWaveNum = 3;
      return {
        level: 0,
        name: "Endless",
        rows: 14,
        cols: 20,
        minPathLength: 55,
        startingGold: Math.round(200 * mods.goldMult),
        startingLives: Math.round(20 * mods.livesMult),
        waves: this.applyDifficulty(initialWaves, mods),
        seed: Date.now(),
      };
    }

    // Custom map placeholder — overridden by caller
    if (levelIndex === -2) {
      return {
        level: 0,
        name: "Custom Map",
        rows: 12,
        cols: 16,
        minPathLength: 10,
        startingGold: 100,
        startingLives: 20,
        waves: [],
        seed: Date.now(),
      };
    }

    const baseCfg = LEVEL_CONFIGS[levelIndex];
    return {
      ...baseCfg,
      startingGold: Math.round(baseCfg.startingGold * mods.goldMult),
      startingLives: Math.round(baseCfg.startingLives * mods.livesMult),
      waves: this.applyDifficulty(baseCfg.waves, mods),
    };
  }

  generateNextEndlessWave(): WaveConfig {
    this.endlessWaveNum++;

    // Alternate: even waves use budget system for variety
    if (this.endlessWaveNum % 2 === 0) {
      const budget = 30 + this.endlessWaveNum * 15;
      const types = this.getAvailableEnemyTypes(this.endlessWaveNum);
      const rand = mulberry32(this.endlessWaveNum * 7919);
      const wave = generateBudgetWave(budget, Math.ceil(this.endlessWaveNum / 3), types, rand);
      return this.applyDifficulty([wave], this.currentMods)[0];
    }

    const nextWave = generateEndlessWave(this.endlessWaveNum);
    return this.applyDifficulty([nextWave], this.currentMods)[0];
  }

  resetEndless(): void {
    this.endlessWaveNum = 0;
  }

  /** Get available enemy types based on wave progression. */
  private getAvailableEnemyTypes(waveNum: number): EnemyConfig[] {
    const types: EnemyConfig[] = [BASIC_ENEMY, FAST_RUNNER];
    if (waveNum >= 5) types.push(TANK_ENEMY);
    if (waveNum >= 7) types.push(SHIELDED_ENEMY);
    if (waveNum >= 10) types.push(FLYING_ENEMY);
    return types;
  }

  private applyDifficulty(
    waves: WaveConfig[],
    mods: { enemyHpMult: number; enemySpeedMult: number; goldMult?: number },
  ): WaveConfig[] {
    const gm = mods.goldMult ?? 1;
    if (mods.enemyHpMult === 1 && mods.enemySpeedMult === 1 && gm === 1) return waves;
    return waves.map(wave => ({
      entries: wave.entries.map(entry => ({
        ...entry,
        enemyConfig: {
          ...entry.enemyConfig,
          hp: Math.round(entry.enemyConfig.hp * mods.enemyHpMult),
          speed: entry.enemyConfig.speed * mods.enemySpeedMult,
          reward: Math.round(entry.enemyConfig.reward * gm),
        },
      })),
    }));
  }
}
