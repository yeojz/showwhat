<picture>
  <source srcset="public/logo-v2-w.svg" media="(prefers-color-scheme: dark)">
  <img src="public/logo-v2-b.svg" alt="showwhat-logo" width="100">
</picture>

# showwhat

Feature flags and config you own. Platform-agnostic.

Define flags and config as **variations with conditions** in YAML or JSON. At runtime, `showwhat` evaluates those definitions against a context object and resolves the first matching value: booleans, strings, numbers, or full objects. Store definitions in files, serve them from an API, or manage them in version control. Like OpenAPI for APIs, showwhat gives you a spec-first workflow with tooling built around it.

**[Documentation](https://showwhat.yeojz.dev)** · **[Quick Start](https://showwhat.yeojz.dev/docs/)**

## Packages

| Package                                             | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| [`showwhat`](./packages/showwhat)                   | Main API for resolving feature flags and config values   |
| [`@showwhat/core`](./packages/core)                 | Rule engine, schemas, parsers, and in-memory data source |
| [`@showwhat/configurator`](./packages/configurator) | React UI library for visual rule editing                 |
| [`@showwhat/openfeature`](./packages/openfeature)   | OpenFeature bridge for showwhat definitions              |
| [webapp](./apps/webapp)                             | Browser app for authoring and testing definitions        |
| [docs](./apps/docs)                                 | Documentation site                                       |

## Quick start

```bash
npm install showwhat
pnpm add showwhat
yarn add showwhat

# Other runtimes
bun add showwhat
deno install npm:showwhat
```

```ts
import { showwhat, MemoryData } from "showwhat";

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
  keys: ["checkout_v2"],
  context: { env: "prod" },
  options: { data },
});

const entry = result["checkout_v2"];
if (entry.success) {
  console.log(entry.value); // true
}
```

## Definition format

Definitions are YAML or JSON documents with a `definitions` root key. Each definition has one or more **variations** evaluated in order. The first matching variation wins. Use definitions for boolean flags, config values, or structured objects.

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

- Primitives: `string` | `number` | `bool` | `datetime`
- Shorthands: `env` | `startAt` | `endAt`
- Composites: `and` | `or` | `matchAnnotations`

See the [Conditions guide](https://showwhat.yeojz.dev/docs/conditions) for full details.

## Security

showwhat assumes definition authors are trusted. See the [Security guide](https://showwhat.yeojz.dev/docs/security) for considerations when accepting definitions from untrusted sources.

## AI Usage Disclosure

- Core library (`core` and `showwhat`) are developed with AI refinements.
- UI based components like `configurator` and `webapp` are spec-driven, executed with AI with multi-model reviews.

See [CONTRIBUTING.md](./CONTRIBUTING.md#ai-usage-guidelines) for guidelines.

## License

[MIT](./LICENSE)
