import type { GUI } from "lil-gui";
import {
  Scene,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
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

export class DevGui {
  private gui: GUI | null = null;
  private devInfo: { drawCalls: number; triangles: number } | null = null;
  private debugPathLine: Line | null = null;
  private scene: Scene | null = null;

  async setup(deps: DevGuiDeps): Promise<void> {
    if (!import.meta.env.DEV) return;

    this.dispose();
    this.scene = deps.scene;

    const { GUI } = await import("lil-gui");
    const gui = new GUI({ title: "Dev Tools" });
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

    // Debug: draw waypoint path as a visible line
    const debugFolder = gui.addFolder("Debug");
    const debugProxy = { showPath: false };
    debugFolder.add(debugProxy, "showPath").name("Show Waypoints").onChange((v: boolean) => {
      if (v) {
        const waypoints = deps.map.getWaypoints();
        const positions: number[] = [];
        for (const wp of waypoints) {
          positions.push(wp.x, 0.25, wp.z);
        }
        const geo = new BufferGeometry();
        geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
        const mat = new LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
        this.debugPathLine = new Line(geo, mat);
        deps.scene.add(this.debugPathLine);
      } else if (this.debugPathLine) {
        deps.scene.remove(this.debugPathLine);
        this.debugPathLine.geometry.dispose();
        (this.debugPathLine.material as LineBasicMaterial).dispose();
        this.debugPathLine = null;
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

  dispose(): void {
    this.gui?.destroy();
    this.gui = null;
    this.devInfo = null;
    if (this.debugPathLine && this.scene) {
      this.scene.remove(this.debugPathLine);
      this.debugPathLine.geometry.dispose();
      (this.debugPathLine.material as LineBasicMaterial).dispose();
      this.debugPathLine = null;
    }
  }
}
