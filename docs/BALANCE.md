# Balance Analysis & Normalization

Complete documentation of the mathematical framework used to analyze, normalize, and tune tower defense game balance.

## Table of Contents

- [Core Formulas](#core-formulas)
- [Tower DPS Calculations](#tower-dps-calculations)
- [Wave & Level Scaling](#wave--level-scaling)
- [Economy Model](#economy-model)
- [Difficulty Modifiers](#difficulty-modifiers)
- [Viability Scoring](#viability-scoring)
- [Normalization Process](#normalization-process)
- [Final Balance Numbers](#final-balance-numbers)
- [How to Use the Tools](#how-to-use-the-tools)

---

## Core Formulas

### Tower Raw DPS

```
rawDPS = damage × fireRate
```

Where `fireRate` is shots per second. This is the base single-target damage output.

### Tower Effective DPS

Accounts for special abilities that multiply total damage output:

**Standard towers (Arrow, Sniper):**
```
effectiveDPS = rawDPS
```

**Chain Lightning:**
```
effectiveDPS = rawDPS × Σ(falloff^i) for i = 0..chainCount
             = rawDPS × (1 + falloff + falloff² + ... + falloff^chainCount)
```

Example — Lightning Lv3: `78 × (1 + 0.8 + 0.64 + 0.512 + 0.41) = 262 DPS`

**Poison (fully stacked on single target):**
```
effectiveDPS = rawDPS + (poisonDamage / poisonTickRate) × poisonMaxStacks
```

Example — Poison Lv3: `28.6 + (12 / 0.5) × 5 = 148.6 DPS`

**AoE towers (Tesla pulse, Cannon splash):**
```
effectiveDPS = rawDPS × avgTargetsInRange
```

These scale multiplicatively with enemy density.

**Frost (utility, not DPS):**
```
effectiveDPS = rawDPS  (low)
utilityValue = slowFactor × slowDuration  (force multiplier for other towers)
```

### Cost Efficiency

```
totalCost = baseCost + Σ(upgradeCost[i]) for i = 0..targetLevel-1
dpsPerGold = effectiveDPS / totalCost
```

This determines whether buying a new tower or upgrading an existing one is more gold-efficient.

---

## Tower DPS Calculations

### Full Tower Table (avgTargets = 2)

| Tower | Lv | Raw DPS | Eff DPS | Cost | DPS/Gold | Range | Special |
|-------|----|---------|---------|------|----------|-------|---------|
| Arrow | 1 | 25.0 | 25.0 | 25 | 1.000 | 2.5 | — |
| Arrow | 2 | 45.5 | 45.5 | 55 | 0.827 | 2.8 | — |
| Arrow | 3 | 80.0 | 80.0 | 105 | 0.762 | 3.2 | — |
| Cannon | 1 | 30.0 | 60.0 | 60 | 1.000 | 2.0 | splash 1.2r, no flying |
| Cannon | 2 | 54.0 | 108.0 | 110 | 0.982 | 2.3 | splash 1.4r, no flying |
| Cannon | 3 | 91.0 | 182.0 | 190 | 0.958 | 2.6 | splash 1.7r, no flying |
| Frost | 1 | 12.0 | 12.0 | 40 | 0.300 | 2.2 | 50% slow 2s |
| Frost | 2 | 21.6 | 21.6 | 75 | 0.288 | 2.5 | 60% slow 2.5s |
| Frost | 3 | 39.2 | 39.2 | 135 | 0.290 | 2.8 | 70% slow 3s |
| Lightning | 1 | 24.0 | 52.6 | 50 | 1.051 | 2.5 | chain 2 @ 70% |
| Lightning | 2 | 45.0 | 123.0 | 95 | 1.295 | 2.8 | chain 3 @ 75% |
| Lightning | 3 | 78.0 | 238.0 | 175 | 1.360 | 3.2 | chain 4 @ 75% |
| Poison | 1 | 9.0 | 39.0 | 45 | 0.867 | 2.2 | 5/tick ×3 stacks |
| Poison | 2 | 16.5 | 80.5 | 85 | 0.947 | 2.5 | 8/tick ×4 stacks |
| Poison | 3 | 28.6 | 172.6 | 150 | 1.151 | 2.8 | 12/tick ×6 stacks |
| Sniper | 1 | 30.0 | 30.0 | 65 | 0.462 | 5.0 | — |
| Sniper | 2 | 59.5 | 59.5 | 120 | 0.496 | 5.5 | — |
| Sniper | 3 | 100.0 | 100.0 | 200 | 0.500 | 6.0 | — |
| Tesla | 1 | 17.6 | 35.2 | 80 | 0.440 | 2.0 | AoE pulse |
| Tesla | 2 | 38.0 | 76.0 | 140 | 0.543 | 2.3 | AoE pulse |
| Tesla | 3 | 72.0 | 144.0 | 230 | 0.626 | 2.7 | AoE pulse |

### DPS/Gold Efficiency Ranking

1. **Lightning Lv3** — 1.360/g (best overall, chain DPS)
2. **Lightning Lv2** — 1.295/g
3. **Poison Lv3** — 1.151/g (best sustained single-target, 6 stacks)
4. **Cannon Lv3** — 1.068/g (best vs ground groups)
5. **Lightning Lv1** — 1.051/g
6. **Arrow Lv1** — 1.000/g (best cheap option)
7. **Cannon Lv1** — 1.000/g (early AoE, can't hit flying)
8. **Cannon Lv2** — 0.982/g

### Key Findings

- **Lightning** is the most gold-efficient tower but no longer dominates — Poison Lv3 and Cannon Lv3 are competitive alternatives, forcing diverse compositions
- **Poison Lv3** is now viable as a core DPS tower (1.151/g) thanks to 6 max stacks — excellent vs tanks and bosses
- **Arrow Lv1** is the best early-game investment (1.0 DPS/g, only 25g)
- **Frost** is a force multiplier, not a DPS tower — its slow effectively increases other towers' DPS by 50-70% by keeping enemies in range longer
- **Sniper** has the worst DPS/gold but covers the longest range (5-6 cells), making it irreplaceable for picking off healers and distant enemies
- **Tesla** scales multiplicatively with density — at 5 targets in range, Lv3 deals 360 effective DPS (1.57 DPS/g), with improved 2.7 range

---

## Wave & Level Scaling

### HP Scaling Formula

```
hpScale(level) = 1.25 ^ (level - 1)
```

| Level | HP Scale | Interpretation |
|-------|----------|----------------|
| 1 | 1.00 | Base HP |
| 2 | 1.25 | +25% |
| 3 | 1.56 | +56% |
| 5 | 2.44 | +144% |
| 7 | 3.81 | +281% |
| 10 | 7.45 | +645% |

Each enemy's HP is: `baseHP × hpScale × (0.8 + waveProgress × 0.5..0.6)`

Where `waveProgress = currentWave / totalWaves` (0.0 to 1.0).

This gives a smooth exponential curve — each level is ~25% harder than the previous, compounding across 10 levels.

**Why exponential, not linear?** A linear HP scale (`1 + (level-1) × 0.4`) produced front-loaded difficulty — early levels ramped too fast (1.0→1.4→1.8) while late levels barely changed (4.2→4.6). Exponential growth gives a consistent percent increase each level.

### Reward Scaling Formula

```
rewardScale(level) = 1 / (1 + (level - 1) × 0.25)
```

| Level | Reward Scale | Basic Reward (base 10g) |
|-------|-------------|------------------------|
| 1 | 1.00 | 10g |
| 2 | 0.80 | 8g |
| 3 | 0.67 | 7g |
| 5 | 0.50 | 5g |
| 7 | 0.40 | 4g |
| 10 | 0.31 | 3g |

**Why scale rewards down?** Without this, total gold income grows cubically with level (more waves × more enemies × constant reward), while tower costs stay fixed. By level 10, players would accumulate 13.5× more DPS than needed. The reward scale keeps the surplus ratio converging toward ~2.0×.

### Enemy Count Caps

```
maxPerEntry(level, isSpecial) =
  isSpecial ? 4 + floor(level × 0.8)   // 4-12 for special types
            : 8 + level                 // 9-18 for basic/fast
```

Caps prevent wave bloat (1800 enemies at L10) while the higher hpScale compensates for fewer units.

### Wave Count Formula

```
waveCount(level) = 3 + level × 2
```

L1 = 5 waves, L5 = 13 waves, L10 = 23 waves.

### Enemy Type Unlock Schedule

| Wave # | Enemies Available | Level Requirement |
|--------|-------------------|-------------------|
| 1+ | Basic | All |
| 3+ | + Fast Runner | All |
| 4+ | + Flying | Level 7+ |
| 4+ | + Stealth | Level 9+ |
| 5+ | + Tank | All |
| 5+ | + Healer | Level 8+ |
| 6+ | + Splitter | Level 8+ |
| 7+ | + Shielded | All |
| Final | + Boss | Level 3+ |

---

## Economy Model

### Starting Resources

Resources decrease with level to increase early-game pressure:

| Level | Starting Gold | Starting Lives |
|-------|--------------|---------------|
| 1 | 100 | 20 |
| 2 | 90 | 18 |
| 3 | 80 | 16 |
| 4 | 75 | 15 |
| 5 | 65 | 13 |
| 6 | 60 | 11 |
| 7 | 55 | 10 |
| 8 | 50 | 8 |
| 9 | 45 | 6 |
| 10 | 40 | 5 |

### Gold Budget Formula

```
estimatedBudget = startingGold + totalReward × killRate
```

Where `killRate = 0.85` (conservative estimate — some enemies leak through).

### Budget vs DPS Relationship

The **Gold Surplus Ratio** is the key balance metric:

```
surplusRatio = maxAffordableDPS / peakWaveDPSRequired
```

Where:
- `maxAffordableDPS` = greedy estimate of total DPS purchasable with the full budget
- `peakWaveDPSRequired` = HP of the hardest wave ÷ estimated clear window

**Target surplus ratios:**

| Difficulty | L1 | L5 | L10 | Design Intent |
|-----------|-----|-----|------|---------------|
| Easy | ~6.5× | ~3.5× | ~3.1× | Comfortable, forgiving |
| Normal | ~3.9× | ~2.0× | ~1.8× | Challenging, requires strategy |
| Hard | ~2.4× | ~1.2× | ~1.1× | Beatable only with optimal tower combos |

---

## Difficulty Modifiers

Applied multiplicatively to base values:

| Modifier | Easy | Normal | Hard |
|----------|------|--------|------|
| Enemy HP | ×0.75 | ×1.0 | ×1.3 |
| Enemy Speed | ×0.9 | ×1.0 | ×1.1 |
| Gold Income | ×1.2 | ×1.0 | ×0.85 |
| Lives | ×1.4 | ×1.0 | ×0.6 |

**Hard mode impact:** Enemies have 30% more HP AND you earn 15% less gold. Combined effect: you need ~30% more DPS but can afford ~15% less. Hard is beatable on all levels but only with optimal tower compositions — surplus ratios range from 1.11× (L10) to 2.43× (L1).

---

## Viability Scoring

The viability score (0-100) estimates how feasible a level is:

### DPS Requirement Estimation

```
avgSpeed = mean(all enemy speeds across all waves × difficultySpeedMult)
avgTimeOnPath = pathLength / avgSpeed
peakSpawnDuration = max(entries.count × 0.8) across peak wave entries
peakClearWindow = avgTimeOnPath + peakSpawnDuration
peakWaveDPSRequired = peakWave.totalHP / peakClearWindow
```

### Score Calculation

```
score = 50  (base)

// DPS adequacy (±30 points)
if surplus ≥ 3.0:  score += 30
if surplus ≥ 2.0:  score += 20
if surplus ≥ 1.5:  score += 10
if surplus < 1.0:  score -= 20

// Lives buffer (±15 points)
if lives ≥ 20:     score += 10
if lives ≥ 15:     score += 5
if lives ≤ 5:      score -= 15
if lives ≤ 10:     score -= 5

// Threat complexity (-5 each)
if hasFlying:       score -= 5
if hasStealth:      score -= 5
if hasHealer:       score -= 5

score = clamp(0, 100, score)
```

---

## Normalization Process

### Problem Statement (Before)

The original balance had three critical issues:

1. **Diverging surplus:** Gold surplus grew from 4.85× (L1) to 13.5× (L10) on Normal — later levels were *economically easier* despite being designed as harder
2. **Linear HP scale:** `hpScale = 1 + (level-1) × 0.4` caused front-loaded difficulty with diminishing returns
3. **Uncapped economy:** Enemy counts exploded (58 at L1, 1785 at L10) with constant rewards, creating cubic gold growth vs linear tower costs

| Level | Old Surplus (Normal) | Old Surplus (Hard) |
|-------|---------------------|-------------------|
| 1 | 4.85× | 2.32× |
| 5 | 5.59× | 1.39× |
| 10 | 13.50× | 6.64× |

### Solution: Three Normalization Levers

**1. Exponential HP Scale** — replaced `1 + (L-1) × 0.4` with `1.25^(L-1)`
- Gives consistent 25% HP increase per level
- L10 enemies now 7.45× base (was 4.6×)

**2. Inverse Reward Scale** — added `1 / (1 + (L-1) × 0.25)`
- L10 enemies give 31% of base reward (was 100%)
- Prevents gold accumulation from outpacing tower costs

**3. Enemy Count Caps** — hard limits per wave entry
- Reduces screen clutter and gold overflow
- Compensated by higher per-enemy HP

**4. Normalized Starting Resources** — monotonically decreasing gold and lives
- Old: L7-L10 had MORE starting gold than L5-L6 (100→120g)
- New: Smooth 100g→40g curve across 10 levels

**5. Rebalanced Hard Mode** — beatable but demanding
- Enemy HP: ×1.3 (enough to strain economy without being impossible)
- Enemy speed: ×1.1 (slightly faster, punishes poor placement)
- Gold income: ×0.85 (tight budget forces optimal tower selection)
- Lives: ×0.6 (few mistakes allowed on late levels)

### Results (After)

| Level | New Surplus (Normal) | New Surplus (Hard) |
|-------|---------------------|-------------------|
| 1 | 3.91× | 2.43× |
| 5 | 2.02× | 1.23× |
| 10 | 1.81× | 1.11× |

Normal surplus converges from 3.9× to 1.8× — steadily increasing difficulty.
Hard surplus converges from 2.4× to 1.1× — beatable with optimal tower compositions, zero margin for error on late levels.

---

## Final Balance Numbers

### Progression Curve (Normal)

| Level | DPS Needed | Growth | Budget | Surplus | Min Towers |
|-------|-----------|--------|--------|---------|------------|
| 1 | 189 | — | 559 | 3.91× | 2 |
| 2 | 324 | 1.71× | 799 | 3.31× | 3 |
| 3 | 637 | 1.97× | 1,218 | 2.52× | 7 |
| 4 | 887 | 1.39× | 1,581 | 2.42× | 12 |
| 5 | 1,217 | 1.37× | 1,842 | 2.02× | 14 |
| 6 | 1,417 | 1.16× | 2,063 | 1.95× | 15 |
| 7 | 1,956 | 1.38× | 2,693 | 1.85× | 19 |
| 8 | 2,937 | 1.50× | 4,528 | 2.09× | 33 |
| 9 | 3,854 | 1.31× | 5,760 | 2.02× | 39 |
| 10 | 4,770 | 1.24× | 6,370 | 1.81× | 43 |

### Level Viability Summary (all difficulties)

| Level | Easy | Normal | Hard |
|-------|------|--------|------|
| 1 | 90 (6.57×) | 90 (3.91×) | 70 (2.43×) |
| 2 | 90 (5.69×) | 85 (3.31×) | 70 (2.01×) |
| 3 | 90 (4.27×) | 75 (2.52×) | 55 (1.57×) |
| 4 | 90 (4.03×) | 75 (2.42×) | 45 (1.44×) |
| 5 | 85 (3.49×) | 70 (2.02×) | 45 (1.23×) |
| 6 | 85 (3.38×) | 60 (1.95×) | 45 (1.14×) |
| 7 | 75 (3.27×) | 50 (1.85×) | 40 (1.13×) |
| 8 | 70 (3.60×) | 55 (2.09×) | 25 (1.25×) |
| 9 | 60 (3.53×) | 50 (2.02×) | 20 (1.26×) |
| 10 | 60 (3.10×) | 30 (1.81×) | 20 (1.11×) |

Score is 0-100 viability. Surplus ratio (in parentheses) = max affordable DPS ÷ required DPS. All Hard levels are now above 1.0× — beatable with optimal tower compositions.

### Hard Mode: Required Tower Combinations Per Level

Hard surplus ratios are 1.1-1.6× meaning zero margin for error. Each level requires a specific tower mix based on its threat profile:

| Level | Surplus | Required Combo | Strategy |
|-------|---------|---------------|----------|
| 1-2 | 2.0-2.4× | Lightning + Arrow | Chain DPS carries, some room for mistakes |
| 3 | 1.57× | Lightning + Poison + Frost | Frost slow extends kill time, Poison for tanks |
| 4 | 1.44× | Lightning + Poison + Cannon + Frost | Cannon AoE for swarms, Poison stacks on tanks |
| 5 | 1.23× | Lightning + Poison + Cannon | Pure DPS efficiency, every gold piece counts |
| 6 | 1.14× | Lightning + Poison + Cannon (split paths) | Multi-path: must divide towers across both paths |
| 7 | 1.13× | Lightning + Poison (no Cannon!) | Flying enemies — Cannon useless, chain + DOT only |
| 8 | 1.25× | Lightning + Poison + Sniper + Tesla | Sniper bursts healers, Tesla handles splitter swarms |
| 9 | 1.26× | Lightning + Poison + Arrow + Sniper | Arrow near path reveals stealth, full threat coverage |
| 10 | 1.11× | All tower types | Every tower type needed, perfect economy, no mistakes |

### Balance Changes Applied

**Hard difficulty (rebalanced):**
- Enemy HP: ×1.6 → ×1.3 (beatable but demanding)
- Enemy speed: ×1.2 → ×1.1 (less punishing leaks)
- Gold income: ×0.75 → ×0.85 (viable economy)
- Lives: ×0.5 → ×0.6 (slightly more forgiving)

**Tower rebalancing (diversity enforced):**
- **Lightning Lv3 nerfed:** chain falloff 0.80→0.75, cost 165→175g (DPS/gold 1.589→1.360)
- **Poison Lv3 buffed:** max stacks 5→6 (DPS/gold 0.991→1.151, now a core DPS tower)
- **Cannon Lv3 buffed:** damage 130→145 (DPS/gold 0.958→1.068)
- **Tesla buffed:** damage +10%, range +0.2-0.3 per level (viable AoE alternative)
- **Sniper cheaper:** total Lv3 cost 220→200g (better DPS/gold for niche role)

**Bug fix:** LevelManager now applies goldMult to kill rewards (previously only starting gold was affected by difficulty).

### Design Intent Per Level

- **L1-2:** Tutorial. 2-3 towers clear it. Surplus 3-4× gives room for mistakes.
- **L3-4:** Strategy introduction. Need Frost for slow, first tank enemies. 7-12 towers.
- **L5-6:** Mid-game skill check. Tight gold, high-HP enemies, multi-path on L6. 14-15 towers.
- **L7:** Flying enemies arrive. Must have anti-air (Lightning/Arrow/Sniper). ~19 towers.
- **L8:** Healers + splitters. Need burst DPS (Sniper) and AoE (Tesla/Cannon). ~33 towers.
- **L9-10:** All threats active. Tight economy, 5-6 lives, 39-43 towers required.

---

## How to Use the Tools

### Balance Report (CLI)
```bash
npx tsx scripts/balance-report.ts
```
Outputs full text analysis: scaling curves, tower table, level balance, progression curve, wave HP.

### Balance Dashboard (Visual)
```bash
npx tsx scripts/balance-dashboard.ts
# Open balance-dashboard.html in browser
```
Generates `balance-dashboard.html` with 12 interactive Chart.js visualizations:

1. **HP & Reward Scaling Curves** — dual-axis line chart showing exponential HP growth vs inverse reward decay across levels
2. **Gold Surplus Ratio** — line chart comparing Easy/Normal/Hard surplus ratios (key metric: below 1.0 = unbeatable)
3. **DPS Required vs Affordable (Normal)** — grouped bar chart showing if budget covers peak wave DPS needs
4. **Viability Score** — grouped bar chart (0-100) for all levels × difficulties
5. **Tower DPS/Gold Efficiency** — grouped bar chart comparing all 7 tower types at each upgrade level
6. **Tower Effective DPS by Upgrade Level** — grouped bar showing raw DPS output per tower at Lv1-3
7. **DPS & Budget Growth Rate** — line chart showing level-over-level scaling (identifies difficulty spikes)
8. **Minimum Towers Needed** — bar chart of recommended tower count per level
9. **Wave HP Progression** — interactive line chart with level selector buttons, shows HP curve within each level
10. **Cumulative Gold Income** — interactive line chart showing gold accumulation wave-by-wave per level
11. **Tower Composition Recommendations** — card grid showing optimal tower mix, DPS, budget, and coverage notes per level
12. **Full Balance Table** — sortable table with all metrics for every level × difficulty combination

### In Code (BalanceAnalyzer API)

```typescript
import { analyzeLevel, assessViability, recommendTowers, calcProgressionCurve } from "@/utils/BalanceAnalyzer";
import { LEVEL_CONFIGS } from "@/configs/LevelConfigs";
import { Difficulty } from "@/types";

// Analyze a single level
const level = analyzeLevel(LEVEL_CONFIGS[4], Difficulty.Normal);
console.log(level.totalHP, level.estimatedBudget);

// Check viability
const via = assessViability(LEVEL_CONFIGS[4], Difficulty.Hard);
console.log(via.score, via.goldSurplusRatio, via.bottlenecks);

// Get tower recommendations
const req = recommendTowers(LEVEL_CONFIGS[4]);
console.log(req.minTowers, req.dpsProvided);

// Full progression curve
const curve = calcProgressionCurve(LEVEL_CONFIGS, Difficulty.Normal);
curve.forEach(p => console.log(`L${p.level}: ${p.dpsNeeded} DPS, ${p.surplusRatio}x surplus`));
```

### For Dynamic Level Creation

When designing a new level, use this workflow:

1. Define the `LevelConfig` (rows, cols, pathLength, startingGold, startingLives)
2. Generate waves with `generateWavesForLevel(levelNumber)`
3. Run `assessViability(config, difficulty)` to check balance
4. Target surplus: 2.0-3.0× for Normal, 1.0-1.5× for Hard
5. Adjust `startingGold` or wave parameters until viability score is 40-70 on Normal
6. Use `recommendTowers()` to verify the level is solvable with a reasonable composition

### Key Files

| File | Purpose |
|------|---------|
| `src/utils/BalanceAnalyzer.ts` | All calculation functions |
| `src/configs/GameBalanceConfigs.ts` | Tower stats, enemy stats |
| `src/configs/WaveGenerator.ts` | HP scale, reward scale, wave generation |
| `src/configs/LevelConfigs.ts` | Per-level starting resources |
| `src/types/difficulty.ts` | Difficulty multipliers |
| `tests/BalanceAnalyzer.test.ts` | 67 tests covering all calculations |
| `scripts/balance-report.ts` | CLI text report |
| `scripts/balance-dashboard.ts` | HTML dashboard generator |
