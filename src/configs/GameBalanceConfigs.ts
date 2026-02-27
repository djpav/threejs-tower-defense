import { EnemyConfig, TowerConfig, TowerType } from "@/types";

export const BASIC_ENEMY: EnemyConfig = {
  hp: 100,
  speed: 2,
  reward: 10,
  radius: 0.3,
};

export const FAST_RUNNER: EnemyConfig = {
  hp: 50,
  speed: 3.0,
  reward: 8,
  radius: 0.2,
  color: 0xf1c40f,
  bodyType: "sphere",
};

export const TANK_ENEMY: EnemyConfig = {
  hp: 300,
  speed: 1.2,
  reward: 20,
  radius: 0.4,
  color: 0x922b21,
  bodyType: "cube",
};

export const SHIELDED_ENEMY: EnemyConfig = {
  hp: 200,
  speed: 1.6,
  reward: 15,
  radius: 0.3,
  color: 0x95a5a6,
  bodyType: "icosahedron",
};

export const BOSS_ENEMY: EnemyConfig = {
  hp: 1000,
  speed: 0.8,
  reward: 100,
  radius: 0.5,
  color: 0x6c3483,
  bodyType: "sphere",
};

export const FLYING_ENEMY: EnemyConfig = {
  hp: 80,
  speed: 2.5,
  reward: 12,
  radius: 0.25,
  color: 0x5dade2,
  bodyType: "diamond",
  isFlying: true,
};

export const HEALER_ENEMY: EnemyConfig = {
  hp: 150,
  speed: 1.5,
  reward: 18,
  radius: 0.3,
  color: 0x2ecc71,
  bodyType: "cone",
  healRadius: 2.0,
  healAmount: 10,
  healTickRate: 1.0,
};

const SPLITTER_CHILD: EnemyConfig = {
  hp: 40,
  speed: 2.2,
  reward: 5,
  radius: 0.18,
  color: 0xe67e22,
  bodyType: "sphere",
};

export const SPLITTER_ENEMY: EnemyConfig = {
  hp: 120,
  speed: 1.8,
  reward: 15,
  radius: 0.32,
  color: 0xe67e22,
  bodyType: "icosahedron",
  splitOnDeath: true,
  splitCount: 2,
  splitConfig: SPLITTER_CHILD,
};

export const STEALTH_ENEMY: EnemyConfig = {
  hp: 90,
  speed: 2.0,
  reward: 14,
  radius: 0.25,
  color: 0x7f8c8d,
  bodyType: "cube",
  isStealth: true,
  stealthRevealRange: 2.0,
};

// ── Arrow Tower Levels ──
export const ARROW_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Arrow, name: "Arrow", damage: 25, range: 2.5,
    fireRate: 1.0, cost: 25, projectileSpeed: 6, projectileColor: 0xf1c40f,
    upgradeCost: 30,
  },
  {
    type: TowerType.Arrow, name: "Arrow", damage: 35, range: 2.8,
    fireRate: 1.3, cost: 25, projectileSpeed: 6, projectileColor: 0xf1c40f,
    upgradeCost: 50,
  },
  {
    type: TowerType.Arrow, name: "Arrow", damage: 50, range: 3.2,
    fireRate: 1.6, cost: 25, projectileSpeed: 6, projectileColor: 0xf1c40f,
  },
];

// ── Cannon Tower Levels ──
export const CANNON_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Cannon, name: "Cannon", damage: 60, range: 2.0,
    fireRate: 0.5, cost: 60, projectileSpeed: 5, projectileColor: 0xe67e22,
    splashRadius: 1.2, upgradeCost: 50, canTargetFlying: false,
  },
  {
    type: TowerType.Cannon, name: "Cannon", damage: 90, range: 2.3,
    fireRate: 0.6, cost: 60, projectileSpeed: 5, projectileColor: 0xe67e22,
    splashRadius: 1.4, upgradeCost: 80, canTargetFlying: false,
  },
  {
    type: TowerType.Cannon, name: "Cannon", damage: 130, range: 2.6,
    fireRate: 0.7, cost: 60, projectileSpeed: 5, projectileColor: 0xe67e22,
    splashRadius: 1.7, canTargetFlying: false,
  },
];

// ── Frost Tower Levels ──
export const FROST_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Frost, name: "Frost", damage: 12, range: 2.2,
    fireRate: 1.0, cost: 40, projectileSpeed: 5, projectileColor: 0x3498db,
    slowFactor: 0.5, slowDuration: 2.0, upgradeCost: 35,
  },
  {
    type: TowerType.Frost, name: "Frost", damage: 18, range: 2.5,
    fireRate: 1.2, cost: 40, projectileSpeed: 5, projectileColor: 0x3498db,
    slowFactor: 0.4, slowDuration: 2.5, upgradeCost: 60,
  },
  {
    type: TowerType.Frost, name: "Frost", damage: 28, range: 2.8,
    fireRate: 1.4, cost: 40, projectileSpeed: 5, projectileColor: 0x3498db,
    slowFactor: 0.3, slowDuration: 3.0,
  },
];

// ── Lightning Tower Levels ──
export const LIGHTNING_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Lightning, name: "Lightning", damage: 30, range: 2.5,
    fireRate: 0.8, cost: 50, projectileSpeed: 8, projectileColor: 0x9b59b6,
    chainCount: 2, chainRange: 2.0, chainDamageFalloff: 0.7, upgradeCost: 45,
  },
  {
    type: TowerType.Lightning, name: "Lightning", damage: 45, range: 2.8,
    fireRate: 1.0, cost: 50, projectileSpeed: 8, projectileColor: 0x9b59b6,
    chainCount: 3, chainRange: 2.3, chainDamageFalloff: 0.75, upgradeCost: 70,
  },
  {
    type: TowerType.Lightning, name: "Lightning", damage: 65, range: 3.2,
    fireRate: 1.2, cost: 50, projectileSpeed: 8, projectileColor: 0x9b59b6,
    chainCount: 4, chainRange: 2.6, chainDamageFalloff: 0.8,
  },
];

// ── Poison Tower Levels ──
export const POISON_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Poison, name: "Poison", damage: 10, range: 2.2,
    fireRate: 0.9, cost: 45, projectileSpeed: 5, projectileColor: 0x27ae60,
    poisonDamage: 5, poisonDuration: 3.0, poisonTickRate: 0.5, poisonMaxStacks: 3, upgradeCost: 40,
  },
  {
    type: TowerType.Poison, name: "Poison", damage: 15, range: 2.5,
    fireRate: 1.1, cost: 45, projectileSpeed: 5, projectileColor: 0x27ae60,
    poisonDamage: 8, poisonDuration: 4.0, poisonTickRate: 0.5, poisonMaxStacks: 4, upgradeCost: 65,
  },
  {
    type: TowerType.Poison, name: "Poison", damage: 22, range: 2.8,
    fireRate: 1.3, cost: 45, projectileSpeed: 5, projectileColor: 0x27ae60,
    poisonDamage: 12, poisonDuration: 5.0, poisonTickRate: 0.5, poisonMaxStacks: 5,
  },
];

// ── Sniper Tower Levels ──
export const SNIPER_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Sniper, name: "Sniper", damage: 100, range: 5.0,
    fireRate: 0.3, cost: 70, projectileSpeed: 12, projectileColor: 0xecf0f1,
    upgradeCost: 60,
  },
  {
    type: TowerType.Sniper, name: "Sniper", damage: 170, range: 5.5,
    fireRate: 0.35, cost: 70, projectileSpeed: 12, projectileColor: 0xecf0f1,
    upgradeCost: 90,
  },
  {
    type: TowerType.Sniper, name: "Sniper", damage: 250, range: 6.0,
    fireRate: 0.4, cost: 70, projectileSpeed: 12, projectileColor: 0xecf0f1,
  },
];

// ── Tesla Tower Levels ──
export const TESLA_TOWER_LEVELS: TowerConfig[] = [
  {
    type: TowerType.Tesla, name: "Tesla", damage: 20, range: 1.8,
    fireRate: 0.8, cost: 80, projectileSpeed: 0, projectileColor: 0x00e5ff,
    isPulse: true, upgradeCost: 60,
  },
  {
    type: TowerType.Tesla, name: "Tesla", damage: 35, range: 2.1,
    fireRate: 1.0, cost: 80, projectileSpeed: 0, projectileColor: 0x00e5ff,
    isPulse: true, upgradeCost: 90,
  },
  {
    type: TowerType.Tesla, name: "Tesla", damage: 55, range: 2.4,
    fireRate: 1.2, cost: 80, projectileSpeed: 0, projectileColor: 0x00e5ff,
    isPulse: true,
  },
];

/** Lookup: TowerType → array of level configs (index 0 = Lv1) */
export const TOWER_LEVELS: Record<TowerType, TowerConfig[]> = {
  [TowerType.Arrow]: ARROW_TOWER_LEVELS,
  [TowerType.Cannon]: CANNON_TOWER_LEVELS,
  [TowerType.Frost]: FROST_TOWER_LEVELS,
  [TowerType.Lightning]: LIGHTNING_TOWER_LEVELS,
  [TowerType.Poison]: POISON_TOWER_LEVELS,
  [TowerType.Sniper]: SNIPER_TOWER_LEVELS,
  [TowerType.Tesla]: TESLA_TOWER_LEVELS,
};

// Convenience aliases (Lv1 of each tower)
export const ARROW_TOWER: TowerConfig = ARROW_TOWER_LEVELS[0];
export const CANNON_TOWER: TowerConfig = CANNON_TOWER_LEVELS[0];
export const FROST_TOWER: TowerConfig = FROST_TOWER_LEVELS[0];
export const LIGHTNING_TOWER: TowerConfig = LIGHTNING_TOWER_LEVELS[0];
export const POISON_TOWER: TowerConfig = POISON_TOWER_LEVELS[0];
export const SNIPER_TOWER: TowerConfig = SNIPER_TOWER_LEVELS[0];
export const TESLA_TOWER: TowerConfig = TESLA_TOWER_LEVELS[0];

export const ALL_TOWERS: TowerConfig[] = [
  ARROW_TOWER, CANNON_TOWER, FROST_TOWER,
  LIGHTNING_TOWER, POISON_TOWER, SNIPER_TOWER, TESLA_TOWER,
];

export const STARTING_GOLD = 100;
export const STARTING_LIVES = 20;
