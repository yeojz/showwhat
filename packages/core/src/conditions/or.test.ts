import { describe, it, expect } from "vitest";
import { ConditionSchema } from "../schemas/condition.js";
import { builtinEvaluators } from "./index.js";
import { evaluateCondition } from "./evaluate.js";

describe("or condition", () => {
  describe("schema validation", () => {
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

    it("rejects { type: 'or' } as a custom condition (reserved)", () => {
      const result = ConditionSchema.safeParse({ type: "or" });
      expect(result.success).toBe(false);
    });
  });

  describe("evaluation", () => {
    const ctx = { env: "prod", userId: "user-1" };

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
});
