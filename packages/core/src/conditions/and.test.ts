import { describe, it, expect } from "vitest";
import { ConditionSchema } from "../schemas/condition.js";
import { builtinEvaluators } from "./index.js";
import { evaluateCondition } from "./evaluate.js";

describe("and condition", () => {
  describe("schema validation", () => {
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

    it("rejects { type: 'and' } as a custom condition (reserved)", () => {
      const result = ConditionSchema.safeParse({ type: "and" });
      expect(result.success).toBe(false);
    });
  });

  describe("evaluation", () => {
    const ctx = { env: "prod", userId: "user-1" };

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
});
