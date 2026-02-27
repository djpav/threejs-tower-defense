import { UIComponent } from "./UIComponent";
import { EnemyInfo } from "@/types";

export class EnemyInfoPanel extends UIComponent {
  private titleEl: HTMLSpanElement;
  private colorDot: HTMLSpanElement;
  private hpBarFill: HTMLDivElement;
  private hpLabel: HTMLSpanElement;
  private statsEl: HTMLDivElement;
  private effectsEl: HTMLDivElement;
  private closeBtn: HTMLButtonElement;
  private onClose: () => void;

  constructor(onClose: () => void) {
    super("div");
    this.onClose = onClose;

    this.root.className =
      "fixed bottom-[52px] left-1/2 -translate-x-1/2 hidden items-center gap-4 px-5 py-3 panel-glass border-2 border-game-gold text-white font-game text-sm pointer-events-auto z-[11] select-none";

    // Color dot + title
    this.colorDot = document.createElement("span");
    this.colorDot.className = "inline-block w-3 h-3 rounded-full mr-1.5 align-middle";

    this.titleEl = document.createElement("span");
    this.titleEl.className = "text-base font-bold text-game-gold";

    const titleWrap = document.createElement("div");
    titleWrap.className = "flex items-center";
    titleWrap.append(this.colorDot, this.titleEl);

    // HP bar
    const hpBarOuter = document.createElement("div");
    hpBarOuter.className = "w-28 h-3 bg-black/50 rounded-sm overflow-hidden border border-white/20";
    this.hpBarFill = document.createElement("div");
    this.hpBarFill.className = "h-full transition-[width] duration-150";
    hpBarOuter.appendChild(this.hpBarFill);

    this.hpLabel = document.createElement("span");
    this.hpLabel.className = "text-xs opacity-80";

    const hpWrap = document.createElement("div");
    hpWrap.className = "flex flex-col items-center gap-0.5";
    hpWrap.append(hpBarOuter, this.hpLabel);

    // Stats (speed, reward)
    this.statsEl = document.createElement("div");
    this.statsEl.className = "flex flex-col gap-0.5 text-xs";

    // Status effects
    this.effectsEl = document.createElement("div");
    this.effectsEl.className = "flex gap-1.5 text-xs";

    // Close button
    this.closeBtn = document.createElement("button");
    this.closeBtn.textContent = "\u2715";
    this.closeBtn.className = "btn-close-panel";
    this.closeBtn.addEventListener("click", this.handleClose);

    this.root.append(titleWrap, hpWrap, this.statsEl, this.effectsEl, this.closeBtn);
  }

  showEnemy(info: EnemyInfo): void {
    this.root.style.display = "flex";

    this.titleEl.textContent = info.name;
    this.colorDot.style.backgroundColor = `#${info.color.toString(16).padStart(6, "0")}`;

    // HP bar
    const pct = info.maxHp > 0 ? info.hp / info.maxHp : 0;
    this.hpBarFill.style.width = `${(pct * 100).toFixed(1)}%`;
    this.hpBarFill.style.backgroundColor =
      pct > 0.5 ? "#2ecc71" : pct > 0.25 ? "#f39c12" : "#e74c3c";
    this.hpLabel.textContent = `${Math.ceil(info.hp)} / ${info.maxHp} HP`;

    // Stats
    this.statsEl.textContent = "";
    const speedLine = document.createElement("span");
    speedLine.textContent = `Speed: ${info.speed.toFixed(1)}`;
    const rewardLine = document.createElement("span");
    rewardLine.textContent = `Reward: ${info.reward}g`;
    this.statsEl.append(speedLine, rewardLine);

    // Status effects
    this.effectsEl.textContent = "";
    if (info.slowFactor < 1) {
      this.effectsEl.appendChild(this.makeTag(`Slowed ${Math.round(info.slowFactor * 100)}%`, "#3498db"));
    }
    if (info.poisonStacks > 0) {
      this.effectsEl.appendChild(this.makeTag(`Poison \u00d7${info.poisonStacks}`, "#27ae60"));
    }
    if (info.isFlying) {
      this.effectsEl.appendChild(this.makeTag("Flying", "#9b59b6"));
    }
    if (info.isStealth && !info.isRevealed) {
      this.effectsEl.appendChild(this.makeTag("Stealth", "#7f8c8d"));
    }
    if (info.isStealth && info.isRevealed) {
      this.effectsEl.appendChild(this.makeTag("Revealed", "#e67e22"));
    }
  }

  private makeTag(text: string, color: string): HTMLSpanElement {
    const tag = document.createElement("span");
    tag.textContent = text;
    tag.style.color = color;
    tag.className = "px-1.5 py-0.5 rounded bg-black/40 border border-white/10";
    return tag;
  }

  hide(): void {
    this.root.style.display = "none";
  }

  private handleClose = (): void => {
    this.onClose();
  };

  dispose(): void {
    this.closeBtn.removeEventListener("click", this.handleClose);
    super.dispose();
  }
}
