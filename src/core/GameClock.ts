import { Clock } from "three";

export class GameClock {
  private clock: Clock;
  private _timeScale = 1;
  private _paused = false;
  private _speedBeforePause = 1;

  constructor() {
    this.clock = new Clock();
  }

  get timeScale(): number {
    return this._timeScale;
  }

  get paused(): boolean {
    return this._paused;
  }

  setSpeed(value: number): void {
    this._speedBeforePause = Math.max(0.25, value);
    if (!this._paused) {
      this._timeScale = this._speedBeforePause;
    }
  }

  /** Scaled delta in seconds, capped to prevent physics blowups on frame spikes */
  getDelta(): number {
    const raw = this.clock.getDelta();
    // Cap raw delta at ~67ms (e.g. tab-switch, GC pause), then cap again
    // after scaling so high game speed can never produce > 100ms game-time step
    return Math.min(Math.min(raw, 1 / 15) * this._timeScale, 0.1);
  }

  pause(): void {
    if (this._paused) return;
    this._paused = true;
    this._timeScale = 0;
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this._timeScale = this._speedBeforePause;
  }

  togglePause(): void {
    if (this._paused) this.resume();
    else this.pause();
  }
}
