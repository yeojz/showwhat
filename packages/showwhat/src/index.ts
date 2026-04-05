import {
  ContextSchema,
  builtinEvaluators,
  ValidationError,
  DataError,
  resolve,
} from "@showwhat/core";
import type {
  ConditionEvaluators,
  Context,
  Definitions,
  DefinitionReader,
  Dependencies,
  Presets,
  PresetReader,
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

export async function showwhat({
  keys,
  context,
  deps,
  options,
}: {
  keys?: string[];
  context: Context;
  deps?: Dependencies;
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
    context: contextResult.data as Context,
    deps,
    options: {
      ...options,
      evaluators: options.evaluators ?? builtinEvaluators,
    },
  });
}

export async function mergePresets({
  key,
  presets,
  overrides,
}: {
  key?: string;
  presets?: PresetReader;
  overrides?: Presets;
}): Promise<Presets> {
  const base = presets ? (key ? await presets.getPresets(key) : await presets.getPresets()) : {};
  if (!overrides || Object.keys(overrides).length === 0) return base;
  return { ...base, ...overrides };
}

const COMPOSITE_TYPES = new Set(["and", "or", "matchAnnotations"]);

export function registerEvaluators(extra: ConditionEvaluators): ConditionEvaluators {
  for (const key of Object.keys(extra)) {
    if (COMPOSITE_TYPES.has(key)) {
      throw new Error(`Cannot register reserved condition type "${key}"`);
    }
  }
  return { ...builtinEvaluators, ...extra };
}
