---
title: Annotations
outline: [2, 3]
---

# Annotations

**Annotations** are a mutable `Record<string, AnnotationValue>` that evaluators can write to during condition evaluation. They provide a way to attach metadata — such as rollout buckets, matched segments, or debug info — to a resolution result without affecting the match/no-match outcome.

## How annotations flow

1. A fresh empty object `{}` is created for each [variation](/docs/variations) evaluation
2. The object is passed to every condition evaluator as the `annotations` parameter
3. Evaluators can write arbitrary key-value pairs to it during evaluation
4. If the variation matches, its annotations are returned in `Resolution.meta.annotations`
5. If the variation does not match, its annotations are discarded

```
variation evaluation starts
  └─ annotations = {}
       ├─ evaluator A writes annotations.source = "rollout"
       ├─ evaluator B writes annotations.bucket = 42
       └─ variation matches → annotations returned in result
```

## Writing annotations

Any [custom evaluator](/docs/custom-conditions) can write to the `annotations` parameter it receives:

```ts
const rolloutEvaluator: ConditionEvaluator = async ({ condition, context, annotations }) => {
  const { value } = condition as { type: "percentage"; value: number };
  const userId = context.userId;
  if (!userId) return false;
  const bucket = murmurhash.v3(String(userId)) % 100;
  annotations.rollout = { bucket, threshold: value };
  return bucket < value;
};
```

The object is shared across all evaluators for a given variation, so multiple evaluators can write to different keys, building up a metadata record as conditions are evaluated.

## Reading annotations

Annotations appear in the resolution result under `meta.annotations`:

```ts
const results = await showwhat({
  keys: ["checkout_redesign"],
  context: { env: "prod", userId: "user-42" },
  options: { data, evaluators },
});

const entry = results["checkout_redesign"];
if (entry.success) {
  console.log(entry.meta.annotations);
  // { bucket: 42, threshold: 50 }
}
```

## The `matchAnnotations` condition

The `matchAnnotations` condition is a built-in modifier that lets you **verify** annotations set by previous evaluators. It evaluates its nested conditions against the annotations object as context, rather than the regular evaluation context.

```yaml
definitions:
  checkout_redesign:
    variations:
      - value: "variant-b"
        conditions:
          - type: rollout
            value: 50
          # Verify that the rollout evaluator wrote the expected annotation
          - type: matchAnnotations
            conditions:
              - type: number
                key: bucket
                op: gte
                value: 0
      - value: "control"
```

### How it works

1. Nested conditions are evaluated as an implicit AND (same as variation conditions)
2. The current `annotations` object is used as the `context` for nested conditions
3. Nested conditions receive a **fresh empty annotations** object — they cannot write back to the parent annotations
4. Existing condition types (`string`, `number`, `bool`, etc.) work unchanged inside `matchAnnotations`

### Condition order matters

Since variation conditions are evaluated left-to-right, the `matchAnnotations` condition must come **after** the evaluators whose annotations it verifies. Placing it before will find an empty annotations object.

### Flat key lookup

Built-in evaluators use direct property access (`annotations[key]`), not dot-notation traversal. When writing annotations for use with the `matchAnnotations` condition, use flat top-level keys:

```ts
// Good — evaluators can read these directly
annotations.bucket = 42;
annotations.threshold = 50;

// Nested objects can't be queried with built-in evaluators
// Use a custom evaluator if you need to verify nested structures
annotations.rollout = { bucket: 42, threshold: 50 };
```

## Seeding annotations

By default, each variation starts with an empty annotations object. You can provide a `createAnnotations` factory in `ResolverOptions` to seed initial values:

```ts
const results = await resolve({
  definitions,
  context: { env: "prod" },
  options: {
    evaluators,
    createAnnotations: (definitionKey) => ({ source: "preview", key: definitionKey }),
  },
});
```

The factory is called once per variation attempt with the definition key (or `undefined` when calling `resolveVariation` directly without a key). Evaluators can overwrite seeded values during evaluation.

## Per-variation lifecycle

Each variation evaluation creates a fresh annotations object (or a fresh copy from `createAnnotations`). If a variation fails (conditions don't match), its annotations are discarded and the next variation starts with a clean slate:

```yaml
variations:
  - value: "variant-a"
    conditions:
      - type: rollout # writes annotations.bucket = 80
        value: 50 # fails (80 >= 50)
    # annotations { bucket: 80 } discarded

  - value: "variant-b"
    conditions:
      - type: rollout # writes annotations.bucket = 80
        value: 90 # passes (80 < 90)
    # annotations { bucket: 80 } returned with result
```

## Next steps

- [Custom Conditions](/docs/custom-conditions) for writing evaluators that use annotations
- [Conditions](/docs/conditions) for all built-in condition types
- [Variations](/docs/variations) for how variations are structured and resolved
