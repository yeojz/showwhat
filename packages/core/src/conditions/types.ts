import { z } from "zod";
import type { Context } from "../schemas/context.js";
import { DataValueSchema } from "../schemas/value.js";
import type { DataValue } from "../schemas/value.js";
import type { Logger } from "../logger.js";

export const AnnotationValueSchema = DataValueSchema;

/**
 * Semantic alias for `DataValue`. Annotations share the same structural base today,
 * but may diverge in the future (e.g. restricted to flat records). Keeping the alias
 * lets call sites express intent and makes a future split a non-breaking change.
 */
export type AnnotationValue = DataValue;

export const AnnotationsSchema = z.record(z.string(), AnnotationValueSchema);

export type Annotations = Record<string, AnnotationValue>;
export type Dependencies = Record<string, unknown>;

export type RegexFactory = (pattern: string) => { test: (input: string) => boolean };
export type AnnotationsFactory = (definitionKey?: string) => Annotations;

export const defaultCreateRegex: RegexFactory = (pattern) => new RegExp(pattern);

export type ConditionEvaluatorArgs = {
  condition: unknown;
  context: Readonly<Context>;
  annotations: Annotations;
  deps: Readonly<Dependencies>;
  depth: string;

  // Functions
  createRegex: RegexFactory;
  evaluators: ConditionEvaluators;
  logger?: Logger;
};

export type ConditionEvaluator = (args: ConditionEvaluatorArgs) => Promise<boolean>;

export const FALLBACK_EVALUATOR_KEY: unique symbol = Symbol("fallback");

export type ConditionEvaluators = Record<string, ConditionEvaluator> & {
  [FALLBACK_EVALUATOR_KEY]?: ConditionEvaluator;
};

export const noConditionEvaluator: ConditionEvaluator = async () => false;
