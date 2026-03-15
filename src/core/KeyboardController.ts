type KeyAction = (e: KeyboardEvent) => void;

export class KeyboardController {
  private bindings = new Map<string, KeyAction>();
  private enabled = false;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
  }

  /** Enable/disable all keyboard processing. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Bind a lowercase key (e.g. "u", " ", "escape") to an action. */
  bind(key: string, action: KeyAction): void {
    this.bindings.set(key, action);
  }

  /** Bind number keys 1-N to a callback that receives the 0-based index. */
  bindNumberRange(count: number, action: (index: number) => void): void {
    const max = Math.min(count, 9);
    for (let i = 0; i < max; i++) {
      this.bindings.set(String(i + 1), () => action(i));
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const key = e.key.toLowerCase();
    const action = this.bindings.get(key);
    if (action) {
      action(e);
    }
  };

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    this.bindings.clear();
  }
}
