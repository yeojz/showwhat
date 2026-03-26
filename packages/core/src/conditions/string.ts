import type { Context } from "../schemas/context.js";
import type { StringCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";

export async function evaluateString(
  condition: StringCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  if (!Object.hasOwn(ctx, condition.key)) return false;
  const actual = String(ctx[condition.key]);

  switch (condition.op) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "in":
      return (condition.value as string[]).includes(actual);
    case "nin":
      return !(condition.value as string[]).includes(actual);
    case "regex":
      try {
        return new RegExp(condition.value as string).test(actual);
      } catch {
        return false;
      }
  }
}

export const stringEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateString(condition as StringCondition, context);
