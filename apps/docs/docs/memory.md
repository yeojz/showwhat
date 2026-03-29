---
title: MemoryData
---

# MemoryData

An in-memory data source. Parse YAML or JSON directly — no filesystem, no I/O after construction.

## From YAML

```ts
import { MemoryData } from "showwhat";

const data = await MemoryData.fromYaml(`
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false
`);
```

## From an object

```ts
import { MemoryData } from "showwhat";

const data = await MemoryData.fromObject({
  definitions: {
    checkout_v2: {
      variations: [{ value: true, conditions: [{ type: "env", value: "prod" }] }, { value: false }],
    },
  },
});
```

## Interface

`MemoryData` implements `DefinitionReader`:

```ts
await data.get("checkout_v2"); // Definition | null
await data.getAll(); // Record<string, Definition>
await data.set("new_flag", def); // void
await data.remove("old_flag"); // void
```

## When to use

- Tests and scripts
- Serverless functions (fetch config, parse in-memory)
- Anywhere you don't want filesystem I/O
