import { describe, it, expect } from "vitest";
import { createPresetConditions } from "./presets.js";
import { PresetsSchema } from "./schemas/index.js";
import { builtinEvaluators, evaluateCondition, defaultCreateRegex } from "./conditions/index.js";
import type { ConditionEvaluator } from "./conditions/index.js";
import type { Context } from "./schemas/context.js";

describe("PresetsSchema", () => {
  it("validates correct input", () => {
    const input = {
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
      age: { type: "number", key: "dob_num", overrides: { op: "gt", value: 18 } },
      segment: { type: "segment_match", overrides: { region: "sg" } },
    };
    const result = PresetsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("requires key for built-in types", () => {
    const result = PresetsSchema.safeParse({
      bad: { type: "string" },
    });
    expect(result.success).toBe(false);
  });

  it("does not require key for custom types", () => {
    const result = PresetsSchema.safeParse({
      custom: { type: "my_evaluator" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty type", () => {
    const result = PresetsSchema.safeParse({
      bad: { type: "" },
    });
    expect(result.success).toBe(false);
  });

  it("validates composite preset with conditions in overrides", () => {
    const input = {
      sg_free: {
        type: "and",
        overrides: {
          conditions: [
            { type: "string", key: "region", op: "eq", value: "sg" },
            { type: "string", key: "tier", op: "eq", value: "free" },
          ],
        },
      },
    };
    const result = PresetsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects composite preset without conditions in overrides", () => {
    const result = PresetsSchema.safeParse({
      bad: { type: "and" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects composite preset with empty conditions array", () => {
    const result = PresetsSchema.safeParse({
      bad: { type: "and", overrides: { conditions: [] } },
    });
    expect(result.success).toBe(false);
  });

  it("validates composite preset with nested conditions", () => {
    const input = {
      complex: {
        type: "or",
        overrides: {
          conditions: [
            {
              type: "and",
              conditions: [
                { type: "string", key: "a", op: "eq", value: "1" },
                { type: "number", key: "b", op: "gt", value: 10 },
              ],
            },
            { type: "bool", key: "c", value: true },
          ],
        },
      },
    };
    const result = PresetsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("does not require key for composite types", () => {
    const result = PresetsSchema.safeParse({
      combo: {
        type: "or",
        overrides: { conditions: [{ type: "string", key: "x", op: "eq", value: "y" }] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects composite preset with invalid conditions", () => {
    const result = PresetsSchema.safeParse({
      bad: {
        type: "and",
        overrides: {
          conditions: [{ type: "and", conditions: [] }], // invalid: and with empty conditions array
        },
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("createPresetConditions", () => {
  it("throws on collision with built-in condition type", () => {
    expect(() => createPresetConditions({ string: { type: "string", key: "k" } })).toThrow(
      /collides/,
    );
    expect(() => createPresetConditions({ env: { type: "string", key: "k" } })).toThrow(/collides/);
    expect(() => createPresetConditions({ and: { type: "string", key: "k" } })).toThrow(/collides/);
    expect(() => createPresetConditions({ __custom: { type: "string", key: "k" } })).toThrow(
      /collides/,
    );
  });

  it("generates evaluator for custom type presets", () => {
    const result = createPresetConditions({
      segment: { type: "segment_match", overrides: { region: "sg" } },
    });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty("segment");
  });

  it("generates evaluator for string preset", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    });
    expect(presetConditions).toHaveProperty("tier");

    const evaluators = { ...builtinEvaluators, ...presetConditions };
    const ctx: Context = { tier: "free" };
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "eq", value: "free" },
      context: ctx,
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(result).toBe(true);

    // overrides force op: "eq" and value: "free", so even with op: "neq"
    // in the condition, the override wins and the result is still true
    const resultOverridden = await presetConditions.tier({
      condition: { type: "tier", op: "neq", value: "pro" },
      context: ctx,
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(resultOverridden).toBe(true);

    // with a non-matching context, overrides still force op: "eq", value: "free"
    const resultNoMatch = await presetConditions.tier({
      condition: { type: "tier", op: "eq", value: "free" },
      context: { tier: "pro" },
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(resultNoMatch).toBe(false);
  });

  it("string preset supports in operator", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const evaluators = { ...builtinEvaluators, ...presetConditions };
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "in", value: ["free", "basic"] },
      context: { tier: "free" },
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(result).toBe(true);

    const resultFalse = await presetConditions.tier({
      condition: { type: "tier", op: "in", value: ["pro", "enterprise"] },
      context: { tier: "free" },
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(resultFalse).toBe(false);
  });

  it("string preset supports regex operator", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const evaluators = { ...builtinEvaluators, ...presetConditions };
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "regex", value: "^fr" },
      context: { tier: "free" },
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(result).toBe(true);
  });

  it("generates evaluator for number preset", async () => {
    const presetConditions = createPresetConditions({
      age: { type: "number", key: "user_age" },
    });
    const evaluators = { ...builtinEvaluators, ...presetConditions };

    expect(
      await presetConditions.age({
        condition: { type: "age", op: "gt", value: 18 },
        context: { user_age: 25 },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(true);
    expect(
      await presetConditions.age({
        condition: { type: "age", op: "lt", value: 18 },
        context: { user_age: 25 },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(false);
    expect(
      await presetConditions.age({
        condition: { type: "age", op: "eq", value: 25 },
        context: { user_age: 25 },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(true);
  });

  it("generates evaluator for bool preset", async () => {
    const presetConditions = createPresetConditions({
      admin: { type: "bool", key: "is_admin" },
    });
    const evaluators = { ...builtinEvaluators, ...presetConditions };

    expect(
      await presetConditions.admin({
        condition: { type: "admin", value: true },
        context: { is_admin: true },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(true);
    expect(
      await presetConditions.admin({
        condition: { type: "admin", value: true },
        context: { is_admin: false },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(false);
  });

  it("generates evaluator for datetime preset", async () => {
    const presetConditions = createPresetConditions({
      cutoff: { type: "datetime", key: "event_time" },
    });
    const evaluators = { ...builtinEvaluators, ...presetConditions };

    const ts = "2025-01-01T00:00:00.000Z";
    expect(
      await presetConditions.cutoff({
        condition: { type: "cutoff", op: "gt", value: ts },
        context: { event_time: "2025-06-01T00:00:00.000Z" },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(true);
    expect(
      await presetConditions.cutoff({
        condition: { type: "cutoff", op: "lt", value: ts },
        context: { event_time: "2025-06-01T00:00:00.000Z" },
        annotations: {},
        deps: {},
        depth: "",
        createRegex: defaultCreateRegex,
        evaluators,
      }),
    ).toBe(false);
  });

  it("returns false when context key is missing", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const evaluators = { ...builtinEvaluators, ...presetConditions };
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "eq", value: "free" },
      context: {},
      annotations: {},
      deps: {},
      depth: "",
      createRegex: defaultCreateRegex,
      evaluators,
    });
    expect(result).toBe(false);
  });

  it("works with preset conditions round-trip", () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const extended = { ...builtinEvaluators, ...presetConditions };
    expect(extended).toHaveProperty("tier");
    expect(extended).toHaveProperty("string");
    expect(extended).toHaveProperty("env");
  });

  it("evaluates through evaluateCondition with extended conditions", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const extended = { ...builtinEvaluators, ...presetConditions };

    const result = await evaluateCondition({
      condition: { type: "tier", op: "eq", value: "pro" },
      context: { tier: "pro" },
      evaluators: extended,
      annotations: {},
    });
    expect(result).toBe(true);

    const resultFalse = await evaluateCondition({
      condition: { type: "tier", op: "eq", value: "pro" },
      context: { tier: "free" },
      evaluators: extended,
      annotations: {},
    });
    expect(resultFalse).toBe(false);
  });

  it("generates evaluator for custom type preset (delegates at runtime)", async () => {
    const customEvaluator: ConditionEvaluator = async ({ condition }) => {
      const rec = condition as Record<string, unknown>;
      return rec.region === "sg";
    };

    const presetConditions = createPresetConditions({
      geo: { type: "segment_match", overrides: { region: "sg" } },
    });
    expect(presetConditions).toHaveProperty("geo");

    const evaluators = {
      ...builtinEvaluators,
      ...presetConditions,
      segment_match: customEvaluator,
    };
    const result = await evaluateCondition({
      condition: { type: "geo" },
      context: {},
      evaluators,
      annotations: {},
    });
    expect(result).toBe(true);
  });

  it("custom type preset merges overrides with use-site fields", async () => {
    const customEvaluator: ConditionEvaluator = async ({ condition }) => {
      const rec = condition as Record<string, unknown>;
      return rec.region === "sg" && rec.threshold === 50;
    };

    const presetConditions = createPresetConditions({
      geo: { type: "segment_match", overrides: { region: "sg" } },
    });

    const evaluators = {
      ...builtinEvaluators,
      ...presetConditions,
      segment_match: customEvaluator,
    };
    const result = await evaluateCondition({
      condition: { type: "geo", threshold: 50 },
      context: {},
      evaluators,
      annotations: {},
    });
    expect(result).toBe(true);
  });

  it("generates evaluator for composite AND preset", async () => {
    const presetConditions = createPresetConditions({
      sg_free: {
        type: "and",
        overrides: {
          conditions: [
            { type: "string", key: "region", op: "eq", value: "sg" },
            { type: "string", key: "tier", op: "eq", value: "free" },
          ],
        },
      },
    });
    expect(presetConditions).toHaveProperty("sg_free");

    const evaluators = { ...builtinEvaluators, ...presetConditions };

    const resultTrue = await evaluateCondition({
      condition: { type: "sg_free" },
      context: { region: "sg", tier: "free" },
      evaluators,
      annotations: {},
    });
    expect(resultTrue).toBe(true);

    const resultFalse = await evaluateCondition({
      condition: { type: "sg_free" },
      context: { region: "eu", tier: "free" },
      evaluators,
      annotations: {},
    });
    expect(resultFalse).toBe(false);
  });

  it("generates evaluator for composite OR preset", async () => {
    const presetConditions = createPresetConditions({
      premium: {
        type: "or",
        overrides: {
          conditions: [
            { type: "string", key: "tier", op: "eq", value: "pro" },
            { type: "string", key: "tier", op: "eq", value: "enterprise" },
          ],
        },
      },
    });

    const evaluators = { ...builtinEvaluators, ...presetConditions };

    expect(
      await evaluateCondition({
        condition: { type: "premium" },
        context: { tier: "pro" },
        evaluators,
        annotations: {},
      }),
    ).toBe(true);

    expect(
      await evaluateCondition({
        condition: { type: "premium" },
        context: { tier: "free" },
        evaluators,
        annotations: {},
      }),
    ).toBe(false);
  });

  it("composite preset overrides use-site conditions", async () => {
    const presetConditions = createPresetConditions({
      locked: {
        type: "and",
        overrides: {
          conditions: [{ type: "bool", key: "active", value: true }],
        },
      },
    });

    const evaluators = { ...builtinEvaluators, ...presetConditions };

    const result = await evaluateCondition({
      condition: { type: "locked", conditions: [{ type: "bool", key: "active", value: false }] },
      context: { active: true },
      evaluators,
      annotations: {},
    });
    expect(result).toBe(true);
  });

  it("composite preset with nested composites works", async () => {
    const presetConditions = createPresetConditions({
      complex: {
        type: "or",
        overrides: {
          conditions: [
            {
              type: "and",
              conditions: [
                { type: "string", key: "region", op: "eq", value: "sg" },
                { type: "string", key: "tier", op: "eq", value: "free" },
              ],
            },
            { type: "string", key: "tier", op: "eq", value: "enterprise" },
          ],
        },
      },
    });

    const evaluators = { ...builtinEvaluators, ...presetConditions };

    expect(
      await evaluateCondition({
        condition: { type: "complex" },
        context: { region: "sg", tier: "free" },
        evaluators,
        annotations: {},
      }),
    ).toBe(true);

    expect(
      await evaluateCondition({
        condition: { type: "complex" },
        context: { region: "eu", tier: "enterprise" },
        evaluators,
        annotations: {},
      }),
    ).toBe(true);

    expect(
      await evaluateCondition({
        condition: { type: "complex" },
        context: { region: "eu", tier: "free" },
        evaluators,
        annotations: {},
      }),
    ).toBe(false);
  });
});
