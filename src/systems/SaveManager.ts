const SAVE_KEY = "td-save-v1";

export interface LevelResult {
  completed: boolean;
  livesRemaining: number;
  wavesCompleted: number;
  totalWaves: number;
}

export interface SaveData {
  version: 1;
  levelResults: Record<number, LevelResult>;
}

function defaultSave(): SaveData {
  return { version: 1, levelResults: {} };
}

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== 1) return defaultSave();
      return parsed;
    } catch {
      return defaultSave();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }

  /** Record a level completion (win). Only updates if better than existing. */
  completeLevel(levelIndex: number, livesRemaining: number, wavesCompleted: number, totalWaves: number): void {
    const existing = this.data.levelResults[levelIndex];
    if (!existing || livesRemaining >= existing.livesRemaining) {
      this.data.levelResults[levelIndex] = {
        completed: true,
        livesRemaining,
        wavesCompleted,
        totalWaves,
      };
      this.persist();
    }
  }

  /** Record a level loss (for tracking progress). */
  recordAttempt(levelIndex: number, wavesCompleted: number, totalWaves: number): void {
    const existing = this.data.levelResults[levelIndex];
    if (!existing) {
      this.data.levelResults[levelIndex] = {
        completed: false,
        livesRemaining: 0,
        wavesCompleted,
        totalWaves,
      };
      this.persist();
    }
  }

  getLevelResult(levelIndex: number): LevelResult | undefined {
    return this.data.levelResults[levelIndex];
  }

  isLevelCompleted(levelIndex: number): boolean {
    return this.data.levelResults[levelIndex]?.completed ?? false;
  }

  /** Number of levels completed. */
  get completedCount(): number {
    return Object.values(this.data.levelResults).filter(r => r.completed).length;
  }

  clearAll(): void {
    this.data = defaultSave();
    this.persist();
  }
}
