import type { Condition } from "../schemas/condition.js";
import { isAndCondition, isOrCondition } from "../schemas/condition.js";
import type { Context } from "../schemas/context.js";
import type {
  Annotations,
  ConditionEvaluator,
  ConditionEvaluators,
  Dependencies,
  RegexFactory,
} from "./types.js";
import { defaultCreateRegex } from "./types.js";
import type { Logger } from "../logger.js";
import { noopLogger } from "../logger.js";
import { ShowwhatError } from "../errors.js";

export type EvaluateConditionArgs = {
  condition: Condition;
  context: Readonly<Context>;
  evaluators: ConditionEvaluators;
  annotations: Annotations;
  deps?: Readonly<Dependencies>;
  depth?: string;
  logger?: Logger;
  fallback?: ConditionEvaluator;
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
  fallback,
  createRegex = defaultCreateRegex,
}: EvaluateConditionArgs): Promise<boolean> {
  if (isAndCondition(condition)) {
    for (let i = 0; i < condition.conditions.length; i++) {
      const childDepth = depth === "" ? `${i}` : `${depth}.${i}`;
      const result = await evaluateCondition({
        condition: condition.conditions[i],
        context,
        evaluators,
        annotations,
        deps,
        depth: childDepth,
        logger,
        fallback,
        createRegex,
      });

      if (!result) {
        logger.debug("and condition short-circuited (child returned false)", {
          childType: condition.conditions[i].type,
          depth: childDepth,
        });
        return false;
      }
    }
    return true;
  }

  if (isOrCondition(condition)) {
    for (let i = 0; i < condition.conditions.length; i++) {
      const childDepth = depth === "" ? `${i}` : `${depth}.${i}`;
      const result = await evaluateCondition({
        condition: condition.conditions[i],
        context,
        evaluators,
        annotations,
        deps,
        depth: childDepth,
        logger,
        fallback,
        createRegex,
      });

      if (result) {
        logger.debug("or condition short-circuited (child returned true)", {
          childType: condition.conditions[i].type,
          depth: childDepth,
        });
        return true;
      }
    }
    return false;
  }

  const evaluator = evaluators[condition.type];

  if (!evaluator) {
    if (fallback) {
      const result = await fallback({ condition, context, annotations, deps, depth, createRegex });
      logger.debug("condition evaluated (fallback)", {
        type: condition.type,
        depth,
        result,
      });
      return result;
    }

    throw new ShowwhatError(`Unknown condition type "${condition.type}".`);
  }

  const result = await evaluator({ condition, context, annotations, deps, depth, createRegex });
  logger.debug("condition evaluated", {
    type: condition.type,
    depth,
    result,
  });
  return result;
}
