import { stringEvaluator } from "./string.js";
import { numberEvaluator } from "./number.js";
import { datetimeEvaluator } from "./datetime.js";
import { boolEvaluator } from "./bool.js";
import { envEvaluator } from "./env.js";
import { startAtEvaluator } from "./start-at.js";
import { endAtEvaluator } from "./end-at.js";
import { andEvaluator } from "./and.js";
import { orEvaluator } from "./or.js";
import { matchAnnotationsEvaluator } from "./match-annotations.js";
import type { ConditionEvaluators } from "./types.js";
export {
  noConditionEvaluator,
  AnnotationValueSchema,
  AnnotationsSchema,
  FALLBACK_EVALUATOR_KEY,
} from "./types.js";
export type {
  Annotations,
  AnnotationsFactory,
  AnnotationValue,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  ConditionEvaluators,
  Dependencies,
  RegexFactory,
} from "./types.js";
export { defaultCreateRegex } from "./types.js";
export { evaluateCondition } from "./evaluate.js";
export type { EvaluateConditionArgs } from "./evaluate.js";

export const builtinEvaluators: ConditionEvaluators = {
  string: stringEvaluator,
  number: numberEvaluator,
  datetime: datetimeEvaluator,
  bool: boolEvaluator,
  env: envEvaluator,
  startAt: startAtEvaluator,
  endAt: endAtEvaluator,
  and: andEvaluator,
  or: orEvaluator,
  matchAnnotations: matchAnnotationsEvaluator,
};
