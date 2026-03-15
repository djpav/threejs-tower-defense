import { OrthographicCamera, MOUSE, TOUCH } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MapConfig } from "@/types";

/** Default isometric camera offset direction (normalized by distance calc). */
const ISO_DIRECTION = { x: 10, y: 10, z: 10 };

export class CameraController {
  readonly camera: OrthographicCamera;
  private controls: OrbitControls;

  constructor(mapConfig: MapConfig, aspect: number, domElement: HTMLElement) {
    // Create camera with temporary frustum (resetToMap sets the real one)
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    // OrbitControls for zoom, rotate, and pan
    this.controls = new OrbitControls(this.camera, domElement);

    // Left click reserved for game interaction (InputManager)
    this.controls.mouseButtons = {
      LEFT: null as unknown as MOUSE,
      MIDDLE: MOUSE.PAN,
      RIGHT: MOUSE.ROTATE,
    };

    // Touch gestures: single-finger pan, two-finger pinch-to-zoom + pan.
    // Single-finger tap is handled by InputManager (not OrbitControls) so
    // PAN here only activates on drag, which doesn't conflict with tap detection.
    this.controls.touches = {
      ONE: TOUCH.PAN,
      TWO: TOUCH.DOLLY_PAN,
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

    // Fit camera to the initial map
    this.resetToMap(mapConfig, aspect);
  }

  /**
   * Reset camera frustum, position, zoom, and orbit target to fit the given map.
   * Call this when switching to a new level so the camera is properly centered
   * and sized for the new map dimensions.
   */
  resetToMap(mapConfig: MapConfig, aspect: number): void {
    // Determine view size from the map dimensions (with some padding)
    const mapWidth = mapConfig.cols * mapConfig.cellSize;
    const mapDepth = mapConfig.rows * mapConfig.cellSize;
    const viewSize = Math.max(mapWidth, mapDepth) * 0.75;

    const halfW = (viewSize * aspect) / 2;
    const halfH = viewSize / 2;

    // Update frustum
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.near = 0.1;
    this.camera.far = 200;

    // Reset zoom (OrbitControls manipulates this for ortho cameras)
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();

    // Isometric-ish position: elevated, looking down at the origin
    this.camera.position.set(ISO_DIRECTION.x, ISO_DIRECTION.y, ISO_DIRECTION.z);
    this.camera.lookAt(0, 0, 0);

    // Reset orbit target to map center
    this.controls.target.set(0, 0, 0);

    // Save this as the "home" state so controls.reset() returns here,
    // then update to apply the new state immediately.
    this.controls.saveState();
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
