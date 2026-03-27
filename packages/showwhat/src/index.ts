import {
  ContextSchema,
  builtinEvaluators,
  DefinitionNotFoundError,
  ValidationError,
  resolve,
} from "@showwhat/core";
import type {
  BuiltinCondition,
  ConditionEvaluators,
  Context,
  ContextValue,
  Definitions,
  DefinitionReader,
  Resolution,
  ResolutionError,
  ResolverOptions,
} from "@showwhat/core";

export * from "@showwhat/core";

export type ShowWhatOptions = ResolverOptions & {
  data: DefinitionReader;
};

export type Resolutions = Record<string, Resolution<unknown> | ResolutionError>;

async function fetchDefinitions(
  data: DefinitionReader,
  keys?: string[],
): Promise<{ definitions: Definitions; notFound: ResolutionError[] }> {
  if (!keys) {
    return { definitions: await data.getAll(), notFound: [] };
  }

  const definitions: Definitions = {};
  const notFound: ResolutionError[] = [];

  await Promise.all(
    keys.map(async (key) => {
      const def = await data.get(key).catch(() => null);
      if (def) {
        definitions[key] = def;
      } else {
        notFound.push({ key, error: new DefinitionNotFoundError(key) });
      }
    }),
  );

  return { definitions, notFound };
}

export async function showwhat<
  T extends Record<string, ContextValue> = Record<string, ContextValue>,
>({
  keys,
  context,
  options,
}: {
  keys?: string[];
  context: Context<T>;
  options: ShowWhatOptions;
}): Promise<Resolutions> {
  const contextResult = ContextSchema.safeParse(context);
  if (!contextResult.success) {
    throw new ValidationError(
      contextResult.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; "),
      "context",
    );
  }

  const { definitions, notFound } = await fetchDefinitions(options.data, keys);

  const result = await resolve({
    definitions,
    context: contextResult.data as Context<T>,
    options: {
      evaluators: options.evaluators ?? builtinEvaluators,
      fallback: options.fallback,
      logger: options.logger,
    },
  });

  for (const entry of notFound) {
    result[entry.key] = entry;
  }

  return result;
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
