import { describe, it, expect, vi } from "vitest";
import { GameStateManager } from "@/systems/GameStateManager";
import { EventBus } from "@/core/EventBus";

describe("GameStateManager", () => {
  function create(totalWaves = 5, options = {}) {
    const bus = new EventBus();
    const mgr = new GameStateManager(bus, totalWaves, options);
    return { bus, mgr };
  }

  it("initializes with default gold and lives", () => {
    const { mgr } = create();
    const state = mgr.getState();
    expect(state.gold).toBeGreaterThan(0);
    expect(state.lives).toBeGreaterThan(0);
    expect(state.wave).toBe(0);
    expect(state.isGameOver).toBe(false);
    expect(state.isWin).toBe(false);
  });

  it("respects custom starting options", () => {
    const { mgr } = create(3, { startingGold: 999, startingLives: 50, level: 7, levelName: "Test" });
    const state = mgr.getState();
    expect(state.gold).toBe(999);
    expect(state.lives).toBe(50);
    expect(state.level).toBe(7);
    expect(state.levelName).toBe("Test");
  });

  describe("gold management", () => {
    it("canAfford checks gold correctly", () => {
      const { mgr } = create(5, { startingGold: 100 });
      expect(mgr.canAfford(100)).toBe(true);
      expect(mgr.canAfford(101)).toBe(false);
    });

    it("spendGold deducts and returns true", () => {
      const { bus, mgr } = create(5, { startingGold: 100 });
      const listener = vi.fn();
      bus.on("gold-changed", listener);

      expect(mgr.spendGold(60)).toBe(true);
      expect(mgr.gold).toBe(40);
      expect(listener).toHaveBeenCalledWith({ gold: 40 });
    });

    it("spendGold returns false when insufficient", () => {
      const { mgr } = create(5, { startingGold: 50 });
      expect(mgr.spendGold(51)).toBe(false);
      expect(mgr.gold).toBe(50);
    });

    it("addGold increases gold", () => {
      const { mgr } = create(5, { startingGold: 100 });
      mgr.addGold(25);
      expect(mgr.gold).toBe(125);
    });

    it("adds gold on enemy-killed event", () => {
      const { bus, mgr } = create(5, { startingGold: 100 });
      bus.emit("enemy-killed", { reward: 10 });
      expect(mgr.gold).toBe(110);
    });
  });

  describe("lives and game over", () => {
    it("loses lives on enemy-reached-goal event", () => {
      const { bus, mgr } = create(5, { startingLives: 10 });
      bus.emit("enemy-reached-goal", { damage: 3 });
      expect(mgr.lives).toBe(7);
    });

    it("triggers game-over when lives reach 0", () => {
      const { bus, mgr } = create(5, { startingLives: 5 });
      const gameOverFn = vi.fn();
      bus.on("game-over", gameOverFn);

      bus.emit("enemy-reached-goal", { damage: 5 });
      expect(mgr.lives).toBe(0);
      expect(mgr.getState().isGameOver).toBe(true);
      expect(mgr.getState().isWin).toBe(false);
      expect(gameOverFn).toHaveBeenCalledWith({ win: false });
    });

    it("clamps lives at 0", () => {
      const { bus, mgr } = create(5, { startingLives: 3 });
      bus.emit("enemy-reached-goal", { damage: 10 });
      expect(mgr.lives).toBe(0);
    });

    it("does not lose more lives after game over", () => {
      const { bus, mgr } = create(5, { startingLives: 2 });
      bus.emit("enemy-reached-goal", { damage: 2 }); // game over
      const livesAfter = mgr.lives;
      bus.emit("enemy-reached-goal", { damage: 1 }); // should be ignored
      expect(mgr.lives).toBe(livesAfter);
    });
  });

  describe("wave completion and win", () => {
    it("updates wave on wave-complete", () => {
      const { bus, mgr } = create(5);
      bus.emit("wave-complete", { wave: 3 });
      expect(mgr.getState().wave).toBe(3);
    });

    it("triggers win when all waves completed", () => {
      const { bus, mgr } = create(3);
      const gameOverFn = vi.fn();
      bus.on("game-over", gameOverFn);

      bus.emit("wave-complete", { wave: 3 });
      expect(mgr.getState().isWin).toBe(true);
      expect(mgr.getState().isGameOver).toBe(true);
      expect(gameOverFn).toHaveBeenCalledWith({ win: true });
    });

    it("does not win before all waves", () => {
      const { bus, mgr } = create(5);
      bus.emit("wave-complete", { wave: 4 });
      expect(mgr.getState().isWin).toBe(false);
      expect(mgr.getState().isGameOver).toBe(false);
    });
  });

  describe("dispose", () => {
    it("unsubscribes event listeners", () => {
      const { bus, mgr } = create(5, { startingGold: 100 });
      mgr.dispose();

      bus.emit("enemy-killed", { reward: 50 });
      expect(mgr.gold).toBe(100); // unchanged
    });
  });
});
