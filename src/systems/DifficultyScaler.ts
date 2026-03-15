import { EventBus } from "@/core/EventBus";

/**
 * Adaptive difficulty scaling based on player performance.
 * Tracks kill efficiency and life loss rate to compute a multiplier
 * that scales enemy HP/speed for subsequent waves.
 *
 * - If the player is dominating (no lives lost, fast kills): difficulty rises
 * - If the player is struggling (losing lives): difficulty eases
 */
export class DifficultyScaler {
  private eventBus: EventBus;
  private totalKills = 0;
  private totalLeaks = 0;
  private wavesCompleted = 0;
  private currentMultiplier = 1.0;

  // Tuning constants
  private static readonly BASE_GROWTH = 0.03; // +3% per wave baseline
  private static readonly LEAK_PENALTY = -0.08; // -8% per leak
  private static readonly MIN_MULTIPLIER = 0.7;
  private static readonly MAX_MULTIPLIER = 1.8;

  private handleEnemyKilled: (data: { reward: number }) => void;
  private handleEnemyLeaked: (data: { damage: number }) => void;
  private handleWaveComplete: (data: { wave: number }) => void;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.handleEnemyKilled = () => {
      this.totalKills++;
    };

    this.handleEnemyLeaked = () => {
      this.totalLeaks++;
    };

    this.handleWaveComplete = ({ wave }) => {
      this.wavesCompleted = wave;
      this.recalculate();
    };

    this.eventBus.on("enemy-killed", this.handleEnemyKilled);
    this.eventBus.on("enemy-reached-goal", this.handleEnemyLeaked);
    this.eventBus.on("wave-complete", this.handleWaveComplete);
  }

  /** Current difficulty multiplier (applied to enemy HP/speed). */
  get multiplier(): number {
    return this.currentMultiplier;
  }

  /** Recalculate difficulty based on accumulated performance data. */
  private recalculate(): void {
    if (this.wavesCompleted === 0) return;

    // Kill efficiency: ratio of kills to total enemies encountered
    const totalEncountered = this.totalKills + this.totalLeaks;
    const killRate =
      totalEncountered > 0 ? this.totalKills / totalEncountered : 1;

    // Base growth per wave
    let mult = 1.0 + this.wavesCompleted * DifficultyScaler.BASE_GROWTH;

    // Adjust for performance:
    // High kill rate (>95%) = player is dominating, maintain growth
    // Low kill rate (<80%) = player is struggling, reduce difficulty
    if (killRate < 0.8) {
      mult += (killRate - 0.8) * 2; // reduce by up to -0.4 for very low kill rates
    }

    // Direct penalty for each leak
    mult += this.totalLeaks * DifficultyScaler.LEAK_PENALTY;

    // Clamp to bounds
    this.currentMultiplier = Math.max(
      DifficultyScaler.MIN_MULTIPLIER,
      Math.min(DifficultyScaler.MAX_MULTIPLIER, mult),
    );
  }

  /** Get current performance stats (for UI/debug display). */
  getStats(): {
    kills: number;
    leaks: number;
    waves: number;
    multiplier: number;
  } {
    return {
      kills: this.totalKills,
      leaks: this.totalLeaks,
      waves: this.wavesCompleted,
      multiplier: this.currentMultiplier,
    };
  }

  /** Reset for new level. */
  reset(): void {
    this.totalKills = 0;
    this.totalLeaks = 0;
    this.wavesCompleted = 0;
    this.currentMultiplier = 1.0;
  }

  dispose(): void {
    this.eventBus.off("enemy-killed", this.handleEnemyKilled);
    this.eventBus.off("enemy-reached-goal", this.handleEnemyLeaked);
    this.eventBus.off("wave-complete", this.handleWaveComplete);
  }
}
