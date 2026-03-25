import { describe, it, expect } from "vitest";
import { isWritable, MemoryData } from "./data.js";
import type { DefinitionReader, DefinitionData } from "./data.js";
import type { Definitions } from "./schemas/index.js";
import { ValidationError } from "./errors.js";

describe("isWritable", () => {
  it("returns false for a reader-only adapter", () => {
    const reader: DefinitionReader = {
      async get() {
        return null;
      },
      async getAll(): Promise<Definitions> {
        return {};
      },
    };
    expect(isWritable(reader)).toBe(false);
  });

  it("returns false when delete is missing", () => {
    const partial = {
      async get() {
        return null;
      },
      async getAll(): Promise<Definitions> {
        return {};
      },
      async put() {},
      async putMany() {},
      async listKeys() {
        return [];
      },
    };
    expect(isWritable(partial)).toBe(false);
  });

  it("returns true for a full DefinitionData adapter", () => {
    const storage: DefinitionData = {
      async get() {
        return null;
      },
      async getAll(): Promise<Definitions> {
        return {};
      },
      async put() {},
      async delete() {},
      async putMany() {},
      async listKeys() {
        return [];
      },
    };
    expect(isWritable(storage)).toBe(true);
  });

  it("returns true for class-based implementations with prototype methods", () => {
    class MyData implements DefinitionData {
      async get() {
        return null;
      }
      async getAll(): Promise<Definitions> {
        return {};
      }
      async put() {}
      async delete() {}
      async putMany() {}
      async listKeys() {
        return [];
      }
    }
    expect(isWritable(new MyData())).toBe(true);
  });
});

const RAW_FLAGS = {
  definitions: {
    checkout_v2: {
      variations: [
        { value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] },
        { value: false },
      ],
    },
    max_upload_mb: {
      variations: [
        { value: 50, conditions: [{ type: "env", op: "eq", value: "prod" }] },
        { value: 10 },
      ],
    },
  },
};

const YAML_FLAGS = `
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            op: eq
            value: prod
      - value: false
  max_upload_mb:
    variations:
      - value: 50
        conditions:
          - type: env
            op: eq
            value: prod
      - value: 10
`;

describe("MemoryData.fromObject", () => {
  it("returns a data source for valid input", async () => {
    const data = await MemoryData.fromObject(RAW_FLAGS);
    expect(await data.get("checkout_v2")).not.toBeNull();
  });

  it("get() returns null for unknown key", async () => {
    const data = await MemoryData.fromObject(RAW_FLAGS);
    expect(await data.get("nonexistent")).toBeNull();
  });

  it("getAll() returns the full flag map", async () => {
    const data = await MemoryData.fromObject(RAW_FLAGS);
    const all = await data.getAll();
    expect(Object.keys(all)).toContain("checkout_v2");
  });

  it("throws ValidationError for invalid input", async () => {
    await expect(MemoryData.fromObject({ bad: "shape" })).rejects.toThrow(ValidationError);
  });
});

describe("MemoryData — immutability", () => {
  it("returns immutable definitions from get()", async () => {
    const data = await MemoryData.fromObject(RAW_FLAGS);
    const def1 = await data.get("checkout_v2");
    def1!.variations[0].value = "mutated";
    const def2 = await data.get("checkout_v2");
    expect(def2!.variations[0].value).toBe(true);
  });

  it("returns immutable definitions from getAll()", async () => {
    const data = await MemoryData.fromObject(RAW_FLAGS);
    const all1 = await data.getAll();
    all1["checkout_v2"].variations[0].value = "mutated";
    const all2 = await data.getAll();
    expect(all2["checkout_v2"].variations[0].value).toBe(true);
  });
});

describe("MemoryData.fromYaml", () => {
  it("parses valid YAML and returns a data source", async () => {
    const data = await MemoryData.fromYaml(YAML_FLAGS);
    expect(await data.get("checkout_v2")).not.toBeNull();
  });

  it("getAll() returns all flags from YAML", async () => {
    const data = await MemoryData.fromYaml(YAML_FLAGS);
    const all = await data.getAll();
    expect(Object.keys(all)).toContain("max_upload_mb");
  });

  it("throws ParseError for invalid YAML syntax", async () => {
    const { ParseError } = await import("./errors.js");
    await expect(MemoryData.fromYaml("{unclosed")).rejects.toThrow(ParseError);
  });

  it("throws ValidationError for structurally invalid YAML", async () => {
    await expect(MemoryData.fromYaml("just_a_string")).rejects.toThrow();
  });
});

describe("MemoryData.getPresets", () => {
  it("returns presets from input", async () => {
    const mem = await MemoryData.fromObject({
      definitions: { f: { variations: [{ value: 1 }] } },
      presets: { tier: { type: "string", key: "tier" } },
    });
    expect(await mem.getPresets()).toEqual({ tier: { type: "string", key: "tier" } });
  });

  it("returns empty object when no presets", async () => {
    const mem = await MemoryData.fromObject({
      definitions: { f: { variations: [{ value: 1 }] } },
    });
    expect(await mem.getPresets()).toEqual({});
  });

  it("ignores key for MemoryData (single source)", async () => {
    const mem = await MemoryData.fromObject({
      definitions: { f: { variations: [{ value: 1 }] } },
      presets: { tier: { type: "string", key: "tier" } },
    });
    expect(await mem.getPresets("f")).toEqual({ tier: { type: "string", key: "tier" } });
  });
});
