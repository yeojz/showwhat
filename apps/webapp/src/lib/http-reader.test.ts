import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Definitions } from "showwhat";
import type { Presets } from "showwhat";
import type { BundledSource, SplitSource } from "../store/source-store.js";

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

// Dynamic import AFTER mocks
const {
  BundledSourceHttpReader,
  SplitSourceHttpReader,
  createHttpReader,
  isAllowedUrl,
  formatFetchError,
} = await import("./http-reader.js");

const sampleDefs: Definitions = {
  "feature-a": { variations: [{ value: true }] },
};

const samplePresets: Presets = {
  tier: { type: "string", key: "tier" },
};

function createBundledSource(overrides?: Partial<BundledSource>): BundledSource {
  return {
    id: "src-1",
    mode: "bundled",
    label: "Production",
    format: "yaml",
    url: "https://r2.example.com/flags.yaml",
    ...overrides,
  };
}

function createSplitSource(overrides?: Partial<SplitSource>): SplitSource {
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

beforeEach(() => {
  mockParseYaml.mockReset();
  mockParseObject.mockReset();
  mockDefinitionSafeParse.mockReset();
  mockPresetsSafeParse.mockReset();
  // Default: no presets found
  mockPresetsSafeParse.mockReturnValue({ success: false });
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isAllowedUrl", () => {
  it("allows HTTPS URLs", () => {
    expect(isAllowedUrl("https://example.com/file.yaml")).toBe(true);
  });

  it("allows localhost HTTP URLs", () => {
    expect(isAllowedUrl("http://localhost:3000/flags.yaml")).toBe(true);
    expect(isAllowedUrl("http://127.0.0.1:8080/flags.yaml")).toBe(true);
  });

  it("rejects plain HTTP URLs", () => {
    expect(isAllowedUrl("http://evil.com/flags.yaml")).toBe(false);
  });

  it("rejects invalid URL strings", () => {
    expect(isAllowedUrl("not-a-url")).toBe(false);
    expect(isAllowedUrl("")).toBe(false);
  });

  it("rejects FTP URLs", () => {
    expect(isAllowedUrl("ftp://example.com/file")).toBe(false);
  });
});

describe("formatFetchError", () => {
  it("detects CORS errors (TypeError with 'Failed to fetch')", () => {
    const err = new TypeError("Failed to fetch");
    expect(formatFetchError(err)).toContain("CORS");
  });

  it("returns error message for regular errors", () => {
    const err = new Error("HTTP 403: Forbidden");
    expect(formatFetchError(err)).toBe("HTTP 403: Forbidden");
  });

  it("returns generic message for non-Error throws", () => {
    expect(formatFetchError("string error")).toBe("Failed to fetch source");
    expect(formatFetchError(42)).toBe("Failed to fetch source");
  });

  it("returns generic message for TypeError with different message", () => {
    const err = new TypeError("Network request failed");
    expect(formatFetchError(err)).toBe("Network request failed");
  });
});

describe("createHttpReader", () => {
  it("returns BundledSourceHttpReader for bundled mode", () => {
    const reader = createHttpReader(createBundledSource());
    expect(reader).toBeInstanceOf(BundledSourceHttpReader);
  });

  it("returns SplitSourceHttpReader for split mode", () => {
    const reader = createHttpReader(createSplitSource());
    expect(reader).toBeInstanceOf(SplitSourceHttpReader);
  });
});

describe("BundledSourceHttpReader", () => {
  describe("fetchSource", () => {
    it("fetches and parses a YAML source", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs, presets: samplePresets });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const result = await reader.fetchSource();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://r2.example.com/flags.yaml",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockParseYaml).toHaveBeenCalledWith("yaml content");
      expect(result).toEqual({
        definitions: sampleDefs,
        presets: samplePresets,
        keys: ["feature-a"],
      });
    });

    it("fetches and parses a JSON source", async () => {
      const jsonContent = JSON.stringify({ definitions: sampleDefs });
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(jsonContent),
      });
      mockParseObject.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(
        createBundledSource({ format: "json", url: "https://r2.example.com/flags.json" }),
      );
      const result = await reader.fetchSource();

      expect(mockParseObject).toHaveBeenCalled();
      expect(result).toEqual({
        definitions: sampleDefs,
        keys: ["feature-a"],
      });
    });

    it("includes custom headers in fetch", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(
        createBundledSource({ headers: { Authorization: "Bearer token" } }),
      );
      await reader.fetchSource();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
      );
    });

    it("filters dangerous keys from definitions", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({
        definitions: {
          "good-key": { variations: [{ value: true }] },
          __proto__: { variations: [{ value: "bad" }] },
          constructor: { variations: [{ value: "bad" }] },
        },
      });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const result = await reader.fetchSource();

      expect(Object.keys(result.definitions)).toEqual(["good-key"]);
    });

    it("rejects non-HTTPS URLs", async () => {
      const reader = new BundledSourceHttpReader(
        createBundledSource({ url: "http://evil.com/flags.yaml" }),
      );
      await expect(reader.fetchSource()).rejects.toThrow("HTTPS");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects invalid URL strings", async () => {
      const reader = new BundledSourceHttpReader(createBundledSource({ url: "not-a-url" }));
      await expect(reader.fetchSource()).rejects.toThrow("HTTPS");
    });

    it("rejects responses exceeding size limit via text length", async () => {
      const largeText = "x".repeat(6 * 1024 * 1024);
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(largeText),
      });

      const reader = new BundledSourceHttpReader(createBundledSource());
      await expect(reader.fetchSource()).rejects.toThrow("too large");
    });

    it("rejects responses exceeding size limit via content-length", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "10000000" }),
        text: () => Promise.resolve(""),
      });

      const reader = new BundledSourceHttpReader(createBundledSource());
      await expect(reader.fetchSource()).rejects.toThrow("too large");
    });

    it("handles HTTP error responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        headers: new Headers(),
      });

      const reader = new BundledSourceHttpReader(createBundledSource());
      await expect(reader.fetchSource()).rejects.toThrow("403");
    });

    it("allows localhost HTTP for development", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(
        createBundledSource({ url: "http://localhost:3000/flags.yaml" }),
      );
      const result = await reader.fetchSource();

      expect(fetchMock).toHaveBeenCalled();
      expect(result.definitions).toEqual(sampleDefs);
    });
  });

  describe("getAll", () => {
    it("fetches and returns all definitions", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const defs = await reader.getAll();

      expect(defs).toEqual(sampleDefs);
    });
  });

  describe("get", () => {
    it("returns matching definition by key", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const def = await reader.get("feature-a");

      expect(def).toEqual(sampleDefs["feature-a"]);
    });

    it("returns null for missing key", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const def = await reader.get("nonexistent-key");

      expect(def).toBeNull();
    });
  });

  describe("listKeys", () => {
    it("returns array of definition keys", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const keys = await reader.listKeys();

      expect(keys).toEqual(["feature-a"]);
    });
  });

  describe("getPresets", () => {
    it("returns presets from file", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs, presets: samplePresets });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const presets = await reader.getPresets();

      expect(presets).toEqual(samplePresets);
    });

    it("returns empty object when file has no presets", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const presets = await reader.getPresets();

      expect(presets).toEqual({});
    });

    it("returns empty object when called with a key argument", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve("yaml content"),
      });
      mockParseYaml.mockResolvedValue({ definitions: sampleDefs, presets: samplePresets });

      const reader = new BundledSourceHttpReader(createBundledSource());
      const presets = await reader.getPresets("some-key");

      expect(presets).toEqual(samplePresets);
    });
  });
});

describe("SplitSourceHttpReader", () => {
  describe("fetchSource", () => {
    it("fetches definitions for configured keys", async () => {
      const defAResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      const defBResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: false }] })),
      };

      fetchMock.mockResolvedValueOnce(defAResponse).mockResolvedValueOnce(defBResponse);

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchSource();

      expect(Object.keys(result.definitions)).toContain("flag-a");
      expect(Object.keys(result.definitions)).toContain("flag-b");
      expect(result.keys).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://r2.example.com/defs/flag-a",
        expect.any(Object),
      );
    });

    it("throws when no definition keys are configured", async () => {
      const reader = new SplitSourceHttpReader(createSplitSource({ definitionKeys: [] }));
      await expect(reader.fetchSource()).rejects.toThrow("No definition keys configured");
    });

    it("reports schema validation failures per key", async () => {
      const defAResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      const defBResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ invalid: true })),
      };

      fetchMock.mockResolvedValueOnce(defAResponse).mockResolvedValueOnce(defBResponse);

      mockDefinitionSafeParse
        .mockReturnValueOnce({ success: true, data: { variations: [{ value: true }] } })
        .mockReturnValueOnce({
          success: false,
          error: { issues: [{ message: "Required" }] },
        });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchSource();

      expect(result.keys).toEqual(["flag-a"]);
      expect(result.failedKeys).toContain("flag-b");
    });

    it("handles partial failures", async () => {
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

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchSource();

      expect(result.keys).toEqual(["flag-a"]);
      expect(result.failedKeys).toHaveLength(1);
    });

    it("handles non-Error rejection gracefully", async () => {
      const defAResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };

      fetchMock.mockResolvedValueOnce(defAResponse).mockRejectedValueOnce("non-error rejection");

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchSource();

      expect(result.keys).toEqual(["flag-a"]);
    });

    it("throws when all definition fetches fail", async () => {
      fetchMock.mockRejectedValue(new Error("HTTP 500"));

      const reader = new SplitSourceHttpReader(createSplitSource({ definitionKeys: ["flag-a"] }));
      await expect(reader.fetchSource()).rejects.toThrow("All definition fetches failed");
    });

    it("fetches presets when presetsUrl is configured", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      const presetsResponse = {
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ presets: { tier: { type: "string", key: "tier" } } })),
      };

      fetchMock.mockResolvedValueOnce(defResponse).mockResolvedValueOnce(presetsResponse);

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));
      mockPresetsSafeParse.mockReturnValue({
        success: true,
        data: { tier: { type: "string", key: "tier" } },
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({
          definitionKeys: ["flag-a"],
          presetsUrl: "https://r2.example.com/presets.json",
        }),
      );
      const result = await reader.fetchSource();

      expect(result.presets).toEqual({ tier: { type: "string", key: "tier" } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns no presets when presetsUrl is not configured", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };

      fetchMock.mockResolvedValueOnce(defResponse);
      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));

      const reader = new SplitSourceHttpReader(createSplitSource({ definitionKeys: ["flag-a"] }));
      const result = await reader.fetchSource();

      expect(result.presets).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("ignores invalid presets response gracefully", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      const badPresetsResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify("not a presets object")),
      };

      fetchMock.mockResolvedValueOnce(defResponse).mockResolvedValueOnce(badPresetsResponse);

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));
      mockPresetsSafeParse.mockReturnValue({ success: false });

      const reader = new SplitSourceHttpReader(
        createSplitSource({
          definitionKeys: ["flag-a"],
          presetsUrl: "https://r2.example.com/presets.json",
        }),
      );
      const result = await reader.fetchSource();

      expect(result.keys).toEqual(["flag-a"]);
      expect(result.presets).toBeUndefined();
    });

    it("collects definitionPresets embedded in individual definition files", async () => {
      const defAResponse = {
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              variations: [{ value: true }],
              presets: { tier: { type: "string", key: "tier" } },
            }),
          ),
      };
      const defBResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: false }] })),
      };

      fetchMock.mockResolvedValueOnce(defAResponse).mockResolvedValueOnce(defBResponse);

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));
      mockPresetsSafeParse
        .mockReturnValueOnce({ success: true, data: { tier: { type: "string", key: "tier" } } })
        .mockReturnValue({ success: false });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchSource();

      expect(result.definitionPresets).toEqual({
        "flag-a": { tier: { type: "string", key: "tier" } },
      });
    });

    it("tracks definitionPresets per key from multiple definition files", async () => {
      const makeDefResponse = (presets: unknown) => ({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }], presets })),
      });

      fetchMock
        .mockResolvedValueOnce(makeDefResponse({ tier: { type: "string", key: "tier" } }))
        .mockResolvedValueOnce(makeDefResponse({ env: { type: "string", key: "env" } }));

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({ success: true, data: raw }));
      mockPresetsSafeParse
        .mockReturnValueOnce({ success: true, data: { tier: { type: "string", key: "tier" } } })
        .mockReturnValueOnce({ success: true, data: { env: { type: "string", key: "env" } } });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchSource();

      expect(result.definitionPresets).toEqual({
        "flag-a": { tier: { type: "string", key: "tier" } },
        "flag-b": { env: { type: "string", key: "env" } },
      });
    });

    it("omits definitionPresets when no definition files contain presets", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };

      fetchMock.mockResolvedValueOnce(defResponse);
      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({ success: true, data: raw }));
      mockPresetsSafeParse.mockReturnValue({ success: false });

      const reader = new SplitSourceHttpReader(createSplitSource({ definitionKeys: ["flag-a"] }));
      const result = await reader.fetchSource();

      expect(result.definitionPresets).toBeUndefined();
    });

    it("filters dangerous keys from definitionKeys", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };

      fetchMock.mockResolvedValueOnce(defResponse);

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));

      const reader = new SplitSourceHttpReader(
        createSplitSource({
          definitionKeys: ["good-key", "__proto__", "constructor"],
        }),
      );
      const result = await reader.fetchSource();

      expect(result.keys).toEqual(["good-key"]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("parses YAML format in split mode", async () => {
      const defResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };

      fetchMock.mockResolvedValueOnce(defResponse);

      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({
        success: true,
        data: raw,
      }));

      const reader = new SplitSourceHttpReader(
        createSplitSource({ format: "yaml", definitionKeys: ["flag-a"] }),
      );
      const result = await reader.fetchSource();

      expect(result.keys).toEqual(["flag-a"]);
    });
  });

  describe("get", () => {
    it("fetches and returns a single definition by key", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      });
      mockDefinitionSafeParse.mockReturnValue({
        success: true,
        data: { variations: [{ value: true }] },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const def = await reader.get("flag-a");

      expect(def).toEqual({ variations: [{ value: true }] });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://r2.example.com/defs/flag-a",
        expect.any(Object),
      );
    });

    it("URL-encodes the key when fetching", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      });
      mockDefinitionSafeParse.mockReturnValue({
        success: true,
        data: { variations: [{ value: true }] },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      await reader.get("flag a/special");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://r2.example.com/defs/flag%20a%2Fspecial",
        expect.any(Object),
      );
    });

    it("throws when definition schema validation fails", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ invalid: true })),
      });
      mockDefinitionSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: "Required" }] },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      await expect(reader.get("flag-a")).rejects.toThrow('Invalid definition for "flag-a"');
    });
  });

  describe("getAll", () => {
    it("fans out to all definition keys", async () => {
      const defAResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      };
      const defBResponse = {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: false }] })),
      };

      fetchMock.mockResolvedValueOnce(defAResponse).mockResolvedValueOnce(defBResponse);
      mockDefinitionSafeParse.mockImplementation((raw: unknown) => ({ success: true, data: raw }));

      const reader = new SplitSourceHttpReader(createSplitSource());
      const defs = await reader.getAll();

      expect(Object.keys(defs)).toContain("flag-a");
      expect(Object.keys(defs)).toContain("flag-b");
    });

    it("throws when all keys fail", async () => {
      fetchMock.mockRejectedValue(new Error("HTTP 500"));

      const reader = new SplitSourceHttpReader(createSplitSource({ definitionKeys: ["flag-a"] }));
      await expect(reader.getAll()).rejects.toThrow("All definition fetches failed");
    });

    it("throws when no definition keys are configured", async () => {
      const reader = new SplitSourceHttpReader(createSplitSource({ definitionKeys: [] }));
      await expect(reader.getAll()).rejects.toThrow("No definition keys configured");
    });
  });

  describe("listKeys", () => {
    it("returns static definitionKeys when no listUrl is configured", async () => {
      const reader = new SplitSourceHttpReader(createSplitSource());
      const keys = await reader.listKeys();

      expect(keys).toEqual(["flag-a", "flag-b"]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fetches and parses key list from listUrl", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ definitionKeys: ["flag-a", "flag-b"] })),
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ listUrl: "https://r2.example.com/keys.json" }),
      );
      const keys = await reader.listKeys();

      expect(keys).toEqual(["flag-a", "flag-b"]);
    });

    it("throws when list response is not an object", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(["flag-a", "flag-b"])),
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ listUrl: "https://r2.example.com/keys.json" }),
      );
      await expect(reader.listKeys()).rejects.toThrow("definitionKeys");
    });

    it("throws when list response lacks definitionKeys array", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ not: "right format" })),
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ listUrl: "https://r2.example.com/keys.json" }),
      );
      await expect(reader.listKeys()).rejects.toThrow("definitionKeys");
    });

    it("filters dangerous keys from list response", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(
            JSON.stringify({ definitionKeys: ["good-key", "__proto__", "constructor"] }),
          ),
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ listUrl: "https://r2.example.com/keys.json" }),
      );
      const keys = await reader.listKeys();

      expect(keys).toEqual(["good-key"]);
    });
  });

  describe("getPresets", () => {
    it("returns empty object when no presetsUrl is configured", async () => {
      const reader = new SplitSourceHttpReader(createSplitSource());
      const presets = await reader.getPresets();

      expect(presets).toEqual({});
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fetches presets from presetsUrl", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ presets: { tier: { type: "string", key: "tier" } } })),
      });
      mockPresetsSafeParse.mockReturnValue({
        success: true,
        data: { tier: { type: "string", key: "tier" } },
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ presetsUrl: "https://r2.example.com/presets.json" }),
      );
      const presets = await reader.getPresets();

      expect(presets).toEqual({ tier: { type: "string", key: "tier" } });
    });

    it("returns empty object when presetsUrl returns no presets field", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ something: "else" })),
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ presetsUrl: "https://r2.example.com/presets.json" }),
      );
      const presets = await reader.getPresets();

      expect(presets).toEqual({});
    });

    it("returns same presets with or without key argument", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ presets: { tier: { type: "string", key: "tier" } } })),
      });
      mockPresetsSafeParse.mockReturnValue({
        success: true,
        data: { tier: { type: "string", key: "tier" } },
      });

      const reader = new SplitSourceHttpReader(
        createSplitSource({ presetsUrl: "https://r2.example.com/presets.json" }),
      );
      const presetsWithKey = await reader.getPresets("some-key");

      expect(presetsWithKey).toEqual({ tier: { type: "string", key: "tier" } });
    });
  });

  describe("fetchDefinitionKey", () => {
    it("fetches a single definition key with embedded presets", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              variations: [{ value: true }],
              presets: { tier: { type: "string", key: "tier" } },
            }),
          ),
      });
      mockDefinitionSafeParse.mockReturnValue({
        success: true,
        data: { variations: [{ value: true }] },
      });
      mockPresetsSafeParse.mockReturnValue({
        success: true,
        data: { tier: { type: "string", key: "tier" } },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchDefinitionKey("flag-a");

      expect(result.definition).toEqual({ variations: [{ value: true }] });
      expect(result.filePresets).toEqual({ tier: { type: "string", key: "tier" } });
    });

    it("returns undefined filePresets when no presets embedded", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ variations: [{ value: true }] })),
      });
      mockDefinitionSafeParse.mockReturnValue({
        success: true,
        data: { variations: [{ value: true }] },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchDefinitionKey("flag-a");

      expect(result.filePresets).toBeUndefined();
    });
  });

  describe("fetchPresets", () => {
    it("delegates to fetchPresetsFromUrl and returns presets", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ presets: { tier: { type: "string", key: "tier" } } })),
      });
      mockPresetsSafeParse.mockReturnValue({
        success: true,
        data: { tier: { type: "string", key: "tier" } },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const presets = await reader.fetchPresets("https://r2.example.com/presets.json", "json");

      expect(presets).toEqual({ tier: { type: "string", key: "tier" } });
    });

    it("returns undefined for invalid response", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify("not-an-object")),
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const presets = await reader.fetchPresets("https://r2.example.com/presets.json", "json");

      expect(presets).toBeUndefined();
    });

    it("returns undefined when presetsData fails PresetsSchema validation", async () => {
      // presetsData exists but PresetsSchema.safeParse returns false
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ presets: "invalid-presets" })),
      });
      mockPresetsSafeParse.mockReturnValue({ success: false });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const presets = await reader.fetchPresets("https://r2.example.com/presets.json", "json");

      expect(presets).toBeUndefined();
    });
  });

  describe("fetchDefinitionKey - non-object raw", () => {
    it("skips preset extraction when raw is an array (non-object)", async () => {
      // raw is an array — the `if (typeof raw === "object" && !Array.isArray(raw))` branch is false
      fetchMock.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ variations: [{ value: true }] }])),
      });
      mockDefinitionSafeParse.mockReturnValue({
        success: true,
        data: { variations: [{ value: true }] },
      });

      const reader = new SplitSourceHttpReader(createSplitSource());
      const result = await reader.fetchDefinitionKey("flag-a");

      expect(result.filePresets).toBeUndefined();
      expect(mockPresetsSafeParse).not.toHaveBeenCalled();
    });
  });
});
