interface PoisonStack {
  damage: number;
  tickRate: number;
  remaining: number;
  tickTimer: number;
}

export interface StatusEffectResult {
  poisonDamage: number;
  poisonExpired: boolean;
}

export class StatusEffects {
  private slowTimer = 0;
  private currentSlowFactor = 1;
  private poisonStacks: PoisonStack[] = [];

  get slowFactor(): number {
    return this.currentSlowFactor;
  }

  get poisonStackCount(): number {
    return this.poisonStacks.length;
  }

  get hasPoisonStacks(): boolean {
    return this.poisonStacks.length > 0;
  }

  applySlow(factor: number, duration: number): void {
    // Keep the stronger (lower factor) slow effect
    if (factor < this.currentSlowFactor || this.slowTimer <= 0) {
      this.currentSlowFactor = factor;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  applyPoison(damage: number, duration: number, tickRate: number, maxStacks: number): void {
    if (this.poisonStacks.length < maxStacks) {
      this.poisonStacks.push({ damage, tickRate, remaining: duration, tickTimer: 0 });
    } else {
      // Refresh the oldest stack
      const oldest = this.poisonStacks[0];
      oldest.damage = damage;
      oldest.remaining = duration;
      oldest.tickRate = tickRate;
    }
  }

  /** Returns total poison damage dealt this tick and whether any stacks expired. */
  update(delta: number, applyDamage: (amount: number) => boolean): StatusEffectResult {
    let poisonDamage = 0;
    let poisonExpired = false;

    // Tick slow timer
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.currentSlowFactor = 1;
      }
    }

    // Tick poison stacks
    for (let i = this.poisonStacks.length - 1; i >= 0; i--) {
      const stack = this.poisonStacks[i];
      stack.remaining -= delta;
      stack.tickTimer += delta;
      if (stack.tickTimer >= stack.tickRate) {
        stack.tickTimer -= stack.tickRate;
        poisonDamage += stack.damage;
        const alive = applyDamage(stack.damage);
        if (!alive) return { poisonDamage, poisonExpired: false };
      }
      if (stack.remaining <= 0) {
        this.poisonStacks.splice(i, 1);
        poisonExpired = true;
      }
    }

    return { poisonDamage, poisonExpired };
  }
}
