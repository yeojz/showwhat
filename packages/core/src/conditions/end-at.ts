import type { ConditionEvaluator } from "./types.js";
import type { Context } from "../schemas/context.js";
import type { EndAtCondition } from "../schemas/condition.js";
import { evaluateDatetime } from "./datetime.js";

export async function evaluateEndAt(
  condition: EndAtCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  return evaluateDatetime(
    {
      type: "datetime",
      key: "at",
      op: "lt",
      value: condition.value,
    },
    ctx,
  );
}

export const endAtEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateEndAt(condition as EndAtCondition, context);
