import type { ConditionEvaluator } from "./types.js";
import type { Context } from "../schemas/context.js";
import type { StartAtCondition } from "../schemas/condition.js";
import { evaluateDatetime } from "./datetime.js";

export async function evaluateStartAt(
  condition: StartAtCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  return evaluateDatetime(
    {
      type: "datetime",
      key: "at",
      op: "gte",
      value: condition.value,
    },
    ctx,
  );
}

export const startAtEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateStartAt(condition as StartAtCondition, context);
