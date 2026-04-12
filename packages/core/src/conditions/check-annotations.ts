import type { CheckAnnotationsCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";
import { evaluateCondition } from "./evaluate.js";

export const checkAnnotationsEvaluator: ConditionEvaluator = async (args) => {
  const { conditions } = args.condition as CheckAnnotationsCondition;
  const { depth, annotations: annotationsAsContext } = args;

  for (let i = 0; i < conditions.length; i++) {
    const childDepth = depth === "" ? `${i}` : `${depth}.${i}`;

    const result = await evaluateCondition({
      ...args,
      condition: conditions[i],
      context: annotationsAsContext,
      annotations: {},
      depth: childDepth,
    });

    if (!result) {
      args.logger?.debug("checkAnnotations condition short-circuited (child returned false)", {
        childType: conditions[i].type,
        depth: childDepth,
      });

      return false;
    }
  }
  return true;
};
