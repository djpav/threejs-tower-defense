import { Difficulty } from "./enums";

export interface DifficultyModifiers {
  enemyHpMult: number;
  enemySpeedMult: number;
  goldMult: number;
  livesMult: number;
}

export const DIFFICULTY_MODS: Record<Difficulty, DifficultyModifiers> = {
  [Difficulty.Easy]: { enemyHpMult: 0.7, enemySpeedMult: 0.85, goldMult: 1.3, livesMult: 1.5 },
  [Difficulty.Normal]: { enemyHpMult: 1.0, enemySpeedMult: 1.0, goldMult: 1.0, livesMult: 1.0 },
  [Difficulty.Hard]: { enemyHpMult: 1.5, enemySpeedMult: 1.2, goldMult: 0.8, livesMult: 0.6 },
};
