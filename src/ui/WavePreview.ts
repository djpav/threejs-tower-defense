import { UIComponent } from "./UIComponent";
import { WaveConfig } from "@/types";

/** Maps bodyType to a simple shape label for the preview. */
function shapeLabel(bodyType?: string): string {
  switch (bodyType) {
    case "diamond": return "\u25C6";   // ◆
    case "cone": return "\u25B2";      // ▲
    case "cube": return "\u25A0";      // ■
    case "icosahedron": return "\u2B22"; // ⬢
    default: return "\u25CF";           // ●
  }
}

export class WavePreview extends UIComponent {
  private waves: WaveConfig[];
  private currentWave = 0;
  private labelEl: HTMLSpanElement;
  private entriesEl: HTMLDivElement;

  constructor(waves: WaveConfig[]) {
    super("div");
    this.waves = waves;

    this.root.className =
      "fixed top-12 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/65 border border-white/15 rounded-md text-white text-[13px] font-game pointer-events-none z-[11] select-none";

    this.labelEl = document.createElement("span");
    this.labelEl.className = "text-game-gray-light font-semibold whitespace-nowrap";

    this.entriesEl = document.createElement("div");
    this.entriesEl.className = "flex gap-1.5 flex-wrap";

    this.root.append(this.labelEl, this.entriesEl);
    this.renderWave();
  }

  /** Call when a wave completes to advance the preview. */
  setWave(completedWave: number): void {
    this.currentWave = completedWave;
    this.renderWave();
  }

  private renderWave(): void {
    this.entriesEl.innerHTML = "";

    if (this.currentWave >= this.waves.length) {
      this.labelEl.textContent = "Final wave!";
      return;
    }

    this.labelEl.textContent = `Next:`;
    const wave = this.waves[this.currentWave];

    for (const entry of wave.entries) {
      const badge = document.createElement("span");
      const color = entry.enemyConfig.color ?? 0xe74c3c;
      const hexColor = `#${color.toString(16).padStart(6, "0")}`;
      const shape = shapeLabel(entry.enemyConfig.bodyType);
      const tags: string[] = [];
      if (entry.enemyConfig.isFlying) tags.push("fly");
      if (entry.enemyConfig.isStealth) tags.push("stealth");
      if (entry.enemyConfig.healRadius) tags.push("heal");
      if (entry.enemyConfig.splitOnDeath) tags.push("split");

      badge.textContent = `${shape}${entry.count}${tags.length ? " " + tags.join(",") : ""}`;
      badge.className = "bg-white/8 px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap";
      badge.style.color = hexColor;
      this.entriesEl.appendChild(badge);
    }
  }
}
