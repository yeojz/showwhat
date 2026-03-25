# Contributing

## Setup

```bash
pnpm install
pnpm build
```

Package manager is **pnpm** (not npm, yarn, or bun).

## Development

This is a pnpm monorepo using Turbo. Packages live under `packages/` and apps under `apps/`.

### Commands

```bash
pnpm build          # Build all packages (turbo)
pnpm test           # Build all + run all tests with coverage
pnpm lint           # Lint all packages
pnpm typecheck      # Type-check all packages
pnpm format:check   # Check formatting (prettier)

# Scoped
pnpm build:webapp       # Build webapp and its dependencies
pnpm dev:webapp         # Dev server for webapp app
pnpm dev:docs           # Dev server for docs site
pnpm test:core          # Test core only
pnpm test:configurator  # Test configurator only
pnpm test:webapp        # Test webapp only

# Per-package (run from repo root)
npx vitest run --project core           # Run tests for a project
npx vitest run path/to.test             # Run a single test file
npx tsc --noEmit                        # Type-check (from package dir)
```

### Monorepo layout

```
packages/core/          # @showwhat/core — rule engine, schemas, parsers
packages/configurator/  # @showwhat/configurator — reusable React UI library (tsup)
apps/webapp/            # @showwhat/webapp — Vite + React file-based app shell
apps/docs/              # @showwhat/docs — VitePress documentation site
```

## Code style

### TypeScript

- `type` for data shapes, props, options, and return types
- `interface` for contracts meant to be implemented or extended (e.g. `DefinitionReader`, `ConfiguratorStore`, `ConditionTypeMeta`)
- No `enum` — use string unions
- No `any` — use `unknown`
- No `@ts-ignore` or `@ts-expect-error`

### Comments

- Comments explain **why**, not **what**
- If the code needs a "what" comment, rename things to be self-documenting instead

### General

- No emojis in source code (use unicode escapes if needed for UI glyphs)
- No unused variables or imports
- Self-documenting naming over documentation

## Architecture notes

### Core (`packages/core`)

- `schemas/` — Zod schemas and types (no imports from `conditions/`)
- `conditions/` — evaluator logic (imports types from `schemas/`)
- `data.ts` — `DefinitionReader`, `DefinitionWriter`, `DefinitionData` interfaces + `MemoryData` class
- Exports: `@showwhat/core`, `@showwhat/core/schemas`, `@showwhat/core/data`

### Configurator (`packages/configurator`)

- Reusable UI library; app shells provide the store + persistence
- `ConfiguratorStore` interface — async commands to support API-backed implementations
- UI components are controlled (props in, callbacks out)
- Tailwind v4: theme tokens in CSS `@theme` block, not JS config
- Styles exported via `@showwhat/configurator/styles.css`

### Data layer naming

- Interfaces: `DefinitionReader`, `DefinitionWriter`, `DefinitionData` (not `Storage*`)
- Classes: `MemoryData` (not `*Adapter`)
- Error: `DataError` (not `StorageError`)
- Option: `options.data` (not `options.adapter`)

### Browser packages

- `configurator` and `webapp` must not have `"types": ["node"]` in tsconfig
- Test files excluded from tsc build via tsconfig `exclude`

## Pull requests

- Target the `main` branch.
- Keep PRs focused — one concern per PR.
- All CI checks must pass before merge.

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short summary>
```

Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

Examples:

```
feat(core): add matchString regex condition
fix(data-fs): handle missing file on first read
docs: update quick start example
```

## Testing expectations

- New features should include unit tests.
- Bug fixes should include a regression test where practical.
- All packages must pass `npx vitest run` and `npx tsc --noEmit` with no errors.
