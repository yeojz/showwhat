import type { Definitions, Resolution, Variation, Context, ContextValue } from "./schemas/index.js";
import { evaluateCondition } from "./conditions/index.js";
import type { Annotations, ConditionEvaluator, ConditionEvaluators } from "./conditions/index.js";
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
};

function getEvaluators(options?: ResolverOptions): ConditionEvaluators {
  if (!options?.evaluators) {
    throw new ShowwhatError("No evaluators registered. Pass evaluators via options.");
  }
  return options.evaluators;
}

function getLogger(options?: ResolverOptions): Logger {
  return options?.logger ?? noopLogger;
}

export async function resolveVariation<
  T extends Record<string, ContextValue> = Record<string, ContextValue>,
>({
  variations,
  context,
  options,
}: {
  variations: Variation[];
  context: Readonly<Context<T>>;
  options?: ResolverOptions;
}): Promise<{ variation: Variation; variationIndex: number; annotations: Annotations } | null> {
  const evaluators = getEvaluators(options);
  const logger = getLogger(options);

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const conditionList = Array.isArray(variation.conditions) ? variation.conditions : [];

    if (conditionList.length === 0) {
      logger.debug("variation matched (no conditions)", { variationIndex: i });
      return { variation, variationIndex: i, annotations: {} };
    }

    const annotations: Annotations = {};
    const rulesMatch = await evaluateCondition({
      condition: { type: "and", conditions: conditionList },
      context,
      evaluators,
      annotations,
      logger,
      fallback: options?.fallback,
    });

    if (!rulesMatch) {
      logger.debug("variation did not match", {
        variationIndex: i,
        conditionCount: conditionList.length,
      });
      continue;
    }

    logger.debug("variation matched", {
      variationIndex: i,
      conditionCount: conditionList.length,
    });
    return { variation, variationIndex: i, annotations };
  }

  logger.debug("no variation matched", { variationCount: variations.length });
  return null;
}

function toResolution<V = unknown>(
  key: string,
  result: { variation: Variation; variationIndex: number; annotations: Annotations },
  context: Readonly<Context>,
): Resolution<V> {
  const conditionCount = Array.isArray(result.variation.conditions)
    ? result.variation.conditions.length
    : 0;

  return {
    key,
    value: result.variation.value as V,
    error: null,
    meta: {
      context: { ...context },
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

async function resolveKey<
  V = unknown,
  T extends Record<string, ContextValue> = Record<string, ContextValue>,
>(
  key: string,
  definitions: Definitions,
  context: Readonly<Context<T>>,
  options?: ResolverOptions,
): Promise<Resolution<V>> {
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

  const result = await resolveVariation({ variations: definition.variations, context, options });

  if (!result) {
    logger.warn("no matching variation", { key });
    throw new VariationNotFoundError(key);
  }

  logger.debug("resolved", {
    key,
    variationIndex: result.variationIndex,
    value: result.variation.value,
  });

  return toResolution<V>(key, result, context);
}

/**
 * Resolve all definitions against the given context.
 *
 * Uses `Promise.all` — if any single key fails (not found, inactive, no match),
 * the entire call rejects. Callers who need partial results should resolve
 * keys individually via `resolveVariation`.
 */
export async function resolve<
  V = unknown,
  T extends Record<string, ContextValue> = Record<string, ContextValue>,
>({
  definitions,
  context,
  options,
}: {
  definitions: Definitions;
  context: Readonly<Context<T>>;
  options?: ResolverOptions;
}): Promise<Record<string, Resolution<V>>> {
  const keys = Object.keys(definitions);
  const entries = await Promise.all(
    keys.map(
      async (key) => [key, await resolveKey<V, T>(key, definitions, context, options)] as const,
    ),
  );

  return Object.fromEntries(entries);
}
