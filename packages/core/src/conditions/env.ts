import type { Context } from "../schemas/context.js";
import type { EnvCondition } from "../schemas/condition.js";
import { evaluateString } from "./string.js";
import type { ConditionEvaluator } from "./types.js";

export async function evaluateEnv(
  condition: EnvCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  if (Array.isArray(condition.value)) {
    return evaluateString({ type: "string", key: "env", op: "in", value: condition.value }, ctx);
  }
  return evaluateString({ type: "string", key: "env", op: "eq", value: condition.value }, ctx);
}

export const envEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateEnv(condition as EnvCondition, context);
