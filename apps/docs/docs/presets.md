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
      value: free

  age:
    type: number
    key: user_age
    overrides:
      op: gte
      value: 18

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
      "overrides": { "op": "eq", "value": "free" }
    },
    "age": {
      "type": "number",
      "key": "user_age",
      "overrides": { "op": "gte", "value": 18 }
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

## Using presets for evaluation

Use `createPresetConditions` to generate evaluators from your preset map, then merge them with the default conditions:

```ts
import { showwhat, registerEvaluators, createPresetConditions } from "showwhat";

const presets = {
  tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
  age: { type: "number", key: "user_age" },
};

const presetConditions = createPresetConditions(presets);

const result = await showwhat({
  keys: ["banner"],
  context: { tier: "pro", user_age: 25 },
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

Definitions can then use preset types directly. The `key` is already bound by the preset, so you only specify `op` and `value`. Any fields listed in `overrides` are forced during evaluation and cannot be changed in the Configurator UI:

```yaml
definitions:
  banner:
    variations:
      - value: "Welcome back, Pro!"
        conditions:
          - type: tier
            op: eq
            value: pro
      - value: "Upgrade today"
```

## Using presets in the Configurator UI

Use `createPresetUI` to generate UI extensions from your preset map, then pass them to the `<Configurator>` component:

```tsx
import { Configurator } from "@showwhat/configurator";
import { createPresetUI } from "@showwhat/configurator";

const conditionExtensions = createPresetUI(presets);

function App() {
  return <Configurator store={store} conditionExtensions={conditionExtensions} />;
}
```

With extensions provided, presets appear in the "Add condition" menu with friendly labels (e.g., "Tier", "Age", "Premium"). Each preset renders a type-specific editor with the key pre-filled and locked. Fields listed in `overrides` are also disabled in the editor.

## API reference

### Types

| Type                  | Import from              | Description                                                           |
| --------------------- | ------------------------ | --------------------------------------------------------------------- |
| `Presets`             | `showwhat`               | `Record<string, PresetDefinition>`                                    |
| `PresetDefinition`    | `showwhat`               | `{ type: string; key?: string; overrides?: Record<string, unknown> }` |
| `BuiltinPresetType`   | `showwhat`               | `"string" \| "number" \| "bool" \| "datetime"`                        |
| `ConditionExtensions` | `@showwhat/configurator` | `{ extraConditionTypes, editorOverrides }`                            |

### Functions

| Function                    | Import from              | Description                                                      |
| --------------------------- | ------------------------ | ---------------------------------------------------------------- |
| `createPresetConditions`    | `showwhat`               | Creates evaluators from a preset map for use with `showwhat()`   |
| `createPresetUI`            | `@showwhat/configurator` | Creates condition meta and editor overrides for the Configurator |
| `createPresetConditionMeta` | `@showwhat/configurator` | Creates only the condition meta entries (without editors)        |

### Validation

Use `PresetsSchema` (Zod) to validate preset definitions at runtime:

```ts
import { PresetsSchema } from "showwhat";

const result = PresetsSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.issues);
}
```
