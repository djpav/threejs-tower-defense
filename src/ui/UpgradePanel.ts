import { UIComponent } from "./UIComponent";
import { TowerInfo, TargetingPriority } from "@/types";

const PRIORITY_ORDER: TargetingPriority[] = [
  TargetingPriority.First,
  TargetingPriority.Nearest,
  TargetingPriority.Strongest,
  TargetingPriority.Weakest,
];

const PRIORITY_LABELS: Record<TargetingPriority, string> = {
  [TargetingPriority.First]: "First",
  [TargetingPriority.Nearest]: "Nearest",
  [TargetingPriority.Strongest]: "Strongest",
  [TargetingPriority.Weakest]: "Weakest",
};

export class UpgradePanel extends UIComponent {
  private titleEl: HTMLSpanElement;
  private statsEl: HTMLDivElement;
  private upgradeBtn: HTMLButtonElement;
  private sellBtn: HTMLButtonElement;
  private targetBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private currentInfo: TowerInfo | null = null;
  private onUpgrade: () => void;
  private onSell: () => void;
  private onClose: () => void;
  private onTargetingChange: ((priority: TargetingPriority) => void) | null = null;

  constructor(onUpgrade: () => void, onSell: () => void, onClose: () => void) {
    super("div");
    this.onUpgrade = onUpgrade;
    this.onSell = onSell;
    this.onClose = onClose;

    this.root.className =
      "fixed bottom-[52px] left-1/2 -translate-x-1/2 hidden items-center gap-4 px-5 py-3 panel-glass border-2 border-game-gold text-white font-game text-sm pointer-events-auto z-[11] select-none";

    // Title
    this.titleEl = document.createElement("span");
    this.titleEl.className = "text-base font-bold text-game-gold";

    // Stats
    this.statsEl = document.createElement("div");
    this.statsEl.className = "flex flex-col gap-0.5";

    // Upgrade button — CSS handles hover via .btn-upgrade:hover:not(:disabled)
    this.upgradeBtn = document.createElement("button");
    this.upgradeBtn.className = "btn-upgrade";
    this.upgradeBtn.addEventListener("click", this.handleUpgrade);

    // Sell button — CSS handles hover via .btn-sell:hover
    this.sellBtn = document.createElement("button");
    this.sellBtn.className = "btn-sell";
    this.sellBtn.addEventListener("click", this.handleSell);

    // Targeting priority button — CSS handles hover via .btn-target:hover
    this.targetBtn = document.createElement("button");
    this.targetBtn.className = "btn-target";
    this.targetBtn.addEventListener("click", this.handleTargetCycle);

    // Close button — CSS handles hover via .btn-close-panel:hover
    this.closeBtn = document.createElement("button");
    this.closeBtn.textContent = "\u2715";
    this.closeBtn.className = "btn-close-panel";
    this.closeBtn.addEventListener("click", this.handleClose);

    this.root.append(this.titleEl, this.statsEl, this.upgradeBtn, this.sellBtn, this.targetBtn, this.closeBtn);
  }

  showTower(info: TowerInfo, gold: number): void {
    this.currentInfo = info;
    this.root.style.display = "flex";

    this.titleEl.textContent = `${info.name} Lv${info.level}/${info.maxLevel}`;

    let stats = `DMG: ${info.damage}  RNG: ${info.range}  Rate: ${info.fireRate}`;
    if (info.splashRadius != null) stats += `  Splash: ${info.splashRadius}`;
    if (info.slowFactor != null) stats += `  Slow: ${Math.round(info.slowFactor * 100)}%`;
    if (info.slowDuration != null) stats += `  Dur: ${info.slowDuration}s`;
    if (info.chainCount != null) stats += `  Chain: ${info.chainCount}`;
    if (info.poisonDamage != null) stats += `  Poison: ${info.poisonDamage}/tick`;
    if (info.poisonDuration != null) stats += `  ${info.poisonDuration}s`;
    if (info.isPulse) stats += `  AoE Pulse`;
    this.statsEl.textContent = stats;

    // Sell button shows refund (75% of total invested)
    const refund = Math.floor(info.totalInvested * 0.75);
    this.sellBtn.textContent = `Sell ${refund}g`;

    // Targeting priority
    this.targetBtn.textContent = `Target: ${PRIORITY_LABELS[info.targetingPriority]}`;

    this.refreshUpgradeButton(gold);
  }

  /** Update just the affordability state without replacing info. */
  updateAffordability(gold: number): void {
    if (!this.currentInfo) return;
    this.refreshUpgradeButton(gold);
  }

  hide(): void {
    this.currentInfo = null;
    this.root.style.display = "none";
  }

  isVisible(): boolean {
    return this.currentInfo !== null;
  }

  private refreshUpgradeButton(gold: number): void {
    const info = this.currentInfo!;
    const isMax = info.level >= info.maxLevel || info.upgradeCost == null;

    if (isMax) {
      this.upgradeBtn.textContent = "MAX";
      this.upgradeBtn.disabled = true;
    } else {
      this.upgradeBtn.textContent = `Upgrade ${info.upgradeCost}g`;
      this.upgradeBtn.disabled = gold < info.upgradeCost!;
    }
  }

  setOnTargetingChange(cb: (priority: TargetingPriority) => void): void {
    this.onTargetingChange = cb;
  }

  private handleTargetCycle = (): void => {
    if (!this.currentInfo) return;
    const idx = PRIORITY_ORDER.indexOf(this.currentInfo.targetingPriority);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    this.currentInfo.targetingPriority = next;
    this.targetBtn.textContent = `Target: ${PRIORITY_LABELS[next]}`;
    this.onTargetingChange?.(next);
  };

  private handleUpgrade = (): void => {
    this.onUpgrade();
  };

  private handleSell = (): void => {
    this.onSell();
  };

  private handleClose = (): void => {
    this.onClose();
  };

  dispose(): void {
    this.upgradeBtn.removeEventListener("click", this.handleUpgrade);
    this.sellBtn.removeEventListener("click", this.handleSell);
    this.targetBtn.removeEventListener("click", this.handleTargetCycle);
    this.closeBtn.removeEventListener("click", this.handleClose);
    super.dispose();
  }
}
