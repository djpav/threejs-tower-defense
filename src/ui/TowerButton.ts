import { UIComponent } from "./UIComponent";
import { TowerConfig } from "@/types";
import { TowerTooltip } from "./TowerTooltip";

export class TowerButton extends UIComponent {
  readonly config: TowerConfig;
  private selected = false;
  private disabled = false;
  private onClick: () => void;
  private tooltip: TowerTooltip | null = null;
  private touchTooltipVisible = false;
  private boundDismissTooltip: ((e: Event) => void) | null = null;

  constructor(config: TowerConfig, onClick: () => void, hotkeyLabel?: string) {
    super("button");
    this.config = config;
    this.onClick = onClick;

    this.root.className = "tower-btn";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = config.name;

    const costSpan = document.createElement("span");
    costSpan.className = "text-xs text-game-gold";
    costSpan.textContent = `${config.cost}g`;

    this.root.append(nameSpan, costSpan);

    if (hotkeyLabel) {
      const hotkeySpan = document.createElement("span");
      hotkeySpan.className = "text-[10px] text-game-gray-light mt-px bg-white/5 px-1.5 rounded max-sm:hidden";
      hotkeySpan.textContent = `[${hotkeyLabel}]`;
      this.root.appendChild(hotkeySpan);
    }
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("mouseenter", this.handleHover);
    this.root.addEventListener("mouseleave", this.handleLeave);
    this.root.addEventListener("touchstart", this.handleTouchStart, { passive: true });
  }

  private handleClick = (): void => {
    if (!this.disabled) this.onClick();
  };

  setSelected(value: boolean): void {
    this.selected = value;
    this.root.classList.toggle("tower-btn-selected", value);
  }

  setDisabled(value: boolean): void {
    this.disabled = value;
    this.root.classList.toggle("tower-btn-disabled", value);
  }

  setTooltip(tooltip: TowerTooltip): void {
    this.tooltip = tooltip;
  }

  private handleHover = (): void => {
    this.tooltip?.showFor(this.config, this.root);
  };

  private handleLeave = (): void => {
    this.tooltip?.hideTooltip();
  };

  /** Toggle tooltip visibility on touch; tap outside to dismiss. */
  private handleTouchStart = (): void => {
    if (!this.tooltip) return;

    if (this.touchTooltipVisible) {
      this.dismissTouchTooltip();
      return;
    }

    this.tooltip.showFor(this.config, this.root);
    this.touchTooltipVisible = true;

    // Dismiss when tapping anywhere else
    this.boundDismissTooltip = (e: Event) => {
      if (!this.root.contains(e.target as Node)) {
        this.dismissTouchTooltip();
      }
    };
    document.addEventListener("touchstart", this.boundDismissTooltip, { passive: true });
  };

  private dismissTouchTooltip(): void {
    this.tooltip?.hideTooltip();
    this.touchTooltipVisible = false;
    if (this.boundDismissTooltip) {
      document.removeEventListener("touchstart", this.boundDismissTooltip);
      this.boundDismissTooltip = null;
    }
  }

  dispose(): void {
    this.dismissTouchTooltip();
    this.root.removeEventListener("click", this.handleClick);
    this.root.removeEventListener("mouseenter", this.handleHover);
    this.root.removeEventListener("mouseleave", this.handleLeave);
    this.root.removeEventListener("touchstart", this.handleTouchStart);
    super.dispose();
  }
}
