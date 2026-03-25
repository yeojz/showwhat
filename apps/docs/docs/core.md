---
title: Core API
outline: [2, 3]
---

# Core API

```bash
pnpm add @showwhat/core
```

## `showwhat()`

The main entry point. Resolves a single definition key against a context.

```ts
import { showwhat } from "@showwhat/core";

const result = await showwhat({
  key: "checkout_v2",
  context: { env: "prod" },
  options: { data },
});
```

**Parameters:**

| Field                | Type                  | Description                                   |
| -------------------- | --------------------- | --------------------------------------------- |
| `key`                | `string`              | The definition key to resolve                 |
| `context`            | `Context`             | The context object                            |
| `options.data`       | `DefinitionReader`    | The data source                               |
| `options.evaluators` | `ConditionEvaluators` | Optional custom condition evaluators          |
| `options.fallback`   | `ConditionEvaluator`  | Optional fallback for unknown condition types |
| `options.logger`     | `Logger`              | Optional logger for debug output              |

**Returns:** `Promise<Resolution>`

**`Resolution` fields:**

| Field                           | Type                      | Description                                        |
| ------------------------------- | ------------------------- | -------------------------------------------------- |
| `key`                           | `string`                  | The definition key that was resolved               |
| `value`                         | `unknown`                 | The matched variation's value                      |
| `meta.context`                  | `Context`                 | The context used for resolution                    |
| `meta.variation.index`          | `number`                  | Index of the matched variation                     |
| `meta.variation.id`             | `string?`                 | Optional variation identifier                      |
| `meta.variation.description`    | `string?`                 | Optional variation description                     |
| `meta.variation.conditionCount` | `number`                  | Number of conditions evaluated                     |
| `meta.annotations`              | `Record<string, unknown>` | Metadata populated by evaluators during resolution |

The `annotations` record contains metadata populated by custom evaluators during resolution (see [Custom Conditions](/docs/custom-conditions)).

**Throws:**

- `ValidationError` — invalid context
- `DefinitionNotFoundError` — key not found in data source
- `DefinitionInactiveError` — definition has `active: false`
- `VariationNotFoundError` — no variation matched

## `resolve()`

Resolve all definitions in a set against a context. If any key fails, the entire call rejects.

```ts
import { resolve } from "@showwhat/core";

const results = await resolve({
  definitions: { flag_a: defA, flag_b: defB },
  context: { env: "prod" },
});

results.flag_a.value; // resolved value
results.flag_b.value; // resolved value
```

**Parameters:**

| Field         | Type              | Description                           |
| ------------- | ----------------- | ------------------------------------- |
| `definitions` | `Definitions`     | Map of key → Definition               |
| `context`     | `Context`         | The context object                    |
| `options`     | `ResolverOptions` | Optional evaluators, fallback, logger |

**Returns:** `Promise<Record<string, Resolution>>`

## `resolveVariation()`

Low-level: resolve a single list of variations. Returns the first matching variation or `null`.

```ts
import { resolveVariation } from "@showwhat/core";

const result = await resolveVariation({
  variations: definition.variations,
  context: { env: "prod" },
});

if (result) {
  result.variation; // the matched Variation object
  result.variationIndex; // its index in the array
}
```

**Parameters:**

| Field        | Type              | Description                            |
| ------------ | ----------------- | -------------------------------------- |
| `variations` | `Variation[]`     | Ordered list of variations to evaluate |
| `context`    | `Context`         | The context object                     |
| `options`    | `ResolverOptions` | Optional evaluators, fallback, logger  |

**Returns:** `Promise<{ variation: Variation; variationIndex: number; annotations: Record<string, unknown> } | null>`

## `parseYaml()`

Parse a YAML string into a validated `FileFormat` object (containing `definitions` and optional `presets`).

```ts
import { parseYaml } from "@showwhat/core";

const { definitions, presets } = parseYaml(yamlString);
```

**Throws:** `ParseError` on invalid YAML, `SchemaValidationError` on schema violation.

## `parseObject()`

Validate a plain object as a `FileFormat` object (containing `definitions` and optional `presets`).

```ts
import { parseObject } from "@showwhat/core";

const { definitions } = parseObject({
  definitions: { my_flag: { variations: [{ value: true }] } },
});
```

## `parsePresetsFile()`

Parse a plain object as a validated `Presets` map. Use this when reading a standalone preset file (e.g. `_presets.yaml`).

```ts
import { parsePresetsFile } from "@showwhat/core";

const presets = parsePresetsFile(rawObject);
```

**Throws:** `SchemaValidationError` on schema violation.

## `extendEvaluators()`

Create a new evaluators map with additional condition types.

```ts
import { extendEvaluators } from "@showwhat/core";

const myEvaluators = extendEvaluators({
  myCustomType: async ({ condition, context }) => {
    return (condition as { value: string }).value === context.someKey;
  },
});
```

## `evaluateCondition()`

Evaluate a single condition against a context.

```ts
import { evaluateCondition, builtinEvaluators } from "@showwhat/core";

const matched = await evaluateCondition({
  condition: { type: "env", value: "prod" },
  context: { env: "prod" },
  evaluators: builtinEvaluators,
});
```

## Key types

These are simplified representations. See the source schemas in `packages/core/src/schemas/` for the authoritative definitions.

```ts
// A context value: primitive, array of primitives, or nested record
type ContextValue = string | number | boolean | ContextValue[] | Record<string, ContextValue>;
type Context = Record<string, ContextValue>;

type Variation = {
  id?: string;
  value: unknown;
  conditions?: Condition[];
  description?: string;
};

type Definition = {
  id?: string;
  active?: boolean;
  description?: string;
  variations: Variation[]; // at least one required
};

type Definitions = Record<string, Definition>;

// Resolution — see showwhat() return type above
```
