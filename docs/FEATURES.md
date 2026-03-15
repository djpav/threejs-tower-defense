# Features

Complete inventory of all implemented features.

---

## Towers (7 types, 3 upgrade levels each)

| Tower | Cost | Mechanic | Lv1 DMG | Lv3 DMG | Range | Fire Rate |
|-------|------|----------|---------|---------|-------|-----------|
| Arrow | 25g | Basic all-rounder | 25 | 50 | 2.5-3.2 | 1.0-1.6/s |
| Cannon | 60g | Splash damage, can't hit flying | 60 | 145 | 2.0-2.6 | 0.5-0.7/s |
| Frost | 40g | Slows enemies (50%-30%) | 12 | 28 | 2.2-2.8 | 1.0-1.4/s |
| Lightning | 50g | Chain lightning (2-4 targets) | 30 | 65 | 2.5-3.2 | 0.8-1.2/s |
| Poison | 45g | DOT stacks (3-6 max) | 10 | 22 | 2.2-2.8 | 0.9-1.3/s |
| Sniper | 65g | Long range, high single-target | 100 | 250 | 5.0-6.0 | 0.3-0.4/s |
| Tesla | 80g | AoE pulse (no projectile) | 22 | 60 | 2.0-2.7 | 0.8-1.2/s |

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
| 1 | Forest Clearing | 12x8 | 5 | 100 | 20 | Basic |
| 2 | River Crossing | 14x10 | 7 | 90 | 18 | Fast Runners |
| 3 | Mountain Pass | 16x10 | 9 | 80 | 16 | Boss |
| 4 | Dark Swamp | 16x12 | 11 | 75 | 15 | Tanks |
| 5 | Frozen Wastes | 18x12 | 13 | 65 | 13 | Shielded |
| 6 | Dragon's Gate | 20x14 | 15 | 60 | 11 | Multi-path |
| 7 | Sky Fortress | 20x14 | 17 | 55 | 10 | Flying |
| 8 | Cursed Depths | 22x16 | 19 | 50 | 8 | Healers, Splitters |
| 9 | Shadow Realm | 24x16 | 21 | 45 | 6 | Stealth |
| 10 | Final Bastion | 26x18 | 23 | 40 | 5 | All types |

### Endless Mode
- 12x12 grid, 200 gold, 20 lives
- Infinite waves with 15% HP scaling per wave
- Enemy types unlock progressively (Basic always, Boss every 10th wave)
- Random seed each run

### Difficulty Modes

| Difficulty | Enemy HP | Enemy Speed | Gold | Lives |
|-----------|----------|-------------|------|-------|
| Easy | x0.75 | x0.9 | x1.2 | x1.4 |
| Normal | x1.0 | x1.0 | x1.0 | x1.0 |
| Hard | x1.3 | x1.1 | x0.85 | x0.6 |

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

- Tower costs: 25g (Arrow) to 80g (Tesla), Sniper 65g
- Upgrade costs: 30g-90g per level
- Kill rewards: 5g (Splitter child) to 100g (Boss)
- Sell refund: 75% of total invested
- 1 life lost per enemy reaching goal

---

## UI Components (13 classes)

| Component | Description |
|-----------|-------------|
| StatsBar | Compact header: level badge, next-wave preview, gold/lives/wave chips |
| TowerBar | Bottom bar: 7 tower selection buttons with hotkeys |
| TowerButton | Individual tower button with tooltip on hover |
| TowerTooltip | Floating tooltip with tower stats and mechanics |
| UpgradePanel | Tower info + upgrade/sell/targeting/close buttons |
| StartWaveButton | Green pulsing button, disabled during waves |
| SpeedControls | Aligned control strip: pause + 1x/2x/4x speed + mute |
| LevelSelect | Full-screen level grid with stars + difficulty picker |
| MessageOverlay | Victory/Defeat/Level Complete with animations |
| DamageNumbers | Floating damage text projected from 3D to screen |
| HUD | Master container wiring all components via EventBus |
| UIComponent | Abstract base class (show/hide/dispose) |

### Styling
- Tailwind CSS v4.2 with custom `@theme` tokens and `@layer components` classes
- CSS `:hover` / `:disabled` pseudo-selectors (no JS hover handlers for styling)
- Responsive breakpoints: tablet (768px) and phone (480px)
- Touch-specific styles: `@media (hover: none)` resets sticky hover states
- Safe-area support: `env(safe-area-inset-*)` for notched phones
- 44-48px minimum touch targets on all interactive elements
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

### Touch (mobile)
- Tap buildable cell: place/select tower
- Tap + drag: pan camera
- Pinch: zoom in/out
- Long-press (500ms) on tower: open upgrade panel / upgrade
- Tap tower button: toggle tooltip (tap outside to dismiss)
- Touch painting in map builder (drag to paint cells)

### Keyboard

| Key | Action |
|-----|--------|
| `1`-`7` | Select tower type |
| `Space` / `P` | Toggle pause |
| `U` | Upgrade selected tower |
| `S` | Sell selected tower |
| `T` | Cycle targeting priority |
| `M` | Toggle mute |
| `A` | Toggle wave auto-start |
| `L` | Toggle level auto-start |
| `Escape` | Deselect tower |

### Camera (OrbitControls)
- Middle mouse drag: pan
- Right mouse drag: rotate
- Scroll: zoom (0.5x-3x)
- Single finger drag (touch): pan
- Two finger pinch (touch): zoom
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
