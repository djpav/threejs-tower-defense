import { WebGLRenderer } from "three";
import { GameClock } from "./GameClock";
import { InputManager } from "./InputManager";
import { TowerInteractionManager } from "./TowerInteractionManager";
import { KeyboardController } from "./KeyboardController";
import { SceneSetup } from "./SceneSetup";
import { LevelManager } from "./LevelManager";
import { DevGui } from "./DevGui";
import { createLevelSystems, disposeLevelSystems, LevelSystems } from "./SystemFactory";
import { generateMap } from "@/map/MapGenerator";
import { ALL_TOWERS } from "@/configs/GameBalanceConfigs";
import { SaveManager } from "@/systems/SaveManager";
import { HUD } from "@/ui/HUD";
import { LevelSelect } from "@/ui/LevelSelect";
import { GridPosition, TowerConfig, TargetingPriority, Difficulty } from "@/types";

export class Game {
  // ── Persistent (survive across levels) ──
  private renderer: WebGLRenderer;
  private sceneSetup: SceneSetup;
  private clock: GameClock;
  private canvas: HTMLCanvasElement;
  private animationFrameId = 0;
  private currentLevelIndex = 0;
  private levelLoaded = false;
  private isEndless = false;
  private levelSelect: LevelSelect;
  private saveManager: SaveManager;
  private towerInteraction = new TowerInteractionManager();
  private keyboard = new KeyboardController();
  private levelManager = new LevelManager();
  private devGui = new DevGui();

  // ── Per-level (recreated each level) ──
  private systems!: LevelSystems;
  private inputManager!: InputManager;
  private hud!: HUD;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Renderer (persistent)
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene (persistent)
    this.sceneSetup = new SceneSetup();

    // Clock (persistent)
    this.clock = new GameClock();

    // Resize handler (persistent)
    window.addEventListener("resize", this.onResize);

    // Save manager (persistent)
    this.saveManager = new SaveManager();

    // Level select (persistent)
    this.levelSelect = new LevelSelect((index, difficulty) => {
      this.levelSelect.hide();
      this.loadLevel(index, difficulty);
    }, this.saveManager);
  }

  private loadLevel(levelIndex: number, difficulty: Difficulty = Difficulty.Normal): void {
    this.currentLevelIndex = levelIndex;
    this.levelLoaded = true;
    this.isEndless = levelIndex === -1;

    // Build level config via LevelManager
    const levelConfig = this.levelManager.buildLevelConfig(levelIndex, difficulty);

    // Generate map
    const mapConfig = generateMap({
      rows: levelConfig.rows,
      cols: levelConfig.cols,
      minPathLength: levelConfig.minPathLength,
      seed: levelConfig.seed,
    });

    // Create all systems
    this.systems = createLevelSystems(
      mapConfig,
      levelConfig,
      this.sceneSetup,
      this.canvas,
      this.isEndless,
    );

    // Add map to scene
    this.sceneSetup.scene.add(this.systems.map.getObject3D());

    // Fog
    const mapDiag = Math.sqrt(
      (mapConfig.cols * mapConfig.cellSize) ** 2 +
      (mapConfig.rows * mapConfig.cellSize) ** 2,
    );
    const camDist = this.systems.cameraController.camera.position.length();
    this.sceneSetup.applyFog(mapDiag, camDist);

    // Input
    this.inputManager = new InputManager(
      this.canvas,
      this.systems.cameraController.camera,
      this.systems.map,
      this.sceneSetup.enemyGroup,
    );
    this.inputManager.setOnCellClick((gridPos: GridPosition) => {
      this.towerInteraction.place(gridPos);
    });
    this.inputManager.setOnTowerClick((gridPos: GridPosition) => {
      this.towerInteraction.select(gridPos);
    });
    this.inputManager.setOnEmptyClick(() => {
      this.towerInteraction.deselect();
      this.systems.eventBus.emit("enemy-deselected", {});
    });
    this.inputManager.setOnEnemyClick((enemy) => {
      this.towerInteraction.deselect();
      this.systems.eventBus.emit("enemy-selected", { enemy: enemy.toInfo() });
    });
    this.inputManager.setOnCellHover((gridPos: GridPosition | null) => {
      this.towerInteraction.handleCellHover(gridPos);
    });

    // HUD
    this.hud = new HUD({
      eventBus: this.systems.eventBus,
      state: this.systems.gameStateManager.getState(),
      onStartWave: () => this.systems.waveManager.startWave(),
      towers: ALL_TOWERS,
      onTowerSelect: (config: TowerConfig) => { this.towerInteraction.selectTowerType(config); },
      onUpgradeClick: () => this.towerInteraction.upgrade(),
      onSellClick: () => this.towerInteraction.sell(),
      onDeselectTower: () => this.towerInteraction.deselect(),
      onTargetingChange: (priority: TargetingPriority) => this.towerInteraction.changeTargeting(priority),
      levelConfig,
      onNextLevel: () => {
        if (this.levelLoaded) {
          this.disposeLevel();
          this.levelLoaded = false;
        }
        this.loadLevel(this.currentLevelIndex + 1, difficulty);
      },
      speedCallbacks: {
        onPause: () => this.clock.pause(),
        onResume: () => this.clock.resume(),
        onSetSpeed: (speed: number) => this.clock.setSpeed(speed),
      },
      onMuteToggle: () => this.systems.audioManager.toggleMute(),
    });

    // Wire tower interaction after HUD is ready
    this.towerInteraction.init({
      eventBus: this.systems.eventBus,
      gameStateManager: this.systems.gameStateManager,
      towerManager: this.systems.towerManager,
      rangeIndicator: this.systems.rangeIndicator,
      map: this.systems.map,
      hud: this.hud,
    });

    // Keyboard shortcuts
    this.setupKeyboard();

    // Endless mode: generate next wave after each wave completes
    if (this.isEndless) {
      this.systems.eventBus.on("wave-complete", () => {
        const nextWave = this.levelManager.generateNextEndlessWave();
        this.systems.waveManager.addWave(nextWave);
      });
    }

    // Save on game-over (skip endless mode)
    this.systems.eventBus.on("game-over", ({ win }) => {
      if (levelIndex < 0) return;
      const state = this.systems.gameStateManager.getState();
      if (win) {
        this.saveManager.completeLevel(levelIndex, state.lives, state.wave, state.totalWaves);
      } else {
        this.saveManager.recordAttempt(levelIndex, state.wave, state.totalWaves);
      }
      this.levelSelect.refresh();
    });

    // Dev GUI (tree-shaken from production)
    this.devGui.setup({
      scene: this.sceneSetup.scene,
      clock: this.clock,
      eventBus: this.systems.eventBus,
      gameStateManager: this.systems.gameStateManager,
      map: this.systems.map,
    });
  }

  private disposeLevel(): void {
    this.devGui.dispose();
    this.hud.dispose();
    this.inputManager.dispose();
    disposeLevelSystems(this.systems, this.sceneSetup.scene);
    this.sceneSetup.clearGroups();
  }

  private showLevelSelect(): void {
    if (this.levelLoaded) {
      this.disposeLevel();
      this.levelLoaded = false;
    }
    this.levelSelect.show();
  }

  start(): void {
    this.loop();
  }

  private loop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();

    if (this.levelLoaded) {
      if (!this.systems.gameStateManager.getState().isGameOver) {
        this.systems.waveManager.update(delta);
        this.systems.enemyManager.update(delta);
        this.systems.towerManager.update(delta);
        this.systems.combatSystem.update(delta);
        this.systems.projectileManager.update(delta);
        this.systems.effectManager.update(delta);
      }

      this.systems.damageNumbers.update(delta);
      this.systems.cameraController.update();
      this.systems.map.update(delta);
      this.renderer.render(this.sceneSetup.scene, this.systems.cameraController.camera);

      if (this.devGui.hasDevInfo) {
        this.devGui.updateRendererInfo(
          this.renderer.info.render.calls,
          this.renderer.info.render.triangles,
        );
      }
    }
  };

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.levelLoaded) {
      this.systems.cameraController.resize(w / h);
    }
  };

  private setupKeyboard(): void {
    this.keyboard.bindNumberRange(ALL_TOWERS.length, (i) => this.towerInteraction.selectByIndex(i));
    this.keyboard.bind(" ", (e) => { e.preventDefault(); this.hud.togglePause(); });
    this.keyboard.bind("p", () => this.hud.togglePause());
    this.keyboard.bind("u", () => this.towerInteraction.upgrade());
    this.keyboard.bind("s", () => this.towerInteraction.sell());
    this.keyboard.bind("t", () => this.towerInteraction.cycleTargeting());
    this.keyboard.bind("m", () => this.hud.toggleMute());
    this.keyboard.bind("a", () => this.hud.toggleAutoStart());
    this.keyboard.bind("l", () => this.hud.toggleLevelAutoStart());
    this.keyboard.bind("escape", () => this.towerInteraction.deselect());
    this.keyboard.setEnabled(true);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("resize", this.onResize);
    this.keyboard.dispose();
    if (this.levelLoaded) {
      this.disposeLevel();
    }
    this.levelSelect.dispose();
    this.renderer.dispose();
  }
}
