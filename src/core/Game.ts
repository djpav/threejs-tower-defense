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
import { MapBuilder } from "@/builder/MapBuilder";
import { generateWavesForLevel } from "@/configs/WaveGenerator";
import { GridPosition, MapConfig, TowerConfig, TargetingPriority, Difficulty } from "@/types";

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
  private isCustomMap = false;
  private levelSelect: LevelSelect;
  private saveManager: SaveManager;
  private towerInteraction = new TowerInteractionManager();
  private keyboard = new KeyboardController();
  private levelManager = new LevelManager();
  private devGui = new DevGui();
  private builder: MapBuilder | null = null;
  private mode: "levelSelect" | "playing" | "builder" = "levelSelect";

  // ── Per-level (recreated each level) ──
  private systems!: LevelSystems;
  private inputManager!: InputManager;
  private levelCleanupFns: Array<() => void> = [];
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
    this.levelSelect = new LevelSelect(
      (index, difficulty) => {
        this.levelSelect.hide();
        this.loadLevel(index, difficulty);
      },
      this.saveManager,
      () => this.enterBuilder(),
    );
  }

  private loadLevel(
    levelIndex: number,
    difficulty: Difficulty = Difficulty.Normal,
    customMapConfig?: MapConfig,
    customGold?: number,
    customLives?: number,
  ): void {
    this.currentLevelIndex = levelIndex;
    this.levelLoaded = true;
    this.mode = "playing";
    this.isEndless = levelIndex === -1;
    this.isCustomMap = levelIndex === -2;

    // Build level config via LevelManager
    const levelConfig = this.levelManager.buildLevelConfig(levelIndex, difficulty);

    // Generate map (or use custom map)
    let mapConfig: MapConfig;
    if (customMapConfig) {
      mapConfig = customMapConfig;
      levelConfig.rows = mapConfig.rows;
      levelConfig.cols = mapConfig.cols;
      levelConfig.name = "Custom Map";
      levelConfig.waves = generateWavesForLevel(5);
      if (customGold != null) levelConfig.startingGold = customGold;
      if (customLives != null) levelConfig.startingLives = customLives;
    } else {
      mapConfig = generateMap(
        {
          rows: levelConfig.rows,
          cols: levelConfig.cols,
          minPathLength: levelConfig.minPathLength,
          seed: levelConfig.seed,
        },
        levelConfig.multiPath,
      );
    }

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
    this.inputManager.setOnLongPress((gridPos: GridPosition) => {
      this.towerInteraction.handleLongPress(gridPos);
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
      onUndoSell: (data) => this.towerInteraction.undoSell(data),
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
      const onWaveComplete = () => {
        const nextWave = this.levelManager.generateNextEndlessWave();
        this.systems.waveManager.addWave(nextWave);
      };
      this.systems.eventBus.on("wave-complete", onWaveComplete);
      this.levelCleanupFns.push(() => this.systems.eventBus.off("wave-complete", onWaveComplete));
    }

    // Save on game-over (skip endless mode)
    const onGameOver = ({ win }: { win: boolean }) => {
      if (levelIndex < 0) return;
      const state = this.systems.gameStateManager.getState();
      if (win) {
        this.saveManager.completeLevel(levelIndex, state.lives, state.wave, state.totalWaves);
      } else {
        this.saveManager.recordAttempt(levelIndex, state.wave, state.totalWaves);
      }
      this.levelSelect.refresh();
    };
    this.systems.eventBus.on("game-over", onGameOver);
    this.levelCleanupFns.push(() => this.systems.eventBus.off("game-over", onGameOver));

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
    // Run tracked cleanup functions before systems are disposed
    for (const cleanup of this.levelCleanupFns) cleanup();
    this.levelCleanupFns = [];

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
    this.mode = "levelSelect";
    this.levelSelect.show();
  }

  private enterBuilder(): void {
    this.levelSelect.hide();
    this.mode = "builder";
    this.builder = new MapBuilder(
      this.canvas,
      () => this.exitBuilder(),
      (mapConfig, gold, lives) => this.playCustomMap(mapConfig, gold, lives),
    );
  }

  private exitBuilder(): void {
    if (this.builder) {
      this.builder.dispose();
      this.builder = null;
    }
    this.showLevelSelect();
  }

  private playCustomMap(mapConfig: MapConfig, gold: number, lives: number): void {
    if (this.builder) {
      this.builder.dispose();
      this.builder = null;
    }
    this.loadLevel(-2, Difficulty.Normal, mapConfig, gold, lives);
  }

  start(): void {
    this.loop();
  }

  private loop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    if (this.mode === "builder" && this.builder) {
      this.builder.update();
      this.renderer.render(this.builder.scene, this.builder.cameraController.camera);
      return;
    }

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
    if (this.mode === "builder" && this.builder) {
      this.builder.resize(w / h);
    } else if (this.levelLoaded) {
      this.systems.cameraController.resize(w / h);
    }
  };

  private setupKeyboard(): void {
    this.keyboard.bindNumberRange(ALL_TOWERS.length, (i) => this.towerInteraction.selectByIndex(i));
    this.keyboard.bind(" ", (e) => { e.preventDefault(); this.hud.togglePause(); });
    this.keyboard.bind("p", () => this.hud.togglePause());
    this.keyboard.bind("u", () => this.towerInteraction.upgrade());
    this.keyboard.bind("s", () => {
      const soldData = this.towerInteraction.sell();
      if (soldData) this.hud.showSellUndo(soldData);
    });
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
    if (this.builder) {
      this.builder.dispose();
      this.builder = null;
    }
    if (this.levelLoaded) {
      this.disposeLevel();
    }
    this.levelSelect.dispose();
    this.renderer.dispose();
  }
}
