# showwhat

Feature flag resolution engine — the main entry point for **showwhat**, a lightweight, extensible feature flag library.

## Installation

```bash
npm install showwhat
pnpm add showwhat
yarn add showwhat

# Other runtimes
bun add showwhat
deno install npm:showwhat
```

## Quick start

```ts
import { MemoryData, showwhat } from "showwhat";

const data = await MemoryData.fromObject({
  definitions: {
    checkout_v2: {
      variations: [{ value: true, conditions: [{ type: "env", value: "prod" }] }, { value: false }],
    },
  },
});

const result = await showwhat({
  key: "checkout_v2",
  context: { env: "prod" },
  options: { data },
});
console.log(result.value); // true
```

## Features

- `showwhat()` resolution engine with context validation
- Built-in condition evaluators: `string`, `number`, `datetime`, `bool`, `env`, `startAt`, `endAt`
- Custom evaluators via `registerEvaluators()`
- YAML and JSON parsing with schema validation
- Pluggable data sources (`DefinitionReader` / `DefinitionWriter`)
- Typed error hierarchy

This package re-exports everything from `@showwhat/core`.

## Documentation

- [Quick Start](https://showwhat.yeojz.dev/docs/) — installation and first definition
- [Conditions](https://showwhat.yeojz.dev/docs/conditions) — built-in condition types and usage
- [Context](https://showwhat.yeojz.dev/docs/context) — runtime context object
- [Definitions](https://showwhat.yeojz.dev/docs/definitions) — definition structure and variations
- [Core API](https://showwhat.yeojz.dev/docs/core) — `showwhat()`, `resolve()`, parsing, and more
- [Errors](https://showwhat.yeojz.dev/docs/errors) — error types and when they are thrown
- [Custom Conditions](https://showwhat.yeojz.dev/docs/custom-conditions) — writing your own evaluators
- [Custom Data Sources](https://showwhat.yeojz.dev/docs/custom-data-sources) — implementing `DefinitionReader`
- [MemoryData](https://showwhat.yeojz.dev/docs/memory) — in-memory data source
