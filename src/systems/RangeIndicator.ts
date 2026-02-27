import {
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  DoubleSide,
  Group,
} from "three";

export class RangeIndicator {
  private mesh: Mesh;
  private material: MeshBasicMaterial;
  private geometry: RingGeometry;
  private group: Group;

  constructor(group: Group) {
    this.group = group;

    // Create a ring; we'll scale it to match range
    this.geometry = new RingGeometry(0.9, 1.0, 48);
    this.material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: DoubleSide,
      depthWrite: false,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.group.add(this.mesh);
  }

  show(x: number, z: number, range: number, color: number = 0xffffff): void {
    this.mesh.position.set(x, 0.22, z);
    this.mesh.scale.setScalar(range);
    this.material.color.set(color);
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.group.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
