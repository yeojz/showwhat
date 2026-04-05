# @showwhat/core

Low-level schemas, parsers, and rule engine for [`showwhat`](https://www.npmjs.com/package/showwhat).

Use `@showwhat/core` when you want the evaluation primitives without the higher-level convenience API.

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

const results = await resolve({
  definitions: { checkout_v2: def! },
  context: { env: "prod" },
  options: { evaluators: builtinEvaluators },
});

const entry = results["checkout_v2"];
if (entry.success) {
  console.log(entry.value); // true
}
```

> **Note:** The resolver is strict — evaluators must be passed explicitly. There is no default evaluator set injected automatically.

## Features

- Built-in condition types: `string`, `number`, `datetime`, `bool`, `env`, `startAt`, `endAt`
- Composite conditions with `and`/`or` logic
- Custom condition types via evaluator composition
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
