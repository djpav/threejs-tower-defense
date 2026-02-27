import { Sprite, SpriteMaterial, CanvasTexture } from "three";

export class HealthBar {
  private canvas: HTMLCanvasElement;
  private texture: CanvasTexture;
  private material: SpriteMaterial;
  readonly sprite: Sprite;

  constructor(yOffset: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 64;
    this.canvas.height = 8;
    this.texture = new CanvasTexture(this.canvas);
    this.material = new SpriteMaterial({
      map: this.texture,
      depthTest: false,
    });
    this.sprite = new Sprite(this.material);
    this.sprite.scale.set(0.8, 0.1, 1);
    this.sprite.position.y = yOffset;
  }

  update(hp: number, maxHp: number): void {
    const ctx = this.canvas.getContext("2d")!;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, w, h);

    // Health fill
    const pct = hp / maxHp;
    ctx.fillStyle = pct > 0.5 ? "#2ecc71" : pct > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillRect(0, 0, w * pct, h);

    this.texture.needsUpdate = true;
  }

  show(): void {
    this.sprite.visible = true;
  }

  hide(): void {
    this.sprite.visible = false;
  }

  dispose(): void {
    this.material.dispose();
    this.texture.dispose();
  }
}
