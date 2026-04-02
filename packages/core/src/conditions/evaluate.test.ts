import { describe, it, expect } from "vitest";
import { ConditionSchema } from "../schemas/condition.js";
import { builtinEvaluators, FALLBACK_EVALUATOR_KEY } from "./index.js";
import type { ConditionEvaluator, ConditionEvaluators } from "./index.js";
import { evaluateCondition } from "./evaluate.js";

describe("composite condition schema validation", () => {
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
      const evaluators = { ...builtinEvaluators, tracker };

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
      const evaluators = { ...builtinEvaluators, tracker };

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

    it("uses custom depth as root when provided", async () => {
      const depths: string[] = [];
      const tracker: ConditionEvaluator = async ({ depth }) => {
        depths.push(depth);
        return true;
      };
      const evaluators = { ...builtinEvaluators, tracker };

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

  it("throws UnknownConditionTypeError for unknown condition types", async () => {
    const { UnknownConditionTypeError } = await import("../errors.js");
    await expect(
      evaluateCondition({
        condition: { type: "unknown" },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      }),
    ).rejects.toThrow(UnknownConditionTypeError);
  });

  it("uses extended evaluators for custom condition types", async () => {
    const alwaysTrue: ConditionEvaluator = async () => true;
    const extended = { ...builtinEvaluators, custom: alwaysTrue };
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

  describe("deps threading", () => {
    it("passes deps to leaf evaluators", async () => {
      let receivedDeps: unknown;
      const spy: ConditionEvaluator = async ({ deps }) => {
        receivedDeps = deps;
        return true;
      };
      const evaluators = { ...builtinEvaluators, spy };

      await evaluateCondition({
        condition: { type: "spy" },
        context: ctx,
        evaluators,
        annotations: {},
        deps: { hash: (id: string) => id.length },
      });

      expect(receivedDeps).toEqual({ hash: expect.any(Function) });
    });

    it("defaults deps to empty object when omitted", async () => {
      let receivedDeps: unknown;
      const spy: ConditionEvaluator = async ({ deps }) => {
        receivedDeps = deps;
        return true;
      };
      const evaluators = { ...builtinEvaluators, spy };

      await evaluateCondition({
        condition: { type: "spy" },
        context: ctx,
        evaluators,
        annotations: {},
      });

      expect(receivedDeps).toEqual({});
    });

    it("threads deps through nested composites", async () => {
      const received: unknown[] = [];
      const spy: ConditionEvaluator = async ({ deps }) => {
        received.push(deps);
        return true;
      };
      const evaluators = { ...builtinEvaluators, spy };
      const myDeps = { hash: (id: string) => id.length };

      await evaluateCondition({
        condition: {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [{ type: "spy" }],
            },
            { type: "spy" },
          ],
        },
        context: ctx,
        evaluators,
        annotations: {},
        deps: myDeps,
      });

      expect(received).toHaveLength(2);
      expect(received[0]).toBe(myDeps);
      expect(received[1]).toBe(myDeps);
    });
  });

  describe("FALLBACK_EVALUATOR_KEY", () => {
    it("uses fallback when condition type is not in evaluators", async () => {
      const fallback: ConditionEvaluator = async () => true;
      const evaluators: ConditionEvaluators = {
        ...builtinEvaluators,
        [FALLBACK_EVALUATOR_KEY]: fallback,
      };

      const result = await evaluateCondition({
        condition: { type: "nonexistent" },
        context: ctx,
        evaluators,
        annotations: {},
      });
      expect(result).toBe(true);
    });

    it("named evaluator takes precedence over fallback", async () => {
      const calls: string[] = [];
      const named: ConditionEvaluator = async () => {
        calls.push("named");
        return true;
      };
      const fallback: ConditionEvaluator = async () => {
        calls.push("fallback");
        return false;
      };
      const evaluators: ConditionEvaluators = {
        ...builtinEvaluators,
        custom: named,
        [FALLBACK_EVALUATOR_KEY]: fallback,
      };

      await evaluateCondition({
        condition: { type: "custom" },
        context: ctx,
        evaluators,
        annotations: {},
      });
      expect(calls).toEqual(["named"]);
    });

    it("fallback receives the original condition object", async () => {
      let received: unknown;
      const fallback: ConditionEvaluator = async ({ condition }) => {
        received = condition;
        return true;
      };
      const evaluators: ConditionEvaluators = {
        ...builtinEvaluators,
        [FALLBACK_EVALUATOR_KEY]: fallback,
      };
      const condition = { type: "custom_type", extra: "data" };

      await evaluateCondition({
        condition,
        context: ctx,
        evaluators,
        annotations: {},
      });
      expect(received).toBe(condition);
    });

    it("fallback integrates with AND — all children evaluated", async () => {
      const depths: string[] = [];
      const tracker: ConditionEvaluator = async ({ depth }) => {
        depths.push(depth);
        return true;
      };
      const fallback: ConditionEvaluator = async ({ depth }) => {
        depths.push(`fallback:${depth}`);
        return true;
      };
      const evaluators: ConditionEvaluators = {
        ...builtinEvaluators,
        tracker,
        [FALLBACK_EVALUATOR_KEY]: fallback,
      };

      await evaluateCondition({
        condition: {
          type: "and",
          conditions: [{ type: "unknown_custom" }, { type: "tracker" }],
        },
        context: ctx,
        evaluators,
        annotations: {},
      });

      expect(depths).toEqual(["fallback:0", "1"]);
    });

    it("throws when no fallback and unknown type", async () => {
      const { UnknownConditionTypeError } = await import("../errors.js");
      await expect(
        evaluateCondition({
          condition: { type: "nonexistent" },
          context: ctx,
          evaluators: builtinEvaluators,
          annotations: {},
        }),
      ).rejects.toThrow(UnknownConditionTypeError);
    });
  });
});
