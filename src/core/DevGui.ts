import type { GUI } from "lil-gui";
import {
  Scene,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  Group,
} from "three";
import { GameClock } from "./GameClock";
import { EventBus } from "./EventBus";
import { GameStateManager } from "@/systems/GameStateManager";
import { GameMap } from "@/map/GameMap";

export interface DevGuiDeps {
  scene: Scene;
  clock: GameClock;
  eventBus: EventBus;
  gameStateManager: GameStateManager;
  map: GameMap;
}

/** Colors for multi-path debug lines: magenta, cyan, yellow, lime, orange. */
const PATH_DEBUG_COLORS = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00, 0xff8800];

export class DevGui {
  private gui: GUI | null = null;
  private devInfo: { drawCalls: number; triangles: number } | null = null;
  private debugPathLine: Line | null = null;
  private debugPathGroup: Group | null = null;
  private scene: Scene | null = null;

  private makeDraggable(gui: GUI): void {
    const el = gui.domElement;
    const title = el.querySelector(".lil-title") as HTMLElement | null;
    if (!title) return;

    title.style.cursor = "grab";
    let dragging = false;
    let didMove = false;
    let offsetX = 0;
    let offsetY = 0;
    let startX = 0;
    let startY = 0;
    const DRAG_THRESHOLD = 5;

    const startDrag = (clientX: number, clientY: number) => {
      dragging = true;
      didMove = false;
      startX = clientX;
      startY = clientY;
      const rect = el.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
    };

    const moveDrag = (clientX: number, clientY: number) => {
      if (!dragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!didMove && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      didMove = true;
      title.style.cursor = "grabbing";
      el.style.position = "fixed";
      el.style.right = "auto";
      el.style.transform = "none";
      el.style.left = `${clientX - offsetX}px`;
      el.style.top = `${clientY - offsetY}px`;
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      title.style.cursor = "grab";
      // If no drag happened, toggle collapse/expand
      if (!didMove) {
        gui.openAnimated(!gui._closed ? false : true);
      }
    };

    // Mouse: prevent default to avoid text selection during drag
    title.addEventListener("mousedown", (e) => { startDrag(e.clientX, e.clientY); e.preventDefault(); });
    document.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    document.addEventListener("mouseup", () => endDrag());

    // Touch: don't preventDefault on touchstart so lil-gui can still respond to taps
    title.addEventListener("touchstart", (e) => {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      if (didMove) e.preventDefault();
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener("touchend", () => endDrag());
  }

  async setup(deps: DevGuiDeps): Promise<void> {
    if (!import.meta.env.DEV) return;

    this.dispose();
    this.scene = deps.scene;

    const { GUI } = await import("lil-gui");
    const gui = new GUI({ title: "Dev Tools" });
    gui.domElement.style.top = "50%";
    gui.domElement.style.right = "0";
    gui.domElement.style.transform = "translateY(-50%)";
    this.makeDraggable(gui);
    this.gui = gui;

    // Game State
    const state = deps.gameStateManager.getState();
    const stateFolder = gui.addFolder("Game State");
    stateFolder.add(state, "gold", 0, 9999, 1).listen().onChange((v: number) => {
      deps.eventBus.emit("gold-changed", { gold: v });
    });
    stateFolder.add(state, "lives", 0, 100, 1).listen().onChange((v: number) => {
      deps.eventBus.emit("lives-changed", { lives: v });
    });

    // Time
    const timeFolder = gui.addFolder("Time");
    const timeProxy = { speed: deps.clock.timeScale };
    timeFolder.add(timeProxy, "speed", 0.25, 4, 0.25).onChange((v: number) => {
      deps.clock.setSpeed(v);
    });

    // Renderer info
    const infoFolder = gui.addFolder("Renderer");
    const info = { drawCalls: 0, triangles: 0 };
    infoFolder.add(info, "drawCalls").listen().disable();
    infoFolder.add(info, "triangles").listen().disable();
    this.devInfo = info;

    // Debug: draw waypoint paths as visible lines (supports multi-path)
    const debugFolder = gui.addFolder("Debug");
    const debugProxy = { showPath: false };
    debugFolder.add(debugProxy, "showPath").name("Show Waypoints").onChange((v: boolean) => {
      if (v) {
        const allWaypoints = deps.map.getAllWaypoints();
        const group = new Group();

        for (let p = 0; p < allWaypoints.length; p++) {
          const waypoints = allWaypoints[p];
          const positions: number[] = [];
          // Offset each path slightly in Y so overlapping segments are visible
          const yOffset = 0.25 + p * 0.05;
          for (const wp of waypoints) {
            positions.push(wp.x, yOffset, wp.z);
          }
          const geo = new BufferGeometry();
          geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
          const color = PATH_DEBUG_COLORS[p % PATH_DEBUG_COLORS.length];
          const mat = new LineBasicMaterial({ color, linewidth: 2 });
          group.add(new Line(geo, mat));
        }

        this.debugPathGroup = group;
        deps.scene.add(group);
      } else {
        this.cleanupDebugPaths();
      }
    });
  }

  updateRendererInfo(drawCalls: number, triangles: number): void {
    if (this.devInfo) {
      this.devInfo.drawCalls = drawCalls;
      this.devInfo.triangles = triangles;
    }
  }

  get hasDevInfo(): boolean {
    return this.devInfo !== null;
  }

  private cleanupDebugPaths(): void {
    if (this.debugPathGroup && this.scene) {
      this.debugPathGroup.traverse((obj) => {
        if (obj instanceof Line) {
          obj.geometry.dispose();
          (obj.material as LineBasicMaterial).dispose();
        }
      });
      this.scene.remove(this.debugPathGroup);
      this.debugPathGroup = null;
    }
    // Legacy single-line cleanup
    if (this.debugPathLine && this.scene) {
      this.scene.remove(this.debugPathLine);
      this.debugPathLine.geometry.dispose();
      (this.debugPathLine.material as LineBasicMaterial).dispose();
      this.debugPathLine = null;
    }
  }

  dispose(): void {
    this.gui?.destroy();
    this.gui = null;
    this.devInfo = null;
    this.cleanupDebugPaths();
  }
}
