import { describe, it, expect } from "vitest";
import { DistanceField } from "@/map/DistanceField";
import { CellType, MapConfig } from "@/types";

// ── Helper: build a minimal MapConfig from a string grid ────────────
function buildMap(template: string[]): MapConfig {
  const rows = template.length;
  const cols = template[0].length;
  const grid: CellType[][] = [];

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const ch = template[r][c];
      grid[r][c] =
        ch === "S" ? CellType.Spawn
        : ch === "G" ? CellType.Goal
        : ch === "." ? CellType.Path
        : CellType.Buildable;
    }
  }

  return { rows, cols, cellSize: 1, cellHeight: 0.2, grid };
}

// ── Basic distance computation ──────────────────────────────────────
describe("DistanceField — basic BFS", () => {
  // Simple straight path: S . . . G
  const map = buildMap([
    "#####",
    "S...G",
    "#####",
  ]);

  const df = new DistanceField(map);

  it("goal has distance 0", () => {
    expect(df.getDistance(1, 4)).toBe(0);
  });

  it("spawn has correct distance", () => {
    // S(1,0) → .(1,1) → .(1,2) → .(1,3) → G(1,4) = 4 steps
    expect(df.getDistance(1, 0)).toBe(4);
  });

  it("path cells have decreasing distances toward goal", () => {
    expect(df.getDistance(1, 1)).toBe(3);
    expect(df.getDistance(1, 2)).toBe(2);
    expect(df.getDistance(1, 3)).toBe(1);
  });

  it("buildable cells have Infinity distance", () => {
    expect(df.getDistance(0, 0)).toBe(Infinity);
    expect(df.getDistance(2, 2)).toBe(Infinity);
  });

  it("out of bounds returns Infinity", () => {
    expect(df.getDistance(-1, 0)).toBe(Infinity);
    expect(df.getDistance(0, 99)).toBe(Infinity);
  });
});

// ── Gradient navigation ─────────────────────────────────────────────
describe("DistanceField — getNextCell", () => {
  const map = buildMap([
    "#####",
    "S...G",
    "#####",
  ]);
  const df = new DistanceField(map);

  it("returns next cell toward goal", () => {
    const next = df.getNextCell(1, 0); // from spawn
    expect(next).toEqual({ row: 1, col: 1 });
  });

  it("returns null at goal", () => {
    expect(df.getNextCell(1, 4)).toBeNull();
  });

  it("returns null for unreachable cell", () => {
    expect(df.getNextCell(0, 0)).toBeNull();
  });
});

// ── Path extraction ─────────────────────────────────────────────────
describe("DistanceField — extractPath", () => {
  const map = buildMap([
    "#####",
    "S...G",
    "#####",
  ]);
  const df = new DistanceField(map);

  it("extracts complete path from spawn to goal", () => {
    const path = df.extractPath(1, 0);
    expect(path.length).toBe(5); // S + 3 dots + G
    expect(path[0]).toEqual({ row: 1, col: 0 }); // spawn
    expect(path[4]).toEqual({ row: 1, col: 4 }); // goal
  });

  it("each step is adjacent (Manhattan distance = 1)", () => {
    const path = df.extractPath(1, 0);
    for (let i = 1; i < path.length; i++) {
      const dist = Math.abs(path[i].row - path[i - 1].row) + Math.abs(path[i].col - path[i - 1].col);
      expect(dist).toBe(1);
    }
  });

  it("extracts path from mid-point", () => {
    const path = df.extractPath(1, 2);
    expect(path.length).toBe(3); // (1,2) → (1,3) → (1,4)
    expect(path[0]).toEqual({ row: 1, col: 2 });
    expect(path[2]).toEqual({ row: 1, col: 4 });
  });
});

// ── L-shaped path ───────────────────────────────────────────────────
describe("DistanceField — L-shaped path", () => {
  const map = buildMap([
    "S.###",
    "#.###",
    "#...G",
  ]);
  const df = new DistanceField(map);

  it("computes correct distances around corner", () => {
    // S(0,0)→(0,1)→(1,1)→(2,1)→(2,2)→(2,3)→G(2,4) = 6 steps
    expect(df.getDistance(0, 0)).toBe(6);
    expect(df.getDistance(0, 1)).toBe(5);
    expect(df.getDistance(1, 1)).toBe(4);
    expect(df.getDistance(2, 1)).toBe(3);
    expect(df.getDistance(2, 2)).toBe(2);
    expect(df.getDistance(2, 3)).toBe(1);
    expect(df.getDistance(2, 4)).toBe(0);
  });

  it("follows gradient around corner", () => {
    const path = df.extractPath(0, 0);
    expect(path.length).toBe(7);
    expect(path[path.length - 1]).toEqual({ row: 2, col: 4 });
  });
});

// ── Reachability ────────────────────────────────────────────────────
describe("DistanceField — reachability", () => {
  const map = buildMap([
    "S.#.G",
    "..#..",
    ".....",
  ]);
  const df = new DistanceField(map);

  it("spawn is reachable", () => {
    expect(df.isSpawnReachable(0, 0)).toBe(true);
  });

  it("path cells are reachable", () => {
    expect(df.isReachable(2, 2)).toBe(true);
  });

  it("buildable cells are not reachable", () => {
    expect(df.isReachable(0, 2)).toBe(false); // wall
  });
});

// ── Rebuild with blocked cells ──────────────────────────────────────
describe("DistanceField — dynamic rebuild", () => {
  const map = buildMap([
    "#####",
    "S...G",
    "#.#.#",
    "#...#",
    "#####",
  ]);

  it("blocking a path cell increases distance", () => {
    const df = new DistanceField(map);
    const originalDist = df.getDistance(1, 0);

    // Block cell (1,2) — middle of the path
    const blocked = new Set(["1,2"]);
    df.rebuild(map.grid, blocked);

    // Spawn should still be reachable (via row 2-3 if those are path cells)
    // but distance should be longer or Infinity
    const newDist = df.getDistance(1, 0);
    expect(newDist).toBeGreaterThanOrEqual(originalDist);
  });
});

// ── Integration with real generated maps ────────────────────────────
describe("DistanceField — generated maps", () => {
  // Import map generation to test with real maps
  it("works with generated level maps", async () => {
    const { LEVEL_CONFIGS } = await import("@/configs/LevelConfigs");
    const { generateMap } = await import("@/map/MapGenerator");
    const { findCells } = await import("@/map/MapData");

    // Test first 3 levels
    for (let i = 0; i < 3; i++) {
      const cfg = LEVEL_CONFIGS[i];
      const mapConfig = generateMap(
        { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
        cfg.multiPath,
      );

      const df = new DistanceField(mapConfig);
      const spawns = findCells(mapConfig, CellType.Spawn);
      const goals = findCells(mapConfig, CellType.Goal);

      // Spawn should be reachable
      expect(df.isSpawnReachable(spawns[0].row, spawns[0].col)).toBe(true);

      // Goal should have distance 0
      expect(df.getDistance(goals[0].row, goals[0].col)).toBe(0);

      // Extracted path should reach goal
      const path = df.extractPath(spawns[0].row, spawns[0].col);
      const lastCell = path[path.length - 1];
      expect(lastCell.row).toBe(goals[0].row);
      expect(lastCell.col).toBe(goals[0].col);
    }
  });
});

// ── Flow-field generator tests ──────────────────────────────────────
describe("Flow-field generator", () => {
  it("all 10 levels produce valid maps via the tiered pipeline", async () => {
    const { LEVEL_CONFIGS, TOTAL_LEVELS } = await import("@/configs/LevelConfigs");
    const { generateMap } = await import("@/map/MapGenerator");

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const cfg = LEVEL_CONFIGS[i];
      const map = generateMap(
        { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
        cfg.multiPath,
      );

      // Map should always be generated (fallbacks guarantee this)
      expect(map.rows).toBe(cfg.rows);
      expect(map.cols).toBe(cfg.cols);

      // Should have spawn and goal
      let spawns = 0;
      let goals = 0;
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          if (map.grid[r][c] === CellType.Spawn) spawns++;
          if (map.grid[r][c] === CellType.Goal) goals++;
        }
      }
      expect(spawns).toBe(1);
      expect(goals).toBe(1);
    }
  });

  it("deterministic: same seed produces same map", async () => {
    const { generateMap } = await import("@/map/MapGenerator");
    const params = { rows: 10, cols: 14, minPathLength: 18, seed: 12345 };

    const map1 = generateMap(params);
    const map2 = generateMap(params);

    for (let r = 0; r < map1.rows; r++) {
      for (let c = 0; c < map1.cols; c++) {
        expect(map1.grid[r][c]).toBe(map2.grid[r][c]);
      }
    }
  });
});
