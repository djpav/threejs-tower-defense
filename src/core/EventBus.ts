import { GameEventMap } from "@/types";

type Listener<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends keyof GameEventMap>(
    event: K,
    listener: Listener<GameEventMap[K]>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);
  }

  off<K extends keyof GameEventMap>(
    event: K,
    listener: Listener<GameEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  clear(): void {
    this.listeners.clear();
  }
}
