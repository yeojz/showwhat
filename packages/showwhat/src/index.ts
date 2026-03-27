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

  const validatedContext = contextResult.data as Context<T>;
  const resolverOptions = {
    evaluators: options.evaluators ?? builtinEvaluators,
    fallback: options.fallback,
    logger: options.logger,
  };

  let definitions: Definitions;
  const notFound: ResolutionError[] = [];

  if (keys) {
    definitions = {};
    await Promise.all(
      keys.map(async (key) => {
        const def = await options.data.get(key).catch(() => null);
        if (def) {
          definitions[key] = def;
        } else {
          notFound.push({ key, error: new DefinitionNotFoundError(key) });
        }
      }),
    );
  } else {
    definitions = await options.data.getAll();
  }

  const result = await resolve({
    definitions,
    context: validatedContext,
    options: resolverOptions,
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
