---
title: OpenFeature
---

# OpenFeature

Use showwhat as the evaluation engine behind the standard [OpenFeature](https://openfeature.dev/) Server SDK. The `@showwhat/openfeature` package provides a `Provider` that bridges OpenFeature evaluations to showwhat's rule engine.

```bash
npm install @showwhat/openfeature @openfeature/server-sdk
```

`@openfeature/server-sdk` is a peer dependency.

## Quick start

```ts
import { OpenFeature } from "@openfeature/server-sdk";
import { ShowwhatProvider } from "@showwhat/openfeature";
import { MemoryData } from "showwhat";

const data = await MemoryData.fromYaml(yamlString);

await OpenFeature.setProviderAndWait(new ShowwhatProvider({ data }));

const client = OpenFeature.getClient();

const enabled = await client.getBooleanValue("checkout_v2", false, {
  env: "production",
});
```

## Provider options

| Option       | Type                  | Required | Description                                                                    |
| ------------ | --------------------- | -------- | ------------------------------------------------------------------------------ |
| `data`       | `DefinitionReader`    | yes      | Source of showwhat definitions                                                 |
| `evaluators` | `ConditionEvaluators` | no       | Custom condition evaluators (see [Custom Conditions](/docs/custom-conditions)) |
| `deps`       | `Dependencies`        | no       | Runtime utilities forwarded to all evaluator calls                             |
| `logger`     | `Logger`              | no       | Logger instance for debug output                                               |

```ts
import { ShowwhatProvider } from "@showwhat/openfeature";
import { MemoryData, registerEvaluators } from "showwhat";

const data = await MemoryData.fromObject({
  definitions: {
    premium_feature: {
      variations: [{ value: true, conditions: [{ type: "tier", tier: "pro" }] }, { value: false }],
    },
  },
});

const provider = new ShowwhatProvider({
  data,
  evaluators: registerEvaluators({ tier: tierEvaluator }),
  deps: { hash: murmurhash.v3 },
});
```

::: tip Shared lifetime
Since `deps` is stored on the provider instance, the same object is shared across all evaluations for the lifetime of the provider. This is appropriate for stateless functions (hash, fetch). If you need per-call deps, extend `ShowwhatProvider` or wrap it in a factory.
:::

## Context mapping

OpenFeature's `EvaluationContext` is flattened into showwhat's `Context` (a flat `Record<string, string | number | boolean>`). Nested objects, arrays, dates, and `null` values are dropped. The `targetingKey` field is passed through as-is.

```ts
const result = await client.getBooleanValue("my_flag", false, {
  targetingKey: "user-123",
  env: "production",
  admin: true,
});

// showwhat sees: { targetingKey: "user-123", env: "production", admin: true }
```

## Evaluation types

All four OpenFeature evaluation types are supported:

| Method                     | showwhat value type                    |
| -------------------------- | -------------------------------------- |
| `resolveBooleanEvaluation` | `boolean`                              |
| `resolveStringEvaluation`  | `string`                               |
| `resolveNumberEvaluation`  | `number`                               |
| `resolveObjectEvaluation`  | `JsonValue` (object, array, or `null`) |

If the resolved value does not match the requested type, the provider returns the `defaultValue` with a `TYPE_MISMATCH` error.

## Error mapping

showwhat errors are mapped to OpenFeature error codes:

| showwhat error            | OpenFeature error code |
| ------------------------- | ---------------------- |
| `DefinitionNotFoundError` | `FLAG_NOT_FOUND`       |
| `DefinitionInactiveError` | `FLAG_NOT_FOUND`       |
| `VariationNotFoundError`  | `GENERAL`              |
| `ValidationError`         | `INVALID_CONTEXT`      |
| `DataError`               | `GENERAL`              |

Errors never throw from the provider. They are returned as part of `ResolutionDetails` with the `defaultValue`.

## Resolution reasons

The provider maps showwhat results to OpenFeature resolution reasons:

| Scenario                             | Reason            |
| ------------------------------------ | ----------------- |
| Variation matched via conditions     | `TARGETING_MATCH` |
| Variation matched with no conditions | `STATIC`          |
| Flag not found or inactive           | `ERROR`           |
| Type mismatch                        | `ERROR`           |

## Lifecycle

- **`initialize()`** calls `data.load()` if the data source implements it.
- **`onClose()`** calls `data.close()` if the data source implements it.

## Data sources

Any `DefinitionReader` works:

| Source       | Package    | Description                                                                                  |
| ------------ | ---------- | -------------------------------------------------------------------------------------------- |
| `MemoryData` | `showwhat` | In-memory definitions (tests, embeds)                                                        |
| Custom       | -          | Implement `DefinitionReader` ([examples](/docs/custom-data-sources#example-implementations)) |

## Exports

| Export                    | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `ShowwhatProvider`        | OpenFeature `Provider` implementation                                    |
| `ShowwhatProviderOptions` | Options type for the provider constructor (`data`, `evaluators`, `deps`) |
| `toShowwhatContext`       | Utility to flatten `EvaluationContext` into showwhat `Context`           |
