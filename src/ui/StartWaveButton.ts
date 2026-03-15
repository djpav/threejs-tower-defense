import { UIComponent } from "./UIComponent";
import { CountdownTimer } from "@/utils/CountdownTimer";

const AUTO_START_DELAY = 2;

export class StartWaveButton extends UIComponent {
  private onClick: () => void;
  private countdown = new CountdownTimer();
  private mainBtn: HTMLButtonElement;
  private autoBtn: HTMLButtonElement;
  private _autoStart = false;
  private _ready = false;

  constructor(onClick: () => void) {
    super("div");
    this.onClick = onClick;

    this.root.className = "start-wave-container";

    this.mainBtn = document.createElement("button");
    this.mainBtn.className = "start-wave-main";
    this.mainBtn.textContent = "Start Wave";
    this.mainBtn.addEventListener("click", this.handleClick);

    this.autoBtn = document.createElement("button");
    this.autoBtn.className = "start-wave-auto";
    this.autoBtn.textContent = "Auto";
    this.autoBtn.dataset.active = "false";
    this.autoBtn.addEventListener("click", this.handleAutoClick);

    this.root.append(this.mainBtn, this.autoBtn);
  }

  get autoStart(): boolean {
    return this._autoStart;
  }

  toggleAutoStart(): void {
    this._autoStart = !this._autoStart;
    this.autoBtn.dataset.active = String(this._autoStart);

    if (this._ready) {
      if (this._autoStart) {
        this.startAutoCountdown();
      } else {
        this.countdown.clear();
        this.mainBtn.textContent = "Start Wave";
      }
    }
  }

  setWaveInProgress(): void {
    this._ready = false;
    this.countdown.clear();
    this.mainBtn.disabled = true;
    this.mainBtn.textContent = "Wave in progress...";
  }

  setReady(): void {
    this._ready = true;
    this.countdown.clear();
    this.mainBtn.disabled = false;

    if (this._autoStart) {
      this.startAutoCountdown();
    } else {
      this.mainBtn.textContent = "Start Wave";
    }
  }

  setGameOver(): void {
    this._ready = false;
    this.countdown.clear();
    this.mainBtn.disabled = true;
  }

  private startAutoCountdown(): void {
    this.countdown.start(
      AUTO_START_DELAY,
      (remaining) => { this.mainBtn.textContent = `Next Wave (${remaining}s)`; },
      () => { this.handleClick(); },
    );
  }

  private handleClick = (): void => {
    this.countdown.clear();
    this._ready = false;
    this.onClick();
    this.setWaveInProgress();
  };

  private handleAutoClick = (): void => {
    this.toggleAutoStart();
  };

  dispose(): void {
    this.countdown.clear();
    this.mainBtn.removeEventListener("click", this.handleClick);
    this.autoBtn.removeEventListener("click", this.handleAutoClick);
    super.dispose();
  }
}
