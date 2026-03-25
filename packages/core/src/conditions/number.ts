import type { Context } from "../schemas/context.js";
import type { NumberCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";

export async function evaluateNumber(
  condition: NumberCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  if (!Object.hasOwn(ctx, condition.key)) return false;
  const actual = Number(ctx[condition.key]);
  if (Number.isNaN(actual)) return false;

  switch (condition.op) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "gt":
      return actual > condition.value;
    case "gte":
      return actual >= condition.value;
    case "lt":
      return actual < condition.value;
    case "lte":
      return actual <= condition.value;
  }
}

export const numberEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateNumber(condition as NumberCondition, context);
