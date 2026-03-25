import { describe, it, expect } from "vitest";
import { ConditionSchema } from "../schemas/condition.js";
import { builtinEvaluators, extendEvaluators } from "./index.js";
import type { ConditionEvaluator } from "./index.js";
import { evaluateCondition } from "./composite.js";

describe("composite condition schema validation", () => {
  describe("and", () => {
    it("accepts a valid and condition", () => {
      const result = ConditionSchema.safeParse({
        type: "and",
        conditions: [{ type: "env", op: "eq", value: "prod" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty conditions array", () => {
      const result = ConditionSchema.safeParse({ type: "and", conditions: [] });
      expect(result.success).toBe(false);
    });

    it("rejects missing conditions field", () => {
      const result = ConditionSchema.safeParse({ type: "and" });
      expect(result.success).toBe(false);
    });
  });

  describe("or", () => {
    it("accepts a valid or condition", () => {
      const result = ConditionSchema.safeParse({
        type: "or",
        conditions: [{ type: "env", op: "eq", value: "staging" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty conditions array", () => {
      const result = ConditionSchema.safeParse({ type: "or", conditions: [] });
      expect(result.success).toBe(false);
    });
  });

  describe("reserved type guard in open union", () => {
    it("rejects { type: 'and' } as a custom condition (reserved)", () => {
      const result = ConditionSchema.safeParse({ type: "and" });
      expect(result.success).toBe(false);
    });

    it("rejects { type: 'or' } as a custom condition (reserved)", () => {
      const result = ConditionSchema.safeParse({ type: "or" });
      expect(result.success).toBe(false);
    });
  });

  describe("deeply nested composites", () => {
    it("parses and(or(leaf, leaf), leaf)", () => {
      const result = ConditionSchema.safeParse({
        type: "and",
        conditions: [
          {
            type: "or",
            conditions: [
              { type: "env", op: "eq", value: "prod" },
              { type: "env", op: "eq", value: "staging" },
            ],
          },
          { type: "string", key: "userId", op: "eq", value: "user-123" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("evaluateCondition", () => {
  const ctx = { env: "prod", userId: "user-1" };

  describe("AND", () => {
    it("returns true when all children pass", async () => {
      const result = await evaluateCondition({
        condition: {
          type: "and",
          conditions: [
            { type: "env", op: "eq", value: "prod" },
            { type: "string", key: "userId", op: "eq", value: "user-1" },
          ],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      });
      expect(result).toBe(true);
    });

    it("short-circuits on first failing child", async () => {
      const result = await evaluateCondition({
        condition: {
          type: "and",
          conditions: [
            { type: "env", op: "eq", value: "staging" },
            { type: "env", op: "eq", value: "prod" },
          ],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      });
      expect(result).toBe(false);
    });
  });

  describe("OR", () => {
    it("returns true when any child passes", async () => {
      const result = await evaluateCondition({
        condition: {
          type: "or",
          conditions: [
            { type: "env", op: "eq", value: "staging" },
            { type: "env", op: "eq", value: "prod" },
          ],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      });
      expect(result).toBe(true);
    });

    it("returns false when all children fail", async () => {
      const result = await evaluateCondition({
        condition: {
          type: "or",
          conditions: [
            { type: "env", op: "eq", value: "staging" },
            { type: "env", op: "eq", value: "dev" },
          ],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      });
      expect(result).toBe(false);
    });
  });

  describe("nesting", () => {
    it("evaluates and(or(leaf, leaf), leaf)", async () => {
      const result = await evaluateCondition({
        condition: {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                { type: "env", op: "eq", value: "prod" },
                { type: "env", op: "eq", value: "staging" },
              ],
            },
            { type: "string", key: "userId", op: "eq", value: "user-1" },
          ],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      });
      expect(result).toBe(true);
    });
  });

  describe("depth tracking", () => {
    it("passes depth to leaf evaluators", async () => {
      const depths: string[] = [];
      const tracker: ConditionEvaluator = async ({ depth }) => {
        depths.push(depth);
        return true;
      };
      const evaluators = extendEvaluators({ tracker });

      await evaluateCondition({
        condition: {
          type: "and",
          conditions: [{ type: "tracker" }, { type: "tracker" }],
        },
        context: ctx,
        evaluators,
        annotations: {},
      });

      expect(depths).toEqual(["0", "1"]);
    });

    it("passes nested depth for and(or(leaf, leaf), leaf)", async () => {
      const depths: string[] = [];
      const tracker: ConditionEvaluator = async ({ depth }) => {
        depths.push(depth);
        return true;
      };
      const evaluators = extendEvaluators({ tracker });

      await evaluateCondition({
        condition: {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [{ type: "tracker" }, { type: "tracker" }],
            },
            { type: "tracker" },
          ],
        },
        context: ctx,
        evaluators,
        annotations: {},
      });

      // or short-circuits after first true, so only "0.0" from or + "1" from second and child
      expect(depths).toEqual(["0.0", "1"]);
    });

    it("passes depth to fallback evaluator", async () => {
      let receivedDepth = "";
      const fallback: ConditionEvaluator = async ({ depth }) => {
        receivedDepth = depth;
        return true;
      };

      await evaluateCondition({
        condition: {
          type: "and",
          conditions: [{ type: "env", op: "eq", value: "prod" }, { type: "custom-fallback" }],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
        fallback,
      });

      expect(receivedDepth).toBe("1");
    });

    it("uses custom depth as root when provided", async () => {
      const depths: string[] = [];
      const tracker: ConditionEvaluator = async ({ depth }) => {
        depths.push(depth);
        return true;
      };
      const evaluators = extendEvaluators({ tracker });

      await evaluateCondition({
        condition: {
          type: "and",
          conditions: [{ type: "tracker" }, { type: "tracker" }],
        },
        context: ctx,
        evaluators,
        annotations: {},
        depth: "2",
      });

      expect(depths).toEqual(["2.0", "2.1"]);
    });
  });

  it("throws for unknown condition types", async () => {
    await expect(
      evaluateCondition({
        condition: { type: "unknown" },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      }),
    ).rejects.toThrow('Unknown condition type "unknown".');
  });

  it("uses fallback evaluator for unknown condition types when provided", async () => {
    const fallback: ConditionEvaluator = async () => true;
    const result = await evaluateCondition({
      condition: { type: "unknown" },
      context: ctx,
      evaluators: builtinEvaluators,
      annotations: {},
      fallback,
    });
    expect(result).toBe(true);
  });

  it("fallback receives the condition object", async () => {
    const fallback: ConditionEvaluator = async ({ condition }) => {
      return (condition as { type: string }).type === "custom";
    };
    const result = await evaluateCondition({
      condition: { type: "custom" },
      context: ctx,
      evaluators: builtinEvaluators,
      annotations: {},
      fallback,
    });
    expect(result).toBe(true);
  });

  it("throws for unknown types even with no fallback", async () => {
    await expect(
      evaluateCondition({
        condition: { type: "unknown" },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      }),
    ).rejects.toThrow('Unknown condition type "unknown"');
  });

  it("uses extended evaluators for custom condition types", async () => {
    const alwaysTrue: ConditionEvaluator = async () => true;
    const extended = extendEvaluators({ custom: alwaysTrue });
    const result = await evaluateCondition({
      condition: {
        type: "or",
        conditions: [{ type: "env", op: "eq", value: "staging" }, { type: "custom" }],
      },
      context: ctx,
      evaluators: extended,
      annotations: {},
    });
    expect(result).toBe(true);
  });
});

describe("extendEvaluators reserved type guard", () => {
  const noop: ConditionEvaluator = async () => true;

  it("throws when registering 'and'", () => {
    expect(() => extendEvaluators({ and: noop } as never)).toThrow(
      'Cannot register reserved condition type "and"',
    );
  });

  it("throws when registering 'or'", () => {
    expect(() => extendEvaluators({ or: noop } as never)).toThrow(
      'Cannot register reserved condition type "or"',
    );
  });

  it("allows registering non-reserved custom types", () => {
    expect(() => extendEvaluators({ percent: noop })).not.toThrow();
  });
});
