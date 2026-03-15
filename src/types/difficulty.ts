import { Difficulty } from "./enums";

export interface DifficultyModifiers {
  enemyHpMult: number;
  enemySpeedMult: number;
  goldMult: number;
  livesMult: number;
}

export const DIFFICULTY_MODS: Record<Difficulty, DifficultyModifiers> = {
  [Difficulty.Easy]: { enemyHpMult: 0.75, enemySpeedMult: 0.9, goldMult: 1.2, livesMult: 1.4 },
  [Difficulty.Normal]: { enemyHpMult: 1.0, enemySpeedMult: 1.0, goldMult: 1.0, livesMult: 1.0 },
  [Difficulty.Hard]: { enemyHpMult: 1.3, enemySpeedMult: 1.1, goldMult: 0.85, livesMult: 0.6 },
};
