import { TowerType, TargetingPriority } from "./enums";
import { GridPosition } from "./geometry";

export interface TowerConfig {
  type: TowerType;
  name: string;
  range: number;
  fireRate: number;
  damage: number;
  cost: number;
  projectileSpeed: number;
  projectileColor: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  upgradeCost?: number;
  chainCount?: number;
  chainRange?: number;
  chainDamageFalloff?: number;
  poisonDamage?: number;
  poisonDuration?: number;
  poisonTickRate?: number;
  poisonMaxStacks?: number;
  isPulse?: boolean;
  canTargetFlying?: boolean;
}

export interface TowerInfo {
  type: TowerType;
  name: string;
  level: number;
  maxLevel: number;
  damage: number;
  range: number;
  fireRate: number;
  upgradeCost?: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  chainCount?: number;
  poisonDamage?: number;
  poisonDuration?: number;
  isPulse?: boolean;
  targetingPriority: TargetingPriority;
  totalInvested: number;
  gridPos: GridPosition;
}

/** Snapshot of a sold tower for undo purposes. */
export interface SoldTowerData {
  type: TowerType;
  level: number;
  totalInvested: number;
  gridPos: GridPosition;
  refund: number;
  targetingMode: TargetingPriority;
}