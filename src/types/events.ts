import { TowerType } from "./enums";
import { GridPosition } from "./geometry";
import { TowerInfo } from "./towers";
import { EnemyInfo } from "./enemies";

export type GameEventMap = {
  "enemy-killed": { reward: number };
  "enemy-reached-goal": { damage: number };
  "wave-complete": { wave: number };
  "wave-start": { wave: number };
  "gold-changed": { gold: number };
  "lives-changed": { lives: number };
  "game-over": { win: boolean };
  "tower-placed": { type: TowerType };
  "tower-selected": { tower: TowerInfo };
  "tower-upgraded": { tower: TowerInfo };
  "tower-sold": { refund: number; gridPos: GridPosition };
  "enemy-selected": { enemy: EnemyInfo };
  "enemy-deselected": {};
};
