import {
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  Color,
  MeshStandardMaterial,
  SphereGeometry,
  BoxGeometry,
  IcosahedronGeometry,
  ConeGeometry,
  OctahedronGeometry,
  BufferGeometry,
} from "three";
import { Enemy } from "@/entities/Enemy";

const BODY_TYPES = ["sphere", "cube", "cone", "diamond", "icosahedron"] as const;
type BodyType = (typeof BODY_TYPES)[number];

/** Create geometry at unit scale (radius=1). Instances scale to actual radius. */
function createUnitGeometry(bodyType: BodyType): BufferGeometry {
  switch (bodyType) {
    case "cube":
      return new BoxGeometry(2, 2, 2);
    case "icosahedron":
      return new IcosahedronGeometry(1, 0);
    case "cone":
      return new ConeGeometry(1, 2.5, 8);
    case "diamond":
      return new OctahedronGeometry(1, 0);
    case "sphere":
    default:
      return new SphereGeometry(1, 12, 8);
  }
}

/**
 * Renders non-stealth enemies using InstancedMesh (one per body type).
 * Stealth enemies are excluded — they keep individual meshes for opacity control.
 *
 * InstancedMeshes are excluded from raycasting (raycast overridden to no-op)
 * so they don't interfere with enemy click detection via individual groups.
 */
export class EnemyRenderer {
  private meshes = new Map<BodyType, InstancedMesh>();
  private geometries: BufferGeometry[] = [];
  private materials: MeshStandardMaterial[] = [];
  private group: Group;
  private maxPerType: number;

  // Pre-allocated temp objects to avoid per-frame allocation
  private tempMatrix = new Matrix4();
  private tempPos = new Vector3();
  private tempScale = new Vector3();
  private tempQuat = new Quaternion();
  private tempColor = new Color();
  private poisonColor = new Color(0x27ae60);

  // Pre-allocated per-type arrays to avoid per-frame GC pressure
  private typeArrays = new Map<BodyType, Enemy[]>();

  constructor(group: Group, maxPerType = 256) {
    this.group = group;
    this.maxPerType = maxPerType;

    for (const type of BODY_TYPES) {
      const geom = createUnitGeometry(type);
      const mat = new MeshStandardMaterial();
      const mesh = new InstancedMesh(geom, mat, maxPerType);
      mesh.count = 0;
      mesh.frustumCulled = false;
      // Exclude from raycasting — enemy click detection uses individual groups
      mesh.raycast = () => {};
      this.meshes.set(type, mesh);
      this.geometries.push(geom);
      this.materials.push(mat);
      this.typeArrays.set(type, []);
      group.add(mesh);
    }
  }

  /**
   * Update all instanced meshes from current enemy state.
   * Call once per frame after enemy positions have been updated.
   */
  update(enemies: readonly Enemy[]): void {
    // Clear pre-allocated arrays
    for (const arr of this.typeArrays.values()) arr.length = 0;

    // Group living, non-stealth enemies by body type
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.config.isStealth) continue;
      const type = (enemy.config.bodyType ?? "sphere") as BodyType;
      this.typeArrays.get(type)?.push(enemy);
    }

    for (const [type, mesh] of this.meshes) {
      const typeEnemies = this.typeArrays.get(type)!;
      // Clamp to maxPerType to prevent out-of-bounds writes
      const count = Math.min(typeEnemies.length, this.maxPerType);
      mesh.count = count;

      for (let i = 0; i < count; i++) {
        const enemy = typeEnemies[i];
        const pos = enemy.getObject3D().position;
        const r = enemy.config.radius;

        // pos.y includes flyingY offset; add radius + 0.1 for mesh center elevation
        this.tempPos.set(pos.x, pos.y + r + 0.1, pos.z);
        this.tempScale.set(r, r, r);
        this.tempMatrix.compose(this.tempPos, this.tempQuat, this.tempScale);
        mesh.setMatrixAt(i, this.tempMatrix);

        // Per-instance color: base color with poison blend
        this.tempColor.setHex(enemy.config.color ?? 0xe74c3c);
        if (enemy.poisonStackCount > 0) {
          const t = Math.min(enemy.poisonStackCount * 0.15, 0.6);
          this.tempColor.lerp(this.poisonColor, t);
        }
        mesh.setColorAt(i, this.tempColor);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh);
    }
    for (const geom of this.geometries) geom.dispose();
    for (const mat of this.materials) mat.dispose();
    this.meshes.clear();
    this.geometries = [];
    this.materials = [];
    this.typeArrays.clear();
  }
}
