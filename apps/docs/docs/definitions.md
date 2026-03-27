---
title: Definitions
---

# Definitions

A **definition** is a named feature configuration. Each definition contains an ordered list of **variations** and optional metadata.

## Structure

Definitions can be written in YAML or JSON. Both formats are equivalent — use whichever fits your workflow.

::: code-group

```yaml [YAML]
definitions:
  my_flag:
    active: true
    description: "Controls the checkout experience"
    variations:
      - value: "new"
        conditions:
          - type: env
            value: prod
      - value: "old"
```

```json [JSON]
{
  "definitions": {
    "my_flag": {
      "active": true,
      "description": "Controls the checkout experience",
      "variations": [
        {
          "value": "new",
          "conditions": [{ "type": "env", "value": "prod" }]
        },
        { "value": "old" }
      ]
    }
  }
}
```

:::

| Field         | Required | Description                                                                                                                                                                                          |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variations`  | Yes      | Ordered list of variations to evaluate                                                                                                                                                               |
| `active`      | No       | Set to `false` to disable the definition. Resolving an inactive definition returns a `ResolutionError` (via `showwhat()`) or throws `DefinitionInactiveError` (via `resolve()`). Defaults to `true`. |
| `description` | No       | Human-readable description                                                                                                                                                                           |

## Variations

Each variation has a `value` and optional `conditions`:

```yaml
variations:
  - value: "on"
    conditions:
      - type: env
        value: prod
  - value: "off"
```

- `value` — any [supported value type](#value-types)
- `conditions` — array of [conditions](/docs/conditions). All conditions in a variation must match (implicit AND). If omitted or empty, the variation always matches.

### Value types

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

## Resolution

Variations are evaluated **top-to-bottom**. The first variation whose conditions all match wins. If no variation matches, `showwhat()` returns a `ResolutionError` for that key instead of a `Resolution`.

Place your most specific variations first and a catch-all default (no conditions) last:

```yaml
definitions:
  my_flag:
    variations:
      - value: "beta"
        conditions:
          - type: env
            value: staging
      - value: "stable" # default — always matches
```

## Multiple definitions

A single YAML or JSON source can contain multiple definitions:

```yaml
definitions:
  flag_a:
    variations:
      - value: true

  flag_b:
    variations:
      - value: "hello"
      - value: "world"
```
