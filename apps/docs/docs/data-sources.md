---
title: Data Sources
---

# Data Sources

A data source provides definitions to the resolver. Every call to `showwhat()` or `resolve()` needs one — passed via `options.data`.

At its simplest, a data source implements the `DefinitionReader` interface:

```ts
interface DefinitionReader {
  get(key: string): Promise<Definition | null>;
  getAll(): Promise<Definitions>;
  load?(): Promise<void>;
  close?(): Promise<void>;
  ping?(): Promise<void>;
}
```

## Built-in

| Source                       | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| [`MemoryData`](/docs/memory) | In-memory — parse YAML or JSON, no I/O after setup |

## Custom

Need to load definitions from a database, API, or filesystem? Implement `DefinitionReader` — see the [Extending Data Sources](/docs/custom-data-sources) guide.

For read-write sources, implement both `DefinitionReader` and `DefinitionWriter` to get a `DefinitionData`. Use `isWritable()` to narrow at runtime:

```ts
import { isWritable } from "showwhat";

if (isWritable(data)) {
  await data.put("my_flag", definition);
}
```
