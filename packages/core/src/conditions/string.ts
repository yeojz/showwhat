import type { Context } from "../schemas/context.js";
import type { StringCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";

export async function evaluateString(
  condition: StringCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  if (!Object.hasOwn(ctx, condition.key)) return false;
  const actual = String(ctx[condition.key]);
  const values = Array.isArray(condition.value) ? condition.value : [condition.value];

  switch (condition.op) {
    case "eq":
      return values.includes(actual);
    case "neq":
      return !values.includes(actual);
    case "regex":
      return values.some((p) => {
        try {
          return new RegExp(p).test(actual);
        } catch {
          return false;
        }
      });
  }
}

export const stringEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateString(condition as StringCondition, context);
