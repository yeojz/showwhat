---
title: Presets
outline: [2, 3]
---

# Presets

Presets are named shortcuts for [condition types](/docs/conditions). Instead of repeating `type: string`, `key: tier` across many definitions, you define a `tier` preset once and use `type: tier` everywhere. Presets work with both the core engine (evaluation) and the Configurator UI (custom editors with friendly labels).

## Defining presets

A preset map is a record of preset names to definitions. Each preset maps a friendly name to an underlying condition type.

::: code-group

```yaml [YAML]
presets:
  tier:
    type: string
    key: tier
    overrides:
      op: eq

  age:
    type: number
    key: user_age

  premium:
    type: bool
    key: premium
```

```json [JSON]
{
  "presets": {
    "tier": {
      "type": "string",
      "key": "tier",
      "overrides": { "op": "eq" }
    },
    "age": {
      "type": "number",
      "key": "user_age"
    },
    "premium": {
      "type": "bool",
      "key": "premium"
    }
  }
}
```

:::

| Field       | Required | Description                                                                                                                            |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `type`      | Yes      | The underlying condition type (`string`, `number`, `bool`, or `datetime`)                                                              |
| `key`       | Yes\*    | The context property to match against. Required for built-in types.                                                                    |
| `overrides` | No       | Field values that are forced and locked. Overridden fields cannot be edited in the Configurator UI and are enforced during evaluation. |

::: tip
Preset names cannot collide with built-in or reserved condition types (`string`, `number`, `bool`, `datetime`, `env`, `startAt`, `endAt`, `and`, `or`).
:::

## Composite presets

Composite presets use `and`, `or`, or `checkAnnotations` as their type to bake an entire condition tree into a single reusable name. Instead of binding a single context key, they lock a set of conditions via `overrides.conditions`.

::: code-group

```yaml [YAML]
presets:
  sg_free:
    type: and
    overrides:
      conditions:
        - type: string
          key: region
          op: eq
          value: sg
        - type: string
          key: tier
          op: eq
          value: free

  premium:
    type: or
    overrides:
      conditions:
        - type: string
          key: tier
          op: eq
          value: pro
        - type: string
          key: tier
          op: eq
          value: enterprise
```

```json [JSON]
{
  "presets": {
    "sg_free": {
      "type": "and",
      "overrides": {
        "conditions": [
          { "type": "string", "key": "region", "op": "eq", "value": "sg" },
          { "type": "string", "key": "tier", "op": "eq", "value": "free" }
        ]
      }
    },
    "premium": {
      "type": "or",
      "overrides": {
        "conditions": [
          { "type": "string", "key": "tier", "op": "eq", "value": "pro" },
          { "type": "string", "key": "tier", "op": "eq", "value": "enterprise" }
        ]
      }
    }
  }
}
```

:::

| Field                  | Required | Description                                                                                |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `type`                 | Yes      | `and`, `or`, or `checkAnnotations`                                                         |
| `key`                  | No       | Not used for composite types                                                               |
| `overrides.conditions` | Yes      | A non-empty array of conditions. Each item is a full [condition](/docs/conditions) object. |

Conditions inside `overrides.conditions` can themselves be composite, allowing arbitrarily deep nesting:

```yaml
presets:
  sg_free_or_enterprise:
    type: or
    overrides:
      conditions:
        - type: and
          conditions:
            - type: string
              key: region
              op: eq
              value: sg
            - type: string
              key: tier
              op: eq
              value: free
        - type: string
          key: tier
          op: eq
          value: enterprise
```

This preset matches users who are either on the free tier in Singapore, or on the enterprise tier in any region.

::: warning
Use-site `conditions` are ignored for composite presets — the conditions locked in `overrides` always win. This is by design: composite presets are meant to be self-contained.
:::

## Using presets

### Evaluation

Use `createPresetConditions` to generate evaluators from your preset map, then merge them with the default conditions:

```ts
import { showwhat, registerEvaluators, createPresetConditions } from "showwhat";

const presets = {
  tier: { type: "string", key: "tier", overrides: { op: "eq" } },
  age: { type: "number", key: "user_age" },
  sg_free: {
    type: "and",
    overrides: {
      conditions: [
        { type: "string", key: "region", op: "eq", value: "sg" },
        { type: "string", key: "tier", op: "eq", value: "free" },
      ],
    },
  },
};

const presetConditions = createPresetConditions(presets);

const result = await showwhat({
  keys: ["banner"],
  context: { region: "sg", tier: "free", user_age: 25 },
  options: {
    data,
    evaluators: registerEvaluators(presetConditions),
  },
});
const banner = result["banner"];
if (!banner.error) {
  console.log(banner.value);
}
```

Definitions can then use preset types directly. For primitive presets, the `key` is already bound, so you only need to specify the remaining fields. For composite presets, no additional fields are needed — the entire condition tree is baked in:

```yaml
definitions:
  banner:
    variations:
      - value: "Welcome back, local!"
        conditions:
          - type: sg_free
      - value: "Welcome back, Pro!"
        conditions:
          - type: tier
            value: pro
      - value: "Upgrade to Pro"
        conditions:
          - type: age
            op: gte
            value: 18
      - value: "Upgrade today"
```

In this example, `sg_free` is a composite preset — it carries its full condition tree and needs no extra fields. The `tier` preset has `overrides: { op: "eq" }`, so `op` is locked and only `value` needs to be specified. The `age` preset has no overrides, so both `op` and `value` are user-specified.

## Validation

Use `PresetsSchema` (Zod) to validate preset definitions at runtime:

```ts
import { PresetsSchema } from "showwhat";

const result = PresetsSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.issues);
}
```

## Next steps

- [Preset Merge Strategy](/docs/preset-merge-strategy) for merging presets from multiple sources
- [Presets in the Configurator](/docs/configurator-presets) for the visual preset editor and viewer
- [Conditions](/docs/conditions) for all built-in condition types that presets build on
- [Custom Conditions](/docs/custom-conditions) to go beyond presets with fully custom evaluators
