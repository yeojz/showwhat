import { describe, it, expect } from "vitest";
import {
  DefinitionSchema,
  ResolutionSchema,
  ConditionSchema,
  BuiltinConditionSchema,
  StringConditionSchema,
  FileFormatSchema,
  ContextSchema,
} from "./schemas/index.js";

describe("ConditionSchema", () => {
  it("accepts valid env condition with string", () => {
    expect(ConditionSchema.safeParse({ type: "env", op: "eq", value: "prod" }).success).toBe(true);
  });

  it("accepts valid env condition with array", () => {
    expect(
      ConditionSchema.safeParse({ type: "env", op: "eq", value: ["prod", "staging"] }).success,
    ).toBe(true);
  });

  it("accepts valid startAt condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "startAt", value: "2026-01-01T00:00:00Z" }).success,
    ).toBe(true);
  });

  it("accepts valid string condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "string", key: "region", op: "eq", value: "us-east-1" })
        .success,
    ).toBe(true);
  });

  it("accepts valid number condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "number", key: "score", op: "gte", value: 80 }).success,
    ).toBe(true);
  });

  it("accepts valid bool condition", () => {
    expect(
      ConditionSchema.safeParse({ type: "bool", key: "enabled", op: "eq", value: true }).success,
    ).toBe(true);
  });

  it("accepts unknown condition type (custom conditions pass through)", () => {
    expect(ConditionSchema.safeParse({ type: "percent", value: 50 }).success).toBe(true);
  });

  it("BuiltinConditionSchema rejects unknown condition type", () => {
    expect(BuiltinConditionSchema.safeParse({ type: "percent", value: 50 }).success).toBe(false);
  });

  it("rejects invalid ISO date in endAt", () => {
    expect(ConditionSchema.safeParse({ type: "endAt", value: "tomorrow" }).success).toBe(false);
  });

  it("accepts env condition with empty array (no min constraint on env value)", () => {
    expect(ConditionSchema.safeParse({ type: "env", op: "eq", value: [] }).success).toBe(true);
  });

  it("rejects string condition missing key", () => {
    expect(ConditionSchema.safeParse({ type: "string", op: "eq", value: "foo" }).success).toBe(
      false,
    );
  });

  it("rejects string condition missing op", () => {
    expect(ConditionSchema.safeParse({ type: "string", key: "x", value: "foo" }).success).toBe(
      false,
    );
  });

  it("rejects string condition with invalid regex pattern", () => {
    const result = ConditionSchema.safeParse({
      type: "string",
      key: "name",
      op: "regex",
      value: "[invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects regex op with array value", () => {
    const result = ConditionSchema.safeParse({
      type: "string",
      key: "name",
      op: "regex",
      value: ["valid.*", "[invalid"],
    });
    expect(result.success).toBe(false);
  });
});

describe("StringConditionSchema", () => {
  it("accepts eq op with string value", () => {
    const result = StringConditionSchema.safeParse({
      type: "string",
      key: "region",
      op: "eq",
      value: "us-east-1",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.op).toBe("eq");
  });

  it("accepts neq op", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "env",
        op: "neq",
        value: "dev",
      }).success,
    ).toBe(true);
  });

  it("accepts regex op", () => {
    const result = StringConditionSchema.safeParse({
      type: "string",
      key: "tenant",
      op: "regex",
      value: "^acme-.*",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing key", () => {
    expect(
      StringConditionSchema.safeParse({ type: "string", op: "eq", value: "prod" }).success,
    ).toBe(false);
  });

  it("rejects missing value", () => {
    expect(StringConditionSchema.safeParse({ type: "string", key: "env", op: "eq" }).success).toBe(
      false,
    );
  });

  it("rejects missing op", () => {
    expect(
      StringConditionSchema.safeParse({ type: "string", key: "env", value: "prod" }).success,
    ).toBe(false);
  });

  it("rejects invalid op", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "env",
        op: "exact",
        value: "prod",
      }).success,
    ).toBe(false);
  });

  it("accepts in op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "in",
        value: ["us-east-1", "us-west-2"],
      }).success,
    ).toBe(true);
  });

  it("accepts nin op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "nin",
        value: ["eu-central-1"],
      }).success,
    ).toBe(true);
  });

  it("rejects eq op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "env",
        op: "eq",
        value: ["prod", "staging"],
      }).success,
    ).toBe(false);
  });

  it("rejects in op with string value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "in",
        value: "us-east-1",
      }).success,
    ).toBe(false);
  });

  it("rejects regex op with array value", () => {
    expect(
      StringConditionSchema.safeParse({
        type: "string",
        key: "region",
        op: "regex",
        value: ["^us-", "^eu-"],
      }).success,
    ).toBe(false);
  });
});

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

describe("ContextSchema", () => {
  it("accepts nested record values", () => {
    const result = ContextSchema.safeParse({
      user: { name: "alice", age: 30, active: true },
    });
    expect(result.success).toBe(true);
  });

  it("accepts deeply nested record values", () => {
    const result = ContextSchema.safeParse({
      user: { profile: { tier: "pro" } },
    });
    expect(result.success).toBe(true);
  });
});

describe("ResolutionSchema", () => {
  it("accepts resolution with nested variation and annotations", () => {
    expect(
      ResolutionSchema.safeParse({
        key: "checkout_v2",
        value: true,
        meta: {
          context: { env: "prod" },
          variation: {
            index: 0,
            conditionCount: 1,
          },
          annotations: {},
        },
      }).success,
    ).toBe(true);
  });

  it("accepts variation with optional id and description", () => {
    expect(
      ResolutionSchema.safeParse({
        key: "checkout_v2",
        value: true,
        meta: {
          context: { env: "prod" },
          variation: {
            index: 0,
            id: "var-1",
            description: "Production variant",
            conditionCount: 1,
          },
          annotations: { rollout: { bucket: 42 } },
        },
      }).success,
    ).toBe(true);
  });

  it("requires variation.conditionCount", () => {
    expect(
      ResolutionSchema.safeParse({
        key: "checkout_v2",
        value: false,
        meta: {
          context: { env: "dev" },
          variation: {
            index: 1,
          },
          annotations: {},
        },
      }).success,
    ).toBe(false);
  });

  it("drops top-level source", () => {
    const result = ResolutionSchema.safeParse({
      key: "checkout_v2",
      source: "condition",
      value: true,
      meta: {
        context: { env: "prod" },
        variation: {
          index: 0,
          conditionCount: 1,
        },
        annotations: {},
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("source" in result.data).toBe(false);
    }
  });
});
