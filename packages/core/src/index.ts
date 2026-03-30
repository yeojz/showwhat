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
  ConditionError,
} from "./errors.js";
import { resolve, resolveVariation, ResolverOptions } from "./resolver.js";
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
  noConditionEvaluator,
  defaultCreateRegex,
} from "./conditions/index.js";
import type {
  Annotations,
  AnnotationsFactory,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  ConditionEvaluators,
  Dependencies,
  EvaluateConditionArgs,
  RegexFactory,
} from "./conditions/index.js";
import { parseYaml, parseObject, parsePresetsObject, parsePresetsYaml } from "./parsers.js";
import { noopLogger } from "./logger.js";
import type { Logger } from "./logger.js";

export * from "./schemas/index.js";

// evaluators
export { evaluateCondition, builtinEvaluators, noConditionEvaluator, defaultCreateRegex };
export type {
  Annotations,
  AnnotationsFactory,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  ConditionEvaluators,
  Dependencies,
  EvaluateConditionArgs,
  RegexFactory,
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
  ConditionError,
};

// data
export type { DefinitionReader, DefinitionWriter, DefinitionData, PresetReader };
export { isWritable, MemoryData };

// parsers
export { parseYaml, parseObject, parsePresetsObject, parsePresetsYaml };

// logger
export { noopLogger };
export type { Logger };

// resolver
export { resolve, resolveVariation };
export type { ResolverOptions };
