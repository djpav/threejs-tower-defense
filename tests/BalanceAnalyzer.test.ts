import { describe, it, expect } from "vitest";
import { TowerType, Difficulty } from "@/types";
import { LEVEL_CONFIGS } from "@/configs/LevelConfigs";
import {
  ARROW_TOWER_LEVELS,
  CANNON_TOWER_LEVELS,
  FROST_TOWER_LEVELS,
  LIGHTNING_TOWER_LEVELS,
  POISON_TOWER_LEVELS,
  SNIPER_TOWER_LEVELS,
  TESLA_TOWER_LEVELS,
} from "@/configs/GameBalanceConfigs";
import { calcHPScale, calcRewardScale } from "@/configs/WaveGenerator";
import {
  calcRawDPS,
  calcEffectiveDPS,
  calcTotalCost,
  analyzeTowerDPS,
  analyzeAllTowers,
  analyzeWave,
  analyzeLevel,
  assessViability,
  analyzeComposition,
  estimateMaxDPS,
  recommendTowers,
  calcProgressionCurve,
  towerSummary,
  levelSummary,
  requirementsSummary,
} from "@/utils/BalanceAnalyzer";

// ── Scaling Functions ──────────────────────────────────────────────

describe("calcHPScale", () => {
  it("returns 1.0 for level 1", () => {
    expect(calcHPScale(1)).toBe(1);
  });

  it("grows exponentially (1.25^(level-1))", () => {
    expect(calcHPScale(2)).toBeCloseTo(1.25);
    expect(calcHPScale(5)).toBeCloseTo(Math.pow(1.25, 4));
    expect(calcHPScale(10)).toBeCloseTo(Math.pow(1.25, 9));
  });

  it("later levels have significantly more HP", () => {
    expect(calcHPScale(10)).toBeGreaterThan(7);
  });
});

describe("calcRewardScale", () => {
  it("returns 1.0 for level 1", () => {
    expect(calcRewardScale(1)).toBe(1);
  });

  it("decreases for later levels", () => {
    expect(calcRewardScale(5)).toBeLessThan(calcRewardScale(3));
    expect(calcRewardScale(10)).toBeLessThan(calcRewardScale(5));
  });

  it("never goes below 0.3", () => {
    expect(calcRewardScale(10)).toBeGreaterThan(0.3);
  });
});

// ── Raw DPS ────────────────────────────────────────────────────────

describe("calcRawDPS", () => {
  it("computes damage × fireRate", () => {
    expect(calcRawDPS(ARROW_TOWER_LEVELS[0])).toBe(25); // 25 * 1.0
    expect(calcRawDPS(ARROW_TOWER_LEVELS[2])).toBe(80); // 50 * 1.6
    expect(calcRawDPS(SNIPER_TOWER_LEVELS[0])).toBe(30); // 100 * 0.3
  });

  it("handles fractional fire rates", () => {
    expect(calcRawDPS(CANNON_TOWER_LEVELS[0])).toBe(30); // 60 * 0.5
    expect(calcRawDPS(CANNON_TOWER_LEVELS[1])).toBeCloseTo(54); // 90 * 0.6
  });
});

// ── Effective DPS ──────────────────────────────────────────────────

describe("calcEffectiveDPS", () => {
  it("returns raw DPS for towers with no special abilities", () => {
    expect(calcEffectiveDPS(ARROW_TOWER_LEVELS[0])).toBe(25);
    expect(calcEffectiveDPS(SNIPER_TOWER_LEVELS[0])).toBe(30);
  });

  it("includes chain lightning bounces", () => {
    const config = LIGHTNING_TOWER_LEVELS[0]; // 30 dmg, 0.8 rate, chain 2, falloff 0.7
    const raw = 30 * 0.8; // = 24
    const expected = raw + raw * 0.7 + raw * 0.7 * 0.7;
    expect(calcEffectiveDPS(config)).toBeCloseTo(expected, 1);
  });

  it("scales chain DPS with more bounces at higher levels", () => {
    const lv1 = calcEffectiveDPS(LIGHTNING_TOWER_LEVELS[0]);
    const lv3 = calcEffectiveDPS(LIGHTNING_TOWER_LEVELS[2]);
    expect(lv3).toBeGreaterThan(lv1 * 3);
  });

  it("includes poison DOT stacks", () => {
    const config = POISON_TOWER_LEVELS[0]; // 10 dmg, 0.9 rate, poison 5/0.5 × 3
    const raw = 10 * 0.9; // = 9
    const dot = (5 / 0.5) * 3; // = 30
    expect(calcEffectiveDPS(config)).toBeCloseTo(raw + dot, 1);
  });

  it("scales Tesla pulse with avgTargets", () => {
    const config = TESLA_TOWER_LEVELS[0]; // 22 dmg, 0.8 rate
    const raw = 22 * 0.8;
    expect(calcEffectiveDPS(config, 1)).toBeCloseTo(raw);
    expect(calcEffectiveDPS(config, 5)).toBeCloseTo(raw * 5);
  });

  it("scales Cannon splash with avgTargets", () => {
    const config = CANNON_TOWER_LEVELS[0];
    const raw = 60 * 0.5;
    expect(calcEffectiveDPS(config, 3)).toBeCloseTo(raw * 3);
  });
});

// ── Total Cost ─────────────────────────────────────────────────────

describe("calcTotalCost", () => {
  it("returns base cost at level 0", () => {
    expect(calcTotalCost(ARROW_TOWER_LEVELS, 0)).toBe(25);
    expect(calcTotalCost(TESLA_TOWER_LEVELS, 0)).toBe(80);
  });

  it("adds upgrade costs for higher levels", () => {
    expect(calcTotalCost(ARROW_TOWER_LEVELS, 1)).toBe(55);
    expect(calcTotalCost(ARROW_TOWER_LEVELS, 2)).toBe(105);
  });

  it("accumulates all tower types correctly", () => {
    expect(calcTotalCost(CANNON_TOWER_LEVELS, 2)).toBe(190);
    expect(calcTotalCost(SNIPER_TOWER_LEVELS, 2)).toBe(200);
  });
});

// ── Tower Analysis ─────────────────────────────────────────────────

describe("analyzeTowerDPS", () => {
  it("returns correct structure for Arrow Lv1", () => {
    const result = analyzeTowerDPS(TowerType.Arrow, 0);
    expect(result.type).toBe(TowerType.Arrow);
    expect(result.name).toBe("Arrow");
    expect(result.level).toBe(0);
    expect(result.rawDPS).toBe(25);
    expect(result.effectiveDPS).toBe(25);
    expect(result.totalCost).toBe(25);
    expect(result.dpsPerGold).toBe(1);
    expect(result.range).toBe(2.5);
    expect(result.abilities).toEqual([]);
  });

  it("lists abilities for special towers", () => {
    const frost = analyzeTowerDPS(TowerType.Frost, 0);
    expect(frost.abilities.some((a) => a.includes("slow"))).toBe(true);

    const lightning = analyzeTowerDPS(TowerType.Lightning, 0);
    expect(lightning.abilities.some((a) => a.includes("chain"))).toBe(true);

    const cannon = analyzeTowerDPS(TowerType.Cannon, 0);
    expect(cannon.abilities.some((a) => a.includes("splash"))).toBe(true);
    expect(cannon.abilities.some((a) => a.includes("no flying"))).toBe(true);
  });
});

describe("analyzeAllTowers", () => {
  it("returns 21 entries (7 types × 3 levels)", () => {
    const all = analyzeAllTowers();
    expect(all).toHaveLength(21);
  });

  it("DPS increases with level for every tower type", () => {
    const all = analyzeAllTowers();
    for (const type of Object.values(TowerType)) {
      const levels = all.filter((t) => t.type === type);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].effectiveDPS).toBeGreaterThan(levels[i - 1].effectiveDPS);
      }
    }
  });

  it("cost increases with level for every tower type", () => {
    const all = analyzeAllTowers();
    for (const type of Object.values(TowerType)) {
      const levels = all.filter((t) => t.type === type);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].totalCost).toBeGreaterThan(levels[i - 1].totalCost);
      }
    }
  });
});

// ── Wave Analysis ──────────────────────────────────────────────────

describe("analyzeWave", () => {
  it("computes totals for a simple wave", () => {
    const wave = LEVEL_CONFIGS[0].waves[0]; // Level 1, wave 1
    const result = analyzeWave(wave, 0);
    expect(result.waveIndex).toBe(0);
    expect(result.totalEnemies).toBeGreaterThan(0);
    expect(result.totalHP).toBeGreaterThan(0);
    expect(result.totalReward).toBeGreaterThan(0);
  });

  it("applies difficulty modifiers", () => {
    const wave = LEVEL_CONFIGS[0].waves[0];
    const normal = analyzeWave(wave, 0, Difficulty.Normal);
    const hard = analyzeWave(wave, 0, Difficulty.Hard);
    const easy = analyzeWave(wave, 0, Difficulty.Easy);

    expect(hard.totalHP).toBeGreaterThan(normal.totalHP);
    expect(easy.totalHP).toBeLessThan(normal.totalHP);
  });

  it("detects flying enemies in later levels", () => {
    const level7 = LEVEL_CONFIGS[6];
    const lateWave = level7.waves[level7.waves.length - 1];
    const result = analyzeWave(lateWave, level7.waves.length - 1);
    expect(result.hasFlying).toBe(true);
  });

  it("detects splitter children in HP total", () => {
    const level8 = LEVEL_CONFIGS[7];
    const lateWave = level8.waves[level8.waves.length - 1];
    const result = analyzeWave(lateWave, level8.waves.length - 1);
    if (result.hasSplitter) {
      const splitterEntry = result.entries.find((e) => e.traits.includes("splitter"));
      expect(splitterEntry).toBeDefined();
      expect(splitterEntry!.totalHP).toBeGreaterThan(splitterEntry!.count * splitterEntry!.hp);
    }
  });

  it("reward scaling reduces rewards in later levels", () => {
    const wave1 = LEVEL_CONFIGS[0].waves[0]; // Level 1
    const wave10 = LEVEL_CONFIGS[9].waves[0]; // Level 10
    const result1 = analyzeWave(wave1, 0);
    const result10 = analyzeWave(wave10, 0);
    // Level 10 enemies have more HP but less reward per enemy
    const rewardPerEnemy1 = result1.totalReward / result1.totalEnemies;
    const rewardPerEnemy10 = result10.totalReward / result10.totalEnemies;
    expect(rewardPerEnemy10).toBeLessThan(rewardPerEnemy1);
  });
});

// ── Level Analysis ─────────────────────────────────────────────────

describe("analyzeLevel", () => {
  it("computes level 1 breakdown", () => {
    const result = analyzeLevel(LEVEL_CONFIGS[0]);
    expect(result.level).toBe(1);
    expect(result.name).toBe("Forest Clearing");
    expect(result.startingGold).toBe(100);
    expect(result.startingLives).toBe(20);
    expect(result.totalWaves).toBe(5);
    expect(result.totalHP).toBeGreaterThan(0);
    expect(result.totalReward).toBeGreaterThan(0);
    expect(result.estimatedBudget).toBe(result.startingGold + result.totalReward);
  });

  it("scales gold and lives with difficulty", () => {
    const normal = analyzeLevel(LEVEL_CONFIGS[0], Difficulty.Normal);
    const hard = analyzeLevel(LEVEL_CONFIGS[0], Difficulty.Hard);

    expect(hard.startingGold).toBeLessThan(normal.startingGold);
    expect(hard.startingLives).toBeLessThan(normal.startingLives);
    expect(hard.totalHP).toBeGreaterThan(normal.totalHP);
  });

  it("wave count matches formula (3 + level × 2)", () => {
    for (const config of LEVEL_CONFIGS) {
      const result = analyzeLevel(config);
      expect(result.totalWaves).toBe(3 + config.level * 2);
    }
  });

  it("later levels have more total HP", () => {
    const level1 = analyzeLevel(LEVEL_CONFIGS[0]);
    const level5 = analyzeLevel(LEVEL_CONFIGS[4]);
    const level10 = analyzeLevel(LEVEL_CONFIGS[9]);

    expect(level5.totalHP).toBeGreaterThan(level1.totalHP);
    expect(level10.totalHP).toBeGreaterThan(level5.totalHP);
  });

  it("starting gold decreases monotonically", () => {
    for (let i = 1; i < LEVEL_CONFIGS.length; i++) {
      expect(LEVEL_CONFIGS[i].startingGold).toBeLessThanOrEqual(
        LEVEL_CONFIGS[i - 1].startingGold
      );
    }
  });

  it("starting lives decrease monotonically", () => {
    for (let i = 1; i < LEVEL_CONFIGS.length; i++) {
      expect(LEVEL_CONFIGS[i].startingLives).toBeLessThanOrEqual(
        LEVEL_CONFIGS[i - 1].startingLives
      );
    }
  });
});

// ── Viability Assessment ───────────────────────────────────────────

describe("assessViability", () => {
  it("level 1 is highly viable (easy level)", () => {
    const result = assessViability(LEVEL_CONFIGS[0]);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.goldSurplusRatio).toBeGreaterThan(1);
    expect(result.flyingThreat).toBe(false);
    expect(result.stealthThreat).toBe(false);
  });

  it("later levels have lower viability scores", () => {
    const level1 = assessViability(LEVEL_CONFIGS[0]);
    const level10 = assessViability(LEVEL_CONFIGS[9]);
    expect(level10.score).toBeLessThanOrEqual(level1.score);
  });

  it("hard difficulty reduces viability", () => {
    const normal = assessViability(LEVEL_CONFIGS[4], Difficulty.Normal);
    const hard = assessViability(LEVEL_CONFIGS[4], Difficulty.Hard);
    expect(hard.score).toBeLessThanOrEqual(normal.score);
    expect(hard.goldSurplusRatio).toBeLessThan(normal.goldSurplusRatio);
  });

  it("identifies flying threat on levels 7+", () => {
    const result = assessViability(LEVEL_CONFIGS[6]);
    expect(result.flyingThreat).toBe(true);
  });

  it("identifies stealth threat on levels 9+", () => {
    const result = assessViability(LEVEL_CONFIGS[8]);
    expect(result.stealthThreat).toBe(true);
  });

  it("identifies healer threat on levels 8+", () => {
    const result = assessViability(LEVEL_CONFIGS[7]);
    expect(result.healerThreat).toBe(true);
  });

  it("returns bottlenecks as non-empty array for hard levels", () => {
    const result = assessViability(LEVEL_CONFIGS[9], Difficulty.Hard);
    expect(result.bottlenecks.length).toBeGreaterThan(0);
  });

  it("score is always between 0 and 100", () => {
    for (const config of LEVEL_CONFIGS) {
      for (const diff of [Difficulty.Easy, Difficulty.Normal, Difficulty.Hard]) {
        const result = assessViability(config, diff);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("Normal surplus ratio trends downward across levels", () => {
    const surpluses = LEVEL_CONFIGS.map(
      (c) => assessViability(c, Difficulty.Normal).goldSurplusRatio
    );
    // First half should generally have higher surplus than second half
    const firstHalfAvg = surpluses.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
    const secondHalfAvg = surpluses.slice(5).reduce((s, v) => s + v, 0) / 5;
    expect(firstHalfAvg).toBeGreaterThan(secondHalfAvg);
  });
});

// ── estimateMaxDPS ─────────────────────────────────────────────────

describe("estimateMaxDPS", () => {
  it("returns 0 for zero budget", () => {
    expect(estimateMaxDPS(0)).toBe(0);
  });

  it("returns positive DPS for any reasonable budget", () => {
    expect(estimateMaxDPS(25)).toBeGreaterThan(0);
    expect(estimateMaxDPS(100)).toBeGreaterThan(0);
    expect(estimateMaxDPS(1000)).toBeGreaterThan(0);
  });

  it("more budget means more DPS", () => {
    const low = estimateMaxDPS(100);
    const mid = estimateMaxDPS(500);
    const high = estimateMaxDPS(2000);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it("cannot buy anything with budget below cheapest tower", () => {
    expect(estimateMaxDPS(10)).toBe(0);
  });
});

// ── Composition Analysis ───────────────────────────────────────────

describe("analyzeComposition", () => {
  it("calculates cost and DPS for a basic composition", () => {
    const result = analyzeComposition(
      [{ type: TowerType.Arrow, count: 4, level: 0 }],
      LEVEL_CONFIGS[0]
    );
    expect(result.totalCost).toBe(100);
    expect(result.totalDPS).toBeGreaterThan(0);
    expect(result.canHandleFlying).toBe(true); // Level 1 has no flying
  });

  it("flags inability to handle flying when only cannons used", () => {
    const result = analyzeComposition(
      [{ type: TowerType.Cannon, count: 5, level: 0 }],
      LEVEL_CONFIGS[6] // Level 7 has flying
    );
    expect(result.canHandleFlying).toBe(false);
  });

  it("handles mixed compositions", () => {
    const result = analyzeComposition(
      [
        { type: TowerType.Arrow, count: 3, level: 2 },
        { type: TowerType.Frost, count: 2, level: 1 },
        { type: TowerType.Lightning, count: 2, level: 2 },
      ],
      LEVEL_CONFIGS[4]
    );
    expect(result.totalCost).toBe(3 * 105 + 2 * 75 + 2 * 175);
    expect(result.totalDPS).toBeGreaterThan(0);
    expect(result.canHandleFlying).toBe(true);
  });
});

// ── Tower Recommendations ──────────────────────────────────────────

describe("recommendTowers", () => {
  it("recommends towers within budget", () => {
    for (const config of LEVEL_CONFIGS) {
      const req = recommendTowers(config);
      expect(req.budgetUsed).toBeLessThanOrEqual(req.budget);
    }
  });

  it("provides enough DPS to meet the requirement", () => {
    for (const config of LEVEL_CONFIGS.slice(0, 8)) {
      const req = recommendTowers(config);
      // Should provide at least 1x the raw DPS needed
      expect(req.dpsProvided).toBeGreaterThanOrEqual(req.dpsNeeded);
    }
  });

  it("includes flying coverage for levels 7+", () => {
    const req = recommendTowers(LEVEL_CONFIGS[6]); // Level 7
    const hasAntiAir = req.minTowers.some(
      (t) => t.type !== TowerType.Cannon
    );
    expect(hasAntiAir).toBe(true);
    expect(req.coverageNotes.some((n) => n.includes("anti-air"))).toBe(true);
  });

  it("includes stealth coverage for levels 9+", () => {
    const req = recommendTowers(LEVEL_CONFIGS[8]); // Level 9
    expect(req.coverageNotes.some((n) => n.includes("stealth"))).toBe(true);
  });

  it("includes healer counter for levels 8+", () => {
    const req = recommendTowers(LEVEL_CONFIGS[7]); // Level 8
    expect(req.coverageNotes.some((n) => n.includes("healer"))).toBe(true);
  });

  it("includes Frost utility for levels 3+", () => {
    const req = recommendTowers(LEVEL_CONFIGS[2]); // Level 3
    const hasFrost = req.minTowers.some((t) => t.type === TowerType.Frost);
    expect(hasFrost).toBe(true);
  });

  it("recommends more towers for harder levels", () => {
    const early = recommendTowers(LEVEL_CONFIGS[0]);
    const late = recommendTowers(LEVEL_CONFIGS[9]);
    expect(late.minTowerCount).toBeGreaterThan(early.minTowerCount);
  });

  it("uses diverse tower types for later levels", () => {
    const req = recommendTowers(LEVEL_CONFIGS[9]); // Level 10
    const uniqueTypes = new Set(req.minTowers.map((t) => t.type));
    expect(uniqueTypes.size).toBeGreaterThanOrEqual(3);
  });
});

// ── Progression Curve ──────────────────────────────────────────────

describe("calcProgressionCurve", () => {
  it("returns 10 points for 10 levels", () => {
    const curve = calcProgressionCurve(LEVEL_CONFIGS);
    expect(curve).toHaveLength(10);
  });

  it("DPS needed increases each level", () => {
    const curve = calcProgressionCurve(LEVEL_CONFIGS);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].dpsNeeded).toBeGreaterThan(curve[i - 1].dpsNeeded);
    }
  });

  it("budget increases each level", () => {
    const curve = calcProgressionCurve(LEVEL_CONFIGS);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].budget).toBeGreaterThan(curve[i - 1].budget);
    }
  });

  it("min tower count increases across levels", () => {
    const curve = calcProgressionCurve(LEVEL_CONFIGS);
    expect(curve[9].minTowerCount).toBeGreaterThan(curve[0].minTowerCount);
  });

  it("DPS growth rate is between 1.0 and 2.5 per level", () => {
    const curve = calcProgressionCurve(LEVEL_CONFIGS);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].dpsGrowth).toBeGreaterThanOrEqual(1.0);
      expect(curve[i].dpsGrowth).toBeLessThanOrEqual(2.5);
    }
  });

  it("surplus ratio stays in playable range on Normal", () => {
    const curve = calcProgressionCurve(LEVEL_CONFIGS, Difficulty.Normal);
    for (const p of curve) {
      expect(p.surplusRatio).toBeGreaterThan(1.0);  // Always beatable
      expect(p.surplusRatio).toBeLessThan(10);       // Not trivially easy
    }
  });
});

// ── Summary Utilities ──────────────────────────────────────────────

describe("towerSummary", () => {
  it("returns a readable string", () => {
    const s = towerSummary(TowerType.Arrow, 0);
    expect(s).toContain("Arrow");
    expect(s).toContain("Lv1");
    expect(s).toContain("DPS");
    expect(s).toContain("25g");
  });
});

describe("levelSummary", () => {
  it("returns a multi-line readable summary", () => {
    const s = levelSummary(LEVEL_CONFIGS[0]);
    expect(s).toContain("Level 1");
    expect(s).toContain("Forest Clearing");
    expect(s).toContain("Waves:");
    expect(s).toContain("Viability:");
  });

  it("includes difficulty in summary", () => {
    const s = levelSummary(LEVEL_CONFIGS[0], Difficulty.Hard);
    expect(s).toContain("hard");
  });
});

describe("requirementsSummary", () => {
  it("returns a readable string with tower details", () => {
    const req = recommendTowers(LEVEL_CONFIGS[0]);
    const s = requirementsSummary(req);
    expect(s).toContain("Level 1");
    expect(s).toContain("towers needed");
    expect(s).toContain("DPS");
    expect(s).toContain("Gold:");
  });
});
