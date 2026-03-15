import { ARROW_TOWER, ALL_TOWERS, TOWER_LEVELS, SELL_REFUND_RATIO } from "@/configs/GameBalanceConfigs";
import { Tower } from "@/entities/Tower";
import { EventBus } from "./EventBus";
import { GameStateManager } from "@/systems/GameStateManager";
import { TowerManager } from "@/systems/TowerManager";
import { RangeIndicator } from "@/systems/RangeIndicator";
import { GameMap } from "@/map/GameMap";
import { HUD } from "@/ui/HUD";
import { GridPosition, TowerConfig, TargetingPriority, SoldTowerData } from "@/types";

const TARGETING_ORDER: TargetingPriority[] = [
  TargetingPriority.First,
  TargetingPriority.Nearest,
  TargetingPriority.Strongest,
  TargetingPriority.Weakest,
];

export interface TowerInteractionDeps {
  eventBus: EventBus;
  gameStateManager: GameStateManager;
  towerManager: TowerManager;
  rangeIndicator: RangeIndicator;
  map: GameMap;
  hud: HUD;
}

export class TowerInteractionManager {
  private deps!: TowerInteractionDeps;
  private _selectedTower: TowerConfig = ARROW_TOWER;
  private _selectedEntity: Tower | null = null;

  /** Call once after all systems are created. */
  init(deps: TowerInteractionDeps): void {
    this.deps = deps;
    this._selectedTower = ARROW_TOWER;
    this._selectedEntity = null;
  }

  get selectedTower(): TowerConfig {
    return this._selectedTower;
  }

  get selectedEntity(): Tower | null {
    return this._selectedEntity;
  }

  selectTowerType(config: TowerConfig): void {
    this._selectedTower = config;
    if (this._selectedEntity) {
      this.deselect();
    }
  }

  selectByIndex(index: number): void {
    if (index < 0 || index >= ALL_TOWERS.length) return;
    this._selectedTower = ALL_TOWERS[index];
    this.deps.hud.selectTowerByIndex(index);
    if (this._selectedEntity) {
      this.deselect();
    }
  }

  place(gridPos: GridPosition): void {
    const state = this.deps.gameStateManager.getState();
    if (state.isGameOver) return;
    if (!this.deps.gameStateManager.canAfford(this._selectedTower.cost)) return;

    const tower = this.deps.towerManager.place(this._selectedTower, gridPos);
    if (tower) {
      this.deps.gameStateManager.spendGold(this._selectedTower.cost);
      this.deps.eventBus.emit("tower-placed", { type: this._selectedTower.type, gridPos: { ...gridPos } });
      if (this._selectedEntity) {
        this.deselect();
      }
    }
  }

  select(gridPos: GridPosition): void {
    const tower = this.deps.towerManager.getTowerAt(gridPos);
    if (!tower) return;
    this._selectedEntity = tower;
    const levels = TOWER_LEVELS[tower.config.type];
    this.deps.eventBus.emit("tower-selected", { tower: tower.toInfo(levels.length) });

    const towerPos = tower.getObject3D().position;
    this.deps.rangeIndicator.show(towerPos.x, towerPos.z, tower.config.range);
  }

  deselect(): void {
    if (!this._selectedEntity) return;
    this._selectedEntity = null;
    this.deps.hud.hideUpgradePanel();
    this.deps.rangeIndicator.hide();
  }

  upgrade(): void {
    const tower = this._selectedEntity;
    if (!tower) return;

    const levels = TOWER_LEVELS[tower.config.type];
    const nextIndex = tower.level;
    if (nextIndex >= levels.length) return;

    const cost = tower.config.upgradeCost;
    if (cost == null || !this.deps.gameStateManager.canAfford(cost)) return;

    this.deps.gameStateManager.spendGold(cost);
    this.deps.towerManager.upgradeTower(tower, levels[nextIndex]);
    this.deps.eventBus.emit("tower-upgraded", { tower: tower.toInfo(levels.length) });

    const towerPos = tower.getObject3D().position;
    this.deps.rangeIndicator.show(towerPos.x, towerPos.z, tower.config.range);
  }

  sell(): SoldTowerData | null {
    const tower = this._selectedEntity;
    if (!tower) return null;

    const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATIO);
    const soldData: SoldTowerData = {
      type: tower.config.type,
      level: tower.level,
      totalInvested: tower.totalInvested,
      gridPos: { ...tower.gridPos },
      refund,
      targetingMode: tower.targetingMode,
    };

    this.deps.gameStateManager.addGold(refund);
    this.deps.towerManager.remove(tower);
    this.deps.eventBus.emit("tower-sold", { refund, gridPos: soldData.gridPos });
    this._selectedEntity = null;
    this.deps.hud.hideUpgradePanel();
    this.deps.rangeIndicator.hide();

    return soldData;
  }

  /** Re-place a previously sold tower, deducting the refund gold. */
  undoSell(data: SoldTowerData): boolean {
    // Check if the cell is now occupied (another tower placed there)
    if (!this.deps.towerManager.canPlace(data.gridPos)) return false;

    // Check if the player can afford to give back the refund
    if (!this.deps.gameStateManager.canAfford(data.refund)) return false;

    // Deduct the refund gold
    this.deps.gameStateManager.spendGold(data.refund);

    // Rebuild the tower at the correct level
    const levels = TOWER_LEVELS[data.type];
    const baseConfig = levels[0];
    const tower = this.deps.towerManager.place(baseConfig, data.gridPos);
    if (!tower) return false;

    // Upgrade to the correct level
    for (let i = 1; i < data.level; i++) {
      this.deps.towerManager.upgradeTower(tower, levels[i]);
    }

    // Restore the targeting mode
    tower.targetingMode = data.targetingMode;

    // Patch totalInvested to match original (place sets cost, upgrades add upgradeCost,
    // but we need to make sure the total matches the original investment)
    // Tower constructor sets _totalInvested = config.cost, upgrade() adds upgradeCost.
    // The accumulated total should match data.totalInvested already since we replayed
    // the same configs. But let's not emit tower-placed since this is an undo.
    this.deps.eventBus.emit("tower-sell-undone", { gridPos: data.gridPos });

    return true;
  }

  changeTargeting(priority: TargetingPriority): void {
    if (!this._selectedEntity) return;
    this._selectedEntity.targetingMode = priority;
  }

  cycleTargeting(): void {
    const tower = this._selectedEntity;
    if (!tower) return;
    const idx = TARGETING_ORDER.indexOf(tower.targetingMode);
    tower.targetingMode = TARGETING_ORDER[(idx + 1) % TARGETING_ORDER.length];
    const levels = TOWER_LEVELS[tower.config.type];
    this.deps.eventBus.emit("tower-selected", { tower: tower.toInfo(levels.length) });
  }

  /**
   * Handle long-press on a tower cell. If the tower is not selected, select it
   * (showing the upgrade panel). If the tower is already selected, trigger an upgrade.
   * This provides a touch-friendly alternative to keyboard shortcuts.
   */
  handleLongPress(gridPos: GridPosition): void {
    const tower = this.deps.towerManager.getTowerAt(gridPos);
    if (!tower) return;

    if (this._selectedEntity === tower) {
      // Already selected -- long-press triggers upgrade
      this.upgrade();
    } else {
      // Select the tower (shows upgrade panel)
      this.select(gridPos);
    }
  }

  /** Show range preview when hovering buildable cells. */
  handleCellHover(gridPos: GridPosition | null): void {
    if (this._selectedEntity) return;
    if (gridPos) {
      const worldPos = this.deps.map.getWorldPosition(gridPos);
      this.deps.rangeIndicator.show(worldPos.x, worldPos.z, this._selectedTower.range);
    } else {
      this.deps.rangeIndicator.hide();
    }
  }
}
