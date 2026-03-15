import {
  Scene,
  AmbientLight,
  DirectionalLight,
  Color,
  Fog,
  Group,
} from "three";

export class SceneSetup {
  readonly scene: Scene;
  readonly towerGroup = new Group();
  readonly enemyGroup = new Group();
  readonly projectileGroup = new Group();
  readonly effectGroup = new Group();
  readonly uiGroup = new Group();

  constructor() {
    this.scene = new Scene();
    this.scene.background = new Color(0x1a1a2e);

    const ambient = new AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const directional = new DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);

    // Layer groups (persistent — children cleared per level)
    this.scene.add(
      this.towerGroup,
      this.enemyGroup,
      this.projectileGroup,
      this.effectGroup,
      this.uiGroup,
    );
  }

  applyFog(mapDiag: number, camDist: number): void {
    const fogNear = camDist + mapDiag * 0.5;
    const fogFar = camDist + mapDiag * 2.0;
    this.scene.fog = new Fog(0x1a1a2e, fogNear, fogFar);
  }

  clearGroups(): void {
    this.towerGroup.clear();
    this.enemyGroup.clear();
    this.projectileGroup.clear();
    this.effectGroup.clear();
    this.uiGroup.clear();
  }
}
