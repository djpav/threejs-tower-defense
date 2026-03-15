import { Object3D } from "three";

export interface Effect {
  object: Object3D;
  age: number;
  lifespan: number;
  update(delta: number): boolean; // returns true while alive
  dispose(): void;
}
