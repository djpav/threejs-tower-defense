import { describe, it, expect } from "vitest";
import { generateMap } from "../src/map/MapGenerator";
import { extractPathCells, extractAllWaypoints, gridToWorld } from "../src/map/PathFinder";
import { CellType } from "../src/types/enums";

describe("Multi-path map generation", () => {
  it("single-path map has no explicit paths field", () => {
    const config = generateMap(
      { rows: 8, cols: 12, minPathLength: 14, seed: 42 },
      false,
    );
    expect(config.paths).toBeUndefined();
  });

  it("single-path extractAllWaypoints returns one path", () => {
    const config = generateMap(
      { rows: 8, cols: 12, minPathLength: 14, seed: 42 },
      false,
    );
    const allWaypoints = extractAllWaypoints(config);
    expect(allWaypoints.length).toBe(1);
    expect(allWaypoints[0].length).toBeGreaterThanOrEqual(2);
  });

  it("multi-path map produces explicit paths array with 2 routes", () => {
    const config = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      true,
    );
    expect(config.paths).toBeDefined();
    expect(config.paths!.length).toBe(2);

    // Both routes should start at spawn and end at goal
    for (const path of config.paths!) {
      expect(config.grid[path[0].row][path[0].col]).toBe(CellType.Spawn);
      expect(config.grid[path[path.length - 1].row][path[path.length - 1].col]).toBe(CellType.Goal);
    }
  });

  it("multi-path routes have different cells in the middle", () => {
    const config = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      true,
    );
    const pathA = config.paths![0];
    const pathB = config.paths![1];

    const setA = new Set(pathA.map(p => `${p.row},${p.col}`));
    const setB = new Set(pathB.map(p => `${p.row},${p.col}`));

    // The routes share spawn and goal, but should have some cells unique to each
    let uniqueToA = 0;
    let uniqueToB = 0;
    for (const key of setA) {
      if (!setB.has(key)) uniqueToA++;
    }
    for (const key of setB) {
      if (!setA.has(key)) uniqueToB++;
    }

    expect(uniqueToA).toBeGreaterThan(0);
    expect(uniqueToB).toBeGreaterThan(0);
  });

  it("multi-path map grid contains only valid cell types", () => {
    const config = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      true,
    );
    const validTypes = new Set([CellType.Buildable, CellType.Path, CellType.Spawn, CellType.Goal]);
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        expect(validTypes.has(config.grid[r][c])).toBe(true);
      }
    }
  });

  it("multi-path map has exactly one spawn and one goal", () => {
    const config = generateMap(
      { rows: 16, cols: 22, minPathLength: 38, seed: 2048 },
      true,
    );
    let spawns = 0;
    let goals = 0;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (config.grid[r][c] === CellType.Spawn) spawns++;
        if (config.grid[r][c] === CellType.Goal) goals++;
      }
    }
    expect(spawns).toBe(1);
    expect(goals).toBe(1);
  });

  it("extractAllWaypoints uses explicit paths when available", () => {
    const config = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      true,
    );
    const allWaypoints = extractAllWaypoints(config);
    expect(allWaypoints.length).toBe(2);

    for (const waypoints of allWaypoints) {
      expect(waypoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("extractPathCells still works for backwards compatibility", () => {
    const config = generateMap(
      { rows: 8, cols: 12, minPathLength: 14, seed: 42 },
      false,
    );
    const path = extractPathCells(config);
    expect(path.length).toBeGreaterThanOrEqual(14);
    expect(config.grid[path[0].row][path[0].col]).toBe(CellType.Spawn);
  });

  it("multi-path disabled produces identical maps for same seed", () => {
    const configA = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      false,
    );
    const configB = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      false,
    );

    for (let r = 0; r < configA.rows; r++) {
      for (let c = 0; c < configA.cols; c++) {
        expect(configA.grid[r][c]).toBe(configB.grid[r][c]);
      }
    }
  });

  it("multi-path map has more path cells than single-path with same seed", () => {
    const single = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      false,
    );
    const multi = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      true,
    );

    let singlePathCells = 0;
    let multiPathCells = 0;
    for (let r = 0; r < single.rows; r++) {
      for (let c = 0; c < single.cols; c++) {
        if (single.grid[r][c] !== CellType.Buildable) singlePathCells++;
        if (multi.grid[r][c] !== CellType.Buildable) multiPathCells++;
      }
    }

    expect(multiPathCells).toBeGreaterThan(singlePathCells);
  });

  it("extractAllWaypoints converts explicit paths to world-position waypoints", () => {
    const config = generateMap(
      { rows: 14, cols: 20, minPathLength: 32, seed: 1024 },
      true,
    );

    const allWaypoints = extractAllWaypoints(config);
    expect(allWaypoints.length).toBe(2);

    // Both waypoint sets should start at the same grid position (spawn)
    const spawnWorld0 = gridToWorld(allWaypoints[0][0], config);
    const spawnWorld1 = gridToWorld(allWaypoints[1][0], config);
    expect(spawnWorld0.x).toBe(spawnWorld1.x);
    expect(spawnWorld0.z).toBe(spawnWorld1.z);

    // Both should end at goal
    const goal0 = allWaypoints[0][allWaypoints[0].length - 1];
    const goal1 = allWaypoints[1][allWaypoints[1].length - 1];
    const goalWorld0 = gridToWorld(goal0, config);
    const goalWorld1 = gridToWorld(goal1, config);
    expect(goalWorld0.x).toBe(goalWorld1.x);
    expect(goalWorld0.z).toBe(goalWorld1.z);
  });

  it("works reliably across multiple seeds", () => {
    const seeds = [1024, 1337, 2048, 3141, 9999];
    for (const seed of seeds) {
      const config = generateMap(
        { rows: 14, cols: 20, minPathLength: 32, seed },
        true,
      );
      expect(config.paths).toBeDefined();
      expect(config.paths!.length).toBe(2);

      const allWaypoints = extractAllWaypoints(config);
      expect(allWaypoints.length).toBe(2);
    }
  });
});
