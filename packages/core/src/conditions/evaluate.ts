import type { Condition } from "../schemas/condition.js";
import type { Context } from "../schemas/context.js";
import type { Annotations, ConditionEvaluators, Dependencies, RegexFactory } from "./types.js";
import { defaultCreateRegex } from "./types.js";
import type { Logger } from "../logger.js";
import { noopLogger } from "../logger.js";
import { UnknownConditionTypeError } from "../errors.js";

export type EvaluateConditionArgs = {
  condition: Condition;
  context: Readonly<Context>;
  evaluators: ConditionEvaluators;
  annotations: Annotations;
  deps?: Readonly<Dependencies>;
  depth?: string;
  logger?: Logger;
  createRegex?: RegexFactory;
};

export async function evaluateCondition({
  condition,
  context,
  evaluators,
  annotations,
  deps = {},
  depth = "",
  logger = noopLogger,
  createRegex = defaultCreateRegex,
}: EvaluateConditionArgs): Promise<boolean> {
  const evaluator = evaluators[condition.type];

  if (!evaluator) {
    throw new UnknownConditionTypeError(condition.type, condition);
  }

  const result = await evaluator({
    condition,
    context,
    annotations,
    deps,
    depth,
    createRegex,
    logger,
    evaluators,
  });

  logger.debug("condition evaluated", {
    type: condition.type,
    depth,
    result,
  });
  return result;
}
