import { Mesh, MeshBasicMaterial, RingGeometry, DoubleSide } from "three";
import { Effect } from "./Effect";

const RING_GEO = new RingGeometry(0.1, 0.15, 16);

export class ImpactFlashEffect implements Effect {
  object: Mesh;
  age = 0;
  lifespan = 0.3;
  private material: MeshBasicMaterial;

  constructor(x = 0, y = 0, z = 0, color = 0xffffff) {
    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: DoubleSide,
      depthWrite: false,
    });
    this.object = new Mesh(RING_GEO, this.material);
    this.object.position.set(x, y + 0.2, z);
    this.object.rotation.x = -Math.PI / 2;
  }

  reset(x: number, y: number, z: number, color: number): void {
    this.age = 0;
    this.material.color.set(color);
    this.material.opacity = 0.8;
    this.object.position.set(x, y + 0.2, z);
    this.object.scale.setScalar(1);
  }

  update(delta: number): boolean {
    this.age += delta;
    if (this.age >= this.lifespan) return false;

    const t = this.age / this.lifespan;
    const scale = 1 + t * 4;
    this.object.scale.setScalar(scale);
    this.material.opacity = 0.8 * (1 - t);

    return true;
  }

  dispose(): void {
    this.material.dispose();
  }
}
