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
      return actual === (condition.value as number);
    case "neq":
      return actual !== (condition.value as number);
    case "gt":
      return actual > (condition.value as number);
    case "gte":
      return actual >= (condition.value as number);
    case "lt":
      return actual < (condition.value as number);
    case "lte":
      return actual <= (condition.value as number);
    case "in":
      return (condition.value as number[]).includes(actual);
    case "nin":
      return !(condition.value as number[]).includes(actual);
  }
}

export const numberEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateNumber(condition as NumberCondition, context);
