import type { OrCondition } from "../schemas/condition.js";
import type { ConditionEvaluator } from "./types.js";
import { evaluateCondition } from "./evaluate.js";

export const orEvaluator: ConditionEvaluator = async (args) => {
  const { conditions } = args.condition as OrCondition;
  const { depth } = args;

  for (let i = 0; i < conditions.length; i++) {
    const childDepth = depth === "" ? `${i}` : `${depth}.${i}`;

    const result = await evaluateCondition({
      ...args,
      condition: conditions[i],
      depth: childDepth,
    });

    if (result) {
      args.logger?.debug("or condition short-circuited (child returned true)", {
        childType: conditions[i].type,
        depth: childDepth,
      });

      return true;
    }
  }
  return false;
};
