import { UIComponent } from "./UIComponent";
import { CountdownTimer } from "@/utils/CountdownTimer";

const NEXT_LEVEL_DELAY = 20;

export class MessageOverlay extends UIComponent {
  private countdown = new CountdownTimer();
  private _autoStart = false;

  constructor() {
    super("div");
    this.root.className = "message-overlay";
  }

  get autoStart(): boolean {
    return this._autoStart;
  }

  toggleAutoStart(): void {
    this._autoStart = !this._autoStart;

    // Update visible toggle if present
    const toggle = this.root.querySelector(".next-level-auto") as HTMLButtonElement | null;
    if (toggle) {
      toggle.dataset.active = String(this._autoStart);
    }

    // Start or cancel countdown on the visible button if overlay is showing
    const mainBtn = this.root.querySelector(".next-level-main") as HTMLButtonElement | null;
    if (mainBtn && mainBtn.dataset.proceed === "true") {
      if (this._autoStart) {
        this.startCountdown(mainBtn);
      } else {
        this.countdown.clear();
        mainBtn.textContent = "Next Level";
      }
    }
  }

  showVictory(): void {
    this.countdown.clear();
    this.root.innerHTML = "";
    this.root.textContent = "Victory!";
    this.root.style.color = "#2ecc71";
    this.root.dataset.visible = "true";
  }

  showDefeat(): void {
    this.countdown.clear();
    this.root.innerHTML = "";
    this.root.textContent = "Game Over";
    this.root.style.color = "#e74c3c";
    this.root.dataset.visible = "true";
  }

  showLevelComplete(
    levelName: string,
    livesRemaining: number,
    startingLives: number,
    wavesCompleted: number,
    onNextLevel: () => void,
  ): void {
    this.countdown.clear();
    this.root.innerHTML = "";
    this.root.style.color = "#2ecc71";
    this.root.dataset.visible = "true";

    const title = document.createElement("div");
    title.className = "text-[64px]";
    title.textContent = `${levelName} Complete!`;

    // Star rating
    const ratio = livesRemaining / startingLives;
    const stars = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1;
    const starEl = document.createElement("div");
    starEl.className = "text-5xl tracking-[8px]";
    for (let i = 0; i < 3; i++) {
      const s = document.createElement("span");
      s.textContent = i < stars ? "\u2605" : "\u2606";
      s.className = i < stars ? "text-game-gold" : "text-game-gray";
      s.style.animation = i < stars ? `star-pop 0.4s ease-out ${i * 0.15}s both` : "";
      starEl.appendChild(s);
    }

    // Stats
    const statsEl = document.createElement("div");
    statsEl.className = "text-[22px] font-normal text-game-gray-lighter text-center leading-[1.8]";
    statsEl.innerHTML = `
      Lives: ${livesRemaining}/${startingLives}<br>
      Waves: ${wavesCompleted}
    `;

    const proceed = () => {
      this.countdown.clear();
      this.hide();
      onNextLevel();
    };

    // Split button container
    const container = document.createElement("div");
    container.className = "next-level-container";

    const mainBtn = document.createElement("button");
    mainBtn.className = "next-level-main";
    mainBtn.dataset.proceed = "true";
    mainBtn.addEventListener("click", proceed);

    const autoBtn = document.createElement("button");
    autoBtn.className = "next-level-auto";
    autoBtn.textContent = "Auto";
    autoBtn.dataset.active = String(this._autoStart);
    autoBtn.addEventListener("click", () => this.toggleAutoStart());

    container.append(mainBtn, autoBtn);

    if (this._autoStart) {
      this.startCountdown(mainBtn);
    } else {
      mainBtn.textContent = "Next Level";
    }

    this.root.append(title, starEl, statsEl, container);
  }

  private startCountdown(btn: HTMLButtonElement): void {
    this.countdown.start(
      NEXT_LEVEL_DELAY,
      (remaining) => { btn.textContent = `Next Level (${remaining}s)`; },
      () => { btn.click(); },
    );
  }

  hide(): void {
    this.countdown.clear();
    this.root.dataset.visible = "false";
    this.root.innerHTML = "";
  }

  dispose(): void {
    this.countdown.clear();
    super.dispose();
  }
}
