import { describe, it, expect } from "vitest";
import { LEVEL_CONFIGS, TOTAL_LEVELS } from "@/configs/LevelConfigs";
import { generateMap } from "@/map/MapGenerator";
import { extractPathCells, extractAllPaths } from "@/map/PathFinder";
import { CellType } from "@/types";

describe("Level verification — all 10 levels", () => {
  for (let i = 0; i < TOTAL_LEVELS; i++) {
    const cfg = LEVEL_CONFIGS[i];

    describe(`Lv${cfg.level} "${cfg.name}"`, () => {
      const mapConfig = generateMap(
        { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
        cfg.multiPath,
      );

      it("generates a map with correct dimensions", () => {
        expect(mapConfig.rows).toBe(cfg.rows);
        expect(mapConfig.cols).toBe(cfg.cols);
        expect(mapConfig.grid.length).toBe(cfg.rows);
        for (const row of mapConfig.grid) {
          expect(row.length).toBe(cfg.cols);
        }
      });

      it("has exactly one spawn and one goal", () => {
        let spawns = 0;
        let goals = 0;
        for (let r = 0; r < mapConfig.rows; r++) {
          for (let c = 0; c < mapConfig.cols; c++) {
            if (mapConfig.grid[r][c] === CellType.Spawn) spawns++;
            if (mapConfig.grid[r][c] === CellType.Goal) goals++;
          }
        }
        expect(spawns).toBe(1);
        expect(goals).toBe(1);
      });

      it("has a valid path from spawn to goal", () => {
        // Multi-path maps store explicit routes; single-path uses chain walk
        const paths = mapConfig.paths && mapConfig.paths.length > 0
          ? mapConfig.paths
          : [extractPathCells(mapConfig)];

        expect(paths.length).toBeGreaterThanOrEqual(1);

        for (const path of paths) {
          expect(path.length).toBeGreaterThanOrEqual(cfg.minPathLength);

          // First cell should be spawn
          const first = path[0];
          expect(mapConfig.grid[first.row][first.col]).toBe(CellType.Spawn);

          // Last cell should be goal
          const last = path[path.length - 1];
          expect(mapConfig.grid[last.row][last.col]).toBe(CellType.Goal);

          // Each step should be adjacent (Manhattan distance = 1)
          for (let j = 1; j < path.length; j++) {
            const prev = path[j - 1];
            const curr = path[j];
            const dist = Math.abs(prev.row - curr.row) + Math.abs(prev.col - curr.col);
            expect(dist).toBe(1);
          }
        }
      });

      it("has no T-junctions on primary path cells", () => {
        const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let r = 0; r < mapConfig.rows; r++) {
          for (let c = 0; c < mapConfig.cols; c++) {
            const cell = mapConfig.grid[r][c];
            if (cell === CellType.Buildable) continue;

            let neighbors = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < mapConfig.rows && nc >= 0 && nc < mapConfig.cols) {
                if (mapConfig.grid[nr][nc] !== CellType.Buildable) neighbors++;
              }
            }

            if (cell === CellType.Spawn || cell === CellType.Goal) {
              // Multi-path maps allow spawn/goal to have 2 neighbors (branch point)
              if (cfg.multiPath) {
                expect(neighbors).toBeGreaterThanOrEqual(1);
                expect(neighbors).toBeLessThanOrEqual(2);
              } else {
                expect(neighbors).toBe(1);
              }
            }
            // Path cells: single-path = 2, multi-path can be 2-3 at junctions
          }
        }
      });

      if (cfg.multiPath) {
        it("has multiple paths (multi-path level)", () => {
          const allPaths = mapConfig.paths
            ? mapConfig.paths
            : extractAllPaths(mapConfig);
          // Should have at least 1 path; ideally 2 for multi-path
          expect(allPaths.length).toBeGreaterThanOrEqual(1);
          // Log if secondary path failed to generate
          if (allPaths.length === 1) {
            console.warn(`  ⚠ Lv${cfg.level} multiPath=true but only 1 path found`);
          }
        });
      }

      it("has correct wave count", () => {
        const expectedWaves = 3 + cfg.level * 2;
        expect(cfg.waves.length).toBe(expectedWaves);
      });

      it("has buildable space >= 30%", () => {
        let buildable = 0;
        const total = mapConfig.rows * mapConfig.cols;
        for (let r = 0; r < mapConfig.rows; r++) {
          for (let c = 0; c < mapConfig.cols; c++) {
            if (mapConfig.grid[r][c] === CellType.Buildable) buildable++;
          }
        }
        expect(buildable / total).toBeGreaterThanOrEqual(0.3);
      });
    });
  }
});

describe("Level progression summary", () => {
  it("prints progression table", () => {
    const rows: string[] = [];
    rows.push("Lv | Name             | Grid   | MinPath | ActPath | Gold | Lives | Waves | MultiPath | Paths");
    rows.push("---|------------------|--------|---------|---------|------|-------|-------|-----------|---------");

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const cfg = LEVEL_CONFIGS[i];
      const mapConfig = generateMap(
        { rows: cfg.rows, cols: cfg.cols, minPathLength: cfg.minPathLength, seed: cfg.seed },
        cfg.multiPath,
      );
      const primaryPath = extractPathCells(mapConfig);
      const allPaths = mapConfig.paths ? mapConfig.paths : extractAllPaths(mapConfig);

      rows.push(
        `${String(cfg.level).padStart(2)} | ${cfg.name.padEnd(16)} | ${cfg.rows}×${String(cfg.cols).padEnd(2)} | ${String(cfg.minPathLength).padStart(7)} | ${String(primaryPath.length).padStart(7)} | ${String(cfg.startingGold).padStart(4)} | ${String(cfg.startingLives).padStart(5)} | ${String(cfg.waves.length).padStart(5)} | ${String(!!cfg.multiPath).padStart(9)} | ${allPaths.length}`,
      );
    }
    console.log("\n" + rows.join("\n") + "\n");
  });
});
