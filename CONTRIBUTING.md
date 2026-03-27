# Contributing

Thank you for your interest in contributing to showhat! This guide covers everything you need to get started.

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
- No `enum` - use string unions
- No `any` - use `unknown`
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

### Configurator (`packages/configurator`)

- Reusable UI library; app shells provide the store + persistence
- `ConfiguratorStore` interface — async commands to support API-backed implementations
- UI components are controlled (props in, callbacks out)
- Tailwind v4: theme tokens in CSS `@theme` block, not JS config
- Styles exported via `@showwhat/configurator/styles.css`

### Browser packages

- `configurator` and `webapp` must not have `"types": ["node"]` in tsconfig
- Test files excluded from tsc build via tsconfig `exclude`

## Pull Request Guidelines

1. **Create an issue first** for significant changes
2. **Keep PRs focused** - one feature or fix per PR
3. **Include tests** for new functionality
4. **Update documentation** if adding/changing APIs
5. **Run all checks** before submitting:
   ```bash
   pnpm fix && pnpm typecheck && pnpm test:ci
   ```

### Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: resolve issue with token generation
docs: update API documentation
test: add edge case tests
refactor: simplify validation logic
chore: update dependencies
```

## Testing expectations

- New features should include unit tests.
- Bug fixes should include a regression test where practical.
- All packages must pass `npx vitest run` and `npx tsc --noEmit` with no errors.

## AI Usage Guidelines

Code or other content generated in whole or in part using AI tools can be contributed to the project, provided that it satisfies the following conditions:

### AI Tool Terms Compatibility

- Ensure the AI tool's terms don't conflict with the project's open source license, IP policies, or Open Source Definition

### Third-Party Content in AI Output

- Verify permission to use any third-party copyrighted materials (e.g., via compatible open source license or public domain)
- Provide attribution and license information for any third-party content included

### Responsible AI Usage

- You are responsible for reviewing, testing, and verifying any AI-assisted changes.
- If AI tools generated significant parts of your contribution, mention this in your PR so reviewers can provide appropriate guidance.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
