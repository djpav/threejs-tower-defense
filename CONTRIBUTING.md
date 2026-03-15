# Contributing

Thanks for your interest in contributing to this Tower Defense game! Here's how to get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/threejs-tower-defense.git
   cd threejs-tower-defense
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Ensure the build passes:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Commit and push your branch
6. Open a Pull Request against `main`

## Project Structure

```
src/
  core/       Game orchestrator, clock, input, event bus
  entities/   Enemy, Tower, Projectile, GridCell
  systems/    Combat, waves, economy, audio, save, effects
  configs/    Tower/enemy/level balance data
  ui/         DOM-based HUD (Tailwind CSS)
  rendering/  Camera controller
  types/      Shared TypeScript types and enums
  utils/      Object pool, countdown timer
tests/        Unit tests (Vitest)
docs/         Documentation
```

## Code Style

- **TypeScript strict mode** -- no `any` types, all parameters typed
- **Path alias** -- use `@/` for imports from `src/` (e.g., `import { EventBus } from "@/core/EventBus"`)
- **EventBus** for cross-system communication -- don't import systems into each other directly
- **GameObject base class** for all entities (Tower, Enemy, Projectile, GridCell)
- **UIComponent base class** for all DOM UI elements
- **Dispose pattern** -- every class that creates resources must have a `dispose()` method that cleans them up

## What to Contribute

### Good first issues
- Add new enemy types (see `src/configs/GameBalanceConfigs.ts` for examples)
- Add new tower types
- Improve visual effects in `src/systems/effects/`
- Add more levels in `src/configs/LevelConfigs.ts`
- Write tests for untested systems

### Bigger contributions
- Mobile/touch support
- New game mechanics
- Performance optimizations
- Accessibility improvements

## Adding Game Content

### New Tower
1. Add enum value to `TowerType` in `src/types/enums.ts`
2. Add config arrays in `src/configs/GameBalanceConfigs.ts` (3 upgrade levels)
3. Add mesh factory in `src/entities/TowerMeshFactory.ts`
4. Add to `ALL_TOWERS` array

### New Enemy
1. Add config in `src/configs/GameBalanceConfigs.ts`
2. Add to wave definitions in `src/configs/WaveGenerator.ts`
3. If it has special behavior, extend `Enemy` class or add a component

### New Level
1. Add level config in `src/configs/LevelConfigs.ts`
2. Update `TOTAL_LEVELS` constant

## Testing

Run tests with:
```bash
npm test              # single run
npm run test:watch    # watch mode
```

Tests live in `tests/` and use Vitest. When adding new systems or utilities, please add corresponding tests.

## Pull Request Guidelines

- Keep PRs focused -- one feature or fix per PR
- Include a clear description of what changed and why
- Make sure `npm run build` passes with zero errors
- Make sure `npm test` passes
- Test your changes in the browser

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
