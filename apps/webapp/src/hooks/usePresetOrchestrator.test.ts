import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Definition, Presets } from "showwhat";
import type { SplitSource } from "../store/source-store.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMergePresets = vi.fn(async () => ({}));
const mockCreatePresetUI = vi.fn(() => ({ extraConditionTypes: [], editorOverrides: new Map() }));
const mockReloadDefinitionKey = vi.fn();

vi.mock("showwhat", () => ({
  mergePresets: (...args: unknown[]) =>
    mockMergePresets(...(args as Parameters<typeof mockMergePresets>)),
}));

vi.mock("@showwhat/configurator", () => ({
  createPresetUI: (...args: unknown[]) =>
    mockCreatePresetUI(...(args as Parameters<typeof mockCreatePresetUI>)),
}));

vi.mock("./useSourceFetch.js", () => ({
  useSourceFetch: () => ({
    fetchSource: vi.fn(),
    reloadKeyList: vi.fn(),
    reloadDefinitionKey: mockReloadDefinitionKey,
    loading: false,
    error: null,
  }),
}));

// Mutable state objects for store mocks
const mockUpsertDefinition = vi.fn();
const mockSetPresetReader = vi.fn();
const mockMarkFetched = vi.fn();
const mockSetSourcePresets = vi.fn();
const mockUpsertKeyFilePresets = vi.fn();
const mockClearSourcePresets = vi.fn();

let definitionStoreOverrides: Record<string, unknown> = {};
const defaultDefinitionState: Record<string, unknown> = {
  definitions: {},
  filePresets: {},
  presetReader: null,
  setPresetReader: mockSetPresetReader,
  upsertDefinition: mockUpsertDefinition,
};

vi.mock("../store/definition-store.js", () => {
  const useDefinitionStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector({ ...defaultDefinitionState, ...definitionStoreOverrides });
  };
  return { useDefinitionStore };
});

let presetStoreOverrides: Record<string, unknown> = {};
const defaultPresetState: Record<string, unknown> = {
  presets: {},
  sourcePresets: {},
  keyFilePresets: {},
  sourcePresetsLastFetched: undefined,
  setSourcePresets: mockSetSourcePresets,
  upsertKeyFilePresets: mockUpsertKeyFilePresets,
  clearSourcePresets: mockClearSourcePresets,
};

vi.mock("../store/preset-store.js", () => {
  const usePresetStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector({ ...defaultPresetState, ...presetStoreOverrides });
  };
  return { usePresetStore };
});

let sourceStoreOverrides: Record<string, unknown> = {};
const defaultSourceState: Record<string, unknown> = {
  activeSourceId: null,
  sources: [],
  markFetched: mockMarkFetched,
};

vi.mock("../store/source-store.js", () => {
  const useSourceStore = (selector: (s: Record<string, unknown>) => unknown) => {
    return selector({ ...defaultSourceState, ...sourceStoreOverrides });
  };
  return { useSourceStore };
});

const { usePresetOrchestrator } = await import("./usePresetOrchestrator.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSplitSource(overrides?: Partial<SplitSource>): SplitSource {
  return {
    id: "src-1",
    mode: "split",
    label: "Staging",
    format: "json",
    baseUrl: "https://r2.example.com/defs/",
    definitionKeys: ["flag-a", "flag-b"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: loadDefinitionKey
// ---------------------------------------------------------------------------

describe("usePresetOrchestrator", () => {
  beforeEach(() => {
    definitionStoreOverrides = {};
    presetStoreOverrides = {};
    sourceStoreOverrides = {};
    mockUpsertDefinition.mockReset();
    mockSetPresetReader.mockReset();
    mockMarkFetched.mockReset();
    mockSetSourcePresets.mockReset();
    mockUpsertKeyFilePresets.mockReset();
    mockClearSourcePresets.mockReset();
    mockReloadDefinitionKey.mockReset();
    mockMergePresets.mockReset();
    mockMergePresets.mockResolvedValue({});
    mockCreatePresetUI.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadDefinitionKey", () => {
    it("calls reloadDefinitionKey, upserts definition, marks fetched, stores file presets", async () => {
      const source = createSplitSource();
      const definition: Definition = { variations: [{ value: true }] };
      const filePresets: Presets = { tier: { type: "string", key: "tier" } };
      mockReloadDefinitionKey.mockResolvedValue({ definition, filePresets });

      const { result } = renderHook(() => usePresetOrchestrator());

      await act(async () => {
        await result.current.loadDefinitionKey(source, "flag-a");
      });

      expect(mockReloadDefinitionKey).toHaveBeenCalledWith(source, "flag-a");
      expect(mockUpsertDefinition).toHaveBeenCalledWith("flag-a", definition);
      expect(mockMarkFetched).toHaveBeenCalledWith("src-1", ["flag-a"]);
      expect(mockUpsertKeyFilePresets).toHaveBeenCalledWith("flag-a", filePresets);
      expect(result.current.loadingDefinition).toBe(false);
    });

    it("skips when skipIfLoaded=true and definition exists", async () => {
      const source = createSplitSource();
      definitionStoreOverrides = {
        definitions: { "flag-a": { variations: [{ value: false }] } },
      };

      const { result } = renderHook(() => usePresetOrchestrator());

      await act(async () => {
        await result.current.loadDefinitionKey(source, "flag-a", { skipIfLoaded: true });
      });

      expect(mockReloadDefinitionKey).not.toHaveBeenCalled();
    });

    it("does not skip when skipIfLoaded=true but definition doesn't exist", async () => {
      const source = createSplitSource();
      definitionStoreOverrides = { definitions: {} };
      const definition: Definition = { variations: [{ value: true }] };
      mockReloadDefinitionKey.mockResolvedValue({ definition });

      const { result } = renderHook(() => usePresetOrchestrator());

      await act(async () => {
        await result.current.loadDefinitionKey(source, "flag-a", { skipIfLoaded: true });
      });

      expect(mockReloadDefinitionKey).toHaveBeenCalledWith(source, "flag-a");
      expect(mockUpsertDefinition).toHaveBeenCalledWith("flag-a", definition);
    });

    it("does not upsert filePresets when they are undefined", async () => {
      const source = createSplitSource();
      const definition: Definition = { variations: [{ value: true }] };
      mockReloadDefinitionKey.mockResolvedValue({ definition, filePresets: undefined });

      const { result } = renderHook(() => usePresetOrchestrator());

      await act(async () => {
        await result.current.loadDefinitionKey(source, "flag-a");
      });

      expect(mockUpsertDefinition).toHaveBeenCalledWith("flag-a", definition);
      expect(mockUpsertKeyFilePresets).not.toHaveBeenCalled();
    });

    it("does not upsert filePresets when they are empty", async () => {
      const source = createSplitSource();
      const definition: Definition = { variations: [{ value: true }] };
      mockReloadDefinitionKey.mockResolvedValue({ definition, filePresets: {} });

      const { result } = renderHook(() => usePresetOrchestrator());

      await act(async () => {
        await result.current.loadDefinitionKey(source, "flag-a");
      });

      expect(mockUpsertDefinition).toHaveBeenCalledWith("flag-a", definition);
      expect(mockUpsertKeyFilePresets).not.toHaveBeenCalled();
    });

    it("does nothing when reloadDefinitionKey returns null", async () => {
      const source = createSplitSource();
      mockReloadDefinitionKey.mockResolvedValue(null);

      const { result } = renderHook(() => usePresetOrchestrator());

      await act(async () => {
        await result.current.loadDefinitionKey(source, "flag-a");
      });

      expect(mockReloadDefinitionKey).toHaveBeenCalledWith(source, "flag-a");
      expect(mockUpsertDefinition).not.toHaveBeenCalled();
      expect(mockMarkFetched).not.toHaveBeenCalled();
      expect(mockUpsertKeyFilePresets).not.toHaveBeenCalled();
    });

    it("ignores stale responses via sequence counter (two rapid calls for same key)", async () => {
      const source = createSplitSource();
      const staleDefinition: Definition = { variations: [{ value: "stale" }] };
      const freshDefinition: Definition = { variations: [{ value: "fresh" }] };

      // First call resolves slowly, second call resolves immediately
      let resolveFirst!: (value: { definition: Definition; filePresets?: Presets } | null) => void;
      const firstPromise = new Promise<{ definition: Definition; filePresets?: Presets } | null>(
        (resolve) => {
          resolveFirst = resolve;
        },
      );

      mockReloadDefinitionKey
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValueOnce({ definition: freshDefinition });

      const { result } = renderHook(() => usePresetOrchestrator());

      // Fire both calls rapidly — don't await the first
      let firstDone = false;
      let secondDone = false;

      await act(async () => {
        const p1 = result.current.loadDefinitionKey(source, "flag-a").then(() => {
          firstDone = true;
        });
        const p2 = result.current.loadDefinitionKey(source, "flag-a").then(() => {
          secondDone = true;
        });

        // Second call resolves immediately (mockResolvedValueOnce)
        // Now resolve the first (stale) call
        resolveFirst({ definition: staleDefinition });

        await Promise.all([p1, p2]);
      });

      expect(firstDone).toBe(true);
      expect(secondDone).toBe(true);

      // Only the fresh definition should have been upserted
      // The stale first call should have been discarded
      expect(mockUpsertDefinition).toHaveBeenCalledTimes(1);
      expect(mockUpsertDefinition).toHaveBeenCalledWith("flag-a", freshDefinition);
    });
  });
});
