import type { Condition } from "../schemas/condition.js";
import {
  isAndCondition,
  isOrCondition,
  isMatchAnnotationsCondition,
} from "../schemas/condition.js";
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

type ResolvedArgs = Required<
  Pick<EvaluateConditionArgs, "deps" | "depth" | "logger" | "createRegex">
> &
  Omit<EvaluateConditionArgs, "deps" | "depth" | "logger" | "createRegex">;

async function evaluateAnd(conditions: Condition[], args: ResolvedArgs): Promise<boolean> {
  const { depth, logger } = args;
  for (let i = 0; i < conditions.length; i++) {
    const childDepth = depth === "" ? `${i}` : `${depth}.${i}`;
    const result = await evaluateCondition({
      ...args,
      condition: conditions[i],
      depth: childDepth,
    });
    if (!result) {
      logger.debug("and condition short-circuited (child returned false)", {
        childType: conditions[i].type,
        depth: childDepth,
      });
      return false;
    }
  }
  return true;
}

async function evaluateOr(conditions: Condition[], args: ResolvedArgs): Promise<boolean> {
  const { depth, logger } = args;
  for (let i = 0; i < conditions.length; i++) {
    const childDepth = depth === "" ? `${i}` : `${depth}.${i}`;
    const result = await evaluateCondition({
      ...args,
      condition: conditions[i],
      depth: childDepth,
    });
    if (result) {
      logger.debug("or condition short-circuited (child returned true)", {
        childType: conditions[i].type,
        depth: childDepth,
      });
      return true;
    }
  }
  return false;
}

async function evaluateMatchAnnotationsCondition(
  conditions: Condition[],
  args: ResolvedArgs,
): Promise<boolean> {
  const annotationsAsContext = args.annotations as unknown as Readonly<Context>;
  const freshAnnotations: Annotations = {};
  return evaluateAnd(conditions, {
    ...args,
    context: annotationsAsContext,
    annotations: freshAnnotations,
  });
}

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
  const args: ResolvedArgs = {
    condition,
    context,
    evaluators,
    annotations,
    deps,
    depth,
    logger,
    fallback,
    createRegex,
  };

  if (isAndCondition(condition)) {
    return evaluateAnd(condition.conditions, args);
  }

  if (isOrCondition(condition)) {
    return evaluateOr(condition.conditions, args);
  }

  if (isMatchAnnotationsCondition(condition)) {
    return evaluateMatchAnnotationsCondition(condition.conditions, args);
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
