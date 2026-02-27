# Features

Complete inventory of all implemented features.

---

## Towers (7 types, 3 upgrade levels each)

| Tower | Cost | Mechanic | Lv1 DMG | Lv3 DMG | Range | Fire Rate |
|-------|------|----------|---------|---------|-------|-----------|
| Arrow | 25g | Basic all-rounder | 25 | 50 | 2.5-3.2 | 1.0-1.6/s |
| Cannon | 60g | Splash damage, can't hit flying | 60 | 130 | 2.0-2.6 | 0.5-0.7/s |
| Frost | 40g | Slows enemies (50%-30%) | 12 | 28 | 2.2-2.8 | 1.0-1.4/s |
| Lightning | 50g | Chain lightning (2-4 targets) | 30 | 65 | 2.5-3.2 | 0.8-1.2/s |
| Poison | 45g | DOT stacks (3-5 max) | 10 | 22 | 2.2-2.8 | 0.9-1.3/s |
| Sniper | 70g | Long range, high single-target | 100 | 250 | 5.0-6.0 | 0.3-0.4/s |
| Tesla | 80g | AoE pulse (no projectile) | 20 | 55 | 1.8-2.4 | 0.8-1.2/s |

### Upgrade System
- 3 levels per tower (Lv1 = base, Lv2, Lv3 = MAX)
- Visual: 10% scale increase per level, emissive glow at Lv2+
- Placement animation: spring overshoot from scale 0 to 1

### Targeting Modes
- **First** (default) -- furthest along the path
- **Nearest** -- closest by distance
- **Strongest** -- highest HP
- **Weakest** -- lowest HP
- Cyclable via UI button or `T` hotkey

---

## Enemies (9 types)

| Type | HP | Speed | Reward | Special |
|------|-----|-------|--------|---------|
| Basic | 100 | 2.0 | 10g | None |
| Fast Runner | 50 | 3.0 | 8g | High speed, low HP |
| Tank | 300 | 1.2 | 20g | High HP, slow |
| Shielded | 200 | 1.6 | 15g | Moderate stats |
| Boss | 1000 | 0.8 | 100g | Massive HP |
| Flying | 80 | 2.5 | 12g | Flies at y=1.5, skips path, Cannon can't target |
| Healer | 150 | 1.5 | 18g | Heals allies in 2.0 radius (10 HP/s) |
| Splitter | 120 | 1.8 | 15g | Splits into 2 children on death (40 HP each) |
| Stealth | 90 | 2.0 | 14g | Invisible until tower within 2.0 range reveals |

### Enemy Mechanics
- **Health bar**: Canvas sprite, color-coded (green > orange > red)
- **Slow effect**: Keeps stronger slow, timer-based
- **Poison**: Independent stacks with per-stack timers, green glow scales with stacks
- **Stealth**: Revealed/concealed per-frame by CombatSystem distance check

---

## Levels (10 campaign + Endless)

| # | Name | Grid | Waves | Gold | Lives | New Enemies |
|---|------|------|-------|------|-------|-------------|
| 1 | Forest Clearing | 12x8 | 5 | 120 | 25 | Basic |
| 2 | River Crossing | 14x10 | 7 | 100 | 20 | Fast Runners |
| 3 | Mountain Pass | 16x10 | 9 | 100 | 20 | Boss |
| 4 | Dark Swamp | 16x12 | 11 | 90 | 18 | Tanks |
| 5 | Frozen Wastes | 18x12 | 13 | 80 | 15 | Shielded |
| 6 | Dragon's Gate | 20x14 | 15 | 80 | 12 | -- |
| 7 | Sky Fortress | 20x14 | 17 | 100 | 15 | Flying |
| 8 | Cursed Depths | 22x16 | 19 | 100 | 12 | Healers, Splitters |
| 9 | Shadow Realm | 24x16 | 21 | 110 | 10 | Stealth |
| 10 | Final Bastion | 26x18 | 23 | 120 | 10 | All types |

### Endless Mode
- 12x12 grid, 200 gold, 20 lives
- Infinite waves with 15% HP scaling per wave
- Enemy types unlock progressively (Basic always, Boss every 10th wave)
- Random seed each run

### Difficulty Modes

| Difficulty | Enemy HP | Enemy Speed | Gold | Lives |
|-----------|----------|-------------|------|-------|
| Easy | x0.7 | x0.85 | x1.3 | x1.5 |
| Normal | x1.0 | x1.0 | x1.0 | x1.0 |
| Hard | x1.5 | x1.2 | x0.8 | x0.6 |

### Map Generation
- Seeded PRNG (Mulberry32) for reproducible maps
- Serpentine path algorithm with validation
- Minimum 30% buildable cells required
- Fallback to deterministic zigzag after 30 failed attempts

---

## Combat System

- **Per-frame targeting**: `findBestTarget()` re-evaluates all enemies every frame (no cached target)
- **Cooldown**: `1 / fireRate` seconds between shots
- **Projectiles**: Object-pooled, homing, self-destruct on target death
- **Impact resolution order**: Direct damage -> Slow -> Poison -> Chain Lightning -> Splash
- **Splash**: 50% of main damage, also applies slow to splash targets
- **Chain Lightning**: Chains to nearest unchained enemies, multiplicative damage falloff per hop
- **Tesla Pulse**: Instant AoE, no projectile, expanding ring visual
- **Stealth Detection**: All towers check distance to stealth enemies each frame (reveal range: 2.0)

---

## Economy

- Tower costs: 25g (Arrow) to 80g (Tesla)
- Upgrade costs: 30g-90g per level
- Kill rewards: 5g (Splitter child) to 100g (Boss)
- Sell refund: 75% of total invested
- 1 life lost per enemy reaching goal

---

## UI Components (13 classes)

| Component | Description |
|-----------|-------------|
| StatsBar | Top bar: level, gold, lives, wave counter |
| TowerBar | Bottom bar: 7 tower selection buttons with hotkeys |
| TowerButton | Individual tower button with tooltip on hover |
| TowerTooltip | Floating tooltip with tower stats and mechanics |
| UpgradePanel | Tower info + upgrade/sell/targeting/close buttons |
| StartWaveButton | Green pulsing button, disabled during waves |
| SpeedControls | Pause + 1x/2x/4x speed buttons |
| WavePreview | Next wave composition with colored shape badges |
| LevelSelect | Full-screen level grid with stars + difficulty picker |
| MessageOverlay | Victory/Defeat/Level Complete with animations |
| DamageNumbers | Floating damage text projected from 3D to screen |
| HUD | Master container wiring all components via EventBus |
| UIComponent | Abstract base class (show/hide/dispose) |

### Styling
- Tailwind CSS v4.2 with custom `@theme` tokens and `@layer components` classes
- CSS `:hover` / `:disabled` pseudo-selectors (no JS hover handlers for styling)
- Animations: pulse-green, overlay-entrance, star-pop

---

## Audio (Web Audio API)

All sounds synthesized at runtime -- no audio files.

| Event | Sound |
|-------|-------|
| Tower placed | Rising square-wave tones |
| Tower upgraded | Ascending arpeggio |
| Tower sold | Descending "coin" sound |
| Enemy killed | Short noise pop + low tone |
| Enemy leaked | Low sawtooth buzz |
| Wave start | Alert horn |
| Wave complete | Victory chime (C-E-G) |
| Victory | Ascending 6-note scale |
| Defeat | Descending tones |

---

## Input

### Mouse
- Left click buildable (empty): place tower
- Left click buildable (occupied): select tower
- Left click elsewhere: deselect
- Hover empty buildable: highlight + range preview

### Keyboard

| Key | Action |
|-----|--------|
| `1`-`7` | Select tower type |
| `Space` / `P` | Toggle pause |
| `U` | Upgrade selected tower |
| `S` | Sell selected tower |
| `T` | Cycle targeting priority |
| `M` | Toggle mute |
| `Escape` | Deselect tower |

### Camera (OrbitControls)
- Middle mouse drag: pan
- Right mouse drag: rotate
- Scroll: zoom (0.5x-3x)
- Vertical rotation: 30-72 degrees

---

## Visual Effects (4 types, all object-pooled)

| Effect | Duration | Description |
|--------|----------|-------------|
| DeathBurst | 0.4s | 8 particles exploding outward with gravity |
| ImpactFlash | 0.3s | Expanding fading ring at hit location |
| TeslaPulse | 0.4s | Expanding ring from tower to range radius |
| ChainLightning | 0.15s | Cylinder beam between positions |

---

## Save System

- localStorage key: `td-save-v1`
- Per-level tracking: completed, livesRemaining, wavesCompleted
- Only overwrites with better results
- Versioned format with corruption handling
