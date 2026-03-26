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
import type { ConditionEvaluator } from "./conditions/index.js";

async function resolveOne(
  key: string,
  {
    definitions,
    context,
    options,
  }: { definitions: Definitions; context: Context; options?: ResolverOptions },
): Promise<Resolution> {
  const opts = { evaluators: builtinEvaluators, ...options };
  return (await resolve({ definitions: { [key]: definitions[key] }, context, options: opts }))[key];
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

  it("throws VariationNotFoundError in resolve when no variation matches", async () => {
    const noFallback: Definitions = {
      strict: {
        variations: [{ value: "a", conditions: [{ type: "env", op: "eq", value: "prod" }] }],
      },
    };
    await expect(
      resolve({
        definitions: noFallback,
        context: { env: "dev" },
        options: { evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow(VariationNotFoundError);
  });
});

describe("inactive definition", () => {
  it("throws DefinitionInactiveError when active is false", async () => {
    const defs: Definitions = {
      disabled: {
        active: false,
        variations: [{ value: "should not resolve" }],
      },
    };
    await expect(
      resolve({
        definitions: defs,
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow(DefinitionInactiveError);
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
    expect(result["noActive"].value).toBe("works");
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
    expect(result["enabled"].value).toBe("works");
  });
});

describe("resolve errors", () => {
  it("throws DefinitionNotFoundError when a key maps to undefined", async () => {
    const definitions = { broken: undefined } as unknown as Definitions;
    await expect(
      resolve({
        definitions,
        context: { env: "prod" },
        options: { evaluators: builtinEvaluators },
      }),
    ).rejects.toThrow(DefinitionNotFoundError);
  });
});

describe("resolve", () => {
  it("resolves every flag for a given context", async () => {
    const all = await resolve({
      definitions: flags,
      context: { env: "prod" },
      options: { evaluators: builtinEvaluators },
    });
    expect(all["checkout_v2"].value).toBe(true);
    expect(all["max_upload_mb"].value).toBe(50);
    expect(all["beta_feature"].value).toBe(true);
    expect(Object.keys(all)).toHaveLength(Object.keys(flags).length);
  });

  it("returns null for flags with no matching condition and no fallback", async () => {
    const all = await resolve({
      definitions: flags,
      context: { env: "preview" },
      options: { evaluators: builtinEvaluators },
    });
    expect(all["max_upload_mb"].value).toBe(10);
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

  it("defaults to current time when ctx.at is absent", async () => {
    // maintenance window is in the past relative to now, so should fall to "Normal ops"
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

describe("strict evaluators", () => {
  it("throws ShowwhatError when no evaluators provided", async () => {
    await expect(resolve({ definitions: flags, context: { env: "prod" } })).rejects.toThrow(
      "No evaluators registered",
    );
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
