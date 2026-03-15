import { UIComponent } from "./UIComponent";
import { SoldTowerData } from "@/types";

const UNDO_DURATION_MS = 3000;

export class SellUndoToast extends UIComponent {
  private messageEl: HTMLSpanElement;
  private undoBtn: HTMLButtonElement;
  private progressBar: HTMLDivElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private animationFrame: number | null = null;

  private currentData: SoldTowerData | null = null;
  private onUndo: (data: SoldTowerData) => void;

  constructor(onUndo: (data: SoldTowerData) => void) {
    super("div");
    this.onUndo = onUndo;

    this.root.className =
      "sell-undo-toast";

    // Message text: "Tower sold for Xg"
    this.messageEl = document.createElement("span");
    this.messageEl.className = "text-sm text-white/90";

    // Undo button
    this.undoBtn = document.createElement("button");
    this.undoBtn.className = "sell-undo-btn";
    this.undoBtn.textContent = "Undo";
    this.undoBtn.addEventListener("click", this.handleUndo);

    // Countdown progress bar
    this.progressBar = document.createElement("div");
    this.progressBar.className = "sell-undo-progress";

    this.root.append(this.messageEl, this.undoBtn, this.progressBar);

    // Start hidden
    this.root.style.display = "none";
  }

  showSell(data: SoldTowerData): void {
    // Cancel any existing undo timer
    this.clearTimer();

    this.currentData = data;
    this.messageEl.textContent = `Tower sold for ${data.refund}g`;
    this.root.style.display = "flex";

    // Reset and start progress bar animation
    this.progressBar.style.transition = "none";
    this.progressBar.style.width = "100%";

    // Force reflow before starting animation
    this.animationFrame = requestAnimationFrame(() => {
      this.progressBar.style.transition = `width ${UNDO_DURATION_MS}ms linear`;
      this.progressBar.style.width = "0%";
      this.animationFrame = null;
    });

    // Auto-dismiss after duration
    this.timer = setTimeout(() => {
      this.dismiss();
    }, UNDO_DURATION_MS);
  }

  /** Silently dismiss without triggering undo (e.g., cell is now occupied). */
  dismiss(): void {
    this.clearTimer();
    this.currentData = null;
    this.root.style.display = "none";
  }

  /** Check if an undo is pending for a specific grid position. */
  hasPendingUndoAt(row: number, col: number): boolean {
    return (
      this.currentData !== null &&
      this.currentData.gridPos.row === row &&
      this.currentData.gridPos.col === col
    );
  }

  private handleUndo = (): void => {
    if (!this.currentData) return;
    const data = this.currentData;
    this.clearTimer();
    this.currentData = null;
    this.root.style.display = "none";
    this.onUndo(data);
  };

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  dispose(): void {
    this.clearTimer();
    this.undoBtn.removeEventListener("click", this.handleUndo);
    super.dispose();
  }
}
