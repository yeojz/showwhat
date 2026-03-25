import { describe, it, expect } from "vitest";
import { showwhat, resolve, extendEvaluators, noConditionEvaluator } from "./index.js";
import { MemoryData } from "./data.js";
import { DefinitionInactiveError, DefinitionNotFoundError, ValidationError } from "./errors.js";
import { resolveVariation } from "./resolver.js";
import type { ConditionEvaluator } from "./conditions/index.js";
import type { Definitions } from "./schemas/index.js";

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
  it("resolves a flag via the data source", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      key: "checkout_v2",
      context: { env: "prod" },
      options: { data },
    });
    expect(result.value).toBe(true);
    expect(result.meta.variation.conditionCount).toBe(1);
  });

  it("resolves catch-all when no condition matches", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      key: "checkout_v2",
      context: { env: "dev" },
      options: { data },
    });
    expect(result.value).toBe(false);
    expect(result.meta.variation.conditionCount).toBe(0);
  });

  it("throws DefinitionNotFoundError for unknown key", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    await expect(
      showwhat({ key: "nonexistent", context: { env: "prod" }, options: { data } }),
    ).rejects.toThrow(DefinitionNotFoundError);
  });

  it("throws ValidationError when context contains invalid values", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    await expect(
      showwhat({
        key: "checkout_v2",
        context: { env: { nested: true } } as never,
        options: { data },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("evaluate supports time-based conditions", async () => {
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
    });
    expect(inside!.variation.value).toBe("maintenance");
    const outside = await resolveVariation({
      variations: timedDefinition,
      context: { at: "2026-03-03T08:00:00Z" },
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
    const customEvaluators = extendEvaluators({ tier: tierEvaluator });
    expect(
      (
        await showwhat({
          key: "feature",
          context: { tier: "pro" } as never,
          options: { data, evaluators: customEvaluators },
        })
      ).value,
    ).toBe("pro");
    expect(
      (
        await showwhat({
          key: "feature",
          context: { tier: "free" } as never,
          options: { data, evaluators: customEvaluators },
        })
      ).value,
    ).toBe("free");
  });

  it("throws DefinitionInactiveError when active is false", async () => {
    const inactiveFlags: Definitions = {
      disabled: {
        active: false,
        variations: [{ value: "nope" }],
      },
    };
    const data = await MemoryData.fromObject({ definitions: inactiveFlags });
    await expect(
      showwhat({ key: "disabled", context: { env: "prod" }, options: { data } }),
    ).rejects.toThrow(DefinitionInactiveError);
  });

  it("resolves normally when active is undefined via showwhat", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const result = await showwhat({
      key: "checkout_v2",
      context: { env: "prod" },
      options: { data },
    });
    expect(result.value).toBe(true);
  });

  it("resolves normally when active is true via showwhat", async () => {
    const activeFlags: Definitions = {
      enabled: {
        active: true,
        variations: [{ value: "yes" }],
      },
    };
    const data = await MemoryData.fromObject({ definitions: activeFlags });
    const result = await showwhat({
      key: "enabled",
      context: { env: "prod" },
      options: { data },
    });
    expect(result.value).toBe("yes");
  });

  it("works with any DefinitionReader implementation", async () => {
    let callCount = 0;
    const data = {
      async get(key: string) {
        callCount++;
        return flags[key] ?? null;
      },
      async getAll() {
        return flags;
      },
    };
    await showwhat({ key: "checkout_v2", context: { env: "prod" }, options: { data } });
    await showwhat({ key: "checkout_v2", context: { env: "prod" }, options: { data } });
    expect(callCount).toBe(2); // data.get called on every invocation
  });
});

describe("resolve", () => {
  it("resolves all flags for a given context", async () => {
    const data = await MemoryData.fromObject({ definitions: flags });
    const definitions = await data.getAll();
    const all = await resolve({ definitions, context: { env: "prod" } });
    expect(all["checkout_v2"].value).toBe(true);
    expect(all["max_upload_mb"].value).toBe(50);
    expect(Object.keys(all)).toHaveLength(Object.keys(flags).length);
  });
});

describe("showwhat - error surfaces", () => {
  it("surfaces DefinitionReader.get() errors", async () => {
    const data = {
      async get() {
        throw new Error("connection failed");
      },
      async getAll() {
        return {};
      },
    };
    await expect(
      showwhat({ key: "any", context: { env: "prod" }, options: { data } }),
    ).rejects.toThrow("connection failed");
  });
});

describe("noConditionEvaluator", () => {
  it("always returns false", async () => {
    const result = await noConditionEvaluator({
      condition: {},
      context: { env: "prod" },
      annotations: {},
    });
    expect(result).toBe(false);
  });
});

describe("extendEvaluators", () => {
  it("throws when attempting to register reserved 'and' type", () => {
    const dummy: ConditionEvaluator = async () => true;
    expect(() => extendEvaluators({ and: dummy })).toThrow(
      'Cannot register reserved condition type "and"',
    );
  });

  it("throws when attempting to register reserved 'or' type", () => {
    const dummy: ConditionEvaluator = async () => true;
    expect(() => extendEvaluators({ or: dummy })).toThrow(
      'Cannot register reserved condition type "or"',
    );
  });

  it("allows overriding built-in non-reserved types like string", () => {
    const custom: ConditionEvaluator = async () => true;
    const extended = extendEvaluators({ string: custom });
    expect(extended.string).toBe(custom);
  });
});
