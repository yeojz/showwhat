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
  DefinitionReader,
  Resolution,
  ResolverOptions,
} from "@showwhat/core";

export * from "@showwhat/core";

export type ShowWhatOptions = ResolverOptions & {
  data: DefinitionReader;
};

export async function showwhat<
  V = unknown,
  T extends Record<string, ContextValue> = Record<string, ContextValue>,
>({
  key,
  context,
  options,
}: {
  key: string;
  context: Context<T>;
  options: ShowWhatOptions;
}): Promise<Resolution<V>> {
  const contextResult = ContextSchema.safeParse(context);
  if (!contextResult.success) {
    throw new ValidationError(
      contextResult.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; "),
      "context",
    );
  }

  const validatedContext = contextResult.data as Context<T>;
  const def = await options.data.get(key);

  if (!def) {
    throw new DefinitionNotFoundError(key);
  }

  const result = await resolve<V, T>({
    definitions: { [key]: def },
    context: validatedContext,
    options: {
      evaluators: options.evaluators ?? builtinEvaluators,
      fallback: options.fallback,
      logger: options.logger,
    },
  });

  return result[key];
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
