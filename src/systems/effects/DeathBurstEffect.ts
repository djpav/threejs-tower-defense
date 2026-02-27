import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { Effect } from "./Effect";

const PARTICLE_GEO = new SphereGeometry(0.04, 4, 3);

export class DeathBurstEffect implements Effect {
  object: Group;
  age = 0;
  lifespan = 0.4;
  private particles: Mesh[] = [];
  private velocities: { x: number; y: number; z: number }[] = [];
  private materials: MeshStandardMaterial[] = [];

  constructor(x = 0, y = 0, z = 0, color = 0xffffff) {
    this.object = new Group();
    this.object.position.set(x, y, z);

    for (let i = 0; i < 8; i++) {
      const mat = new MeshStandardMaterial({ color });
      const mesh = new Mesh(PARTICLE_GEO, mat);
      this.materials.push(mat);
      this.particles.push(mesh);
      this.object.add(mesh);

      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 1.5;
      this.velocities.push({
        x: Math.cos(angle) * speed,
        y: 1.0 + Math.random() * 2.0,
        z: Math.sin(angle) * speed,
      });
    }
  }

  reset(x: number, y: number, z: number, color: number): void {
    this.age = 0;
    this.object.position.set(x, y, z);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.position.set(0, 0, 0);
      p.scale.setScalar(1);
      this.materials[i].color.set(color);

      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 1.5;
      this.velocities[i] = {
        x: Math.cos(angle) * speed,
        y: 1.0 + Math.random() * 2.0,
        z: Math.sin(angle) * speed,
      };
    }
  }

  update(delta: number): boolean {
    this.age += delta;
    if (this.age >= this.lifespan) return false;

    const t = this.age / this.lifespan;
    const scale = 1 - t;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const v = this.velocities[i];
      p.position.x += v.x * delta;
      p.position.y += v.y * delta;
      p.position.z += v.z * delta;
      v.y -= 5 * delta;
      p.scale.setScalar(scale);
    }

    return true;
  }

  dispose(): void {
    for (const mat of this.materials) {
      mat.dispose();
    }
  }
}
