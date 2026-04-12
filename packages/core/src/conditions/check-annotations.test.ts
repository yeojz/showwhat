import { describe, it, expect } from "vitest";
import { ConditionSchema } from "../schemas/condition.js";
import { builtinEvaluators } from "./index.js";
import type { ConditionEvaluator } from "./index.js";
import { evaluateCondition } from "./evaluate.js";

describe("checkAnnotations condition", () => {
  describe("schema validation", () => {
    it("accepts a valid checkAnnotations condition", () => {
      const result = ConditionSchema.safeParse({
        type: "checkAnnotations",
        conditions: [{ type: "string", key: "source", op: "eq", value: "rollout" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty conditions array", () => {
      const result = ConditionSchema.safeParse({ type: "checkAnnotations", conditions: [] });
      expect(result.success).toBe(false);
    });

    it("rejects missing conditions field", () => {
      const result = ConditionSchema.safeParse({ type: "checkAnnotations" });
      expect(result.success).toBe(false);
    });

    it("rejects { type: 'checkAnnotations' } as a custom condition (reserved)", () => {
      const result = ConditionSchema.safeParse({ type: "checkAnnotations" });
      expect(result.success).toBe(false);
    });
  });

  describe("evaluation", () => {
    const ctx = { env: "prod", userId: "user-1" };

    it("evaluates nested conditions against annotations as context", async () => {
      const annotations = { source: "rollout", bucket: "42" };
      const result = await evaluateCondition({
        condition: {
          type: "checkAnnotations",
          conditions: [{ type: "string", key: "source", op: "eq", value: "rollout" }],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations,
      });
      expect(result).toBe(true);
    });

    it("returns false when annotation key does not match", async () => {
      const annotations = { source: "other" };
      const result = await evaluateCondition({
        condition: {
          type: "checkAnnotations",
          conditions: [{ type: "string", key: "source", op: "eq", value: "rollout" }],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations,
      });
      expect(result).toBe(false);
    });

    it("returns false when annotation key is missing", async () => {
      const result = await evaluateCondition({
        condition: {
          type: "checkAnnotations",
          conditions: [{ type: "string", key: "source", op: "eq", value: "rollout" }],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations: {},
      });
      expect(result).toBe(false);
    });

    it("uses fresh annotations for nested evaluation", async () => {
      let receivedAnnotations: unknown;
      const spy: ConditionEvaluator = async ({ annotations }) => {
        receivedAnnotations = annotations;
        return true;
      };
      const evaluators = { ...builtinEvaluators, spy };
      const parentAnnotations = { existing: "data" };

      await evaluateCondition({
        condition: {
          type: "checkAnnotations",
          conditions: [{ type: "spy" }],
        },
        context: ctx,
        evaluators,
        annotations: parentAnnotations,
      });

      expect(receivedAnnotations).toEqual({});
      expect(receivedAnnotations).not.toBe(parentAnnotations);
    });

    it("short-circuits on first failing child (implicit AND)", async () => {
      const called: string[] = [];
      const tracker: ConditionEvaluator = async ({ condition }) => {
        called.push((condition as { type: string }).type);
        return false;
      };
      const pass: ConditionEvaluator = async ({ condition }) => {
        called.push((condition as { type: string }).type);
        return true;
      };
      const evaluators = { ...builtinEvaluators, tracker, pass };

      const result = await evaluateCondition({
        condition: {
          type: "checkAnnotations",
          conditions: [{ type: "tracker" }, { type: "pass" }],
        },
        context: ctx,
        evaluators,
        annotations: { some: "data" },
      });

      expect(result).toBe(false);
      expect(called).toEqual(["tracker"]);
    });

    it("works inside an and composite", async () => {
      const annotations = { source: "rollout" };
      const result = await evaluateCondition({
        condition: {
          type: "and",
          conditions: [
            { type: "env", op: "eq", value: "prod" },
            {
              type: "checkAnnotations",
              conditions: [{ type: "string", key: "source", op: "eq", value: "rollout" }],
            },
          ],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations,
      });
      expect(result).toBe(true);
    });

    it("verifies number annotations", async () => {
      const annotations = { bucket: 42 };
      const result = await evaluateCondition({
        condition: {
          type: "checkAnnotations",
          conditions: [{ type: "number", key: "bucket", op: "lt", value: 50 }],
        },
        context: ctx,
        evaluators: builtinEvaluators,
        annotations,
      });
      expect(result).toBe(true);
    });
  });
});
