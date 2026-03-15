import { WorldPosition } from "@/types";

/** Position state that movement strategies read/write. */
export interface MovementState {
  x: number;
  z: number;
  speed: number;
  slowFactor: number;
}

/** Result of a movement update. */
export interface MovementResult {
  reachedGoal: boolean;
}

/** Strategy interface for enemy movement. */
export interface EnemyMovementStrategy {
  /** Advance the enemy along its path. Mutates `state` position. */
  update(delta: number, state: MovementState): MovementResult;
  /** How far along the path (higher = closer to goal). Uses current position for sub-waypoint interpolation. */
  getProgress(currentX: number, currentZ: number): number;
  /** Current waypoint index (for splitter children). */
  getWaypointIndex(): number;
  /** The waypoints this strategy is following (for splitter inheritance). */
  getWaypoints(): WorldPosition[];
  /** Set position and progress directly (for splitter children). */
  setPositionAndProgress(x: number, z: number, wpIndex: number): void;
  /** Reset for pool reuse. */
  reset(waypoints: WorldPosition[]): void;
}

/**
 * Classic waypoint-following movement.
 * Enemy moves along a pre-computed array of WorldPosition waypoints.
 */
export class WaypointMovement implements EnemyMovementStrategy {
  private waypoints: WorldPosition[];
  private waypointIndex = 0;

  constructor(waypoints: WorldPosition[]) {
    this.waypoints = waypoints;
    this.waypointIndex = waypoints.length > 0 ? 1 : 0;
  }

  update(delta: number, state: MovementState): MovementResult {
    if (this.waypointIndex >= this.waypoints.length) {
      return { reachedGoal: true };
    }

    const effectiveSpeed = state.speed * state.slowFactor;
    let remaining = effectiveSpeed * delta;

    while (remaining > 0 && this.waypointIndex < this.waypoints.length) {
      const target = this.waypoints[this.waypointIndex];
      const dx = target.x - state.x;
      const dz = target.z - state.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= remaining) {
        state.x = target.x;
        state.z = target.z;
        this.waypointIndex++;
        remaining -= dist;
      } else {
        state.x += (dx / dist) * remaining;
        state.z += (dz / dist) * remaining;
        remaining = 0;
      }
    }

    return { reachedGoal: this.waypointIndex >= this.waypoints.length };
  }

  getProgress(currentX: number, currentZ: number): number {
    if (this.waypointIndex >= this.waypoints.length) return this.waypoints.length;
    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - currentX;
    const dz = target.z - currentZ;
    const distToNext = Math.sqrt(dx * dx + dz * dz);
    return this.waypointIndex + (1 - Math.min(distToNext, 1));
  }

  getWaypointIndex(): number {
    return this.waypointIndex;
  }

  getWaypoints(): WorldPosition[] {
    return this.waypoints;
  }

  setPositionAndProgress(_x: number, _z: number, wpIndex: number): void {
    // Position is set externally on the group; we just track waypoint index
    this.waypointIndex = Math.min(wpIndex, this.waypoints.length);
  }

  reset(waypoints: WorldPosition[]): void {
    this.waypoints = waypoints;
    this.waypointIndex = waypoints.length > 0 ? 1 : 0;
  }
}
