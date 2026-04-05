import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Definitions, Presets } from "showwhat";
import type { HostedSource } from "../store/source-store.js";

const mockParseYaml = vi.fn();
const mockParseObject = vi.fn();
const mockDefinitionSafeParse = vi.fn();
const mockPresetsSafeParse = vi.fn();

vi.mock("showwhat", () => ({
  parseYaml: (...args: unknown[]) => mockParseYaml(...args),
  parseObject: (...args: unknown[]) => mockParseObject(...args),
  DefinitionSchema: {
    safeParse: (...args: unknown[]) => mockDefinitionSafeParse(...args),
  },
  PresetsSchema: {
    safeParse: (...args: unknown[]) => mockPresetsSafeParse(...args),
  },
}));

vi.mock("js-yaml", () => ({
  default: { load: (s: string) => JSON.parse(s) },
}));

const { useSourceFetch } = await import("./useSourceFetch.js");

const sampleDefs: Definitions = {
  "feature-a": { variations: [{ value: true }] },
};

const samplePresets: Presets = {
  tier: { type: "string", key: "tier" },
};

function createBundledSource(
  overrides?: Partial<Extract<HostedSource, { mode: "bundled" }>>,
): Extract<HostedSource, { mode: "bundled" }> {
  return {
    id: "src-1",
    mode: "bundled",
    label: "Production",
    format: "yaml",
    url: "https://r2.example.com/flags.yaml",
    ...overrides,
  };
}

function createSplitSource(
  overrides?: Partial<Extract<HostedSource, { mode: "split" }>>,
): Extract<HostedSource, { mode: "split" }> {
  return {
    id: "src-2",
    mode: "split",
    label: "Staging",
    format: "json",
    baseUrl: "https://r2.example.com/defs/",
    definitionKeys: ["flag-a", "flag-b"],
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

describe("useSourceFetch", () => {
  beforeEach(() => {
    mockParseYaml.mockReset();
    mockParseObject.mockReset();
    mockDefinitionSafeParse.mockReset();
    mockPresetsSafeParse.mockReset();
    mockPresetsSafeParse.mockReturnValue({ success: false });
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchSource", () => {
    it("returns result and clears loading/error on success (bundled)", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs, presets: samplePresets });

      const { result } = renderHook(() => useSourceFetch());
      let fetchResult: unknown;
      await act(async () => {
        fetchResult = await result.current.fetchSource(createBundledSource());
      });

      expect(fetchResult).toEqual({
        definitions: sampleDefs,
        presets: samplePresets,
        keys: ["feature-a"],
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sets error on failure and returns null", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

      const { result } = renderHook(() => useSourceFetch());
      let fetchResult: unknown;
      await act(async () => {
        fetchResult = await result.current.fetchSource(createBundledSource());
      });

      expect(fetchResult).toBeNull();
      expect(result.current.error?.message).toContain("CORS");
    });

    it("reports partial failures in split mode", async () => {
      const defAResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      fetchMock
        .mockResolvedValueOnce(defAResponse)
        .mockRejectedValueOnce(new Error("HTTP 404: Not Found"));

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));

      const { result } = renderHook(() => useSourceFetch());
      let fetchResult: Awaited<ReturnType<typeof result.current.fetchSource>>;
      await act(async () => {
        fetchResult = await result.current.fetchSource(createSplitSource());
      });

      expect(fetchResult).not.toBeNull();
      expect(fetchResult!.keys).toEqual(["flag-a"]);
      expect(result.current.error?.message).toContain("1 failed");
    });

    it("clears previous error on success", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
      });

      const { result } = renderHook(() => useSourceFetch());
      await act(async () => {
        await result.current.fetchSource(createBundledSource());
      });
      expect(result.current.error).not.toBeNull();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      await act(async () => {
        await result.current.fetchSource(createBundledSource());
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("reloadKeyList", () => {
    it("returns keys on success", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ definitionKeys: ["flag-a", "flag-b"] })),
      });

      const { result } = renderHook(() => useSourceFetch());
      let keys: string[] | null = null;
      await act(async () => {
        keys = await result.current.reloadKeyList(
          createSplitSource({ listUrl: "https://r2.example.com/keys.json" }),
        );
      });

      expect(keys).toEqual(["flag-a", "flag-b"]);
      expect(result.current.error).toBeNull();
    });

    it("returns static keys when no listUrl", async () => {
      const { result } = renderHook(() => useSourceFetch());
      let keys: string[] | null = null;
      await act(async () => {
        keys = await result.current.reloadKeyList(createSplitSource({ listUrl: undefined }));
      });

      expect(keys).toEqual(["flag-a", "flag-b"]);
    });

    it("sets error and returns null on failure", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ not: "right format" })),
      });

      const { result } = renderHook(() => useSourceFetch());
      let keys: string[] | null = null;
      await act(async () => {
        keys = await result.current.reloadKeyList(
          createSplitSource({ listUrl: "https://r2.example.com/keys.json" }),
        );
      });

      expect(keys).toBeNull();
      expect(result.current.error?.message).toContain("definitionKeys");
    });
  });

  describe("reloadDefinitionKey", () => {
    it("returns definition on success", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      fetchMock.mockResolvedValueOnce(defResponse);
      mockDefinitionSafeParse.mockReturnValue({
        success: true,
        data: { variations: [{ value: true }] },
      });

      const { result } = renderHook(() => useSourceFetch());
      let fetched: unknown;
      await act(async () => {
        fetched = await result.current.reloadDefinitionKey(createSplitSource(), "flag-a");
      });

      expect(fetched).toEqual({ definition: { variations: [{ value: true }] } });
    });

    it("sets error and returns null on failure", async () => {
      fetchMock.mockRejectedValueOnce(new Error("HTTP 500"));

      const { result } = renderHook(() => useSourceFetch());
      let fetched: unknown;
      await act(async () => {
        fetched = await result.current.reloadDefinitionKey(createSplitSource(), "flag-a");
      });

      expect(fetched).toBeNull();
      expect(result.current.error?.message).toContain("500");
    });
  });

  describe("reloadPresets", () => {
    it("returns presets on success", async () => {
      const presetsResponse = {
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ presets: { tier: { type: "string", key: "tier" } } })),
      };
      fetchMock.mockResolvedValueOnce(presetsResponse);
      mockPresetsSafeParse.mockReturnValue({
        success: true,
        data: { tier: { type: "string", key: "tier" } },
      });

      const { result } = renderHook(() => useSourceFetch());
      let presets: Presets | null = null;
      await act(async () => {
        presets = await result.current.reloadPresets("https://r2.example.com/presets.json", "json");
      });

      expect(presets).toEqual({ tier: { type: "string", key: "tier" } });
    });

    it("returns null when fetchPresets returns undefined", async () => {
      const presetsResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({})),
      };
      fetchMock.mockResolvedValueOnce(presetsResponse);
      mockPresetsSafeParse.mockReturnValue({ success: false });

      const { result } = renderHook(() => useSourceFetch());
      let presets: Presets | null = null;
      await act(async () => {
        presets = await result.current.reloadPresets("https://r2.example.com/presets.json", "json");
      });

      expect(presets).toBeNull();
    });

    it("sets error and returns null on failure", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const { result } = renderHook(() => useSourceFetch());
      let presets: Presets | null = null;
      await act(async () => {
        presets = await result.current.reloadPresets("https://r2.example.com/presets.json", "json");
      });

      expect(presets).toBeNull();
      expect(result.current.error?.message).toContain("CORS");
    });
  });
});
