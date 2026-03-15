import { EventBus } from "@/core/EventBus";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted = false;
  private eventBus: EventBus;

  // Named handlers for cleanup
  private handleTowerPlaced: () => void;
  private handleTowerUpgraded: () => void;
  private handleTowerSold: () => void;
  private handleEnemyKilled: () => void;
  private handleEnemyReachedGoal: () => void;
  private handleWaveStart: () => void;
  private handleWaveComplete: () => void;
  private handleGameOver: (data: { win: boolean }) => void;
  private resumeClick: (() => void) | null = null;
  private resumeKeydown: (() => void) | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.handleTowerPlaced = () => this.playPlace();
    this.handleTowerUpgraded = () => this.playUpgrade();
    this.handleTowerSold = () => this.playSell();
    this.handleEnemyKilled = () => this.playKill();
    this.handleEnemyReachedGoal = () => this.playLeak();
    this.handleWaveStart = () => this.playWaveStart();
    this.handleWaveComplete = () => this.playWaveComplete();
    this.handleGameOver = ({ win }) => win ? this.playVictory() : this.playDefeat();

    eventBus.on("tower-placed", this.handleTowerPlaced);
    eventBus.on("tower-upgraded", this.handleTowerUpgraded);
    eventBus.on("tower-sold", this.handleTowerSold);
    eventBus.on("enemy-killed", this.handleEnemyKilled);
    eventBus.on("enemy-reached-goal", this.handleEnemyReachedGoal);
    eventBus.on("wave-start", this.handleWaveStart);
    eventBus.on("wave-complete", this.handleWaveComplete);
    eventBus.on("game-over", this.handleGameOver);

    // Resume AudioContext on first interaction (browser autoplay policy)
    const resume = () => {
      this.ensureContext();
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
      this.resumeClick = null;
      this.resumeKeydown = null;
    };
    this.resumeClick = resume;
    this.resumeKeydown = resume;
    window.addEventListener("click", resume);
    window.addEventListener("keydown", resume);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 0.3;
    }
    return this._muted;
  }

  // ── Sound synthesis methods ──

  private playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 1): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume = 0.3): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  private playPlace(): void {
    // Quick rising tone
    this.playTone(300, 0.12, "square", 0.4);
    this.playTone(450, 0.1, "square", 0.3);
  }

  private playUpgrade(): void {
    // Ascending arpeggio
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    this.playToneAt(400, 0.08, "square", 0.4, t);
    this.playToneAt(500, 0.08, "square", 0.4, t + 0.06);
    this.playToneAt(650, 0.12, "square", 0.5, t + 0.12);
  }

  private playSell(): void {
    // Descending tone (coin sound)
    this.playTone(600, 0.08, "triangle", 0.5);
    const ctx = this.ensureContext();
    this.playToneAt(400, 0.1, "triangle", 0.4, ctx.currentTime + 0.06);
  }

  private playKill(): void {
    // Short pop
    this.playNoise(0.06, 0.15);
    this.playTone(200, 0.05, "square", 0.2);
  }

  private playLeak(): void {
    // Low warning buzz
    this.playTone(120, 0.25, "sawtooth", 0.5);
  }

  private playWaveStart(): void {
    // Alert horn
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    this.playToneAt(350, 0.15, "sawtooth", 0.3, t);
    this.playToneAt(440, 0.2, "sawtooth", 0.4, t + 0.1);
  }

  private playWaveComplete(): void {
    // Victory chime
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    this.playToneAt(523, 0.12, "sine", 0.4, t);
    this.playToneAt(659, 0.12, "sine", 0.4, t + 0.1);
    this.playToneAt(784, 0.2, "sine", 0.5, t + 0.2);
  }

  private playVictory(): void {
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    const notes = [523, 587, 659, 784, 880, 1047];
    for (let i = 0; i < notes.length; i++) {
      this.playToneAt(notes[i], 0.2, "sine", 0.4, t + i * 0.1);
    }
  }

  private playDefeat(): void {
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    this.playToneAt(300, 0.3, "sawtooth", 0.4, t);
    this.playToneAt(250, 0.3, "sawtooth", 0.4, t + 0.25);
    this.playToneAt(200, 0.5, "sawtooth", 0.5, t + 0.5);
  }

  private playToneAt(freq: number, duration: number, type: OscillatorType, volume: number, startTime: number): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  dispose(): void {
    this.eventBus.off("tower-placed", this.handleTowerPlaced);
    this.eventBus.off("tower-upgraded", this.handleTowerUpgraded);
    this.eventBus.off("tower-sold", this.handleTowerSold);
    this.eventBus.off("enemy-killed", this.handleEnemyKilled);
    this.eventBus.off("enemy-reached-goal", this.handleEnemyReachedGoal);
    this.eventBus.off("wave-start", this.handleWaveStart);
    this.eventBus.off("wave-complete", this.handleWaveComplete);
    this.eventBus.off("game-over", this.handleGameOver);

    if (this.resumeClick) window.removeEventListener("click", this.resumeClick);
    if (this.resumeKeydown) window.removeEventListener("keydown", this.resumeKeydown);

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
