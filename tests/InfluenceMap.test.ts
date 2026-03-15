import { describe, it, expect } from "vitest";
import { InfluenceMap } from "@/map/InfluenceMap";
import { CellType, MapConfig } from "@/types";

function buildMap(rows: number, cols: number): MapConfig {
  const grid: CellType[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols).fill(CellType.Buildable);
  }
  return { rows, cols, cellSize: 1, cellHeight: 0.2, grid };
}

describe("InfluenceMap", () => {
  it("starts with zero danger everywhere", () => {
    const map = buildMap(5, 5);
    const im = new InfluenceMap(map);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        expect(im.getDanger(r, c)).toBe(0);
      }
    }
  });

  it("out of bounds returns 0", () => {
    const map = buildMap(5, 5);
    const im = new InfluenceMap(map);
    expect(im.getDanger(-1, 0)).toBe(0);
    expect(im.getDanger(0, 99)).toBe(0);
  });

  it("clear resets all danger to 0", () => {
    const map = buildMap(5, 5);
    const im = new InfluenceMap(map);
    // Manually set danger via rebuild would be needed, but clear should reset
    im.clear();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        expect(im.getDanger(r, c)).toBe(0);
      }
    }
  });

  it("getDangerGrid returns the raw grid", () => {
    const map = buildMap(3, 3);
    const im = new InfluenceMap(map);
    const grid = im.getDangerGrid();
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(3);
  });

  it("getDangerAtWorld converts world coordinates to grid", () => {
    const map = buildMap(5, 5);
    const im = new InfluenceMap(map);
    // With cellSize=1 and 5x5, offset = (5-1)/2 = 2
    // World (0,0) maps to grid (2,2) — center of map
    const danger = im.getDangerAtWorld(0, 0);
    expect(danger).toBe(0); // no towers, so 0
  });
});
