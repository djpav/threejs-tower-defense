# TODO

Tracking what still needs to be done. Items roughly ordered by priority within each category.

---

## Gameplay

- [ ] **Creep pathing improvements** -- enemies currently follow waypoints rigidly; consider smoother path interpolation or flow-field movement
- [ ] **Tower selling confirmation** -- accidental sells can't be undone; add a confirmation step or undo timer
- [ ] **More tower types** -- e.g. Buff/Support tower (boosts nearby towers), Mortar (delayed AoE), Laser (continuous beam)
- [ ] **More enemy types** -- e.g. Armored (damage reduction), Regenerating, Spawner (summons minions), Speed-aura
- [ ] **More levels** (11-20) -- larger maps, multi-path layouts, more complex wave compositions
- [ ] **Multi-path maps** -- maps with branching paths so enemies can take different routes
- [ ] **Tower synergies** -- bonus effects when certain towers are placed adjacent
- [ ] **Ability system** -- player-activated abilities on cooldown (e.g. lightning strike, freeze all, gold bonus)
- [ ] **Difficulty scaling within endless** -- increase enemy variety and boss frequency over time

## Balance

- [ ] **Balance pass on tower costs vs DPS** -- Sniper and Tesla may need tuning
- [ ] **Endless mode scaling curve** -- 15% per wave may be too linear; consider exponential ramp
- [ ] **Boss HP scaling per level** -- bosses on later levels may be too easy or too hard
- [ ] **Healer enemy tuning** -- 10 HP/s heal rate vs tower DPS at various levels
- [ ] **Difficulty mode multipliers** -- Hard mode may need separate tuning for late-game waves

## UI / UX

- [ ] **Mobile / touch support** -- tap to place, pinch to zoom, touch-friendly button sizes
- [ ] **Responsive layout** -- UI currently assumes desktop viewport; test and fix on smaller screens
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
- [ ] **Deployment** -- GitHub Pages / Netlify / Vercel hosting
- [ ] **Bundle optimization** -- code-split Three.js, tree-shake unused modules (currently 590KB JS)
- [x] **lil-gui** -- dev-time parameter tweaking panel (gold, lives, timeScale, tower stats)
- [ ] **Source maps** -- ensure production source maps for debugging
- [ ] **Error tracking** -- Sentry or similar for production error monitoring
- [ ] **Analytics** -- basic gameplay analytics (levels played, completion rates)

## Code Quality

- [ ] **Strict null checks audit** -- review all `!` non-null assertions
- [ ] **Memory leak audit** -- verify all dispose() methods clean up Three.js resources
- [ ] **Event listener cleanup** -- ensure all addEventListener calls have matching removeEventListener
- [ ] **Type narrowing** -- reduce `as` casts, use discriminated unions
- [ ] **Constants extraction** -- magic numbers in combat/wave generation should be named constants
- [ ] **System decoupling** -- CombatSystem directly references EnemyManager/TowerManager; consider interface-based injection
- [ ] **Raycaster layer separation** -- UI elements on layer 1, game objects on layer 0

## Known Bugs

- [x] ~~**Nearest targeting broken** -- `bestValue` initialized to `-1` caused towers to not fire when using Nearest mode~~ (Fixed: changed to `-Infinity`)
- [ ] **Projectile fizzle on same-frame kill** -- if two towers kill the same enemy in one frame, the second projectile self-destructs with no visual feedback
- [ ] **Camera reset on level change** -- camera position/zoom doesn't reset when starting a new level
- [ ] **Tooltip positioning edge cases** -- tooltip can clip off-screen on very narrow viewports
- [ ] **Endless mode wave preview** -- only shows 3 pre-generated waves; preview may lag behind actual wave
