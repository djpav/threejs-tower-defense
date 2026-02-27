import { Camera, Vector3 } from "three";

interface FloatingNumber {
  el: HTMLDivElement;
  worldPos: Vector3;
  age: number;
  lifespan: number;
}

const LIFESPAN = 0.8;

export class DamageNumbers {
  private container: HTMLDivElement;
  private numbers: FloatingNumber[] = [];
  private camera: Camera | null = null;
  private tempVec = new Vector3();

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "fixed inset-0 pointer-events-none z-[12] overflow-hidden";
    document.body.appendChild(this.container);
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  spawn(x: number, y: number, z: number, damage: number, color = "#fff"): void {
    const el = document.createElement("div");
    el.textContent = `-${Math.round(damage)}`;
    el.className = "absolute text-sm font-bold font-game whitespace-nowrap will-change-[transform,opacity]";
    el.style.color = color;
    el.style.textShadow = "0 1px 3px rgba(0,0,0,0.8)";
    el.style.transform = "translate(-50%, -50%)";
    this.container.appendChild(el);

    this.numbers.push({
      el,
      worldPos: new Vector3(x, y + 0.5, z),
      age: 0,
      lifespan: LIFESPAN,
    });
  }

  update(delta: number): void {
    if (!this.camera) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      num.age += delta;

      if (num.age >= num.lifespan) {
        num.el.remove();
        this.numbers.splice(i, 1);
        continue;
      }

      const t = num.age / num.lifespan;

      // Float upward in world space
      num.worldPos.y += delta * 1.5;

      // Project to screen
      this.tempVec.copy(num.worldPos).project(this.camera);
      const screenX = (this.tempVec.x * 0.5 + 0.5) * w;
      const screenY = (-this.tempVec.y * 0.5 + 0.5) * h;

      // Behind camera check
      if (this.tempVec.z > 1) {
        num.el.style.display = "none";
        continue;
      }
      num.el.style.display = "";

      num.el.style.left = `${screenX}px`;
      num.el.style.top = `${screenY}px`;
      num.el.style.opacity = String(1 - t);

      const scale = 1 + t * 0.3;
      num.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
  }

  dispose(): void {
    for (const num of this.numbers) {
      num.el.remove();
    }
    this.numbers = [];
    this.container.remove();
  }
}
