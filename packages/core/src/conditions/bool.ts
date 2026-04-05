import type { Context } from "../schemas/context.js";
import type { BoolCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";

export async function evaluateBool(
  condition: BoolCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  if (!Object.hasOwn(ctx, condition.key)) {
    return false;
  }

  const raw = ctx[condition.key];

  if (typeof raw === "boolean") {
    return raw === condition.value;
  }

  if (typeof raw !== "string") {
    return false;
  }

  if (raw === "true") {
    return condition.value === true;
  }

  if (raw === "false") {
    return condition.value === false;
  }

  return false;
}

export const boolEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateBool(condition as BoolCondition, context);
