import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Definitions } from "showwhat";
import type { Presets } from "showwhat";

// Mock stripAutoIds to return input unchanged
vi.mock("@showwhat/configurator", () => ({
  stripAutoIds: (defs: Definitions) => defs,
}));

// Mock js-yaml
vi.mock("js-yaml", () => ({
  default: {
    dump: vi.fn((obj: unknown) => `yaml:${JSON.stringify(obj)}`),
  },
}));

const { useFileExport } = await import("./useFileExport.js");

describe("useFileExport", () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let clickedLink: { href: string; download: string } | null;
  let createdBlobs: Blob[];

  beforeEach(() => {
    clickedLink = null;
    createdBlobs = [];
    mockCreateObjectURL = vi.fn(() => "blob:test-url");
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const link = {
          href: "",
          download: "",
          click: vi.fn(function (this: { href: string; download: string }) {
            clickedLink = { href: this.href, download: this.download };
          }),
        };
        return link as unknown as HTMLElement;
      }
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag) as HTMLElement;
    });

    // Capture blobs passed to createObjectURL
    mockCreateObjectURL.mockImplementation((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:test-url";
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleDefs: Definitions = {
    "feature-a": { variations: [{ value: true }] },
  };

  const samplePresets: Presets = {
    tier: { type: "string", key: "tier" },
  };

  it("exportYaml wraps definitions in nested format and uses default filename", () => {
    const { result } = renderHook(() => useFileExport());

    result.current.exportYaml(sampleDefs);

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(clickedLink).not.toBeNull();
    expect(clickedLink!.download).toBe("flags.yaml");
  });

  it("exportYaml uses custom filename when provided", () => {
    const { result } = renderHook(() => useFileExport());

    result.current.exportYaml(sampleDefs, undefined, "custom.yaml");

    expect(clickedLink!.download).toBe("custom.yaml");
  });

  it("exportYaml includes presets when non-empty", async () => {
    const yaml = await import("js-yaml");
    const { result } = renderHook(() => useFileExport());

    result.current.exportYaml(sampleDefs, samplePresets);

    expect(yaml.default.dump).toHaveBeenCalledWith(
      { definitions: sampleDefs, presets: samplePresets },
      expect.objectContaining({ indent: 2 }),
    );
  });

  it("exportYaml omits presets when empty", async () => {
    const yaml = await import("js-yaml");
    const { result } = renderHook(() => useFileExport());

    result.current.exportYaml(sampleDefs, {});

    expect(yaml.default.dump).toHaveBeenCalledWith(
      { definitions: sampleDefs },
      expect.objectContaining({ indent: 2 }),
    );
  });

  it("exportJson wraps definitions in nested format and uses default filename", () => {
    const { result } = renderHook(() => useFileExport());

    result.current.exportJson(sampleDefs);

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(clickedLink).not.toBeNull();
    expect(clickedLink!.download).toBe("flags.json");
  });

  it("exportJson uses custom filename when provided", () => {
    const { result } = renderHook(() => useFileExport());

    result.current.exportJson(sampleDefs, undefined, "custom.json");

    expect(clickedLink!.download).toBe("custom.json");
  });

  it("exportJson includes presets when non-empty", async () => {
    const { result } = renderHook(() => useFileExport());

    result.current.exportJson(sampleDefs, samplePresets);

    const blobContent = await createdBlobs[0].text();
    const parsed = JSON.parse(blobContent);
    expect(parsed).toEqual({ definitions: sampleDefs, presets: samplePresets });
  });

  it("exportJson omits presets when empty", async () => {
    const { result } = renderHook(() => useFileExport());

    result.current.exportJson(sampleDefs, {});

    const blobContent = await createdBlobs[0].text();
    const parsed = JSON.parse(blobContent);
    expect(parsed).toEqual({ definitions: sampleDefs });
    expect(parsed).not.toHaveProperty("presets");
  });

  it("revokes object URL after export", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFileExport());

    result.current.exportYaml(sampleDefs);
    vi.advanceTimersByTime(100);

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    vi.useRealTimers();
  });

  it("exportDefinitionYaml exports a single definition as YAML", async () => {
    const yaml = await import("js-yaml");
    const { result } = renderHook(() => useFileExport());
    const def = { variations: [{ value: true }] };

    result.current.exportDefinitionYaml("feature-a", def);

    expect(yaml.default.dump).toHaveBeenCalledWith(def, expect.objectContaining({ indent: 2 }));
    expect(clickedLink).not.toBeNull();
    expect(clickedLink!.download).toBe("feature-a.yaml");
  });

  it("exportDefinitionJson exports a single definition as JSON", async () => {
    const { result } = renderHook(() => useFileExport());
    const def = { variations: [{ value: "hello" }] };

    result.current.exportDefinitionJson("feature-b", def);

    expect(clickedLink).not.toBeNull();
    expect(clickedLink!.download).toBe("feature-b.json");
    const blobContent = await createdBlobs[0].text();
    const parsed = JSON.parse(blobContent);
    expect(parsed).toEqual(def);
  });
});
