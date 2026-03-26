import {
  BuiltinContextSchema,
  builtinEvaluators,
  DefinitionNotFoundError,
  ValidationError,
  resolve,
} from "@showwhat/core";
import type {
  BuiltinCondition,
  ConditionEvaluators,
  Context,
  DefinitionReader,
  Resolution,
  ResolverOptions,
} from "@showwhat/core";

export * from "@showwhat/core";

export type ShowWhatOptions = ResolverOptions & {
  data: DefinitionReader;
};

export async function showwhat({
  key,
  context,
  options,
}: {
  key: string;
  context: Context;
  options: ShowWhatOptions;
}): Promise<Resolution> {
  const contextResult = BuiltinContextSchema.safeParse(context);
  if (!contextResult.success) {
    throw new ValidationError(
      contextResult.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; "),
      "context",
    );
  }

  const validatedContext = contextResult.data;
  const def = await options.data.get(key);

  if (!def) {
    throw new DefinitionNotFoundError(key);
  }

  const result = await resolve({
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
