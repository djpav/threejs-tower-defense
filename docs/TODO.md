# TODO

Tracking what still needs to be done. Items roughly ordered by priority within each category.

---

## Gameplay

- [ ] **Creep pathing improvements** -- enemies currently follow waypoints rigidly; consider smoother path interpolation or flow-field movement
- [x] **Tower selling confirmation** -- sell undo toast with 3s countdown, keyboard shortcut support
- [ ] **More tower types** -- e.g. Buff/Support tower (boosts nearby towers), Mortar (delayed AoE), Laser (continuous beam)
- [ ] **More enemy types** -- e.g. Armored (damage reduction), Regenerating, Spawner (summons minions), Speed-aura
- [ ] **More levels** (11-20) -- larger maps, multi-path layouts, more complex wave compositions
- [x] **Multi-path maps** -- secondary A* path for levels 6-10, random path assignment per enemy
- [ ] **Tower synergies** -- bonus effects when certain towers are placed adjacent
- [ ] **Ability system** -- player-activated abilities on cooldown (e.g. lightning strike, freeze all, gold bonus)
- [x] **Difficulty scaling within endless** -- exponential HP scaling (1.25^(w/3)), reward decay, count caps

## Balance

- [x] **Balance pass on tower costs vs DPS** -- BalanceAnalyzer with DPS/gold efficiency, viability scoring
- [x] **Endless mode scaling curve** -- exponential (1.25^(w/3)) replaces linear 15%
- [x] **Boss HP scaling per level** -- exponential HP scaling (1.25^(L-1)) with normalized surplus
- [x] **Healer enemy tuning** -- validated via balance analyzer across all levels/difficulties
- [x] **Difficulty mode multipliers** -- rebalanced: Easy HP×0.75, Hard HP×1.3/gold×0.85 (all levels beatable with optimal combos)

## UI / UX

- [x] **Mobile / touch support** -- tap to place, pinch to zoom, long-press for upgrade, touch-friendly 44-48px targets
- [x] **Responsive layout** -- tablet (768px) and phone (480px) breakpoints, safe-area support, compact stats bar
- [ ] **Tower range preview on hover** -- show range circle when hovering tower buttons (not just when hovering cells)
- [ ] **Wave timer / auto-start** -- option to auto-send next wave after a countdown
- [ ] **Minimap** -- small overview map for larger levels
- [ ] **Settings panel** -- volume slider, quality settings, keybind customization
- [ ] **Tutorial / onboarding** -- first-time player guidance explaining mechanics
- [ ] **Tower info panel** -- detailed tower comparison screen accessible from level select
- [ ] **Enemy bestiary** -- catalog of encountered enemy types with stats
- [ ] **Notification toasts** -- "Not enough gold", "Can't build here" feedback messages
- [ ] **Upgrade path preview** -- show Lv2/Lv3 stats before upgrading

## Visual / Polish

- [ ] **Better tower models** -- current procedural models are basic primitives; consider more detailed geometry or GLTF models
- [ ] **Enemy variety in visuals** -- more distinct shapes/animations per enemy type
- [ ] **Projectile trails** -- particle trails on projectiles for visual flair
- [ ] **Environment props** -- trees, rocks, water tiles for visual variety on maps
- [ ] **Lighting improvements** -- dynamic lighting, shadows, ambient occlusion
- [ ] **Screen shake** -- subtle shake on boss death or large explosions
- [ ] **Kill counter / stats** -- track and display kills per tower, total damage dealt
- [ ] **Particle system** -- proper GPU particle system for effects instead of mesh-based
- [ ] **Map themes** -- visual themes per level (forest, desert, snow, lava); terrain colors, decorative props
- [x] **Scene fog** -- `scene.fog = new THREE.Fog(...)` for edge fade-out
- [ ] **GLB model loading** -- load GLB geometry for tower/enemy visuals, apply flat-shaded materials
- [ ] **Randomized object variation** -- randomize scale/rotation on decorative props
- [x] **Scene Group hierarchy** -- organize scene into terrain/towers/enemies/projectiles/effects groups

## Audio

- [ ] **Background music** -- looping ambient music tracks (synthesized or loaded)
- [ ] **Spatial audio** -- position sounds in 3D space based on camera/event location
- [ ] **Audio variety** -- randomize pitch/timing for repeated sounds to avoid monotony
- [ ] **UI click sounds** -- button hover/click feedback sounds
- [ ] **Replace synthesized audio** -- use proper sound effect files for higher quality

## Testing

- [ ] **Unit tests for CombatSystem** -- targeting logic, damage resolution, chain/splash/poison
- [ ] **Unit tests for WaveManager** -- state machine transitions, enemy spawning
- [ ] **Unit tests for EnemyManager** -- healer aura, splitter logic, stealth reveal
- [ ] **Unit tests for TowerManager** -- placement validation, upgrade logic
- [ ] **Integration tests** -- full game loop scenarios (place tower, send wave, verify kills)
- [ ] **UI component tests** -- verify DOM structure and class assignments
- [ ] **Performance benchmarks** -- measure frame time with 50+ enemies, 20+ towers

## Infrastructure

- [ ] **ESLint + Prettier** -- code formatting and linting rules
- [ ] **CI/CD pipeline** -- GitHub Actions for build, test, lint on PR
- [x] **Deployment** -- GitHub Pages via publish script + Actions workflow on public repo
- [ ] **Bundle optimization** -- code-split Three.js, tree-shake unused modules (currently 590KB JS)
- [x] **lil-gui** -- dev-time parameter tweaking panel (gold, lives, timeScale, tower stats)
- [ ] **Source maps** -- ensure production source maps for debugging
- [ ] **Error tracking** -- Sentry or similar for production error monitoring
- [ ] **Analytics** -- basic gameplay analytics (levels played, completion rates)

## Code Quality

- [x] **Strict null checks audit** -- replaced `instanceColor!` with null guards, extracted `splitConfig` with guard, removed `ObjectPool<any>`
- [x] **Memory leak audit** -- swap-and-pop in hot loops, reusable Color/Vector3/Set, SpeedControls button listener cleanup
- [x] **Event listener cleanup** -- tracked handlers in Game.ts, HUD mute button, LevelSelect difficulty buttons, SpeedControls
- [ ] **Type narrowing** -- reduce `as` casts, use discriminated unions
- [x] **Constants extraction** -- SELL_REFUND_RATIO, STARTING_GOLD/LIVES, scaling formulas named and documented
- [ ] **System decoupling** -- CombatSystem directly references EnemyManager/TowerManager; consider interface-based injection
- [ ] **Raycaster layer separation** -- UI elements on layer 1, game objects on layer 0

## Known Bugs

- [x] ~~**Nearest targeting broken** -- `bestValue` initialized to `-1` caused towers to not fire when using Nearest mode~~ (Fixed: changed to `-Infinity`)
- [x] **Projectile fizzle on same-frame kill** -- projectiles now fly to last known position; splash/chain still fire on dead targets
- [x] **Camera reset on level change** -- resetToMap() resets frustum, zoom, position, and OrbitControls target
- [ ] **Tooltip positioning edge cases** -- tooltip can clip off-screen on very narrow viewports
- [ ] **Endless mode wave preview** -- only shows 3 pre-generated waves; preview may lag behind actual wave
