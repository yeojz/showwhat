import type {
  Definitions,
  Resolution,
  ResolutionError,
  Variation,
  Context,
} from "./schemas/index.js";
import { evaluateCondition, FALLBACK_EVALUATOR_KEY } from "./conditions/index.js";
import type {
  Annotations,
  AnnotationsFactory,
  ConditionEvaluator,
  ConditionEvaluators,
  Dependencies,
  RegexFactory,
} from "./conditions/index.js";
import { defaultCreateRegex } from "./conditions/index.js";
import {
  DefinitionInactiveError,
  DefinitionNotFoundError,
  ShowwhatError,
  VariationNotFoundError,
} from "./errors.js";
import type { Logger } from "./logger.js";
import { noopLogger } from "./logger.js";

export type ResolverOptions = {
  evaluators?: ConditionEvaluators;
  fallback?: ConditionEvaluator;
  logger?: Logger;
  createRegex?: RegexFactory;
  createAnnotations?: AnnotationsFactory;
};

function getEvaluators(options?: ResolverOptions): ConditionEvaluators {
  if (!options?.evaluators) {
    throw new ShowwhatError("No evaluators registered. Pass evaluators via options.");
  }
  if (options.fallback) {
    return { ...options.evaluators, [FALLBACK_EVALUATOR_KEY]: options.fallback };
  }
  return options.evaluators;
}

function getLogger(options?: { logger?: Logger }): Logger {
  return options?.logger ?? noopLogger;
}

export async function resolveVariation({
  variations,
  context,
  deps,
  options,
  definitionKey,
}: {
  variations: Variation[];
  context: Readonly<Context>;
  deps?: Dependencies;
  options?: ResolverOptions;
  definitionKey?: string;
}): Promise<{ variation: Variation; variationIndex: number; annotations: Annotations } | null> {
  const evaluators = getEvaluators(options);
  const logger = getLogger(options);

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const conditions = Array.isArray(variation.conditions) ? variation.conditions : [];
    const annotations: Annotations = options?.createAnnotations?.(definitionKey) ?? {};

    if (conditions.length === 0) {
      logger.debug("variation matched (no conditions)", { variationIndex: i });
      return { variation, variationIndex: i, annotations };
    }

    const rulesMatch = await evaluateCondition({
      condition: { type: "and", conditions },
      context,
      evaluators,
      annotations,
      deps: deps ?? {},
      logger,
      createRegex: options?.createRegex ?? defaultCreateRegex,
    });

    if (!rulesMatch) {
      logger.debug("variation did not match", {
        variationIndex: i,
        conditionCount: conditions.length,
      });
      continue;
    }

    logger.debug("variation matched", {
      variationIndex: i,
      conditionCount: conditions.length,
    });
    return { variation, variationIndex: i, annotations };
  }

  logger.debug("no variation matched", { variationCount: variations.length });
  return null;
}

async function resolveKey(
  key: string,
  definitions: Definitions,
  context: Readonly<Context>,
  deps?: Dependencies,
  options?: ResolverOptions,
): Promise<Resolution> {
  const logger = getLogger(options);
  const definition = definitions[key];

  if (!definition) {
    logger.warn("definition not found", { key });
    throw new DefinitionNotFoundError(key);
  }

  if (definition.active !== undefined && definition.active !== true) {
    logger.warn("definition inactive", { key });
    throw new DefinitionInactiveError(key);
  }

  logger.debug("resolving definition", {
    key,
    variationCount: definition.variations.length,
  });

  const result = await resolveVariation({
    variations: definition.variations,
    context,
    deps,
    options,
    definitionKey: key,
  });

  if (!result) {
    logger.warn("no matching variation", { key });
    throw new VariationNotFoundError(key);
  }

  logger.debug("resolved", {
    key,
    variationIndex: result.variationIndex,
    value: result.variation.value,
  });

  const conditionCount = Array.isArray(result.variation.conditions)
    ? result.variation.conditions.length
    : 0;

  return {
    success: true,
    key,
    value: result.variation.value,
    meta: {
      variation: {
        index: result.variationIndex,
        id: result.variation.id,
        description: result.variation.description,
        conditionCount,
      },
      annotations: result.annotations,
    },
  };
}

/**
 * Resolve all definitions against the given context.
 *
 * Each key is resolved independently — a failure for one key does not
 * affect others. Failed keys are returned as `ResolutionError` entries.
 */
export async function resolve({
  definitions,
  context,
  deps,
  options,
}: {
  definitions: Definitions;
  context: Readonly<Context>;
  deps?: Dependencies;
  options?: ResolverOptions;
}): Promise<Record<string, Resolution | ResolutionError>> {
  const keys = Object.keys(definitions);
  const entries = await Promise.all(
    keys.map((key) =>
      resolveKey(key, definitions, context, deps, options).catch(
        (reason): ResolutionError => ({
          success: false,
          key,
          error:
            reason instanceof ShowwhatError
              ? reason
              : new ShowwhatError(String(reason), { cause: reason }),
        }),
      ),
    ),
  );

  return Object.fromEntries(keys.map((key, i) => [key, entries[i]]));
}
