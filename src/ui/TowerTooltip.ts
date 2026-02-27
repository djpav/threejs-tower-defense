import { UIComponent } from "./UIComponent";
import { TowerConfig } from "@/types";

export class TowerTooltip extends UIComponent {
  constructor() {
    super("div");

    this.root.className = "tooltip-base";
    document.body.appendChild(this.root);
  }

  showFor(config: TowerConfig, anchorEl: HTMLElement): void {
    this.root.innerHTML = "";

    const dps = (config.damage * config.fireRate).toFixed(1);

    // Title
    const title = document.createElement("div");
    title.className = "font-bold text-[13px] mb-1";
    title.textContent = config.name;

    // Stats table
    const stats: string[] = [
      `Damage: ${config.damage}  |  Rate: ${config.fireRate}/s`,
      `DPS: ${dps}  |  Range: ${config.range}`,
    ];

    if (config.splashRadius) {
      stats.push(`Splash: ${config.splashRadius}m radius`);
    }
    if (config.slowFactor != null && config.slowDuration != null) {
      const pct = Math.round((1 - config.slowFactor) * 100);
      stats.push(`Slow: ${pct}% for ${config.slowDuration}s`);
    }
    if (config.chainCount) {
      stats.push(`Chain: ${config.chainCount} targets (${Math.round((config.chainDamageFalloff ?? 0.7) * 100)}% per hop)`);
    }
    if (config.poisonDamage != null && config.poisonDuration != null) {
      stats.push(`Poison: ${config.poisonDamage}/tick for ${config.poisonDuration}s (max ${config.poisonMaxStacks ?? 1} stacks)`);
    }
    if (config.isPulse) {
      stats.push("AoE pulse (no projectile)");
    }
    if (config.canTargetFlying === false) {
      stats.push("Cannot target flying");
    }

    this.root.appendChild(title);
    for (const line of stats) {
      const div = document.createElement("div");
      div.className = "text-game-gray-lighter";
      div.textContent = line;
      this.root.appendChild(div);
    }

    // Position above anchor (fall back to below if not enough room)
    const rect = anchorEl.getBoundingClientRect();
    this.root.style.display = "block";
    const tipRect = this.root.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));
    this.root.style.left = `${left}px`;

    const spaceAbove = rect.top - 6;
    if (spaceAbove >= tipRect.height) {
      this.root.style.bottom = `${window.innerHeight - rect.top + 6}px`;
      this.root.style.top = "";
    } else {
      this.root.style.top = `${rect.bottom + 6}px`;
      this.root.style.bottom = "";
    }
  }

  hideTooltip(): void {
    this.root.style.display = "none";
  }

  dispose(): void {
    this.root.remove();
  }
}
