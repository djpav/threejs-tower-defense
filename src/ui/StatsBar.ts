import { UIComponent } from "./UIComponent";
import { GameState } from "@/types";

export class StatsBar extends UIComponent {
  private levelEl: HTMLSpanElement;
  private goldEl: HTMLSpanElement;
  private livesEl: HTMLSpanElement;
  private waveEl: HTMLSpanElement;
  private totalWaves: number;

  constructor(state: GameState) {
    super("div");
    this.totalWaves = state.totalWaves;

    this.root.className =
      "flex gap-6 px-5 py-3 bg-black/55 backdrop-blur-sm text-white text-base font-semibold border-b border-white/10";

    this.levelEl = document.createElement("span");
    this.levelEl.className = "text-game-purple";

    this.goldEl = document.createElement("span");
    this.goldEl.className = "text-game-gold";

    this.livesEl = document.createElement("span");
    this.livesEl.className = "text-game-red";

    this.waveEl = document.createElement("span");
    this.waveEl.className = "text-game-blue";

    this.root.append(this.levelEl, this.goldEl, this.livesEl, this.waveEl);
    this.setLevel(state.level, state.levelName);
    this.setGold(state.gold);
    this.setLives(state.lives);
    this.setWave(state.wave);
  }

  setLevel(level: number, name: string): void {
    this.levelEl.textContent = `\u{1F3AF} Lv${level}: ${name}`;
  }

  setGold(gold: number): void {
    this.goldEl.textContent = `\u{1FA99} Gold: ${gold}`;
  }

  setLives(lives: number): void {
    this.livesEl.textContent = `\u2764 Lives: ${lives}`;
  }

  setWave(wave: number): void {
    this.waveEl.textContent = `\u{1F30A} Wave: ${wave}/${this.totalWaves}`;
  }
}
