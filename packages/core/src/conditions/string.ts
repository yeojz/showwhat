import type { Context } from "../schemas/context.js";
import type { StringCondition } from "../schemas/condition.js";
import type { ConditionEvaluator, RegexFactory } from "./types.js";
import { defaultCreateRegex } from "./types.js";

export async function evaluateString(
  condition: StringCondition,
  ctx: Readonly<Context>,
  createRegex: RegexFactory = defaultCreateRegex,
): Promise<boolean> {
  if (!Object.hasOwn(ctx, condition.key)) return false;
  const raw = ctx[condition.key];
  if (typeof raw !== "string") return false;
  const actual = raw;

  switch (condition.op) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "in":
      return (condition.value as string[]).includes(actual);
    case "nin":
      return !(condition.value as string[]).includes(actual);
    case "regex": {
      try {
        return createRegex(condition.value as string).test(actual);
      } catch {
        return false;
      }
    }
  }
}

export const stringEvaluator: ConditionEvaluator = ({ condition, context, createRegex }) =>
  evaluateString(condition as StringCondition, context, createRegex);
