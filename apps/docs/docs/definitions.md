---
title: Definitions
---

# Definitions

A **definition** is a named rule-based configuration entry. It can represent a boolean feature flag, a remote config value, or a structured object. Each definition contains an ordered list of **variations** and optional metadata.

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
| `variations`  | Yes      | Ordered list of [variations](/docs/variations) to evaluate. Evaluated top-to-bottom — first match wins. See [Variations](/docs/variations) for value types, conditions, and resolution order.        |
| `active`      | No       | Set to `false` to disable the definition. Resolving an inactive definition returns a `ResolutionError` (via `showwhat()`) or throws `DefinitionInactiveError` (via `resolve()`). Defaults to `true`. |
| `description` | No       | Human-readable description                                                                                                                                                                           |

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
