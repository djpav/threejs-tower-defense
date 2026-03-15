import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  BoxGeometry,
  IcosahedronGeometry,
  ConeGeometry,
  OctahedronGeometry,
  BufferGeometry,
  Group,
} from "three";
import { GameObject } from "./GameObject";
import { EnemyConfig, EnemyInfo, WorldPosition } from "@/types";
import { StatusEffects, HealthBar, StealthState, WaypointMovement } from "./components";
import type { EnemyMovementStrategy, MovementState } from "./components";

export function createBodyGeometry(
  bodyType: EnemyConfig["bodyType"],
  radius: number,
): BufferGeometry {
  switch (bodyType) {
    case "cube":
      return new BoxGeometry(radius * 2, radius * 2, radius * 2);
    case "icosahedron":
      return new IcosahedronGeometry(radius, 0);
    case "cone":
      return new ConeGeometry(radius, radius * 2.5, 8);
    case "diamond":
      return new OctahedronGeometry(radius, 0);
    case "sphere":
    default:
      return new SphereGeometry(radius, 12, 8);
  }
}

export class Enemy extends GameObject {
  config: EnemyConfig;
  private mesh: Mesh | null = null;
  private meshMaterial: MeshStandardMaterial | null = null;
  private group: Group;
  private healthBar: HealthBar;
  private statusEffects = new StatusEffects();
  private stealthState = new StealthState();

  private movement: EnemyMovementStrategy;
  private movementState: MovementState = { x: 0, z: 0, speed: 0, slowFactor: 1 };
  hp: number;
  alive = true;
  reachedGoal = false;

  // Healer timer
  private healTimer = 0;

  // Flying elevation
  private flyingY: number;

  // Lateral offset for crowd movement (perpendicular to path direction)
  private lateralOffset = 0;
  // Logical path-center position (separate from visual group.position which includes offset)
  private pathX = 0;
  private pathZ = 0;
  // Static counter for deterministic per-enemy offset generation
  private static nextSpawnId = 0;
  private static readonly MAX_LATERAL_OFFSET = 0.25;

  /** How far along the path this enemy is (higher = further) */
  get pathProgress(): number {
    return this.movement.getProgress(this.pathX, this.pathZ);
  }

  get waypointIndex(): number {
    return this.movement.getWaypointIndex();
  }

  /** Expose the waypoints this enemy is following (used by splitter children). */
  getWaypoints(): WorldPosition[] {
    return this.movement.getWaypoints();
  }

  get isRevealed(): boolean {
    return this.stealthState.isRevealed;
  }

  get slowFactor(): number {
    return this.statusEffects.slowFactor;
  }

  get poisonStackCount(): number {
    return this.statusEffects.poisonStackCount;
  }

  constructor(config: EnemyConfig, waypoints: WorldPosition[]) {
    super();
    this.config = config;
    this.hp = config.hp;
    this.flyingY = config.isFlying ? 1.5 : 0;

    this.movement = new WaypointMovement(waypoints);

    this.group = new Group();
    this.group.userData.entity = this;

    // Health bar
    this.healthBar = new HealthBar(config.radius * 2 + 0.35);
    this.group.add(this.healthBar.sprite);

    // Only create individual mesh for stealth enemies (instanced renderer handles normal enemies)
    if (config.isStealth) {
      const geometry = createBodyGeometry(config.bodyType, config.radius);
      this.meshMaterial = new MeshStandardMaterial({ color: config.color ?? 0xe74c3c });
      this.mesh = new Mesh(geometry, this.meshMaterial);
      this.mesh.position.y = config.radius + 0.1;
      this.group.add(this.mesh);

      // Stealth: start near-invisible
      this.meshMaterial.transparent = true;
      this.meshMaterial.opacity = 0.15;
      this.healthBar.hide();
    }

    // Set start position and lateral offset
    this.lateralOffset = Enemy.computeLateralOffset();
    if (waypoints.length > 0) {
      this.pathX = waypoints[0].x;
      this.pathZ = waypoints[0].z;
      this.applyLateralOffset(waypoints);
    }

    this.healthBar.update(this.hp, this.config.hp);
    this.object3D = this.group;
  }

  /** Compute a deterministic lateral offset for crowd spread. */
  private static computeLateralOffset(): number {
    const id = Enemy.nextSpawnId++;
    // Knuth multiplicative hash → [0, 1)
    const hash = ((id * 2654435761) >>> 0) / 4294967296;
    return (hash - 0.5) * 2 * Enemy.MAX_LATERAL_OFFSET;
  }

  /** Apply lateral offset to visual position based on path direction. */
  private applyLateralOffset(waypoints: WorldPosition[]): void {
    const wpIdx = this.movement.getWaypointIndex();
    if (this.lateralOffset !== 0 && wpIdx < waypoints.length) {
      const target = waypoints[wpIdx];
      const dx = target.x - this.pathX;
      const dz = target.z - this.pathZ;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const perpX = -dz / len;
      const perpZ = dx / len;
      this.group.position.set(
        this.pathX + perpX * this.lateralOffset,
        this.flyingY,
        this.pathZ + perpZ * this.lateralOffset,
      );
    } else {
      this.group.position.set(this.pathX, this.flyingY, this.pathZ);
    }
  }

  /**
   * Reinitialize this enemy for reuse from object pool.
   * Resets all state to match a freshly constructed enemy.
   */
  reset(config: EnemyConfig, waypoints: WorldPosition[]): void {
    this.config = config;
    this.hp = config.hp;
    this.alive = true;
    this.reachedGoal = false;
    this.healTimer = 0;
    this.flyingY = config.isFlying ? 1.5 : 0;
    this.movement.reset(waypoints);

    // Full transform reset to prevent stale state from previous pool usage
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.set(1, 1, 1);

    // Reset components
    this.statusEffects.reset();
    this.stealthState.reset();
    this.healthBar.resetPosition(config.radius * 2 + 0.35);

    // Handle stealth mesh: dispose old, create new if needed
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.meshMaterial) {
      this.meshMaterial.dispose();
      this.meshMaterial = null;
    }

    if (config.isStealth) {
      const geometry = createBodyGeometry(config.bodyType, config.radius);
      this.meshMaterial = new MeshStandardMaterial({ color: config.color ?? 0xe74c3c });
      this.mesh = new Mesh(geometry, this.meshMaterial);
      this.mesh.position.y = config.radius + 0.1;
      this.group.add(this.mesh);
      this.meshMaterial.transparent = true;
      this.meshMaterial.opacity = 0.15;
      this.healthBar.hide();
    }

    // Set start position and lateral offset
    this.lateralOffset = Enemy.computeLateralOffset();
    if (waypoints.length > 0) {
      this.pathX = waypoints[0].x;
      this.pathZ = waypoints[0].z;
      this.applyLateralOffset(waypoints);
    }

    this.healthBar.update(this.hp, this.config.hp);
  }

  /** Logical path-center position (without lateral offset). */
  getPathPosition(): { x: number; z: number } {
    return { x: this.pathX, z: this.pathZ };
  }

  getColor(): number {
    return this.config.color ?? 0xe74c3c;
  }

  toInfo(): EnemyInfo {
    const bodyType = this.config.bodyType ?? "sphere";
    const name = bodyType.charAt(0).toUpperCase() + bodyType.slice(1) + " Enemy";
    return {
      name,
      hp: this.hp,
      maxHp: this.config.hp,
      speed: this.config.speed,
      reward: this.config.reward,
      isFlying: this.config.isFlying ?? false,
      isStealth: this.config.isStealth ?? false,
      isRevealed: this.stealthState.isRevealed,
      slowFactor: this.statusEffects.slowFactor,
      poisonStacks: this.statusEffects.poisonStackCount,
      color: this.config.color ?? 0xe74c3c,
    };
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    this.healthBar.update(this.hp, this.config.hp);
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.hp + amount, this.config.hp);
    this.healthBar.update(this.hp, this.config.hp);
  }

  applySlow(factor: number, duration: number): void {
    this.statusEffects.applySlow(factor, duration);
  }

  applyPoison(damage: number, duration: number, tickRate: number, maxStacks: number): void {
    this.statusEffects.applyPoison(damage, duration, tickRate, maxStacks);

    // Visual: green tint (skip if stealthed — would reveal position)
    if (this.meshMaterial && (!this.config.isStealth || this.stealthState.isRevealed)) {
      this.meshMaterial.emissive.setHex(0x27ae60);
      this.meshMaterial.emissiveIntensity = 0.3 + this.statusEffects.poisonStackCount * 0.15;
    }
  }

  /** Stealth: reveal this enemy (called when near a tower). */
  reveal(): void {
    if (!this.config.isStealth || !this.meshMaterial) return;
    this.stealthState.reveal(this.meshMaterial, this.healthBar, this.statusEffects.hasPoisonStacks);
  }

  /** Stealth: conceal this enemy again. */
  conceal(): void {
    if (!this.config.isStealth || !this.meshMaterial) return;
    this.stealthState.conceal(this.meshMaterial, this.healthBar);
  }

  /** Healer: returns true if enough time has passed for a heal tick. */
  canHealTick(delta: number): boolean {
    if (!this.config.healTickRate) return false;
    this.healTimer += delta;
    if (this.healTimer >= this.config.healTickRate) {
      this.healTimer -= this.config.healTickRate;
      return true;
    }
    return false;
  }

  /** Set position and waypoint index — used for splitter children. */
  setPositionAndProgress(x: number, z: number, wpIndex: number): void {
    this.pathX = x;
    this.pathZ = z;
    this.group.position.x = x;
    this.group.position.z = z;
    this.movement.setPositionAndProgress(x, z, wpIndex);
  }

  /** Nudge position slightly — for spreading splitter children. */
  nudgePosition(dx: number, dz: number): void {
    this.pathX += dx;
    this.pathZ += dz;
    this.group.position.x += dx;
    this.group.position.z += dz;
  }

  update(delta: number): void {
    if (!this.alive || this.reachedGoal) return;

    // Tick status effects (slow + poison)
    const { poisonExpired } = this.statusEffects.update(delta, (amount) => {
      this.takeDamage(amount);
      return this.alive;
    });
    if (!this.alive) return;

    // Clear poison visual when no stacks left
    if (poisonExpired && !this.statusEffects.hasPoisonStacks && this.meshMaterial) {
      if (!this.config.isStealth || this.stealthState.isRevealed) {
        this.meshMaterial.emissive.setHex(0x000000);
        this.meshMaterial.emissiveIntensity = 0;
      }
    }

    this.movementState.x = this.pathX;
    this.movementState.z = this.pathZ;
    this.movementState.speed = this.config.speed;
    this.movementState.slowFactor = this.statusEffects.slowFactor;

    const result = this.movement.update(delta, this.movementState);
    this.pathX = this.movementState.x;
    this.pathZ = this.movementState.z;

    // Apply lateral offset perpendicular to path direction for crowd spread
    this.applyLateralOffset(this.movement.getWaypoints());

    if (result.reachedGoal) {
      this.reachedGoal = true;
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
    }
    if (this.meshMaterial) {
      this.meshMaterial.dispose();
    }
    this.healthBar.dispose();
  }
}
