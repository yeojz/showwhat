# Preset Merge Helper Design

## Problem

Core's `createPresetConditions()` accepts any `Presets` object with no merge-order enforcement. The correct layering is scattered across the webapp as manual spread operations in `App.tsx`, `SourceSettings.tsx`, and multiple store files. Library users of `showwhat` have no guidance or tooling for correct merge order.

## Solution

Two-phase approach:

- **Phase A:** Add `mergePresets()` helper to `showwhat` package, standardise `PresetReader` implementations.
- **Phase B:** Simplify the webapp by replacing manual preset state management with `mergePresets()` calls.

---

## Preset Sources and Priority

There are two layers of presets:

1. **Reader presets** — fetched via `PresetReader`, mode-dependent layering handled internally by each reader implementation.
2. **Overrides** — user-provided preset overrides (highest priority), applied by `mergePresets()`.

### Reader behavior by mode

| Implementation | `getPresets()` (global) | `getPresets(key)` (per-definition) |
|---|---|---|
| `MemoryData` | File-level presets | Same as `getPresets()` |
| `BundledSourceHttpReader` | File-embedded presets | Same as `getPresets()` |
| `SplitSourceHttpReader` | presetsUrl presets | `{ ...presetsUrl, ...key's file presets }` |

Only split mode differentiates between `getPresets()` and `getPresets(key)`, because each definition key's file can carry its own presets that layer on top of the shared presetsUrl presets.

### Final merge (handled by `mergePresets()`)

```
result = { ...reader.getPresets(key?), ...overrides }
```

| Mode | Effective merge (lowest to highest priority) |
|------|----------------------------------------------|
| Split | presetsUrl presets → key's file presets → overrides |
| Bundled | file presets → overrides |
| Local file | file presets → overrides |

---

## Phase A: Helper + Standardise Readers

### `mergePresets()` in `showwhat` package

```typescript
export async function mergePresets({
  key,
  presets,
  overrides,
}: {
  key?: string;
  presets?: PresetReader;
  overrides?: Presets;
}): Promise<Presets> {
  const base = presets
    ? key
      ? await presets.getPresets(key)
      : await presets.getPresets()
    : {};
  if (!overrides || Object.keys(overrides).length === 0) return base;
  return { ...base, ...overrides };
}
```

### `PresetReader` implementation changes

**`MemoryData`** (core) — No functional change needed. `getPresets(key?)` already returns file-level presets regardless of key. Remove the eslint-disable comment and use the parameter name `_key` to signal intent.

**`BundledSourceHttpReader`** (webapp) — No functional change needed. Same reasoning as `MemoryData`.

**`SplitSourceHttpReader`** (webapp) — Must differentiate:
- `getPresets()` → fetch from presetsUrl (current behavior)
- `getPresets(key)` → `{ ...presetsUrl presets, ...key's file presets }`

This replaces the current `fetchDefinitionKey()` approach where per-key presets are extracted separately and tracked in `SourceFetchResult.definitionPresets`.

### Webapp wiring (Phase A)

- `App.tsx` replaces manual spread merging with `mergePresets()` calls
- Remove the `definitionPresets` concept from `SourceFetchResult`
- `SplitSourceHttpReader.getPresets(key)` handles the per-key layering internally

---

## Phase B: Webapp State Simplification

### Store changes

**`definition-store.ts`** — Remove `filePresets`, `sourcePresets`, `definitionPresets` fields. Replace with a `PresetReader` reference that the store holds. Remove `setSourcePresets()`, `setDefinitionPresets()`, `upsertDefinitionPresets()` methods.

**`preset-store.ts`** — Rename "Custom Presets" to "Preset Overrides" in UI labels. The store itself stays (it holds user-defined overrides), but the UI language changes to reflect the actual role.

### App.tsx simplification

Instead of:
```typescript
const customPresets = usePresetStore((s) => s.presets);
const filePresets = useDefinitionStore((s) => s.filePresets);
const sourcePresets = useDefinitionStore((s) => s.sourcePresets);
const definitionPresets = useDefinitionStore((s) => s.definitionPresets);

const sharedPresets = useMemo(
  () => ({ ...customPresets, ...filePresets, ...sourcePresets }),
  [customPresets, filePresets, sourcePresets],
);
```

Becomes:
```typescript
const overrides = usePresetStore((s) => s.presets);
const presetReader = useDefinitionStore((s) => s.presetReader);
// Call mergePresets({ key, presets: presetReader, overrides }) at resolution time
```

### SourceSettings.tsx simplification

`handleLoad` no longer needs to separately manage preset state fields. It stores the reader reference, and `mergePresets()` handles the rest at consumption time.

---

## Testing

### Phase A
- Unit tests for `mergePresets()` in `showwhat` package: no reader, reader only, overrides only, reader + overrides, with and without key
- Unit tests for `SplitSourceHttpReader.getPresets(key)` layering behavior

### Phase B
- Verify existing webapp tests pass after store simplification
- Verify preset resolution produces same results as before (same merge priority)

---

## Files affected

### Phase A
- `packages/showwhat/src/index.ts` — add `mergePresets()` export
- `packages/core/src/data.ts` — no functional change, clarify `MemoryData.getPresets` intent
- `apps/webapp/src/lib/http-reader.ts` — update `SplitSourceHttpReader.getPresets(key)`
- `apps/webapp/src/App.tsx` — use `mergePresets()`
- `apps/webapp/src/lib/http-reader.ts` — remove `definitionPresets` from `SourceFetchResult`

### Phase B
- `apps/webapp/src/store/definition-store.ts` — remove preset fields, add reader reference
- `apps/webapp/src/store/preset-store.ts` — no code change, UI label rename
- `apps/webapp/src/components/SourceSettings.tsx` — simplify preset orchestration
- `apps/webapp/src/App.tsx` — further simplify to use reader reference
- `apps/webapp/src/components/PresetSettings.tsx` — rename "Custom Presets" to "Preset Overrides"
- `packages/configurator/` — update if preset-related props change
