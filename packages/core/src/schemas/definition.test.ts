import { describe, it, expect } from "vitest";
import { DefinitionSchema, FileFormatSchema } from "./definition.js";

describe("DefinitionSchema", () => {
  it("accepts variations array with conditions", () => {
    expect(
      DefinitionSchema.safeParse({
        variations: [
          { value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] },
          { value: false },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts variations entry with no conditions (catch-all)", () => {
    expect(DefinitionSchema.safeParse({ variations: [{ value: 42 }] }).success).toBe(true);
  });

  it("accepts explicitly empty conditions array", () => {
    expect(
      DefinitionSchema.safeParse({ variations: [{ value: 42, conditions: [] }] }).success,
    ).toBe(true);
  });

  it("rejects empty variations array", () => {
    expect(DefinitionSchema.safeParse({ variations: [] }).success).toBe(false);
  });

  it("rejects missing variations key", () => {
    expect(DefinitionSchema.safeParse({}).success).toBe(false);
  });

  it("comment field is optional", () => {
    expect(DefinitionSchema.safeParse({ variations: [{ value: true }] }).success).toBe(true);
  });

  it("comment accepts any string", () => {
    expect(
      DefinitionSchema.safeParse({
        description: "Shown during planned downtime windows",
        variations: [{ value: true }],
      }).success,
    ).toBe(true);
  });

  it("rejects plain array (object wrapper required)", () => {
    expect(
      DefinitionSchema.safeParse([
        { value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] },
        { value: false },
      ]).success,
    ).toBe(false);
  });
});

describe("FileFormatSchema", () => {
  it("accepts valid definitions with presets", () => {
    const result = FileFormatSchema.safeParse({
      definitions: {
        my_flag: { variations: [{ value: true }] },
      },
      presets: {
        tier: { type: "string", key: "tier" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts definitions without presets", () => {
    const result = FileFormatSchema.safeParse({
      definitions: {
        my_flag: { variations: [{ value: true }] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing definitions key", () => {
    const result = FileFormatSchema.safeParse({
      presets: { tier: { type: "string", key: "tier" } },
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty definitions", () => {
    const result = FileFormatSchema.safeParse({
      definitions: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown top-level keys", () => {
    const result = FileFormatSchema.safeParse({
      definitions: { my_flag: { variations: [{ value: true }] } },
      extra: "not allowed",
    });
    expect(result.success).toBe(false);
  });
});
