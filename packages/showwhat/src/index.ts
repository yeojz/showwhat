import {
  ContextSchema,
  builtinEvaluators,
  DefinitionNotFoundError,
  ShowwhatError,
  ValidationError,
  resolve,
} from "@showwhat/core";
import type {
  BuiltinCondition,
  ConditionEvaluators,
  Context,
  ContextValue,
  Definition,
  DefinitionReader,
  Resolution,
  ResolverOptions,
} from "@showwhat/core";

export * from "@showwhat/core";

export type ShowWhatOptions = ResolverOptions & {
  data: DefinitionReader;
};

export type ResolutionError = {
  key: string;
  error: ShowwhatError;
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

  let entries: Array<[string, Definition | null]>;

  if (keys) {
    const settled = await Promise.allSettled(
      keys.map(
        async (key): Promise<[string, Definition | null]> => [key, await options.data.get(key)],
      ),
    );

    entries = settled.map((result, i) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return [keys[i], null] as [string, null];
    });
  } else {
    const all = await options.data.getAll();
    entries = Object.entries(all);
  }

  const resolutions: Resolutions = {};

  const settled = await Promise.allSettled(
    entries.map(async ([key, def]) => {
      if (!def) {
        throw new DefinitionNotFoundError(key);
      }

      const result = await resolve({
        definitions: { [key]: def },
        context: validatedContext,
        options: resolverOptions,
      });

      return result[key];
    }),
  );

  for (let i = 0; i < settled.length; i++) {
    const [key] = entries[i];
    const result = settled[i];

    if (result.status === "fulfilled") {
      resolutions[key] = result.value;
    } else {
      const error =
        result.reason instanceof ShowwhatError
          ? result.reason
          : new ShowwhatError(String(result.reason));
      resolutions[key] = { key, error };
    }
  }

  return resolutions;
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
