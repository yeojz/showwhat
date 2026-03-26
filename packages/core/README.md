# @showwhat/core

> **Most users should install [`showwhat`](../showwhat) instead.** This package contains the low-level engine internals. The `showwhat` package re-exports everything from `@showwhat/core` and adds the main `showwhat()` entry point.

Low-level condition engine and schemas for **showwhat** - a lightweight, extensible feature flag library.

## Installation

```bash
npm install @showwhat/core
```

## Quick start

```ts
import { MemoryData, resolve, builtinEvaluators } from "@showwhat/core";

const data = await MemoryData.fromObject({
  definitions: {
    checkout_v2: {
      variations: [{ value: true, conditions: [{ type: "env", value: "prod" }] }, { value: false }],
    },
  },
});

const def = await data.get("checkout_v2");

const result = await resolve({
  definitions: { checkout_v2: def! },
  context: { env: "prod" },
  options: { evaluators: builtinEvaluators },
});
console.log(result.checkout_v2.value); // true
```

> **Note:** The resolver is strict — evaluators must be passed explicitly. There is no default evaluator set injected automatically.

## Features

- Built-in condition types: `string`, `number`, `datetime`, `bool`, `env`, `startAt`, `endAt`
- Composite conditions with `and`/`or` logic
- Custom condition types via `registerEvaluators()`
- YAML and JSON parsing with schema validation
- Pluggable data sources (`DefinitionReader` / `DefinitionWriter`)
- Typed error hierarchy
- Preset condition shortcuts

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
