---
title: Custom Conditions
outline: [2, 3]
---

# Custom Conditions

showwhat ships with a handful of built-in condition types, but the real power is in extending it with your own. The condition system is fully open — any object with a `type` string passes schema validation, and you provide the evaluator function that decides what it means.

## How evaluation works

When the resolver encounters a condition, it looks up the evaluator in the evaluators map by `condition.type`:

1. If the type is `and` or `or`, the resolver handles it internally (recursive composite evaluation)
2. Otherwise, it calls `evaluators[condition.type]({ condition, context, annotations })`
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
  key: "new_checkout",
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
  key: "my_flag",
  context: { env: "prod" },
  options: {
    data,
    fallback: async ({ condition, context }) => {
      return false;
    },
  },
});
```

Without a fallback, unknown condition types throw a `ShowwhatError`.

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

The annotations object is shared across all evaluators for a given resolution and returned in `resolution.meta.annotations`.

## Summary

| API                         | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `ConditionEvaluator`        | Type signature for evaluator functions                |
| `ConditionEvaluators<T>`    | Evaluators map type — `Record<T, ConditionEvaluator>` |
| `registerEvaluators(extra)` | Merge custom evaluators with built-ins                |
| `options.evaluators`        | Pass your evaluators to `showwhat()` or `resolve()`   |

## Examples

### Percentage rollouts {#example-percentage-rollouts}

Percentage rollouts assign users to buckets deterministically — the same user ID always produces the same result. You provide context at evaluation time and control the hashing yourself.

The examples below use [`murmurhash`](https://www.npmjs.com/package/murmurhash), but any deterministic hash function works (e.g. [`@sindresorhus/fnv1a`](https://www.npmjs.com/package/@sindresorhus/fnv1a)):

```ts
import murmurhash from "murmurhash";
// or: import fnv1a from "@sindresorhus/fnv1a";
import { registerEvaluators } from "showwhat";

const myEvaluators = registerEvaluators({
  percentage: async ({ condition, context }) => {
    const { value } = condition as { type: "percentage"; value: number };
    const userId = context.userId;
    if (!userId) return false;
    const hash = murmurhash.v3(String(userId));
    // or:
    const hash = fnv1a(String(userId), { size: 32 });
    return hash % 100 < value;
  },
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
