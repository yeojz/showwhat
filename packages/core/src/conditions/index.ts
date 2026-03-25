import { stringEvaluator } from "./string.js";
import { numberEvaluator } from "./number.js";
import { datetimeEvaluator } from "./datetime.js";
import { boolEvaluator } from "./bool.js";
import { envEvaluator } from "./env.js";
import { startAtEvaluator } from "./start-at.js";
import { endAtEvaluator } from "./end-at.js";
import type { BuiltinCondition } from "../schemas/condition.js";
import type { ConditionEvaluators } from "./types.js";
export { noConditionEvaluator } from "./types.js";
export type {
  Annotations,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  ConditionEvaluators,
} from "./types.js";
export { evaluateCondition } from "./composite.js";
export type { EvaluateConditionArgs } from "./composite.js";

export const builtinEvaluators: ConditionEvaluators<BuiltinCondition["type"]> = {
  string: stringEvaluator,
  number: numberEvaluator,
  datetime: datetimeEvaluator,
  bool: boolEvaluator,
  env: envEvaluator,
  startAt: startAtEvaluator,
  endAt: endAtEvaluator,
};

const COMPOSITE_TYPES = new Set(["and", "or"]);

export function extendEvaluators<T extends string>(
  extra: ConditionEvaluators<T>,
): ConditionEvaluators<BuiltinCondition["type"] | T> {
  for (const key of Object.keys(extra)) {
    if (COMPOSITE_TYPES.has(key)) {
      throw new Error(`Cannot register reserved condition type "${key}"`);
    }
  }
  return { ...builtinEvaluators, ...extra };
}
