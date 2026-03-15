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
import { DifficultyScaler } from "@/systems/DifficultyScaler";
import { DamageNumbers } from "@/ui/DamageNumbers";
import { DistanceField } from "@/map/DistanceField";
import { InfluenceMap } from "@/map/InfluenceMap";
import { LevelConfig, MapConfig, WorldPosition } from "@/types";

export interface LevelSystems {
  eventBus: EventBus;
  cameraController: CameraController;
  map: GameMap;
  distanceField: DistanceField;
  influenceMap: InfluenceMap;
  enemyManager: EnemyManager;
  towerManager: TowerManager;
  projectileManager: ProjectileManager;
  combatSystem: CombatSystem;
  waveManager: WaveManager;
  gameStateManager: GameStateManager;
  effectManager: EffectManager;
  rangeIndicator: RangeIndicator;
  audioManager: AudioManager;
  difficultyScaler: DifficultyScaler;
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
  const distanceField = new DistanceField(mapConfig);
  const influenceMap = new InfluenceMap(mapConfig);
  const waypoints = map.getWaypoints();
  const allWaypoints = map.getAllWaypoints();

  const enemyManager = new EnemyManager(groups.enemyGroup, eventBus, waypoints, allWaypoints);
  const towerManager = new TowerManager(groups.towerGroup, map, distanceField);
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

  // Adaptive difficulty — scales enemy HP/speed at spawn time
  const difficultyScaler = new DifficultyScaler(eventBus);
  enemyManager.setDifficultyScaler(difficultyScaler);

  // Rebuild influence map whenever towers change (placed, sold, upgraded, undo-sold).
  // Note: these listeners are cleaned up by eventBus.clear() in disposeLevelSystems.
  // No explicit off() needed since the entire EventBus is cleared on level dispose.
  const rebuildInfluence = () => {
    influenceMap.rebuild(towerManager.getTowers());
  };
  eventBus.on("tower-placed", rebuildInfluence);
  eventBus.on("tower-sold", rebuildInfluence);
  eventBus.on("tower-upgraded", rebuildInfluence);
  eventBus.on("tower-sell-undone", rebuildInfluence);

  // Rebuild distance field when towers change (for future maze-building path validation).
  // Cleaned up by eventBus.clear() alongside the influence map listeners above.
  const rebuildDistanceField = () => {
    distanceField.rebuild(mapConfig.grid);
  };
  eventBus.on("tower-placed", rebuildDistanceField);
  eventBus.on("tower-sold", rebuildDistanceField);

  return {
    eventBus,
    cameraController,
    map,
    distanceField,
    influenceMap,
    enemyManager,
    towerManager,
    projectileManager,
    combatSystem,
    waveManager,
    gameStateManager,
    effectManager,
    rangeIndicator,
    audioManager,
    difficultyScaler,
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
  systems.difficultyScaler.dispose();
  systems.cameraController.dispose();
  scene.remove(systems.map.getObject3D());
  systems.map.dispose();
  systems.eventBus.clear();
}
