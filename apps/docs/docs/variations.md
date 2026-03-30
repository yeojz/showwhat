---
title: Variations
---

# Variations

A **variation** is a possible value that a [definition](/docs/definitions) can resolve to. Each definition contains an ordered list of variations — the resolver evaluates them top-to-bottom and returns the first match.

## Structure

| Field         | Required | Description                                                                                                                                       |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | Yes      | The resolved value — any [value type](#value-types)                                                                                               |
| `conditions`  | No       | Array of [conditions](/docs/conditions). All must match (implicit AND) — use an `or` composite for OR logic. If omitted or empty, always matches. |
| `id`          | No       | Stable identifier for the variation                                                                                                               |
| `description` | No       | Human-readable description                                                                                                                        |

## Value types

A variation `value` can be any JSON-compatible type:

| Type      | Example                            |
| --------- | ---------------------------------- |
| `string`  | `"on"`, `"v2"`, `"us-east-1"`      |
| `number`  | `42`, `3.14`, `0`                  |
| `boolean` | `true`, `false`                    |
| `null`    | `null`                             |
| `array`   | `["a", "b"]`, `[1, 2, 3]`          |
| `object`  | `{ theme: "dark", maxRetries: 3 }` |

This means definitions aren't limited to feature flags (boolean on/off). A single definition can resolve to a config object, a version string, a numeric limit, or anything else your application needs.

## Resolution order

Variations are evaluated **top-to-bottom**. The first variation whose conditions all match wins. If no variation matches, the resolver returns a `ResolutionError` for that key.

Place your most specific variations first and a catch-all default (no conditions) last:

```yaml
definitions:
  api_version:
    variations:
      - value: "v3"
        description: "Beta API for internal testers"
        conditions:
          - type: string
            key: tier
            op: in
            value: [internal, beta]
      - value: "v2"
        conditions:
          - type: env
            value: prod
      - value: "v1" # default — always matches
```

::: warning
A variation with no conditions (or an empty conditions array) always matches. If placed before other variations, it will always win and subsequent variations will never be evaluated.
:::

## Next steps

- [Definitions](/docs/definitions) for the full definition structure
- [Conditions](/docs/conditions) for all condition types
- [Annotations](/docs/annotations) for attaching evaluator metadata to a variation's resolution result
