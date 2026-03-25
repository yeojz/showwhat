<picture>
  <source srcset="./public/logo-v2-w.svg" media="(prefers-color-scheme: dark)">
  <img src="./public/logo-v2-b.svg" alt="showwhat-logo" width="100">
</picture>

# showwhat

A definition format and evaluation engine for feature flags and configuration.

Define feature configs as **variations with conditions** in YAML or JSON. At runtime, `showwhat` evaluates the conditions against a context object and resolves the first matching variation's value — booleans, strings, numbers, or full objects. No platform, no infrastructure, no vendor lock-in.

**[Documentation](https://showwhat.yeojz.dev)** · **[Quick Start](https://showwhat.yeojz.dev/docs/)**

## Packages

| Package                                             | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| [`@showwhat/core`](./packages/core)                 | Rule engine, schemas, parsers, and in-memory data source |
| [`@showwhat/configurator`](./packages/configurator) | Reusable React UI library for editing definitions        |
| [`@showwhat/openfeature`](./packages/openfeature)   | OpenFeature provider                                     |
| [`@showwhat/webapp`](./apps/webapp)                 | File-based web shell for the configurator                |
| [`@showwhat/docs`](./apps/docs)                     | Documentation site                                       |

## Quick start

```bash
pnpm add @showwhat/core
```

```ts
import { showwhat, MemoryData } from "@showwhat/core";

const data = await MemoryData.fromYaml(`
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false
`);

const result = await showwhat({
  key: "checkout_v2",
  context: { env: "prod" },
  options: { data },
});

console.log(result.value); // true
```

## Definition format

Definitions are YAML or JSON documents with a `definitions` root key. Each definition has one or more **variations** evaluated in order — the first matching variation wins. The format is portable: store it in a file, serve it from an API, or manage it in Git with PR reviews as your governance layer.

```yaml
definitions:
  my_flag:
    variations:
      - value: "on"
        conditions:
          - type: env
            value: [prod, staging]
      - value: "off" # default (no conditions = always matches)
```

### Built-in condition types

`env` · `string` · `number` · `bool` · `datetime` · `startAt` · `endAt` · `and` · `or`

See the [Conditions guide](https://showwhat.yeojz.dev/docs/conditions) for full details.

## Monorepo

```
packages/
  core/        @showwhat/core
apps/
  webapp/   @showwhat/webapp
```

Built with [Turbo](https://turbo.build), [tsup](https://tsup.egoist.dev), and [Vitest](https://vitest.dev).

```bash
pnpm install
pnpm build
pnpm test
```

## Security

showwhat assumes definition authors are trusted. See the [Security guide](https://showwhat.yeojz.dev/docs/security) for considerations when accepting definitions from untrusted sources.
