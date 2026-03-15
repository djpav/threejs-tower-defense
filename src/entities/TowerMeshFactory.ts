import {
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  BoxGeometry,
  ConeGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { TowerType } from "@/types";

function buildArrowMeshes(): Mesh[] {
  const baseGeo = new CylinderGeometry(0.3, 0.35, 0.5, 8);
  const baseMat = new MeshStandardMaterial({ color: 0x8e44ad });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.35;

  const topGeo = new BoxGeometry(0.25, 0.2, 0.25);
  const topMat = new MeshStandardMaterial({ color: 0x9b59b6 });
  const top = new Mesh(topGeo, topMat);
  top.position.y = 0.7;

  return [base, top];
}

function buildCannonMeshes(): Mesh[] {
  const baseGeo = new CylinderGeometry(0.35, 0.4, 0.45, 8);
  const baseMat = new MeshStandardMaterial({ color: 0x7f8c8d });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.325;

  const barrelGeo = new CylinderGeometry(0.1, 0.12, 0.5, 8);
  const barrelMat = new MeshStandardMaterial({ color: 0x2c3e50 });
  const barrel = new Mesh(barrelGeo, barrelMat);
  barrel.position.y = 0.55;
  barrel.position.z = 0.15;
  barrel.rotation.x = Math.PI / 2;

  return [base, barrel];
}

function buildFrostMeshes(): Mesh[] {
  const coneGeo = new ConeGeometry(0.3, 0.6, 6);
  const coneMat = new MeshStandardMaterial({ color: 0x2980b9 });
  const cone = new Mesh(coneGeo, coneMat);
  cone.position.y = 0.4;

  const orbGeo = new SphereGeometry(0.15, 8, 6);
  const orbMat = new MeshStandardMaterial({
    color: 0x3498db,
    emissive: 0x3498db,
    emissiveIntensity: 0.6,
  });
  const orb = new Mesh(orbGeo, orbMat);
  orb.position.y = 0.8;

  return [cone, orb];
}

function buildLightningMeshes(): Mesh[] {
  const rodGeo = new CylinderGeometry(0.08, 0.12, 0.7, 6);
  const rodMat = new MeshStandardMaterial({ color: 0x6c3483 });
  const rod = new Mesh(rodGeo, rodMat);
  rod.position.y = 0.45;

  const orbGeo = new SphereGeometry(0.18, 8, 6);
  const orbMat = new MeshStandardMaterial({
    color: 0x9b59b6,
    emissive: 0x9b59b6,
    emissiveIntensity: 0.8,
  });
  const orb = new Mesh(orbGeo, orbMat);
  orb.position.y = 0.9;

  return [rod, orb];
}

function buildPoisonMeshes(): Mesh[] {
  const baseGeo = new CylinderGeometry(0.35, 0.25, 0.4, 8);
  const baseMat = new MeshStandardMaterial({ color: 0x1e8449 });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.3;

  const bubbleGeo = new SphereGeometry(0.2, 8, 6);
  const bubbleMat = new MeshStandardMaterial({
    color: 0x27ae60,
    emissive: 0x27ae60,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.8,
  });
  const bubble = new Mesh(bubbleGeo, bubbleMat);
  bubble.position.y = 0.65;

  return [base, bubble];
}

function buildSniperMeshes(): Mesh[] {
  const baseGeo = new CylinderGeometry(0.15, 0.2, 0.7, 6);
  const baseMat = new MeshStandardMaterial({ color: 0xbdc3c7 });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.45;

  const barrelGeo = new CylinderGeometry(0.05, 0.05, 0.6, 6);
  const barrelMat = new MeshStandardMaterial({ color: 0xecf0f1 });
  const barrel = new Mesh(barrelGeo, barrelMat);
  barrel.position.y = 0.75;
  barrel.position.z = 0.2;
  barrel.rotation.x = Math.PI / 2;

  return [base, barrel];
}

function buildTeslaMeshes(): Mesh[] {
  const baseGeo = new CylinderGeometry(0.35, 0.35, 0.2, 8);
  const baseMat = new MeshStandardMaterial({ color: 0x2c3e50 });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.2;

  const torusGeo = new TorusGeometry(0.22, 0.04, 8, 16);
  const torusMat = new MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.4,
  });
  const torus = new Mesh(torusGeo, torusMat);
  torus.position.y = 0.5;
  torus.rotation.x = Math.PI / 2;

  const orbGeo = new SphereGeometry(0.12, 8, 6);
  const orbMat = new MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.9,
  });
  const orb = new Mesh(orbGeo, orbMat);
  orb.position.y = 0.5;

  return [base, torus, orb];
}

const BUILDERS: Record<TowerType, () => Mesh[]> = {
  [TowerType.Arrow]: buildArrowMeshes,
  [TowerType.Cannon]: buildCannonMeshes,
  [TowerType.Frost]: buildFrostMeshes,
  [TowerType.Lightning]: buildLightningMeshes,
  [TowerType.Poison]: buildPoisonMeshes,
  [TowerType.Sniper]: buildSniperMeshes,
  [TowerType.Tesla]: buildTeslaMeshes,
};

export function createTowerMeshes(type: TowerType): Mesh[] {
  return BUILDERS[type]();
}
