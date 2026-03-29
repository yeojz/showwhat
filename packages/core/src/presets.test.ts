import { describe, it, expect } from "vitest";
import { createPresetConditions } from "./presets.js";
import { PresetsSchema } from "./schemas/index.js";
import { builtinEvaluators, evaluateCondition } from "./conditions/index.js";
import type { Context } from "./schemas/context.js";

describe("PresetsSchema", () => {
  it("validates correct input", () => {
    const input = {
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
      age: { type: "number", key: "dob_num", overrides: { op: "gt", value: 18 } },
      segment: { type: "segment_match", overrides: { region: "us" } },
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

  it("skips custom type presets (no evaluator generated)", () => {
    const result = createPresetConditions({
      segment: { type: "segment_match", overrides: { region: "us" } },
    });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("generates evaluator for string preset", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier", overrides: { op: "eq", value: "free" } },
    });
    expect(presetConditions).toHaveProperty("tier");

    const ctx: Context = { tier: "free" };
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "eq", value: "free" },
      context: ctx,
      annotations: {},
      deps: {},
      depth: "",
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
    });
    expect(resultOverridden).toBe(true);

    // with a non-matching context, overrides still force op: "eq", value: "free"
    const resultNoMatch = await presetConditions.tier({
      condition: { type: "tier", op: "eq", value: "free" },
      context: { tier: "pro" },
      annotations: {},
      deps: {},
      depth: "",
    });
    expect(resultNoMatch).toBe(false);
  });

  it("string preset supports in operator", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "in", value: ["free", "basic"] },
      context: { tier: "free" },
      annotations: {},
      deps: {},
      depth: "",
    });
    expect(result).toBe(true);

    const resultFalse = await presetConditions.tier({
      condition: { type: "tier", op: "in", value: ["pro", "enterprise"] },
      context: { tier: "free" },
      annotations: {},
      deps: {},
      depth: "",
    });
    expect(resultFalse).toBe(false);
  });

  it("string preset supports regex operator", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "regex", value: "^fr" },
      context: { tier: "free" },
      annotations: {},
      deps: {},
      depth: "",
    });
    expect(result).toBe(true);
  });

  it("generates evaluator for number preset", async () => {
    const presetConditions = createPresetConditions({
      age: { type: "number", key: "user_age" },
    });

    expect(
      await presetConditions.age({
        condition: { type: "age", op: "gt", value: 18 },
        context: { user_age: 25 },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(true);
    expect(
      await presetConditions.age({
        condition: { type: "age", op: "lt", value: 18 },
        context: { user_age: 25 },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(false);
    expect(
      await presetConditions.age({
        condition: { type: "age", op: "eq", value: 25 },
        context: { user_age: 25 },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(true);
  });

  it("generates evaluator for bool preset", async () => {
    const presetConditions = createPresetConditions({
      admin: { type: "bool", key: "is_admin" },
    });

    expect(
      await presetConditions.admin({
        condition: { type: "admin", value: true },
        context: { is_admin: true },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(true);
    expect(
      await presetConditions.admin({
        condition: { type: "admin", value: true },
        context: { is_admin: false },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(false);
  });

  it("generates evaluator for datetime preset", async () => {
    const presetConditions = createPresetConditions({
      cutoff: { type: "datetime", key: "event_time" },
    });

    const ts = "2025-01-01T00:00:00.000Z";
    expect(
      await presetConditions.cutoff({
        condition: { type: "cutoff", op: "gt", value: ts },
        context: { event_time: "2025-06-01T00:00:00.000Z" },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(true);
    expect(
      await presetConditions.cutoff({
        condition: { type: "cutoff", op: "lt", value: ts },
        context: { event_time: "2025-06-01T00:00:00.000Z" },
        annotations: {},
        deps: {},
        depth: "",
      }),
    ).toBe(false);
  });

  it("returns false when context key is missing", async () => {
    const presetConditions = createPresetConditions({
      tier: { type: "string", key: "tier" },
    });
    const result = await presetConditions.tier({
      condition: { type: "tier", op: "eq", value: "free" },
      context: {},
      annotations: {},
      deps: {},
      depth: "",
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
});
