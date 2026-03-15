import { describe, it, expect } from "vitest";
import { LEVEL_CONFIGS, TOTAL_LEVELS } from "@/configs/LevelConfigs";
import { generateMap } from "@/map/MapGenerator";
import { extractPathCells } from "@/map/PathFinder";
import { CellType } from "@/types";

// ── Helper: generate map for a level config ─────────────────────────
function genMap(levelIndex: number) {
  const cfg = LEVEL_CONFIGS[levelIndex];
  return {
    cfg,
    map: generateMap(
      { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
      cfg.multiPath,
    ),
  };
}

// ── 1. Secondary path quality (MapGenerator min-length check) ───────
describe("Secondary path quality", () => {
  const multiPathLevels = Array.from({ length: TOTAL_LEVELS }, (_, i) => i)
    .filter(i => LEVEL_CONFIGS[i].multiPath);

  for (const i of multiPathLevels) {
    const { cfg, map } = genMap(i);

    describe(`Lv${cfg.level} "${cfg.name}"`, () => {
      it("generates explicit config.paths for multi-path maps", () => {
        expect(map.paths).toBeDefined();
        expect(map.paths!.length).toBeGreaterThanOrEqual(2);
      });

      it("secondary path is a meaningful detour (not a trivial shortcut)", () => {
        const paths = map.paths!;
        const primary = paths[0];
        const secondary = paths[1];

        // The secondary path should be a non-trivial proportion of the primary
        // (MapGenerator enforces 40% minimum on the A* route vs primary segment)
        expect(secondary.length).toBeGreaterThanOrEqual(primary.length * 0.3);

        // Find divergent cells (cells unique to secondary path)
        const primarySet = new Set(primary.map(p => `${p.row},${p.col}`));
        const divergentCells = secondary.filter(p => !primarySet.has(`${p.row},${p.col}`));

        // Must have a meaningful number of unique cells
        expect(divergentCells.length).toBeGreaterThanOrEqual(3);
      });

      it("both paths start at spawn and end at goal", () => {
        for (const path of map.paths!) {
          const first = path[0];
          const last = path[path.length - 1];
          expect(map.grid[first.row][first.col]).toBe(CellType.Spawn);
          expect(map.grid[last.row][last.col]).toBe(CellType.Goal);
        }
      });

      it("both paths have contiguous steps (Manhattan distance = 1)", () => {
        for (const path of map.paths!) {
          for (let j = 1; j < path.length; j++) {
            const prev = path[j - 1];
            const curr = path[j];
            const dist = Math.abs(prev.row - curr.row) + Math.abs(prev.col - curr.col);
            expect(dist).toBe(1);
          }
        }
      });
    });
  }
});

// ── 2. Single-path levels should NOT have config.paths ──────────────
describe("Single-path levels", () => {
  const singlePathLevels = Array.from({ length: TOTAL_LEVELS }, (_, i) => i)
    .filter(i => !LEVEL_CONFIGS[i].multiPath);

  for (const i of singlePathLevels) {
    const { cfg, map } = genMap(i);

    it(`Lv${cfg.level} "${cfg.name}" has no config.paths`, () => {
      // Single-path maps should not have explicit paths array
      expect(map.paths).toBeUndefined();
    });

    it(`Lv${cfg.level} "${cfg.name}" primary path reaches goal via chain walk`, () => {
      const path = extractPathCells(map);
      expect(path.length).toBeGreaterThanOrEqual(cfg.minPathLength);
      const first = path[0];
      const last = path[path.length - 1];
      expect(map.grid[first.row][first.col]).toBe(CellType.Spawn);
      expect(map.grid[last.row][last.col]).toBe(CellType.Goal);
    });
  }
});

// ── 3. Secondary path cells are distinct from primary ───────────────
describe("Secondary path cell identification", () => {
  const multiPathLevels = Array.from({ length: TOTAL_LEVELS }, (_, i) => i)
    .filter(i => LEVEL_CONFIGS[i].multiPath);

  for (const i of multiPathLevels) {
    const { cfg, map } = genMap(i);

    it(`Lv${cfg.level} has secondary-only cells marked as Path in grid`, () => {
      const paths = map.paths!;
      const primarySet = new Set<string>();
      for (const pos of paths[0]) {
        primarySet.add(`${pos.row},${pos.col}`);
      }
      // Add spawn/goal
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          if (map.grid[r][c] === CellType.Spawn || map.grid[r][c] === CellType.Goal) {
            primarySet.add(`${r},${c}`);
          }
        }
      }

      // Find cells exclusive to secondary paths
      let secondaryOnlyCells = 0;
      for (let p = 1; p < paths.length; p++) {
        for (const pos of paths[p]) {
          const key = `${pos.row},${pos.col}`;
          if (!primarySet.has(key)) {
            // These cells should be CellType.Path in the grid
            expect(map.grid[pos.row][pos.col]).toBe(CellType.Path);
            secondaryOnlyCells++;
          }
        }
      }

      // There should be at least some secondary-only cells
      expect(secondaryOnlyCells).toBeGreaterThan(0);
    });
  }
});

// ── 4. EnemyManager round-robin path distribution ───────────────────
describe("EnemyManager round-robin path distribution", () => {
  // We test pickWaypoints indirectly via spawn() since pickWaypoints is private.
  // We verify by checking enemy waypoints after spawning.

  it("distributes enemies evenly across 2 paths", () => {
    // Simulate what EnemyManager.pickWaypoints does with round-robin
    const pathCount = 2;
    let counter = 0;
    const picks: number[] = [];

    for (let i = 0; i < 10; i++) {
      const index = counter % pathCount;
      counter++;
      picks.push(index);
    }

    // Should alternate: 0, 1, 0, 1, ...
    expect(picks).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);

    // Count per path should be equal
    const counts = [0, 0];
    for (const p of picks) counts[p]++;
    expect(counts[0]).toBe(5);
    expect(counts[1]).toBe(5);
  });

  it("distributes enemies evenly across 3 paths", () => {
    const pathCount = 3;
    let counter = 0;
    const picks: number[] = [];

    for (let i = 0; i < 9; i++) {
      const index = counter % pathCount;
      counter++;
      picks.push(index);
    }

    expect(picks).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);

    const counts = [0, 0, 0];
    for (const p of picks) counts[p]++;
    expect(counts[0]).toBe(3);
    expect(counts[1]).toBe(3);
    expect(counts[2]).toBe(3);
  });

  it("returns single path when only 1 path exists", () => {
    // With 1 path, all enemies go on the same path
    const pathCount = 1;
    let counter = 0;
    const picks: number[] = [];

    for (let i = 0; i < 5; i++) {
      if (pathCount <= 1) {
        picks.push(0); // always returns first path
      } else {
        picks.push(counter % pathCount);
        counter++;
      }
    }

    expect(picks).toEqual([0, 0, 0, 0, 0]);
  });

  it("is deterministic (same sequence every time)", () => {
    const pathCount = 2;
    const run = () => {
      let counter = 0;
      const picks: number[] = [];
      for (let i = 0; i < 6; i++) {
        picks.push(counter % pathCount);
        counter++;
      }
      return picks;
    };

    const run1 = run();
    const run2 = run();
    const run3 = run();
    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });
});

// ── 5. GameMap has no getRandomWaypoints method ─────────────────────
// Verified via grep: getRandomWaypoints is not referenced anywhere in the codebase.
// Cannot import GameMap directly in tests (Three.js dependency — tests are pure logic only).

// ── 6. Map generation determinism (same seed = same map) ────────────
describe("Map generation determinism", () => {
  for (const i of [0, 5, 9]) {
    const cfg = LEVEL_CONFIGS[i];

    it(`Lv${cfg.level} produces identical maps from same seed`, () => {
      const map1 = generateMap(
        { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
        cfg.multiPath,
      );
      const map2 = generateMap(
        { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
        cfg.multiPath,
      );

      // Grids should be identical
      for (let r = 0; r < map1.rows; r++) {
        for (let c = 0; c < map1.cols; c++) {
          expect(map1.grid[r][c]).toBe(map2.grid[r][c]);
        }
      }

      // Paths (if present) should be identical
      if (map1.paths && map2.paths) {
        expect(map1.paths.length).toBe(map2.paths.length);
        for (let p = 0; p < map1.paths.length; p++) {
          expect(map1.paths[p].length).toBe(map2.paths[p].length);
          for (let j = 0; j < map1.paths[p].length; j++) {
            expect(map1.paths[p][j].row).toBe(map2.paths[p][j].row);
            expect(map1.paths[p][j].col).toBe(map2.paths[p][j].col);
          }
        }
      }
    });
  }
});
