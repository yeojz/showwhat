import { describe, it, expect } from "vitest";
import { parseYaml, parseObject, parsePresetsObject, parsePresetsYaml } from "./parsers.js";
import {
  ParseError,
  DataError,
  ShowwhatError,
  ValidationError,
  SchemaValidationError,
} from "./errors.js";
import { FileFormatSchema } from "./schemas/index.js";

describe("parseYaml", () => {
  it("parses valid condition-based config", async () => {
    const flags = await parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: env
            op: eq
            value: prod
      - value: false
`);
    expect(Array.isArray(flags.definitions["feature_a"].variations)).toBe(true);
  });

  it("throws ParseError for invalid YAML syntax", async () => {
    await expect(parseYaml("{")).rejects.toThrow(ParseError);
  });

  it("throws ParseError for non-object YAML", async () => {
    await expect(parseYaml("- item1\n- item2")).rejects.toThrow(ParseError);
  });

  it("handles YAML syntax errors with line information", async () => {
    const malformed = "foo:\n  bar: [\n";
    await expect(parseYaml(malformed)).rejects.toThrow(ParseError);
    try {
      await parseYaml(malformed);
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).line).toBeDefined();
    }
  });

  it("accepts unknown condition type (custom conditions pass through)", async () => {
    const flags = await parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: unknown_type
            value: prod
`);
    expect(Array.isArray(flags.definitions["feature_a"].variations)).toBe(true);
  });

  it("throws ValidationError for invalid ISO date in condition", async () => {
    await expect(
      parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: endAt
            value: "not-a-date"
`),
    ).rejects.toThrow(ValidationError);
  });

  it("ValidationError message includes the field path", async () => {
    try {
      await parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: endAt
            value: "not-a-date"
`);
    } catch (e: unknown) {
      expect((e as Error).message).toMatch(/feature_a/);
    }
  });

  it("parses string match conditions", async () => {
    const flags = await parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: string
            key: region
            op: eq
            value: us-east-1
      - value: false
`);
    const entries = flags.definitions["feature_a"].variations;
    expect(entries[0].conditions![0].type).toBe("string");
  });

  it("parseYaml returns presets when present", async () => {
    const result = await parseYaml(`
definitions:
  my_flag:
    variations:
      - value: true
presets:
  tier:
    type: string
    key: tier
`);
    expect(result.presets).toEqual({ tier: { type: "string", key: "tier" } });
  });

  it("parseYaml returns undefined presets when absent", async () => {
    const result = await parseYaml(`
definitions:
  my_flag:
    variations:
      - value: true
`);
    expect(result.presets).toBeUndefined();
  });
});

describe("parseObject", () => {
  it("validates a plain object as a FileFormat", async () => {
    const map = await parseObject({
      definitions: {
        feature_a: {
          variations: [
            { value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] },
            { value: false },
          ],
        },
      },
    });
    expect(Array.isArray(map.definitions["feature_a"].variations)).toBe(true);
  });

  it("throws ValidationError for invalid input", async () => {
    await expect(parseObject("not an object")).rejects.toThrow(ValidationError);
  });

  it("parseObject rejects flat definition map", async () => {
    await expect(parseObject({ my_flag: { variations: [{ value: true }] } })).rejects.toThrow();
  });
});

describe("regex validation deferred to resolve time", () => {
  it("accepts invalid regex pattern at parse time (validated at resolve via createRegex)", async () => {
    const flags = await parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: string
            key: region
            op: regex
            value: "[invalid"
      - value: false
`);
    expect(flags.definitions["feature_a"]).toBeDefined();
  });

  it("accepts valid regex pattern in string condition with regex op", async () => {
    const flags = await parseYaml(`
definitions:
  feature_a:
    variations:
      - value: true
        conditions:
          - type: string
            key: region
            op: regex
            value: "^hello-"
      - value: false
`);
    expect(flags.definitions["feature_a"]).toBeDefined();
  });
});

describe("parsePresetsObject", () => {
  it("parses valid presets object", async () => {
    const result = await parsePresetsObject({
      presets: { tier: { type: "string", key: "tier" } },
    });
    expect(result).toEqual({ tier: { type: "string", key: "tier" } });
  });

  it("returns empty map when presets key is missing", async () => {
    const result = await parsePresetsObject({});
    expect(result).toEqual({});
  });

  it("throws on non-object input", async () => {
    await expect(parsePresetsObject("bad")).rejects.toThrow();
    await expect(parsePresetsObject(null)).rejects.toThrow();
    await expect(parsePresetsObject([1])).rejects.toThrow();
  });

  it("throws on invalid presets shape", async () => {
    await expect(parsePresetsObject({ presets: { tier: { type: "" } } })).rejects.toThrow();
  });
});

describe("parsePresetsYaml", () => {
  it("parses valid presets YAML", async () => {
    const result = await parsePresetsYaml(`
presets:
  tier:
    type: string
    key: tier
`);
    expect(result).toEqual({ tier: { type: "string", key: "tier" } });
  });

  it("parsePresetsYaml throws on invalid YAML", async () => {
    await expect(parsePresetsYaml(":\ninvalid: [yaml")).rejects.toThrow(/YAML/);
  });
});

describe("error classes", () => {
  it("DataError stores message and cause", () => {
    const cause = new Error("underlying");
    const err = new DataError("data failed", cause);
    expect(err).toBeInstanceOf(DataError);
    expect(err).toBeInstanceOf(ShowwhatError);
    expect(err.name).toBe("DataError");
    expect(err.message).toBe("data failed");
    expect(err.cause).toBe(cause);
  });

  it("DataError works without cause", () => {
    const err = new DataError("data failed");
    expect(err.name).toBe("DataError");
    expect(err.cause).toBeUndefined();
  });

  it("SchemaValidationError formats message without context", () => {
    const zodError = FileFormatSchema.safeParse("invalid");
    expect(zodError.success).toBe(false);
    if (!zodError.success) {
      const err = new SchemaValidationError(zodError.error);
      expect(err.name).toBe("SchemaValidationError");
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toMatch(/^Validation failed:/);
      expect(err.message).not.toMatch(/in /);
    }
  });
});
