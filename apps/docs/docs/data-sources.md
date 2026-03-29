---
title: Data Sources
---

# Data Sources

A data source provides definitions to the resolver. Every call to `showwhat()` or `resolve()` needs one, passed via `options.data`.

| Interface          | Purpose                                                       |
| ------------------ | ------------------------------------------------------------- |
| `DefinitionReader` | Read definitions: `get`, `getAll`, `listKeys`, plus lifecycle |
| `DefinitionWriter` | Write definitions: `put`, `delete`, `putMany`, plus lifecycle |
| `DefinitionData`   | Combined read + write (`DefinitionReader & DefinitionWriter`) |

## Built-in

| Source                       | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| [`MemoryData`](/docs/memory) | In-memory. Parse YAML or JSON, no I/O after setup. |

## Custom

Need to load definitions from a database, API, or filesystem? Implement `DefinitionReader`. For read-write sources, add `DefinitionWriter` too. Use `isWritable()` to check at runtime:

```ts
import { isWritable } from "showwhat";

if (isWritable(data)) {
  await data.put("my_flag", definition);
}
```

See the [Custom Data Sources](/docs/custom-data-sources) guide for full interface details and example implementations.
