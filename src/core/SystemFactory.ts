import { Group } from "three";
import { EventBus } from "./EventBus";
import { CameraController } from "@/rendering/CameraController";
import { GameMap } from "@/map/GameMap";
import { EnemyManager } from "@/systems/EnemyManager";
import { TowerManager } from "@/systems/TowerManager";
import { ProjectileManager } from "@/systems/ProjectileManager";
import { CombatSystem } from "@/systems/CombatSystem";
import { WaveManager } from "@/systems/WaveManager";
import { GameStateManager } from "@/systems/GameStateManager";
import { EffectManager } from "@/systems/EffectManager";
import { RangeIndicator } from "@/systems/RangeIndicator";
import { AudioManager } from "@/systems/AudioManager";
import { DamageNumbers } from "@/ui/DamageNumbers";
import { LevelConfig, MapConfig, WorldPosition } from "@/types";

export interface LevelSystems {
  eventBus: EventBus;
  cameraController: CameraController;
  map: GameMap;
  enemyManager: EnemyManager;
  towerManager: TowerManager;
  projectileManager: ProjectileManager;
  combatSystem: CombatSystem;
  waveManager: WaveManager;
  gameStateManager: GameStateManager;
  effectManager: EffectManager;
  rangeIndicator: RangeIndicator;
  audioManager: AudioManager;
  damageNumbers: DamageNumbers;
}

export interface LevelGroups {
  towerGroup: Group;
  enemyGroup: Group;
  projectileGroup: Group;
  effectGroup: Group;
  uiGroup: Group;
}

export function createLevelSystems(
  mapConfig: MapConfig,
  levelConfig: LevelConfig,
  groups: LevelGroups,
  canvas: HTMLCanvasElement,
  isEndless: boolean,
): LevelSystems {
  const eventBus = new EventBus();

  const aspect = window.innerWidth / window.innerHeight;
  const cameraController = new CameraController(mapConfig, aspect, canvas);

  const map = new GameMap(mapConfig);
  const waypoints = map.getWaypoints();

  const enemyManager = new EnemyManager(groups.enemyGroup, eventBus, waypoints);
  const towerManager = new TowerManager(groups.towerGroup, map);
  const projectileManager = new ProjectileManager(groups.projectileGroup, enemyManager);
  const combatSystem = new CombatSystem(towerManager, enemyManager, projectileManager);
  const waveManager = new WaveManager(levelConfig.waves, enemyManager, eventBus);
  const gameStateManager = new GameStateManager(
    eventBus,
    isEndless ? Infinity : levelConfig.waves.length,
    {
      startingGold: levelConfig.startingGold,
      startingLives: levelConfig.startingLives,
      level: levelConfig.level,
      levelName: levelConfig.name,
    },
  );

  // Effect system
  const effectManager = new EffectManager(groups.effectGroup);
  enemyManager.setEffectManager(effectManager);
  projectileManager.setEffectManager(effectManager);
  combatSystem.setEffectManager(effectManager);

  // Damage numbers
  const damageNumbers = new DamageNumbers();
  damageNumbers.setCamera(cameraController.camera);
  effectManager.setDamageCallback((x, y, z, damage, color) => {
    damageNumbers.spawn(x, y, z, damage, color);
  });

  // Range indicator
  const rangeIndicator = new RangeIndicator(groups.uiGroup);

  // Audio
  const audioManager = new AudioManager(eventBus);

  return {
    eventBus,
    cameraController,
    map,
    enemyManager,
    towerManager,
    projectileManager,
    combatSystem,
    waveManager,
    gameStateManager,
    effectManager,
    rangeIndicator,
    audioManager,
    damageNumbers,
  };
}

export function disposeLevelSystems(systems: LevelSystems, scene: import("three").Scene): void {
  systems.combatSystem.dispose();
  systems.projectileManager.dispose();
  systems.towerManager.dispose();
  systems.enemyManager.dispose();
  systems.waveManager.dispose();
  systems.gameStateManager.dispose();
  systems.effectManager.dispose();
  systems.rangeIndicator.dispose();
  systems.audioManager.dispose();
  systems.damageNumbers.dispose();
  systems.cameraController.dispose();
  scene.remove(systems.map.getObject3D());
  systems.map.dispose();
  systems.eventBus.clear();
}
