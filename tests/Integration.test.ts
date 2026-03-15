import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@/core/EventBus";
import { GameStateManager } from "@/systems/GameStateManager";
import { DifficultyScaler } from "@/systems/DifficultyScaler";

describe("Integration: System interactions via EventBus", () => {
  describe("enemy kill -> gold change -> game state", () => {
    it("increases gold when an enemy is killed", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingGold: 100 });

      bus.emit("enemy-killed", { reward: 10 });

      expect(gsm.getState().gold).toBe(110);
    });

    it("emits gold-changed when enemy-killed is received", () => {
      const bus = new EventBus();
      new GameStateManager(bus, 5, { startingGold: 100 });
      const goldListener = vi.fn();
      bus.on("gold-changed", goldListener);

      bus.emit("enemy-killed", { reward: 10 });

      expect(goldListener).toHaveBeenCalledWith({ gold: 110 });
    });

    it("accumulates gold from multiple kills", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingGold: 100 });

      bus.emit("enemy-killed", { reward: 10 });
      bus.emit("enemy-killed", { reward: 15 });
      bus.emit("enemy-killed", { reward: 5 });

      expect(gsm.getState().gold).toBe(130);
    });
  });

  describe("enemy leak -> lives decrease -> game over", () => {
    it("triggers game over when lives reach zero", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingLives: 1 });
      const gameOverListener = vi.fn();
      bus.on("game-over", gameOverListener);

      bus.emit("enemy-reached-goal", { damage: 1 });

      const state = gsm.getState();
      expect(state.lives).toBe(0);
      expect(state.isGameOver).toBe(true);
      expect(state.isWin).toBe(false);
      expect(gameOverListener).toHaveBeenCalledWith({ win: false });
    });

    it("emits lives-changed before game-over", () => {
      const bus = new EventBus();
      new GameStateManager(bus, 5, { startingLives: 1 });
      const callOrder: string[] = [];
      bus.on("lives-changed", () => callOrder.push("lives-changed"));
      bus.on("game-over", () => callOrder.push("game-over"));

      bus.emit("enemy-reached-goal", { damage: 1 });

      expect(callOrder).toEqual(["lives-changed", "game-over"]);
    });
  });

  describe("wave complete -> game win", () => {
    it("wins when final wave is completed", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 3);
      const gameOverListener = vi.fn();
      bus.on("game-over", gameOverListener);

      bus.emit("wave-complete", { wave: 3 });

      const state = gsm.getState();
      expect(state.isWin).toBe(true);
      expect(state.isGameOver).toBe(true);
      expect(state.wave).toBe(3);
      expect(gameOverListener).toHaveBeenCalledWith({ win: true });
    });

    it("does not win before final wave", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 3);

      bus.emit("wave-complete", { wave: 2 });

      const state = gsm.getState();
      expect(state.isWin).toBe(false);
      expect(state.isGameOver).toBe(false);
    });
  });

  describe("DifficultyScaler tracks performance", () => {
    it("increases multiplier when player dominates (all kills, no leaks)", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      for (let i = 0; i < 10; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      bus.emit("wave-complete", { wave: 1 });

      expect(scaler.multiplier).toBeGreaterThan(1.0);
    });

    it("records kills and wave in stats", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      for (let i = 0; i < 10; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      bus.emit("wave-complete", { wave: 1 });

      const stats = scaler.getStats();
      expect(stats.kills).toBe(10);
      expect(stats.leaks).toBe(0);
      expect(stats.waves).toBe(1);
    });
  });

  describe("DifficultyScaler responds to leaks", () => {
    it("decreases multiplier when player struggles (many leaks)", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      for (let i = 0; i < 5; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      for (let i = 0; i < 5; i++) {
        bus.emit("enemy-reached-goal", { damage: 1 });
      }
      bus.emit("wave-complete", { wave: 1 });

      // 50% kill rate is well below 80% threshold, plus 5 leak penalties
      expect(scaler.multiplier).toBeLessThan(1.0);
    });

    it("records leaks in stats", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      for (let i = 0; i < 5; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      for (let i = 0; i < 5; i++) {
        bus.emit("enemy-reached-goal", { damage: 1 });
      }
      bus.emit("wave-complete", { wave: 1 });

      const stats = scaler.getStats();
      expect(stats.kills).toBe(5);
      expect(stats.leaks).toBe(5);
    });
  });

  describe("multiple waves accumulate difficulty", () => {
    it("multiplier increases with each clean wave", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      const multipliers: number[] = [];

      for (let wave = 1; wave <= 3; wave++) {
        // Simulate a clean wave: 10 kills, 0 leaks
        for (let i = 0; i < 10; i++) {
          bus.emit("enemy-killed", { reward: 5 });
        }
        bus.emit("wave-complete", { wave });
        multipliers.push(scaler.multiplier);
      }

      // Each successive wave should have a higher multiplier
      expect(multipliers[1]).toBeGreaterThan(multipliers[0]);
      expect(multipliers[2]).toBeGreaterThan(multipliers[1]);

      // All should be above baseline
      for (const m of multipliers) {
        expect(m).toBeGreaterThan(1.0);
      }
    });
  });

  describe("DifficultyScaler reset", () => {
    it("resets multiplier back to 1.0", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      // Drive multiplier away from 1.0
      for (let i = 0; i < 10; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      bus.emit("wave-complete", { wave: 1 });
      expect(scaler.multiplier).not.toBe(1.0);

      scaler.reset();

      expect(scaler.multiplier).toBe(1.0);
    });

    it("clears all tracked stats on reset", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      for (let i = 0; i < 5; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      for (let i = 0; i < 3; i++) {
        bus.emit("enemy-reached-goal", { damage: 1 });
      }
      bus.emit("wave-complete", { wave: 1 });

      scaler.reset();

      const stats = scaler.getStats();
      expect(stats.kills).toBe(0);
      expect(stats.leaks).toBe(0);
      expect(stats.waves).toBe(0);
      expect(stats.multiplier).toBe(1.0);
    });
  });

  describe("dispose cleanup", () => {
    it("GameStateManager stops responding to events after dispose", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingGold: 100, startingLives: 10 });

      gsm.dispose();

      bus.emit("enemy-killed", { reward: 50 });
      bus.emit("enemy-reached-goal", { damage: 5 });
      bus.emit("wave-complete", { wave: 5 });

      const state = gsm.getState();
      expect(state.gold).toBe(100);
      expect(state.lives).toBe(10);
      expect(state.isGameOver).toBe(false);
      expect(state.isWin).toBe(false);
    });

    it("DifficultyScaler stops responding to events after dispose", () => {
      const bus = new EventBus();
      const scaler = new DifficultyScaler(bus);

      scaler.dispose();

      for (let i = 0; i < 10; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      bus.emit("enemy-reached-goal", { damage: 1 });
      bus.emit("wave-complete", { wave: 1 });

      expect(scaler.multiplier).toBe(1.0);
      expect(scaler.getStats().kills).toBe(0);
      expect(scaler.getStats().leaks).toBe(0);
    });

    it("both systems stop responding when both are disposed", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingGold: 100, startingLives: 10 });
      const scaler = new DifficultyScaler(bus);

      gsm.dispose();
      scaler.dispose();

      bus.emit("enemy-killed", { reward: 50 });
      bus.emit("enemy-reached-goal", { damage: 5 });
      bus.emit("wave-complete", { wave: 5 });

      // GameStateManager unchanged
      expect(gsm.getState().gold).toBe(100);
      expect(gsm.getState().lives).toBe(10);
      expect(gsm.getState().isGameOver).toBe(false);

      // DifficultyScaler unchanged
      expect(scaler.multiplier).toBe(1.0);
      expect(scaler.getStats().kills).toBe(0);
    });
  });

  describe("cross-system event chains", () => {
    it("enemy-killed updates both GameStateManager gold and DifficultyScaler kills", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingGold: 100 });
      const scaler = new DifficultyScaler(bus);

      bus.emit("enemy-killed", { reward: 10 });

      expect(gsm.getState().gold).toBe(110);
      expect(scaler.getStats().kills).toBe(1);
    });

    it("enemy-reached-goal updates both GameStateManager lives and DifficultyScaler leaks", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5, { startingLives: 10 });
      const scaler = new DifficultyScaler(bus);

      bus.emit("enemy-reached-goal", { damage: 2 });

      expect(gsm.getState().lives).toBe(8);
      expect(scaler.getStats().leaks).toBe(1);
    });

    it("wave-complete updates both GameStateManager wave and DifficultyScaler multiplier", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 5);
      const scaler = new DifficultyScaler(bus);

      // Give the scaler some kills so the multiplier actually moves
      for (let i = 0; i < 10; i++) {
        bus.emit("enemy-killed", { reward: 5 });
      }
      bus.emit("wave-complete", { wave: 1 });

      expect(gsm.getState().wave).toBe(1);
      expect(scaler.multiplier).toBeGreaterThan(1.0);
    });

    it("full game flow: kills, leaks, waves, then win", () => {
      const bus = new EventBus();
      const gsm = new GameStateManager(bus, 2, { startingGold: 50, startingLives: 10 });
      const scaler = new DifficultyScaler(bus);
      const goldChanges: number[] = [];
      bus.on("gold-changed", ({ gold }) => goldChanges.push(gold));

      // Wave 1: 5 kills, 1 leak
      for (let i = 0; i < 5; i++) {
        bus.emit("enemy-killed", { reward: 10 });
      }
      bus.emit("enemy-reached-goal", { damage: 1 });
      bus.emit("wave-complete", { wave: 1 });

      expect(gsm.getState().gold).toBe(100); // 50 + 5*10
      expect(gsm.getState().lives).toBe(9);
      expect(gsm.getState().wave).toBe(1);
      expect(gsm.getState().isGameOver).toBe(false);
      expect(goldChanges).toHaveLength(5);
      expect(scaler.getStats().kills).toBe(5);
      expect(scaler.getStats().leaks).toBe(1);

      // Wave 2: 3 kills, win
      for (let i = 0; i < 3; i++) {
        bus.emit("enemy-killed", { reward: 10 });
      }
      bus.emit("wave-complete", { wave: 2 });

      expect(gsm.getState().gold).toBe(130); // 100 + 3*10
      expect(gsm.getState().wave).toBe(2);
      expect(gsm.getState().isWin).toBe(true);
      expect(gsm.getState().isGameOver).toBe(true);
      expect(scaler.getStats().kills).toBe(8);
    });
  });
});
