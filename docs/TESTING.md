# Testing

## Setup

Tests use **Vitest 4.0** with `vi.fn()` mocks. No DOM or Three.js rendering in tests.

```bash
npm run test        # run all tests once
npm run test:watch  # watch mode
```

## Current Test Coverage

| Test File | Tests | What's Covered |
|-----------|-------|----------------|
| `tests/ObjectPool.test.ts` | 5 | Creation, reuse, pre-population, disposeAll, LIFO ordering |
| `tests/EventBus.test.ts` | 5 | Emit, multiple listeners, off(), no-listener emit, clear() |
| `tests/GameStateManager.test.ts` | 15 | Init, canAfford, gold spend/add, enemy-killed event, lives loss, game over, wave completion, win condition, dispose cleanup |
| `tests/SaveManager.test.ts` | 12 | Empty state, level completion, overwrites, failed attempts, localStorage persistence, clearAll, corrupted data, wrong version |

**Total: 37 tests, all passing.**

## What's NOT Tested

- CombatSystem (targeting logic, damage resolution, chain/splash/poison)
- WaveManager (state machine, spawning)
- EnemyManager (healer aura, splitter, stealth)
- TowerManager (placement validation, upgrades)
- ProjectileManager (impact handling)
- UI components (DOM structure, class assignments)
- Integration scenarios (full game loops)
- Three.js rendering (visual correctness)
- Performance (frame times under load)

## Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Specific file
npx vitest run tests/CombatSystem.test.ts
```
