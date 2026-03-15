import { Mesh, MeshBasicMaterial, CylinderGeometry, Vector3 } from "three";
import { Effect } from "./Effect";

const UNIT_CYLINDER = new CylinderGeometry(0.03, 0.03, 1, 4);
const _from = new Vector3();
const _to = new Vector3();
const _dir = new Vector3();
const _up = new Vector3(0, 1, 0);

export class ChainLightningEffect implements Effect {
  object: Mesh;
  age = 0;
  lifespan = 0.15;
  private material: MeshBasicMaterial;

  constructor(
    x1 = 0, y1 = 0, z1 = 0,
    x2 = 0, y2 = 1, z2 = 0,
    color = 0xffffff,
  ) {
    this.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
    this.object = new Mesh(UNIT_CYLINDER, this.material);
    this.positionBeam(x1, y1, z1, x2, y2, z2);
  }

  reset(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    color: number,
  ): void {
    this.age = 0;
    this.material.color.set(color);
    this.material.opacity = 0.9;
    this.positionBeam(x1, y1, z1, x2, y2, z2);
  }

  private positionBeam(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
  ): void {
    _from.set(x1, y1, z1);
    _to.set(x2, y2, z2);
    const dist = _from.distanceTo(_to);

    this.object.position.addVectors(_from, _to).multiplyScalar(0.5);
    this.object.scale.set(1, dist, 1);

    _dir.subVectors(_to, _from).normalize();
    this.object.quaternion.setFromUnitVectors(_up, _dir);
  }

  update(delta: number): boolean {
    this.age += delta;
    if (this.age >= this.lifespan) return false;

    const t = this.age / this.lifespan;
    this.material.opacity = 0.9 * (1 - t);

    return true;
  }

  dispose(): void {
    this.material.dispose();
  }
}
