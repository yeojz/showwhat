import type { Context } from "../schemas/context.js";

export type Annotations<T extends Record<string, unknown> = Record<string, unknown>> = T;
export type Dependencies<T extends Record<string, unknown> = Record<string, unknown>> = T;

export type ConditionEvaluatorArgs = {
  condition: unknown;
  context: Readonly<Context>;
  annotations: Annotations;
  deps: Readonly<Dependencies>;
  depth: string;
};

export type ConditionEvaluator = (args: ConditionEvaluatorArgs) => Promise<boolean>;

export type ConditionEvaluators<T extends string = string> = Record<T, ConditionEvaluator>;

export const noConditionEvaluator: ConditionEvaluator = async () => false;
