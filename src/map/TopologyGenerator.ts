import { GridPosition } from "@/types";
import { randInt, clamp } from "@/utils/MathUtils";

/** Topology type determines the overall path shape. */
type TopologyType = "wide-zigzag" | "hook" | "s-curve" | "spiral";

const TOPOLOGIES: TopologyType[] = ["wide-zigzag", "hook", "s-curve", "spiral"];

/**
 * Generate anchor points for a path topology.
 * Anchors are strategic waypoints that define the path's overall shape.
 * The path generator connects consecutive anchors via cardinal movement.
 */
export function generateAnchors(
  rows: number,
  cols: number,
  rand: () => number,
): GridPosition[] {
  const type = TOPOLOGIES[Math.floor(rand() * TOPOLOGIES.length)];
  const margin = 1;
  const minR = margin;
  const maxR = rows - 1 - margin;
  const midR = Math.floor(rows / 2);
  const midC = Math.floor(cols / 2);

  const spawn: GridPosition = {
    row: rand() < 0.5 ? randInt(rand, minR, minR + 1) : randInt(rand, maxR - 1, maxR),
    col: 0,
  };
  const goal: GridPosition = {
    row: spawn.row <= midR ? randInt(rand, maxR - 1, maxR) : randInt(rand, minR, minR + 1),
    col: cols - 1,
  };

  switch (type) {
    case "wide-zigzag":
      return wideZigzag(spawn, goal, rows, cols, rand, minR, maxR);
    case "hook":
      return hook(spawn, goal, rows, cols, rand, minR, maxR, midC);
    case "s-curve":
      return sCurve(spawn, goal, rows, cols, rand, minR, maxR);
    case "spiral":
      return spiral(spawn, goal, rows, cols, rand, minR, maxR, midC);
  }
}

/**
 * Wide zigzag: wider horizontal runs than normal serpentine.
 * Creates 2-3 long horizontal segments connected by vertical bounces.
 */
function wideZigzag(
  spawn: GridPosition, goal: GridPosition,
  _rows: number, cols: number,
  rand: () => number, minR: number, maxR: number,
): GridPosition[] {
  const anchors: GridPosition[] = [spawn];
  const segments = 2 + Math.floor(rand() * 2); // 2-3 segments
  const segWidth = Math.floor((cols - 2) / segments);
  let row = spawn.row;

  for (let i = 0; i < segments; i++) {
    const col = Math.min((i + 1) * segWidth, cols - 2);
    anchors.push({ row, col });
    // Bounce to opposite side
    row = row <= (minR + maxR) / 2 ? randInt(rand, maxR - 1, maxR) : randInt(rand, minR, minR + 1);
    anchors.push({ row, col });
  }

  anchors.push(goal);
  return anchors;
}

/**
 * Hook: path goes right, hooks back left, then continues right.
 * Creates a distinctive hook/peninsula shape.
 */
function hook(
  spawn: GridPosition, goal: GridPosition,
  _rows: number, cols: number,
  rand: () => number, minR: number, maxR: number, midC: number,
): GridPosition[] {
  const hookCol = randInt(rand, midC + 2, cols - 4);
  const hookRow = spawn.row <= (minR + maxR) / 2 ? randInt(rand, maxR - 2, maxR) : randInt(rand, minR, minR + 2);
  const backCol = randInt(rand, midC - 2, midC + 1);

  return [
    spawn,
    { row: spawn.row, col: hookCol },         // go right
    { row: hookRow, col: hookCol },            // go down/up
    { row: hookRow, col: backCol },            // hook back left
    { row: goal.row, col: backCol },           // go to goal row
    goal,                                       // go right to goal
  ];
}

/**
 * S-curve: smooth S-shape across the grid.
 * Path goes right-down-right-up-right creating an S.
 */
function sCurve(
  spawn: GridPosition, goal: GridPosition,
  _rows: number, cols: number,
  rand: () => number, minR: number, maxR: number,
): GridPosition[] {
  const third = Math.floor(cols / 3);
  const twoThird = Math.floor(cols * 2 / 3);
  const midRow1 = randInt(rand, maxR - 2, maxR);
  const midRow2 = randInt(rand, minR, minR + 2);

  return [
    spawn,
    { row: spawn.row, col: third },
    { row: midRow1, col: third },
    { row: midRow1, col: twoThird },
    { row: midRow2, col: twoThird },
    { row: goal.row, col: cols - 2 },
    goal,
  ];
}

/**
 * Spiral: path spirals toward center then back out.
 * Creates a more complex, winding path.
 */
function spiral(
  spawn: GridPosition, goal: GridPosition,
  _rows: number, cols: number,
  rand: () => number, minR: number, maxR: number, midC: number,
): GridPosition[] {
  const innerMargin = 3;
  const innerMinR = clamp(minR + innerMargin, minR, maxR);
  const innerMaxR = clamp(maxR - innerMargin, minR, maxR);
  const leftCol = randInt(rand, 3, midC - 2);
  const rightCol = randInt(rand, midC + 2, cols - 4);

  // Suppress unused variable warning — innerMaxR reserved for future spiral variants
  void innerMaxR;

  return [
    spawn,
    { row: spawn.row, col: rightCol },      // go right
    { row: maxR, col: rightCol },            // go down
    { row: maxR, col: leftCol },             // go left
    { row: innerMinR, col: leftCol },        // go up (inner)
    { row: innerMinR, col: rightCol - 1 },   // go right (inner)
    { row: goal.row, col: rightCol - 1 },    // go toward goal row
    goal,                                     // go to goal
  ];
}

/**
 * Connect a sequence of anchor points via cardinal-direction grid walking.
 * Moves horizontally first, then vertically for each segment.
 * Returns the full cell-by-cell path, or null if self-intersection detected.
 */
export function connectAnchors(
  anchors: GridPosition[],
  rows: number,
  cols: number,
): GridPosition[] | null {
  if (anchors.length < 2) return null;

  const path: GridPosition[] = [anchors[0]];
  const used = new Set<string>();
  used.add(`${anchors[0].row},${anchors[0].col}`);

  for (let a = 1; a < anchors.length; a++) {
    const from = anchors[a - 1];
    const to = anchors[a];

    // Connect via horizontal then vertical (or vertical then horizontal alternating)
    const horizontalFirst = a % 2 === 1;
    const segment = horizontalFirst
      ? walkHorizontalThenVertical(from, to, rows, cols, used)
      : walkVerticalThenHorizontal(from, to, rows, cols, used);

    if (!segment) return null; // self-intersection

    // Append segment (skip first point — it's already in path)
    for (let i = 1; i < segment.length; i++) {
      path.push(segment[i]);
    }
  }

  return path;
}

function walkHorizontalThenVertical(
  from: GridPosition, to: GridPosition,
  _rows: number, _cols: number, used: Set<string>,
): GridPosition[] | null {
  const segment: GridPosition[] = [from];
  let { row, col } = from;

  // Horizontal
  const dc = to.col > col ? 1 : -1;
  while (col !== to.col) {
    col += dc;
    const key = `${row},${col}`;
    if (used.has(key)) return null;
    used.add(key);
    segment.push({ row, col });
  }

  // Vertical
  const dr = to.row > row ? 1 : -1;
  while (row !== to.row) {
    row += dr;
    const key = `${row},${col}`;
    if (used.has(key)) return null;
    used.add(key);
    segment.push({ row, col });
  }

  return segment;
}

function walkVerticalThenHorizontal(
  from: GridPosition, to: GridPosition,
  _rows: number, _cols: number, used: Set<string>,
): GridPosition[] | null {
  const segment: GridPosition[] = [from];
  let { row, col } = from;

  // Vertical
  const dr = to.row > row ? 1 : -1;
  while (row !== to.row) {
    row += dr;
    const key = `${row},${col}`;
    if (used.has(key)) return null;
    used.add(key);
    segment.push({ row, col });
  }

  // Horizontal
  const dc = to.col > col ? 1 : -1;
  while (col !== to.col) {
    col += dc;
    const key = `${row},${col}`;
    if (used.has(key)) return null;
    used.add(key);
    segment.push({ row, col });
  }

  return segment;
}

/**
 * Validate anchor placement constraints.
 * - Min distance between consecutive anchors: 3 cells (Manhattan)
 * - All anchors within grid bounds (with margin)
 * - No two anchors at the same position
 */
export function validateAnchors(
  anchors: GridPosition[],
  rows: number,
  cols: number,
): boolean {
  const margin = 0;
  const seen = new Set<string>();

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    // Bounds check
    if (a.row < margin || a.row >= rows - margin) return false;
    if (a.col < 0 || a.col >= cols) return false;

    // Duplicate check
    const key = `${a.row},${a.col}`;
    if (seen.has(key)) return false;
    seen.add(key);

    // Min distance check (skip first anchor)
    if (i > 0) {
      const prev = anchors[i - 1];
      const dist = Math.abs(a.row - prev.row) + Math.abs(a.col - prev.col);
      if (dist < 3) return false;
    }
  }

  return true;
}
