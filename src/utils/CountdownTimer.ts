export class CountdownTimer {
  private timerId: ReturnType<typeof setInterval> | null = null;

  start(seconds: number, onTick: (remaining: number) => void, onComplete: () => void): void {
    this.clear();
    let remaining = seconds;
    onTick(remaining);
    this.timerId = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.clear();
        onComplete();
      } else {
        onTick(remaining);
      }
    }, 1000);
  }

  clear(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
