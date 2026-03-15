import { Object3D } from "three";

export abstract class GameObject {
  protected object3D: Object3D;

  constructor() {
    this.object3D = new Object3D();
  }

  getObject3D(): Object3D {
    return this.object3D;
  }

  abstract update(delta: number): void;
  abstract dispose(): void;
}
