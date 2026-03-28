import type { Context } from "../schemas/context.js";
import type { StringCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";

const regexCache = new Map<string, RegExp>();

function getCachedRegex(pattern: string): RegExp | null {
  let re = regexCache.get(pattern);
  if (re) return re;
  try {
    re = new RegExp(pattern);
    regexCache.set(pattern, re);
    return re;
  } catch {
    return null;
  }
}

export async function evaluateString(
  condition: StringCondition,
  ctx: Readonly<Context>,
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
      const re = getCachedRegex(condition.value as string);
      return re !== null && re.test(actual);
    }
  }
}

export const stringEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateString(condition as StringCondition, context);
