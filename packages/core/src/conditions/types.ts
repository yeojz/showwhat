import type { Context } from "../schemas/context.js";

export type Annotations<T extends Record<string, unknown> = Record<string, unknown>> = T;
export type Dependencies<T extends Record<string, unknown> = Record<string, unknown>> = T;

export type RegexFactory = (pattern: string) => { test: (input: string) => boolean };
export type AnnotationsFactory = (definitionKey?: string) => Annotations;

export const defaultCreateRegex: RegexFactory = (pattern) => new RegExp(pattern);

export type ConditionEvaluatorArgs = {
  condition: unknown;
  context: Readonly<Context>;
  annotations: Annotations;
  deps: Readonly<Dependencies>;
  depth: string;
  createRegex: RegexFactory;
};

export type ConditionEvaluator = (args: ConditionEvaluatorArgs) => Promise<boolean>;

export type ConditionEvaluators<T extends string = string> = Record<T, ConditionEvaluator>;

export const noConditionEvaluator: ConditionEvaluator = async () => false;
