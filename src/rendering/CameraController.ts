import { OrthographicCamera, MOUSE } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MapConfig } from "@/types";

export class CameraController {
  readonly camera: OrthographicCamera;
  private controls: OrbitControls;

  constructor(mapConfig: MapConfig, aspect: number, domElement: HTMLElement) {
    // Determine view size from the map dimensions (with some padding)
    const mapWidth = mapConfig.cols * mapConfig.cellSize;
    const mapDepth = mapConfig.rows * mapConfig.cellSize;
    const viewSize = Math.max(mapWidth, mapDepth) * 0.75;

    const halfW = (viewSize * aspect) / 2;
    const halfH = viewSize / 2;

    this.camera = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);

    // Isometric-ish position: elevated, looking down at the origin
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // OrbitControls for zoom, rotate, and pan
    this.controls = new OrbitControls(this.camera, domElement);

    // Left click reserved for game interaction (InputManager)
    this.controls.mouseButtons = {
      LEFT: null as unknown as MOUSE,
      MIDDLE: MOUSE.PAN,
      RIGHT: MOUSE.ROTATE,
    };

    // Smooth damping
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Orthographic zoom bounds
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 3;

    // Limit vertical rotation so we can't flip under the ground
    this.controls.minPolarAngle = Math.PI / 6;  // ~30° from top
    this.controls.maxPolarAngle = Math.PI / 2.5; // ~72° from top

    // Rotate around map center
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  update(): void {
    this.controls.update();
  }

  resize(aspect: number): void {
    const halfH = (this.camera.top - this.camera.bottom) / 2;
    this.camera.left = -halfH * aspect;
    this.camera.right = halfH * aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
