# Architecture

## Tech Stack
- **Runtime**: Vite 6.1 + TypeScript (strict) + Three.js (OrthographicCamera)
- **Styling**: Tailwind CSS v4.2 via `@tailwindcss/vite` plugin
- **Testing**: Vitest 4.0
- **Audio**: Web Audio API (no audio files, all synthesized)
- **Persistence**: localStorage

## Directory Structure

```
src/
  core/           Game orchestrator, clock, input, camera, event bus
    Game.ts              Top-level orchestrator: renderer, scene, camera, game loop
    GameClock.ts         THREE.Clock wrapper with timeScale (pause/speed)
    EventBus.ts          Typed pub/sub for cross-system communication
    InputManager.ts      Raycasting mouse interaction with grid
    KeyboardController.ts  Hotkey bindings
    TowerInteractionManager.ts  Tower place/select/upgrade/sell orchestration
  entities/       GameObject base class and concrete entities
    GameObject.ts        Abstract base: owns Object3D, requires update/dispose
    Enemy.ts             Enemy with HP, movement, slow, poison, stealth, health bar
    Tower.ts             Tower with cooldown, rotation, upgrade, procedural mesh
    Projectile.ts        Homing projectile with pooling support
    GridCell.ts          Colored slab representing one map cell
  map/            Map construction and data
    GameMap.ts           Creates/owns all GridCell instances + signboard markers
    MapGenerator.ts      Seeded procedural path generation (Mulberry32 PRNG)
    MapData.ts           Map validation and data structures
  systems/        Game systems (update each frame)
    TowerManager.ts      Tower lifecycle: placement, removal, upgrades
    EnemyManager.ts      Enemy spawning, updates, healer/splitter logic
    ProjectileManager.ts Pooled projectiles, impact resolution
    CombatSystem.ts      Per-frame targeting, firing, stealth detection
    WaveManager.ts       Wave state machine: idle -> spawning -> active
    GameStateManager.ts  Gold, lives, wave tracking, win/lose conditions
    EffectManager.ts     Visual effect lifecycle (all pooled)
    AudioManager.ts      Synthesized sound effects via Web Audio API
    SaveManager.ts       localStorage persistence with versioning
    RangeIndicator.ts    Semi-transparent range ring mesh
    effects/             Visual effect implementations
      Effect.ts              Effect interface
      DeathBurstEffect.ts    Particle explosion on enemy death
      ImpactFlashEffect.ts   Ring flash on projectile impact
      TeslaPulseEffect.ts    Expanding ring for Tesla AoE
      ChainLightningEffect.ts  Beam between chain targets
  configs/        Static game data
    GameBalanceConfigs.ts  All tower and enemy stat definitions (21 tower + 9 enemy configs)
    LevelConfigs.ts        10 campaign level definitions + wave generation
    EndlessWaveGenerator.ts  Infinite wave generation with scaling
  ui/             DOM-based HUD components (Tailwind CSS)
    UIComponent.ts       Abstract base: owns root DOM element
    HUD.ts               Master container wiring all child components
    StatsBar.ts          Top bar stats display
    TowerBar.ts          Tower selection bar
    TowerButton.ts       Individual tower button
    TowerTooltip.ts      Hover tooltip for towers
    UpgradePanel.ts      Selected tower info + actions
    StartWaveButton.ts   Wave start button with pulse animation
    SpeedControls.ts     Pause + speed buttons
    WavePreview.ts       Next wave preview badges
    LevelSelect.ts       Level selection screen
    MessageOverlay.ts    Victory/Defeat/Complete overlays
    DamageNumbers.ts     Floating damage text (3D -> 2D projection)
  rendering/      Camera and rendering
    CameraController.ts  OrthographicCamera with OrbitControls
  types/          Shared types, enums, interfaces
    index.ts             TowerType, EnemyType, Difficulty, TargetingPriority, etc.
  utils/          Utilities
    ObjectPool.ts        Generic object pool (LIFO)
  style.css       Tailwind entry + @theme tokens + @layer components
  main.ts         Entry point
tests/            Unit tests (Vitest)
docs/             Documentation
```

## Class Hierarchy

```
GameObject (abstract)
  +-- Enemy
  +-- Tower
  +-- Projectile
  +-- GridCell

UIComponent (abstract)
  +-- StatsBar, TowerBar, TowerButton, TowerTooltip
  +-- UpgradePanel, StartWaveButton, SpeedControls
  +-- WavePreview, LevelSelect, MessageOverlay

Effect (interface)
  +-- DeathBurstEffect, ImpactFlashEffect
  +-- TeslaPulseEffect, ChainLightningEffect
```

## Game Loop Order (per frame)

```
1. WaveManager.update(delta)       -- spawn enemies from wave queue
2. EnemyManager.update(delta)      -- move enemies, process healers/splitters
3. TowerManager.update(delta)      -- tick tower cooldowns, animate
4. CombatSystem.update(delta)      -- find targets, fire, stealth detection
5. ProjectileManager.update(delta) -- move projectiles, handle impacts
6. EffectManager.update(delta)     -- animate visual effects
7. DamageNumbers.update(delta)     -- animate floating damage text
```

## EventBus Events

| Event | Payload | Emitted By |
|-------|---------|------------|
| `enemy-killed` | `{ reward }` | EnemyManager |
| `enemy-reached-goal` | `{}` | EnemyManager |
| `wave-complete` | `{ wave }` | WaveManager |
| `wave-start` | `{ wave }` | WaveManager |
| `gold-changed` | `{ gold }` | GameStateManager |
| `lives-changed` | `{ lives }` | GameStateManager |
| `game-over` | `{ win }` | GameStateManager |
| `tower-placed` | `{ tower }` | TowerInteractionManager |
| `tower-selected` | `{ tower }` | TowerInteractionManager |
| `tower-upgraded` | `{ tower }` | TowerInteractionManager |
| `tower-sold` | `{}` | TowerInteractionManager |

## Key Design Decisions

- **No entity caching in combat**: `findBestTarget()` re-evaluates all enemies every frame for correctness
- **Object pooling**: Projectiles and all 4 effect types are pooled to avoid GC pressure
- **EventBus decoupling**: Systems communicate via typed events, not direct references
- **Procedural everything**: Maps are seeded-random, tower models built from primitives, audio synthesized
- **CSS-first hover states**: All UI hover effects use CSS `:hover` pseudo-selectors, no JS style mutation
