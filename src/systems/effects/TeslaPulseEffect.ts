import { Mesh, MeshBasicMaterial, RingGeometry, DoubleSide } from "three";
import { Effect } from "./Effect";

const RING_GEO = new RingGeometry(0.1, 0.15, 16);

export class TeslaPulseEffect implements Effect {
  object: Mesh;
  age = 0;
  lifespan = 0.4;
  private material: MeshBasicMaterial;
  private targetScale: number;

  constructor(x = 0, y = 0, z = 0, range = 1, color = 0xffffff) {
    this.targetScale = range / 0.15;
    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
      depthWrite: false,
    });
    this.object = new Mesh(RING_GEO, this.material);
    this.object.position.set(x, y, z);
    this.object.rotation.x = -Math.PI / 2;
  }

  reset(x: number, y: number, z: number, range: number, color: number): void {
    this.age = 0;
    this.targetScale = range / 0.15;
    this.material.color.set(color);
    this.material.opacity = 0.6;
    this.object.position.set(x, y, z);
    this.object.scale.setScalar(0);
  }

  update(delta: number): boolean {
    this.age += delta;
    if (this.age >= this.lifespan) return false;

    const t = this.age / this.lifespan;
    const scale = t * this.targetScale;
    this.object.scale.setScalar(scale);
    this.material.opacity = 0.6 * (1 - t);

    return true;
  }

  dispose(): void {
    this.material.dispose();
  }
}
