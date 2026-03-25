import { BuiltinContextSchema } from "./schemas/condition.js";
import {
  DefinitionNotFoundError,
  ValidationError,
  ShowwhatError,
  ParseError,
  SchemaValidationError,
  DefinitionInactiveError,
  VariationNotFoundError,
  InvalidContextError,
  DataError,
} from "./errors.js";
import { resolve, resolveVariation, ResolverOptions } from "./resolver.js";
import { Context } from "./schemas/context.js";
import { Resolution } from "./schemas/resolution.js";
import {
  DefinitionReader,
  DefinitionWriter,
  DefinitionData,
  PresetReader,
  isWritable,
  MemoryData,
} from "./data.js";
import {
  evaluateCondition,
  builtinEvaluators,
  extendEvaluators,
  noConditionEvaluator,
} from "./conditions/index.js";
import type {
  Annotations,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  ConditionEvaluators,
  EvaluateConditionArgs,
} from "./conditions/index.js";
import { parseYaml, parseObject, parsePresetsFile, parsePresetsYaml } from "./parsers.js";
import { noopLogger } from "./logger.js";
import type { Logger } from "./logger.js";

export * from "./schemas/index.js";

// evaluators
export { evaluateCondition, builtinEvaluators, extendEvaluators, noConditionEvaluator };
export type {
  Annotations,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  ConditionEvaluators,
  EvaluateConditionArgs,
};

// presets
export { createPresetConditions } from "./presets.js";

// errors
export {
  ShowwhatError,
  ParseError,
  ValidationError,
  SchemaValidationError,
  DefinitionNotFoundError,
  DefinitionInactiveError,
  VariationNotFoundError,
  InvalidContextError,
  DataError,
};

// data
export type { DefinitionReader, DefinitionWriter, DefinitionData, PresetReader };
export { isWritable, MemoryData };

// parsers
export { parseYaml, parseObject, parsePresetsFile, parsePresetsYaml };

// logger
export { noopLogger };
export type { Logger };

// resolver
export { resolve, resolveVariation };
export type { ResolverOptions as ResolutionOptions };

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
    options,
  });

  return result[key];
}
