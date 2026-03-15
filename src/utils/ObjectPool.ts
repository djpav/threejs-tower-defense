export class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, initialSize = 0) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  acquire(): T {
    return this.available.length > 0 ? this.available.pop()! : this.factory();
  }

  release(obj: T): void {
    this.available.push(obj);
  }

  disposeAll(disposeFn: (obj: T) => void): void {
    for (const obj of this.available) {
      disposeFn(obj);
    }
    this.available.length = 0;
  }
}
