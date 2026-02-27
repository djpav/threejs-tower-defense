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
import { StatusEffects, HealthBar, StealthState } from "./components";

function createBodyGeometry(
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
  readonly config: EnemyConfig;
  private mesh: Mesh;
  private meshMaterial: MeshStandardMaterial;
  private group: Group;
  private healthBar: HealthBar;
  private statusEffects = new StatusEffects();
  private stealthState = new StealthState();

  private waypoints: WorldPosition[];
  private _waypointIndex = 0;
  hp: number;
  alive = true;
  reachedGoal = false;

  // Healer timer
  private healTimer = 0;

  // Flying elevation
  private readonly flyingY: number;

  /** How far along the path this enemy is (higher = further) */
  get pathProgress(): number {
    if (this._waypointIndex >= this.waypoints.length) return this.waypoints.length;
    const target = this.waypoints[this._waypointIndex];
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const distToNext = Math.sqrt(dx * dx + dz * dz);
    return this._waypointIndex + (1 - Math.min(distToNext, 1));
  }

  get waypointIndex(): number {
    return this._waypointIndex;
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

    this.waypoints = waypoints;

    this.group = new Group();
    this.group.userData.entity = this;

    // Enemy body - configurable shape and color
    const geometry = createBodyGeometry(config.bodyType, config.radius);
    this.meshMaterial = new MeshStandardMaterial({ color: config.color ?? 0xe74c3c });
    this.mesh = new Mesh(geometry, this.meshMaterial);
    this.mesh.position.y = config.radius + 0.1;
    this.group.add(this.mesh);

    // Health bar
    this.healthBar = new HealthBar(config.radius * 2 + 0.35);
    this.group.add(this.healthBar.sprite);

    // Set start position
    if (this.waypoints.length > 0) {
      this.group.position.set(this.waypoints[0].x, this.flyingY, this.waypoints[0].z);
      this._waypointIndex = 1;
    }

    // Stealth: start near-invisible
    if (config.isStealth) {
      this.meshMaterial.transparent = true;
      this.meshMaterial.opacity = 0.15;
      this.healthBar.hide();
    }

    this.healthBar.update(this.hp, this.config.hp);
    this.object3D = this.group;
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
    if (!this.config.isStealth || this.stealthState.isRevealed) {
      this.meshMaterial.emissive.setHex(0x27ae60);
      this.meshMaterial.emissiveIntensity = 0.3 + this.statusEffects.poisonStackCount * 0.15;
    }
  }

  /** Stealth: reveal this enemy (called when near a tower). */
  reveal(): void {
    if (!this.config.isStealth) return;
    this.stealthState.reveal(this.meshMaterial, this.healthBar, this.statusEffects.hasPoisonStacks);
  }

  /** Stealth: conceal this enemy again. */
  conceal(): void {
    if (!this.config.isStealth) return;
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
    this.group.position.x = x;
    this.group.position.z = z;
    this._waypointIndex = Math.min(wpIndex, this.waypoints.length);
  }

  /** Nudge position slightly — for spreading splitter children. */
  nudgePosition(dx: number, dz: number): void {
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
    if (poisonExpired && !this.statusEffects.hasPoisonStacks) {
      if (!this.config.isStealth || this.stealthState.isRevealed) {
        this.meshMaterial.emissive.setHex(0x000000);
        this.meshMaterial.emissiveIntensity = 0;
      }
    }

    if (this._waypointIndex >= this.waypoints.length) {
      this.reachedGoal = true;
      return;
    }

    const effectiveSpeed = this.config.speed * this.statusEffects.slowFactor;
    let remaining = effectiveSpeed * delta;

    // Advance through as many waypoints as the step allows
    while (remaining > 0 && this._waypointIndex < this.waypoints.length) {
      const target = this.waypoints[this._waypointIndex];
      const dx = target.x - this.group.position.x;
      const dz = target.z - this.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= remaining) {
        this.group.position.x = target.x;
        this.group.position.z = target.z;
        this._waypointIndex++;
        remaining -= dist;
      } else {
        this.group.position.x += (dx / dist) * remaining;
        this.group.position.z += (dz / dist) * remaining;
        remaining = 0;
      }
    }

    if (this._waypointIndex >= this.waypoints.length) {
      this.reachedGoal = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.meshMaterial.dispose();
    this.healthBar.dispose();
  }
}
