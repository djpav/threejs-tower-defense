import { EventBus } from "@/core/EventBus";
import { GameEventMap } from "@/types";

type Listener<T> = (data: T) => void;

export class EventSubscription {
  private eventBus: EventBus;
  private subscriptions: Array<{ event: string; handler: Listener<unknown> }> = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  on<K extends keyof GameEventMap>(event: K, handler: Listener<GameEventMap[K]>): void {
    this.eventBus.on(event, handler);
    this.subscriptions.push({ event: event as string, handler: handler as Listener<unknown> });
  }

  disposeAll(): void {
    for (const { event, handler } of this.subscriptions) {
      this.eventBus.off(event as keyof GameEventMap, handler as Listener<GameEventMap[keyof GameEventMap]>);
    }
    this.subscriptions = [];
  }
}
