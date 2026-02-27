import { EventBus } from "@/core/EventBus";
import { GameState, LevelConfig, TowerConfig, TowerInfo, EnemyInfo, TargetingPriority } from "@/types";
import { TOTAL_LEVELS } from "@/configs/LevelConfigs";
import { EventSubscription } from "@/utils/EventSubscription";
import { StatsBar } from "./StatsBar";
import { TowerBar } from "./TowerBar";
import { UpgradePanel } from "./UpgradePanel";
import { EnemyInfoPanel } from "./EnemyInfoPanel";
import { StartWaveButton } from "./StartWaveButton";
import { MessageOverlay } from "./MessageOverlay";
import { SpeedControls, SpeedControlsCallbacks } from "./SpeedControls";
import { WavePreview } from "./WavePreview";

export interface HUDOptions {
  eventBus: EventBus;
  state: GameState;
  onStartWave: () => void;
  towers: TowerConfig[];
  onTowerSelect: (config: TowerConfig) => void;
  onUpgradeClick: () => void;
  onSellClick: () => void;
  onDeselectTower: () => void;
  onTargetingChange: (priority: TargetingPriority) => void;
  levelConfig: LevelConfig;
  onNextLevel: () => void;
  speedCallbacks: SpeedControlsCallbacks;
  onMuteToggle: () => boolean;
}

export class HUD {
  private container: HTMLDivElement;
  private statsBar: StatsBar;
  private towerBar: TowerBar;
  private upgradePanel: UpgradePanel;
  private enemyInfoPanel: EnemyInfoPanel;
  private startWaveBtn: StartWaveButton;
  private messageOverlay: MessageOverlay;
  private speedControls: SpeedControls;
  private wavePreview: WavePreview;
  private muteBtn: HTMLButtonElement;
  private subs: EventSubscription;
  private currentGold: number;
  private currentLives: number;
  private currentWave = 0;
  private levelConfig: LevelConfig;
  private onNextLevel: () => void;

  constructor(options: HUDOptions) {
    const {
      eventBus, state, onStartWave, towers, onTowerSelect,
      onUpgradeClick, onSellClick, onDeselectTower, onTargetingChange,
      levelConfig, onNextLevel, speedCallbacks, onMuteToggle,
    } = options;
    this.subs = new EventSubscription(eventBus);
    this.currentGold = state.gold;
    this.currentLives = state.lives;
    this.levelConfig = levelConfig;
    this.onNextLevel = onNextLevel;

    // Root container
    this.container = document.createElement("div");
    this.container.className =
      "fixed inset-x-0 top-0 pointer-events-none z-10 font-game select-none";

    // Child components
    this.statsBar = new StatsBar(state);
    this.towerBar = new TowerBar(towers, onTowerSelect);
    this.upgradePanel = new UpgradePanel(onUpgradeClick, onSellClick, onDeselectTower);
    this.upgradePanel.setOnTargetingChange(onTargetingChange);
    this.enemyInfoPanel = new EnemyInfoPanel(() => {
      eventBus.emit("enemy-deselected", {});
    });
    this.startWaveBtn = new StartWaveButton(onStartWave);
    this.messageOverlay = new MessageOverlay();
    this.speedControls = new SpeedControls(speedCallbacks);
    this.wavePreview = new WavePreview(levelConfig.waves);

    // Mute button
    this.muteBtn = document.createElement("button");
    this.muteBtn.textContent = "\uD83D\uDD0A";
    this.muteBtn.className =
      "fixed top-12 right-12 p-1 px-2 text-lg bg-black/65 border border-white/15 rounded-md text-white cursor-pointer pointer-events-auto z-[11] hover:bg-white/10 transition-colors";
    this.muteBtn.addEventListener("click", () => {
      const muted = onMuteToggle();
      this.muteBtn.textContent = muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
    });

    this.container.append(
      this.statsBar.getElement(),
      this.towerBar.getElement(),
      this.upgradePanel.getElement(),
      this.enemyInfoPanel.getElement(),
      this.startWaveBtn.getElement(),
      this.messageOverlay.getElement(),
      this.speedControls.getElement(),
      this.wavePreview.getElement(),
      this.muteBtn,
    );
    document.body.appendChild(this.container);

    this.towerBar.updateAffordability(state.gold);

    // Subscribe to events
    this.subs.on("gold-changed", ({ gold }) => {
      this.currentGold = gold;
      this.statsBar.setGold(gold);
      this.towerBar.updateAffordability(gold);
      this.upgradePanel.updateAffordability(gold);
    });

    this.subs.on("lives-changed", ({ lives }) => {
      this.currentLives = lives;
      this.statsBar.setLives(lives);
    });

    this.subs.on("wave-complete", ({ wave }) => {
      this.currentWave = wave;
      this.statsBar.setWave(wave);
      this.startWaveBtn.setReady();
      this.wavePreview.setWave(wave);
    });

    this.subs.on("game-over", ({ win }) => {
      if (win && this.levelConfig.level < TOTAL_LEVELS) {
        this.messageOverlay.showLevelComplete(
          this.levelConfig.name,
          this.currentLives,
          this.levelConfig.startingLives,
          this.currentWave,
          this.onNextLevel,
        );
      } else if (win) {
        this.messageOverlay.showVictory();
      } else {
        this.messageOverlay.showDefeat();
      }
      this.startWaveBtn.setGameOver();
      this.speedControls.setGameOver();
      this.towerBar.hide();
      this.startWaveBtn.hide();
      this.wavePreview.hide();
      this.upgradePanel.hide();
      this.enemyInfoPanel.hide();
    });

    this.subs.on("tower-selected", ({ tower }) => {
      this.enemyInfoPanel.hide();
      this.towerBar.hide();
      this.upgradePanel.showTower(tower, this.currentGold);
    });

    this.subs.on("tower-upgraded", ({ tower }) => {
      this.upgradePanel.showTower(tower, this.currentGold);
    });

    this.subs.on("enemy-selected", ({ enemy }) => {
      this.upgradePanel.hide();
      this.towerBar.hide();
      this.enemyInfoPanel.showEnemy(enemy);
    });

    this.subs.on("enemy-deselected", () => {
      this.enemyInfoPanel.hide();
      this.towerBar.show();
    });

    // Fire initial tower selection
    onTowerSelect(towers[0]);
  }

  hideUpgradePanel(): void {
    this.upgradePanel.hide();
    this.towerBar.show();
  }

  hideEnemyPanel(): void {
    this.enemyInfoPanel.hide();
    this.towerBar.show();
  }

  toggleAutoStart(): void {
    this.startWaveBtn.toggleAutoStart();
  }

  toggleLevelAutoStart(): void {
    this.messageOverlay.toggleAutoStart();
  }

  togglePause(): void {
    this.speedControls.togglePause();
  }

  toggleMute(): void {
    this.muteBtn.click();
  }

  selectTowerByIndex(index: number): void {
    this.towerBar.selectByIndex(index);
  }

  dispose(): void {
    this.subs.disposeAll();

    // Dispose child components
    this.statsBar.dispose();
    this.towerBar.dispose();
    this.upgradePanel.dispose();
    this.enemyInfoPanel.dispose();
    this.startWaveBtn.dispose();
    this.messageOverlay.dispose();
    this.speedControls.dispose();
    this.wavePreview.dispose();
    this.container.remove();
  }
}
