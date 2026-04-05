import type { Context } from "../schemas/context.js";
import type { DatetimeCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";
import { parseDate } from "./utils.js";

export async function evaluateDatetime(
  condition: DatetimeCondition,
  ctx: Readonly<Context>,
): Promise<boolean> {
  if (!Object.hasOwn(ctx, condition.key)) {
    return false;
  }

  const raw = ctx[condition.key];

  if (typeof raw !== "string") {
    return false;
  }

  const actual = parseDate(condition.key, raw);
  const expected = new Date(condition.value);

  switch (condition.op) {
    case "eq":
      return actual.getTime() === expected.getTime();
    case "gt":
      return actual > expected;
    case "gte":
      return actual >= expected;
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
  }
}

export const datetimeEvaluator: ConditionEvaluator = ({ condition, context }) =>
  evaluateDatetime(condition as DatetimeCondition, context);
