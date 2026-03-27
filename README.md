<picture>
  <source srcset="public/logo-v2-w.svg" media="(prefers-color-scheme: dark)">
  <img src="public/logo-v2-b.svg" alt="showwhat-logo" width="100">
</picture>

# showwhat

An extensible schema and rule based evaluation engine for feature flags and configuration.

Define feature configs as **variations with conditions** in a YAML or JSON. At runtime, `showwhat` evaluates the conditions against a context object and resolves the first matching variation's value — booleans, strings, numbers, or full objects. No platform, no infrastructure, no vendor lock-in.

**[Documentation](https://showwhat.yeojz.dev)** · **[Quick Start](https://showwhat.yeojz.dev/docs/)**

## Packages

| Package                                             | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| [`showwhat`](./packages/showwhat)                   | Resolution engine and main API                           |
| [`@showwhat/core`](./packages/core)                 | Rule engine, schemas, parsers, and in-memory data source |
| [`@showwhat/configurator`](./packages/configurator) | React UI library for visual rule editing                 |
| [`@showwhat/openfeature`](./packages/openfeature)   | OpenFeature provider integration                         |
| [`@showwhat/webapp`](./apps/webapp)                 | Web app for managing definitions                         |
| [`@showwhat/docs`](./apps/docs)                     | Documentation site                                       |

## Quick start

```bash
pnpm install showwhat
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

## Security

showwhat assumes definition authors are trusted. See the [Security guide](https://showwhat.yeojz.dev/docs/security) for considerations when accepting definitions from untrusted sources.

## AI Usage Disclosure

Parts of the codebase, tests, and documentation have been refined with AI assistance, with all outputs reviewed by humans. See [CONTRIBUTING.md](./CONTRIBUTING.md#ai-usage-guidelines) for guidelines.

## License

[MIT](./LICENSE)
