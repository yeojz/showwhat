# showwhat

Schema and rule engine for **feature flags** and **config** resolution
<br />Inspired by OpenAPI and Swagger

## Features

- Define flags and config as [definitions](https://showwhat.yeojz.dev/docs/definitions) and declare which [variation](https://showwhat.yeojz.dev/docs/variations) is served based on [conditions](https://showwhat.yeojz.dev/docs/conditions).
- TypeScript-first with Zod validation.
- Supports `booleans`, `strings`, `numbers`, `arrays` and `objects` as resolved variation values.
- Supports both `yaml` or `json`.
- Runtime evaluation against user defined [context](https://showwhat.yeojz.dev/docs/context).
- Supports [annotations](https://showwhat.yeojz.dev/docs/annotations) for condition chaining and cross-dependency.
- Ability to define [presets](https://showwhat.yeojz.dev/docs/presets.html) for condition reuse.
- Extensible with [custom conditions](https://showwhat.yeojz.dev/docs/custom-conditions).
- Store definitions in files and manage them in version control or serve them from an API.

A browser based schema [configurator](https://showwhat.yeojz.dev/configurator/) is also provided / available.

## Installation

```bash
npm install showwhat
pnpm add showwhat
yarn add showwhat

# Other runtimes
bun add showwhat
deno install npm:showwhat
```

## Quick start

### 1. Define your flags

Definitions can be YAML files or plain objects. Each definition has **variations** evaluated top-to-bottom — the first match wins.

```yaml
# flags.yaml
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false # default — no conditions means always matches

  max_upload_size:
    variations:
      - value: 100
        conditions:
          - type: number
            key: tier_level
            op: gte
            value: 2
      - value: 25
```

### 2. Load definitions

Use `MemoryData` to load definitions from YAML strings or plain objects:

```ts
import { MemoryData } from "showwhat";

// From a YAML string
const data = await MemoryData.fromYaml(fs.readFileSync("flags.yaml", "utf8"));

// Or from a plain object
const data = await MemoryData.fromObject({
  definitions: {
    checkout_v2: {
      variations: [{ value: true, conditions: [{ type: "env", value: "prod" }] }, { value: false }],
    },
  },
});
```

### 3. Resolve flags

Pass a runtime **context** and the keys you want to resolve:

```ts
import { showwhat } from "showwhat";

const results = await showwhat({
  keys: ["checkout_v2", "max_upload_size"],
  context: { env: "prod", tier_level: 3 },
  options: { data },
});
```

Omit `keys` to resolve all definitions at once.

### 4. Use the results

Every result entry is either `{ success: true, value }` or `{ success: false, error }`:

```ts
const flag = results["checkout_v2"];
if (flag.success) {
  console.log(flag.value); // true
}

const upload = results["max_upload_size"];
if (upload.success) {
  console.log(upload.value); // 100
}
```

### Built-in condition types

| Type       | Description                          | Example                                                              |
| ---------- | ------------------------------------ | -------------------------------------------------------------------- |
| `env`      | Shorthand for matching `context.env` | `{ type: env, value: prod }`                                         |
| `string`   | Compare any string key               | `{ type: string, key: tier, op: eq, value: pro }`                    |
| `number`   | Compare any numeric key              | `{ type: number, key: level, op: gte, value: 2 }`                    |
| `bool`     | Compare any boolean key              | `{ type: bool, key: mobile, value: true }`                           |
| `datetime` | Compare any datetime key             | `{ type: datetime, key: at, op: gt, value: "2025-01-01T00:00:00Z" }` |
| `startAt`  | Passes when `context.at >= value`    | `{ type: startAt, value: "2025-06-01T00:00:00Z" }`                   |
| `endAt`    | Passes when `context.at < value`     | `{ type: endAt, value: "2025-07-01T00:00:00Z" }`                     |
| `and`      | All child conditions must pass       | `{ type: and, conditions: [...] }`                                   |
| `or`       | Any child condition must pass        | `{ type: or, conditions: [...] }`                                    |

### Presets

Presets define reusable condition shorthands to keep definitions DRY:

```yaml
definitions:
  premium_feature:
    variations:
      - value: true
        conditions:
          - type: tier
            op: in
            value: [pro, enterprise]
      - value: false

presets:
  tier:
    type: string
    key: tier
```

### Custom conditions

Register your own evaluators to extend the built-in condition types:

```ts
import { showwhat, registerEvaluators, MemoryData } from "showwhat";

const evaluators = registerEvaluators({
  percentage: async ({ condition, context }) => {
    const hash = someHash(context.userId);
    return hash % 100 < condition.value;
  },
});

const results = await showwhat({
  keys: ["gradual_rollout"],
  context: { userId: "user-123" },
  options: { data, evaluators },
});
```

## Documentation

- [Quick Start](https://showwhat.yeojz.dev/docs/) — installation and first definition
- [Conditions](https://showwhat.yeojz.dev/docs/conditions) — built-in condition types and usage
- [Context](https://showwhat.yeojz.dev/docs/context) — runtime context object
- [Definitions](https://showwhat.yeojz.dev/docs/definitions) — definition structure and variations
- [Errors](https://showwhat.yeojz.dev/docs/errors) — error types and when they are thrown
- [Custom Conditions](https://showwhat.yeojz.dev/docs/custom-conditions) — writing your own evaluators
- [Custom Data Sources](https://showwhat.yeojz.dev/docs/custom-data-sources) — implementing `DefinitionReader`
- [MemoryData](https://showwhat.yeojz.dev/docs/memory) — in-memory data source
