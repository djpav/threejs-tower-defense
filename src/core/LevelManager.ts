import { LEVEL_CONFIGS } from "@/configs/LevelConfigs";
import { generateEndlessWave } from "@/configs/EndlessWaveGenerator";
import { Difficulty, DIFFICULTY_MODS, WaveConfig, LevelConfig } from "@/types";

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
        rows: 12,
        cols: 12,
        minPathLength: 20,
        startingGold: Math.round(200 * mods.goldMult),
        startingLives: Math.round(20 * mods.livesMult),
        waves: this.applyDifficulty(initialWaves, mods),
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
    const nextWave = generateEndlessWave(this.endlessWaveNum);
    return this.applyDifficulty([nextWave], this.currentMods)[0];
  }

  resetEndless(): void {
    this.endlessWaveNum = 0;
  }

  private applyDifficulty(
    waves: WaveConfig[],
    mods: { enemyHpMult: number; enemySpeedMult: number },
  ): WaveConfig[] {
    if (mods.enemyHpMult === 1 && mods.enemySpeedMult === 1) return waves;
    return waves.map(wave => ({
      entries: wave.entries.map(entry => ({
        ...entry,
        enemyConfig: {
          ...entry.enemyConfig,
          hp: Math.round(entry.enemyConfig.hp * mods.enemyHpMult),
          speed: entry.enemyConfig.speed * mods.enemySpeedMult,
        },
      })),
    }));
  }
}
