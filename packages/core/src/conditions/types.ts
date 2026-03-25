import type { Context } from "../schemas/context.js";

export type Annotations = Record<string, unknown>;

export type ConditionEvaluatorArgs = {
  condition: unknown;
  context: Readonly<Context>;
  annotations: Annotations;
  depth: string;
};

export type ConditionEvaluator = (args: ConditionEvaluatorArgs) => Promise<boolean>;

export type ConditionEvaluators<T extends string = string> = Record<T, ConditionEvaluator>;

export const noConditionEvaluator: ConditionEvaluator = async () => false;
