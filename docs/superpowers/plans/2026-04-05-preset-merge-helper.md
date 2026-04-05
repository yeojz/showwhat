# Preset Merge Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralise preset merging logic in the `showwhat` package and simplify the webapp by removing manual preset state management.

**Architecture:** Add `mergePresets()` to `showwhat` as a pure async function that fetches from `PresetReader` and layers overrides. Fix `SplitSourceHttpReader.getPresets(key)` to return `{ ...sourcePresets, ...keyFilePresets }`. Then simplify the webapp store to hold a `PresetReader` reference instead of three separate preset fields.

**Tech Stack:** TypeScript, Vitest, Zustand, React

---

## Phase A: Helper + Standardise Readers

### Task 1: Add `mergePresets()` to `showwhat` package

**Files:**
- Modify: `packages/showwhat/src/index.ts`
- Modify: `packages/showwhat/src/index.test.ts`

- [ ] **Step 1: Write failing tests for `mergePresets`**

Add to `packages/showwhat/src/index.test.ts`:

```typescript
import {
  showwhat,
  registerEvaluators,
  mergePresets,
  MemoryData,
  // ... existing imports
} from "./index.js";
import type { ConditionEvaluator, Definitions, PresetReader, Presets } from "./index.js";

// ... after existing test suites ...

describe("mergePresets", () => {
  it("returns empty object when no reader or overrides", async () => {
    const result = await mergePresets({});
    expect(result).toEqual({});
  });

  it("returns overrides when no reader", async () => {
    const overrides: Presets = { tier: { type: "string", key: "tier" } };
    const result = await mergePresets({ overrides });
    expect(result).toEqual(overrides);
  });

  it("returns reader presets when no overrides", async () => {
    const readerPresets: Presets = { env: { type: "string", key: "env" } };
    const reader: PresetReader = {
      getPresets: async () => readerPresets,
    };
    const result = await mergePresets({ presets: reader });
    expect(result).toEqual(readerPresets);
  });

  it("overrides take priority over reader presets", async () => {
    const readerPresets: Presets = {
      tier: { type: "string", key: "tier" },
      env: { type: "string", key: "env" },
    };
    const overrides: Presets = {
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    };
    const reader: PresetReader = {
      getPresets: async () => readerPresets,
    };
    const result = await mergePresets({ presets: reader, overrides });
    expect(result).toEqual({
      env: { type: "string", key: "env" },
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    });
  });

  it("calls getPresets(key) when key is provided", async () => {
    const sharedPresets: Presets = { env: { type: "string", key: "env" } };
    const keyPresets: Presets = {
      env: { type: "string", key: "env" },
      tier: { type: "string", key: "tier" },
    };
    const reader: PresetReader = {
      getPresets: async (key?: string) => (key ? keyPresets : sharedPresets),
    };
    const result = await mergePresets({ key: "feature-flags", presets: reader });
    expect(result).toEqual(keyPresets);
  });

  it("layers overrides on top of key-specific presets", async () => {
    const keyPresets: Presets = {
      env: { type: "string", key: "env" },
      tier: { type: "string", key: "tier" },
    };
    const overrides: Presets = {
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "pro" } },
    };
    const reader: PresetReader = {
      getPresets: async (key?: string) => (key ? keyPresets : {}),
    };
    const result = await mergePresets({
      key: "feature-flags",
      presets: reader,
      overrides,
    });
    expect(result).toEqual({
      env: { type: "string", key: "env" },
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "pro" } },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/showwhat && npx vitest run src/index.test.ts`
Expected: FAIL — `mergePresets` is not exported

- [ ] **Step 3: Implement `mergePresets`**

Add to `packages/showwhat/src/index.ts` after the existing imports:

```typescript
import type {
  ConditionEvaluators,
  Context,
  Definitions,
  DefinitionReader,
  Dependencies,
  PresetReader,
  Presets,
  Resolution,
  ResolutionError,
  ResolverOptions,
} from "@showwhat/core";
```

Add the function before `registerEvaluators`:

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/showwhat && npx vitest run src/index.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/showwhat/src/index.ts packages/showwhat/src/index.test.ts
git commit -m "feat: add mergePresets helper to showwhat package"
```

---

### Task 2: Fix `SplitSourceHttpReader.getPresets(key)` to layer presets

**Files:**
- Modify: `apps/webapp/src/lib/http-reader.ts`
- Modify: `apps/webapp/src/lib/http-reader.test.ts`

- [ ] **Step 1: Write failing test for `SplitSourceHttpReader.getPresets(key)`**

Add to `apps/webapp/src/lib/http-reader.test.ts` inside the `SplitSourceHttpReader` describe block:

```typescript
describe("getPresets(key)", () => {
  it("returns source presets overlaid with key file presets", async () => {
    const source = createSplitSource({
      presetsUrl: "https://r2.example.com/presets.json",
      definitionKeys: ["flag-a"],
    });
    const reader = new SplitSourceHttpReader(source);

    const sourcePresets: Presets = { env: { type: "string", key: "env" } };
    const keyFilePresets: Presets = { tier: { type: "string", key: "tier" } };

    // First call: fetch presetsUrl
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () => JSON.stringify({ presets: sourcePresets }),
    });
    // Second call: fetch definition key file
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({
          variations: [{ value: true }],
          presets: keyFilePresets,
        }),
    });

    mockPresetsSafeParse
      .mockReturnValueOnce({ success: true, data: sourcePresets })
      .mockReturnValueOnce({ success: true, data: keyFilePresets });
    mockDefinitionSafeParse.mockReturnValue({
      success: true,
      data: { variations: [{ value: true }] },
    });

    const result = await reader.getPresets("flag-a");
    expect(result).toEqual({
      env: { type: "string", key: "env" },
      tier: { type: "string", key: "tier" },
    });
  });

  it("returns only key file presets when no presetsUrl", async () => {
    const source = createSplitSource({ definitionKeys: ["flag-a"] });
    const reader = new SplitSourceHttpReader(source);

    const keyFilePresets: Presets = { tier: { type: "string", key: "tier" } };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({
          variations: [{ value: true }],
          presets: keyFilePresets,
        }),
    });

    mockPresetsSafeParse.mockReturnValue({ success: true, data: keyFilePresets });
    mockDefinitionSafeParse.mockReturnValue({
      success: true,
      data: { variations: [{ value: true }] },
    });

    const result = await reader.getPresets("flag-a");
    expect(result).toEqual(keyFilePresets);
  });

  it("returns only source presets when key file has no presets", async () => {
    const source = createSplitSource({
      presetsUrl: "https://r2.example.com/presets.json",
      definitionKeys: ["flag-a"],
    });
    const reader = new SplitSourceHttpReader(source);

    const sourcePresets: Presets = { env: { type: "string", key: "env" } };

    // presetsUrl fetch
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () => JSON.stringify({ presets: sourcePresets }),
    });
    // key file fetch (no presets)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () => JSON.stringify({ variations: [{ value: true }] }),
    });

    mockPresetsSafeParse
      .mockReturnValueOnce({ success: true, data: sourcePresets })
      .mockReturnValueOnce({ success: false });
    mockDefinitionSafeParse.mockReturnValue({
      success: true,
      data: { variations: [{ value: true }] },
    });

    const result = await reader.getPresets("flag-a");
    expect(result).toEqual(sourcePresets);
  });

  it("key file presets override source presets on collision", async () => {
    const source = createSplitSource({
      presetsUrl: "https://r2.example.com/presets.json",
      definitionKeys: ["flag-a"],
    });
    const reader = new SplitSourceHttpReader(source);

    const sourcePresets: Presets = { tier: { type: "string", key: "tier" } };
    const keyFilePresets: Presets = {
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () => JSON.stringify({ presets: sourcePresets }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({
          variations: [{ value: true }],
          presets: keyFilePresets,
        }),
    });

    mockPresetsSafeParse
      .mockReturnValueOnce({ success: true, data: sourcePresets })
      .mockReturnValueOnce({ success: true, data: keyFilePresets });
    mockDefinitionSafeParse.mockReturnValue({
      success: true,
      data: { variations: [{ value: true }] },
    });

    const result = await reader.getPresets("flag-a");
    expect(result).toEqual(keyFilePresets);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/webapp && npx vitest run src/lib/http-reader.test.ts`
Expected: FAIL — current `getPresets` ignores the key parameter

- [ ] **Step 3: Implement `SplitSourceHttpReader.getPresets(key)`**

Replace lines 302-313 of `apps/webapp/src/lib/http-reader.ts`:

```typescript
  async getPresets(key?: string): Promise<Presets> {
    // Shared presets from presetsUrl
    let sourcePresets: Presets = {};
    if (this.#source.presetsUrl) {
      sourcePresets =
        (await fetchPresetsFromUrl(
          this.#source.presetsUrl,
          this.#source.format,
          this.#source.headers,
        )) ?? {};
    }

    if (!key) return sourcePresets;

    // Per-key file presets
    const { filePresets } = await this.fetchDefinitionKey(key);
    if (!filePresets) return sourcePresets;

    return { ...sourcePresets, ...filePresets };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/webapp && npx vitest run src/lib/http-reader.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/webapp/src/lib/http-reader.ts apps/webapp/src/lib/http-reader.test.ts
git commit -m "feat: SplitSourceHttpReader.getPresets(key) layers source + file presets"
```

---

### Task 3: Remove `definitionPresets` from `SourceFetchResult` and update `fetchSource`

Now that `getPresets(key)` handles per-key layering internally, `fetchSource()` no longer needs to track `definitionPresets` separately.

**Files:**
- Modify: `apps/webapp/src/lib/http-reader.ts`
- Modify: `apps/webapp/src/lib/http-reader.test.ts`
- Modify: `apps/webapp/src/hooks/useSourceFetch.ts`

- [ ] **Step 1: Update `SourceFetchResult` type**

In `apps/webapp/src/lib/http-reader.ts`, replace lines 13-24:

```typescript
export type SourceFetchResult = {
  definitions: Definitions;
  /** Presets from file (bundled) or presetsUrl (split). */
  presets?: Presets;
  keys: string[];
  failedKeys?: string[];
};
```

- [ ] **Step 2: Update `SplitSourceHttpReader.fetchSource()` to remove `definitionPresets` tracking**

In `apps/webapp/src/lib/http-reader.ts`, replace lines 190-242 (`fetchSource` method of `SplitSourceHttpReader`):

```typescript
  async fetchSource(): Promise<SourceFetchResult> {
    const keys = this.#source.definitionKeys.filter((k) => !DANGEROUS_KEYS.has(k));

    if (keys.length === 0) {
      throw new Error("No definition keys configured");
    }

    const definitions: Record<string, Definition> = {};
    const failedKeys: string[] = [];

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const fetched = await this.fetchDefinitionKey(key);
        return { key, definition: fetched.definition };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        definitions[result.value.key] = result.value.definition;
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        const match = msg.match(/Invalid definition for "(.+?)"/);
        failedKeys.push(match?.[1] ?? "unknown");
      }
    }

    if (Object.keys(definitions).length === 0) {
      throw new Error("All definition fetches failed");
    }

    let presets: Presets | undefined;
    if (this.#source.presetsUrl) {
      presets = await fetchPresetsFromUrl(
        this.#source.presetsUrl,
        this.#source.format,
        this.#source.headers,
      );
    }

    return {
      definitions: definitions as Definitions,
      presets,
      keys: Object.keys(definitions),
      failedKeys,
    };
  }
```

- [ ] **Step 3: Update any tests that reference `definitionPresets` in `SourceFetchResult`**

Search `http-reader.test.ts` for `definitionPresets` and remove those assertions. The `fetchSource` tests should no longer expect a `definitionPresets` field.

- [ ] **Step 4: Run tests**

Run: `cd apps/webapp && npx vitest run src/lib/http-reader.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/webapp/src/lib/http-reader.ts apps/webapp/src/lib/http-reader.test.ts apps/webapp/src/hooks/useSourceFetch.ts
git commit -m "refactor: remove definitionPresets from SourceFetchResult"
```

---

## Phase B: Webapp State Simplification

### Task 4: Simplify `definition-store` — replace three preset fields with `PresetReader`

**Files:**
- Modify: `apps/webapp/src/store/definition-store.ts`

- [ ] **Step 1: Replace preset fields with `presetReader`**

In `apps/webapp/src/store/definition-store.ts`, replace the `FileDefinitionState` type (lines 34-79):

```typescript
export type FileDefinitionState = ConfiguratorStore & {
  savedDefinitions: Definitions;
  /** Presets embedded within the loaded definition file. */
  filePresets: Presets;
  /** Active PresetReader for fetching presets from the loaded source. */
  presetReader: PresetReader | null;
  sourceFileName: string | null;
  sourceFormat: "yaml" | "json" | null;

  /**
   * Full load: replaces all definitions and file-embedded presets.
   */
  importDefinitions(
    defs: Definitions,
    fileName: string,
    format: "yaml" | "json",
    filePresets?: Presets,
  ): void;
  /**
   * Merge a single definition key fetched from the server without disturbing
   * any other state (presets, other definitions, dirty keys for other keys).
   */
  upsertDefinition(key: string, def: Definition): void;
  /** Set the active PresetReader (from a hosted source). */
  setPresetReader(reader: PresetReader | null): void;
  revertAll(): void;
  clearAll(): void;
};
```

- [ ] **Step 2: Update store implementation**

Replace the initial state and methods. Remove `sourcePresets`, `definitionPresets`, `setSourcePresets`, `setDefinitionPresets`, `upsertDefinitionPresets`. Add `presetReader` and `setPresetReader`:

Initial state changes:
```typescript
filePresets: {},
presetReader: null,
```

Replace `importDefinitions`:
```typescript
importDefinitions(defs, fileName, format, filePresets) {
  set((state) => ({
    definitions: structuredClone(defs),
    savedDefinitions: structuredClone(defs),
    filePresets: filePresets ?? {},
    presetReader: null,
    sourceFileName: fileName,
    sourceFormat: format,
    dirtyKeys: [],
    revision: state.revision + 1,
    validationErrors: {},
    selectedKey: Object.keys(defs)[0] ?? null,
  }));
},
```

Add `setPresetReader`:
```typescript
setPresetReader(reader) {
  set({ presetReader: reader });
},
```

Remove `setSourcePresets`, `setDefinitionPresets`, `upsertDefinitionPresets` methods entirely.

Replace `clearAll`:
```typescript
clearAll() {
  set((state) => ({
    definitions: {},
    savedDefinitions: {},
    filePresets: {},
    presetReader: null,
    selectedKey: null,
    sourceFileName: null,
    sourceFormat: null,
    dirtyKeys: [],
    revision: state.revision + 1,
    validationErrors: {},
  }));
},
```

- [ ] **Step 3: Update persistence (partialize, migrate, rehydrate)**

Update `partialize` — `presetReader` is not serialisable, so exclude it. Remove `sourcePresets` and `definitionPresets`:
```typescript
partialize: (state) => ({
  savedDefinitions: state.savedDefinitions,
  filePresets: state.filePresets,
  selectedKey: state.selectedKey,
  sourceFileName: state.sourceFileName,
  sourceFormat: state.sourceFormat,
}),
```

Update `migrate` — since v2 hasn't shipped, simplify to handle only v1:
```typescript
migrate(persistedState, version) {
  const s = persistedState as Record<string, unknown>;
  if (version === 1) {
    return {
      ...s,
      filePresets: (s.inlinePresets as Presets | null | undefined) ?? {},
    };
  }
  return persistedState;
},
```

Bump version to `3` (keep same number since v2 never shipped, or keep at 3 for safety — the migration from v2 just becomes a no-op pass-through).

Update `onRehydrateStorage`:
```typescript
onRehydrateStorage: () => (state) => {
  if (!state) return;
  state.definitions = structuredClone(state.savedDefinitions);
  state.filePresets = state.filePresets ?? {};
  state.presetReader = null;
  state.dirtyKeys = [];
  state.validationErrors = {};
},
```

- [ ] **Step 4: Verify the store compiles**

Run: `cd apps/webapp && npx tsc --noEmit`
Expected: Errors in `SourceSettings.tsx` and `App.tsx` (they still reference old fields). That's expected — we fix those next.

- [ ] **Step 5: Commit**

```bash
git add apps/webapp/src/store/definition-store.ts
git commit -m "refactor: replace preset fields with presetReader in definition store"
```

---

### Task 5: Update `SourceSettings.tsx` to use `presetReader`

**Files:**
- Modify: `apps/webapp/src/components/SourceSettings.tsx`
- Modify: `apps/webapp/src/hooks/useSourceFetch.ts`

- [ ] **Step 1: Simplify `useSourceFetch` hook — remove `reloadPresets` and simplify `reloadDefinitionKey`**

Replace `apps/webapp/src/hooks/useSourceFetch.ts`:

```typescript
import { useCallback, useState } from "react";
import type { Definition } from "showwhat";
import type { HostedSource, SplitSource } from "../store/source-store.js";
import {
  SplitSourceHttpReader,
  createHttpReader,
  formatFetchError,
  type SourceFetchResult,
} from "../lib/http-reader.js";

export type { SourceFetchResult };

export type SourceFetchError = {
  message: string;
  failedKeys?: string[];
};

export function useSourceFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SourceFetchError | null>(null);

  const fetchSource = useCallback(
    async (source: HostedSource): Promise<SourceFetchResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const reader = createHttpReader(source);
        const result = await reader.fetchSource();

        if ("failedKeys" in result && result.failedKeys && result.failedKeys.length > 0) {
          setError({
            message: `Loaded ${result.keys.length} definitions, but ${result.failedKeys.length} failed`,
            failedKeys: result.failedKeys,
          });
        }

        return result;
      } catch (err) {
        setError({ message: formatFetchError(err) });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reloadKeyList = useCallback(async (source: SplitSource): Promise<string[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const reader = new SplitSourceHttpReader(source);
      return await reader.listKeys();
    } catch (err) {
      setError({ message: formatFetchError(err) });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadDefinitionKey = useCallback(
    async (source: SplitSource, key: string): Promise<Definition | null> => {
      setLoading(true);
      setError(null);

      try {
        const reader = new SplitSourceHttpReader(source);
        const { definition } = await reader.fetchDefinitionKey(key);
        return definition;
      } catch (err) {
        setError({ message: formatFetchError(err) });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { fetchSource, reloadKeyList, reloadDefinitionKey, loading, error };
}
```

- [ ] **Step 2: Update `SourceSettings.tsx`**

Update the store selector (lines 26-48) — remove `setSourcePresets`, `setDefinitionPresets`, `upsertDefinitionPresets`, add `setPresetReader`:

```typescript
const {
  sourceFileName,
  sourceFormat,
  definitions,
  dirtyKeys,
  importDefinitions,
  upsertDefinition,
  setPresetReader,
  clearAll,
} = useDefinitionStore(
  useShallow((s) => ({
    sourceFileName: s.sourceFileName,
    sourceFormat: s.sourceFormat,
    definitions: s.definitions,
    dirtyKeys: s.dirtyKeys,
    importDefinitions: s.importDefinitions,
    upsertDefinition: s.upsertDefinition,
    setPresetReader: s.setPresetReader,
    clearAll: s.clearAll,
  })),
);
```

Update the `useSourceFetch` destructuring — remove `reloadPresets`:
```typescript
const {
  fetchSource,
  reloadKeyList,
  reloadDefinitionKey,
  loading,
  error: fetchError,
} = useSourceFetch();
```

Replace `handleLoad` (lines 121-138):
```typescript
async function handleLoad(source: HostedSource) {
  const result = await fetchSource(source);
  if (!result) return;

  if (source.mode === "split") {
    // Split: definitions only in store, reader handles all preset fetching
    importDefinitions(result.definitions, source.label, source.format);
    setPresetReader(createHttpReader(source));
  } else {
    // Bundled: file presets stored in store, no reader needed
    importDefinitions(result.definitions, source.label, source.format, result.presets);
  }
  setActiveSource(source.id);
  markFetched(source.id, result.keys);
  setSelection("__active__");
}
```

Add the import for `createHttpReader`:
```typescript
import { createHttpReader } from "../lib/http-reader.js";
```

Replace `doFileImport` (lines 168-173):
```typescript
function doFileImport(result: NonNullable<typeof pendingFileImport>) {
  setActiveSource(null);
  importDefinitions(result.definitions, result.fileName, result.format, result.presets);
  setSelection("__active__");
}
```

Replace `handleReloadKey` (lines 209-218):
```typescript
async function handleReloadKey(key: string) {
  const source = getRelevantSource();
  if (!source || source.mode !== "split") return;
  const definition = await reloadDefinitionKey(source as SplitSource, key);
  if (definition) {
    upsertDefinition(key, definition);
    markFetched(source.id, [key]);
  }
}
```

Replace `handleReloadPresets` (lines 220-228) — this now just refreshes the reader reference so downstream consumers re-fetch:
```typescript
async function handleReloadPresets() {
  const source = getRelevantSource();
  if (!source || source.mode !== "split" || !source.presetsUrl) return;
  // Re-create reader to bust any caches
  setPresetReader(createHttpReader(source));
  markPresetsFetched(source.id);
}
```

Replace `handleRefreshSingle` (lines 230-237):
```typescript
async function handleRefreshSingle() {
  const source = getRelevantSource();
  if (!source || source.mode !== "bundled") return;
  const result = await fetchSource(source);
  if (!result) return;
  importDefinitions(result.definitions, source.label, source.format, result.presets);
  markFetched(source.id, result.keys);
}
```

- [ ] **Step 3: Run type check**

Run: `cd apps/webapp && npx tsc --noEmit`
Expected: Errors in `App.tsx` and `PresetSettings.tsx` (still referencing old fields). That's expected.

- [ ] **Step 4: Commit**

```bash
git add apps/webapp/src/components/SourceSettings.tsx apps/webapp/src/hooks/useSourceFetch.ts
git commit -m "refactor: SourceSettings uses presetReader instead of manual preset state"
```

---

### Task 6: Simplify `App.tsx` preset merging

**Files:**
- Modify: `apps/webapp/src/App.tsx`

- [ ] **Step 1: Replace manual preset merging with `mergePresets`-ready approach**

The configurator's `createPresetUI` is synchronous and runs at render time, but `mergePresets` is async. We need to resolve presets eagerly and cache the result. Replace the preset section in `App.tsx` (lines 56-86):

```typescript
import { mergePresets } from "showwhat";
import type { Presets, PresetReader } from "showwhat";
```

Replace the preset merging block:

```typescript
const overrides = usePresetStore((s) => s.presets);
const filePresets = useDefinitionStore((s) => s.filePresets);
const presetReader = useDefinitionStore((s) => s.presetReader);

// Build a PresetReader from available sources:
// - Split mode: presetReader is set (handles presetsUrl + per-key file presets)
// - Bundled/file mode: presetReader is null, wrap filePresets as a simple reader
const effectiveReader = useMemo((): PresetReader | undefined => {
  if (presetReader) return presetReader;
  if (Object.keys(filePresets).length === 0) return undefined;
  return { getPresets: async () => filePresets };
}, [presetReader, filePresets]);

// Resolve merged presets (async → state)
const [resolvedPresets, setResolvedPresets] = useState<Presets>({});
const [resolvedKeyPresets, setResolvedKeyPresets] = useState<Record<string, Presets>>({});

useEffect(() => {
  let cancelled = false;
  mergePresets({ presets: effectiveReader, overrides }).then((result) => {
    if (!cancelled) setResolvedPresets(result);
  });
  return () => { cancelled = true; };
}, [effectiveReader, overrides]);

const conditionExtensions = useMemo(
  () => createPresetUI(resolvedPresets),
  [resolvedPresets],
);

const conditionExtensionsResolver = useMemo(() => {
  if (!isSplit) return undefined;
  const cache = new Map<string, { presets: Presets; extensions: ReturnType<typeof createPresetUI> }>();
  return (key: string) => {
    const cached = cache.get(key);
    const keyPresets = resolvedKeyPresets[key];
    if (cached && cached.presets === keyPresets) return cached.extensions;

    // Trigger async resolution for this key if not yet resolved
    if (!keyPresets) {
      mergePresets({ key, presets: effectiveReader, overrides }).then((result) => {
        setResolvedKeyPresets((prev) => ({ ...prev, [key]: result }));
      });
      // Return shared presets as fallback until key-specific ones resolve
      return createPresetUI(resolvedPresets);
    }

    const extensions = createPresetUI(keyPresets);
    cache.set(key, { presets: keyPresets, extensions });
    return extensions;
  };
}, [isSplit, effectiveReader, overrides, resolvedPresets, resolvedKeyPresets]);
```

Add `useState` and `useEffect` to the existing React import if not already present (they already are on line 1).

- [ ] **Step 2: Remove old store selectors**

Remove these lines (they are no longer used):
```typescript
// DELETE these:
const filePresets = useDefinitionStore((s) => s.filePresets);  // KEEP — still used
const sourcePresets = useDefinitionStore((s) => s.sourcePresets);  // DELETE
const definitionPresets = useDefinitionStore((s) => s.definitionPresets);  // DELETE
```

- [ ] **Step 3: Update the presets tab rendering**

Replace the presets tab section (lines 137-149) to pass the new props:

```typescript
{tab === "presets" && (
  <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-2xl p-8 space-y-8">
      <PresetEditor />
      <InlinePresetList
        resolvedPresets={resolvedPresets}
        overrides={overrides}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Run type check**

Run: `cd apps/webapp && npx tsc --noEmit`
Expected: Errors in `PresetSettings.tsx` (props changed). Fixed in next task.

- [ ] **Step 5: Commit**

```bash
git add apps/webapp/src/App.tsx
git commit -m "refactor: App.tsx uses mergePresets instead of manual spread"
```

---

### Task 7: Update `PresetSettings.tsx` — rename to "Preset Overrides" and simplify `InlinePresetList`

**Files:**
- Modify: `apps/webapp/src/components/PresetSettings.tsx`

- [ ] **Step 1: Rename "Custom Presets" label**

On line 36, change:
```typescript
<h2 className="text-base font-semibold text-foreground">Preset Overrides</h2>
```

Update the description on line 37-38:
```typescript
<p className="mt-1 text-xs text-muted-foreground">
  Define named preset overrides in YAML or JSON format. These take the highest priority.
</p>
```

- [ ] **Step 2: Simplify `InlinePresetList` props**

Replace the `InlinePresetList` component (lines 195-271):

```typescript
export function InlinePresetList({
  resolvedPresets,
  overrides,
}: {
  resolvedPresets: Presets;
  overrides: Presets;
}) {
  const entries = Object.entries(resolvedPresets);
  const hasAny = entries.length > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Resolved Presets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Final merged presets from all sources, after applying overrides.
        </p>
      </div>

      {!hasAny && (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No presets loaded.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Load a source that includes presets to see them here.
          </p>
        </div>
      )}

      {hasAny && (
        <div className="space-y-1.5">
          {entries.map(([name, preset]) => (
            <InlinePresetRow
              key={name}
              name={name}
              preset={preset}
              overridesCustom={name in overrides}
            />
          ))}
        </div>
      )}

      {hasAny && Object.keys(overrides).length > 0 && entries.some(([name]) => name in overrides) && (
        <p className="text-xs text-muted-foreground">
          <ArrowUpCircle className="mr-1 inline h-3 w-3 text-amber-500" />
          Amber icon indicates this preset was provided by an override.
        </p>
      )}
    </section>
  );
}
```

Remove the `PresetGroup` component (lines 163-193) — it's no longer used.

- [ ] **Step 3: Run type check and tests**

Run: `cd apps/webapp && npx tsc --noEmit && npx vitest run`
Expected: PASS (may need to update `PresetSettings.test.tsx` — see next step)

- [ ] **Step 4: Update `PresetSettings.test.tsx` if needed**

The test file renders `InlinePresetList` with old props (`filePresets`, `sourcePresets`, `definitionPresets`, `customPresets`). Update to use new props (`resolvedPresets`, `overrides`). The exact changes depend on the current test structure — update the render calls to match the new API.

- [ ] **Step 5: Run full test suite**

Run: `cd apps/webapp && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/webapp/src/components/PresetSettings.tsx apps/webapp/src/components/PresetSettings.test.tsx
git commit -m "refactor: rename Custom Presets to Preset Overrides, simplify InlinePresetList"
```

---

### Task 8: Clean up — remove unused `fetchPresets` and `SplitSourceHttpReader` public methods

**Files:**
- Modify: `apps/webapp/src/lib/http-reader.ts`

- [ ] **Step 1: Remove `SplitSourceHttpReader.fetchPresets()` method**

Remove lines 182-188 — the public `fetchPresets` method is no longer called externally (it was used by `reloadPresets` in the old hook):

```typescript
// DELETE this entire method:
async fetchPresets(
  url: string,
  format: "yaml" | "json",
  headers?: Record<string, string>,
): Promise<Presets | undefined> {
  return fetchPresetsFromUrl(url, format, headers);
}
```

- [ ] **Step 2: Run tests**

Run: `cd apps/webapp && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/webapp/src/lib/http-reader.ts
git commit -m "chore: remove unused SplitSourceHttpReader.fetchPresets method"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full monorepo build**

Run: `npx turbo build`
Expected: All packages build successfully

- [ ] **Step 2: Run full monorepo tests**

Run: `npx turbo test`
Expected: All tests PASS

- [ ] **Step 3: Run type check across all packages**

Run: `npx turbo typecheck`
Expected: No type errors

- [ ] **Step 4: Manual smoke test (optional)**

If the dev server is available:
1. Load a bundled source — verify presets display correctly
2. Load a split source — verify per-key presets resolve correctly
3. Add preset overrides — verify they take highest priority
4. Check the Presets tab — verify "Preset Overrides" label and "Resolved Presets" list
