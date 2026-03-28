import {
  ContextSchema,
  builtinEvaluators,
  ValidationError,
  DataError,
  resolve,
} from "@showwhat/core";
import type {
  BuiltinCondition,
  ConditionEvaluators,
  Context,
  ContextValue,
  Definitions,
  DefinitionReader,
  Dependencies,
  Resolution,
  ResolutionError,
  ResolverOptions,
} from "@showwhat/core";

export * from "@showwhat/core";

export type ShowWhatOptions = ResolverOptions & {
  data: DefinitionReader;
};

export type Resolutions = Record<string, Resolution | ResolutionError>;

async function fetchDefinitions(data: DefinitionReader, keys?: string[]): Promise<Definitions> {
  if (!keys) {
    try {
      return await data.getAll();
    } catch (err) {
      throw new DataError("Failed to fetch definitions", err);
    }
  }

  const definitions = {} as Record<string, Definitions[string] | null>;
  await Promise.all(
    keys.map(async (key) => {
      try {
        definitions[key] = await data.get(key);
      } catch (err) {
        throw new DataError(`Failed to fetch definition "${key}"`, err);
      }
    }),
  );
  return definitions as Definitions;
}

export async function showwhat<
  T extends Record<string, ContextValue> = Record<string, ContextValue>,
  D extends Record<string, unknown> = Record<string, unknown>,
>({
  keys,
  context,
  deps,
  options,
}: {
  keys?: string[];
  context: Context<T>;
  deps?: Dependencies<D>;
  options: ShowWhatOptions;
}): Promise<Resolutions> {
  const contextResult = ContextSchema.safeParse(context);
  if (!contextResult.success) {
    throw new ValidationError(
      contextResult.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; "),
      "context",
    );
  }

  return resolve({
    definitions: await fetchDefinitions(options.data, keys),
    context: contextResult.data as Context<T>,
    deps,
    options: {
      evaluators: options.evaluators ?? builtinEvaluators,
      fallback: options.fallback,
      logger: options.logger,
    },
  });
}

const COMPOSITE_TYPES = new Set(["and", "or"]);

export function registerEvaluators<T extends string>(
  extra: ConditionEvaluators<T>,
): ConditionEvaluators<BuiltinCondition["type"] | T> {
  for (const key of Object.keys(extra)) {
    if (COMPOSITE_TYPES.has(key)) {
      throw new Error(`Cannot register reserved condition type "${key}"`);
    }
  }
  return { ...builtinEvaluators, ...extra };
}
