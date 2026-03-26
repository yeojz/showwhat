import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Definitions } from "showwhat";
import type { Presets } from "showwhat";

const mockParseYaml = vi.fn();
const mockParseObject = vi.fn();

vi.mock("showwhat", () => ({
  parseYaml: (...args: unknown[]) => mockParseYaml(...args),
  parseObject: (...args: unknown[]) => mockParseObject(...args),
}));

const { useFileImport } = await import("./useFileImport.js");

function createMockFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

const sampleDefs: Definitions = {
  "feature-a": { variations: [{ value: true }] },
};

const samplePresets: Presets = {
  tier: { type: "string", key: "tier" },
};

describe("useFileImport", () => {
  beforeEach(() => {
    mockParseYaml.mockReset();
    mockParseObject.mockReset();
  });

  it("imports a YAML file successfully", async () => {
    mockParseYaml.mockResolvedValue({ definitions: sampleDefs });
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(createMockFile("flags.yaml", "yaml content"));
    });

    expect(mockParseYaml).toHaveBeenCalledWith("yaml content");
    expect(importResult).toEqual({
      definitions: sampleDefs,
      presets: undefined,
      fileName: "flags.yaml",
      format: "yaml",
    });
    expect(result.current.error).toBeNull();
  });

  it("imports a JSON file successfully", async () => {
    mockParseObject.mockResolvedValue({ definitions: sampleDefs });
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(
        createMockFile("flags.json", JSON.stringify({ definitions: sampleDefs })),
      );
    });

    expect(mockParseObject).toHaveBeenCalled();
    expect(importResult).toEqual({
      definitions: sampleDefs,
      presets: undefined,
      fileName: "flags.json",
      format: "json",
    });
    expect(result.current.error).toBeNull();
  });

  it("treats .yml files as yaml format", async () => {
    mockParseYaml.mockResolvedValue({ definitions: sampleDefs });
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(createMockFile("flags.yml", "yaml content"));
    });

    expect(mockParseYaml).toHaveBeenCalled();
    expect(importResult).toEqual({
      definitions: sampleDefs,
      presets: undefined,
      fileName: "flags.yml",
      format: "yaml",
    });
  });

  it("extracts presets from YAML file when present", async () => {
    mockParseYaml.mockResolvedValue({ definitions: sampleDefs, presets: samplePresets });
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(createMockFile("flags.yaml", "yaml content"));
    });

    expect(importResult).toEqual({
      definitions: sampleDefs,
      presets: samplePresets,
      fileName: "flags.yaml",
      format: "yaml",
    });
  });

  it("extracts presets from JSON file when present", async () => {
    mockParseObject.mockResolvedValue({ definitions: sampleDefs, presets: samplePresets });
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(
        createMockFile(
          "flags.json",
          JSON.stringify({ definitions: sampleDefs, presets: samplePresets }),
        ),
      );
    });

    expect(importResult).toEqual({
      definitions: sampleDefs,
      presets: samplePresets,
      fileName: "flags.json",
      format: "json",
    });
  });

  it("returns null and sets error on parse failure with Error", async () => {
    mockParseYaml.mockRejectedValue(new Error("Invalid YAML"));
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(createMockFile("bad.yaml", "invalid"));
    });

    expect(importResult).toBeNull();
    expect(result.current.error).toEqual({ message: "Invalid YAML" });
  });

  it("returns null and sets generic error on non-Error throw", async () => {
    mockParseYaml.mockRejectedValue("something unexpected");
    const { result } = renderHook(() => useFileImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFile(createMockFile("bad.yaml", "invalid"));
    });

    expect(importResult).toBeNull();
    expect(result.current.error).toEqual({ message: "Failed to import file" });
  });

  it("clears previous error on successful import", async () => {
    mockParseYaml.mockRejectedValueOnce(new Error("First error"));
    const { result } = renderHook(() => useFileImport());

    await act(async () => {
      await result.current.importFile(createMockFile("bad.yaml", "invalid"));
    });
    expect(result.current.error).not.toBeNull();

    mockParseYaml.mockResolvedValueOnce({ definitions: sampleDefs });
    await act(async () => {
      await result.current.importFile(createMockFile("good.yaml", "valid"));
    });
    expect(result.current.error).toBeNull();
  });
});
