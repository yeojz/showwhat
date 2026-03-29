---
title: Custom Data Sources
outline: [2, 3]
---

# Custom Data Sources

showwhat ships with `MemoryData` for in-memory definitions. For everything else, implement the `DefinitionReader` interface to fetch definitions from files, an API, a database, or anywhere else.

## The `DefinitionReader` interface

At minimum, a data source must implement two methods:

```ts
interface DefinitionReader {
  get(key: string): Promise<Definition | null>;
  getAll(): Promise<Definitions>;
  listKeys(): Promise<string[]>;
  load?(): Promise<void>;
  close?(): Promise<void>;
  ping?(): Promise<void>;
}
```

| Method     | Required | Description                                        |
| ---------- | -------- | -------------------------------------------------- |
| `get`      | Yes      | Return a single definition by key, or `null`       |
| `getAll`   | Yes      | Return all definitions as a keyed record           |
| `listKeys` | Yes      | Return all definition keys                         |
| `load`     | No       | One-time initialisation (lazy-load, connect, etc.) |
| `close`    | No       | Tear down connections or release resources         |
| `ping`     | No       | Health check — verify the source is reachable      |

## The `DefinitionWriter` interface

If your data source supports writes, implement `DefinitionWriter` too:

```ts
interface DefinitionWriter {
  put(key: string, definition: Definition): Promise<void>;
  delete(key: string): Promise<void>;
  putMany(flags: Definitions, options?: { replace?: boolean }): Promise<void>;
  load?(): Promise<void>;
  close?(): Promise<void>;
  ping?(): Promise<void>;
}
```

| Method    | Required | Description                                        |
| --------- | -------- | -------------------------------------------------- |
| `put`     | Yes      | Create or update a single definition               |
| `delete`  | Yes      | Remove a definition by key                         |
| `putMany` | Yes      | Bulk upsert; `replace: true` clears existing first |
| `load`    | No       | One-time initialisation (connect, etc.)            |
| `close`   | No       | Tear down connections or release resources         |
| `ping`    | No       | Health check — verify the source is reachable      |

A data source that implements both is a `DefinitionData`:

```ts
type DefinitionData = DefinitionReader & DefinitionWriter;
```

You can check at runtime whether a reader also supports writes:

```ts
import { isWritable } from "showwhat";

if (isWritable(data)) {
  await data.put("new_flag", definition);
}
```

## Using a custom data source

Pass your data source via the `data` option — the same way you'd use `MemoryData`:

```ts
import { showwhat } from "showwhat";

const data = new MyApiData({ baseUrl: "https://api.example.com/flags" });

const result = await showwhat({
  keys: ["checkout_v2"],
  context: { env: "prod" },
  options: { data },
});
```

## Example implementations

The examples below are starting points. Adapt them to your needs.

### Single-file reader (Node.js)

Read all definitions from one YAML or JSON file on disk:

```ts
import { readFile } from "node:fs/promises";
import { parseYaml, parseObject } from "showwhat";
import type { DefinitionReader, Definition, Definitions } from "showwhat";

class FileData implements DefinitionReader {
  private defs: Definitions | null = null;

  constructor(private path: string) {}

  async load(): Promise<void> {
    const raw = await readFile(this.path, "utf-8");
    this.defs = this.path.endsWith(".json")
      ? await parseObject(JSON.parse(raw))
      : await parseYaml(raw);
  }

  async get(key: string): Promise<Definition | null> {
    if (!this.defs) await this.load();
    return this.defs![key] ?? null;
  }

  async getAll(): Promise<Definitions> {
    if (!this.defs) await this.load();
    return this.defs!;
  }
}
```

```ts
const data = new FileData("./flags.yaml");
const result = await showwhat({
  keys: ["checkout_v2"],
  context: { env: "prod" },
  options: { data },
});
```

### Directory reader (one file per flag)

Each file in a directory contains a single definition. Scales without merge conflicts:

```
flags/
  checkout_v2.yaml
  maintenance_banner.yaml
  dark_mode.json
```

```ts
import { readdir, readFile } from "node:fs/promises";
import { join, parse as parsePath } from "node:path";
import { parseYaml, parseObject } from "showwhat";
import type { DefinitionReader, Definition, Definitions } from "showwhat";

class KeyedFileData implements DefinitionReader {
  private extensions = new Set([".yaml", ".yml", ".json"]);

  constructor(private dir: string) {}

  async get(key: string): Promise<Definition | null> {
    for (const ext of this.extensions) {
      try {
        const raw = await readFile(join(this.dir, `${key}${ext}`), "utf-8");
        const defs = ext === ".json" ? await parseObject(JSON.parse(raw)) : await parseYaml(raw);
        return defs[key] ?? null;
      } catch {
        continue;
      }
    }
    return null;
  }

  async getAll(): Promise<Definitions> {
    const files = await readdir(this.dir);
    const result: Definitions = {};

    for (const file of files) {
      const { name, ext } = parsePath(file);
      if (!this.extensions.has(ext) || name.startsWith("_")) continue;

      const raw = await readFile(join(this.dir, file), "utf-8");
      const defs = ext === ".json" ? await parseObject(JSON.parse(raw)) : await parseYaml(raw);
      Object.assign(result, defs);
    }

    return result;
  }
}
```

### HTTP API reader

Fetch definitions from a remote endpoint:

```ts
import { parseObject } from "showwhat";
import type { DefinitionReader, Definition, Definitions } from "showwhat";

class HttpData implements DefinitionReader {
  constructor(private baseUrl: string) {}

  async get(key: string): Promise<Definition | null> {
    const res = await fetch(`${this.baseUrl}/definitions/${key}`);
    if (!res.ok) return null;
    const raw = await res.json();
    const defs = await parseObject({ [key]: raw });
    return defs[key] ?? null;
  }

  async getAll(): Promise<Definitions> {
    const res = await fetch(`${this.baseUrl}/definitions`);
    const raw = await res.json();
    return parseObject(raw);
  }

  async ping(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  }
}
```

## Summary

| API                  | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `DefinitionReader`   | Read interface — `get`, `getAll`, `listKeys`, plus optional lifecycle |
| `DefinitionWriter`   | Write interface — `put`, `delete`, `putMany`, plus optional lifecycle |
| `DefinitionData`     | Combined read + write (`DefinitionReader & DefinitionWriter`)         |
| `isWritable(reader)` | Runtime check for write support                                       |
| `options.data`       | Pass your data source to `showwhat()` or `resolve()`                  |

## Next steps

- [Data Sources](/docs/data-sources) for an overview of built-in sources
- [MemoryData](/docs/memory) for the in-memory data source reference
- [Custom Conditions](/docs/custom-conditions) to pair custom data sources with custom evaluators
