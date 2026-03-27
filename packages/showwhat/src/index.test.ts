import { describe, it, expect, vi } from "vitest";
import {
  showwhat,
  registerEvaluators,
  MemoryData,
  resolveVariation,
  builtinEvaluators,
  DefinitionInactiveError,
  DefinitionNotFoundError,
  ValidationError,
  VariationNotFoundError,
} from "./index.js";
import type { ConditionEvaluator, Definitions } from "./index.js";

const flags: Definitions = {
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
};

describe("showwhat", () => {
  it("resolves multiple keys", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2", "max_upload_mb"],
      context: { env: "prod" },
      options: { data },
    });
    expect(result["checkout_v2"].error).toBeNull();
    expect((result["checkout_v2"] as { value: unknown }).value).toBe(true);
    expect(result["max_upload_mb"].error).toBeNull();
    expect((result["max_upload_mb"] as { value: unknown }).value).toBe(50);
  });

  it("resolves a single key in array", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod" },
      options: { data },
    });
    const entry = result["checkout_v2"];
    expect(entry.error).toBeNull();
    if (!entry.error) {
      expect(entry.value).toBe(true);
      expect(entry.meta.variation.conditionCount).toBe(1);
    }
  });

  it("resolves catch-all when no condition matches", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "dev" },
      options: { data },
    });
    const entry = result["checkout_v2"];
    expect(entry.error).toBeNull();
    if (!entry.error) {
      expect(entry.value).toBe(false);
      expect(entry.meta.variation.conditionCount).toBe(0);
    }
  });

  it("returns ResolutionError for unknown key", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["nonexistent"],
      context: { env: "prod" },
      options: { data },
    });
    const entry = result["nonexistent"];
    expect(entry.error).toBeInstanceOf(DefinitionNotFoundError);
  });

  it("returns mixed successes and errors", async () => {
    const mixedFlags: Definitions = {
      ...flags,
      disabled: { active: false, variations: [{ value: "nope" }] },
    };
    const data = await MemoryData.fromObject({ definitions: mixedFlags });
    const result = await showwhat({
      keys: ["checkout_v2", "disabled", "nonexistent"],
      context: { env: "prod" },
      options: { data },
    });

    expect(result["checkout_v2"].error).toBeNull();
    expect(result["disabled"].error).toBeInstanceOf(DefinitionInactiveError);
    expect(result["nonexistent"].error).toBeInstanceOf(DefinitionNotFoundError);
  });

  it("throws ValidationError when context contains invalid values", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    await expect(
      showwhat({
        keys: ["checkout_v2"],
        context: { env: () => {} } as never,
        options: { data },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("resolves all keys when keys is omitted", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      context: { env: "prod" },
      options: { data },
    });
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["checkout_v2"].error).toBeNull();
    expect(result["max_upload_mb"].error).toBeNull();
  });

  it("calls getAll() when keys is omitted", async () => {
    const getAllSpy = vi.fn(async () => flags);
    const getSpy = vi.fn();
    const data = { get: getSpy, getAll: getAllSpy };

    await showwhat({ context: { env: "prod" }, options: { data } });

    expect(getAllSpy).toHaveBeenCalledOnce();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("calls get() per key when keys is provided", async () => {
    const getAllSpy = vi.fn();
    const getSpy = vi.fn(async (key: string) => flags[key] ?? null);
    const data = { get: getSpy, getAll: getAllSpy };

    await showwhat({
      keys: ["checkout_v2", "max_upload_mb"],
      context: { env: "prod" },
      options: { data },
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getAllSpy).not.toHaveBeenCalled();
  });

  it("accepts nested objects in context", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod", meta: { nested: true } },
      options: { data },
    });
    expect(result["checkout_v2"].error).toBeNull();
  });

  it("accepts primitive arrays in context", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod", tags: ["a", "b"] },
      options: { data },
    });
    expect(result["checkout_v2"].error).toBeNull();
  });

  it("supports time-based conditions", async () => {
    const timedDefinition = [
      {
        value: "maintenance",
        conditions: [
          { type: "startAt" as const, value: "2026-03-03T02:00:00Z" },
          { type: "endAt" as const, value: "2026-03-03T07:00:00Z" },
        ],
      },
      { value: null },
    ];
    const inside = await resolveVariation({
      variations: timedDefinition,
      context: { at: "2026-03-03T03:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(inside!.variation.value).toBe("maintenance");
    const outside = await resolveVariation({
      variations: timedDefinition,
      context: { at: "2026-03-03T08:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(outside!.variation.value).toBeNull();
  });

  it("uses custom evaluators when provided", async () => {
    const tierEvaluator: ConditionEvaluator = async ({ condition, context }) => {
      const c = condition as { tier: string };
      return (context as Record<string, unknown>).tier === c.tier;
    };
    const customFlags: Definitions = {
      feature: {
        variations: [
          { value: "pro", conditions: [{ type: "tier", tier: "pro" } as never] },
          { value: "free" },
        ],
      },
    };
    const data = await MemoryData.fromObject({ definitions: customFlags });
    const customEvaluators = registerEvaluators({ tier: tierEvaluator });

    const result = await showwhat({
      keys: ["feature"],
      context: { tier: "pro" } as never,
      options: { data, evaluators: customEvaluators },
    });
    expect((result["feature"] as { value: unknown }).value).toBe("pro");
  });

  it("returns ResolutionError when active is false", async () => {
    const inactiveFlags: Definitions = {
      disabled: { active: false, variations: [{ value: "nope" }] },
    };
    const data = await MemoryData.fromObject({ definitions: inactiveFlags });
    const result = await showwhat({
      keys: ["disabled"],
      context: { env: "prod" },
      options: { data },
    });
    expect(result["disabled"].error).toBeInstanceOf(DefinitionInactiveError);
  });

  it("resolves normally when active is undefined", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod" },
      options: { data },
    });
    expect(result["checkout_v2"].error).toBeNull();
  });

  it("resolves normally when active is true", async () => {
    const activeFlags: Definitions = {
      enabled: { active: true, variations: [{ value: "yes" }] },
    };
    const data = await MemoryData.fromObject({ definitions: activeFlags });
    const result = await showwhat({
      keys: ["enabled"],
      context: { env: "prod" },
      options: { data },
    });
    const entry = result["enabled"];
    expect(entry.error).toBeNull();
    if (!entry.error) {
      expect(entry.value).toBe("yes");
    }
  });

  it("returns ResolutionError for VariationNotFoundError", async () => {
    const noMatchFlags: Definitions = {
      strict: {
        variations: [{ value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] }],
      },
    };
    const data = await MemoryData.fromObject({ definitions: noMatchFlags });
    const result = await showwhat({
      keys: ["strict"],
      context: { env: "dev" },
      options: { data },
    });
    expect(result["strict"].error).toBeInstanceOf(VariationNotFoundError);
  });

  it("returns empty record when keys is empty array", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: [],
      context: { env: "prod" },
      options: { data },
    });
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("showwhat - error surfaces", () => {
  it("throws when data.get() fails", async () => {
    const data = {
      async get() {
        throw new Error("connection failed");
      },
      async getAll() {
        return {};
      },
    };
    await expect(
      showwhat({ keys: ["any"], context: { env: "prod" }, options: { data } }),
    ).rejects.toThrow("connection failed");
  });

  it("throws when getAll() fails", async () => {
    const data = {
      async get() {
        return null;
      },
      async getAll() {
        throw new Error("connection failed");
      },
    };
    await expect(showwhat({ context: { env: "prod" }, options: { data } })).rejects.toThrow(
      "connection failed",
    );
  });
});

describe("showwhat - builtinEvaluators default", () => {
  it("uses builtinEvaluators when evaluators not provided in options", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod" },
      options: { data },
    });
    const entry = result["checkout_v2"];
    expect(entry.error).toBeNull();
    if (!entry.error) {
      expect(entry.value).toBe(true);
    }
  });
});

describe("registerEvaluators", () => {
  it("throws when attempting to register reserved 'and' type", () => {
    const dummy: ConditionEvaluator = async () => true;
    expect(() => registerEvaluators({ and: dummy })).toThrow(
      'Cannot register reserved condition type "and"',
    );
  });

  it("throws when attempting to register reserved 'or' type", () => {
    const dummy: ConditionEvaluator = async () => true;
    expect(() => registerEvaluators({ or: dummy })).toThrow(
      'Cannot register reserved condition type "or"',
    );
  });

  it("allows overriding built-in non-reserved types like string", () => {
    const custom: ConditionEvaluator = async () => true;
    const extended = registerEvaluators({ string: custom });
    expect(extended.string).toBe(custom);
  });

  it("preserves built-in evaluators", () => {
    const custom: ConditionEvaluator = async () => true;
    const extended = registerEvaluators({ custom });
    expect(extended.env).toBeDefined();
    expect(extended.string).toBeDefined();
    expect(extended.number).toBeDefined();
    expect(extended.custom).toBe(custom);
  });
});
