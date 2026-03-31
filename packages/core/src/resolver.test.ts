import { describe, it, expect, beforeAll } from "vitest";
import { resolve, resolveVariation } from "./resolver.js";
import type { ResolverOptions } from "./resolver.js";
import type { Context, Definitions, Resolution } from "./schemas/index.js";
import { parseYaml } from "./parsers.js";
import {
  DefinitionInactiveError,
  DefinitionNotFoundError,
  InvalidContextError,
  VariationNotFoundError,
} from "./errors.js";
import { builtinEvaluators } from "./conditions/index.js";
import type { Annotations, ConditionEvaluator } from "./conditions/index.js";

async function resolveOne(
  key: string,
  {
    definitions,
    context,
    options,
  }: { definitions: Definitions; context: Context; options?: ResolverOptions },
): Promise<Resolution> {
  const opts = { evaluators: builtinEvaluators, ...options };
  const result = (
    await resolve({ definitions: { [key]: definitions[key] }, context, options: opts })
  )[key];
  if (!result.success) {
    throw result.error;
  }
  return result;
}

const yaml = `
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            op: eq
            value: [prod, staging]
      - value: false

  global_notice:
    variations:
      - value: true

  maintenance_banner:
    variations:
      - value: "Deployment at 2am UTC"
        conditions:
          - type: env
            op: eq
            value: prod
          - type: startAt
            value: "2026-03-03T02:00:00Z"
          - type: endAt
            value: "2026-03-03T07:00:00Z"
      - value: "Normal ops"
        conditions:
          - type: env
            op: eq
            value: prod
      - value: null

  max_upload_mb:
    variations:
      - value: 50
        conditions:
          - type: env
            op: eq
            value: prod
      - value: 25
        conditions:
          - type: env
            op: eq
            value: staging
      - value: 10

  beta_feature:
    variations:
      - value: true
        conditions:
          - type: env
            op: eq
            value: [prod, staging]
      - value: false

  api_config:
    variations:
      - value:
          url: "https://api.example.com"
          timeout: 5000
        conditions:
          - type: env
            op: eq
            value: prod
      - value:
          url: "https://staging-api.example.com"
          timeout: 10000

  region_flag:
    variations:
      - value: "us-specific"
        conditions:
          - type: string
            key: region
            op: eq
            value: us-east-1
      - value: "eu-specific"
        conditions:
          - type: string
            key: region
            op: in
            value: [eu-west-1, eu-central-1]
      - value: "default"

  tenant_flag:
    variations:
      - value: true
        conditions:
          - type: string
            key: tenant
            op: regex
            value: "^acme-.*"
      - value: false
`;

let flags: Definitions;

beforeAll(async () => {
  const fileFormat = await parseYaml(yaml);
  flags = fileFormat.definitions;
});

describe("env alias resolution", () => {
  it("resolves an explicit env match", async () => {
    expect(
      (
        await resolveOne("checkout_v2", {
          definitions: flags,
          context: { env: "prod" },
        })
      ).value,
    ).toBe(true);
    expect(
      (
        await resolveOne("checkout_v2", {
          definitions: flags,
          context: { env: "staging" },
        })
      ).value,
    ).toBe(true);
  });

  it("falls through to catch-all", async () => {
    const r = await resolveOne("checkout_v2", {
      definitions: flags,
      context: { env: "dev" },
    });
    expect(r.value).toBe(false);
    expect(r.meta.variation.conditionCount).toBe(0);
  });

  it("resolves catch-all with no conditions", async () => {
    const r = await resolveOne("global_notice", {
      definitions: flags,
      context: { env: "any-env" },
    });
    expect(r.value).toBe(true);
    expect(r.meta.variation.conditionCount).toBe(0);
  });

  it("does not throw DefinitionNotFoundError for unlisted env with no catch-all", async () => {
    await expect(
      resolveOne("api_config", { definitions: flags, context: { env: "preview" } }),
    ).resolves.toBeDefined();
  });
});

describe("string match resolution", () => {
  it("matches exact context key", async () => {
    const r = await resolveOne("region_flag", {
      definitions: flags,
      context: { env: "prod", region: "us-east-1" },
    });
    expect(r.value).toBe("us-specific");
    expect(r.meta.variation.conditionCount).toBe(1);
  });

  it("matches one of the values with in op", async () => {
    expect(
      (
        await resolveOne("region_flag", {
          definitions: flags,
          context: { env: "prod", region: "eu-west-1" },
        })
      ).value,
    ).toBe("eu-specific");
    expect(
      (
        await resolveOne("region_flag", {
          definitions: flags,
          context: { env: "prod", region: "eu-central-1" },
        })
      ).value,
    ).toBe("eu-specific");
  });

  it("falls through to catch-all when no match", async () => {
    const r = await resolveOne("region_flag", {
      definitions: flags,
      context: { env: "prod", region: "ap-southeast-1" },
    });
    expect(r.value).toBe("default");
    expect(r.meta.variation.conditionCount).toBe(0);
  });

  it("does not match when context key is missing", async () => {
    const r = await resolveOne("region_flag", {
      definitions: flags,
      context: { env: "prod" },
    });
    expect(r.value).toBe("default");
    expect(r.meta.variation.conditionCount).toBe(0);
  });

  it("matches regex pattern", async () => {
    expect(
      (
        await resolveOne("tenant_flag", {
          definitions: flags,
          context: { env: "prod", tenant: "acme-corp" },
        })
      ).value,
    ).toBe(true);
    expect(
      (
        await resolveOne("tenant_flag", {
          definitions: flags,
          context: { env: "prod", tenant: "acme-labs" },
        })
      ).value,
    ).toBe(true);
  });

  it("regex does not match non-matching value", async () => {
    expect(
      (
        await resolveOne("tenant_flag", {
          definitions: flags,
          context: { env: "prod", tenant: "other-corp" },
        })
      ).value,
    ).toBe(false);
  });
});

describe("condition-based resolution", () => {
  it("matches first passing entry", async () => {
    const result = await resolveVariation({
      variations: flags["maintenance_banner"].variations,
      context: { env: "prod", at: "2025-01-01T00:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("Normal ops");
    expect(result!.variationIndex).toBe(1);
  });

  it("matches a time-bounded entry when inside window", async () => {
    const result = await resolveVariation({
      variations: flags["maintenance_banner"].variations,
      context: { env: "prod", at: "2026-03-03T03:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("Deployment at 2am UTC");
    expect(result!.variationIndex).toBe(0);
  });

  it("does not match until boundary (exclusive)", async () => {
    const result = await resolveVariation({
      variations: flags["maintenance_banner"].variations,
      context: { env: "prod", at: "2026-03-03T07:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("Normal ops");
  });

  it("matches from boundary (inclusive)", async () => {
    const result = await resolveVariation({
      variations: flags["maintenance_banner"].variations,
      context: { env: "prod", at: "2026-03-03T02:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("Deployment at 2am UTC");
  });

  it("matches catch-all when no conditions pass", async () => {
    const r = await resolveOne("maintenance_banner", {
      definitions: flags,
      context: { env: "dev" },
    });
    expect(r.value).toBe(null);
    expect(r.meta.variation.conditionCount).toBe(0);
    expect(r.meta.variation.index).toBe(2);
  });

  it("evaluate returns null when no variation matches", async () => {
    const result = await resolveVariation({
      variations: [
        { value: "a", conditions: [{ type: "env" as const, op: "eq" as const, value: "prod" }] },
        { value: "b", conditions: [{ type: "env" as const, op: "eq" as const, value: "staging" }] },
      ],
      context: { env: "dev" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result).toBeNull();
  });

  it("treats explicit empty conditions as catch-all", async () => {
    const result = await resolveVariation({
      variations: [{ value: "invalid", conditions: [] }, { value: "fallback" }],
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("invalid");
    expect(result!.variationIndex).toBe(0);
  });

  it("throws for unknown condition type", async () => {
    await expect(
      resolveVariation({
        variations: [
          {
            value: "x",
            conditions: [{ type: "nonexistent_rule" as never, value: "anything" }],
          },
        ],
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow('Unknown condition type "nonexistent_rule"');
  });

  it("resolves number catch-all default", async () => {
    expect(
      (
        await resolveOne("max_upload_mb", {
          definitions: flags,
          context: { env: "preview" },
        })
      ).value,
    ).toBe(10);
  });

  it("resolves multi-env array condition", async () => {
    expect(
      (
        await resolveOne("beta_feature", {
          definitions: flags,
          context: { env: "prod" },
        })
      ).value,
    ).toBe(true);
    expect(
      (
        await resolveOne("beta_feature", {
          definitions: flags,
          context: { env: "staging" },
        })
      ).value,
    ).toBe(true);
    expect(
      (
        await resolveOne("beta_feature", {
          definitions: flags,
          context: { env: "dev" },
        })
      ).value,
    ).toBe(false);
  });

  it("resolves object value", async () => {
    const r = await resolveOne("api_config", {
      definitions: flags,
      context: { env: "prod" },
    });
    expect(r.meta.variation.conditionCount).toBe(1);
    expect(r.value).toMatchObject({
      url: "https://api.example.com",
      timeout: 5000,
    });
  });
});

describe("missing key", () => {
  it("throws DefinitionNotFoundError", async () => {
    await expect(
      resolveOne("nonexistent", { definitions: flags, context: { env: "prod" } }),
    ).rejects.toThrow(DefinitionNotFoundError);
  });
});

describe("no matching variation", () => {
  it("throws VariationNotFoundError when no variation matches", async () => {
    const noFallback: Definitions = {
      strict: {
        variations: [
          { value: "a", conditions: [{ type: "env", op: "eq", value: "prod" }] },
          { value: "b", conditions: [{ type: "env", op: "eq", value: "staging" }] },
        ],
      },
    };
    await expect(
      resolveOne("strict", { definitions: noFallback, context: { env: "dev" } }),
    ).rejects.toThrow(VariationNotFoundError);
  });

  it("returns ResolutionError in resolve when no variation matches", async () => {
    const noFallback: Definitions = {
      strict: {
        variations: [{ value: "a", conditions: [{ type: "env", op: "eq", value: "prod" }] }],
      },
    };
    const result = await resolve({
      definitions: noFallback,
      context: { env: "dev" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result["strict"].success).toBe(false);
    if (!result["strict"].success)
      expect(result["strict"].error).toBeInstanceOf(VariationNotFoundError);
  });
});

describe("inactive definition", () => {
  it("returns ResolutionError when active is false", async () => {
    const defs: Definitions = {
      disabled: {
        active: false,
        variations: [{ value: "should not resolve" }],
      },
    };
    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result["disabled"].success).toBe(false);
    if (!result["disabled"].success)
      expect(result["disabled"].error).toBeInstanceOf(DefinitionInactiveError);
  });

  it("resolves normally when active is undefined", async () => {
    const defs: Definitions = {
      noActive: {
        variations: [{ value: "works" }],
      },
    };
    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result["noActive"].success).toBe(true);
    expect((result["noActive"] as Resolution).value).toBe("works");
  });

  it("resolves normally when active is true", async () => {
    const defs: Definitions = {
      enabled: {
        active: true,
        variations: [{ value: "works" }],
      },
    };
    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result["enabled"].success).toBe(true);
    expect((result["enabled"] as Resolution).value).toBe("works");
  });
});

describe("resolve errors", () => {
  it("returns ResolutionError when a key maps to undefined", async () => {
    const definitions = { broken: undefined } as unknown as Definitions;
    const result = await resolve({
      definitions,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result["broken"].success).toBe(false);
    if (!result["broken"].success)
      expect(result["broken"].error).toBeInstanceOf(DefinitionNotFoundError);
  });
});

describe("resolve", () => {
  it("resolves every flag for a given context", async () => {
    const all = await resolve({
      definitions: flags,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(all["checkout_v2"].success).toBe(true);
    expect((all["checkout_v2"] as Resolution).value).toBe(true);
    expect((all["max_upload_mb"] as Resolution).value).toBe(50);
    expect((all["beta_feature"] as Resolution).value).toBe(true);
    expect(Object.keys(all)).toHaveLength(Object.keys(flags).length);
  });

  it("returns null for flags with no matching condition and no fallback", async () => {
    const all = await resolve({
      definitions: flags,
      context: { env: "preview" },
      options: { evaluators: builtinEvaluators },
    });
    expect((all["max_upload_mb"] as Resolution).value).toBe(10);
  });

  it("returns mixed successes and errors without failing the batch", async () => {
    const mixed: Definitions = {
      good: { variations: [{ value: "ok" }] },
      inactive: { active: false, variations: [{ value: "nope" }] },
    };
    const result = await resolve({
      definitions: mixed,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result["good"].success).toBe(true);
    expect((result["good"] as Resolution).value).toBe("ok");
    expect(result["inactive"].success).toBe(false);
    if (!result["inactive"].success)
      expect(result["inactive"].error).toBeInstanceOf(DefinitionInactiveError);
  });
});

describe("custom condition evaluators", () => {
  it("uses a custom evaluator when provided via options", async () => {
    const thresholdEvaluator: ConditionEvaluator = async ({ condition, context }) => {
      const c = condition as { threshold: number };
      return Number((context as Record<string, unknown>).score) >= c.threshold;
    };
    const customEvaluators = { ...builtinEvaluators, threshold: thresholdEvaluator };

    const result = await resolveVariation({
      variations: [
        { value: "premium", conditions: [{ type: "threshold", threshold: 80 } as never] },
        { value: "standard" },
      ],
      context: { score: "90" } as never,
      options: { evaluators: customEvaluators },
    });
    expect(result!.variation.value).toBe("premium");
  });

  it("throws for unknown custom condition types", async () => {
    await expect(
      resolveVariation({
        variations: [
          { value: "x", conditions: [{ type: "unknown_custom" as never, value: "anything" }] },
          { value: "fallback" },
        ],
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow('Unknown condition type "unknown_custom"');
  });

  it("uses fallback evaluator for unknown custom condition types", async () => {
    const fallback: ConditionEvaluator = async () => true;
    const result = await resolveVariation({
      variations: [
        { value: "matched", conditions: [{ type: "unknown_custom" as never, value: "anything" }] },
        { value: "fallback" },
      ],
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators, fallback },
    });
    expect(result!.variation.value).toBe("matched");
  });

  it("fallback returning false skips variation", async () => {
    const fallback: ConditionEvaluator = async () => false;
    const result = await resolveVariation({
      variations: [
        { value: "guarded", conditions: [{ type: "unknown_custom" as never, value: "anything" }] },
        { value: "default" },
      ],
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators, fallback },
    });
    expect(result!.variation.value).toBe("default");
  });

  it("custom evaluators preserve built-ins", async () => {
    const myEvaluator: ConditionEvaluator = async () => true;
    const extended = { ...builtinEvaluators, custom: myEvaluator };

    const result = await resolveVariation({
      variations: [
        { value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] },
        { value: false },
      ],
      context: { env: "prod" },
      options: { evaluators: extended },
    });
    expect(result!.variation.value).toBe(true);
  });
});

describe("composite condition evaluation", () => {
  describe("AND", () => {
    it("matches when all children pass", async () => {
      const result = await resolveVariation({
        variations: [
          {
            value: "matched",
            conditions: [
              {
                type: "and" as const,
                conditions: [
                  { type: "env" as const, op: "eq" as const, value: "prod" },
                  {
                    type: "string" as const,
                    key: "userId",
                    op: "eq" as const,
                    value: "user-1",
                  },
                ],
              },
            ],
          },
          { value: "fallback" },
        ],
        context: { env: "prod", userId: "user-1" },
        options: { evaluators: builtinEvaluators },
      });
      expect(result!.variation.value).toBe("matched");
    });

    it("short-circuits and skips when any child fails", async () => {
      const result = await resolveVariation({
        variations: [
          {
            value: "matched",
            conditions: [
              {
                type: "and" as const,
                conditions: [
                  { type: "env" as const, op: "eq" as const, value: "prod" },
                  { type: "env" as const, op: "eq" as const, value: "staging" },
                ],
              },
            ],
          },
          { value: "fallback" },
        ],
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      });
      expect(result!.variation.value).toBe("fallback");
    });
  });

  describe("OR", () => {
    it("matches when any child passes", async () => {
      const result = await resolveVariation({
        variations: [
          {
            value: "matched",
            conditions: [
              {
                type: "or" as const,
                conditions: [
                  { type: "env" as const, op: "eq" as const, value: "staging" },
                  { type: "env" as const, op: "eq" as const, value: "prod" },
                ],
              },
            ],
          },
          { value: "fallback" },
        ],
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      });
      expect(result!.variation.value).toBe("matched");
    });

    it("skips when all children fail", async () => {
      const result = await resolveVariation({
        variations: [
          {
            value: "matched",
            conditions: [
              {
                type: "or" as const,
                conditions: [
                  { type: "env" as const, op: "eq" as const, value: "staging" },
                  { type: "env" as const, op: "eq" as const, value: "preview" },
                ],
              },
            ],
          },
          { value: "fallback" },
        ],
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      });
      expect(result!.variation.value).toBe("fallback");
    });
  });

  describe("nesting", () => {
    it("evaluates and(or(leaf, leaf), leaf)", async () => {
      const result = await resolveVariation({
        variations: [
          {
            value: "matched",
            conditions: [
              {
                type: "and" as const,
                conditions: [
                  {
                    type: "or" as const,
                    conditions: [
                      { type: "env" as const, op: "eq" as const, value: "prod" },
                      { type: "env" as const, op: "eq" as const, value: "staging" },
                    ],
                  },
                  {
                    type: "string" as const,
                    key: "userId",
                    op: "eq" as const,
                    value: "beta-123",
                  },
                ],
              },
            ],
          },
          { value: "fallback" },
        ],
        context: { env: "staging", userId: "beta-123" },
        options: { evaluators: builtinEvaluators },
      });
      expect(result!.variation.value).toBe("matched");
    });
  });

  describe("composites with custom evaluators", () => {
    it("works alongside a custom evaluator", async () => {
      const scoreEvaluator: ConditionEvaluator = async ({ condition, context }) => {
        const c = condition as { threshold: number };
        return Number((context as Record<string, unknown>)["score"]) >= c.threshold;
      };
      const customEvaluators = { ...builtinEvaluators, score: scoreEvaluator };

      const result = await resolveVariation({
        variations: [
          {
            value: "premium",
            conditions: [
              {
                type: "or" as const,
                conditions: [
                  { type: "env" as const, op: "eq" as const, value: "prod" },
                  { type: "score", threshold: 80 } as never,
                ],
              },
            ],
          },
          { value: "standard" },
        ],
        context: { env: "dev", score: "90" } as never,
        options: { evaluators: customEvaluators },
      });
      expect(result!.variation.value).toBe("premium");
    });
  });
});

describe("ctx.at evaluation time", () => {
  it("uses ctx.at when provided as ISO string", async () => {
    const result = await resolveVariation({
      variations: flags["maintenance_banner"].variations,
      context: { env: "prod", at: "2026-03-03T03:00:00Z" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("Deployment at 2am UTC");
  });

  it("skips time-bounded variation when ctx.at is absent", async () => {
    // Without ctx.at, startAt/endAt conditions return false, so the time-bounded variation is skipped
    const result = await resolveVariation({
      variations: flags["maintenance_banner"].variations,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(result!.variation.value).toBe("Normal ops");
  });

  it("throws InvalidContextError when ctx.at is invalid", async () => {
    await expect(
      resolveVariation({
        variations: flags["maintenance_banner"].variations,
        context: { env: "prod", at: "not-a-date" },
        options: { evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow(InvalidContextError);
  });
});

describe("deps threading", () => {
  it("passes deps to custom evaluators via resolveVariation", async () => {
    let receivedDeps: unknown;
    const hashEvaluator: ConditionEvaluator = async ({ condition, deps }) => {
      receivedDeps = deps;
      const c = condition as { threshold: number };
      const hash = (deps as { hash: (id: string) => number }).hash;
      return hash("user-1") % 100 < c.threshold;
    };
    const evaluators = { ...builtinEvaluators, rollout: hashEvaluator };
    const myDeps = { hash: (id: string) => id.length };

    const result = await resolveVariation({
      variations: [
        { value: "treatment", conditions: [{ type: "rollout", threshold: 50 } as never] },
        { value: "control" },
      ],
      context: { env: "prod" },
      deps: myDeps,
      options: { evaluators },
    });

    expect(receivedDeps).toBe(myDeps);
    expect(result!.variation.value).toBe("treatment");
  });

  it("defaults deps to empty object in resolveVariation", async () => {
    let receivedDeps: unknown;
    const spy: ConditionEvaluator = async ({ deps }) => {
      receivedDeps = deps;
      return true;
    };
    const evaluators = { ...builtinEvaluators, spy };

    await resolveVariation({
      variations: [{ value: "a", conditions: [{ type: "spy" } as never] }],
      context: { env: "prod" },
      options: { evaluators },
    });

    expect(receivedDeps).toEqual({});
  });

  it("passes deps through resolve", async () => {
    let receivedDeps: unknown;
    const spy: ConditionEvaluator = async ({ deps }) => {
      receivedDeps = deps;
      return true;
    };
    const evaluators = { ...builtinEvaluators, spy };
    const myDeps = { fetch: async () => [] };
    const defs: Definitions = {
      flag: { variations: [{ value: true, conditions: [{ type: "spy" } as never] }] },
    };

    await resolve({
      definitions: defs,
      context: { env: "prod" },
      deps: myDeps,
      options: { evaluators },
    });

    expect(receivedDeps).toBe(myDeps);
  });

  it("matchAnnotations condition verifies annotations written by a previous evaluator", async () => {
    const rolloutEvaluator: ConditionEvaluator = async ({ condition, annotations }) => {
      const c = condition as { threshold: number };
      const bucket = 42;
      annotations.bucket = bucket;
      annotations.threshold = c.threshold;
      return bucket < c.threshold;
    };
    const evaluators = { ...builtinEvaluators, rollout: rolloutEvaluator };

    const result = await resolveVariation({
      variations: [
        {
          value: "treatment",
          conditions: [
            { type: "rollout", threshold: 80 } as never,
            {
              type: "matchAnnotations" as const,
              conditions: [
                { type: "number" as const, key: "bucket", op: "gte" as const, value: 0 },
                { type: "number" as const, key: "threshold", op: "eq" as const, value: 80 },
              ],
            },
          ],
        },
        { value: "control" },
      ],
      context: { env: "prod" },
      options: { evaluators },
    });

    expect(result!.variation.value).toBe("treatment");
    expect(result!.annotations.bucket).toBe(42);
    expect(result!.annotations.threshold).toBe(80);
  });

  it("matchAnnotations condition causes variation to fail when verification fails", async () => {
    const tagEvaluator: ConditionEvaluator = async ({ annotations }) => {
      annotations.source = "experiment";
      return true;
    };
    const evaluators = { ...builtinEvaluators, tag: tagEvaluator };

    const result = await resolveVariation({
      variations: [
        {
          value: "treatment",
          conditions: [
            { type: "tag" } as never,
            {
              type: "matchAnnotations" as const,
              conditions: [
                { type: "string" as const, key: "source", op: "eq" as const, value: "rollout" },
              ],
            },
          ],
        },
        { value: "control" },
      ],
      context: { env: "prod" },
      options: { evaluators },
    });

    expect(result!.variation.value).toBe("control");
  });

  it("custom evaluator uses deps.hash and writes to annotations", async () => {
    const rolloutEvaluator: ConditionEvaluator = async ({
      condition,
      context,
      deps,
      annotations,
    }) => {
      const c = condition as { threshold: number };
      const hash = (deps as { hash: (id: string) => number }).hash;
      const userId = String((context as Record<string, unknown>).userId);
      const bucket = hash(userId) % 100;
      annotations.rollout = { bucket, threshold: c.threshold };
      return bucket < c.threshold;
    };
    const evaluators = { ...builtinEvaluators, rollout: rolloutEvaluator };
    const myDeps = { hash: (id: string) => id.length * 10 };

    const result = await resolveVariation({
      variations: [
        { value: "treatment", conditions: [{ type: "rollout", threshold: 80 } as never] },
        { value: "control" },
      ],
      context: { env: "prod", userId: "user-42" } as never,
      deps: myDeps,
      options: { evaluators },
    });

    expect(result!.variation.value).toBe("treatment");
    expect(result!.annotations).toEqual({
      rollout: { bucket: 70, threshold: 80 },
    });
  });
});

describe("createAnnotations", () => {
  it("seeds annotations from createAnnotations option via resolve", async () => {
    const rolloutEvaluator: ConditionEvaluator = async ({ condition, annotations }) => {
      const c = condition as { threshold: number };
      return (annotations.bucket as number) < c.threshold;
    };
    const evaluators = { ...builtinEvaluators, rollout: rolloutEvaluator };

    const defs: Definitions = {
      flag: {
        variations: [
          { value: "treatment", conditions: [{ type: "rollout", threshold: 80 } as never] },
          { value: "control" },
        ],
      },
    };

    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: {
        evaluators,
        createAnnotations: () => ({ bucket: 42 }),
      },
    });

    expect(result["flag"].success).toBe(true);
    expect((result["flag"] as Resolution).value).toBe("treatment");
    expect((result["flag"] as Resolution).meta.annotations).toMatchObject({ bucket: 42 });
  });

  it("receives the definition key in the factory", async () => {
    const receivedKeys: string[] = [];

    const defs: Definitions = {
      alpha: { variations: [{ value: "a" }] },
      beta: { variations: [{ value: "b" }] },
    };

    await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: {
        evaluators: builtinEvaluators,
        createAnnotations: (definitionKey) => {
          if (definitionKey) receivedKeys.push(definitionKey);
          return {};
        },
      },
    });

    expect(receivedKeys).toContain("alpha");
    expect(receivedKeys).toContain("beta");
  });

  it("varies seed annotations per definition key", async () => {
    const defs: Definitions = {
      alpha: { variations: [{ value: "a" }] },
      beta: { variations: [{ value: "b" }] },
    };

    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: {
        evaluators: builtinEvaluators,
        createAnnotations: (definitionKey) =>
          definitionKey === "alpha" ? { source: "test-a" } : { source: "test-b" },
      },
    });

    expect((result["alpha"] as Resolution).meta.annotations).toMatchObject({ source: "test-a" });
    expect((result["beta"] as Resolution).meta.annotations).toMatchObject({ source: "test-b" });
  });

  it("produces fresh annotations per variation (no bleed)", async () => {
    const spy: ConditionEvaluator = async ({ annotations }) => {
      annotations.seen = true;
      return false; // always fail so we iterate through all variations
    };

    const seenAnnotations: Annotations[] = [];
    const result = await resolveVariation({
      variations: [
        { value: "a", conditions: [{ type: "spy" } as never] },
        { value: "b", conditions: [{ type: "spy" } as never] },
        { value: "fallback" },
      ],
      context: { env: "prod" },
      options: {
        evaluators: { ...builtinEvaluators, spy },
        createAnnotations: () => {
          const a = { counter: 0 };
          seenAnnotations.push(a);
          return a;
        },
      },
      definitionKey: "test",
    });

    // Each variation got its own fresh annotations object (2 failing + 1 catch-all)
    expect(seenAnnotations).toHaveLength(3);
    expect(seenAnnotations[0]).not.toBe(seenAnnotations[1]);
    expect(seenAnnotations[1]).not.toBe(seenAnnotations[2]);
    expect(result!.variation.value).toBe("fallback");
  });

  it("seeds annotations for catch-all variations with no conditions", async () => {
    const result = await resolveVariation({
      variations: [{ value: "fallback" }],
      context: { env: "prod" },
      options: {
        evaluators: builtinEvaluators,
        createAnnotations: () => ({ seeded: true }),
      },
      definitionKey: "test",
    });

    expect(result!.annotations).toMatchObject({ seeded: true });
  });

  it("evaluators can overwrite seeded annotation values", async () => {
    const writer: ConditionEvaluator = async ({ annotations }) => {
      annotations.bucket = 99;
      return true;
    };

    const result = await resolveVariation({
      variations: [{ value: "matched", conditions: [{ type: "writer" } as never] }],
      context: { env: "prod" },
      options: {
        evaluators: { ...builtinEvaluators, writer },
        createAnnotations: () => ({ bucket: 0 }),
      },
      definitionKey: "test",
    });

    expect(result!.annotations.bucket).toBe(99);
  });

  it("works with matchAnnotations to verify seeded values", async () => {
    const result = await resolveVariation({
      variations: [
        {
          value: "verified",
          conditions: [
            {
              type: "matchAnnotations" as const,
              conditions: [
                { type: "number" as const, key: "bucket", op: "eq" as const, value: 42 },
              ],
            },
          ],
        },
        { value: "fallback" },
      ],
      context: { env: "prod" },
      options: {
        evaluators: builtinEvaluators,
        createAnnotations: () => ({ bucket: 42 }),
      },
      definitionKey: "test",
    });

    expect(result!.variation.value).toBe("verified");
  });

  it("calls createAnnotations with undefined when definitionKey is not provided", async () => {
    let receivedKey: string | undefined = "sentinel";

    await resolveVariation({
      variations: [{ value: "fallback" }],
      context: { env: "prod" },
      options: {
        evaluators: builtinEvaluators,
        createAnnotations: (key) => {
          receivedKey = key;
          return {};
        },
      },
    });

    expect(receivedKey).toBeUndefined();
  });

  it("defaults to empty annotations when createAnnotations is not provided", async () => {
    const spy: ConditionEvaluator = async ({ annotations }) => {
      return Object.keys(annotations).length === 0;
    };
    const evaluators = { ...builtinEvaluators, spy };

    const result = await resolveVariation({
      variations: [
        { value: "empty", conditions: [{ type: "spy" } as never] },
        { value: "fallback" },
      ],
      context: { env: "prod" },
      options: { evaluators },
    });

    expect(result!.variation.value).toBe("empty");
  });
});

describe("strict evaluators", () => {
  it("returns ResolutionError for every key when no evaluators provided", async () => {
    const result = await resolve({ definitions: flags, context: { env: "prod" } });
    for (const entry of Object.values(result)) {
      expect(entry.success).toBe(false);
    }
  });

  it("wraps non-ShowwhatError rejections in ResolutionError", async () => {
    const defs: Definitions = {
      bad: {
        variations: [{ value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] }],
      },
    };
    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: {
        evaluators: {
          ...builtinEvaluators,
          env: async () => {
            throw new Error("unexpected");
          },
        },
      },
    });
    expect(result["bad"].success).toBe(false);
  });

  it("preserves the original error as cause when wrapping non-ShowwhatError", async () => {
    const original = new TypeError("cannot read property of undefined");
    const defs: Definitions = {
      bad: {
        variations: [{ value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] }],
      },
    };
    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
      options: {
        evaluators: {
          ...builtinEvaluators,
          env: async () => {
            throw original;
          },
        },
      },
    });
    expect(result["bad"].success).toBe(false);
    if (!result["bad"].success) {
      expect(result["bad"].error.cause).toBe(original);
    }
  });

  it("does not double-wrap ShowwhatError with cause", async () => {
    const defs: Definitions = {
      bad: {
        variations: [{ value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] }],
      },
    };
    const result = await resolve({
      definitions: defs,
      context: { env: "prod" },
    });
    expect(result["bad"].success).toBe(false);
    if (!result["bad"].success) {
      expect(result["bad"].error.cause).toBeUndefined();
    }
  });

  it("throws ShowwhatError for resolveVariation without evaluators", async () => {
    await expect(
      resolveVariation({
        variations: [{ value: true, conditions: [{ type: "env", op: "eq", value: "prod" }] }],
        context: { env: "prod" },
      }),
    ).rejects.toThrow("No evaluators registered");
  });
});
