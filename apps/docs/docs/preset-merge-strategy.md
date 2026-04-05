---
title: Preset Merge Strategy
outline: [2, 3]
---

# Preset Merge Strategy

When presets are defined in multiple places — a hosted presets endpoint, definition files, and local overrides — they must be merged into a single set before evaluation. The `mergePresets` helper handles this deterministically, and the Configurator uses it internally. Using the same function in your application code guarantees that evaluation results match what the Configurator shows.

## Why this matters

The Configurator lets users author and preview definitions with presets loaded from sources. If your application resolves presets with different merge logic, the evaluated result can diverge from what the Configurator displays. `mergePresets` eliminates that risk by providing a single source of truth for merge order.

## The mergePresets function

```ts
import { mergePresets } from "showwhat";
import type { PresetReader, Presets } from "showwhat";

const merged = await mergePresets({
  key, // optional — omit for shared presets, provide for per-definition presets
  presets, // optional — a PresetReader that fetches base presets
  overrides, // optional — local presets spread on top of the base
});
```

The merge is a single shallow spread:

```
result = { ...base, ...overrides }
```

- **base** comes from the `PresetReader` — either `getPresets()` (shared) or `getPresets(key)` (per-definition).
- **overrides** are local presets (e.g. user-defined in the Configurator editor, or from a config file in your app).
- When a name appears in both, **overrides win**.

If no reader is provided, the base is `{}`. If no overrides are provided, the base is returned as-is.

## PresetReader

`PresetReader` is the interface that decouples merge logic from data fetching:

```ts
interface PresetReader {
  getPresets(): Promise<Presets>;
  getPresets(key: string): Promise<Presets>;
}
```

- `getPresets()` — returns **shared** presets (from a dedicated presets endpoint or an embedded file).
- `getPresets(key)` — returns presets **scoped to a definition key**. Implementations typically layer per-key presets on top of shared presets before returning.

`MemoryData` implements `PresetReader`, so if you use `MemoryData.fromYaml()` or `MemoryData.fromObject()`, you already have a reader.

## Merge order by source mode

### Bundled mode

A bundled source serves a single file containing both definitions and presets. There is only one preset set — all definitions share it.

```
                     ┌─────────────────┐
                     │  PresetReader   │
                     │  (file presets) │
                     └───────┬─────────┘
                             │ base
                             ▼
                 mergePresets({ presets: reader, overrides })
                             │
                             ▼
                     ┌───────────────┐
                     │ Merged result │
                     └───────────────┘
```

```ts
const merged = await mergePresets({ presets: reader, overrides: localPresets });
// { ...filePresets, ...localPresets }
```

### Split mode

A split source serves definitions individually. Presets can exist in three places:

1. **Source presets** — from a dedicated presets URL (`presetsUrl`).
2. **Per-definition file presets** — embedded in each definition's file.
3. **Local overrides** — user-defined.

The reader handles layers 1 and 2 internally. When called with a key, it returns `{ ...sourcePresets, ...filePresets }`. `mergePresets` then applies overrides on top:

```
  ┌──────────────┐    ┌──────────────────┐
  │ Source (URL)  │    │ Per-key file     │
  │ presets       │    │ presets          │
  └──────┬───────┘    └────────┬─────────┘
         │                     │
         └──────┬──────────────┘
                │ reader.getPresets(key)
                ▼
    mergePresets({ key, presets: reader, overrides })
                │
                ▼
        ┌───────────────┐
        │ Merged result │
        └───────────────┘
```

```ts
// Shared presets (used as fallback or for definitions without per-key presets)
const shared = await mergePresets({ presets: reader, overrides: localPresets });
// { ...sourcePresets, ...localPresets }

// Per-definition presets
const forBanner = await mergePresets({ key: "banner", presets: reader, overrides: localPresets });
// { ...sourcePresets, ...bannerFilePresets, ...localPresets }
```

### Priority summary

| Priority | Source                      | How it gets in                                    |
| -------- | --------------------------- | ------------------------------------------------- |
| Highest  | Local overrides             | Passed as `overrides` to `mergePresets`           |
| Middle   | Per-definition file presets | Returned by `reader.getPresets(key)` (split only) |
| Lowest   | Source/shared presets       | Returned by `reader.getPresets()`                 |

## Matching the Configurator

The Configurator resolves presets in `App.tsx` using exactly the pattern above. To replicate its behaviour in your application:

```ts
import { mergePresets, createPresetConditions, registerEvaluators, showwhat } from "showwhat";
import type { PresetReader } from "showwhat";

// 1. Build a PresetReader from your data source
//    MemoryData already implements PresetReader:
//    const data = await MemoryData.fromYaml(yamlString);
//
//    Or implement it yourself for a remote source:
const reader: PresetReader = {
  async getPresets(key?: string) {
    const url = key
      ? `https://cdn.example.com/presets/${key}.json`
      : "https://cdn.example.com/presets.json";
    return fetch(url).then((r) => r.json());
  },
};

// 2. Merge presets the same way the Configurator does
const localOverrides = {
  beta: { type: "bool", key: "beta_user" },
};

// For shared resolution (bundled mode, or split mode fallback):
const sharedPresets = await mergePresets({
  presets: reader,
  overrides: localOverrides,
});

// For per-key resolution (split mode):
const bannerPresets = await mergePresets({
  key: "banner",
  presets: reader,
  overrides: localOverrides,
});

// 3. Create evaluators from merged presets and resolve
const evaluators = registerEvaluators(createPresetConditions(bannerPresets));

const result = await showwhat({
  keys: ["banner"],
  context: { env: "prod", beta_user: true },
  options: { data, evaluators },
});
```

::: warning
If you skip `mergePresets` and build your own preset map, the merge order may differ from the Configurator. This can cause definitions to evaluate differently at runtime than what was previewed in the Configurator.
:::

## Next steps

- [Presets](/docs/presets) for the format reference and defining presets
- [Presets in the Configurator](/docs/configurator-presets) for the Configurator's preset UI
- [Custom Data Sources](/docs/custom-data-sources) for implementing your own `PresetReader`
