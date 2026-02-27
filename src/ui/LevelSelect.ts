import { UIComponent } from "./UIComponent";
import { LEVEL_CONFIGS } from "@/configs/LevelConfigs";
import { Difficulty } from "@/types";
import { SaveManager, LevelResult } from "@/systems/SaveManager";

/** Compute 1-3 stars based on lives remaining vs starting lives. */
function computeStars(result: LevelResult, startingLives: number): number {
  if (!result.completed) return 0;
  const ratio = result.livesRemaining / startingLives;
  if (ratio >= 1) return 3;       // Perfect — no lives lost
  if (ratio >= 0.5) return 2;     // Lost fewer than half
  return 1;                        // Completed
}

function starHTML(count: number): string {
  const filled = "\u2605"; // ★
  const empty = "\u2606";  // ☆
  let html = '<div class="mt-1.5 text-lg tracking-[2px]">';
  for (let i = 0; i < 3; i++) {
    const color = i < count ? "text-game-gold" : "text-game-gray";
    html += `<span class="${color}">${i < count ? filled : empty}</span>`;
  }
  html += "</div>";
  return html;
}

export class LevelSelect extends UIComponent {
  private onSelect: (levelIndex: number, difficulty: Difficulty) => void;
  private saveManager: SaveManager;
  private cleanupFns: (() => void)[] = [];
  private cards: HTMLButtonElement[] = [];
  private selectedDifficulty: Difficulty = Difficulty.Normal;
  private diffBtns: HTMLButtonElement[] = [];

  constructor(onSelect: (levelIndex: number, difficulty: Difficulty) => void, saveManager: SaveManager) {
    super("div");
    this.onSelect = onSelect;
    this.saveManager = saveManager;

    this.root.className =
      "fixed inset-0 flex items-center justify-center flex-col gap-8 bg-[rgba(10,10,30,0.92)] z-[100] font-game";

    this.buildContent();
    document.body.appendChild(this.root);
  }

  private cardHTML(index: number): string {
    const cfg = LEVEL_CONFIGS[index];
    const result = this.saveManager.getLevelResult(index);
    const stars = result?.completed ? starHTML(computeStars(result, cfg.startingLives)) : "";
    return `
      <div class="text-sm opacity-60 mb-1">Level ${cfg.level}</div>
      <div class="text-xl font-bold mb-2">${cfg.name}</div>
      <div class="text-[13px] opacity-80 leading-relaxed">
        ${cfg.cols}&times;${cfg.rows} grid<br>
        ${cfg.waves.length} waves<br>
        ${cfg.startingGold} gold &bull; ${cfg.startingLives} lives
      </div>
      ${stars}
    `;
  }

  private buildContent(): void {
    const title = document.createElement("h1");
    title.textContent = "Select Level";
    title.className = "m-0 text-5xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]";

    // Difficulty selector
    const diffRow = document.createElement("div");
    diffRow.className = "flex gap-3 items-center";

    const diffLabel = document.createElement("span");
    diffLabel.textContent = "Difficulty:";
    diffLabel.className = "text-game-gray-light text-base font-semibold";
    diffRow.appendChild(diffLabel);

    const diffColors: Record<Difficulty, string> = {
      [Difficulty.Easy]: "#2ecc71",
      [Difficulty.Normal]: "#f1c40f",
      [Difficulty.Hard]: "#e74c3c",
    };

    for (const diff of [Difficulty.Easy, Difficulty.Normal, Difficulty.Hard]) {
      const btn = document.createElement("button");
      btn.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
      btn.className = "diff-btn";
      const isActive = diff === this.selectedDifficulty;
      if (isActive) {
        btn.style.color = "#fff";
        btn.style.background = diffColors[diff];
        btn.style.borderColor = diffColors[diff];
      }

      btn.addEventListener("click", () => {
        this.selectedDifficulty = diff;
        this.diffBtns.forEach((b, i) => {
          const d = [Difficulty.Easy, Difficulty.Normal, Difficulty.Hard][i];
          const active = d === diff;
          b.style.color = active ? "#fff" : "";
          b.style.background = active ? diffColors[d] : "";
          b.style.borderColor = active ? diffColors[d] : "";
        });
      });

      this.diffBtns.push(btn);
      diffRow.appendChild(btn);
    }

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-3 gap-4 max-w-[720px] w-[90%]";

    LEVEL_CONFIGS.forEach((_cfg, index) => {
      const card = document.createElement("button");
      card.innerHTML = this.cardHTML(index);
      card.className = "level-card";
      this.cards.push(card);

      const onClick = () => {
        this.onSelect(index, this.selectedDifficulty);
      };
      card.addEventListener("click", onClick);
      this.cleanupFns.push(() => {
        card.removeEventListener("click", onClick);
      });

      grid.appendChild(card);
    });

    // Endless mode button
    const endlessBtn = document.createElement("button");
    endlessBtn.innerHTML = `
      <span class="text-2xl font-bold">Endless Mode</span><br>
      <span class="text-[13px] opacity-70">Infinite waves with scaling difficulty</span>
    `;
    endlessBtn.className = "btn-endless";

    const onEndlessClick = () => {
      this.onSelect(-1, this.selectedDifficulty);
    };
    endlessBtn.addEventListener("click", onEndlessClick);
    this.cleanupFns.push(() => {
      endlessBtn.removeEventListener("click", onEndlessClick);
    });

    this.root.append(title, diffRow, grid, endlessBtn);
  }

  /** Refresh completion badges from save data. */
  refresh(): void {
    LEVEL_CONFIGS.forEach((_cfg, index) => {
      const card = this.cards[index];
      if (!card) return;
      card.innerHTML = this.cardHTML(index);
    });
  }

  show(): void {
    this.root.style.display = "flex";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  override dispose(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];
    super.dispose();
  }
}
