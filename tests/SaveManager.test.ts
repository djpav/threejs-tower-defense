import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveManager } from "@/systems/SaveManager";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

describe("SaveManager", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("starts with no level results", () => {
    const sm = new SaveManager();
    expect(sm.completedCount).toBe(0);
    expect(sm.getLevelResult(0)).toBeUndefined();
  });

  it("records level completion", () => {
    const sm = new SaveManager();
    sm.completeLevel(0, 15, 8, 8);

    const result = sm.getLevelResult(0);
    expect(result).toBeDefined();
    expect(result!.completed).toBe(true);
    expect(result!.livesRemaining).toBe(15);
    expect(result!.wavesCompleted).toBe(8);
    expect(result!.totalWaves).toBe(8);
  });

  it("isLevelCompleted returns correct values", () => {
    const sm = new SaveManager();
    expect(sm.isLevelCompleted(0)).toBe(false);

    sm.completeLevel(0, 10, 5, 5);
    expect(sm.isLevelCompleted(0)).toBe(true);
    expect(sm.isLevelCompleted(1)).toBe(false);
  });

  it("only overwrites with better result (higher lives)", () => {
    const sm = new SaveManager();
    sm.completeLevel(0, 10, 5, 5);
    sm.completeLevel(0, 8, 5, 5); // worse — should NOT overwrite

    expect(sm.getLevelResult(0)!.livesRemaining).toBe(10);
  });

  it("overwrites with equal or better lives", () => {
    const sm = new SaveManager();
    sm.completeLevel(0, 10, 5, 5);
    sm.completeLevel(0, 10, 5, 5); // equal — should overwrite (>=)

    expect(sm.getLevelResult(0)!.livesRemaining).toBe(10);

    sm.completeLevel(0, 15, 5, 5); // better — should overwrite
    expect(sm.getLevelResult(0)!.livesRemaining).toBe(15);
  });

  it("records attempt for failed level", () => {
    const sm = new SaveManager();
    sm.recordAttempt(2, 3, 8);

    const result = sm.getLevelResult(2);
    expect(result).toBeDefined();
    expect(result!.completed).toBe(false);
    expect(result!.wavesCompleted).toBe(3);
  });

  it("does not overwrite existing result with attempt", () => {
    const sm = new SaveManager();
    sm.completeLevel(1, 10, 5, 5);
    sm.recordAttempt(1, 2, 5); // should NOT overwrite

    expect(sm.getLevelResult(1)!.completed).toBe(true);
  });

  it("tracks completed count across multiple levels", () => {
    const sm = new SaveManager();
    sm.completeLevel(0, 10, 5, 5);
    sm.completeLevel(1, 8, 5, 5);
    sm.recordAttempt(2, 3, 5);

    expect(sm.completedCount).toBe(2);
  });

  it("persists data to localStorage", () => {
    const sm = new SaveManager();
    sm.completeLevel(0, 10, 5, 5);

    expect(localStorageMock.setItem).toHaveBeenCalled();

    // New instance should load persisted data
    const sm2 = new SaveManager();
    expect(sm2.isLevelCompleted(0)).toBe(true);
    expect(sm2.getLevelResult(0)!.livesRemaining).toBe(10);
  });

  it("clearAll resets all data", () => {
    const sm = new SaveManager();
    sm.completeLevel(0, 10, 5, 5);
    sm.completeLevel(1, 8, 5, 5);

    sm.clearAll();
    expect(sm.completedCount).toBe(0);
    expect(sm.getLevelResult(0)).toBeUndefined();
  });

  it("handles corrupted localStorage gracefully", () => {
    store["td-save-v1"] = "not-valid-json";

    const sm = new SaveManager();
    expect(sm.completedCount).toBe(0); // falls back to default
  });

  it("handles wrong version gracefully", () => {
    store["td-save-v1"] = JSON.stringify({ version: 99, levelResults: { 0: { completed: true } } });

    const sm = new SaveManager();
    expect(sm.completedCount).toBe(0); // rejects wrong version
  });
});
