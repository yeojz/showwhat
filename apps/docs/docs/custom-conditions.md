---
title: Custom Conditions
outline: [2, 3]
---

# Custom Conditions

showwhat ships with a handful of built-in condition types, but the real power is in extending it with your own. The condition system is fully open — any object with a `type` string passes schema validation, and you provide the evaluator function that decides what it means.

## How evaluation works

When the resolver encounters a condition, it looks up the evaluator in the evaluators map by `condition.type`:

1. If the type is `and` or `or`, the resolver handles it internally (recursive composite evaluation)
2. Otherwise, it calls `evaluators[condition.type](...)`
3. If no evaluator is found for the type, the condition returns `false` (fail-closed)

This fail-closed default means typos in condition types or missing evaluators safely prevent a variation from matching, rather than accidentally enabling it.

## Interfaces and types

### `ConditionEvaluator`

Every condition evaluator is a single async function:

Each evaluator receives a single args object and returns `Promise<boolean>`.

| Parameter     | Type                      | Description                                            |
| ------------- | ------------------------- | ------------------------------------------------------ |
| `condition`   | `unknown`                 | Raw condition object from your definition              |
| `context`     | `Readonly<Context>`       | Resolution context                                     |
| `annotations` | `Record<string, unknown>` | Mutable record — write metadata here during evaluation |
| `deps`        | `Readonly<Dependencies>`  | Injected runtime utilities (hash functions, fetchers)  |
| `depth`       | `string`                  | Depth tracking string for nested conditions            |

Return `true` to match, `false` to skip the variation.

### `ConditionEvaluators<T>`

`ConditionEvaluators<T>` is a `Record<T, ConditionEvaluator>` mapping condition type strings to evaluator functions.

`registerEvaluators` is generic — it preserves type information about your custom condition keys.

## Writing and registering custom conditions

Write an async function that receives an args object containing the condition, context, and annotations, then returns a boolean. Use `registerEvaluators` to merge your evaluators with the built-ins — see the [percentage rollout example](#example-percentage-rollouts) below for a complete example.

`registerEvaluators` returns a new `ConditionEvaluators` map that includes all built-in evaluators plus yours. You cannot override the reserved composite types `and` and `or` — attempting to do so throws an error.

### Passing evaluators

Pass your evaluators via the `evaluators` option:

```ts
import { showwhat } from "showwhat";

const result = await showwhat({
  keys: ["new_checkout"],
  context: { env: "prod", userId: "user-42" },
  options: { data, evaluators: myEvaluators },
});
```

Or at the resolver level:

```ts
import { resolve } from "showwhat";

const results = await resolve({
  definitions,
  context: { env: "prod", userId: "user-42" },
  options: { evaluators: myEvaluators },
});
```

### Writing definitions with custom types

Custom condition types work in YAML/JSON definitions just like built-in ones. Any object with a `type` field that isn't a reserved built-in will pass schema validation:

```yaml
definitions:
  new_checkout:
    variations:
      - value: true
        conditions:
          - type: percentage
            value: 25
      - value: false
```

Custom conditions compose with `and`/`or` and nest freely:

```yaml
definitions:
  dark_mode:
    variations:
      - value: true
        conditions:
          - type: and
            conditions:
              - type: env
                value: prod
              - type: percentage
                value: 50
      - value: false
```

## Fallback evaluator

If you need to handle unknown condition types gracefully — for example, in a preview or simulator — pass a `fallback` evaluator via `options.fallback`. When the resolver encounters a condition type with no registered evaluator, it calls the fallback instead of throwing.

```ts
const result = await showwhat({
  keys: ["my_flag"],
  context: { env: "prod" },
  options: {
    data,
    fallback: async ({ condition, context }) => {
      return false;
    },
  },
});
```

Without a fallback, unknown condition types return a `ResolutionError` for the affected key.

## Annotations

Evaluators can write to the `annotations` record to attach metadata that appears in the `Resolution` result. This is useful for debugging, auditing, or passing evaluator-specific data back to the caller.

```ts
const myEvaluators = registerEvaluators({
  percentage: async ({ condition, context, annotations }) => {
    const { value } = condition as { type: "percentage"; value: number };
    const userId = context.userId;
    if (!userId) return false;
    const hash = murmurhash.v3(String(userId));
    const bucket = hash % 100;
    annotations.rollout = { bucket, threshold: value };
    return bucket < value;
  },
});
```

The annotations object is shared across all evaluators for a given resolution and returned in `entry.meta.annotations` (after checking that `entry.success` is `true`).

## Dependency injection

Custom evaluators often need runtime utilities — hash functions, async fetchers, lookup tables — that don't belong in the evaluation context. The `deps` parameter lets you inject these at the call site and access them in every evaluator.

### Passing deps

Pass `deps` alongside `context` at any entry point:

```ts
import { showwhat, registerEvaluators } from "showwhat";

const result = await showwhat({
  keys: ["new_checkout"],
  context: { env: "prod", userId: "user-42" },
  deps: { hash: murmurhash.v3 },
  options: { data, evaluators: myEvaluators },
});
```

`deps` is optional and defaults to `{}`. It is passed as `Readonly` to evaluators — evaluators should read from it, not mutate it.

### Typed deps with evaluator contracts

Each evaluator can export an interface describing the deps it requires:

```ts
// rollout-evaluator.ts
export interface RolloutDeps {
  hash: (id: string) => number;
}

export interface RolloutAnnotations {
  bucketId: number;
}

const rolloutEvaluator: ConditionEvaluator = async ({ condition, context, deps, annotations }) => {
  const { value } = condition as { type: "rollout"; value: number };
  const { hash } = deps as RolloutDeps;
  const userId = String(context.userId);
  const bucket = hash(userId) % 100;
  (annotations as RolloutAnnotations).bucketId = bucket;
  return bucket < value;
};
```

Users compose deps types by intersection:

```ts
import type { RolloutDeps } from "./rollout-evaluator";
import type { SegmentDeps } from "./segment-evaluator";
import type { Dependencies } from "showwhat";

type MyDeps = RolloutDeps & SegmentDeps;

const result = await showwhat<MyContext, MyDeps>({
  keys: ["feature"],
  context: myContext,
  deps: { hash: murmurhash.v3, fetchSegments: mySegmentFetcher },
  options: { data, evaluators },
});
```

### deps vs context

|                                 | `context`                             | `deps`                                 |
| ------------------------------- | ------------------------------------- | -------------------------------------- |
| **Contains**                    | Evaluation data (env, userId, region) | Runtime utilities (functions, clients) |
| **Mutability**                  | Readonly                              | Readonly                               |
| **Schema-validated**            | Yes                                   | No                                     |
| **Used by built-in evaluators** | Yes                                   | No                                     |

## Summary

| API                         | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `ConditionEvaluator`        | Type signature for evaluator functions                |
| `ConditionEvaluators<T>`    | Evaluators map type — `Record<T, ConditionEvaluator>` |
| `Annotations<T>`            | Generic type for evaluator-written metadata           |
| `Dependencies<T>`           | Generic type for injected runtime utilities           |
| `registerEvaluators(extra)` | Merge custom evaluators with built-ins                |
| `options.evaluators`        | Pass your evaluators to `showwhat()` or `resolve()`   |
| `deps`                      | Pass runtime utilities to `showwhat()` or `resolve()` |

## Examples

### Percentage rollouts {#example-percentage-rollouts}

Percentage rollouts assign users to buckets deterministically. Inject the hash function via `deps` so your evaluator stays pure and testable:

```ts
import type { ConditionEvaluator } from "showwhat";

export interface RolloutDeps {
  hash: (id: string) => number;
}

const rolloutEvaluator: ConditionEvaluator = async ({ condition, context, deps }) => {
  const { value } = condition as { type: "percentage"; value: number };
  const { hash } = deps as RolloutDeps;
  const userId = context.userId;
  if (!userId) return false;
  return hash(String(userId)) % 100 < value;
};
```

```ts
import murmurhash from "murmurhash";
import { showwhat, registerEvaluators } from "showwhat";

const myEvaluators = registerEvaluators({ percentage: rolloutEvaluator });

const result = await showwhat({
  keys: ["checkout_redesign"],
  context: { env: "prod", userId: "user-42" },
  deps: { hash: murmurhash.v3 },
  options: { data, evaluators: myEvaluators },
});
```

```yaml
definitions:
  checkout_redesign:
    variations:
      - value: "variant-b"
        conditions:
          - type: env
            value: prod
          - type: percentage
            value: 10 # 10% rollout
      - value: "control"
```

::: tip
showwhat handles the evaluation — tracking impressions, measuring conversion, and statistical analysis are your responsibility. Pipe results into your analytics tool of choice.
:::

### User targeting {#example-user-attribute}

A condition that targets users based on attributes from context:

```ts
const myEvaluators = registerEvaluators({
  userAttribute: async ({ condition, context }) => {
    const { attribute, value } = condition as {
      type: "userAttribute";
      attribute: string;
      value: string | string[];
    };
    const actual = context[attribute];
    if (!actual) return false;
    const allowed = Array.isArray(value) ? value : [value];
    return allowed.includes(String(actual));
  },
});
```

```yaml
definitions:
  premium_feature:
    variations:
      - value: true
        conditions:
          - type: userAttribute
            attribute: plan
            value: [pro, enterprise]
      - value: false
```

## Next steps

- [Conditions](/docs/conditions) for all built-in condition types
- [Custom Data Sources](/docs/custom-data-sources) to pair custom evaluators with your own storage
- [Context](/docs/context) for details on the context object and when to use `deps` vs `context`
