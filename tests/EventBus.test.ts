import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@/core/EventBus";

describe("EventBus", () => {
  it("emits events to registered listeners", () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on("gold-changed", listener);
    bus.emit("gold-changed", { gold: 100 });

    expect(listener).toHaveBeenCalledWith({ gold: 100 });
  });

  it("supports multiple listeners for the same event", () => {
    const bus = new EventBus();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bus.on("wave-start", listener1);
    bus.on("wave-start", listener2);
    bus.emit("wave-start", { wave: 1 });

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it("removes listeners with off()", () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on("gold-changed", listener);
    bus.off("gold-changed", listener);
    bus.emit("gold-changed", { gold: 50 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not error when emitting with no listeners", () => {
    const bus = new EventBus();
    expect(() => bus.emit("wave-start", { wave: 1 })).not.toThrow();
  });

  it("clear() removes all listeners", () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on("gold-changed", listener);
    bus.on("lives-changed", listener);
    bus.clear();

    bus.emit("gold-changed", { gold: 0 });
    bus.emit("lives-changed", { lives: 0 });

    expect(listener).not.toHaveBeenCalled();
  });
});
