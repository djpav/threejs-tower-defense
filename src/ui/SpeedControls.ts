import { UIComponent } from "./UIComponent";

export interface SpeedControlsCallbacks {
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: number) => void;
}

const SPEEDS = [1, 2, 4];

export class SpeedControls extends UIComponent {
  private buttons: HTMLButtonElement[] = [];
  private pauseBtn: HTMLButtonElement;
  private pausedOverlay: HTMLDivElement;
  private activeSpeedIndex = 0;
  private isPaused = false;
  private isGameOver = false;
  private callbacks: SpeedControlsCallbacks;

  constructor(callbacks: SpeedControlsCallbacks) {
    super("div");
    this.callbacks = callbacks;

    this.root.className =
      "fixed top-12 right-12 flex gap-1 pointer-events-auto z-[12]";

    // Pause button
    this.pauseBtn = this.createButton("\u23F8", () => this.togglePause());
    this.root.appendChild(this.pauseBtn);

    // Speed buttons
    for (let i = 0; i < SPEEDS.length; i++) {
      const label = SPEEDS[i] === 1 ? "\u25B6" : `${SPEEDS[i]}x`;
      const btn = this.createButton(label, () => this.selectSpeed(i));
      this.buttons.push(btn);
      this.root.appendChild(btn);
    }
    this.highlightActive();

    // PAUSED overlay
    this.pausedOverlay = document.createElement("div");
    this.pausedOverlay.className =
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-white/25 tracking-[8px] pointer-events-none z-[9] hidden font-game select-none";
    this.pausedOverlay.textContent = "PAUSED";
    document.body.appendChild(this.pausedOverlay);
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = "speed-btn";
    btn.addEventListener("click", onClick);
    return btn;
  }

  private selectSpeed(index: number): void {
    if (this.isGameOver) return;
    this.activeSpeedIndex = index;
    this.callbacks.onSetSpeed(SPEEDS[index]);
    if (this.isPaused) {
      this.isPaused = false;
      this.callbacks.onResume();
      this.pausedOverlay.classList.add("hidden");
      this.pauseBtn.textContent = "\u23F8";
      this.pauseBtn.dataset.paused = "false";
    }
    this.highlightActive();
  }

  togglePause(): void {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.callbacks.onPause();
      this.pausedOverlay.classList.remove("hidden");
      this.pauseBtn.textContent = "\u25B6";
      this.pauseBtn.dataset.paused = "true";
    } else {
      this.callbacks.onResume();
      this.pausedOverlay.classList.add("hidden");
      this.pauseBtn.textContent = "\u23F8";
      this.pauseBtn.dataset.paused = "false";
    }
  }

  setGameOver(): void {
    this.isGameOver = true;
    this.pauseBtn.classList.add("opacity-40", "!cursor-default");
    for (const btn of this.buttons) {
      btn.classList.add("opacity-40", "!cursor-default");
    }
  }

  private highlightActive(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].dataset.active = String(i === this.activeSpeedIndex);
    }
  }

  dispose(): void {
    this.pausedOverlay.remove();
    super.dispose();
  }
}
