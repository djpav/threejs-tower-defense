import { describe, it, expect, vi } from "vitest";
import { ObjectPool } from "@/utils/ObjectPool";

describe("ObjectPool", () => {
  it("creates a new object when pool is empty", () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const pool = new ObjectPool(factory);

    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(factory).toHaveBeenCalledOnce();
  });

  it("reuses released objects", () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const pool = new ObjectPool(factory);

    const obj1 = pool.acquire();
    pool.release(obj1);

    const obj2 = pool.acquire();
    expect(obj2).toBe(obj1);
    expect(factory).toHaveBeenCalledOnce(); // no second creation
  });

  it("pre-populates with initialSize", () => {
    const factory = vi.fn(() => ({ value: 0 }));
    const pool = new ObjectPool(factory, 5);

    expect(factory).toHaveBeenCalledTimes(5);

    // All 5 should be available without creating new ones
    for (let i = 0; i < 5; i++) {
      pool.acquire();
    }
    expect(factory).toHaveBeenCalledTimes(5);

    // 6th should trigger a new creation
    pool.acquire();
    expect(factory).toHaveBeenCalledTimes(6);
  });

  it("disposeAll calls disposeFn on all pooled objects", () => {
    const pool = new ObjectPool(() => ({ disposed: false }));

    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    pool.release(b);

    pool.disposeAll((obj) => { obj.disposed = true; });
    expect(a.disposed).toBe(true);
    expect(b.disposed).toBe(true);

    // Pool is now empty — next acquire creates new
    const factory = vi.fn(() => ({ disposed: false }));
    const pool2 = new ObjectPool(factory);
    pool2.disposeAll(() => {}); // empty pool, no error
    expect(factory).not.toHaveBeenCalled();
  });

  it("handles acquire-release cycles correctly", () => {
    let counter = 0;
    const pool = new ObjectPool(() => ({ id: counter++ }));

    const a = pool.acquire(); // id: 0
    const b = pool.acquire(); // id: 1
    pool.release(a);
    pool.release(b);

    // LIFO: b comes out first
    const c = pool.acquire();
    expect(c).toBe(b);
    const d = pool.acquire();
    expect(d).toBe(a);
  });
});
