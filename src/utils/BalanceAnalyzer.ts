import {
  TowerConfig,
  TowerType,
  EnemyConfig,
  WaveConfig,
  LevelConfig,
  Difficulty,
  DIFFICULTY_MODS,
} from "@/types";
import { TOWER_LEVELS } from "@/configs/GameBalanceConfigs";

// ── Result Interfaces ──────────────────────────────────────────────

export interface TowerDPS {
  type: TowerType;
  name: string;
  level: number;
  rawDPS: number;
  effectiveDPS: number;
  totalCost: number;
  dpsPerGold: number;
  range: number;
  abilities: string[];
}

export interface WaveEntryBreakdown {
  count: number;
  hp: number;
  speed: number;
  reward: number;
  totalHP: number;
  totalReward: number;
  traits: string[];
}

export interface WaveBreakdown {
  waveIndex: number;
  totalEnemies: number;
  totalHP: number;
  totalReward: number;
  peakEnemyHP: number;
  entries: WaveEntryBreakdown[];
  hasFlying: boolean;
  hasStealth: boolean;
  hasHealer: boolean;
  hasSplitter: boolean;
}

export interface LevelBreakdown {
  level: number;
  name: string;
  difficulty: Difficulty;
  startingGold: number;
  startingLives: number;
  totalWaves: number;
  totalEnemies: number;
  totalHP: number;
  totalReward: number;
  estimatedBudget: number;
  waves: WaveBreakdown[];
}

export interface ViabilityReport {
  /** 0-100 score: how feasible is this level with optimal play */
  score: number;
  estimatedBudget: number;
  maxAffordableDPS: number;
  peakWaveHP: number;
  peakWaveDPSRequired: number;
  sustainedDPSRequired: number;
  goldSurplusRatio: number;
  flyingThreat: boolean;
  stealthThreat: boolean;
  healerThreat: boolean;
  bottlenecks: string[];
}

export interface TowerComposition {
  type: TowerType;
  count: number;
  level: number;
}

export interface CompositionAnalysis {
  towers: TowerComposition[];
  totalCost: number;
  totalDPS: number;
  canHandleFlying: boolean;
  canHandleStealth: boolean;
  goldRemaining: number;
}

// ── Tower DPS Calculations ─────────────────────────────────────────

/** Calculate raw DPS (damage × fireRate) for a single tower config. */
export function calcRawDPS(config: TowerConfig): number {
  return config.damage * config.fireRate;
}

/**
 * Calculate effective DPS accounting for chain lightning, poison DOT stacks,
 * and AoE pulse. For AoE/splash, uses the provided avgTargets estimate.
 */
export function calcEffectiveDPS(
  config: TowerConfig,
  avgTargets: number = 1
): number {
  const raw = calcRawDPS(config);

  // Chain lightning: primary + each chain bounce with damage falloff
  if (config.chainCount && config.chainDamageFalloff) {
    let total = raw;
    let chainDmg = raw;
    for (let i = 0; i < config.chainCount; i++) {
      chainDmg *= config.chainDamageFalloff;
      total += chainDmg;
    }
    return total;
  }

  // Poison: direct DPS + (poisonDamage / tickRate) × maxStacks
  if (
    config.poisonDamage &&
    config.poisonTickRate &&
    config.poisonMaxStacks
  ) {
    const dotDPS =
      (config.poisonDamage / config.poisonTickRate) * config.poisonMaxStacks;
    return raw + dotDPS;
  }

  // Tesla pulse: hits ALL enemies in range
  if (config.isPulse) {
    return raw * avgTargets;
  }

  // Cannon splash: hits multiple enemies in splash radius
  if (config.splashRadius) {
    return raw * avgTargets;
  }

  return raw;
}

/** Get the total gold cost to reach a given upgrade level (0-indexed). */
export function calcTotalCost(levels: TowerConfig[], targetLevel: number): number {
  let total = levels[0].cost;
  for (let i = 0; i < targetLevel; i++) {
    total += levels[i].upgradeCost ?? 0;
  }
  return total;
}

/** Analyze DPS for a tower type at a specific level. */
export function analyzeTowerDPS(
  type: TowerType,
  level: number = 0,
  avgTargets: number = 1
): TowerDPS {
  const levels = TOWER_LEVELS[type];
  const config = levels[Math.min(level, levels.length - 1)];
  const totalCost = calcTotalCost(levels, level);
  const rawDPS = calcRawDPS(config);
  const effectiveDPS = calcEffectiveDPS(config, avgTargets);

  const abilities: string[] = [];
  if (config.slowFactor) abilities.push(`${Math.round((1 - config.slowFactor) * 100)}% slow ${config.slowDuration}s`);
  if (config.chainCount) abilities.push(`chain ${config.chainCount} (${Math.round((config.chainDamageFalloff ?? 0) * 100)}% per bounce)`);
  if (config.poisonMaxStacks) abilities.push(`poison ${config.poisonDamage}/tick ×${config.poisonMaxStacks} stacks`);
  if (config.isPulse) abilities.push("AoE pulse");
  if (config.splashRadius) abilities.push(`splash r=${config.splashRadius}`);
  if (config.canTargetFlying === false) abilities.push("no flying");

  return {
    type,
    name: config.name,
    level,
    rawDPS,
    effectiveDPS,
    totalCost,
    dpsPerGold: effectiveDPS / totalCost,
    range: config.range,
    abilities,
  };
}

/** Analyze all tower types at all levels. */
export function analyzeAllTowers(avgTargets: number = 1): TowerDPS[] {
  const results: TowerDPS[] = [];
  for (const type of Object.values(TowerType)) {
    const levels = TOWER_LEVELS[type];
    for (let lvl = 0; lvl < levels.length; lvl++) {
      results.push(analyzeTowerDPS(type, lvl, avgTargets));
    }
  }
  return results;
}

// ── Enemy & Wave Analysis ──────────────────────────────────────────

function getEnemyTraits(config: EnemyConfig): string[] {
  const traits: string[] = [];
  if (config.isFlying) traits.push("flying");
  if (config.isStealth) traits.push("stealth");
  if (config.healRadius) traits.push("healer");
  if (config.splitOnDeath) traits.push("splitter");
  return traits;
}

/** Total HP contributed by a wave entry, including splitter children. */
function calcEntryTotalHP(entry: { count: number; enemyConfig: EnemyConfig }): number {
  let hp = entry.count * entry.enemyConfig.hp;
  if (entry.enemyConfig.splitOnDeath && entry.enemyConfig.splitConfig) {
    hp += entry.count * (entry.enemyConfig.splitCount ?? 2) * entry.enemyConfig.splitConfig.hp;
  }
  return hp;
}

/** Total enemy count for a wave entry, including splitter children. */
function calcEntryTotalEnemies(entry: { count: number; enemyConfig: EnemyConfig }): number {
  let count = entry.count;
  if (entry.enemyConfig.splitOnDeath) {
    count += entry.count * (entry.enemyConfig.splitCount ?? 2);
  }
  return count;
}

/** Apply difficulty modifiers to a wave's enemy configs. */
function applyDifficultyToWave(wave: WaveConfig, difficulty: Difficulty): WaveConfig {
  const mods = DIFFICULTY_MODS[difficulty];
  return {
    entries: wave.entries.map((entry) => ({
      ...entry,
      enemyConfig: {
        ...entry.enemyConfig,
        hp: Math.round(entry.enemyConfig.hp * mods.enemyHpMult),
        speed: entry.enemyConfig.speed * mods.enemySpeedMult,
        reward: Math.round(entry.enemyConfig.reward * mods.goldMult),
        ...(entry.enemyConfig.splitConfig
          ? {
              splitConfig: {
                ...entry.enemyConfig.splitConfig,
                hp: Math.round(entry.enemyConfig.splitConfig.hp * mods.enemyHpMult),
                speed: entry.enemyConfig.splitConfig.speed * mods.enemySpeedMult,
                reward: Math.round(entry.enemyConfig.splitConfig.reward * mods.goldMult),
              },
            }
          : {}),
      },
    })),
  };
}

/** Break down a single wave into analysis data. */
export function analyzeWave(
  wave: WaveConfig,
  waveIndex: number,
  difficulty: Difficulty = Difficulty.Normal
): WaveBreakdown {
  const adjusted = applyDifficultyToWave(wave, difficulty);
  const entries: WaveEntryBreakdown[] = adjusted.entries.map((e) => {
    const totalHP = calcEntryTotalHP(e);
    const totalEnemies = calcEntryTotalEnemies(e);
    const totalReward = totalEnemies * e.enemyConfig.reward;
    return {
      count: e.count,
      hp: e.enemyConfig.hp,
      speed: e.enemyConfig.speed,
      reward: e.enemyConfig.reward,
      totalHP,
      totalReward,
      traits: getEnemyTraits(e.enemyConfig),
    };
  });

  return {
    waveIndex,
    totalEnemies: entries.reduce((s, e) => s + e.count, 0),
    totalHP: entries.reduce((s, e) => s + e.totalHP, 0),
    totalReward: entries.reduce((s, e) => s + e.totalReward, 0),
    peakEnemyHP: Math.max(...entries.map((e) => e.hp)),
    entries,
    hasFlying: entries.some((e) => e.traits.includes("flying")),
    hasStealth: entries.some((e) => e.traits.includes("stealth")),
    hasHealer: entries.some((e) => e.traits.includes("healer")),
    hasSplitter: entries.some((e) => e.traits.includes("splitter")),
  };
}

// ── Level Analysis ─────────────────────────────────────────────────

/** Full breakdown of a level's waves, gold, and HP. */
export function analyzeLevel(
  config: LevelConfig,
  difficulty: Difficulty = Difficulty.Normal
): LevelBreakdown {
  const mods = DIFFICULTY_MODS[difficulty];
  const startingGold = Math.round(config.startingGold * mods.goldMult);
  const startingLives = Math.round(config.startingLives * mods.livesMult);

  const waves = config.waves.map((w, i) => analyzeWave(w, i, difficulty));
  const totalEnemies = waves.reduce((s, w) => s + w.totalEnemies, 0);
  const totalHP = waves.reduce((s, w) => s + w.totalHP, 0);
  const totalReward = waves.reduce((s, w) => s + w.totalReward, 0);

  return {
    level: config.level,
    name: config.name,
    difficulty,
    startingGold,
    startingLives,
    totalWaves: waves.length,
    totalEnemies,
    totalHP,
    totalReward,
    estimatedBudget: startingGold + totalReward,
    waves,
  };
}

// ── Viability Scoring ──────────────────────────────────────────────

/**
 * Estimate how much DPS a given gold budget can buy using optimal tower mix.
 * Uses a greedy approach picking the best dpsPerGold tower repeatedly.
 */
export function estimateMaxDPS(
  budget: number,
  avgTargets: number = 2
): number {
  // Evaluate all tower types at all levels for best efficiency
  const options: { cost: number; dps: number; dpsPerGold: number }[] = [];
  for (const type of Object.values(TowerType)) {
    const levels = TOWER_LEVELS[type];
    for (let lvl = 0; lvl < levels.length; lvl++) {
      const cost = calcTotalCost(levels, lvl);
      const dps = calcEffectiveDPS(levels[lvl], avgTargets);
      options.push({ cost, dps, dpsPerGold: dps / cost });
    }
  }

  // Greedy: pick most efficient tower that fits remaining budget
  options.sort((a, b) => b.dpsPerGold - a.dpsPerGold);
  let remaining = budget;
  let totalDPS = 0;

  while (remaining > 0) {
    const affordable = options.find((o) => o.cost <= remaining);
    if (!affordable) break;
    totalDPS += affordable.dps;
    remaining -= affordable.cost;
  }

  return totalDPS;
}

/**
 * Assess level viability: can it be completed with optimal tower placement?
 * Uses estimated path traversal time and gold income to determine feasibility.
 */
export function assessViability(
  config: LevelConfig,
  difficulty: Difficulty = Difficulty.Normal
): ViabilityReport {
  const level = analyzeLevel(config, difficulty);
  const pathLength = config.minPathLength;

  // Average enemy speed across all waves (rough estimate)
  const allSpeeds: number[] = [];
  const mods = DIFFICULTY_MODS[difficulty];
  for (const wave of config.waves) {
    for (const entry of wave.entries) {
      allSpeeds.push(entry.enemyConfig.speed * mods.enemySpeedMult);
    }
  }
  const avgSpeed = allSpeeds.reduce((s, v) => s + v, 0) / allSpeeds.length;

  // Estimated time an enemy spends on the path
  const avgTimeOnPath = pathLength / avgSpeed;

  // Peak wave analysis
  const peakWave = level.waves.reduce(
    (max, w) => (w.totalHP > max.totalHP ? w : max),
    level.waves[0]
  );

  // DPS required to clear peak wave within path traversal time
  // Enemies arrive over time (spawn interval), so effective window is larger
  const peakSpawnDuration = Math.max(
    ...peakWave.entries.map((e) => e.count * (0.8)) // approximate avg interval
  );
  const peakClearWindow = avgTimeOnPath + peakSpawnDuration;
  const peakWaveDPSRequired = peakWave.totalHP / peakClearWindow;

  // Sustained DPS required across entire level
  const totalSpawnDuration = level.waves.reduce(
    (s, w) => s + w.entries.reduce((ws, e) => Math.max(ws, e.count * 0.8), 0),
    0
  );
  const totalClearTime = totalSpawnDuration + avgTimeOnPath * level.totalWaves;
  const sustainedDPSRequired = level.totalHP / totalClearTime;

  // Estimate budget: starting gold + gold from early waves enables mid/late towers
  // Conservative: assume 85% kill rate (some enemies leak)
  const killRate = 0.85;
  const estimatedBudget = level.startingGold + Math.round(level.totalReward * killRate);
  const maxAffordableDPS = estimateMaxDPS(estimatedBudget, 2);

  // Gold surplus ratio: how much DPS you can afford vs how much you need
  const goldSurplusRatio = maxAffordableDPS / Math.max(1, peakWaveDPSRequired);

  // Threat flags
  const flyingThreat = level.waves.some((w) => w.hasFlying);
  const stealthThreat = level.waves.some((w) => w.hasStealth);
  const healerThreat = level.waves.some((w) => w.hasHealer);

  // Bottlenecks
  const bottlenecks: string[] = [];
  if (goldSurplusRatio < 1.5) bottlenecks.push("tight gold economy");
  if (goldSurplusRatio < 1.0) bottlenecks.push("insufficient DPS for peak wave");
  if (flyingThreat) bottlenecks.push("flying enemies (Cannon unusable)");
  if (stealthThreat) bottlenecks.push("stealth enemies need close-range towers");
  if (healerThreat) bottlenecks.push("healers sustain enemy HP");
  if (level.startingLives <= 10) bottlenecks.push("low starting lives");
  if (peakWave.peakEnemyHP > 2000) bottlenecks.push(`high-HP enemies (${peakWave.peakEnemyHP} HP)`);

  // Score: 0-100
  let score = 50;
  // DPS adequacy (biggest factor)
  if (goldSurplusRatio >= 3) score += 30;
  else if (goldSurplusRatio >= 2) score += 20;
  else if (goldSurplusRatio >= 1.5) score += 10;
  else if (goldSurplusRatio >= 1) score += 0;
  else score -= 20;

  // Lives buffer
  if (level.startingLives >= 20) score += 10;
  else if (level.startingLives >= 15) score += 5;
  else if (level.startingLives <= 5) score -= 15;
  else if (level.startingLives <= 10) score -= 5;

  // Threat complexity
  if (flyingThreat) score -= 5;
  if (stealthThreat) score -= 5;
  if (healerThreat) score -= 5;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    estimatedBudget,
    maxAffordableDPS: Math.round(maxAffordableDPS),
    peakWaveHP: peakWave.totalHP,
    peakWaveDPSRequired: Math.round(peakWaveDPSRequired),
    sustainedDPSRequired: Math.round(sustainedDPSRequired),
    goldSurplusRatio: Math.round(goldSurplusRatio * 100) / 100,
    flyingThreat,
    stealthThreat,
    healerThreat,
    bottlenecks,
  };
}

// ── Tower Composition Analysis ─────────────────────────────────────

/**
 * Analyze a specific tower composition against a level.
 * Useful for testing "can this army beat this level?" scenarios.
 */
export function analyzeComposition(
  towers: TowerComposition[],
  levelConfig: LevelConfig,
  difficulty: Difficulty = Difficulty.Normal
): CompositionAnalysis {
  const mods = DIFFICULTY_MODS[difficulty];
  const startingGold = Math.round(levelConfig.startingGold * mods.goldMult);

  let totalCost = 0;
  let totalDPS = 0;
  let hasFlyingCapable = false;
  let hasCloseRange = false;

  for (const tower of towers) {
    const levels = TOWER_LEVELS[tower.type];
    const config = levels[Math.min(tower.level, levels.length - 1)];
    const cost = calcTotalCost(levels, tower.level) * tower.count;
    const dps = calcEffectiveDPS(config, 2) * tower.count;

    totalCost += cost;
    totalDPS += dps;

    if (config.canTargetFlying !== false) {
      hasFlyingCapable = true;
    }

    if (config.range <= 2.5) hasCloseRange = true;
  }

  const level = analyzeLevel(levelConfig, difficulty);
  const hasFlying = level.waves.some((w) => w.hasFlying);
  const hasStealth = level.waves.some((w) => w.hasStealth);

  return {
    towers,
    totalCost,
    totalDPS: Math.round(totalDPS),
    canHandleFlying: !hasFlying || hasFlyingCapable,
    canHandleStealth: !hasStealth || hasCloseRange,
    goldRemaining: startingGold + level.totalReward - totalCost,
  };
}

// ── Tower Recommendation Engine ────────────────────────────────────

export interface LevelRequirements {
  level: number;
  difficulty: Difficulty;
  dpsNeeded: number;
  dpsProvided: number;
  budget: number;
  budgetUsed: number;
  budgetUtilization: number;
  minTowers: TowerComposition[];
  minTowerCount: number;
  coverageNotes: string[];
}

export interface ProgressionPoint {
  level: number;
  difficulty: Difficulty;
  dpsNeeded: number;
  dpsGrowth: number;
  budget: number;
  budgetGrowth: number;
  surplusRatio: number;
  minTowerCount: number;
  requirements: LevelRequirements;
}

/**
 * Recommend minimum viable tower composition for a level.
 * Uses budget-aware selection with enforced diversity:
 * 1. Reserve towers for threat coverage (flying, stealth, healers)
 * 2. Add a Frost tower for slow utility on levels 3+
 * 3. Fill DPS budget across diverse tower types (max 40% per type)
 * 4. Early levels use Lv1 towers; later levels upgrade core towers
 */
export function recommendTowers(
  config: LevelConfig,
  difficulty: Difficulty = Difficulty.Normal
): LevelRequirements {
  const level = analyzeLevel(config, difficulty);
  const via = assessViability(config, difficulty);
  const budget = via.estimatedBudget;
  const dpsNeeded = via.peakWaveDPSRequired;

  // Practical multiplier: not all towers cover all path segments
  const practicalDPSTarget = dpsNeeded * 2.0;

  const composition: Map<string, TowerComposition> = new Map();
  const typeCount: Map<TowerType, number> = new Map();
  let remaining = budget;
  let totalDPS = 0;
  let totalTowers = 0;

  const addTower = (type: TowerType, lvl: number): boolean => {
    const levels = TOWER_LEVELS[type];
    const cost = calcTotalCost(levels, lvl);
    if (cost > remaining) return false;
    const key = `${type}_${lvl}`;
    const existing = composition.get(key);
    if (existing) {
      existing.count++;
    } else {
      composition.set(key, { type, count: 1, level: lvl });
    }
    remaining -= cost;
    totalDPS += calcEffectiveDPS(levels[lvl], 2);
    totalTowers++;
    typeCount.set(type, (typeCount.get(type) ?? 0) + 1);
    return true;
  };

  // Max towers of a single type: 40% of composition or at least 2
  const maxOfType = (type: TowerType): boolean => {
    const count = typeCount.get(type) ?? 0;
    return totalTowers > 4 && count >= Math.max(2, Math.ceil(totalTowers * 0.4));
  };

  const coverageNotes: string[] = [];

  // 1. Threat coverage
  const hasFlying = level.waves.some((w) => w.hasFlying);
  const hasStealth = level.waves.some((w) => w.hasStealth);
  const hasHealer = level.waves.some((w) => w.hasHealer);
  const hasTanks = level.waves.some((w) =>
    w.entries.some((e) => e.hp >= 500)
  );

  if (hasFlying) {
    addTower(TowerType.Lightning, 0);
    coverageNotes.push("Lightning for anti-air chain coverage");
  }

  if (hasStealth) {
    addTower(TowerType.Arrow, 0);
    coverageNotes.push("Arrow near path for stealth reveal");
  }

  if (hasHealer) {
    addTower(TowerType.Sniper, 0);
    coverageNotes.push("Sniper to burst healers from range");
  }

  if (hasTanks && config.level >= 4) {
    addTower(TowerType.Poison, 0);
    coverageNotes.push("Poison for sustained DPS vs tanks");
  }

  // 2. Utility: Frost for slow on levels 3+
  if (config.level >= 3) {
    addTower(TowerType.Frost, 0);
    coverageNotes.push("Frost for slow utility");
  }

  // 3. Determine target upgrade tier based on level
  // Early levels: Lv1 towers. Mid: mix of Lv1-2. Late: Lv2-3.
  const preferredTier = config.level <= 3 ? 0 : config.level <= 6 ? 1 : 2;

  // 4. Build ranked tower options with diversity-aware selection
  const dpsOptions: { type: TowerType; level: number; cost: number; dps: number; dpsPerGold: number }[] = [];
  for (const type of Object.values(TowerType)) {
    const levels = TOWER_LEVELS[type];
    for (let lvl = 0; lvl < levels.length; lvl++) {
      const cost = calcTotalCost(levels, lvl);
      const dps = calcEffectiveDPS(levels[lvl], 2);
      dpsOptions.push({ type, level: lvl, dpsPerGold: dps / cost, cost, dps });
    }
  }
  dpsOptions.sort((a, b) => b.dpsPerGold - a.dpsPerGold);

  // Fill until target DPS met or budget exhausted
  let attempts = 0;
  while (totalDPS < practicalDPSTarget && remaining > 0 && attempts < 500) {
    const option = dpsOptions.find(
      (o) => o.cost <= remaining && !maxOfType(o.type)
    );
    if (!option) {
      // If diversity limit blocks us, fall back to any affordable option
      const fallback = dpsOptions.find((o) => o.cost <= remaining);
      if (!fallback) break;
      addTower(fallback.type, fallback.level);
    } else {
      addTower(option.type, option.level);
    }
    attempts++;
  }

  const towers = Array.from(composition.values());
  const totalCount = towers.reduce((s, t) => s + t.count, 0);
  const budgetUsed = budget - remaining;

  return {
    level: config.level,
    difficulty,
    dpsNeeded,
    dpsProvided: Math.round(totalDPS),
    budget,
    budgetUsed,
    budgetUtilization: Math.round((budgetUsed / budget) * 100) / 100,
    minTowers: towers,
    minTowerCount: totalCount,
    coverageNotes,
  };
}

/**
 * Calculate the full progression curve across all levels.
 * Shows how DPS requirements and budgets scale, identifying
 * where the difficulty spikes or dips.
 */
export function calcProgressionCurve(
  configs: LevelConfig[],
  difficulty: Difficulty = Difficulty.Normal
): ProgressionPoint[] {
  const points: ProgressionPoint[] = [];
  let prevDPS = 0;
  let prevBudget = 0;

  for (const config of configs) {
    const via = assessViability(config, difficulty);
    const req = recommendTowers(config, difficulty);
    const dpsNeeded = via.peakWaveDPSRequired;

    points.push({
      level: config.level,
      difficulty,
      dpsNeeded,
      dpsGrowth: prevDPS > 0 ? Math.round((dpsNeeded / prevDPS) * 100) / 100 : 1,
      budget: via.estimatedBudget,
      budgetGrowth: prevBudget > 0 ? Math.round((via.estimatedBudget / prevBudget) * 100) / 100 : 1,
      surplusRatio: via.goldSurplusRatio,
      minTowerCount: req.minTowerCount,
      requirements: req,
    });

    prevDPS = dpsNeeded;
    prevBudget = via.estimatedBudget;
  }

  return points;
}

// ── Summary Utilities ──────────────────────────────────────────────

/** Quick summary string for a tower at a given level. */
export function towerSummary(type: TowerType, level: number = 0, avgTargets: number = 1): string {
  const t = analyzeTowerDPS(type, level, avgTargets);
  const abilities = t.abilities.length > 0 ? ` [${t.abilities.join(", ")}]` : "";
  return `${t.name} Lv${level + 1}: ${t.rawDPS.toFixed(1)} raw / ${t.effectiveDPS.toFixed(1)} eff DPS, ${t.totalCost}g (${t.dpsPerGold.toFixed(2)}/g)${abilities}`;
}

/** Quick summary of level viability. */
export function levelSummary(
  config: LevelConfig,
  difficulty: Difficulty = Difficulty.Normal
): string {
  const level = analyzeLevel(config, difficulty);
  const via = assessViability(config, difficulty);
  const lines = [
    `Level ${config.level} "${config.name}" [${difficulty}]`,
    `  Waves: ${level.totalWaves} | Enemies: ${level.totalEnemies} | Total HP: ${level.totalHP.toLocaleString()}`,
    `  Gold: ${level.startingGold} start + ${level.totalReward} kills = ${level.estimatedBudget} budget`,
    `  Lives: ${level.startingLives} | Path: ${config.minPathLength} cells`,
    `  Peak wave HP: ${via.peakWaveHP.toLocaleString()} | DPS needed: ${via.peakWaveDPSRequired}`,
    `  Max affordable DPS: ${via.maxAffordableDPS} | Surplus ratio: ${via.goldSurplusRatio}x`,
    `  Viability: ${via.score}/100`,
  ];
  if (via.bottlenecks.length > 0) {
    lines.push(`  Bottlenecks: ${via.bottlenecks.join(", ")}`);
  }
  return lines.join("\n");
}

/** Format recommended towers as readable string. */
export function requirementsSummary(req: LevelRequirements): string {
  const lines = [
    `Level ${req.level} [${req.difficulty}] — ${req.minTowerCount} towers needed`,
    `  DPS: ${req.dpsNeeded} needed → ${req.dpsProvided} provided`,
    `  Gold: ${req.budgetUsed}/${req.budget} used (${Math.round(req.budgetUtilization * 100)}%)`,
    `  Towers:`,
  ];
  for (const t of req.minTowers) {
    const dps = analyzeTowerDPS(t.type, t.level, 2);
    lines.push(`    ${t.count}× ${dps.name} Lv${t.level + 1} (${dps.effectiveDPS.toFixed(0)} DPS each, ${dps.totalCost}g each)`);
  }
  if (req.coverageNotes.length > 0) {
    lines.push(`  Notes: ${req.coverageNotes.join("; ")}`);
  }
  return lines.join("\n");
}
