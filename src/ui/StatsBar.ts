import { UIComponent } from "./UIComponent";
import { GameState, WaveConfig } from "@/types";

export class StatsBar extends UIComponent {
  private levelNumEl: HTMLSpanElement;
  private levelNameEl: HTMLSpanElement;
  private goldValueEl: HTMLSpanElement;
  private livesValueEl: HTMLSpanElement;
  private waveValueEl: HTMLSpanElement;
  private nextWaveEl: HTMLSpanElement;
  private totalWaves: number;
  private waves: WaveConfig[] = [];

  constructor(state: GameState) {
    super("div");
    this.totalWaves = state.totalWaves;

    this.root.className = "stats-bar";

    // Level badge — left side
    const levelEl = document.createElement("span");
    levelEl.className = "stats-level";
    this.levelNumEl = document.createElement("span");
    this.levelNumEl.className = "stats-level-num";
    this.levelNameEl = document.createElement("span");
    this.levelNameEl.className = "stats-level-name";
    // Next wave preview — sits inside level group, after name
    this.nextWaveEl = document.createElement("span");
    this.nextWaveEl.className = "stats-next-wave";

    levelEl.append(this.levelNumEl, this.levelNameEl, this.nextWaveEl);

    // Right-side stat chips container
    const chips = document.createElement("div");
    chips.className = "stats-chips";

    this.goldValueEl = this.createChip(chips, "stats-chip-gold", "\u{1FA99}");
    this.livesValueEl = this.createChip(chips, "stats-chip-lives", "\u2764\uFE0F");
    this.waveValueEl = this.createChip(chips, "stats-chip-wave", "\u{1F30A}");

    this.root.append(levelEl, chips);
    this.setLevel(state.level, state.levelName);
    this.setGold(state.gold);
    this.setLives(state.lives);
    this.setWave(state.wave);
  }

  private createChip(
    parent: HTMLElement,
    className: string,
    icon: string,
  ): HTMLSpanElement {
    const chip = document.createElement("div");
    chip.className = `stats-chip ${className}`;
    const iconEl = document.createElement("span");
    iconEl.className = "stats-chip-icon";
    iconEl.textContent = icon;
    const valueEl = document.createElement("span");
    valueEl.className = "stats-chip-value";
    chip.append(iconEl, valueEl);
    parent.appendChild(chip);
    return valueEl;
  }

  setLevel(level: number, name: string): void {
    this.levelNumEl.textContent = `Lv${level}`;
    this.levelNameEl.textContent = name;
  }

  setGold(gold: number): void {
    this.goldValueEl.textContent = String(gold);
  }

  setLives(lives: number): void {
    this.livesValueEl.textContent = String(lives);
  }

  setWave(wave: number): void {
    this.waveValueEl.textContent = `${wave}/${this.totalWaves}`;
    this.renderNextWave(wave);
  }

  setWaves(waves: WaveConfig[]): void {
    this.waves = waves;
    this.renderNextWave(0);
  }

  private renderNextWave(currentWave: number): void {
    this.nextWaveEl.textContent = "";
    if (this.waves.length === 0 || currentWave >= this.waves.length) {
      this.nextWaveEl.style.display = "none";
      return;
    }
    this.nextWaveEl.style.display = "";
    const wave = this.waves[currentWave];
    const parts: string[] = [];
    for (const entry of wave.entries) {
      const color = entry.enemyConfig.color ?? 0xe74c3c;
      const hex = `#${color.toString(16).padStart(6, "0")}`;
      const shape = entry.enemyConfig.bodyType === "diamond" ? "\u25C6"
        : entry.enemyConfig.bodyType === "cone" ? "\u25B2"
        : entry.enemyConfig.bodyType === "cube" ? "\u25A0"
        : entry.enemyConfig.bodyType === "icosahedron" ? "\u2B22"
        : "\u25CF";
      const badge = document.createElement("span");
      badge.textContent = `${shape}${entry.count}`;
      badge.style.color = hex;
      badge.className = "stats-next-badge";
      this.nextWaveEl.appendChild(badge);
    }
  }
}
