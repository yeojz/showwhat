---
title: Core API
outline: [2, 3]
---

# Core API

```bash
npm install showwhat
pnpm add showwhat
yarn add showwhat

# Other runtimes
bun add showwhat
deno install npm:showwhat
```

## `showwhat()`

The main entry point. Resolves one or more definition keys against a context.

```ts
import { showwhat } from "showwhat";

const result = await showwhat({
  keys: ["checkout_v2"],
  context: { env: "prod" },
  options: { data },
});

const entry = result["checkout_v2"];
if (!entry.success) {
  console.log(entry.error); // ShowwhatError
} else {
  console.log(entry.value); // true
}
```

Omit `keys` to resolve all definitions in the data source:

```ts
const allResults = await showwhat({
  context: { env: "prod" },
  options: { data },
});
```

**Parameters:**

| Field                | Type                  | Description                                      |
| -------------------- | --------------------- | ------------------------------------------------ |
| `keys`               | `string[]?`           | Definition keys to resolve (omit to resolve all) |
| `context`            | `Context`             | The context object                               |
| `deps`               | `Dependencies?`       | Optional runtime utilities for custom evaluators |
| `options.data`       | `DefinitionReader`    | The data source                                  |
| `options.evaluators` | `ConditionEvaluators` | Optional custom condition evaluators             |
| `options.fallback`   | `ConditionEvaluator`  | Optional fallback for unknown condition types    |
| `options.logger`     | `Logger`              | Optional logger for debug output                 |

**Returns:** `Promise<Resolutions>`

`Resolutions` is `Record<string, Resolution | ResolutionError>`. Each entry is either a successful `Resolution` or a `ResolutionError` containing the error for that key.

**`Resolution` fields:**

| Field                           | Type                      | Description                                         |
| ------------------------------- | ------------------------- | --------------------------------------------------- |
| `success`                       | `true`                    | Always `true` on success (for union discrimination) |
| `key`                           | `string`                  | The definition key that was resolved                |
| `value`                         | `unknown`                 | The matched variation's value                       |
| `meta.variation.index`          | `number`                  | Index of the matched variation                      |
| `meta.variation.id`             | `string?`                 | Optional variation identifier                       |
| `meta.variation.description`    | `string?`                 | Optional variation description                      |
| `meta.variation.conditionCount` | `number`                  | Number of conditions evaluated                      |
| `meta.annotations`              | `Record<string, unknown>` | Metadata populated by evaluators during resolution  |

The `annotations` record contains metadata populated by custom evaluators during resolution (see [Custom Conditions](/docs/custom-conditions)).

**`ResolutionError` fields:**

| Field     | Type            | Description                                                  |
| --------- | --------------- | ------------------------------------------------------------ |
| `success` | `false`         | Always `false` on error (for union discrimination)           |
| `key`     | `string`        | The definition key that failed                               |
| `error`   | `ShowwhatError` | The error that occurred (e.g. not found, inactive, no match) |

Per-key errors such as `DefinitionNotFoundError`, `DefinitionInactiveError`, and `VariationNotFoundError` are wrapped in `ResolutionError` and returned in the result record -- they are never thrown.

**Throws:**

- `ValidationError` — invalid context (systemic failure, thrown before resolution begins)

## `resolve()`

Resolve all definitions in a set against a context. If any key fails, the entire call rejects.

```ts
import { resolve } from "showwhat";

const results = await resolve({
  definitions: { flag_a: defA, flag_b: defB },
  context: { env: "prod" },
});

results.flag_a.value; // resolved value
results.flag_b.value; // resolved value
```

**Parameters:**

| Field         | Type              | Description                                      |
| ------------- | ----------------- | ------------------------------------------------ |
| `definitions` | `Definitions`     | Map of key → Definition                          |
| `context`     | `Context`         | The context object                               |
| `deps`        | `Dependencies?`   | Optional runtime utilities for custom evaluators |
| `options`     | `ResolverOptions` | Optional evaluators, fallback, logger            |

**Returns:** `Promise<Record<string, Resolution>>`

## `resolveVariation()`

Low-level: resolve a single list of variations. Returns the first matching variation or `null`.

```ts
import { resolveVariation } from "showwhat";

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

| Field        | Type              | Description                                      |
| ------------ | ----------------- | ------------------------------------------------ |
| `variations` | `Variation[]`     | Ordered list of variations to evaluate           |
| `context`    | `Context`         | The context object                               |
| `deps`       | `Dependencies?`   | Optional runtime utilities for custom evaluators |
| `options`    | `ResolverOptions` | Optional evaluators, fallback, logger            |

**Returns:** `Promise<{ variation: Variation; variationIndex: number; annotations: Record<string, unknown> } | null>`

## `parseYaml()`

Parse a YAML string into a validated `FileFormat` object (containing `definitions` and optional `presets`).

```ts
import { parseYaml } from "showwhat";

const { definitions, presets } = parseYaml(yamlString);
```

**Throws:** `ParseError` on invalid YAML, `SchemaValidationError` on schema violation.

## `parseObject()`

Validate a plain object as a `FileFormat` object (containing `definitions` and optional `presets`).

```ts
import { parseObject } from "showwhat";

const { definitions } = parseObject({
  definitions: { my_flag: { variations: [{ value: true }] } },
});
```

## `parsePresetsObject()`

Parse a plain object as a validated `Presets` map. Use this when reading a standalone preset file (e.g. `_presets.yaml`).

```ts
import { parsePresetsObject } from "showwhat";

const presets = parsePresetsObject(rawObject);
```

**Throws:** `SchemaValidationError` on schema violation.

## `registerEvaluators()`

Create a new evaluators map with additional condition types.

```ts
import { registerEvaluators } from "showwhat";

const myEvaluators = registerEvaluators({
  myCustomType: async ({ condition, context }) => {
    return (condition as { value: string }).value === context.someKey;
  },
});
```

## `evaluateCondition()`

Evaluate a single condition against a context.

```ts
import { evaluateCondition, builtinEvaluators } from "showwhat";

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
type Annotations<T extends Record<string, unknown> = Record<string, unknown>> = T;
type Dependencies<T extends Record<string, unknown> = Record<string, unknown>> = T;

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

type ResolutionError = {
  success: false;
  key: string;
  error: ShowwhatError;
};

// Record of all resolved keys
type Resolutions = Record<string, Resolution | ResolutionError>;
```
