import { UIComponent } from "./UIComponent";
import { TowerButton } from "./TowerButton";
import { TowerTooltip } from "./TowerTooltip";
import { TowerConfig } from "@/types";

export class TowerBar extends UIComponent {
  private buttons: TowerButton[] = [];
  private selectedIndex = 0;
  private onSelect: (config: TowerConfig) => void;
  private towers: TowerConfig[];
  private tooltip: TowerTooltip;

  constructor(towers: TowerConfig[], onSelect: (config: TowerConfig) => void) {
    super("div");
    this.towers = towers;
    this.onSelect = onSelect;

    this.root.className =
      "fixed bottom-[52px] left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 max-w-[95vw] pointer-events-auto z-[11]";

    this.tooltip = new TowerTooltip();

    for (let i = 0; i < towers.length; i++) {
      const hotkeyLabel = String(i + 1);
      const btn = new TowerButton(towers[i], () => this.select(i), hotkeyLabel);
      btn.setTooltip(this.tooltip);
      if (i === 0) btn.setSelected(true);
      this.buttons.push(btn);
      this.root.appendChild(btn.getElement());
    }
  }

  selectByIndex(index: number): void {
    if (index < 0 || index >= this.towers.length) return;
    this.select(index);
  }

  private select(index: number): void {
    this.buttons[this.selectedIndex].setSelected(false);
    this.selectedIndex = index;
    this.buttons[this.selectedIndex].setSelected(true);
    this.onSelect(this.towers[index]);
  }

  updateAffordability(gold: number): void {
    for (let i = 0; i < this.towers.length; i++) {
      this.buttons[i].setDisabled(gold < this.towers[i].cost);
    }
  }

  show(): void {
    this.root.style.display = "flex";
  }

  dispose(): void {
    for (const btn of this.buttons) btn.dispose();
    this.tooltip.dispose();
    super.dispose();
  }
}
