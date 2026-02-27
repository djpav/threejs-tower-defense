import { GameState } from "@/types";
import { EventBus } from "@/core/EventBus";
import { STARTING_GOLD, STARTING_LIVES } from "@/configs/GameBalanceConfigs";

export interface GameStateOptions {
  startingGold?: number;
  startingLives?: number;
  level?: number;
  levelName?: string;
}

export class GameStateManager {
  private state: GameState;
  private eventBus: EventBus;
  private handleEnemyKilled: (data: { reward: number }) => void;
  private handleEnemyReachedGoal: (data: { damage: number }) => void;
  private handleWaveComplete: (data: { wave: number }) => void;

  constructor(eventBus: EventBus, totalWaves: number, options: GameStateOptions = {}) {
    this.eventBus = eventBus;
    this.state = {
      gold: options.startingGold ?? STARTING_GOLD,
      lives: options.startingLives ?? STARTING_LIVES,
      wave: 0,
      totalWaves,
      level: options.level ?? 1,
      levelName: options.levelName ?? "",
      isGameOver: false,
      isWin: false,
    };

    this.handleEnemyKilled = ({ reward }) => {
      this.addGold(reward);
    };

    this.handleEnemyReachedGoal = ({ damage }) => {
      this.loseLives(damage);
    };

    this.handleWaveComplete = ({ wave }) => {
      this.state.wave = wave;
      if (wave >= totalWaves) {
        this.state.isWin = true;
        this.state.isGameOver = true;
        this.eventBus.emit("game-over", { win: true });
      }
    };

    this.eventBus.on("enemy-killed", this.handleEnemyKilled);
    this.eventBus.on("enemy-reached-goal", this.handleEnemyReachedGoal);
    this.eventBus.on("wave-complete", this.handleWaveComplete);
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  get gold(): number {
    return this.state.gold;
  }

  get lives(): number {
    return this.state.lives;
  }

  canAfford(cost: number): boolean {
    return this.state.gold >= cost;
  }

  spendGold(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.state.gold -= amount;
    this.eventBus.emit("gold-changed", { gold: this.state.gold });
    return true;
  }

  addGold(amount: number): void {
    this.state.gold += amount;
    this.eventBus.emit("gold-changed", { gold: this.state.gold });
  }

  private loseLives(amount: number): void {
    if (this.state.isGameOver) return;
    this.state.lives -= amount;
    this.eventBus.emit("lives-changed", { lives: this.state.lives });

    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.state.isGameOver = true;
      this.state.isWin = false;
      this.eventBus.emit("game-over", { win: false });
    }
  }

  dispose(): void {
    this.eventBus.off("enemy-killed", this.handleEnemyKilled);
    this.eventBus.off("enemy-reached-goal", this.handleEnemyReachedGoal);
    this.eventBus.off("wave-complete", this.handleWaveComplete);
  }
}
